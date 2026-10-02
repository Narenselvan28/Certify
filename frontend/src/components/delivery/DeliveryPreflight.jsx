import { useState } from 'react';

export function DeliveryPreflight({
  validationResult,
  channels,
  onBack,
  onStartDelivery,
}) {
  const [showProblems, setShowProblems] = useState(false);

  if (!validationResult) return null;

  const {
    total,
    whatsapp_ready,
    whatsapp_invalid,
    email_ready,
    email_invalid,
    certificates_ready,
    problems = [],
    can_proceed,
  } = validationResult;

  const hasWhatsApp = channels.includes('whatsapp');
  const hasEmail = channels.includes('email');

  return (
    <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Preflight Validation Check</h2>
          <p className="text-xs text-muted mt-0.5">
            Review participant contact data readiness before starting delivery
          </p>
        </div>
      </div>

      {/* Readiness Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-bg border border-border rounded-lg p-3">
          <span className="text-[11px] text-muted block">Total Records</span>
          <span className="text-xl font-bold text-primary">{total}</span>
        </div>

        {hasWhatsApp && (
          <div className="bg-bg border border-border rounded-lg p-3">
            <span className="text-[11px] text-muted block">WhatsApp Ready</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-success">{whatsapp_ready}</span>
              {whatsapp_invalid > 0 && (
                <span className="text-xs font-semibold text-error">({whatsapp_invalid} invalid)</span>
              )}
            </div>
          </div>
        )}

        {hasEmail && (
          <div className="bg-bg border border-border rounded-lg p-3">
            <span className="text-[11px] text-muted block">Email Ready</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-blue-600">{email_ready}</span>
              {email_invalid > 0 && (
                <span className="text-xs font-semibold text-error">({email_invalid} invalid)</span>
              )}
            </div>
          </div>
        )}

        <div className="bg-bg border border-border rounded-lg p-3">
          <span className="text-[11px] text-muted block">Certificates Ready</span>
          <span className="text-xl font-bold text-primary">{certificates_ready}</span>
        </div>
      </div>

      {/* Problems Accordion */}
      {problems.length > 0 && (
        <div className="mb-6 border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowProblems(!showProblems)}
            className="w-full px-4 py-2.5 bg-bg/80 flex items-center justify-between text-xs font-medium text-primary hover:bg-bg transition-colors"
          >
            <span className="flex items-center space-x-1.5 text-error">
              <span>⚠</span>
              <span>{problems.length} Contact Issues Identified (Will be skipped or fall back)</span>
            </span>
            <span className="text-muted text-[11px]">{showProblems ? 'Hide Details ▲' : 'View Problems ▼'}</span>
          </button>

          {showProblems && (
            <div className="max-h-48 overflow-y-auto divide-y divide-border text-xs bg-surface p-2">
              {problems.map((p, idx) => (
                <div key={idx} className="py-2 px-2 flex items-center justify-between">
                  <div className="truncate max-w-[200px]">
                    <span className="font-semibold text-primary">{p.name}</span>
                    <span className="text-muted ml-1.5">(#{p.index})</span>
                  </div>
                  <div className="text-right">
                    <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg text-muted mr-1.5">
                      {p.channel}
                    </span>
                    <span className="text-error text-[11px]">{p.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-medium text-muted hover:text-primary rounded border border-border hover:bg-bg transition-colors"
        >
          ← Change Channels
        </button>

        <button
          type="button"
          onClick={onStartDelivery}
          disabled={!can_proceed}
          className="px-6 py-2 bg-success hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          Start Bulk Delivery ({total})
        </button>
      </div>
    </div>
  );
}
