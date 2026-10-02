import { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { createField } from '../constants/fields.js';
import { MAX_HISTORY } from '../constants/config.js';

// ── Initial State ─────────────────────────────────────────────────────────────

export const initialState = {
  page: 'upload',         // 'upload' | 'editor' | 'preview' | 'delivery'
  template: { name: null, src: null, width: 0, height: 0, aspectRatio: 1 },
  templateImage: null,    // loaded HTMLImageElement (not serializable — kept in state only)
  fields: [],
  fieldCounter: 1,
  selectedFieldId: null,
  excel: { fileName: null, headers: [], rows: [] },
  mappings: {},
  phoneColumn: null,
  emailColumn: null,
  preview: { mode: 'single', currentIndex: 0 },
  delivery: { results: [], isSending: false, apiBaseUrl: 'http://localhost:8001' },
};

// ── Action Types ──────────────────────────────────────────────────────────────

export const A = {
  SET_PAGE:           'SET_PAGE',
  SET_TEMPLATE:       'SET_TEMPLATE',
  SET_FIELDS:         'SET_FIELDS',
  ADD_FIELD:          'ADD_FIELD',
  UPDATE_FIELD:       'UPDATE_FIELD',
  DELETE_FIELD:       'DELETE_FIELD',
  SELECT_FIELD:       'SELECT_FIELD',
  SET_EXCEL:          'SET_EXCEL',
  SET_MAPPINGS:       'SET_MAPPINGS',
  SET_PHONE_COLUMN:   'SET_PHONE_COLUMN',
  SET_EMAIL_COLUMN:   'SET_EMAIL_COLUMN',
  SET_PREVIEW:        'SET_PREVIEW',
  SET_DELIVERY:       'SET_DELIVERY',
  RESET:              'RESET',
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    case A.SET_PAGE:
      return { ...state, page: action.page };

    case A.SET_TEMPLATE:
      return {
        ...state,
        template: { ...state.template, ...action.template },
        templateImage: action.image ?? state.templateImage,
      };

    case A.SET_FIELDS:
      return { ...state, fields: action.fields, fieldCounter: action.counter ?? state.fieldCounter };

    case A.ADD_FIELD: {
      const field = createField(action.fieldType, state.fields.length, state.fieldCounter);
      return {
        ...state,
        fields: [...state.fields, field],
        fieldCounter: state.fieldCounter + 1,
        selectedFieldId: field.id,
      };
    }

    case A.UPDATE_FIELD:
      return {
        ...state,
        fields: state.fields.map(f => f.id === action.id ? { ...f, ...action.changes } : f),
      };

    case A.DELETE_FIELD:
      return {
        ...state,
        fields: state.fields.filter(f => f.id !== action.id),
        selectedFieldId: state.selectedFieldId === action.id ? null : state.selectedFieldId,
      };

    case A.SELECT_FIELD:
      return { ...state, selectedFieldId: action.id ?? null };

    case A.SET_EXCEL:
      return { ...state, excel: { ...state.excel, ...action.excel } };

    case A.SET_MAPPINGS:
      return { ...state, mappings: action.mappings };

    case A.SET_PHONE_COLUMN:
      return { ...state, phoneColumn: action.phoneColumn };

    case A.SET_EMAIL_COLUMN:
      return { ...state, emailColumn: action.emailColumn };

    case A.SET_PREVIEW:
      return { ...state, preview: { ...state.preview, ...action.preview } };

    case A.SET_DELIVERY:
      return { ...state, delivery: { ...state.delivery, ...action.delivery } };

    case A.RESET:
      return {
        ...initialState,
        page: 'upload',
      };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ── History (undo/redo) ─────────────────────────────────────────────────
  // Stacks stored as refs — don't need to cause re-renders themselves
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  /** Capture current fields+selection as a history snapshot */
  const captureSnapshot = useCallback((currentState) => ({
    fields: JSON.parse(JSON.stringify(currentState.fields)),
    selectedFieldId: currentState.selectedFieldId,
    fieldCounter: currentState.fieldCounter,
  }), []);

  /** Record an action for undo. Call BEFORE making the change via dispatch. */
  const pushHistory = useCallback((snapshot) => {
    undoStack.current.push(snapshot);
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const undo = useCallback((currentState) => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(captureSnapshot(currentState));
    dispatch({ type: A.SET_FIELDS, fields: prev.fields, counter: prev.fieldCounter });
    dispatch({ type: A.SELECT_FIELD, id: prev.selectedFieldId });
  }, [captureSnapshot]);

  const redo = useCallback((currentState) => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(captureSnapshot(currentState));
    dispatch({ type: A.SET_FIELDS, fields: next.fields, counter: next.fieldCounter });
    dispatch({ type: A.SELECT_FIELD, id: next.selectedFieldId });
  }, [captureSnapshot]);

  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  const value = {
    state,
    dispatch,
    // History
    pushHistory,
    captureSnapshot,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    undoStack,
    redoStack,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
