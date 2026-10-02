import { useEffect, useRef, useState } from 'react';
import { renderCertificate } from '../../services/certificateRenderer.js';
import { getParticipantName, generateSinglePDF } from '../../services/pdfExporter.js';
import { getParticipantEmail } from '../../services/deliveryService.js';
import { normalizeEmail } from '../../utils/email.js';

export function SinglePreview({
  currentIndex,
  total,
  rows,
  templateImg,
  fields,
  mappings,
  emailColumn,
  onNavigate,
  onShowToast,
}) {
  const canvasRef = useRef(null);
  const [jumpVal, setJumpVal] = useState(String(currentIndex + 1));

  const currentRow = rows[currentIndex] || null;
  const participantName = currentRow ? getParticipantName(currentRow, fields, mappings) : 'Participant';
  const rawEmail = currentRow ? getParticipantEmail(currentRow, fields, mappings, emailColumn) : '';
  const normalizedEmail = normalizeEmail(rawEmail);
  const hasValidEmail = Boolean(normalizedEmail);

  // Sync jump input value with index
  useEffect(() => {
    setJumpVal(String(currentIndex + 1));
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

        {/* Center: Participant Tag & Email Tag */}
        <div className="flex items-center space-x-2 text-xs border-l border-border pl-3">
          <span className="font-semibold text-primary truncate max-w-[150px]" title={participantName}>
            {participantName}
          </span>

          {hasValidEmail ? (
            <span className="font-mono text-blue-700 text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center space-x-1">
              <span>✉</span>
              <span>{normalizedEmail}</span>
            </span>
          ) : (
            <span className="text-error text-[11px] bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
              {rawEmail ? `⚠ Invalid: ${rawEmail}` : '⚠ No email mapped'}
            </span>
          )}
        </div>

        {/* Right: Individual Action Buttons (Download PDF) */}
        <div className="flex items-center space-x-2 border-l border-border pl-3">
          <button
            type="button"
            onClick={handleDownloadSinglePdf}
            className="px-3 py-1 text-xs font-medium text-primary bg-bg hover:bg-border rounded border border-border transition-colors flex items-center space-x-1.5"
            title="Download PDF for this participant"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
