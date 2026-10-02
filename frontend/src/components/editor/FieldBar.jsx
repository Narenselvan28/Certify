import { FIELD_TYPES } from '../../constants/fields.js';

export function FieldBar({ onAddField, zoom, onZoomChange }) {
  return (
    <footer className="h-12 bg-surface border-t border-border px-4 flex items-center justify-between shrink-0 z-20">
      {/* Zoom Stepper on Left */}
      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(0.4, Number((zoom - 0.1).toFixed(1))))}
          className="w-7 h-7 flex items-center justify-center rounded border border-border text-xs text-primary hover:bg-bg transition-colors"
          title="Zoom out"
        >
          -
        </button>
        <span className="text-xs text-muted font-mono w-12 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onZoomChange(Math.min(2.0, Number((zoom + 0.1).toFixed(1))))}
          className="w-7 h-7 flex items-center justify-center rounded border border-border text-xs text-primary hover:bg-bg transition-colors"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onZoomChange(1.0)}
          className="px-2 py-1 rounded border border-border text-[11px] text-muted hover:text-primary hover:bg-bg transition-colors"
          title="Reset zoom to 100%"
        >
          Fit
        </button>
      </div>

      {/* Field Pills in Center */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
        {FIELD_TYPES.map((ft) => (
          <button
            key={ft.type}
            type="button"
            onClick={() => onAddField(ft.type)}
            className={`px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
              ft.dashed
                ? 'text-muted hover:text-primary bg-surface hover:bg-bg border border-dashed border-border-strong'
                : 'text-primary bg-surface hover:bg-bg border border-border shadow-xs'
            }`}
          >
            {ft.label}
          </button>
        ))}
      </div>

      {/* Shortcuts Hint on Right */}
      <div className="hidden lg:flex items-center text-[11px] text-muted space-x-3">
        <span><kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Del</kbd> Delete</span>
        <span><kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Arrows</kbd> Nudge</span>
        <span><kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Ctrl+Z</kbd> Undo</span>
      </div>
    </footer>
  );
}
