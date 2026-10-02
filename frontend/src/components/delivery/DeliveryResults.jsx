import React from 'react';

export function DeliveryResults({
  results,
  onRetryFailed,
  isRetrying,
  onDownloadReport,
  onDownloadZip,
  onDone,
}) {
  if (!results) return null;

  const { summary = {}, results: items = [] } = results;
  const {
    total = 0,
    sent = 0,
    failed = 0,
    skipped = 0,
    fallback_delivered = 0,
    whatsapp_sent = 0,
    whatsapp_failed = 0,
    email_sent = 0,
    email_failed = 0,
  } = summary;

  const failedItems = items.filter(i => i.status === 'FAILED');
  const hasRetryable = failedItems.some(i => i.retryable);

  return (
    <div className="max-w-2xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Delivery Completed</h2>
          <p className="text-xs text-muted mt-0.5">
            {total} certificates processed across selected delivery channels
          </p>
        </div>
        <span className="px-3 py-1 bg-green-50 text-success border border-green-200 text-xs font-semibold rounded-full">
          Batch Finished
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-bg border border-border rounded-lg p-3 text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider block">Delivered</span>
          <span className="text-2xl font-bold text-success">{sent}</span>
        </div>

        <div className="bg-bg border border-border rounded-lg p-3 text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider block">Failed</span>
          <span className="text-2xl font-bold text-error">{failed}</span>
        </div>

        <div className="bg-bg border border-border rounded-lg p-3 text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider block">Skipped</span>
          <span className="text-2xl font-bold text-muted">{skipped}</span>
        </div>

        <div className="bg-bg border border-border rounded-lg p-3 text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider block">Fallback Used</span>
          <span className="text-2xl font-bold text-accent">{fallback_delivered}</span>
        </div>
      </div>

      {/* Channel Breakdown Pill */}
      <div className="bg-bg/60 border border-border rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-primary">WhatsApp:</span>
          <span className="text-success">{whatsapp_sent} sent</span>
          {whatsapp_failed > 0 && <span className="text-error">• {whatsapp_failed} failed</span>}
        </div>

        <div className="flex items-center space-x-2 border-l border-border pl-3">
          <span className="font-semibold text-primary">Email:</span>
          <span className="text-blue-600">{email_sent} sent</span>
          {email_failed > 0 && <span className="text-error">• {email_failed} failed</span>}
        </div>
      </div>

      {/* Failed Items List */}
      {failedItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-error mb-2 flex items-center justify-between">
            <span>Failed Deliveries ({failedItems.length})</span>
            {hasRetryable && (
              <span className="text-[11px] font-normal text-muted">
                Temporary failures can be re-attempted
              </span>
            )}
          </h3>

          <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border text-xs bg-bg/30">
            {failedItems.map((item) => (
              <div key={item.id} className="p-2.5 flex items-center justify-between">
                <div className="truncate max-w-[240px]">
                  <span className="font-medium text-primary">{item.name}</span>
                  <span className="text-muted ml-1.5 font-mono text-[11px]">
                    ({item.phone || item.email || item.channel})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-error text-[11px] block">{item.error || 'Failed'}</span>
                  <span className="text-[10px] text-muted">
                    {item.attempts} {item.attempts === 1 ? 'attempt' : 'attempts'}
                    {item.retryable ? ' • Retryable' : ' • Permanent'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {hasRetryable && (
            <button
              type="button"
              onClick={onRetryFailed}
              disabled={isRetrying}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isRetrying ? 'Retrying...' : '↻ Retry Failed'}
            </button>
          )}

          <button
            type="button"
            onClick={onDownloadReport}
            className="px-3.5 py-2 bg-surface hover:bg-bg border border-border text-primary text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download CSV Report</span>
          </button>

          <button
            type="button"
            onClick={onDownloadZip}
            className="px-3.5 py-2 bg-surface hover:bg-bg border border-border text-primary text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5"
            title="Download ZIP backup of all certificates"
          >
            <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download ZIP</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          Return to Preview
        </button>
      </div>
    </div>
  );
}
