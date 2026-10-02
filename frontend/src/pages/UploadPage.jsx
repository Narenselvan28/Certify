import { useRef, useState } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import { loadImage } from '../services/storage.js';

export function UploadPage({ onShowToast }) {
  const { dispatch, pushHistory, captureSnapshot } = useAppContext();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const processTemplateFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      onShowToast?.('Please upload a valid image file (PNG, JPG, WEBP, SVG)', 'error');
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

  // Generate a handsome procedural sample certificate template for instant testing
  const handleUseSampleTemplate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(1, '#F8FAFC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Elegant borders
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 14;
    ctx.strokeRect(40, 40, 1840, 1000);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 1800, 960);

    // Corner decorative accents
    const corners = [
      [80, 80],
      [1840, 80],
      [80, 1000],
      [1840, 1000],
    ];
    ctx.fillStyle = '#4F46E5';
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    // Header Title
    ctx.fillStyle = '#1E1B4B';
    ctx.font = 'bold 54px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF PARTICIPATION', 960, 220);

    ctx.fillStyle = '#64748B';
    ctx.font = '22px "Inter", sans-serif';
    ctx.fillText('THIS IS PROUDLY PRESENTED TO', 960, 360);

    ctx.fillText('FOR ACTIVE PARTICIPATION IN', 960, 690);

    // Signature lines
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(320, 920);
    ctx.lineTo(620, 920);
    ctx.moveTo(1300, 920);
    ctx.lineTo(1600, 920);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '18px "Inter", sans-serif';
    ctx.fillText('Event Coordinator', 470, 955);
    ctx.fillText('Authorized Signatory', 1450, 955);

    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      dispatch({
        type: A.SET_TEMPLATE,
        template: {
          name: 'Sample_Certificate.png',
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
            y: 0.41,
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
            type: 'event_name',
            label: 'Event Name',
            placeholder: '{{EVENT_NAME}}',
            x: 0.25,
            y: 0.69,
            width: 0.50,
            height: 0.06,
            rotation: 0,
            fontSizePx: 28,
            fontWeight: '600',
            fontStyle: 'normal',
            fontFamily: 'Montserrat',
            color: '#4F46E5',
            align: 'center',
            letterSpacing: 0,
            lineHeight: 1.2,
            autoFit: true,
          },
          {
            id: 'field_3',
            type: 'reg_no',
            label: 'Registration Number',
            placeholder: '{{REG_NO}}',
            x: 0.35,
            y: 0.51,
            width: 0.30,
            height: 0.04,
            rotation: 0,
            fontSizePx: 18,
            fontWeight: 'normal',
            fontStyle: 'normal',
            fontFamily: 'Inter',
            color: '#64748B',
            align: 'center',
            letterSpacing: 1,
            lineHeight: 1.2,
            autoFit: false,
          },
        ],
        counter: 4,
      });

      dispatch({ type: A.SET_PAGE, page: 'editor' });
      onShowToast?.('Sample template loaded', 'success');
    };
    img.src = dataUrl;
  };

  return (
    <section className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-bg min-h-screen">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Logo / Title */}
        <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Certify</h1>
        <p className="text-sm text-muted mb-8">
          Bulk certificate generator with Brevo transactional email delivery
        </p>

        {/* Dropzone / Upload Box */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed transition-all rounded-[10px] p-10 bg-surface cursor-pointer flex flex-col items-center justify-center shadow-xs ${
            isDragging
              ? 'border-accent bg-accent/5 scale-[1.01]'
              : 'border-border-strong hover:border-primary'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processTemplateFile(file);
            }}
          />

          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <p className="text-sm font-semibold text-primary mb-1">
            Upload Certificate Template
          </p>
          <p className="text-xs text-muted mb-5">
            Drag &amp; drop PNG, JPG, or WEBP (up to 4K resolution)
          </p>

          <button
            type="button"
            className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-[6px] transition-colors shadow-sm"
          >
            Choose Image
          </button>
        </div>

        {/* Sample Template Shortcut */}
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-xs text-muted">Don't have a template ready?</span>
          <button
            type="button"
            onClick={handleUseSampleTemplate}
            className="text-xs text-accent font-medium hover:underline"
          >
            Try sample template
          </button>
        </div>

        {/* Privacy Indicator */}
        <div className="mt-8 flex items-center space-x-1.5 text-xs text-muted">
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>100% Private. Certificates are generated in your browser.</span>
        </div>
      </div>
    </section>
  );
}
