// useSession — auto-save and restore session state

import { useEffect, useRef, useCallback } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import {
  loadSession, saveSession, clearSession,
  loadTemplateAsset, saveTemplateAsset, clearTemplateAsset,
  loadImage,
} from '../services/storage.js';
import { SESSION_VERSION, SAVE_DEBOUNCE_MS } from '../constants/config.js';

export function useSession() {
  const { state, dispatch, clearHistory } = useAppContext();
  const saveTimer = useRef(null);
  const isRestoring = useRef(false);

  /** Save current state to localStorage + IndexedDB */
  const saveNow = useCallback(async () => {
    if (isRestoring.current) return;
    try {
      const session = {
        version: SESSION_VERSION,
        updatedAt: new Date().toISOString(),
        page: state.page,
        template: state.template,
        fields: state.fields,
        fieldCounter: state.fieldCounter,
        selectedFieldId: state.selectedFieldId,
        excel: state.excel,
        mappings: state.mappings,
        phoneColumn: state.phoneColumn,
        emailColumn: state.emailColumn,
        preview: state.preview,
      };
      saveSession(session);
      if (state.template.src) await saveTemplateAsset(state.template.src);
    } catch (err) {
      console.warn('Session save failed:', err);
    }
  }, [state]);

  /** Debounced save — called after meaningful state changes */
  const scheduleSave = useCallback(() => {
    if (isRestoring.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
  }, [saveNow]);

  /** Restore session on first mount */
  const restore = useCallback(async () => {
    const session = loadSession();
    if (!session) return false;
    if (!session || session.version !== SESSION_VERSION) {
      clearSession();
      await clearTemplateAsset();
      return false;
    }

    isRestoring.current = true;
    try {
      const hasTemplateMeta = session.template?.width > 0;
      let imgSrc = null;
      let imgEl  = null;

      if (hasTemplateMeta) {
        imgSrc = await loadTemplateAsset();
        if (!imgSrc) {
          // Template missing — surface recovery modal
          dispatch({ type: A.SET_PAGE, page: 'recovery' });
          return false;
        }
        imgEl = await loadImage(imgSrc);
      }

      if (imgEl) {
        dispatch({ type: A.SET_TEMPLATE, template: session.template, image: imgEl });
      }

      dispatch({
        type: A.SET_FIELDS,
        fields: session.fields || [],
        counter: session.fieldCounter || 1,
      });
      dispatch({ type: A.SELECT_FIELD, id: session.selectedFieldId || null });

      if (session.excel?.rows?.length > 0) {
        dispatch({ type: A.SET_EXCEL, excel: session.excel });
      }

      dispatch({ type: A.SET_MAPPINGS, mappings: session.mappings || {} });
      dispatch({ type: A.SET_PHONE_COLUMN, phoneColumn: session.phoneColumn || null });
      dispatch({ type: A.SET_EMAIL_COLUMN, emailColumn: session.emailColumn || null });

      if (session.preview) {
        dispatch({ type: A.SET_PREVIEW, preview: session.preview });
      }

      // Determine target page with safety guards
      let targetPage = session.page || 'editor';
      if (targetPage === 'preview' && (!session.excel?.rows?.length || !hasTemplateMeta)) {
        targetPage = hasTemplateMeta ? 'editor' : 'upload';
      }
      if (targetPage === 'editor' && !hasTemplateMeta) targetPage = 'upload';

      dispatch({ type: A.SET_PAGE, page: targetPage });
      clearHistory();
      return true;
    } catch (err) {
      console.warn('Session restore failed:', err);
      return false;
    } finally {
      isRestoring.current = false;
    }
  }, [dispatch, clearHistory]);

  /** Full wipe — used by Restart */
  const wipeSession = useCallback(async () => {
    clearSession();
    await clearTemplateAsset();
  }, []);

  // Auto-save whenever meaningful state changes
  useEffect(() => {
    if (!isRestoring.current && state.page !== 'recovery') {
      scheduleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.page, state.template, state.fields, state.excel,
      state.mappings, state.phoneColumn, state.emailColumn, state.preview]);

  return { restore, saveNow, scheduleSave, wipeSession, isRestoring };
}
