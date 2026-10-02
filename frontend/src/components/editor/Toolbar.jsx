import { useRef } from 'react';
import { useAppContext, A } from '../../context/AppContext.jsx';

export function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBack,
  onRestart,
  onOpenSignatures,
  onContinueToParticipants,
}) {
  const { state } = useAppContext();
  const template = state.template;
  const participantCount = state.excel?.rows?.length || 0;

  return (
    <header className="h-[52px] border-b border-border bg-surface px-5 flex items-center justify-between z-20 shrink-0">
      {/* Left: Brand, Back, Undo/Redo, Dimension Badge */}
      <div className="flex items-center space-x-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1 text-xs text-muted hover:text-primary px-2.5 py-1 rounded-lg border border-border/80 hover:bg-bg transition-colors"
          title="Back to template upload"
        >
          <span>←</span>
          <span>Template</span>
        </button>

        <div className="h-3.5 w-px bg-border" />

        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-xs text-primary hover:bg-bg rounded-md transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2m0 0l-3-3m3 3l3-3M3 10l3-3m-3 3l3 3" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-xs text-primary hover:bg-bg rounded-md transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a5 5 0 00-5 5v2m0 0l3-3m-3 3l-3-3m14-4l-3-3m3 3l-3 3" />
            </svg>
          </button>
        </div>

        {/* Template dimensions */}
        {template?.width > 0 && (
          <span className="text-[11px] text-muted bg-bg border border-border px-2 py-0.5 rounded font-mono">
            {template.width} × {template.height} px
          </span>
        )}
      </div>

      {/* Center: Step description */}
      <div className="hidden md:flex items-center space-x-2 text-xs text-muted">
        <span className="font-semibold text-primary">Designer</span>
        <span>—</span>
        <span>Drag, resize, rotate and format certificate fields</span>
      </div>

      {/* Right: Signature Library & Continue */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onOpenSignatures}
          className="px-3 py-1.5 text-xs font-medium text-primary bg-surface border border-border hover:bg-bg rounded-lg transition-colors flex items-center space-x-1.5"
          title="Manage saved signatures"
        >
          <span>✍</span>
          <span>Signatures</span>
        </button>

        {/* Primary Continue Button to Step 2 */}
        <button
          type="button"
          onClick={onContinueToParticipants}
          className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5"
          title="Proceed to participants import"
        >
          <span>Continue to Participants</span>
          {participantCount > 0 && <span className="font-mono text-indigo-200">({participantCount})</span>}
          <span>→</span>
        </button>
      </div>
    </header>
  );
}
