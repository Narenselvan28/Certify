import React, { useState } from 'react';

export function DeliveryMethodSelector({
  rowCount,
  brevoStatus,
  onSendTestEmail,
  isTestingEmail,
  onValidate,
  isValidating,
  onDownloadZip,
}) {
  const [testEmailInput, setTestEmailInput] = useState('');
  const [showTestForm, setShowTestForm] = useState(false);

  const handleTestSubmit = (e) => {
    e.preventDefault();
    if (testEmailInput.trim()) {
      onSendTestEmail(testEmailInput.trim());
    }
  };

  return (
    <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Certificate Delivery Center</h2>
          <p className="text-xs text-muted mt-0.5">
            Bulk transactional email delivery powered by Brevo
          </p>
        </div>
        <span className="px-2.5 py-1 bg-accent/10 text-accent font-semibold text-xs rounded-full">
          {rowCount} {rowCount === 1 ? 'Certificate Ready' : 'Certificates Ready'}
        </span>
      </div>

      {/* Brevo Connection Status Banner */}
      <div className="mb-6 p-4 rounded-lg border border-border bg-bg/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-primary">Brevo Provider:</span>
            {brevoStatus.loading ? (
              <span className="text-xs text-muted">Checking connection...</span>
            ) : brevoStatus.configured ? (
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                <span>Configured</span>
                {brevoStatus.test_mode && (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-mono ml-1">
                    TEST MODE
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                <span>Not Configured (Simulated)</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowTestForm(!showTestForm)}
            className="text-xs text-accent hover:underline font-medium"
          >
            {showTestForm ? 'Hide Test Email' : 'Send Test Email'}
          </button>
        </div>

        {brevoStatus.sender_email && (
          <p className="text-xs text-muted mt-1.5">
            Sender: <span className="font-mono text-primary">{brevoStatus.sender_name} &lt;{brevoStatus.sender_email}&gt;</span>
          </p>
        )}

        {/* Quick Test Email Form */}
        {showTestForm && (
          <form onSubmit={handleTestSubmit} className="mt-3 pt-3 border-t border-border flex items-center space-x-2">
            <input
              type="email"
              placeholder="recipient@example.com"
              value={testEmailInput}
              onChange={(e) => setTestEmailInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-border rounded-[6px] focus:outline-none focus:border-accent bg-surface"
              required
            />
            <button
              type="submit"
              disabled={isTestingEmail || !testEmailInput}
              className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-[6px] disabled:opacity-50 transition-colors"
            >
              {isTestingEmail ? 'Sending...' : 'Send Test'}
            </button>
          </form>
        )}
      </div>

      {/* Delivery Channel Selection: Brevo Email Only */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
          Delivery Channel
        </label>

        <div className="p-4 rounded-lg border-2 border-accent bg-accent/5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-primary">Brevo Transactional Email</span>
              <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 font-medium rounded-full">
                PDF Attached
              </span>
            </div>
            <span className="text-xs text-accent font-semibold">Active</span>
          </div>
          <p className="text-xs text-muted">
            Sends personalized emails directly to participants with individual PDF certificates attached.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onDownloadZip}
          className="text-xs text-muted hover:text-primary transition-colors flex items-center space-x-1"
        >
          <span>📦</span>
          <span>Download All as ZIP</span>
        </button>

        <button
          type="button"
          onClick={onValidate}
          disabled={isValidating || rowCount === 0}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Validating Emails...</span>
            </>
          ) : (
            <>
              <span>Validate &amp; Continue</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
