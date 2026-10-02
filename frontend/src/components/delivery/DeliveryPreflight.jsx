import React, { useState } from 'react';

export function DeliveryPreflight({
  validationResult,
  onBack,
  onStartDelivery,
}) {
  const [showProblems, setShowProblems] = useState(false);

  if (!validationResult) {
    return (
      <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 text-center text-xs text-muted">
        No validation data available.
      </div>
    );
  }

  const {
    total = 0,
    email_ready = 0,
    email_invalid = 0,
    certificates_ready = 0,
    problems = [],
    can_proceed = false,
  } = validationResult;

  const hasIssues = problems.length > 0;

  return (
    <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Delivery Preflight</h2>
          <p className="text-xs text-muted mt-0.5">
            Review participant emails and certificate readiness before dispatching
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-muted hover:text-primary transition-colors"
        >
          ← Change Settings
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Total & Ready */}
        <div className="p-4 rounded-lg bg-bg/70 border border-border flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Certificates</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-primary">{total}</span>
            <span className="text-xs text-muted">participants</span>
          </div>
          <span className="text-[11px] text-muted mt-1">Ready: {certificates_ready}</span>
        </div>

        {/* Ready to Send */}
        <div className="p-4 rounded-lg bg-green-50/70 border border-green-200 flex flex-col justify-between">
          <span className="text-xs font-semibold text-green-800 uppercase tracking-wider">Ready to Send</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-green-700">{email_ready}</span>
            <span className="text-xs text-green-600">valid emails</span>
          </div>
          <span className="text-[11px] text-green-700 mt-1">
            {email_invalid > 0 ? `${email_invalid} invalid skipped` : '100% valid'}
          </span>
        </div>
      </div>

      {/* Issues / Invalid Records Banner */}
      {hasIssues ? (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 text-amber-900 font-medium text-xs">
              <span className="text-base">⚠</span>
              <span>{problems.length} participant{problems.length > 1 ? 's have' : ' has'} invalid email addresses</span>
            </div>
            <button
              type="button"
              onClick={() => setShowProblems(!showProblems)}
              className="text-xs text-amber-800 hover:underline font-semibold"
            >
              {showProblems ? 'Hide Records' : 'View Invalid Records'}
            </button>
          </div>

          <p className="text-[11px] text-amber-800/90 mt-1.5 leading-relaxed">
            Certificates will be delivered to the <strong>{email_ready}</strong> valid recipient{email_ready === 1 ? '' : 's'}. Invalid entries will be skipped and listed in the final report.
          </p>

          {/* Collapsible Problems List */}
          {showProblems && (
            <div className="mt-3 pt-3 border-t border-amber-200 max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
              {problems.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-amber-950 bg-white/70 px-2.5 py-1 rounded">
                  <span className="truncate max-w-[200px]">{p.name || `Row ${p.index}`}</span>
                  <span className="text-error text-[11px]">{p.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 p-3.5 rounded-lg bg-green-50 border border-green-200 flex items-center space-x-2.5 text-xs text-green-800">
          <span className="text-green-600 font-bold">✓</span>
          <span>All participant emails are validated and ready for delivery.</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-border text-xs font-medium text-primary rounded-lg hover:bg-bg transition-colors"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onStartDelivery}
          disabled={!can_proceed}
          className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Start Delivery ({email_ready})</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
