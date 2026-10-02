import React, { useState } from 'react';

export function DeliveryResults({
  results,
  onRetryFailed,
  isRetrying,
  onDownloadReport,
  onDownloadZip,
  onDone,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'failed' | 'sent' | 'skipped'

  if (!results) {
    return (
      <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 text-center text-xs text-muted">
        No delivery results available.
      </div>
    );
  }

  const { summary = {}, results: items = [] } = results;
  const total = summary.total || items.length;
  const sent = summary.sent || 0;
  const failed = summary.failed || 0;
  const skipped = summary.skipped || 0;

  const retryableCount = items.filter(
    i => i.status === 'FAILED' && i.retryable
  ).length;

  const filteredItems = items.filter(i => {
    if (filter === 'all') return true;
    return i.status.toLowerCase() === filter;
  });

  return (
    <div className="max-w-2xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Delivery Complete</h2>
          <p className="text-xs text-muted mt-0.5">
            {total} certificates processed via Brevo
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="px-3.5 py-1.5 text-xs font-medium text-primary bg-bg hover:bg-border border border-border rounded-lg transition-colors"
        >
          Return to Preview
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-green-50/70 border border-green-200 rounded-lg text-center">
          <span className="text-[11px] font-semibold text-green-800 uppercase tracking-wider block">Sent</span>
          <span className="text-2xl font-bold text-green-700 mt-1 block">✓ {sent}</span>
        </div>
        <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg text-center">
          <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider block">Failed</span>
          <span className="text-2xl font-bold text-red-700 mt-1 block">✗ {failed}</span>
        </div>
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-center">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Invalid / Skipped</span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">⏭ {skipped}</span>
        </div>
      </div>

      {/* Filter Tabs & Job Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-primary">Recipient Logs</span>
          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${filter === 'all' ? 'bg-primary text-white font-medium' : 'text-muted hover:text-primary'}`}
            >
              All ({items.length})
            </button>
            {failed > 0 && (
              <button
                onClick={() => setFilter('failed')}
                className={`px-2 py-0.5 rounded transition-colors ${filter === 'failed' ? 'bg-red-600 text-white font-medium' : 'text-error hover:underline'}`}
              >
                Failed ({failed})
              </button>
            )}
            {skipped > 0 && (
              <button
                onClick={() => setFilter('skipped')}
                className={`px-2 py-0.5 rounded transition-colors ${filter === 'skipped' ? 'bg-amber-600 text-white font-medium' : 'text-amber-700 hover:underline'}`}
              >
                Skipped ({skipped})
              </button>
            )}
            <button
              onClick={() => setFilter('sent')}
              className={`px-2 py-0.5 rounded transition-colors ${filter === 'sent' ? 'bg-green-700 text-white font-medium' : 'text-green-700 hover:underline'}`}
            >
              Sent ({sent})
            </button>
          </div>
        </div>

        <div className="border border-border rounded-lg max-h-56 overflow-y-auto divide-y divide-border text-xs bg-bg/40">
          {filteredItems.map((item, idx) => (
            <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-surface/80 transition-colors">
              <div className="min-w-0 pr-3">
                <div className="font-medium text-primary truncate">{item.name}</div>
                <div className="text-[11px] text-muted font-mono truncate">{item.email || 'No email address'}</div>
                {item.error && (
                  <div className="text-[10px] text-error mt-0.5 truncate">{item.error}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                {item.status === 'SENT' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">
                    SENT
                  </span>
                )}
                {item.status === 'FAILED' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                    FAILED {item.retryable ? '(Retryable)' : ''}
                  </span>
                )}
                {item.status === 'SKIPPED' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                    SKIPPED
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-4 text-center text-xs text-muted">No records match this filter.</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {retryableCount > 0 && (
            <button
              type="button"
              onClick={onRetryFailed}
              disabled={isRetrying}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>↻</span>
              <span>{isRetrying ? 'Retrying...' : `Retry Failed (${retryableCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onDownloadReport}
            className="px-4 py-2 bg-surface hover:bg-bg text-primary border border-border text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <span>📥</span>
            <span>Download CSV Report</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onDownloadZip}
          className="text-xs text-muted hover:text-primary transition-colors flex items-center space-x-1"
        >
          <span>📦</span>
          <span>Download All Certificates as ZIP</span>
        </button>
      </div>
    </div>
  );
}
