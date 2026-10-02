import { useRef, useState } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import { loadImage } from '../services/storage.js';

export function UploadPage({ onShowToast }) {
  const { state, dispatch } = useAppContext();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const hasTemplate = Boolean(state.template?.src && state.template?.width > 0);

  const processTemplateFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      onShowToast?.('Please upload a valid image file (PNG, JPG, WEBP, JPEG)', 'error');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        const img = await loadImage(dataUrl);

        dispatch({
          type: A.SET_TEMPLATE,
          template: {
            name: file.name,
            src: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: Number((img.naturalWidth / img.naturalHeight).toFixed(4)),
          },
          image: img,
        });

        // Initialize default fields if none exist
        if (state.fields.length === 0) {
          dispatch({
            type: A.SET_FIELDS,
            fields: [
              {
                id: 'field_1',
                type: 'name',
                label: 'Participant Name',
                placeholder: '{{NAME}}',
                x: 0.25,
                y: 0.44,
                width: 0.50,
                height: 0.08,
                rotation: 0,
                fontSizePx: 42,
                fontWeight: 'bold',
                fontStyle: 'normal',
                fontFamily: 'Poppins',
                color: '#171717',
                align: 'center',
                letterSpacing: 0,
                lineHeight: 1.2,
                autoFit: true,
              },
              {
                id: 'field_2',
                type: 'event_name',
                label: 'Event Name',
                placeholder: '{{EVENT_NAME}}',
                x: 0.20,
                y: 0.55,
                width: 0.60,
                height: 0.06,
                rotation: 0,
                fontSizePx: 26,
                fontWeight: '600',
                fontStyle: 'normal',
                fontFamily: 'Montserrat',
                color: '#4B5563',
                align: 'center',
                letterSpacing: 0,
                lineHeight: 1.2,
                autoFit: true,
              },
            ],
            counter: 3,
          });
        }

        dispatch({ type: A.SET_PAGE, page: 'editor' });
        onShowToast?.(`Template loaded: ${img.naturalWidth} × ${img.naturalHeight}px`, 'success');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Template load failed:', err);
      onShowToast?.(`Failed to load image: ${err.message}`, 'error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processTemplateFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Generate a handsome sample certificate template for instant testing
  const handleUseSampleTemplate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1920, 1080);

    // Inner subtle background
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(40, 40, 1840, 1000);

    // Elegant Borders
    ctx.strokeStyle = '#312E81'; // Deep indigo
    ctx.lineWidth = 12;
    ctx.strokeRect(50, 50, 1820, 980);

    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 70, 1780, 940);

    // Corner accents
    const corners = [[90, 90], [1830, 90], [90, 990], [1830, 990]];
    ctx.fillStyle = '#4F46E5';
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // College / Event Header
    ctx.fillStyle = '#1E1B4B';
    ctx.font = 'bold 36px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPECTRUM 2026', 960, 160);

    ctx.fillStyle = '#6366F1';
    ctx.font = 'bold 50px "Montserrat", sans-serif';
    ctx.fillText('CERTIFICATE OF PARTICIPATION', 960, 240);

    ctx.fillStyle = '#6B7280';
    ctx.font = '22px "Inter", sans-serif';
    ctx.fillText('THIS CERTIFICATE IS PROUDLY PRESENTED TO', 960, 360);

    ctx.fillText('FOR ACTIVE PARTICIPATION AND OUTSTANDING PERFORMANCE IN', 960, 680);

    // Signature line
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1320, 920);
    ctx.lineTo(1620, 920);
    ctx.stroke();

    ctx.fillStyle = '#4B5563';
    ctx.font = '18px "Inter", sans-serif';
    ctx.fillText('Authorized Signatory', 1470, 955);

    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      dispatch({
        type: A.SET_TEMPLATE,
        template: {
          name: 'SPECTRUM_Certificate_Template.png',
          src: dataUrl,
          width: 1920,
          height: 1080,
          aspectRatio: 1920 / 1080,
        },
        image: img,
      });

      dispatch({
        type: A.SET_FIELDS,
        fields: [
          {
            id: 'field_1',
            type: 'name',
            label: 'Participant Name',
            placeholder: '{{NAME}}',
            x: 0.25,
            y: 0.40,
            width: 0.50,
            height: 0.08,
            rotation: 0,
            fontSizePx: 44,
            fontWeight: 'bold',
            fontStyle: 'normal',
            fontFamily: 'Poppins',
            color: '#1E1B4B',
            align: 'center',
            letterSpacing: 0,
            lineHeight: 1.2,
            autoFit: true,
          },
          {
            id: 'field_2',
            type: 'department',
            label: 'Department',
            placeholder: '{{DEPARTMENT}}',
            x: 0.30,
            y: 0.49,
            width: 0.40,
            height: 0.06,
            rotation: 0,
            fontSizePx: 24,
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontFamily: 'Inter',
            color: '#4B5563',
            align: 'center',
            letterSpacing: 0,
            lineHeight: 1.2,
            autoFit: true,
          },
          {
            id: 'field_3',
            type: 'event_name',
            label: 'Event Name',
            placeholder: 'SPECTRUM Quiz & Coding Marathon',
            x: 0.20,
            y: 0.72,
            width: 0.60,
            height: 0.07,
            rotation: 0,
            fontSizePx: 28,
            fontWeight: '600',
            fontStyle: 'normal',
            fontFamily: 'Montserrat',
            color: '#312E81',
            align: 'center',
            letterSpacing: 0,
            lineHeight: 1.2,
            autoFit: true,
          },
        ],
        counter: 4,
      });

      dispatch({ type: A.SET_PAGE, page: 'editor' });
      onShowToast?.('Sample SPECTRUM template ready', 'success');
    };
    img.src = dataUrl;
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg text-primary">
      {/* Subheader */}
      <div className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-base font-semibold text-primary">Create Certificate</h1>
          <p className="text-xs text-muted">
            Upload your certificate template image (PNG, JPG, JPEG) to start designing.
          </p>
        </div>

        {hasTemplate && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => dispatch({ type: A.SET_PAGE, page: 'editor' })}
              className="px-3.5 py-1.5 text-xs font-medium text-primary bg-surface hover:bg-bg border border-border rounded-lg transition-colors"
            >
              Edit Design
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: A.SET_PAGE, page: 'participants' })}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs flex items-center space-x-1"
            >
              <span>Continue to Participants</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processTemplateFile(file);
        }}
      />

      <main className="flex-1 p-6 max-w-4xl w-full mx-auto flex flex-col items-center justify-center">
        {hasTemplate ? (
          /* Template Loaded State */
          <div className="w-full bg-surface border border-border rounded-2xl p-6 shadow-xs flex flex-col items-center space-y-4">
            <div className="relative w-full max-w-2xl aspect-[1.77] bg-bg rounded-xl overflow-hidden border border-border shadow-sm">
              <img
                src={state.template.src}
                alt="Certificate Template"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col items-center text-center">
              <h3 className="text-sm font-semibold text-primary">{state.template.name}</h3>
              <p className="text-xs text-muted font-mono mt-0.5">
                {state.template.width} × {state.template.height} px
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 text-xs font-medium text-muted hover:text-primary border border-border rounded-lg bg-surface hover:bg-bg transition-colors"
              >
                Change Template
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: A.SET_PAGE, page: 'editor' })}
                className="px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                Edit Certificate Design →
              </button>
            </div>
          </div>
        ) : (
          /* Empty Upload State */
          <div className="w-full flex flex-col items-center">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`max-w-xl w-full border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                  : 'border-border hover:border-indigo-400 bg-surface shadow-xs'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="text-base font-semibold text-primary mb-1">
                Upload Certificate Template
              </h2>
              <p className="text-xs text-muted mb-4 max-w-sm mx-auto">
                Drag and drop your certificate background image here, or click to browse.
              </p>

              <div className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors shadow-xs">
                Browse Files
              </div>

              <p className="text-[11px] text-muted mt-5">
                Supports PNG, JPG, JPEG, WEBP • Landscape recommended (e.g. 1920 × 1080)
              </p>
            </div>

            <div className="mt-6 flex items-center space-x-2">
              <span className="text-xs text-muted">Don't have a template ready?</span>
              <button
                type="button"
                onClick={handleUseSampleTemplate}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline underline-offset-2"
              >
                Use Sample SPECTRUM Template
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
