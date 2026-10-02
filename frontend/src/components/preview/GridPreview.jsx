import { useEffect, useRef } from 'react';
import { renderCertificate } from '../../services/certificateRenderer.js';
import { getParticipantName, getParticipantRegNo } from '../../services/pdfExporter.js';
import { getParticipantEmail } from '../../services/deliveryService.js';
import { isValidEmail } from '../../utils/email.js';

function GridCard({
  row,
  index,
  templateImg,
  fields,
  mappings,
  emailColumn,
  override,
  onSelect,
  onEdit,
  onDownload,
  onSend,
}) {
  const canvasRef = useRef(null);

  const effectiveRow = override?.data ? { ...row, ...override.data } : row;
  const participantName = override?.data?.name || getParticipantName(effectiveRow, fields, mappings);
  const regNo = override?.data?.reg_no || getParticipantRegNo(effectiveRow, fields, mappings);
  const rawEmail = getParticipantEmail(effectiveRow, fields, mappings, emailColumn);
  const hasEmail = Boolean(rawEmail && isValidEmail(rawEmail));

  const isEdited = Boolean(override && (
    (override.data && Object.keys(override.data).length > 0) ||
    (override.fields && Object.keys(override.fields).length > 0)
  ));

  useEffect(() => {
    if (!canvasRef.current || !templateImg) return;
    let isCancelled = false;

    // Render smaller thumbnail for smooth grid performance
    const thumbWidth = 360;
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
      { width: thumbWidth, height: thumbHeight, override }
    ).catch(err => {
      if (!isCancelled) console.error('Grid thumb render error:', err);
    });

    return () => { isCancelled = true; };
  }, [templateImg, fields, row, mappings, override]);

  return (
    <div
      className="bg-surface border border-border hover:border-indigo-400 rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-md group shadow-xs"
    >
      <div>
        {/* Thumbnail Canvas */}
        <div
          onClick={() => onSelect(index)}
          className="relative aspect-[1.414] bg-bg rounded-lg overflow-hidden mb-2.5 border border-border/70 cursor-pointer"
        >
          <canvas ref={canvasRef} className="w-full h-full object-contain block" />
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
            #{index + 1}
          </div>
          {isEdited && (
            <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-xs">
              ✎ Edited
            </div>
          )}
        </div>

        {/* Participant Details */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between">
            <h4
              onClick={() => onSelect(index)}
              className="text-xs font-semibold text-primary truncate hover:text-indigo-600 cursor-pointer"
              title={participantName}
            >
              {participantName}
            </h4>
            {isEdited ? (
              <span className="text-[10px] font-semibold text-amber-600 shrink-0">Edited</span>
            ) : hasEmail ? (
              <span className="text-[10px] font-semibold text-emerald-600 shrink-0">✓ Ready</span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-600 shrink-0">⚠ Warning</span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="font-mono text-[10px] truncate">{regNo || '—'}</span>
            <span className="font-mono text-[10px] truncate max-w-[120px]" title={rawEmail || 'No email'}>
              {rawEmail || 'No email'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons on Card */}
      <div className="pt-2 border-t border-border flex items-center space-x-1.5">
        <button
          type="button"
          onClick={() => onEdit(index)}
          className="flex-1 px-2 py-1 text-xs font-medium text-primary hover:bg-bg border border-border rounded-md transition-colors text-center"
          title="Edit this participant certificate specifically"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDownload(index)}
          className="px-2 py-1 text-xs font-medium text-muted hover:text-primary hover:bg-bg border border-border rounded-md transition-colors"
          title="Download single certificate PDF"
        >
          PDF
        </button>

        <button
          type="button"
          onClick={() => onSend(index)}
          className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
          title="Send certificate via Brevo Email"
        >
          Send
        </button>
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
  overrides = {},
  onSelectParticipant,
  onEditParticipant,
  onDownloadSingle,
  onSendEmailSingle,
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
            override={overrides[idx]}
            onSelect={onSelectParticipant}
            onEdit={onEditParticipant}
            onDownload={onDownloadSingle}
            onSend={onSendEmailSingle}
          />
        ))}
      </div>
    </div>
  );
}
