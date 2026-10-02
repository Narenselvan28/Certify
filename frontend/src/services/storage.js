// IndexedDB + localStorage persistence service

import { DB_NAME, DB_VERSION, STORAGE_KEY, ASSET_KEY } from '../constants/config.js';

// ── IndexedDB ────────────────────────────────────────────────────────────────

let _db = null;

async function getDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('IndexedDB not supported'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets');
      }
      if (!db.objectStoreNames.contains('signatures')) {
        db.createObjectStore('signatures', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

export const idb = {
  async set(storeName, key, value) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        if (key !== null && key !== undefined) {
          tx.objectStore(storeName).put(value, key);
        } else {
          tx.objectStore(storeName).put(value);
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch { return false; }
  },

  async get(storeName, key) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    } catch { return null; }
  },

  async getAll(storeName) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
    } catch { return []; }
  },

  async delete(storeName, key) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch { return false; }
  },

  async clear(storeName) {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch { return false; }
  },
};

// ── localStorage helpers ──────────────────────────────────────────────────────

export function loadSession() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Backward compatibility fallback
      raw = localStorage.getItem('certify_session');
    }
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSession(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('certify_session');
  } catch {}
}

// ── Template image via IndexedDB ──────────────────────────────────────────────

export async function saveTemplateAsset(src) {
  return idb.set('assets', ASSET_KEY, src);
}

export async function loadTemplateAsset() {
  return idb.get('assets', ASSET_KEY);
}

export async function clearTemplateAsset() {
  return idb.clear('assets');
}

// ── Digital Signature Library via IndexedDB ───────────────────────────────────

export async function saveSignature(signature) {
  if (!signature.id) {
    signature.id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  if (!signature.createdAt) {
    signature.createdAt = new Date().toISOString();
  }
  await idb.set('signatures', null, signature);
  return signature;
}

export async function loadSignatures() {
  return idb.getAll('signatures');
}

export async function deleteSignature(id) {
  return idb.delete('signatures', id);
}

// ── Saved Template Library via IndexedDB ──────────────────────────────────────

export async function saveSavedTemplate(templateData) {
  if (!templateData.id) {
    templateData.id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  templateData.updatedAt = new Date().toISOString();
  await idb.set('templates', null, templateData);
  return templateData;
}

export async function loadSavedTemplates() {
  return idb.getAll('templates');
}

export async function deleteSavedTemplate(id) {
  return idb.delete('templates', id);
}

// ── Load an Image from a data-URL src ────────────────────────────────────────

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// ── Read a File as data-URL ───────────────────────────────────────────────────

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
