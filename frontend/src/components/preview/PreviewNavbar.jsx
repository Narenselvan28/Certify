import React from 'react';

export function PreviewNavbar({
  count = 0,
  mode = 'single',
  onModeChange,
  onBack,
  onRestart,
  onOpenExport,
  onOpenWhatsApp,
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

      {/* Right: Restart, WhatsApp, Delivery Center & Export */}
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

        {/* Legacy/Quick Single WhatsApp */}
        <button
          type="button"
          onClick={onOpenWhatsApp}
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-success bg-green-50 hover:bg-green-100 border border-green-200 rounded-[6px] transition-colors"
          title="Send all certificates via WhatsApp"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.825zm-3.423-10.416c-4.402 0-7.985 3.583-7.986 7.988 0 1.408.365 2.784 1.059 3.991l-1.073 3.921 4.025-1.055c1.164.635 2.478.971 3.82.971 4.402 0 7.986-3.584 7.986-7.989 0-4.406-3.582-7.99-7.986-7.99z" />
          </svg>
          <span>WhatsApp</span>
        </button>

        {/* Primary Delivery Center Action Button */}
        <button
          type="button"
          onClick={onOpenDeliveryCenter}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-[6px] transition-colors shadow-sm"
          title="Open Multi-Channel Delivery Center (WhatsApp, Email, Queues)"
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Delivery Center</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className="px-3.5 py-1.5 text-xs font-medium text-primary bg-surface border border-border hover:bg-bg rounded-[6px] transition-colors"
        >
          Export
        </button>
      </div>
    </header>
  );
}
