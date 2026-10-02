// useEditor — drag, resize, rotate interaction logic for the certificate editor.
// Uses refs for in-progress interaction data (no re-render per mousemove).

import { useRef, useCallback } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';

const HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function useEditor(stageRef) {
  const { state, dispatch, pushHistory, captureSnapshot } = useAppContext();
  const interaction = useRef(null); // current drag/resize/rotate state

  // ── Field selection ───────────────────────────────────────────────────────

  const selectField = useCallback((id) => {
    dispatch({ type: A.SELECT_FIELD, id });
  }, [dispatch]);

  const deselectAll = useCallback(() => {
    dispatch({ type: A.SELECT_FIELD, id: null });
  }, [dispatch]);

  // ── Stage helpers ─────────────────────────────────────────────────────────

  const getStageRect = useCallback(() => {
    return stageRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 1, height: 1 };
  }, [stageRef]);

  // ── Drag (move) ───────────────────────────────────────────────────────────

  const onFieldBodyMouseDown = useCallback((e, fieldId) => {
    e.stopPropagation();
    e.preventDefault();
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    dispatch({ type: A.SELECT_FIELD, id: fieldId });
    const rect = getStageRect();
    const snapshot = captureSnapshot(state);
    interaction.current = {
      type: 'move',
      fieldId,
      snapshot,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: field.x,
      startY: field.y,
      stageW: rect.width,
      stageH: rect.height,
    };
  }, [state, dispatch, getStageRect, captureSnapshot]);

  // ── Resize ────────────────────────────────────────────────────────────────

  const onResizeHandleMouseDown = useCallback((e, fieldId, handle) => {
    e.stopPropagation();
    e.preventDefault();
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    const rect = getStageRect();
    const snapshot = captureSnapshot(state);
    interaction.current = {
      type: 'resize',
      fieldId,
      handle,
      snapshot,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startField: { ...field },
      stageW: rect.width,
      stageH: rect.height,
    };
  }, [state, getStageRect, captureSnapshot]);

  // ── Rotate ────────────────────────────────────────────────────────────────

  const onRotateHandleMouseDown = useCallback((e, fieldId) => {
    e.stopPropagation();
    e.preventDefault();
    const field = state.fields.find(f => f.id === fieldId);
    if (!field) return;
    const rect = getStageRect();
    const snapshot = captureSnapshot(state);
    const centerX = rect.left + (field.x + field.width / 2) * rect.width;
    const centerY = rect.top  + (field.y + field.height / 2) * rect.height;
    interaction.current = {
      type: 'rotate',
      fieldId,
      snapshot,
      centerX,
      centerY,
      startRotation: field.rotation || 0,
      startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI),
    };
  }, [state, getStageRect, captureSnapshot]);

  // ── Global mouse move ─────────────────────────────────────────────────────

  const onMouseMove = useCallback((e) => {
    const it = interaction.current;
    if (!it) return;

    if (it.type === 'move') {
      const dx = (e.clientX - it.startClientX) / it.stageW;
      const dy = (e.clientY - it.startClientY) / it.stageH;
      const field = state.fields.find(f => f.id === it.fieldId);
      if (!field) return;
      const newX = Math.max(0, Math.min(1 - field.width,  it.startX + dx));
      const newY = Math.max(0, Math.min(1 - field.height, it.startY + dy));
      dispatch({ type: A.UPDATE_FIELD, id: it.fieldId, changes: { x: newX, y: newY } });

    } else if (it.type === 'resize') {
      const dx = (e.clientX - it.startClientX) / it.stageW;
      const dy = (e.clientY - it.startClientY) / it.stageH;
      const sf = it.startField;
      let { x, y, width, height } = sf;
      const handle = it.handle;

      if (handle.includes('e')) width  = Math.max(0.03, sf.width  + dx);
      if (handle.includes('s')) height = Math.max(0.02, sf.height + dy);
      if (handle.includes('w')) { x = sf.x + dx; width = Math.max(0.03, sf.width - dx); }
      if (handle.includes('n')) { y = sf.y + dy; height = Math.max(0.02, sf.height - dy); }

      dispatch({ type: A.UPDATE_FIELD, id: it.fieldId, changes: { x, y, width, height } });

    } else if (it.type === 'rotate') {
      const angle = Math.atan2(e.clientY - it.centerY, e.clientX - it.centerX) * (180 / Math.PI);
      let rotation = it.startRotation + (angle - it.startAngle);
      if (e.shiftKey) rotation = Math.round(rotation / 15) * 15; // 15° snap with Shift
      dispatch({ type: A.UPDATE_FIELD, id: it.fieldId, changes: { rotation: Math.round(rotation * 10) / 10 } });
    }
  }, [state.fields, dispatch]);

  // ── Global mouse up — commit to history ───────────────────────────────────

  const onMouseUp = useCallback(() => {
    if (!interaction.current) return;
    pushHistory(interaction.current.snapshot);
    interaction.current = null;
  }, [pushHistory]);

  // ── Keyboard handler ──────────────────────────────────────────────────────

  const onKeyDown = useCallback((e) => {
    const { selectedFieldId, fields } = state;
    if (!selectedFieldId) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    const field = fields.find(f => f.id === selectedFieldId);
    if (!field) return;

    const step = e.shiftKey ? 0.01 : 0.002;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const snapshot = captureSnapshot(state);
      let { x, y } = field;
      if (e.key === 'ArrowLeft')  x = Math.max(0, x - step);
      if (e.key === 'ArrowRight') x = Math.min(1 - field.width,  x + step);
      if (e.key === 'ArrowUp')    y = Math.max(0, y - step);
      if (e.key === 'ArrowDown')  y = Math.min(1 - field.height, y + step);
      pushHistory(snapshot);
      dispatch({ type: A.UPDATE_FIELD, id: selectedFieldId, changes: { x, y } });
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const snapshot = captureSnapshot(state);
      pushHistory(snapshot);
      dispatch({ type: A.DELETE_FIELD, id: selectedFieldId });
    }

    if (e.key === 'Escape') {
      dispatch({ type: A.SELECT_FIELD, id: null });
    }
  }, [state, dispatch, pushHistory, captureSnapshot]);

  return {
    onFieldBodyMouseDown,
    onResizeHandleMouseDown,
    onRotateHandleMouseDown,
    onMouseMove,
    onMouseUp,
    onKeyDown,
    selectField,
    deselectAll,
    HANDLE_DIRS,
  };
}
