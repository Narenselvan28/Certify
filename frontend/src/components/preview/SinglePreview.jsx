import { useEffect, useRef, useState } from 'react';
import { renderCertificate } from '../../services/certificateRenderer.js';
import { getParticipantName, getParticipantRegNo, generateSinglePDF } from '../../services/pdfExporter.js';
import { getParticipantEmail } from '../../services/deliveryService.js';
import { isValidEmail } from '../../utils/email.js';

export function SinglePreview({
  currentIndex,
  total,
  rows,
  templateImg,
  fields,
  mappings,
  emailColumn,
  overrides = {},
  onNavigate,
  onEditParticipant,
  onSendEmail,
  onShowToast,
}) {
  const canvasRef = useRef(null);
  const [jumpVal, setJumpVal] = useState(String(currentIndex + 1));

  const currentRow = rows[currentIndex] || null;
  const currentOverride = overrides[currentIndex] || null;
  const effectiveRow = currentOverride?.data ? { ...currentRow, ...currentOverride.data } : currentRow;

  const participantName = currentOverride?.data?.name || (effectiveRow ? getParticipantName(effectiveRow, fields, mappings) : 'Participant');
  const regNo = currentOverride?.data?.reg_no || (effectiveRow ? getParticipantRegNo(effectiveRow, fields, mappings) : '');
  const rawEmail = effectiveRow ? getParticipantEmail(effectiveRow, fields, mappings, emailColumn) : '';
  const hasValidEmail = Boolean(rawEmail && isValidEmail(rawEmail));

  const isEdited = Boolean(currentOverride && (
    (currentOverride.data && Object.keys(currentOverride.data).length > 0) ||
    (currentOverride.fields && Object.keys(currentOverride.fields).length > 0)
  ));

  useEffect(() => {
    setJumpVal(String(currentIndex + 1));
  }, [currentIndex]);

  useEffect(() => {
    if (!canvasRef.current || !templateImg || !currentRow) return;
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
        override: currentOverride,
      }
    ).catch(err => {
      if (!isCancelled) console.error('Canvas render failed:', err);
    });

    return () => { isCancelled = true; };
  }, [templateImg, fields, currentRow, mappings, currentOverride]);

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
        mappings,
        currentOverride
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onShowToast?.(`Downloaded ${filename}`, 'success');
    } catch (err) {
      onShowToast?.(`PDF download failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center">
      {/* Certificate Frame */}
      <div className="relative bg-white border border-border rounded-xl max-w-full max-h-[70vh] flex items-center justify-center overflow-hidden shadow-xl">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[70vh] object-contain block"
        />
        {isEdited && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-md flex items-center space-x-1">
            <span>✎</span>
            <span>Edited Individually</span>
          </div>
        )}
      </div>

      {/* Navigation & Controls Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-2 border border-border rounded-xl max-w-full shadow-xs">
        {/* Left: Previous / Next & Jump */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-bg rounded-lg border border-border/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹ Previous
          </button>

          <span className="text-xs font-semibold text-primary min-w-[64px] text-center font-mono">
            {currentIndex + 1} / {total}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= total - 1}
            className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-bg rounded-lg border border-border/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next ›
          </button>

          <div className="h-4 border-r border-border" />

          <form onSubmit={handleJumpSubmit} className="flex items-center space-x-1.5">
            <span className="text-xs text-muted">Go:</span>
            <input
              type="number"
              min="1"
              max={total}
              value={jumpVal}
              onChange={(e) => setJumpVal(e.target.value)}
              onBlur={handleJumpSubmit}
              className="w-12 px-1.5 py-0.5 text-xs text-center border border-border rounded-md focus:outline-none focus:border-indigo-500 text-primary bg-bg"
            />
          </form>
        </div>

        {/* Center: Participant Tag & Email Tag */}
        <div className="flex items-center space-x-2 text-xs border-l border-border pl-3">
          <div className="flex flex-col">
            <span className="font-semibold text-primary truncate max-w-[160px]" title={participantName}>
              {participantName}
            </span>
            {regNo && <span className="text-[10px] text-muted font-mono">{regNo}</span>}
          </div>

          {hasValidEmail ? (
            <span className="font-mono text-indigo-700 text-[11px] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              ✉ {rawEmail}
            </span>
          ) : (
            <span className="text-amber-700 text-[11px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {rawEmail ? `⚠ ${rawEmail}` : '⚠ Missing email'}
            </span>
          )}
        </div>

        {/* Right: Individual Action Buttons */}
        <div className="flex items-center space-x-2 border-l border-border pl-3">
          <button
            type="button"
            onClick={() => onEditParticipant(currentIndex)}
            className="px-3 py-1 text-xs font-medium text-primary bg-surface hover:bg-bg rounded-lg border border-border transition-colors flex items-center space-x-1"
            title="Edit this certificate layout and text"
          >
            <span>✎</span>
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSinglePdf}
            className="px-3 py-1 text-xs font-medium text-primary bg-surface hover:bg-bg rounded-lg border border-border transition-colors flex items-center space-x-1"
            title="Download PDF for this participant"
          >
            <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>PDF</span>
          </button>

          {onSendEmail && (
            <button
              type="button"
              onClick={() => onSendEmail(currentIndex)}
              className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center space-x-1"
              title="Send certificate via Brevo email"
            >
              <span>Send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
