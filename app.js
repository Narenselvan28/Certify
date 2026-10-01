/**
 * Certify — Minimal Client-Side Bulk Certificate Generator
 * 
 * Architecture:
 * - StorageDB: IndexedDB wrapper for large binary template image storage
 * - AppState: Central application state schema & metadata
 * - HistoryManager: 100-state undo/redo for editor changes with smart grouping & keyboard shortcuts
 * - NavigationManager: Application page router (upload <-> editor <-> preview) with browser History API
 * - SessionManager: Auto-persistence to localStorage + IndexedDB with debouncing & status indicator
 * - RestartManager: Safe start-over flow with confirmation dialog & selective storage wipe
 * - FontManager: Google Fonts list, categorization, search, and dynamic loading
 * - TemplateManager: Template image loading and aspect ratio calculations
 * - FieldManager: Field definitions, normalized coordinates, and state
 * - Editor: Interactive workspace, drag-and-drop, resize handles, rotation, keyboard controls
 * - ExcelManager: File parsing via SheetJS (.xlsx, .xls, .csv)
 * - MappingManager: Auto-matching columns with fuzzy aliases and modal
 * - CertificateRenderer: Pixel-perfect unified HTML5 Canvas rendering engine
 * - PreviewManager: Single Preview & Grid View, pagination, jump-to, error inspection
 * - PDFExporter: High-resolution PDF generation matching template dimensions using jsPDF
 * - ZipExporter: Bulk packaging into ZIP using JSZip with live progress tracking
 * - ModalManager: Dialogs for confirmation, column mapping, export, restart, and recovery
 * - App: Main controller wiring the complete workflow
 */

// ============================================================================
// 1. STORAGE DB (IndexedDB for Large Binary Assets)
// ============================================================================
const StorageDB = {
  dbName: 'CertifyDB',
  version: 1,
  storeName: 'assets',
  db: null,

  async getDB() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async set(key, value) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('StorageDB set failed:', err);
      return false;
    }
  },

  async get(key) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('StorageDB get failed:', err);
      return null;
    }
  },

  async delete(key) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('StorageDB delete failed:', err);
      return false;
    }
  },

  async clear() {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('StorageDB clear failed:', err);
      return false;
    }
  }
};

// ============================================================================
// 2. CENTRAL APP STATE SCHEMA
// ============================================================================
const AppState = {
  version: 1,
  STORAGE_KEY: 'certify_session',
  ASSET_KEY: 'template_image'
};

// ============================================================================
// 3. HISTORY MANAGER (Undo / Redo System)
// ============================================================================
const HistoryManager = {
  undoStack: [],
  redoStack: [],
  maxStates: 100,
  dragStartSnapshot: null,
  isApplyingHistory: false,

  captureState() {
    return {
      fields: JSON.parse(JSON.stringify(FieldManager.fields)),
      selectedFieldId: FieldManager.selectedFieldId
    };
  },

  applyState(snapshot) {
    if (!snapshot) return;
    this.isApplyingHistory = true;
    try {
      FieldManager.fields = JSON.parse(JSON.stringify(snapshot.fields || []));
      FieldManager.selectedFieldId = snapshot.selectedFieldId || null;

      // Re-render field elements in editor
      Editor.clearAllFieldElements();
      FieldManager.fields.forEach(f => Editor.renderFieldElement(f));
      Editor.onFieldSelectionChanged();

      this.updateUI();
      SessionManager.scheduleSave();
    } finally {
      this.isApplyingHistory = false;
    }
  },

  recordAction(actionFn) {
    if (this.isApplyingHistory) {
      actionFn();
      return;
    }
    const beforeSnapshot = this.captureState();
    actionFn();
    this.undoStack.push(beforeSnapshot);
    if (this.undoStack.length > this.maxStates) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUI();
    SessionManager.scheduleSave();
  },

  pushState(beforeSnapshot) {
    if (this.isApplyingHistory) return;
    const stateToPush = beforeSnapshot || this.captureState();
    this.undoStack.push(stateToPush);
    if (this.undoStack.length > this.maxStates) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUI();
    SessionManager.scheduleSave();
  },

  undo() {
    if (!this.canUndo()) return;
    const currentState = this.captureState();
    const previousState = this.undoStack.pop();
    this.redoStack.push(currentState);
    this.applyState(previousState);
  },

  redo() {
    if (!this.canRedo()) return;
    const currentState = this.captureState();
    const nextState = this.redoStack.pop();
    this.undoStack.push(currentState);
    this.applyState(nextState);
  },

  canUndo() {
    return this.undoStack.length > 0;
  },

  canRedo() {
    return this.redoStack.length > 0;
  },

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.dragStartSnapshot = null;
    this.updateUI();
  },

  updateUI() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) {
      btnUndo.disabled = !this.canUndo();
    }
    if (btnRedo) {
      btnRedo.disabled = !this.canRedo();
    }
  },

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Preserve native undo behavior in text inputs, textareas, selects, or contenteditable
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable) {
        return;
      }

      // Only handle editor undo shortcuts when in editor
      if (NavigationManager.currentPage !== 'editor') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          this.redo();
        }
      }
    });
  }
};

// ============================================================================
// 4. NAVIGATION MANAGER (Decoupled SPA Page Router & Browser History)
// ============================================================================
const NavigationManager = {
  currentPage: 'upload', // 'upload' | 'editor' | 'preview'

  init() {
    // Listen for browser native back / forward buttons
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.renderPage(e.state.page, false);
      } else {
        this.renderPage('upload', false);
      }
    });
  },

  goTo(page) {
    if (this.currentPage === page) return;
    this.renderPage(page, true);
  },

  replace(page) {
    this.currentPage = page;
    try {
      history.replaceState({ page }, '', '');
    } catch (_) {}
    this.updateDOMView(page);
    SessionManager.scheduleSave();
  },

  renderPage(page, pushHistory = true) {
    // Safety guards against invalid navigation
    if (page === 'preview' && (!ExcelManager.isLoaded() || !TemplateManager.isLoaded())) {
      page = TemplateManager.isLoaded() ? 'editor' : 'upload';
    }
    if (page === 'editor' && !TemplateManager.isLoaded()) {
      page = 'upload';
    }

    this.currentPage = page;
    if (pushHistory) {
      try {
        history.pushState({ page }, '', '');
      } catch (_) {}
    }

    this.updateDOMView(page);
    SessionManager.scheduleSave();
  },

  back() {
    if (this.currentPage === 'preview') {
      this.goTo('editor');
    } else if (this.currentPage === 'editor') {
      this.goTo('upload');
    }
  },

  updateDOMView(page) {
    const states = {
      'upload': 'state-upload',
      'editor': 'state-editor',
      'preview': 'state-preview'
    };

    Object.entries(states).forEach(([p, elementId]) => {
      const el = document.getElementById(elementId);
      if (el) {
        if (p === page) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    if (page === 'editor') {
      setTimeout(() => Editor.resizeStage(), 50);
    }
  }
};

// ============================================================================
// 5. SESSION MANAGER (Debounced Auto-Save & Full Restoration)
// ============================================================================
const SessionManager = {
  saveTimer: null,
  isRestoring: false,

  setIndicator(status) {
    const indEditor = document.getElementById('session-save-indicator');
    const indPreview = document.getElementById('preview-save-indicator');
    if (indEditor) indEditor.textContent = status;
    if (indPreview) indPreview.textContent = status;
  },

  scheduleSave() {
    if (this.isRestoring) return;
    this.setIndicator('Saving...');

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveNow();
    }, 400);
  },

  async saveNow() {
    if (this.isRestoring) return;
    try {
      const sessionData = {
        version: AppState.version,
        updatedAt: new Date().toISOString(),
        page: NavigationManager.currentPage,
        template: {
          name: TemplateManager.fileName || 'template.png',
          naturalWidth: TemplateManager.naturalWidth,
          naturalHeight: TemplateManager.naturalHeight,
          aspectRatio: TemplateManager.aspectRatio
        },
        fields: FieldManager.fields,
        selectedFieldId: FieldManager.selectedFieldId,
        fieldCounter: FieldManager.counter,
        excel: {
          fileName: ExcelManager.fileName,
          headers: ExcelManager.headers,
          rows: ExcelManager.rows
        },
        mappings: MappingManager.mappings,
        preview: {
          currentIndex: PreviewManager.currentIndex,
          viewMode: PreviewManager.viewMode
        }
      };

      // 1. Save metadata in localStorage
      localStorage.setItem(AppState.STORAGE_KEY, JSON.stringify(sessionData));

      // 2. Save template binary asset in IndexedDB if available
      if (TemplateManager.src) {
        await StorageDB.set(AppState.ASSET_KEY, TemplateManager.src);
      }

      this.setIndicator('Saved');
    } catch (err) {
      console.warn('Could not save session locally:', err);
      this.setIndicator('Saved locally');
      // Graceful fallback: continue working in memory
    }
  },

  async restore() {
    const rawData = localStorage.getItem(AppState.STORAGE_KEY);
    if (!rawData) return false;

    this.isRestoring = true;
    try {
      const session = JSON.parse(rawData);

      // Versioning check
      if (!session || session.version !== AppState.version) {
        App.showToast('This saved session is no longer compatible. Starting fresh.', 'info');
        localStorage.removeItem(AppState.STORAGE_KEY);
        await StorageDB.clear();
        return false;
      }

      // Check if template was saved
      const hasTemplateMeta = session.template && session.template.naturalWidth > 0;
      let templateSrc = null;

      if (hasTemplateMeta) {
        templateSrc = await StorageDB.get(AppState.ASSET_KEY);
        if (!templateSrc) {
          // Template missing: prompt user with recovery modal
          ModalManager.open('modal-recovery');
          return false;
        }
      }

      // Restore template if available
      if (templateSrc) {
        TemplateManager.fileName = session.template.name || 'template.png';
        await TemplateManager.loadFromSrc(templateSrc);
        Editor.setupTemplate(TemplateManager.image);
      }

      // Restore fields
      FieldManager.fields = session.fields || [];
      FieldManager.counter = session.fieldCounter || (FieldManager.fields.length + 1);
      FieldManager.selectedFieldId = session.selectedFieldId || null;

      if (TemplateManager.isLoaded()) {
        Editor.clearAllFieldElements();
        FieldManager.fields.forEach(f => Editor.renderFieldElement(f));
        Editor.onFieldSelectionChanged();
      }

      // Restore Excel data
      if (session.excel && session.excel.rows && session.excel.rows.length > 0) {
        ExcelManager.fileName = session.excel.fileName || 'participants.xlsx';
        ExcelManager.headers = session.excel.headers || [];
        ExcelManager.rows = session.excel.rows || [];

        // Update Excel badge
        const badge = document.getElementById('excel-loaded-badge');
        const uploadBtn = document.getElementById('btn-upload-excel');
        const fnText = document.getElementById('excel-filename-text');
        const rcText = document.getElementById('excel-row-count-text');

        if (badge) {
          badge.classList.remove('hidden');
          badge.classList.add('flex');
        }
        if (uploadBtn) uploadBtn.classList.add('hidden');
        if (fnText) fnText.textContent = ExcelManager.fileName;
        if (rcText) rcText.textContent = `(${ExcelManager.rows.length})`;
      }

      // Restore column mappings
      MappingManager.mappings = session.mappings || {};

      // Restore Page and View
      const targetPage = session.page || 'editor';
      if (targetPage === 'preview' && ExcelManager.isLoaded() && TemplateManager.isLoaded()) {
        PreviewManager.setup(ExcelManager.rows);
        if (session.preview) {
          if (typeof session.preview.currentIndex === 'number') {
            PreviewManager.navigate(session.preview.currentIndex);
          }
          if (session.preview.viewMode) {
            PreviewManager.setViewMode(session.preview.viewMode);
          }
        }
        NavigationManager.replace('preview');
      } else if (targetPage === 'editor' && TemplateManager.isLoaded()) {
        NavigationManager.replace('editor');
      } else {
        NavigationManager.replace('upload');
      }

      // Initialize clean history baseline
      HistoryManager.clear();
      this.setIndicator('Saved');
      return true;
    } catch (err) {
      console.warn('Session restoration failed:', err);
      return false;
    } finally {
      this.isRestoring = false;
    }
  }
};

// ============================================================================
// 6. RESTART MANAGER (Clean Start-Over Workflow)
// ============================================================================
const RestartManager = {
  requestRestart() {
    ModalManager.open('modal-restart');
  },

  async confirmRestart() {
    ModalManager.close('modal-restart');

    // 1. Remove only Certify's keys from localStorage (never localStorage.clear())
    try {
      localStorage.removeItem(AppState.STORAGE_KEY);
    } catch (_) {}

    // 2. Clear IndexedDB template asset
    try {
      await StorageDB.clear();
    } catch (_) {}

    // 3. Reset all managers
    TemplateManager.reset();
    FieldManager.clear();
    ExcelManager.reset();
    MappingManager.mappings = {};
    HistoryManager.clear();
    PreviewManager.participants = [];
    PreviewManager.currentIndex = 0;
    PreviewManager.failedIndices = [];
    PreviewManager.cachedThumbnails = {};

    // 4. Reset DOM badges and inputs
    const excelBadge = document.getElementById('excel-loaded-badge');
    if (excelBadge) {
      excelBadge.classList.add('hidden');
      excelBadge.classList.remove('flex');
    }
    const btnUploadExcel = document.getElementById('btn-upload-excel');
    if (btnUploadExcel) btnUploadExcel.classList.remove('hidden');

    const templateInput = document.getElementById('template-file-input');
    if (templateInput) templateInput.value = '';

    const excelInput = document.getElementById('excel-file-input');
    if (excelInput) excelInput.value = '';

    const templateDimBadge = document.getElementById('template-dim-badge');
    if (templateDimBadge) templateDimBadge.textContent = '-- × -- px';

    // 5. Navigate to upload screen
    NavigationManager.replace('upload');
    SessionManager.setIndicator('Saved');
    App.showToast('Project reset successfully.');
  }
};

// ============================================================================
// 7. FONT MANAGER (27 Legal Google Fonts in 4 Categories)
// ============================================================================
const FontManager = {
  fonts: [
    // Sans Serif
    { name: 'Inter', category: 'Sans Serif', family: 'Inter' },
    { name: 'Poppins', category: 'Sans Serif', family: 'Poppins' },
    { name: 'Montserrat', category: 'Sans Serif', family: 'Montserrat' },
    { name: 'Roboto', category: 'Sans Serif', family: 'Roboto' },
    { name: 'Open Sans', category: 'Sans Serif', family: 'Open Sans' },
    { name: 'Lato', category: 'Sans Serif', family: 'Lato' },
    { name: 'Nunito', category: 'Sans Serif', family: 'Nunito' },
    { name: 'Raleway', category: 'Sans Serif', family: 'Raleway' },
    { name: 'Oswald', category: 'Sans Serif', family: 'Oswald' },
    { name: 'Ubuntu', category: 'Sans Serif', family: 'Ubuntu' },

    // Serif
    { name: 'Playfair Display', category: 'Serif', family: 'Playfair Display' },
    { name: 'Merriweather', category: 'Serif', family: 'Merriweather' },
    { name: 'Lora', category: 'Serif', family: 'Lora' },
    { name: 'Libre Baskerville', category: 'Serif', family: 'Libre Baskerville' },
    { name: 'Cormorant Garamond', category: 'Serif', family: 'Cormorant Garamond' },
    { name: 'EB Garamond', category: 'Serif', family: 'EB Garamond' },

    // Display
    { name: 'Bebas Neue', category: 'Display', family: 'Bebas Neue' },
    { name: 'Anton', category: 'Display', family: 'Anton' },
    { name: 'Abril Fatface', category: 'Display', family: 'Abril Fatface' },
    { name: 'Archivo Black', category: 'Display', family: 'Archivo Black' },
    { name: 'Barlow Condensed', category: 'Display', family: 'Barlow Condensed' },

    // Handwriting / Script
    { name: 'Pacifico', category: 'Handwriting', family: 'Pacifico' },
    { name: 'Caveat', category: 'Handwriting', family: 'Caveat' },
    { name: 'Dancing Script', category: 'Handwriting', family: 'Dancing Script' },
    { name: 'Great Vibes', category: 'Handwriting', family: 'Great Vibes' },
    { name: 'Sacramento', category: 'Handwriting', family: 'Sacramento' },
    { name: 'Satisfy', category: 'Handwriting', family: 'Satisfy' }
  ],

  init() {
    this.renderPickerList('');
    this.bindEvents();
  },

  bindEvents() {
    const searchInput = document.getElementById('font-search-input');
    searchInput.addEventListener('input', (e) => {
      this.renderPickerList(e.target.value.trim().toLowerCase());
    });

    const fontBtn = document.getElementById('tb-font-btn');
    const popover = document.getElementById('font-picker-popover');
    fontBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('hidden');
      if (!popover.classList.contains('hidden')) {
        searchInput.value = '';
        this.renderPickerList('');
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && !fontBtn.contains(e.target)) {
        popover.classList.add('hidden');
      }
    });
  },

  renderPickerList(query = '') {
    const listEl = document.getElementById('font-picker-list');
    listEl.innerHTML = '';

    const categories = ['Sans Serif', 'Serif', 'Display', 'Handwriting'];
    const activeField = FieldManager.getSelectedField();
    const currentFamily = activeField ? activeField.fontFamily : 'Poppins';

    categories.forEach(cat => {
      const filtered = this.fonts.filter(f => f.category === cat && (!query || f.name.toLowerCase().includes(query)));
      if (filtered.length === 0) return;

      const catHeader = document.createElement('div');
      catHeader.className = 'font-category-title';
      catHeader.textContent = cat;
      listEl.appendChild(catHeader);

      filtered.forEach(font => {
        const item = document.createElement('div');
        item.className = `font-picker-item ${font.family === currentFamily ? 'is-active' : ''}`;
        item.innerHTML = `
          <span style="font-family: '${font.family}', sans-serif; font-size: 13px;">${font.name}</span>
          ${font.family === currentFamily ? '<span class="text-xs">✓</span>' : ''}
        `;
        item.addEventListener('click', () => {
          this.selectFont(font.family);
          document.getElementById('font-picker-popover').classList.add('hidden');
        });
        listEl.appendChild(item);
      });
    });

    if (listEl.children.length === 0) {
      listEl.innerHTML = '<div class="p-3 text-center text-gray-400 text-xs">No fonts found</div>';
    }
  },

  selectFont(fontFamily) {
    const active = FieldManager.getSelectedField();
    if (!active || active.fontFamily === fontFamily) return;
    HistoryManager.recordAction(() => {
      active.fontFamily = fontFamily;
      document.getElementById('tb-current-font').textContent = fontFamily;
      document.getElementById('tb-current-font').style.fontFamily = `'${fontFamily}', sans-serif`;
      Editor.updateFieldElement(active);
      Editor.updateToolbarValues(active);
    });
  },

  async ensureFontLoaded(fontFamily, fontWeight = 'normal', fontStyle = 'normal') {
    try {
      if (document.fonts && document.fonts.load) {
        await document.fonts.load(`${fontStyle} ${fontWeight} 16px "${fontFamily}"`);
      }
    } catch {
      // Font load handled gracefully
    }
  }
};

// ============================================================================
// 8. TEMPLATE MANAGER
// ============================================================================
const TemplateManager = {
  image: null,
  src: null,
  fileName: '',
  naturalWidth: 0,
  naturalHeight: 0,
  aspectRatio: 1.414,

  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error("This file format isn't supported. Please upload a PNG, JPG, or JPEG image."));
      }

      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.loadFromSrc(e.target.result)
          .then(resolve)
          .catch(reject);
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  },

  loadFromSrc(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.image = img;
        this.src = src;
        this.naturalWidth = img.naturalWidth;
        this.naturalHeight = img.naturalHeight;
        this.aspectRatio = img.naturalWidth / img.naturalHeight;
        
        // Update Template dimension badge
        const badge = document.getElementById('template-dim-badge');
        if (badge) {
          badge.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
        }
        resolve(img);
      };
      img.onerror = () => reject(new Error('Failed to load template image.'));
      img.src = src;
    });
  },

  isLoaded() {
    return !!this.image && this.naturalWidth > 0;
  },

  reset() {
    this.image = null;
    this.src = null;
    this.fileName = '';
    this.naturalWidth = 0;
    this.naturalHeight = 0;
  }
};

// ============================================================================
// 9. FIELD MANAGER (Normalized Coordinates & Properties)
// ============================================================================
const FieldManager = {
  fields: [],
  selectedFieldId: null,
  counter: 1,

  fieldTemplates: {
    name: {
      type: 'name',
      label: 'Participant Name',
      placeholder: '{{NAME}}',
      width: 0.50,
      height: 0.08,
      fontSizePx: 38,
      fontWeight: 'bold',
      fontFamily: 'Poppins',
      align: 'center',
      autoFit: true
    },
    reg_no: {
      type: 'reg_no',
      label: 'Registration Number',
      placeholder: '{{REG_NO}}',
      width: 0.32,
      height: 0.05,
      fontSizePx: 22,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      align: 'center',
      autoFit: false
    },
    department: {
      type: 'department',
      label: 'Department',
      placeholder: '{{DEPARTMENT}}',
      width: 0.45,
      height: 0.06,
      fontSizePx: 22,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      align: 'center',
      autoFit: true
    },
    sno: {
      type: 'sno',
      label: 'S.No',
      placeholder: '{{S_NO}}',
      width: 0.15,
      height: 0.04,
      fontSizePx: 16,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      align: 'left',
      autoFit: false
    },
    event_name: {
      type: 'event_name',
      label: 'Event Name',
      placeholder: '{{EVENT_NAME}}',
      width: 0.55,
      height: 0.07,
      fontSizePx: 26,
      fontWeight: '600',
      fontFamily: 'Montserrat',
      align: 'center',
      autoFit: true
    },
    date: {
      type: 'date',
      label: 'Date',
      placeholder: '{{DATE}}',
      width: 0.25,
      height: 0.04,
      fontSizePx: 18,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      align: 'center',
      autoFit: false
    },
    custom: {
      type: 'custom',
      label: 'Custom Field',
      placeholder: '{{CUSTOM}}',
      width: 0.30,
      height: 0.05,
      fontSizePx: 20,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      align: 'center',
      autoFit: false
    }
  },

  addField(type) {
    let newField;
    HistoryManager.recordAction(() => {
      const template = this.fieldTemplates[type] || this.fieldTemplates.custom;
      const count = this.fields.length;
      let initialX = Math.max(0.1, 0.5 - template.width / 2);
      let initialY = Math.min(0.8, 0.35 + (count * 0.08));

      const id = `field_${this.counter++}`;
      newField = {
        id: id,
        type: type,
        label: type === 'custom' ? `Custom ${this.counter - 1}` : template.label,
        placeholder: template.placeholder,
        x: Number(initialX.toFixed(4)),
        y: Number(initialY.toFixed(4)),
        width: template.width,
        height: template.height,
        rotation: 0,
        fontSizePx: template.fontSizePx,
        fontWeight: template.fontWeight,
        fontStyle: 'normal',
        fontFamily: template.fontFamily,
        color: '#171717',
        align: template.align,
        letterSpacing: 0,
        lineHeight: 1.2,
        autoFit: template.autoFit
      };

      this.fields.push(newField);
      this.selectField(id);
      Editor.renderFieldElement(newField);
    });
    return newField;
  },

  getField(id) {
    return this.fields.find(f => f.id === id);
  },

  getSelectedField() {
    return this.getField(this.selectedFieldId);
  },

  selectField(id) {
    this.selectedFieldId = id;
    Editor.onFieldSelectionChanged();
  },

  deselectAll() {
    this.selectedFieldId = null;
    Editor.onFieldSelectionChanged();
  },

  deleteField(id) {
    const index = this.fields.findIndex(f => f.id === id);
    if (index !== -1) {
      HistoryManager.recordAction(() => {
        this.fields.splice(index, 1);
        if (this.selectedFieldId === id) {
          this.selectedFieldId = null;
        }
        Editor.removeFieldElement(id);
        Editor.onFieldSelectionChanged();
      });
    }
  },

  clear() {
    this.fields = [];
    this.selectedFieldId = null;
    Editor.clearAllFieldElements();
  }
};

// ============================================================================
// 10. EDITOR (Interactive Drag, Resize, Rotate & Floating Toolbar)
// ============================================================================
const Editor = {
  stage: null,
  viewport: null,
  overlay: null,
  toolbar: null,
  templateImg: null,
  
  // Interaction state
  dragAction: null, // 'move' | 'resize' | 'rotate'
  activeHandle: null,
  dragStartMouseX: 0,
  dragStartMouseY: 0,
  dragStartFieldX: 0,
  dragStartFieldY: 0,
  dragStartFieldW: 0,
  dragStartFieldH: 0,
  dragStartRotation: 0,

  init() {
    this.stage = document.getElementById('certificate-stage');
    this.viewport = document.getElementById('editor-viewport');
    this.overlay = document.getElementById('fields-overlay');
    this.toolbar = document.getElementById('floating-toolbar');
    this.templateImg = document.getElementById('template-image');

    this.bindViewportEvents();
    this.bindToolbarEvents();
    this.bindKeyboardShortcuts();
    window.addEventListener('resize', () => this.resizeStage());
  },

  setupTemplate(image) {
    this.templateImg.src = image.src;
    this.resizeStage();
  },

  resizeStage() {
    if (!TemplateManager.isLoaded()) return;

    const vpWidth = this.viewport.clientWidth - 80;
    const vpHeight = this.viewport.clientHeight - 80;
    const imgAspect = TemplateManager.aspectRatio;

    let targetWidth, targetHeight;
    if (vpWidth / vpHeight > imgAspect) {
      targetHeight = Math.min(vpHeight, TemplateManager.naturalHeight);
      targetWidth = targetHeight * imgAspect;
    } else {
      targetWidth = Math.min(vpWidth, TemplateManager.naturalWidth);
      targetHeight = targetWidth / imgAspect;
    }

    targetWidth = Math.round(targetWidth);
    targetHeight = Math.round(targetHeight);

    this.stage.style.width = `${targetWidth}px`;
    this.stage.style.height = `${targetHeight}px`;

    FieldManager.fields.forEach(f => this.updateFieldElement(f));
    this.positionToolbar();
  },

  renderFieldElement(field) {
    let el = document.getElementById(field.id);
    if (!el) {
      el = document.createElement('div');
      el.id = field.id;
      el.className = 'cert-field';
      
      const content = document.createElement('div');
      content.className = 'cert-field-content';
      el.appendChild(content);

      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      handles.forEach(h => {
        const handle = document.createElement('div');
        handle.className = `resize-handle handle-${h}`;
        handle.dataset.handle = h;
        el.appendChild(handle);
      });

      const rotLine = document.createElement('div');
      rotLine.className = 'rotate-line';
      el.appendChild(rotLine);

      const rotHandle = document.createElement('div');
      rotHandle.className = 'rotate-handle';
      rotHandle.dataset.handle = 'rotate';
      el.appendChild(rotHandle);

      this.overlay.appendChild(el);
      this.bindFieldMouseEvents(el, field);
    }

    this.updateFieldElement(field);
  },

  updateFieldElement(field) {
    const el = document.getElementById(field.id);
    if (!el) return;

    const stageW = this.stage.clientWidth;
    const stageH = this.stage.clientHeight;
    const scale = stageH / (TemplateManager.naturalHeight || 1000);

    el.style.left = `${field.x * 100}%`;
    el.style.top = `${field.y * 100}%`;
    el.style.width = `${field.width * 100}%`;
    el.style.height = `${field.height * 100}%`;
    el.style.transform = `rotate(${field.rotation || 0}deg)`;

    const content = el.querySelector('.cert-field-content');
    content.textContent = field.placeholder;
    content.style.fontFamily = `'${field.fontFamily}', sans-serif`;
    content.style.fontWeight = field.fontWeight;
    content.style.fontStyle = field.fontStyle || 'normal';
    content.style.color = field.color;
    content.style.textAlign = field.align;
    content.style.letterSpacing = `${(field.letterSpacing || 0) * scale}px`;

    let currentFontSize = Math.max(10, Math.round(field.fontSizePx * scale));

    if (field.autoFit) {
      const boxWidth = field.width * stageW;
      const textLength = field.placeholder.length || 8;
      const approxCharWidth = currentFontSize * 0.58;
      if (textLength * approxCharWidth > boxWidth - 10) {
        const fitScale = (boxWidth - 10) / (textLength * approxCharWidth);
        currentFontSize = Math.max(10, Math.floor(currentFontSize * fitScale));
      }
    }

    content.style.fontSize = `${currentFontSize}px`;

    if (field.id === FieldManager.selectedFieldId) {
      el.classList.add('is-selected');
    } else {
      el.classList.remove('is-selected');
    }
  },

  removeFieldElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  clearAllFieldElements() {
    this.overlay.innerHTML = '';
    this.toolbar.classList.add('hidden');
  },

  bindFieldMouseEvents(el, field) {
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      FieldManager.selectField(field.id);

      // Save pre-drag snapshot for smart grouped undo
      HistoryManager.dragStartSnapshot = HistoryManager.captureState();

      const targetHandle = e.target.dataset.handle;
      if (targetHandle === 'rotate') {
        this.dragAction = 'rotate';
        this.dragStartRotation = field.rotation || 0;
        this.dragStartMouseX = e.clientX;
        this.dragStartMouseY = e.clientY;
      } else if (targetHandle) {
        this.dragAction = 'resize';
        this.activeHandle = targetHandle;
        this.dragStartMouseX = e.clientX;
        this.dragStartMouseY = e.clientY;
        this.dragStartFieldX = field.x;
        this.dragStartFieldY = field.y;
        this.dragStartFieldW = field.width;
        this.dragStartFieldH = field.height;
      } else {
        this.dragAction = 'move';
        this.dragStartMouseX = e.clientX;
        this.dragStartMouseY = e.clientY;
        this.dragStartFieldX = field.x;
        this.dragStartFieldY = field.y;
        el.classList.add('is-dragging');
      }

      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.dragAction) return;

      const stageW = this.stage.clientWidth;
      const stageH = this.stage.clientHeight;
      if (stageW === 0 || stageH === 0) return;

      const deltaX = (e.clientX - this.dragStartMouseX) / stageW;
      const deltaY = (e.clientY - this.dragStartMouseY) / stageH;

      if (this.dragAction === 'move') {
        let newX = this.dragStartFieldX + deltaX;
        let newY = this.dragStartFieldY + deltaY;

        newX = Math.max(0, Math.min(1 - field.width, newX));
        newY = Math.max(0, Math.min(1 - field.height, newY));

        field.x = Number(newX.toFixed(4));
        field.y = Number(newY.toFixed(4));
        this.updateFieldElement(field);
        this.positionToolbar();
      } else if (this.dragAction === 'resize') {
        let newX = this.dragStartFieldX;
        let newY = this.dragStartFieldY;
        let newW = this.dragStartFieldW;
        let newH = this.dragStartFieldH;

        const minW = 0.05;
        const minH = 0.03;

        if (this.activeHandle.includes('e')) {
          newW = Math.max(minW, Math.min(1 - newX, this.dragStartFieldW + deltaX));
        }
        if (this.activeHandle.includes('s')) {
          newH = Math.max(minH, Math.min(1 - newY, this.dragStartFieldH + deltaY));
        }
        if (this.activeHandle.includes('w')) {
          const maxLeftShift = this.dragStartFieldW - minW;
          const shift = Math.max(-this.dragStartFieldX, Math.min(maxLeftShift, deltaX));
          newX = this.dragStartFieldX + shift;
          newW = this.dragStartFieldW - shift;
        }
        if (this.activeHandle.includes('n')) {
          const maxTopShift = this.dragStartFieldH - minH;
          const shift = Math.max(-this.dragStartFieldY, Math.min(maxTopShift, deltaY));
          newY = this.dragStartFieldY + shift;
          newH = this.dragStartFieldH - shift;
        }

        field.x = Number(newX.toFixed(4));
        field.y = Number(newY.toFixed(4));
        field.width = Number(newW.toFixed(4));
        field.height = Number(newH.toFixed(4));

        this.updateFieldElement(field);
        this.positionToolbar();
      } else if (this.dragAction === 'rotate') {
        const boxRect = el.getBoundingClientRect();
        const centerX = boxRect.left + boxRect.width / 2;
        const centerY = boxRect.top + boxRect.height / 2;
        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let deg = Math.round((angleRad * (180 / Math.PI)) + 90);
        if (deg > 180) deg -= 360;
        if (deg < -180) deg += 360;

        if (Math.abs(deg) <= 4) deg = 0;

        field.rotation = deg;
        this.updateFieldElement(field);
        this.updateToolbarValues(field);
      }
    });

    const commitDrag = (e) => {
      if (this.dragAction && HistoryManager.dragStartSnapshot) {
        const currentState = HistoryManager.captureState();
        // Check if values actually changed to prevent empty undo states
        const hasChanged = JSON.stringify(HistoryManager.dragStartSnapshot.fields) !== JSON.stringify(currentState.fields);
        if (hasChanged) {
          HistoryManager.undoStack.push(HistoryManager.dragStartSnapshot);
          if (HistoryManager.undoStack.length > HistoryManager.maxStates) {
            HistoryManager.undoStack.shift();
          }
          HistoryManager.redoStack = [];
          HistoryManager.updateUI();
          SessionManager.scheduleSave();
        }
      }
      this.dragAction = null;
      this.activeHandle = null;
      HistoryManager.dragStartSnapshot = null;
      el.classList.remove('is-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    el.addEventListener('pointerup', commitDrag);
    el.addEventListener('pointercancel', commitDrag);
  },

  bindViewportEvents() {
    this.viewport.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.cert-field') && !e.target.closest('#floating-toolbar') && !e.target.closest('#font-picker-popover')) {
        FieldManager.deselectAll();
      }
    });
  },

  onFieldSelectionChanged() {
    FieldManager.fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) {
        if (f.id === FieldManager.selectedFieldId) {
          el.classList.add('is-selected');
        } else {
          el.classList.remove('is-selected');
        }
      }
    });

    const active = FieldManager.getSelectedField();
    if (active) {
      this.toolbar.classList.remove('hidden');
      this.updateToolbarValues(active);
      this.positionToolbar();
    } else {
      this.toolbar.classList.add('hidden');
      document.getElementById('font-picker-popover').classList.add('hidden');
    }
  },

  positionToolbar() {
    const active = FieldManager.getSelectedField();
    if (!active) {
      this.toolbar.classList.add('hidden');
      return;
    }

    const fieldEl = document.getElementById(active.id);
    if (!fieldEl) return;

    const stageRect = this.stage.getBoundingClientRect();
    const fieldRect = fieldEl.getBoundingClientRect();

    const toolbarWidth = this.toolbar.offsetWidth || 340;
    const toolbarHeight = this.toolbar.offsetHeight || 38;

    let left = (fieldRect.left - stageRect.left) + (fieldRect.width / 2) - (toolbarWidth / 2);
    let top = (fieldRect.top - stageRect.top) - toolbarHeight - 12;

    if (top < 10) {
      top = (fieldRect.bottom - stageRect.top) + 12;
    }
    if (left < 10) left = 10;
    if (left + toolbarWidth > stageRect.width - 10) {
      left = stageRect.width - toolbarWidth - 10;
    }

    this.toolbar.style.left = `${Math.round(left)}px`;
    this.toolbar.style.top = `${Math.round(top)}px`;
  },

  updateToolbarValues(field) {
    document.getElementById('tb-current-font').textContent = field.fontFamily;
    document.getElementById('tb-current-font').style.fontFamily = `'${field.fontFamily}', sans-serif`;
    document.getElementById('tb-font-size').value = field.fontSizePx;
    
    const isBold = field.fontWeight === 'bold' || parseInt(field.fontWeight) >= 600;
    const boldBtn = document.getElementById('tb-bold-btn');
    boldBtn.className = `px-2 py-1 font-bold transition-colors ${isBold ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`;

    const isItalic = field.fontStyle === 'italic';
    const italicBtn = document.getElementById('tb-italic-btn');
    italicBtn.className = `px-2 py-1 italic font-serif border-l border-gray-200 transition-colors ${isItalic ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`;

    document.getElementById('tb-color-picker').value = field.color;

    const autofitBtn = document.getElementById('tb-autofit-btn');
    if (field.autoFit) {
      autofitBtn.className = 'flex items-center space-x-1 px-2 py-1 rounded border border-indigo-300 bg-indigo-50 text-[11px] font-medium text-indigo-700';
    } else {
      autofitBtn.className = 'flex items-center space-x-1 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-[11px] text-gray-500';
    }

    document.getElementById('tb-rotation-input').value = field.rotation || 0;
    document.getElementById('tb-spacing-input').value = field.letterSpacing || 0;
  },

  bindToolbarEvents() {
    // Font Size Steppers & Input
    const sizeInput = document.getElementById('tb-font-size');
    const updateSize = (newSize) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      const parsed = Math.max(8, Math.min(200, parseInt(newSize) || 32));
      if (active.fontSizePx === parsed) return;
      HistoryManager.recordAction(() => {
        active.fontSizePx = parsed;
        sizeInput.value = parsed;
        this.updateFieldElement(active);
      });
    };

    document.getElementById('tb-size-dec').addEventListener('click', () => {
      updateSize((parseInt(sizeInput.value) || 32) - 2);
    });
    document.getElementById('tb-size-inc').addEventListener('click', () => {
      updateSize((parseInt(sizeInput.value) || 32) + 2);
    });
    sizeInput.addEventListener('change', () => {
      updateSize(sizeInput.value);
    });

    // Bold Toggle
    document.getElementById('tb-bold-btn').addEventListener('click', () => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      HistoryManager.recordAction(() => {
        const isBold = active.fontWeight === 'bold' || parseInt(active.fontWeight) >= 600;
        active.fontWeight = isBold ? 'normal' : 'bold';
        this.updateFieldElement(active);
        this.updateToolbarValues(active);
      });
    });

    // Italic Toggle
    document.getElementById('tb-italic-btn').addEventListener('click', () => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      HistoryManager.recordAction(() => {
        active.fontStyle = active.fontStyle === 'italic' ? 'normal' : 'italic';
        this.updateFieldElement(active);
        this.updateToolbarValues(active);
      });
    });

    // Alignment Toggles
    const setAlign = (align) => {
      const active = FieldManager.getSelectedField();
      if (!active || active.align === align) return;
      HistoryManager.recordAction(() => {
        active.align = align;
        this.updateFieldElement(active);
      });
    };
    document.getElementById('tb-align-left').addEventListener('click', () => setAlign('left'));
    document.getElementById('tb-align-center').addEventListener('click', () => setAlign('center'));
    document.getElementById('tb-align-right').addEventListener('click', () => setAlign('right'));

    // Text Color Picker
    let colorBeforeInput = null;
    const colorPicker = document.getElementById('tb-color-picker');
    colorPicker.addEventListener('focus', () => {
      const active = FieldManager.getSelectedField();
      if (active) colorBeforeInput = active.color;
    });
    colorPicker.addEventListener('input', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      if (!colorBeforeInput) colorBeforeInput = active.color;
      active.color = e.target.value;
      this.updateFieldElement(active);
    });
    colorPicker.addEventListener('change', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      const oldColor = colorBeforeInput || active.color;
      const newColor = e.target.value;
      colorBeforeInput = null;
      if (oldColor !== newColor) {
        active.color = oldColor;
        HistoryManager.recordAction(() => {
          active.color = newColor;
          this.updateFieldElement(active);
        });
      }
    });

    // AutoFit Toggle
    document.getElementById('tb-autofit-btn').addEventListener('click', () => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      HistoryManager.recordAction(() => {
        active.autoFit = !active.autoFit;
        this.updateFieldElement(active);
        this.updateToolbarValues(active);
      });
      App.showToast(`Auto Fit: ${active.autoFit ? 'Enabled' : 'Disabled'}`);
    });

    // Rotation Input
    const rotInput = document.getElementById('tb-rotation-input');
    rotInput.addEventListener('change', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      let val = parseInt(e.target.value) || 0;
      val = Math.max(-180, Math.min(180, val));
      if (active.rotation === val) return;
      HistoryManager.recordAction(() => {
        active.rotation = val;
        rotInput.value = val;
        this.updateFieldElement(active);
      });
    });

    // Letter Spacing Input
    const spacingInput = document.getElementById('tb-spacing-input');
    spacingInput.addEventListener('change', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      let val = parseFloat(e.target.value) || 0;
      if (active.letterSpacing === val) return;
      HistoryManager.recordAction(() => {
        active.letterSpacing = val;
        this.updateFieldElement(active);
      });
    });

    // Delete Field Button
    document.getElementById('tb-delete-btn').addEventListener('click', () => {
      if (FieldManager.selectedFieldId) {
        FieldManager.deleteField(FieldManager.selectedFieldId);
      }
    });
  },

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;

      // Ignore when typing inside input elements
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        FieldManager.deleteField(active.id);
      } else if (e.key === 'Escape') {
        FieldManager.deselectAll();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        HistoryManager.recordAction(() => {
          const step = e.shiftKey ? 0.01 : 0.002;
          if (e.key === 'ArrowUp') active.y = Math.max(0, Number((active.y - step).toFixed(4)));
          if (e.key === 'ArrowDown') active.y = Math.min(1 - active.height, Number((active.y + step).toFixed(4)));
          if (e.key === 'ArrowLeft') active.x = Math.max(0, Number((active.x - step).toFixed(4)));
          if (e.key === 'ArrowRight') active.x = Math.min(1 - active.width, Number((active.x + step).toFixed(4)));

          this.updateFieldElement(active);
          this.positionToolbar();
        });
      }
    });
  }
};

// ============================================================================
// 11. EXCEL MANAGER (SheetJS Parsing)
// ============================================================================
const ExcelManager = {
  fileName: '',
  headers: [],
  rows: [],

  parseFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Please upload an Excel or CSV file.'));
      
      const fileName = file.name;
      const ext = fileName.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        return reject(new Error("This file format isn't supported. Please upload .xlsx, .xls, or .csv"));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return reject(new Error('The spreadsheet is empty.'));
          }

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });

          if (jsonRows.length === 0) {
            return reject(new Error('No participant data found in the first sheet.'));
          }

          const headerSet = new Set();
          jsonRows.forEach(row => {
            Object.keys(row).forEach(key => headerSet.add(key.trim()));
          });
          const headers = Array.from(headerSet);

          this.fileName = fileName;
          this.headers = headers;
          this.rows = jsonRows;

          SessionManager.scheduleSave();

          resolve({
            fileName: fileName,
            headers: headers,
            rowCount: jsonRows.length
          });
        } catch (err) {
          reject(new Error('Failed to parse spreadsheet: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Could not read the uploaded file.'));
      reader.readAsArrayBuffer(file);
    });
  },

  isLoaded() {
    return this.rows.length > 0;
  },

  reset() {
    this.fileName = '';
    this.headers = [];
    this.rows = [];
  }
};

// ============================================================================
// 12. MAPPING MANAGER (Column Matching & Confirmation Modal)
// ============================================================================
const MappingManager = {
  mappings: {}, // field.id -> excelHeader

  aliases: {
    name: [
      'name', 'student name', 'participant name', 'candidate name', 'full name', 
      'student_name', 'participant_name', 'fullname', 'attendee name', 'name of participant'
    ],
    reg_no: [
      'reg no', 'reg_no', 'regno', 'register number', 'registration number', 
      'registration no', 'roll no', 'roll_no', 'rollno', 'roll number', 'id', 'student id', 'reg'
    ],
    department: [
      'department', 'dept', 'branch', 'stream', 'course', 'discipline', 'major', 'dept.'
    ],
    sno: [
      's.no', 'sno', 's_no', 'sl no', 'sl_no', 'serial number', 'serial no', 'serial_no', '#', 's no'
    ],
    event_name: [
      'event', 'event name', 'event_name', 'activity', 'competition', 'workshop', 'program', 'programme'
    ],
    date: [
      'date', 'event date', 'event_date', 'issue date', 'date of event', 'dated'
    ]
  },

  autoMapFields(fields, headers) {
    const newMappings = {};
    let allConfident = true;

    fields.forEach(field => {
      let matchedHeader = null;
      const expectedAliases = this.aliases[field.type] || [];

      // 1. Exact match with field label or placeholder
      const cleanFieldLabel = field.label.toLowerCase().trim();
      const exactMatch = headers.find(h => h.toLowerCase().trim() === cleanFieldLabel);
      if (exactMatch) {
        matchedHeader = exactMatch;
      }

      // 2. Alias match
      if (!matchedHeader) {
        for (const alias of expectedAliases) {
          const found = headers.find(h => {
            const hClean = h.toLowerCase().trim();
            return hClean === alias || hClean.replace(/[_\s\.]/g, '') === alias.replace(/[_\s\.]/g, '');
          });
          if (found) {
            matchedHeader = found;
            break;
          }
        }
      }

      // 3. Fallback partial substring match
      if (!matchedHeader) {
        matchedHeader = headers.find(h => h.toLowerCase().includes(field.type.replace('_', ' ')));
      }

      if (matchedHeader) {
        newMappings[field.id] = matchedHeader;
      } else {
        allConfident = false;
      }
    });

    this.mappings = newMappings;
    SessionManager.scheduleSave();
    return allConfident;
  },

  showMappingModal(fields, headers, onConfirm) {
    const listEl = document.getElementById('mapping-list');
    listEl.innerHTML = '';

    fields.forEach(field => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between py-2.5 border-b border-[#E5E5E5] last:border-b-0 text-xs';

      const left = document.createElement('div');
      left.className = 'flex flex-col';
      left.innerHTML = `
        <span class="font-medium text-[#171717]">${field.label}</span>
        <span class="text-[11px] text-[#6B6B6B]">${field.placeholder}</span>
      `;

      const right = document.createElement('div');
      const select = document.createElement('select');
      select.className = 'px-2.5 py-1 text-xs border border-[#E5E5E5] rounded-[4px] focus:outline-none focus:border-[#4F46E5] bg-white text-[#171717]';
      select.dataset.fieldId = field.id;

      select.innerHTML = '<option value="">-- None / Skip --</option>';
      headers.forEach(h => {
        const selected = this.mappings[field.id] === h ? 'selected' : '';
        select.innerHTML += `<option value="${h}" ${selected}>${h}</option>`;
      });

      right.appendChild(select);
      row.appendChild(left);
      row.appendChild(right);
      listEl.appendChild(row);
    });

    ModalManager.open('modal-mapping');

    const confirmBtn = document.getElementById('btn-confirm-mapping');
    const handleConfirm = () => {
      const selects = listEl.querySelectorAll('select');
      selects.forEach(sel => {
        const fId = sel.dataset.fieldId;
        const val = sel.value;
        if (val) {
          this.mappings[fId] = val;
        } else {
          delete this.mappings[fId];
        }
      });
      ModalManager.close('modal-mapping');
      confirmBtn.removeEventListener('click', handleConfirm);
      SessionManager.scheduleSave();
      if (onConfirm) onConfirm();
    };

    confirmBtn.addEventListener('click', handleConfirm);
  }
};

// ============================================================================
// 13. CERTIFICATE RENDERER (Unified Pixel-Perfect HTML5 Canvas Engine)
// ============================================================================
const CertificateRenderer = {
  async renderCertificate(canvas, templateImg, fields, participantRow, options = {}) {
    const ctx = canvas.getContext('2d');
    const width = options.width || templateImg.naturalWidth;
    const height = options.height || templateImg.naturalHeight;

    canvas.width = width;
    canvas.height = height;

    // 1. Draw template image background
    ctx.drawImage(templateImg, 0, 0, width, height);

    // Scaling ratio relative to natural height (default base 1000)
    const scale = height / (TemplateManager.naturalHeight || 1000);

    // 2. Render each field
    for (const field of fields) {
      let text = '';
      if (participantRow) {
        const mappedCol = MappingManager.mappings[field.id];
        if (mappedCol && participantRow[mappedCol] !== undefined) {
          text = String(participantRow[mappedCol]);
        } else if (participantRow[field.label] !== undefined) {
          text = String(participantRow[field.label]);
        } else {
          text = '';
        }
      } else {
        text = field.placeholder;
      }

      if (!text) continue;

      await FontManager.ensureFontLoaded(field.fontFamily, field.fontWeight, field.fontStyle);

      const boxX = field.x * width;
      const boxY = field.y * height;
      const boxW = field.width * width;
      const boxH = field.height * height;

      let fontSize = field.fontSizePx * scale;
      const padding = 6 * scale;
      const maxTextWidth = boxW - (padding * 2);

      ctx.save();
      ctx.font = `${field.fontStyle || 'normal'} ${field.fontWeight || 'normal'} ${fontSize}px "${field.fontFamily}", sans-serif`;

      if (field.letterSpacing && 'letterSpacing' in ctx) {
        ctx.letterSpacing = `${(field.letterSpacing || 0) * scale}px`;
      }

      if (field.autoFit && maxTextWidth > 10) {
        let measuredWidth = ctx.measureText(text).width;
        if (measuredWidth > maxTextWidth) {
          const fitFactor = maxTextWidth / measuredWidth;
          fontSize = Math.max(10 * scale, Math.floor(fontSize * fitFactor));
          ctx.font = `${field.fontStyle || 'normal'} ${field.fontWeight || 'normal'} ${fontSize}px "${field.fontFamily}", sans-serif`;
        }

        if (fontSize > boxH * 0.95) {
          fontSize = Math.max(10 * scale, Math.floor(boxH * 0.95));
          ctx.font = `${field.fontStyle || 'normal'} ${field.fontWeight || 'normal'} ${fontSize}px "${field.fontFamily}", sans-serif`;
        }
      }

      ctx.fillStyle = field.color || '#171717';
      ctx.textBaseline = 'middle';

      let textX;
      if (field.align === 'left') {
        textX = boxX + padding;
        ctx.textAlign = 'left';
      } else if (field.align === 'right') {
        textX = boxX + boxW - padding;
        ctx.textAlign = 'right';
      } else {
        textX = boxX + (boxW / 2);
        ctx.textAlign = 'center';
      }

      const textY = boxY + (boxH / 2);

      if (field.rotation && field.rotation !== 0) {
        const centerX = boxX + boxW / 2;
        const centerY = boxY + boxH / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((field.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      ctx.fillText(text, textX, textY);
      ctx.restore();
    }

    return canvas;
  }
};

// ============================================================================
// 14. PREVIEW MANAGER (Single Preview, Grid View & Pagination)
// ============================================================================
const PreviewManager = {
  participants: [],
  currentIndex: 0,
  viewMode: 'single', // 'single' | 'grid'
  failedIndices: [],
  cachedThumbnails: {},

  init() {
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('btn-prev-cert').addEventListener('click', () => {
      this.navigate(this.currentIndex - 1);
    });
    document.getElementById('btn-next-cert').addEventListener('click', () => {
      this.navigate(this.currentIndex + 1);
    });

    const jumpInput = document.getElementById('preview-jump-input');
    jumpInput.addEventListener('change', (e) => {
      const target = parseInt(e.target.value) - 1;
      this.navigate(target);
    });

    // View switcher (Single vs Grid)
    document.getElementById('btn-view-single').addEventListener('click', () => {
      this.setViewMode('single');
    });
    document.getElementById('btn-view-grid').addEventListener('click', () => {
      this.setViewMode('grid');
    });

    // Back to editor
    document.getElementById('btn-preview-back-editor').addEventListener('click', () => {
      NavigationManager.goTo('editor');
    });

    // Primary Export button
    document.getElementById('btn-preview-export').addEventListener('click', () => {
      ModalManager.openExportModal(this.participants.length);
    });

    // Arrow keys for preview navigation
    window.addEventListener('keydown', (e) => {
      if (NavigationManager.currentPage !== 'preview') return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') this.navigate(this.currentIndex - 1);
      if (e.key === 'ArrowRight') this.navigate(this.currentIndex + 1);
    });
  },

  setup(participants) {
    this.participants = participants;
    this.failedIndices = [];
    this.cachedThumbnails = {};

    participants.forEach((p, idx) => {
      let isRowFailed = false;
      FieldManager.fields.forEach(f => {
        const col = MappingManager.mappings[f.id];
        if (col && (p[col] === undefined || String(p[col]).trim() === '')) {
          isRowFailed = true;
        }
      });
      if (isRowFailed) {
        this.failedIndices.push(idx);
      }
    });

    const countTitle = document.getElementById('preview-count-title');
    if (countTitle) {
      countTitle.textContent = `${participants.length} Certificates`;
    }

    const failBadge = document.getElementById('preview-fail-badge');
    if (failBadge) {
      if (this.failedIndices.length > 0) {
        failBadge.classList.remove('hidden');
        failBadge.textContent = `${participants.length - this.failedIndices.length} generated, ${this.failedIndices.length} with empty fields`;
      } else {
        failBadge.classList.add('hidden');
      }
    }

    const jumpInput = document.getElementById('preview-jump-input');
    if (jumpInput) {
      jumpInput.max = participants.length;
      jumpInput.value = this.currentIndex + 1;
    }

    this.setViewMode(this.viewMode || 'single');
    this.renderCurrentSingle();
    SessionManager.scheduleSave();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    const btnSingle = document.getElementById('btn-view-single');
    const btnGrid = document.getElementById('btn-view-grid');
    const containerSingle = document.getElementById('preview-single-container');
    const containerGrid = document.getElementById('preview-grid-container');

    if (mode === 'single') {
      btnSingle.className = 'px-3 py-1 text-xs font-medium rounded-[4px] text-[#171717] bg-white border border-[#E5E5E5]';
      btnGrid.className = 'px-3 py-1 text-xs font-medium rounded-[4px] text-[#6B6B6B] hover:text-[#171717] border border-transparent';
      containerSingle.classList.remove('hidden');
      containerGrid.classList.add('hidden');
      this.renderCurrentSingle();
    } else {
      btnGrid.className = 'px-3 py-1 text-xs font-medium rounded-[4px] text-[#171717] bg-white border border-[#E5E5E5]';
      btnSingle.className = 'px-3 py-1 text-xs font-medium rounded-[4px] text-[#6B6B6B] hover:text-[#171717] border border-transparent';
      containerSingle.classList.add('hidden');
      containerGrid.classList.remove('hidden');
      this.renderGridView();
    }
    SessionManager.scheduleSave();
  },

  navigate(newIndex) {
    if (newIndex < 0 || newIndex >= this.participants.length) return;
    this.currentIndex = newIndex;
    this.renderCurrentSingle();
    SessionManager.scheduleSave();
  },

  async renderCurrentSingle() {
    if (this.participants.length === 0 || !TemplateManager.isLoaded()) return;

    const row = this.participants[this.currentIndex];
    const canvas = document.getElementById('single-preview-canvas');

    const width = Math.min(1600, TemplateManager.naturalWidth);
    const height = Math.round(width / TemplateManager.aspectRatio);

    await CertificateRenderer.renderCertificate(
      canvas, 
      TemplateManager.image, 
      FieldManager.fields, 
      row, 
      { width, height }
    );

    // Update bottom nav controls
    document.getElementById('preview-index-text').textContent = `${this.currentIndex + 1} / ${this.participants.length}`;
    document.getElementById('preview-jump-input').value = this.currentIndex + 1;
    document.getElementById('btn-prev-cert').disabled = this.currentIndex === 0;
    document.getElementById('btn-next-cert').disabled = this.currentIndex === this.participants.length - 1;

    // Participant summary tag
    const nameField = FieldManager.fields.find(f => f.type === 'name');
    let participantName = 'Participant';
    if (nameField && MappingManager.mappings[nameField.id]) {
      participantName = row[MappingManager.mappings[nameField.id]] || 'Participant';
    }
    document.getElementById('preview-participant-tag').textContent = participantName;
  },

  async renderGridView() {
    const gridEl = document.getElementById('preview-grid-items');
    gridEl.innerHTML = '';

    const thumbWidth = 260;
    const thumbHeight = Math.round(thumbWidth / TemplateManager.aspectRatio);

    for (let i = 0; i < this.participants.length; i++) {
      const row = this.participants[i];
      const card = document.createElement('div');
      card.className = 'cert-thumb-card bg-white border border-[#E5E5E5] rounded-[6px] p-2 cursor-pointer hover:border-[#D4D4D4] flex flex-col items-center';
      
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'w-full object-contain rounded-[4px] border border-[#E5E5E5] bg-white';
      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;
      card.appendChild(thumbCanvas);

      const nameField = FieldManager.fields.find(f => f.type === 'name');
      let pName = 'Participant';
      if (nameField && MappingManager.mappings[nameField.id]) {
        pName = row[MappingManager.mappings[nameField.id]] || 'Participant';
      }

      const meta = document.createElement('div');
      meta.className = 'w-full mt-2 flex items-center justify-between text-[11px] text-[#6B6B6B]';
      meta.innerHTML = `
        <span class="font-mono text-[#A3A3A3]">#${String(i + 1).padStart(3, '0')}</span>
        <span class="font-medium text-[#171717] truncate max-w-[150px]">${pName}</span>
      `;
      card.appendChild(meta);

      card.addEventListener('click', () => {
        this.currentIndex = i;
        this.setViewMode('single');
      });

      gridEl.appendChild(card);

      CertificateRenderer.renderCertificate(
        thumbCanvas,
        TemplateManager.image,
        FieldManager.fields,
        row,
        { width: thumbWidth, height: thumbHeight }
      );

      if (i % 12 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }
};

// ============================================================================
// 15. PDF EXPORTER (jsPDF High-Resolution Generation)
// ============================================================================
const PDFExporter = {
  sanitizeFilename(name) {
    if (!name) return 'Participant';
    return name
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
  },

  getParticipantName(row) {
    const nameField = FieldManager.fields.find(f => f.type === 'name');
    if (nameField && MappingManager.mappings[nameField.id]) {
      return row[MappingManager.mappings[nameField.id]] || 'Participant';
    }
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes('name')) return String(row[key]);
    }
    return 'Participant';
  },

  async generateSinglePDF(row, index, templateWidth, templateHeight) {
    const { jsPDF } = window.jspdf;
    const orientation = templateWidth >= templateHeight ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [templateWidth, templateHeight],
      hotfixes: ['px_scaling']
    });

    const canvas = document.createElement('canvas');
    await CertificateRenderer.renderCertificate(
      canvas,
      TemplateManager.image,
      FieldManager.fields,
      row,
      { width: templateWidth, height: templateHeight }
    );

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, templateWidth, templateHeight);

    const participantName = this.getParticipantName(row);
    const filename = `Certificate_${String(index + 1).padStart(3, '0')}_${this.sanitizeFilename(participantName)}.pdf`;

    const blob = pdf.output('blob');
    return { filename, blob };
  },

  async exportCombinedPDF(participants, onProgress) {
    const { jsPDF } = window.jspdf;
    const width = TemplateManager.naturalWidth;
    const height = TemplateManager.naturalHeight;
    const orientation = width >= height ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [width, height],
      hotfixes: ['px_scaling']
    });

    const canvas = document.createElement('canvas');

    for (let i = 0; i < participants.length; i++) {
      if (i > 0) {
        pdf.addPage([width, height], orientation);
      }

      const row = participants[i];
      const pName = this.getParticipantName(row);
      if (onProgress) onProgress(i + 1, participants.length, pName);

      await CertificateRenderer.renderCertificate(
        canvas,
        TemplateManager.image,
        FieldManager.fields,
        row,
        { width, height }
      );

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, width, height);

      await new Promise(r => setTimeout(r, 0));
    }

    pdf.save('All_Certificates.pdf');
  }
};

// ============================================================================
// 16. ZIP EXPORTER (JSZip Bulk Packaging)
// ============================================================================
const ZipExporter = {
  async exportZip(participants, onProgress) {
    const zip = new JSZip();
    const folder = zip.folder('Certificates');
    const total = participants.length;

    const width = TemplateManager.naturalWidth;
    const height = TemplateManager.naturalHeight;

    for (let i = 0; i < total; i++) {
      const row = participants[i];
      const pName = PDFExporter.getParticipantName(row);

      if (onProgress) {
        onProgress(i + 1, total, `Generating ${pName}...`);
      }

      const { filename, blob } = await PDFExporter.generateSinglePDF(row, i, width, height);
      folder.file(filename, blob);

      await new Promise(r => setTimeout(r, 0));
    }

    if (onProgress) {
      onProgress(total, total, 'Compiling ZIP archive...');
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      if (onProgress && metadata.percent) {
        onProgress(total, total, `Packaging ZIP (${Math.round(metadata.percent)}%)...`);
      }
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = 'Certificates.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
};

// ============================================================================
// 17. MODAL MANAGER
// ============================================================================
const ModalManager = {
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  },

  openGenerateModal(count, onConfirm) {
    const desc = document.getElementById('generate-modal-desc');
    desc.textContent = `${count} certificates will be generated.`;
    this.open('modal-generate');

    const confirmBtn = document.getElementById('btn-confirm-generate');
    const handleConfirm = () => {
      this.close('modal-generate');
      confirmBtn.removeEventListener('click', handleConfirm);
      if (onConfirm) onConfirm();
    };
    confirmBtn.addEventListener('click', handleConfirm);

    const cancelBtn = document.getElementById('btn-cancel-generate');
    const handleCancel = () => {
      this.close('modal-generate');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };
    cancelBtn.addEventListener('click', handleCancel);
  },

  openExportModal(count) {
    const desc = document.getElementById('export-modal-desc');
    desc.textContent = `${count} PDF files`;
    this.open('modal-export');
  },

  showProgress(current, total, statusText) {
    this.open('modal-progress');
    const percent = Math.round((current / total) * 100);
    document.getElementById('progress-counter-text').textContent = `${current} / ${total}`;
    document.getElementById('export-progress-bar').style.width = `${percent}%`;
    document.getElementById('progress-status-text').textContent = statusText || 'Processing...';
  },

  hideProgress() {
    this.close('modal-progress');
  }
};

// ============================================================================
// 18. MAIN APP CONTROLLER
// ============================================================================
const App = {
  async init() {
    FontManager.init();
    Editor.init();
    PreviewManager.init();
    NavigationManager.init();
    HistoryManager.initKeyboard();
    this.bindGlobalEvents();

    // Check for existing session and restore automatically
    const restored = await SessionManager.restore();
    if (!restored) {
      NavigationManager.replace('upload');
    }
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `certify-toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  },

  bindGlobalEvents() {
    // ----------------------------------------
    // Navigation Back Buttons
    // ----------------------------------------
    document.getElementById('btn-editor-back').addEventListener('click', () => {
      NavigationManager.goTo('upload');
    });

    document.getElementById('btn-preview-back').addEventListener('click', () => {
      NavigationManager.goTo('editor');
    });

    // ----------------------------------------
    // Undo / Redo Toolbar Buttons
    // ----------------------------------------
    document.getElementById('btn-undo').addEventListener('click', () => {
      HistoryManager.undo();
    });

    document.getElementById('btn-redo').addEventListener('click', () => {
      HistoryManager.redo();
    });

    // ----------------------------------------
    // Restart / Start Over Actions
    // ----------------------------------------
    document.getElementById('btn-editor-restart').addEventListener('click', () => {
      RestartManager.requestRestart();
    });

    document.getElementById('btn-preview-restart').addEventListener('click', () => {
      RestartManager.requestRestart();
    });

    document.getElementById('btn-confirm-restart').addEventListener('click', () => {
      RestartManager.confirmRestart();
    });

    document.getElementById('btn-cancel-restart').addEventListener('click', () => {
      ModalManager.close('modal-restart');
    });

    // ----------------------------------------
    // Recovery Modal Actions
    // ----------------------------------------
    document.getElementById('btn-recovery-new').addEventListener('click', () => {
      ModalManager.close('modal-recovery');
      RestartManager.confirmRestart();
    });

    document.getElementById('btn-recovery-restore').addEventListener('click', () => {
      ModalManager.close('modal-recovery');
      NavigationManager.replace('upload');
      this.showToast('Design and data restored. Please re-upload your template image.', 'info');
    });

    // ----------------------------------------
    // STATE 1: Template Upload Events
    // ----------------------------------------
    const fileInput = document.getElementById('template-file-input');
    const dropzone = document.getElementById('template-dropzone');
    const browseBtn = document.getElementById('btn-browse-template');

    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-indigo-400', 'bg-indigo-50/20');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-indigo-400', 'bg-indigo-50/20');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-indigo-400', 'bg-indigo-50/20');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleTemplateUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleTemplateUpload(e.target.files[0]);
      }
    });

    // ----------------------------------------
    // STATE 2: Editor Bottom Field Buttons
    // ----------------------------------------
    document.querySelectorAll('.btn-add-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.fieldType;
        FieldManager.addField(type);
      });
    });

    // ----------------------------------------
    // Excel Upload Trigger & Remap
    // ----------------------------------------
    const excelInput = document.getElementById('excel-file-input');
    const uploadExcelBtn = document.getElementById('btn-upload-excel');
    uploadExcelBtn.addEventListener('click', () => excelInput.click());

    excelInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleExcelUpload(e.target.files[0]);
      }
    });

    document.getElementById('btn-reupload-excel').addEventListener('click', () => {
      excelInput.value = '';
      excelInput.click();
    });

    document.getElementById('btn-edit-mapping').addEventListener('click', () => {
      if (ExcelManager.isLoaded()) {
        MappingManager.showMappingModal(FieldManager.fields, ExcelManager.headers);
      }
    });

    document.getElementById('btn-cancel-mapping').addEventListener('click', () => {
      ModalManager.close('modal-mapping');
    });

    // ----------------------------------------
    // Generate Certificates Primary Action
    // ----------------------------------------
    document.getElementById('btn-trigger-generate').addEventListener('click', () => {
      this.handleGenerateClick();
    });

    // ----------------------------------------
    // Export Modal Actions
    // ----------------------------------------
    document.getElementById('btn-cancel-export').addEventListener('click', () => {
      ModalManager.close('modal-export');
    });

    document.getElementById('btn-export-zip').addEventListener('click', async () => {
      ModalManager.close('modal-export');
      ModalManager.showProgress(0, PreviewManager.participants.length, 'Starting ZIP export...');

      try {
        await ZipExporter.exportZip(
          PreviewManager.participants,
          (curr, tot, status) => ModalManager.showProgress(curr, tot, status)
        );
        this.showToast('Certificates exported successfully!', 'success');
      } catch (err) {
        this.showToast('Export error: ' + err.message, 'error');
      } finally {
        setTimeout(() => ModalManager.hideProgress(), 800);
      }
    });

    document.getElementById('btn-export-combined').addEventListener('click', async () => {
      ModalManager.close('modal-export');
      ModalManager.showProgress(0, PreviewManager.participants.length, 'Starting combined PDF export...');

      try {
        await PDFExporter.exportCombinedPDF(
          PreviewManager.participants,
          (curr, tot, name) => ModalManager.showProgress(curr, tot, `Adding ${name}...`)
        );
        this.showToast('Combined PDF exported successfully!', 'success');
      } catch (err) {
        this.showToast('Export error: ' + err.message, 'error');
      } finally {
        setTimeout(() => ModalManager.hideProgress(), 800);
      }
    });
  },

  async handleTemplateUpload(file) {
    try {
      await TemplateManager.loadFromFile(file);
      NavigationManager.goTo('editor');
      Editor.setupTemplate(TemplateManager.image);

      // Add default essential fields if empty
      if (FieldManager.fields.length === 0) {
        FieldManager.addField('name');
        FieldManager.addField('reg_no');
        FieldManager.addField('department');
        // Clear history stack so defaults are the base state
        HistoryManager.clear();
      }

      await SessionManager.saveNow();
      this.showToast('Template uploaded successfully!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleExcelUpload(file) {
    try {
      const res = await ExcelManager.parseFile(file);
      
      // Update UI badge
      document.getElementById('excel-loaded-badge').classList.remove('hidden');
      document.getElementById('excel-loaded-badge').classList.add('flex');
      document.getElementById('btn-upload-excel').classList.add('hidden');
      document.getElementById('excel-filename-text').textContent = res.fileName;
      document.getElementById('excel-row-count-text').textContent = `(${res.rowCount})`;

      // Auto-match columns
      const allConfident = MappingManager.autoMapFields(FieldManager.fields, ExcelManager.headers);

      if (!allConfident) {
        MappingManager.showMappingModal(FieldManager.fields, ExcelManager.headers, () => {
          this.showToast(`Excel loaded: ${res.rowCount} participants matched ✓`, 'success');
        });
      } else {
        this.showToast(`Excel loaded: ${res.rowCount} participants matched ✓`, 'success');
      }

      SessionManager.scheduleSave();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  handleGenerateClick() {
    if (!TemplateManager.isLoaded()) {
      return this.showToast('Please upload a certificate template.', 'error');
    }

    if (FieldManager.fields.length === 0) {
      return this.showToast('Please add at least one field to position on the certificate.', 'error');
    }

    if (!ExcelManager.isLoaded()) {
      this.showToast('Please upload an Excel or CSV file first.', 'error');
      document.getElementById('excel-file-input').click();
      return;
    }

    const unmappedFields = FieldManager.fields.filter(f => !MappingManager.mappings[f.id]);
    if (unmappedFields.length > 0) {
      MappingManager.showMappingModal(FieldManager.fields, ExcelManager.headers, () => {
        this.confirmAndGenerate();
      });
      return;
    }

    this.confirmAndGenerate();
  },

  confirmAndGenerate() {
    const totalCount = ExcelManager.rows.length;
    ModalManager.openGenerateModal(totalCount, () => {
      NavigationManager.goTo('preview');
      PreviewManager.setup(ExcelManager.rows);
      this.showToast(`Generated ${totalCount} certificates preview!`, 'success');
    });
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
