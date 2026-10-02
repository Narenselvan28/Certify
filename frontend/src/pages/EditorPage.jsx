import { useRef, useState, useEffect } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import { useEditor } from '../hooks/useEditor.js';
import { createField } from '../constants/fields.js';

import { Toolbar } from '../components/editor/Toolbar.jsx';
import { Stage } from '../components/editor/Stage.jsx';
import { PropertiesPanel } from '../components/editor/PropertiesPanel.jsx';
import { FieldBar } from '../components/editor/FieldBar.jsx';

import { SignatureManagerModal } from '../components/signatures/SignatureManagerModal.jsx';

export function EditorPage({ onShowToast }) {
  const {
    state,
    dispatch,
    pushHistory,
    captureSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAppContext();

  const stageRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  // Signature modal state
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [sigTargetFieldId, setSigTargetFieldId] = useState(null);

  const {
    onFieldBodyMouseDown,
    onResizeHandleMouseDown,
    onRotateHandleMouseDown,
    onMouseMove,
    onMouseUp,
    onKeyDown,
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
    if (type === 'signature') {
      setSigTargetFieldId(null);
      setIsSigModalOpen(true);
      return;
    }
    pushHistory(captureSnapshot(state));
    dispatch({ type: A.ADD_FIELD, fieldType: type });
  };

  const handleSignatureSelect = (sig) => {
    if (sigTargetFieldId) {
      // Update selected existing signature field
      pushHistory(captureSnapshot(state));
      dispatch({
        type: A.UPDATE_FIELD,
        id: sigTargetFieldId,
        changes: {
          imageSrc: sig.dataUrl,
          signatureId: sig.id,
          label: sig.name,
          designation: sig.designation,
        },
      });
      onShowToast?.(`Updated signature: ${sig.name}`, 'success');
    } else {
      // Create new signature field
      pushHistory(captureSnapshot(state));
      const newField = createField('signature', state.fields.length, state.fieldCounter, {
        label: sig.name,
        signatureId: sig.id,
        imageSrc: sig.dataUrl,
        designation: sig.designation,
      });
      dispatch({
        type: A.SET_FIELDS,
        fields: [...state.fields, newField],
        counter: state.fieldCounter + 1,
      });
      dispatch({ type: A.SELECT_FIELD, id: newField.id });
      onShowToast?.(`Added signature: ${sig.name}`, 'success');
    }
    setSigTargetFieldId(null);
  };

  // Navigation
  const handleBackToUpload = () => {
    dispatch({ type: A.SET_PAGE, page: 'upload' });
  };

  const handleContinueToParticipants = () => {
    dispatch({ type: A.SET_PAGE, page: 'participants' });
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
        onOpenSignatures={() => {
          setSigTargetFieldId(selectedField?.type === 'signature' ? selectedField.id : null);
          setIsSigModalOpen(true);
        }}
        onContinueToParticipants={handleContinueToParticipants}
      />

      {/* Selected Field Properties Panel */}
      {selectedField && (
        <PropertiesPanel
          field={selectedField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          onChangeSignature={() => {
            setSigTargetFieldId(selectedField.id);
            setIsSigModalOpen(true);
          }}
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

      {/* Reusable Signature Manager Modal */}
      <SignatureManagerModal
        isOpen={isSigModalOpen}
        onClose={() => {
          setIsSigModalOpen(false);
          setSigTargetFieldId(null);
        }}
        onSelectSignature={handleSignatureSelect}
      />
    </div>
  );
}
