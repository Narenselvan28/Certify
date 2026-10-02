import React from 'react';

export function DeliveryMethodSelector({
  rowCount,
  channels,
  onToggleChannel,
  enableFallback,
  onToggleFallback,
  onValidate,
  isValidating,
  onDownloadZip,
}) {
  const isWhatsAppSelected = channels.includes('whatsapp');
  const isEmailSelected = channels.includes('email');

  return (
    <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Certificate Delivery Center</h2>
          <p className="text-xs text-muted mt-0.5">
            Configure multi-channel automated delivery for all participants
          </p>
        </div>
        <span className="px-2.5 py-1 bg-accent/10 text-accent font-semibold text-xs rounded-full">
          {rowCount} {rowCount === 1 ? 'Certificate' : 'Certificates'}
        </span>
      </div>

      <div className="space-y-4 mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted block">
          Select Delivery Channels
        </label>

        {/* WhatsApp Channel Card */}
        <div
          onClick={() => onToggleChannel('whatsapp')}
          className={`flex items-start space-x-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
            isWhatsAppSelected
              ? 'border-accent bg-accent/5 shadow-xs'
              : 'border-border hover:border-border-strong bg-surface'
          }`}
        >
          <input
            type="checkbox"
            checked={isWhatsAppSelected}
            onChange={() => onToggleChannel('whatsapp')}
            className="mt-0.5 rounded text-accent focus:ring-accent"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-primary">WhatsApp Business API</span>
              <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 font-medium rounded-full">
                Direct to WhatsApp
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Deliver PDF certificate directly to the participant's WhatsApp phone number.
            </p>
          </div>
        </div>

        {/* Email Channel Card */}
        <div
          onClick={() => onToggleChannel('email')}
          className={`flex items-start space-x-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
            isEmailSelected
              ? 'border-accent bg-accent/5 shadow-xs'
              : 'border-border hover:border-border-strong bg-surface'
          }`}
        >
          <input
            type="checkbox"
            checked={isEmailSelected}
            onChange={() => onToggleChannel('email')}
            className="mt-0.5 rounded text-accent focus:ring-accent"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-primary">Email Delivery (SMTP)</span>
              <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 font-medium rounded-full">
                PDF Attached
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Send personalized email with certificate PDF attachment via SMTP server.
            </p>
          </div>
        </div>

        {/* Fallback Option */}
        <div className="pt-2">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableFallback}
              onChange={(e) => onToggleFallback(e.target.checked)}
              className="rounded text-accent focus:ring-accent"
            />
            <span className="text-xs font-medium text-primary">
              Use Email fallback if WhatsApp delivery fails permanently
            </span>
          </label>
          <p className="text-[11px] text-muted ml-6 mt-0.5">
            Automatically sends via Email if a participant's WhatsApp fails, ensuring zero missed certificates.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onDownloadZip}
          className="text-xs text-muted hover:text-primary transition-colors flex items-center space-x-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download All as ZIP instead</span>
        </button>

        <button
          type="button"
          onClick={onValidate}
          disabled={channels.length === 0 || isValidating}
          className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {isValidating && (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          )}
          <span>{isValidating ? 'Validating...' : 'Review & Validate →'}</span>
        </button>
      </div>
    </div>
  );
}
