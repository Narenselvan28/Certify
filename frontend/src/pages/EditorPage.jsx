import { useRef, useState, useEffect } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import { useEditor } from '../hooks/useEditor.js';
import { parseExcelFile } from '../services/excel.js';
import { autoMapFields, detectPhoneColumn } from '../utils/mapping.js';
import { clearSession, clearTemplateAsset } from '../services/storage.js';

import { Toolbar } from '../components/editor/Toolbar.jsx';
import { Stage } from '../components/editor/Stage.jsx';
import { PropertiesPanel } from '../components/editor/PropertiesPanel.jsx';
import { FieldBar } from '../components/editor/FieldBar.jsx';

import { GenerateModal } from '../components/modals/GenerateModal.jsx';
import { MappingModal } from '../components/modals/MappingModal.jsx';
import { RestartModal } from '../components/modals/RestartModal.jsx';
import { ExcelDataModal } from '../components/modals/ExcelDataModal.jsx';

export function EditorPage({ onShowToast }) {
  const {
    state,
    dispatch,
    pushHistory,
    captureSnapshot,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
  } = useAppContext();

  const stageRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isRestartOpen, setIsRestartOpen] = useState(false);
  const [isDataViewOpen, setIsDataViewOpen] = useState(false);

  const {
    onFieldBodyMouseDown,
    onResizeHandleMouseDown,
    onRotateHandleMouseDown,
    onMouseMove,
    onMouseUp,
    onKeyDown,
    selectField,
    deselectAll,
  } = useEditor(stageRef);

  // Global mousemove and mouseup listeners for drag/resize/rotate
  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onMouseMove, onMouseUp, onKeyDown]);

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo(state);
        } else {
          undo(state);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo(state);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [undo, redo, state]);

  // Selected field lookup
  const selectedField = state.fields.find((f) => f.id === state.selectedFieldId) || null;

  // Field mutations with undo history
  const handleUpdateField = (changes) => {
    if (!selectedField) return;
    pushHistory(captureSnapshot(state));
    dispatch({ type: A.UPDATE_FIELD, id: selectedField.id, changes });
  };

  const handleDeleteField = () => {
    if (!selectedField) return;
    pushHistory(captureSnapshot(state));
    dispatch({ type: A.DELETE_FIELD, id: selectedField.id });
    onShowToast?.(`Deleted ${selectedField.label}`, 'info');
  };

  const handleAddField = (type) => {
    pushHistory(captureSnapshot(state));
    dispatch({ type: A.ADD_FIELD, fieldType: type });
  };

  // Excel / CSV file upload handler
  const handleUploadExcel = async (file) => {
    try {
      const { fileName, headers, rows, rowCount } = await parseExcelFile(file);
      dispatch({ type: A.SET_EXCEL, excel: { fileName, headers, rows } });

      // Automatically map columns
      const { mappings, confident } = autoMapFields(state.fields, headers);
      dispatch({ type: A.SET_MAPPINGS, mappings });

      // Detect phone column
      const detectedPhone = detectPhoneColumn(headers);
      if (detectedPhone) {
        dispatch({ type: A.SET_PHONE_COLUMN, phoneColumn: detectedPhone });
      }

      onShowToast?.(`Loaded ${rowCount} rows from ${fileName}`, 'success');

      // If mapping was not 100% confident, suggest opening mapping modal
      if (!confident && state.fields.length > 0) {
        setIsMappingOpen(true);
      }
    } catch (err) {
      console.error('Excel upload error:', err);
      onShowToast?.(err.message, 'error');
    }
  };

  // Confirm mapping modal
  const handleConfirmMapping = (newMappings, newPhone) => {
    dispatch({ type: A.SET_MAPPINGS, mappings: newMappings });
    dispatch({ type: A.SET_PHONE_COLUMN, phoneColumn: newPhone });
    setIsMappingOpen(false);
    onShowToast?.('Column mappings updated', 'success');
  };

  // Navigation & Reset
  const handleBackToUpload = () => {
    dispatch({ type: A.SET_PAGE, page: 'upload' });
  };

  const handleConfirmRestart = async () => {
    clearSession();
    await clearTemplateAsset();
    clearHistory();
    dispatch({ type: A.RESET });
    setIsRestartOpen(false);
    onShowToast?.('Project reset', 'info');
  };

  const handleConfirmGenerate = () => {
    setIsGenerateOpen(false);
    dispatch({ type: A.SET_PREVIEW, preview: { mode: 'single', currentIndex: 0 } });
    dispatch({ type: A.SET_PAGE, page: 'preview' });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg">
      {/* Top Toolbar */}
      <Toolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => undo(state)}
        onRedo={() => redo(state)}
        onBack={handleBackToUpload}
        onRestart={() => setIsRestartOpen(true)}
        onOpenMapping={() => setIsMappingOpen(true)}
        onOpenDataView={() => setIsDataViewOpen(true)}
        onOpenGenerate={() => setIsGenerateOpen(true)}
        onUploadExcel={handleUploadExcel}
      />

      {/* Selected Field Properties Panel */}
      {selectedField && (
        <PropertiesPanel
          field={selectedField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
        />
      )}

      {/* Main Canvas Viewport */}
      <Stage
        ref={stageRef}
        template={state.template}
        fields={state.fields}
        selectedFieldId={state.selectedFieldId}
        zoom={zoom}
        onFieldBodyMouseDown={onFieldBodyMouseDown}
        onResizeHandleMouseDown={onResizeHandleMouseDown}
        onRotateHandleMouseDown={onRotateHandleMouseDown}
        onDeselect={deselectAll}
      />

      {/* Bottom Field Add Bar */}
      <FieldBar
        onAddField={handleAddField}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      {/* Dialogs */}
      <GenerateModal
        isOpen={isGenerateOpen}
        rowCount={state.excel?.rows?.length || 0}
        onCancel={() => setIsGenerateOpen(false)}
        onConfirm={handleConfirmGenerate}
      />

      <MappingModal
        isOpen={isMappingOpen}
        fields={state.fields}
        headers={state.excel?.headers || []}
        mappings={state.mappings || {}}
        phoneColumn={state.phoneColumn}
        onConfirm={handleConfirmMapping}
        onCancel={() => setIsMappingOpen(false)}
      />

      <RestartModal
        isOpen={isRestartOpen}
        onCancel={() => setIsRestartOpen(false)}
        onConfirm={handleConfirmRestart}
      />

      <ExcelDataModal
        isOpen={isDataViewOpen}
        excel={state.excel}
        fields={state.fields}
        mappings={state.mappings}
        phoneColumn={state.phoneColumn}
        onClose={() => setIsDataViewOpen(false)}
      />
    </div>
  );
}
