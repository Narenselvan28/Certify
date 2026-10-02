import { useRef } from 'react';
import { useAppContext, A } from '../../context/AppContext.jsx';

export function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBack,
  onRestart,
  onOpenMapping,
  onOpenDataView,
  onOpenGenerate,
  onUploadExcel,
}) {
  const { state, dispatch } = useAppContext();
  const fileInputRef = useRef(null);

  const template = state.template;
  const excel = state.excel;
  const hasRows = (excel?.rows?.length ?? 0) > 0;

  const handleExcelFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadExcel(file);
      e.target.value = '';
    }
  };

  const handleClearExcel = (e) => {
    e.stopPropagation();
    dispatch({ type: A.SET_EXCEL, excel: { fileName: null, headers: [], rows: [] } });
    dispatch({ type: A.SET_MAPPINGS, mappings: {} });
    dispatch({ type: A.SET_PHONE_COLUMN, phoneColumn: null });
  };

  return (
    <header className="h-[52px] border-b border-border bg-surface px-5 flex items-center justify-between z-20 shrink-0">
      {/* Left: Brand, Back, Undo/Redo, Dimension Badge */}
      <div className="flex items-center space-x-2.5">
        <span className="font-semibold text-sm tracking-tight text-primary">Certify</span>

        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1 text-xs text-muted hover:text-primary px-2 py-1 rounded-[4px] hover:bg-bg transition-colors"
          title="Back to template upload"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="h-3.5 w-px bg-border"></div>

        {/* Undo / Redo Toolbar */}
        <div className="flex items-center space-x-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-xs text-primary hover:bg-bg rounded-[4px] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
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
            className="p-1.5 text-xs text-primary hover:bg-bg rounded-[4px] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a5 5 0 00-5 5v2m0 0l3-3m-3 3l-3-3m14-4l-3-3m3 3l-3 3" />
            </svg>
          </button>
        </div>

        {/* Template dimensions */}
        {template?.width > 0 && (
          <span className="text-[11px] text-muted bg-bg border border-border px-2 py-0.5 rounded-[4px]">
            {template.width} × {template.height} px
          </span>
        )}
      </div>

      {/* Center: Session Indicator */}
      <div className="flex items-center">
        <span className="text-[11px] text-muted select-none">Saved</span>
      </div>

      {/* Right: Restart, Excel & Generate Actions */}
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

        {/* Excel Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          onChange={handleExcelFileChange}
        />

        {/* Excel Loaded Badge */}
        {hasRows ? (
          <div className="flex items-center space-x-2 px-2.5 py-1 bg-bg border border-border rounded-[6px] text-xs text-primary">
            <span
              onClick={onOpenDataView}
              className="max-w-[120px] truncate font-medium cursor-pointer hover:underline"
              title="Click to view loaded data"
            >
              {excel.fileName || 'participants'}
            </span>
            <span
              onClick={onOpenDataView}
              className="text-muted cursor-pointer hover:underline"
            >
              ({excel.rows.length})
            </span>
            <button
              type="button"
              onClick={onOpenMapping}
              title="Remap columns"
              className="text-accent hover:underline text-xs font-medium ml-0.5"
            >
              Map
            </button>
            <button
              type="button"
              onClick={handleClearExcel}
              title="Remove file"
              className="text-muted hover:text-primary text-xs ml-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-primary bg-surface border border-border hover:bg-bg rounded-[6px] transition-colors"
          >
            Upload Excel
          </button>
        )}

        {/* Primary Action: Generate Certificates */}
        <button
          type="button"
          onClick={onOpenGenerate}
          className="px-4 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-[6px] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasRows || state.fields.length === 0}
          title={
            !hasRows
              ? 'Upload an Excel or CSV file first'
              : state.fields.length === 0
              ? 'Add at least one field to generate'
              : 'Generate certificates'
          }
        >
          Generate {hasRows ? `(${excel.rows.length})` : ''}
        </button>
      </div>
    </header>
  );
}
