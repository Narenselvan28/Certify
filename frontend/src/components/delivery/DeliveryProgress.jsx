import React from 'react';

export function DeliveryProgress({ status }) {
  const {
    total = 0,
    sent = 0,
    failed = 0,
    retrying = 0,
    skipped = 0,
    progress = 0,
    currently_sending,
  } = status || {};

  const processed = sent + failed + skipped;

  return (
    <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Certificate Delivery in Progress</h2>
          <p className="text-xs text-muted mt-0.5">
            Processing certificates through controlled queue with rate limits and retries
          </p>
        </div>
        <span className="font-mono text-sm font-semibold text-accent">
          {progress}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-bg rounded-full h-3 mb-6 overflow-hidden border border-border">
        <div
          className="bg-accent h-full transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-4 gap-2.5 mb-6 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
          <span className="text-[10px] text-green-700 font-medium uppercase tracking-wider block">Sent</span>
          <span className="text-xl font-bold text-success">{sent}</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <span className="text-[10px] text-amber-700 font-medium uppercase tracking-wider block">Retrying</span>
          <span className="text-xl font-bold text-amber-600">{retrying}</span>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
          <span className="text-[10px] text-red-700 font-medium uppercase tracking-wider block">Failed</span>
          <span className="text-xl font-bold text-error">{failed}</span>
        </div>

        <div className="bg-bg border border-border rounded-lg p-2.5">
          <span className="text-[10px] text-muted font-medium uppercase tracking-wider block">Skipped</span>
          <span className="text-xl font-bold text-muted">{skipped}</span>
        </div>
      </div>

      {/* Currently Sending Card */}
      <div className="bg-bg border border-border rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          </div>
          <div>
            <span className="text-[11px] text-muted block">Currently delivering:</span>
            <span className="text-xs font-semibold text-primary truncate max-w-xs block">
              {currently_sending?.participant_name || 'Dispatching queue job...'}
            </span>
            {currently_sending?.recipient && (
              <span className="text-[11px] text-muted font-mono block">
                {currently_sending.recipient} ({currently_sending.channel})
                {currently_sending.attempt > 1 && ` • Attempt ${currently_sending.attempt}`}
              </span>
            )}
          </div>
        </div>

        <span className="text-xs font-mono text-muted">
          {processed} / {total}
        </span>
      </div>
    </div>
  );
}
