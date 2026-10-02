// ── App-wide configuration constants ─────────────────────────────────────────

/** Default FastAPI backend URL. Overridden at runtime via the confirmation modal. */
export const API_BASE_URL_DEFAULT = 'http://localhost:8001';

/** localStorage key for session metadata */
export const STORAGE_KEY = 'spectra_session';

/** IndexedDB key for the template image binary */
export const ASSET_KEY = 'template_image';

/** IndexedDB database name */
export const DB_NAME = 'SpectraDB';

/** IndexedDB version — bump when schema changes */
export const DB_VERSION = 2;

/** Session schema version — bump to trigger migration/reset */
export const SESSION_VERSION = 2;

/** Max undo/redo history states */
export const MAX_HISTORY = 100;

/** Auto-save debounce delay in ms */
export const SAVE_DEBOUNCE_MS = 400;
