import React from 'react';

export function AppHeader({
  currentStep, // 'template' | 'participants' | 'review' | 'deliver'
  hasTemplate,
  hasParticipants,
  onNavigateStep,
  onOpenSignatures,
  onStartOver,
}) {
  const steps = [
    { id: 'template', label: '1. Template', desc: 'Design certificate', enabled: true },
    { id: 'participants', label: '2. Participants', desc: 'Import & map', enabled: hasTemplate },
    { id: 'review', label: '3. Review', desc: 'Inspect & edit', enabled: hasTemplate && hasParticipants },
    { id: 'deliver', label: '4. Deliver', desc: 'Email via Brevo', enabled: hasTemplate && hasParticipants },
  ];

  return (
    <header className="h-14 border-b border-border bg-surface px-5 flex items-center justify-between shrink-0 z-30 select-none shadow-xs">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            S
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm tracking-tight text-primary">SPECTRA</span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                SPECTRUM
              </span>
            </div>
            <p className="text-[10px] text-muted -mt-0.5 hidden sm:block">
              Smart Certificate Generation & Distribution
            </p>
          </div>
        </div>
      </div>

      {/* 4-Step Indicator in Center */}
      <nav className="flex items-center space-x-1 sm:space-x-2">
        {steps.map((st, idx) => {
          const isActive = currentStep === st.id;
          const isPassed =
            (st.id === 'template' && (currentStep === 'participants' || currentStep === 'review' || currentStep === 'deliver')) ||
            (st.id === 'participants' && (currentStep === 'review' || currentStep === 'deliver')) ||
            (st.id === 'review' && currentStep === 'deliver');

          return (
            <React.Fragment key={st.id}>
              {idx > 0 && (
                <div className={`w-3 sm:w-5 h-px ${isPassed || isActive ? 'bg-indigo-300' : 'bg-border'}`} />
              )}
              <button
                type="button"
                disabled={!st.enabled}
                onClick={() => st.enabled && onNavigateStep(st.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isPassed
                    ? 'text-primary hover:bg-bg border border-border/80'
                    : 'text-muted/60 bg-transparent cursor-not-allowed'
                }`}
              >
                <span>{st.label}</span>
                {isPassed && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onOpenSignatures}
          className="px-2.5 py-1 text-xs text-muted hover:text-primary hover:bg-bg border border-border rounded-lg transition-colors flex items-center space-x-1.5"
          title="Manage Saved Signatures"
        >
          <span>✍</span>
          <span className="hidden md:inline">Signatures</span>
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="px-2.5 py-1 text-xs text-error hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
          title="Clear current certificate project and start over"
        >
          Start Over
        </button>
      </div>
    </header>
  );
}
