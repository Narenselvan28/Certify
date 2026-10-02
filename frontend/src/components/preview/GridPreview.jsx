import { useEffect, useRef, useState } from 'react';
import { renderCertificate } from '../../services/certificateRenderer.js';
import { getParticipantName } from '../../services/pdfExporter.js';
import { getParticipantPhone, sendOneCertificate } from '../../services/whatsappApi.js';
import { normalizePhone, formatPhoneDisplay } from '../../utils/phone.js';

function GridCard({
  row,
  index,
  templateImg,
  fields,
  mappings,
  phoneColumn,
  apiBaseUrl,
  onSelect,
  onShowToast,
}) {
  const canvasRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState(null);

  const participantName = getParticipantName(row, fields, mappings);
  const rawPhone = getParticipantPhone(row, fields, mappings, phoneColumn);
  const normalized = normalizePhone(rawPhone);

  useEffect(() => {
    if (!canvasRef.current || !templateImg) return;
    let isCancelled = false;

    // Render smaller thumbnail for grid performance
    const thumbWidth = 320;
    const aspect = (templateImg.naturalWidth && templateImg.naturalHeight)
      ? templateImg.naturalWidth / templateImg.naturalHeight
      : 1.414;
    const thumbHeight = Math.round(thumbWidth / aspect);

    renderCertificate(
      canvasRef.current,
      templateImg,
      fields,
      row,
      mappings,
      { width: thumbWidth, height: thumbHeight }
    ).catch(err => {
      if (!isCancelled) console.error('Grid thumb render error:', err);
    });

    return () => { isCancelled = true; };
  }, [templateImg, fields, row, mappings]);

  const handleSendWA = async (e) => {
    e.stopPropagation();
    if (!normalized || isSending) return;
    setIsSending(true);
    setStatus(null);
    try {
      const res = await sendOneCertificate(
        apiBaseUrl,
        row,
        index,
        templateImg,
        fields,
        mappings,
        phoneColumn
      );
      if (res.status === 'sent') {
        setStatus('sent');
        onShowToast?.(`Sent to ${participantName}`, 'success');
      } else {
        setStatus('failed');
        onShowToast?.(`Failed: ${res.error || 'WhatsApp error'}`, 'error');
      }
    } catch (err) {
      setStatus('failed');
      onShowToast?.(`Error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(index)}
      className="bg-surface border border-border hover:border-accent rounded-lg p-2.5 flex flex-col cursor-pointer transition-all hover:shadow-md group"
    >
      {/* Thumbnail Canvas */}
      <div className="relative aspect-[1.414] bg-bg rounded overflow-hidden mb-2 border border-border/60">
        <canvas ref={canvasRef} className="w-full h-full object-contain block" />
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
          #{index + 1}
        </div>
      </div>

      {/* Info & Status */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-semibold text-primary truncate group-hover:text-accent transition-colors" title={participantName}>
            {participantName}
          </h4>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            {normalized ? (
              <span className="font-mono text-success text-[10px] truncate max-w-[120px]">
                +{normalized}
              </span>
            ) : (
              <span className="text-muted text-[10px]">
                {rawPhone ? 'Invalid phone' : 'No phone'}
              </span>
            )}
            {status === 'sent' && (
              <span className="text-[10px] font-semibold text-success bg-green-50 px-1 rounded">
                Sent ✓
              </span>
            )}
            {status === 'failed' && (
              <span className="text-[10px] font-semibold text-error bg-red-50 px-1 rounded">
                Failed ✕
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(index);
            }}
            className="text-[11px] text-muted hover:text-primary transition-colors"
          >
            Inspect
          </button>

          {normalized && (
            <button
              type="button"
              onClick={handleSendWA}
              disabled={isSending}
              className="text-[11px] font-medium text-success hover:underline disabled:opacity-50 flex items-center space-x-1"
            >
              <span>{isSending ? 'Sending...' : 'WhatsApp'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GridPreview({
  rows,
  templateImg,
  fields,
  mappings,
  phoneColumn,
  apiBaseUrl,
  onSelectIndex,
  onShowToast,
}) {
  const [page, setPage] = useState(0);
  const pageSize = 24;
  const pageCount = Math.ceil(rows.length / pageSize);
  const pagedRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex-1 w-full max-w-6xl overflow-y-auto px-4 py-4 flex flex-col">
      {/* Grid Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 flex-1">
        {pagedRows.map((row, idx) => {
          const actualIndex = page * pageSize + idx;
          return (
            <GridCard
              key={actualIndex}
              row={row}
              index={actualIndex}
              templateImg={templateImg}
              fields={fields}
              mappings={mappings}
              phoneColumn={phoneColumn}
              apiBaseUrl={apiBaseUrl}
              onSelect={onSelectIndex}
              onShowToast={onShowToast}
            />
          );
        })}
      </div>

      {/* Pagination Footer */}
      {pageCount > 1 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-center space-x-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-2.5 py-1 text-xs border border-border rounded bg-surface hover:bg-bg disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted">
            Page {page + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-2.5 py-1 text-xs border border-border rounded bg-surface hover:bg-bg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
