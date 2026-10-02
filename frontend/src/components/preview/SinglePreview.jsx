import { useEffect, useRef, useState, useTransition } from 'react';
import { renderCertificate } from '../../services/certificateRenderer.js';
import { getParticipantName, generateSinglePDF } from '../../services/pdfExporter.js';
import { getParticipantPhone, sendOneCertificate } from '../../services/whatsappApi.js';
import { normalizePhone, formatPhoneDisplay } from '../../utils/phone.js';

export function SinglePreview({
  currentIndex,
  total,
  rows,
  templateImg,
  fields,
  mappings,
  phoneColumn,
  apiBaseUrl,
  onNavigate,
  onShowToast,
}) {
  const canvasRef = useRef(null);
  const [jumpVal, setJumpVal] = useState(String(currentIndex + 1));
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [waStatus, setWaStatus] = useState(null); // { type: 'success'|'error', text: '' }

  const currentRow = rows[currentIndex] || null;
  const participantName = currentRow ? getParticipantName(currentRow, fields, mappings) : 'Participant';
  const rawPhone = currentRow ? getParticipantPhone(currentRow, fields, mappings, phoneColumn) : '';
  const normalized = normalizePhone(rawPhone);
  const hasValidPhone = Boolean(normalized);

  // Sync jump input value with index
  useEffect(() => {
    setJumpVal(String(currentIndex + 1));
    setWaStatus(null);
  }, [currentIndex]);

  // Render certificate on canvas
  useEffect(() => {
    if (!canvasRef.current || !templateImg) return;
    let isCancelled = false;

    renderCertificate(
      canvasRef.current,
      templateImg,
      fields,
      currentRow,
      mappings,
      {
        width: templateImg.naturalWidth,
        height: templateImg.naturalHeight,
      }
    ).catch(err => {
      if (!isCancelled) console.error('Canvas render failed:', err);
    });

    return () => { isCancelled = true; };
  }, [templateImg, fields, currentRow, mappings]);

  const handlePrev = () => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) onNavigate(currentIndex + 1);
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(jumpVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= total) {
      onNavigate(parsed - 1);
    } else {
      setJumpVal(String(currentIndex + 1));
    }
  };

  const handleSendSingleWhatsApp = async () => {
    if (!hasValidPhone || !templateImg) return;
    setIsSendingWA(true);
    setWaStatus(null);
    try {
      const res = await sendOneCertificate(
        apiBaseUrl,
        currentRow,
        currentIndex,
        templateImg,
        fields,
        mappings,
        phoneColumn
      );
      if (res.status === 'sent') {
        setWaStatus({ type: 'success', text: 'Sent!' });
        onShowToast?.(`Certificate delivered to ${participantName}`, 'success');
      } else {
        setWaStatus({ type: 'error', text: res.error || 'Failed' });
        onShowToast?.(`Delivery failed: ${res.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      setWaStatus({ type: 'error', text: err.message });
      onShowToast?.(`WhatsApp error: ${err.message}`, 'error');
    } finally {
      setIsSendingWA(false);
    }
  };

  const handleDownloadSinglePdf = async () => {
    if (!templateImg || !currentRow) return;
    try {
      const { blob, filename } = await generateSinglePDF(
        currentRow,
        currentIndex,
        templateImg,
        fields,
        mappings
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast?.(`Downloaded ${filename}`, 'success');
    } catch (err) {
      onShowToast?.(`PDF download failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center">
      {/* Certificate Frame */}
      <div
        className="relative bg-white border border-border rounded-[4px] max-w-full max-h-[70vh] flex items-center justify-center overflow-hidden shadow-lg"
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[70vh] object-contain block"
        />
      </div>

      {/* Navigation & Controls Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-2 border border-border rounded-[6px] max-w-full shadow-xs">
        {/* Left: Previous / Next & Jump */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="px-2 py-1 text-xs font-medium text-primary hover:bg-bg rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹ Previous
          </button>

          <span className="text-xs font-medium text-primary min-w-[64px] text-center">
            {currentIndex + 1} / {total}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= total - 1}
            className="px-2 py-1 text-xs font-medium text-primary hover:bg-bg rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next ›
          </button>

          <div className="h-4 border-r border-border"></div>

          <form onSubmit={handleJumpSubmit} className="flex items-center space-x-1.5">
            <span className="text-xs text-muted">Go:</span>
            <input
              type="number"
              min="1"
              max={total}
              value={jumpVal}
              onChange={(e) => setJumpVal(e.target.value)}
              onBlur={handleJumpSubmit}
              className="w-11 px-1 py-0.5 text-xs text-center border border-border rounded-[4px] focus:outline-none focus:border-accent text-primary bg-bg"
            />
          </form>
        </div>

        {/* Center: Participant Tag & Phone Tag */}
        <div className="flex items-center space-x-2 text-xs border-l border-border pl-3">
          <span className="font-semibold text-primary truncate max-w-[150px]" title={participantName}>
            {participantName}
          </span>

          {hasValidPhone ? (
            <span className="font-mono text-success text-[11px] bg-green-50 px-1.5 py-0.5 rounded border border-green-100 flex items-center space-x-1">
              <span>✓</span>
              <span>{formatPhoneDisplay(normalized)}</span>
            </span>
          ) : (
            <span className="text-muted text-[11px] bg-bg px-1.5 py-0.5 rounded border border-border">
              {rawPhone ? `⚠ ${rawPhone}` : 'No phone'}
            </span>
          )}
        </div>

        {/* Right: Individual Action Buttons (Download PDF & Send WhatsApp) */}
        <div className="flex items-center space-x-2 border-l border-border pl-3">
          <button
            type="button"
            onClick={handleDownloadSinglePdf}
            className="px-2.5 py-1 text-xs font-medium text-primary bg-bg hover:bg-border rounded border border-border transition-colors"
            title="Download PDF for this participant"
          >
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleSendSingleWhatsApp}
            disabled={!hasValidPhone || isSendingWA}
            className="flex items-center space-x-1.5 px-3 py-1 text-xs font-medium text-success bg-green-50 hover:bg-green-100 border border-green-200 rounded-[4px] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            title={hasValidPhone ? `Send to ${formatPhoneDisplay(normalized)}` : 'No valid WhatsApp phone number'}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.825zm-3.423-10.416c-4.402 0-7.985 3.583-7.986 7.988 0 1.408.365 2.784 1.059 3.991l-1.073 3.921 4.025-1.055c1.164.635 2.478.971 3.82.971 4.402 0 7.986-3.584 7.986-7.989 0-4.406-3.582-7.99-7.986-7.99z" />
            </svg>
            <span>{isSendingWA ? 'Sending...' : 'WhatsApp'}</span>
          </button>

          {waStatus && (
            <span className={`text-[11px] font-medium ${waStatus.type === 'success' ? 'text-success' : 'text-error'}`}>
              {waStatus.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
