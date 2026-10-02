import { useEffect, useRef } from 'react';
import { renderCertificate } from '../../services/certificateRenderer.js';
import { getParticipantName } from '../../services/pdfExporter.js';
import { getParticipantEmail } from '../../services/deliveryService.js';
import { normalizeEmail } from '../../utils/email.js';

function GridCard({
  row,
  index,
  templateImg,
  fields,
  mappings,
  emailColumn,
  onSelect,
}) {
  const canvasRef = useRef(null);
  const participantName = getParticipantName(row, fields, mappings);
  const rawEmail = getParticipantEmail(row, fields, mappings, emailColumn);
  const normalizedEmail = normalizeEmail(rawEmail);

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
            {normalizedEmail ? (
              <span className="text-muted font-mono truncate max-w-[200px]" title={normalizedEmail}>
                ✉ {normalizedEmail}
              </span>
            ) : (
              <span className="text-error text-[10px]">
                {rawEmail ? '⚠ Invalid email' : '⚠ No email'}
              </span>
            )}
          </div>
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
  emailColumn,
  onSelectParticipant,
}) {
  return (
    <div className="flex-1 w-full max-w-7xl overflow-y-auto px-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {rows.map((row, idx) => (
          <GridCard
            key={idx}
            index={idx}
            row={row}
            templateImg={templateImg}
            fields={fields}
            mappings={mappings}
            emailColumn={emailColumn}
            onSelect={onSelectParticipant}
          />
        ))}
      </div>
    </div>
  );
}
