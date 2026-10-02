import React from 'react';

export function DeliveryProgress({ status }) {
  const {
    total = 0,
    sent = 0,
    failed = 0,
    retrying = 0,
    skipped = 0,
    progress = 0,
    currently_sending = null,
  } = status || {};

  const processed = sent + failed + skipped;

  return (
    <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      {/* Title & Overall Counter */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Sending Certificates</h2>
          <p className="text-xs text-muted mt-0.5">
            Sequential delivery via Brevo Transactional Email
          </p>
        </div>
        <div className="flex items-baseline space-x-1.5">
          <span className="text-xl font-bold text-accent">{processed}</span>
          <span className="text-xs text-muted">/ {total}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted mb-2">
          <span>Delivery Progress</span>
          <span className="font-mono font-medium text-primary">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-bg rounded-full overflow-hidden border border-border/80">
          <div
            className="h-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Real-time Status Counters */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-green-50/70 border border-green-200 rounded-lg text-center">
          <span className="text-[11px] font-semibold text-green-800 uppercase tracking-wider block">Sent</span>
          <span className="text-xl font-bold text-green-700 mt-1 block">✓ {sent}</span>
        </div>
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-center">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">Retrying</span>
          <span className="text-xl font-bold text-blue-700 mt-1 block">↻ {retrying}</span>
        </div>
        <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-center">
          <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider block">Failed</span>
          <span className="text-xl font-bold text-red-700 mt-1 block">✗ {failed}</span>
        </div>
      </div>

      {/* Currently Sending Box */}
      {currently_sending ? (
        <div className="p-4 rounded-lg bg-bg/70 border border-border flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted uppercase tracking-wider font-semibold">
              Currently sending{currently_sending.attempt > 1 ? ` (Attempt ${currently_sending.attempt})` : ''}
            </div>
            <div className="text-sm font-semibold text-primary truncate mt-0.5">
              {currently_sending.participant_name}
            </div>
            <div className="text-xs text-muted font-mono truncate">
              {currently_sending.email}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-bg/40 border border-border text-center text-xs text-muted">
          Finishing current batch...
        </div>
      )}
    </div>
  );
}
