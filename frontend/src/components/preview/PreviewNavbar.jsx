import React from 'react';

export function PreviewNavbar({
  count = 0,
  mode = 'single',
  onModeChange,
  onBack,
  onRestart,
  onOpenExport,
  onOpenDeliveryCenter,
}) {
  return (
    <header className="h-[52px] border-b border-border bg-surface px-5 flex items-center justify-between shrink-0 z-10">
      {/* Left: Brand, Back, Count */}
      <div className="flex items-center space-x-2.5">
        <span className="font-semibold text-sm tracking-tight text-primary">Certify</span>

        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1 text-xs text-muted hover:text-primary px-2 py-1 rounded-[4px] hover:bg-bg transition-colors"
          title="Back to editor"
        >
          <span>←</span>
          <span>Edit Fields</span>
        </button>

        <div className="h-3.5 w-px bg-border"></div>

        <span className="text-sm font-semibold text-primary">
          {count} {count === 1 ? 'Certificate' : 'Certificates'}
        </span>
      </div>

      {/* Center: View Switcher (Single / Grid) */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-bg p-0.5 rounded-[6px] border border-border">
          <button
            type="button"
            onClick={() => onModeChange('single')}
            className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors ${
              mode === 'single'
                ? 'text-primary bg-surface shadow-xs border border-border'
                : 'text-muted hover:text-primary border border-transparent'
            }`}
          >
            Single Preview
          </button>
          <button
            type="button"
            onClick={() => onModeChange('grid')}
            className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors ${
              mode === 'grid'
                ? 'text-primary bg-surface shadow-xs border border-border'
                : 'text-muted hover:text-primary border border-transparent'
            }`}
          >
            Grid View
          </button>
        </div>
      </div>

      {/* Right: Restart, Delivery Center & Export */}
      <div className="flex items-center space-x-2">
        {/* Restart Action */}
        <button
          type="button"
          onClick={onRestart}
          className="px-2.5 py-1 text-xs text-muted hover:text-error rounded-[4px] hover:bg-bg transition-colors"
          title="Start over"
        >
          Restart
        </button>

        <div className="h-3.5 w-px bg-border"></div>

        {/* Primary Delivery Center Action Button */}
        <button
          type="button"
          onClick={onOpenDeliveryCenter}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-[6px] transition-colors shadow-sm"
          title="Send all certificates via Brevo email delivery"
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Send Certificates by Email</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className="px-3.5 py-1.5 text-xs font-medium text-primary bg-surface border border-border hover:bg-bg rounded-[6px] transition-colors"
        >
          Export ZIP
        </button>
      </div>
    </header>
  );
}
