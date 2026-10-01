/**
 * Certify — Minimal Client-Side Bulk Certificate Generator
 * 
 * Architecture:
 * - TemplateManager: Template image loading and aspect ratio calculations
 * - FieldManager: Field definitions, normalized coordinates, and state
 * - FontManager: Google Fonts list, categorization, search, and dynamic loading
 * - Editor: Interactive workspace, drag-and-drop, resize handles, rotation, keyboard controls
 * - ExcelManager: File parsing via SheetJS (.xlsx, .xls, .csv)
 * - MappingManager: Auto-matching columns with fuzzy aliases and fallback modal
 * - CertificateRenderer: Pixel-perfect unified HTML5 Canvas rendering engine (Auto-Fit, text alignment, rotation, letter spacing)
 * - PreviewManager: Single Preview & Grid View, pagination, jump-to, error inspection
 * - PDFExporter: High-resolution PDF generation matching template dimensions using jsPDF
 * - ZipExporter: Bulk packaging into ZIP using JSZip with live progress tracking
 * - ModalManager: Dialogs for confirmation, column mapping, export, and reset
 * - App: Main controller wiring the complete workflow
 */

// ============================================================================
// 1. FONT MANAGER (27 Legal Google Fonts in 4 Categories)
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
    if (!active) return;
    active.fontFamily = fontFamily;
    document.getElementById('tb-current-font').textContent = fontFamily;
    document.getElementById('tb-current-font').style.fontFamily = `'${fontFamily}', sans-serif`;
    Editor.updateFieldElement(active);
    Editor.updateToolbarValues(active);
  },

  async ensureFontLoaded(fontFamily, fontWeight = 'normal', fontStyle = 'normal') {
    try {
      if (document.fonts && document.fonts.load) {
        await document.fonts.load(`${fontStyle} ${fontWeight} 16px "${fontFamily}"`);
      }
    } catch (err) {
      console.warn('Font load check warning:', err);
    }
  }
};

// ============================================================================
// 2. TEMPLATE MANAGER
// ============================================================================
const TemplateManager = {
  image: null,
  src: null,
  naturalWidth: 0,
  naturalHeight: 0,
  aspectRatio: 1.414,

  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error("This file format isn't supported. Please upload a PNG, JPG, or JPEG image."));
      }

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
        
        // Update Template badge
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
    this.naturalWidth = 0;
    this.naturalHeight = 0;
  }
};

// ============================================================================
// 3. FIELD MANAGER (Normalized Coordinates & Properties)
// ============================================================================
const FieldManager = {
  fields: [],
  selectedFieldId: null,
  counter: 1,

  // Standard predefined field types with sensible default autoFit rules
  fieldTemplates: {
    name: {
      type: 'name',
      label: 'Participant Name',
      placeholder: '{{NAME}}',
      sampleVal: 'Arun Kumar',
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
      sampleVal: '23ECE001',
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
      sampleVal: 'Electronics & Communication',
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
      sampleVal: '001',
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
      sampleVal: 'National Tech Symposium 2026',
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
      sampleVal: 'October 15, 2026',
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
      sampleVal: 'Custom Text',
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
    const template = this.fieldTemplates[type] || this.fieldTemplates.custom;
    
    // Position staggered or centered in viewport
    const count = this.fields.length;
    let initialX = Math.max(0.1, 0.5 - template.width / 2);
    let initialY = Math.min(0.8, 0.35 + (count * 0.08));

    const id = `field_${this.counter++}`;
    const newField = {
      id: id,
      type: type,
      label: type === 'custom' ? `Custom ${this.counter - 1}` : template.label,
      placeholder: template.placeholder,
      sampleVal: template.sampleVal,
      // Normalized coordinates (0.0 to 1.0)
      x: initialX,
      y: initialY,
      width: template.width,
      height: template.height,
      rotation: 0,
      fontSizePx: template.fontSizePx,
      fontWeight: template.fontWeight,
      fontStyle: 'normal',
      fontFamily: template.fontFamily,
      color: '#111827',
      align: template.align,
      letterSpacing: 0,
      lineHeight: 1.2,
      autoFit: template.autoFit
    };

    this.fields.push(newField);
    this.selectField(id);
    Editor.renderFieldElement(newField);
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
      this.fields.splice(index, 1);
      if (this.selectedFieldId === id) {
        this.selectedFieldId = null;
      }
      Editor.removeFieldElement(id);
      Editor.onFieldSelectionChanged();
    }
  },

  clear() {
    this.fields = [];
    this.selectedFieldId = null;
    Editor.clearAllFieldElements();
  }
};

// ============================================================================
// 4. EDITOR (Interactive Drag, Resize, Rotate & Floating Toolbar)
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

    // Re-render all existing fields to scale smoothly
    FieldManager.fields.forEach(f => this.updateFieldElement(f));
    this.positionToolbar();
  },

  renderFieldElement(field) {
    let el = document.getElementById(field.id);
    if (!el) {
      el = document.createElement('div');
      el.id = field.id;
      el.className = 'cert-field';
      
      // Text container
      const content = document.createElement('div');
      content.className = 'cert-field-content';
      el.appendChild(content);

      // 8 Resize Handles
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      handles.forEach(h => {
        const handle = document.createElement('div');
        handle.className = `resize-handle handle-${h}`;
        handle.dataset.handle = h;
        el.appendChild(handle);
      });

      // Rotation Handle & line
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

    // Apply normalized percentages
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

    // Base font size scaled to current stage
    let currentFontSize = Math.max(10, Math.round(field.fontSizePx * scale));

    // Handle interactive auto-fit preview in DOM
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

      const targetHandle = e.target.dataset.handle;
      const rect = this.stage.getBoundingClientRect();

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

        // Keep inside bounds
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

        // Snap to 0 if within +/- 4 degrees
        if (Math.abs(deg) <= 4) deg = 0;

        field.rotation = deg;
        this.updateFieldElement(field);
        this.updateToolbarValues(field);
      }
    });

    el.addEventListener('pointerup', (e) => {
      this.dragAction = null;
      this.activeHandle = null;
      el.classList.remove('is-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    el.addEventListener('pointercancel', (e) => {
      this.dragAction = null;
      this.activeHandle = null;
      el.classList.remove('is-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    });
  },

  bindViewportEvents() {
    this.viewport.addEventListener('pointerdown', (e) => {
      // If clicking stage background or viewport outside any field, deselect
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

    // Position floating toolbar just above the field box
    const toolbarWidth = this.toolbar.offsetWidth || 340;
    const toolbarHeight = this.toolbar.offsetHeight || 38;

    let left = (fieldRect.left - stageRect.left) + (fieldRect.width / 2) - (toolbarWidth / 2);
    let top = (fieldRect.top - stageRect.top) - toolbarHeight - 12;

    // Boundary checks within stage
    if (top < 10) {
      // If too close to top edge, dock below the field
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
    
    // Bold & Italic status
    const isBold = field.fontWeight === 'bold' || parseInt(field.fontWeight) >= 600;
    const boldBtn = document.getElementById('tb-bold-btn');
    boldBtn.className = `px-2 py-1 font-bold transition-colors ${isBold ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`;

    const isItalic = field.fontStyle === 'italic';
    const italicBtn = document.getElementById('tb-italic-btn');
    italicBtn.className = `px-2 py-1 italic font-serif border-l border-gray-200 transition-colors ${isItalic ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`;

    // Color picker
    document.getElementById('tb-color-picker').value = field.color;

    // AutoFit
    const autofitBtn = document.getElementById('tb-autofit-btn');
    if (field.autoFit) {
      autofitBtn.className = 'flex items-center space-x-1 px-2 py-1 rounded border border-indigo-300 bg-indigo-50 text-[11px] font-medium text-indigo-700';
    } else {
      autofitBtn.className = 'flex items-center space-x-1 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-[11px] text-gray-500';
    }

    // Rotation & Spacing
    document.getElementById('tb-rotation-input').value = field.rotation || 0;
    document.getElementById('tb-spacing-input').value = field.letterSpacing || 0;
  },

  bindToolbarEvents() {
    // Font Size Steppers & Input
    const sizeInput = document.getElementById('tb-font-size');
    const updateSize = (newSize) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      active.fontSizePx = Math.max(8, Math.min(200, parseInt(newSize) || 32));
      sizeInput.value = active.fontSizePx;
      this.updateFieldElement(active);
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
      const isBold = active.fontWeight === 'bold' || parseInt(active.fontWeight) >= 600;
      active.fontWeight = isBold ? 'normal' : 'bold';
      this.updateFieldElement(active);
      this.updateToolbarValues(active);
    });

    // Italic Toggle
    document.getElementById('tb-italic-btn').addEventListener('click', () => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      active.fontStyle = active.fontStyle === 'italic' ? 'normal' : 'italic';
      this.updateFieldElement(active);
      this.updateToolbarValues(active);
    });

    // Alignment Toggles
    const setAlign = (align) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      active.align = align;
      this.updateFieldElement(active);
    };
    document.getElementById('tb-align-left').addEventListener('click', () => setAlign('left'));
    document.getElementById('tb-align-center').addEventListener('click', () => setAlign('center'));
    document.getElementById('tb-align-right').addEventListener('click', () => setAlign('right'));

    // Color Picker
    document.getElementById('tb-color-picker').addEventListener('input', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      active.color = e.target.value;
      this.updateFieldElement(active);
    });

    // AutoFit Toggle
    document.getElementById('tb-autofit-btn').addEventListener('click', () => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      active.autoFit = !active.autoFit;
      this.updateFieldElement(active);
      this.updateToolbarValues(active);
      App.showToast(`Auto Fit: ${active.autoFit ? 'Enabled' : 'Disabled'}`);
    });

    // Rotation Input
    const rotInput = document.getElementById('tb-rotation-input');
    rotInput.addEventListener('change', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      let val = parseInt(e.target.value) || 0;
      val = Math.max(-180, Math.min(180, val));
      active.rotation = val;
      rotInput.value = val;
      this.updateFieldElement(active);
    });

    // Letter Spacing Input
    const spacingInput = document.getElementById('tb-spacing-input');
    spacingInput.addEventListener('change', (e) => {
      const active = FieldManager.getSelectedField();
      if (!active) return;
      let val = parseFloat(e.target.value) || 0;
      active.letterSpacing = val;
      this.updateFieldElement(active);
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
        const step = e.shiftKey ? 0.01 : 0.002;
        if (e.key === 'ArrowUp') active.y = Math.max(0, Number((active.y - step).toFixed(4)));
        if (e.key === 'ArrowDown') active.y = Math.min(1 - active.height, Number((active.y + step).toFixed(4)));
        if (e.key === 'ArrowLeft') active.x = Math.max(0, Number((active.x - step).toFixed(4)));
        if (e.key === 'ArrowRight') active.x = Math.min(1 - active.width, Number((active.x + step).toFixed(4)));

        this.updateFieldElement(active);
        this.positionToolbar();
      }
    });
  }
};

// ============================================================================
// 5. EXCEL MANAGER (SheetJS Parsing)
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

          // Extract headers
          const headerSet = new Set();
          jsonRows.forEach(row => {
            Object.keys(row).forEach(key => headerSet.add(key.trim()));
          });
          const headers = Array.from(headerSet);

          this.fileName = fileName;
          this.headers = headers;
          this.rows = jsonRows;

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
// 6. MAPPING MANAGER (Automatic Column Matching & Confirmation Modal)
// ============================================================================
const MappingManager = {
  mappings: {}, // field.id -> excelHeader

  // Common variations for standard fields
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
    return allConfident;
  },

  showMappingModal(fields, headers, onConfirm) {
    const listEl = document.getElementById('mapping-list');
    listEl.innerHTML = '';

    fields.forEach(field => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 text-xs';

      const left = document.createElement('div');
      left.className = 'flex flex-col';
      left.innerHTML = `
        <span class="font-medium text-gray-800">${field.label}</span>
        <span class="text-[10px] text-gray-400">${field.placeholder}</span>
      `;

      const right = document.createElement('div');
      const select = document.createElement('select');
      select.className = 'px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white';
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

    // Confirm button listener
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
      if (onConfirm) onConfirm();
    };

    confirmBtn.addEventListener('click', handleConfirm);
  }
};

// ============================================================================
// 7. CERTIFICATE RENDERER (Unified Pixel-Perfect HTML5 Canvas Engine)
// ============================================================================
const CertificateRenderer = {
  /**
   * Renders a certificate onto any canvas element.
   * Maintains 1:1 parity between preview and PDF output.
   */
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
      // Determine field text from mapping or placeholder
      let text = '';
      if (participantRow) {
        const mappedCol = MappingManager.mappings[field.id];
        if (mappedCol && participantRow[mappedCol] !== undefined) {
          text = String(participantRow[mappedCol]);
        } else if (participantRow[field.label] !== undefined) {
          text = String(participantRow[field.label]);
        } else {
          // If empty/missing in row
          text = '';
        }
      } else {
        text = field.sampleVal || field.placeholder;
      }

      if (!text) continue; // Skip empty text values

      // Ensure custom font is ready in canvas context
      await FontManager.ensureFontLoaded(field.fontFamily, field.fontWeight, field.fontStyle);

      // Normalized coordinates to target canvas pixels
      const boxX = field.x * width;
      const boxY = field.y * height;
      const boxW = field.width * width;
      const boxH = field.height * height;

      // Base font size scaled to this canvas
      let fontSize = field.fontSizePx * scale;
      const padding = 6 * scale;
      const maxTextWidth = boxW - (padding * 2);

      // Auto-Fit Calculation
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

        // Height guard
        if (fontSize > boxH * 0.95) {
          fontSize = Math.max(10 * scale, Math.floor(boxH * 0.95));
          ctx.font = `${field.fontStyle || 'normal'} ${field.fontWeight || 'normal'} ${fontSize}px "${field.fontFamily}", sans-serif`;
        }
      }

      ctx.fillStyle = field.color || '#111827';
      ctx.textBaseline = 'middle';

      // Horizontal alignment anchor
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

      // Handle Rotation
      if (field.rotation && field.rotation !== 0) {
        const centerX = boxX + boxW / 2;
        const centerY = boxY + boxH / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((field.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      // Draw the text
      ctx.fillText(text, textX, textY);
      ctx.restore();
    }

    return canvas;
  }
};

// ============================================================================
// 8. PREVIEW MANAGER (Single Preview, Grid View & Navigation)
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
    // Navigation
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
      App.switchState('state-editor');
      Editor.resizeStage();
    });

    // Primary Export button
    document.getElementById('btn-preview-export').addEventListener('click', () => {
      ModalManager.openExportModal(this.participants.length);
    });

    // Arrow keys for preview navigation
    window.addEventListener('keydown', (e) => {
      if (App.currentState !== 'state-preview') return;
      if (['INPUT', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowLeft') this.navigate(this.currentIndex - 1);
      if (e.key === 'ArrowRight') this.navigate(this.currentIndex + 1);
    });
  },

  setup(participants) {
    this.participants = participants;
    this.currentIndex = 0;
    this.failedIndices = [];
    this.cachedThumbnails = {};

    // Validate participants for missing required mapped values
    participants.forEach((p, idx) => {
      let isRowFailed = false;
      FieldManager.fields.forEach(f => {
        const col = MappingManager.mappings[f.id];
        if (col && (p[col] === undefined || String(p[col]).trim() === '')) {
          // If a mapped field is completely empty in this row
          isRowFailed = true;
        }
      });
      if (isRowFailed) {
        this.failedIndices.push(idx);
      }
    });

    // Update Header Counts
    const countTitle = document.getElementById('preview-count-title');
    countTitle.textContent = `${participants.length} Certificates`;

    const failBadge = document.getElementById('preview-fail-badge');
    if (this.failedIndices.length > 0) {
      failBadge.classList.remove('hidden');
      failBadge.textContent = `${participants.length - this.failedIndices.length} generated, ${this.failedIndices.length} with empty fields`;
    } else {
      failBadge.classList.add('hidden');
    }

    const jumpInput = document.getElementById('preview-jump-input');
    jumpInput.max = participants.length;
    jumpInput.value = 1;

    this.setViewMode('single');
    this.renderCurrentSingle();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    const btnSingle = document.getElementById('btn-view-single');
    const btnGrid = document.getElementById('btn-view-grid');
    const containerSingle = document.getElementById('preview-single-container');
    const containerGrid = document.getElementById('preview-grid-container');

    if (mode === 'single') {
      btnSingle.className = 'px-3 py-1 text-xs font-medium rounded text-gray-900 bg-white shadow-xs';
      btnGrid.className = 'px-3 py-1 text-xs font-medium rounded text-gray-500 hover:text-gray-900';
      containerSingle.classList.remove('hidden');
      containerGrid.classList.add('hidden');
      this.renderCurrentSingle();
    } else {
      btnGrid.className = 'px-3 py-1 text-xs font-medium rounded text-gray-900 bg-white shadow-xs';
      btnSingle.className = 'px-3 py-1 text-xs font-medium rounded text-gray-500 hover:text-gray-900';
      containerSingle.classList.add('hidden');
      containerGrid.classList.remove('hidden');
      this.renderGridView();
    }
  },

  navigate(newIndex) {
    if (newIndex < 0 || newIndex >= this.participants.length) return;
    this.currentIndex = newIndex;
    this.renderCurrentSingle();
  },

  async renderCurrentSingle() {
    if (this.participants.length === 0) return;

    const row = this.participants[this.currentIndex];
    const canvas = document.getElementById('single-preview-canvas');

    // Display dimensions matching container aspect ratio
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

    // Render cards progressively
    for (let i = 0; i < this.participants.length; i++) {
      const row = this.participants[i];
      const card = document.createElement('div');
      card.className = 'cert-thumb-card bg-white border border-gray-200 rounded p-2 cursor-pointer hover:border-indigo-400 flex flex-col items-center';
      
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'w-full object-contain rounded-xs border border-gray-100 bg-gray-50';
      thumbCanvas.width = thumbWidth;
      thumbCanvas.height = thumbHeight;
      card.appendChild(thumbCanvas);

      // Label & Index
      const nameField = FieldManager.fields.find(f => f.type === 'name');
      let pName = 'Participant';
      if (nameField && MappingManager.mappings[nameField.id]) {
        pName = row[MappingManager.mappings[nameField.id]] || 'Participant';
      }

      const meta = document.createElement('div');
      meta.className = 'w-full mt-2 flex items-center justify-between text-[11px] text-gray-500';
      meta.innerHTML = `
        <span class="font-mono text-gray-400">#${String(i + 1).padStart(3, '0')}</span>
        <span class="font-medium text-gray-800 truncate max-w-[150px]">${pName}</span>
      `;
      card.appendChild(meta);

      card.addEventListener('click', () => {
        this.currentIndex = i;
        this.setViewMode('single');
      });

      gridEl.appendChild(card);

      // Render thumbnail asynchronously
      CertificateRenderer.renderCertificate(
        thumbCanvas,
        TemplateManager.image,
        FieldManager.fields,
        row,
        { width: thumbWidth, height: thumbHeight }
      );

      // Non-blocking yield for large lists
      if (i % 12 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }
};

// ============================================================================
// 9. PDF EXPORTER (jsPDF High-Resolution Generation)
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
    // Search any header containing name
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes('name')) return String(row[key]);
    }
    return 'Participant';
  },

  /**
   * Generates a single high-quality PDF blob for one participant.
   */
  async generateSinglePDF(row, index, templateWidth, templateHeight) {
    const { jsPDF } = window.jspdf;
    const orientation = templateWidth >= templateHeight ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [templateWidth, templateHeight],
      hotfixes: ['px_scaling']
    });

    // Offscreen render canvas at 100% template resolution
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

  /**
   * Generates a combined multi-page PDF containing all participants.
   */
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

      // Yield event loop
      await new Promise(r => setTimeout(r, 0));
    }

    pdf.save('All_Certificates.pdf');
  }
};

// ============================================================================
// 10. ZIP EXPORTER (JSZip Bulk Packaging)
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

      // Non-blocking yield
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

    // Trigger download
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
// 11. MODAL MANAGER
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
// 12. MAIN APP CONTROLLER
// ============================================================================
const App = {
  currentState: 'state-upload',

  init() {
    FontManager.init();
    Editor.init();
    PreviewManager.init();
    this.bindGlobalEvents();
  },

  switchState(newState) {
    const states = ['state-upload', 'state-editor', 'state-preview'];
    states.forEach(s => {
      const el = document.getElementById(s);
      if (el) {
        if (s === newState) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });
    this.currentState = newState;
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
    // STATE 1: Template Upload Events
    // ----------------------------------------
    const fileInput = document.getElementById('template-file-input');
    const dropzone = document.getElementById('template-dropzone');
    const browseBtn = document.getElementById('btn-browse-template');
    const sampleBtn = document.getElementById('btn-load-sample');

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

    sampleBtn.addEventListener('click', () => {
      this.loadSampleWorkspace();
    });

    // ----------------------------------------
    // STATE 2: Editor Top Toolbar Events
    // ----------------------------------------
    // Add Field buttons
    document.querySelectorAll('.btn-add-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.fieldType;
        FieldManager.addField(type);
      });
    });

    // Change Template (Start New)
    document.getElementById('btn-change-template').addEventListener('click', () => {
      if (FieldManager.fields.length > 0) {
        ModalManager.open('modal-reset');
      } else {
        this.resetApp();
      }
    });

    document.getElementById('btn-confirm-reset').addEventListener('click', () => {
      ModalManager.close('modal-reset');
      this.resetApp();
    });

    document.getElementById('btn-cancel-reset').addEventListener('click', () => {
      ModalManager.close('modal-reset');
    });

    // Excel Upload Trigger
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

    // Generate Certificates Primary Action
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
      this.switchState('state-editor');
      Editor.setupTemplate(TemplateManager.image);

      // Add default essential fields if empty
      if (FieldManager.fields.length === 0) {
        FieldManager.addField('name');
        FieldManager.addField('reg_no');
        FieldManager.addField('department');
      }
      this.showToast('Template uploaded successfully!', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async loadSampleWorkspace() {
    try {
      // 1. Load sample template image
      await TemplateManager.loadFromSrc('assets/sample-template.jpg');
      this.switchState('state-editor');
      Editor.setupTemplate(TemplateManager.image);

      // 2. Add realistic placed fields centered
      FieldManager.clear();
      
      const name = FieldManager.addField('name');
      name.x = 0.20;
      name.y = 0.40;
      name.width = 0.60;
      name.height = 0.10;
      name.fontSizePx = 42;
      name.fontFamily = 'Playfair Display';
      name.fontWeight = 'bold';
      name.autoFit = true;
      Editor.updateFieldElement(name);

      const reg = FieldManager.addField('reg_no');
      reg.x = 0.32;
      reg.y = 0.52;
      reg.width = 0.36;
      reg.height = 0.05;
      reg.fontSizePx = 20;
      reg.fontFamily = 'Inter';
      Editor.updateFieldElement(reg);

      const dept = FieldManager.addField('department');
      dept.x = 0.25;
      dept.y = 0.58;
      dept.width = 0.50;
      dept.height = 0.06;
      dept.fontSizePx = 22;
      dept.fontFamily = 'Inter';
      dept.autoFit = true;
      Editor.updateFieldElement(dept);

      const eventField = FieldManager.addField('event_name');
      eventField.x = 0.25;
      eventField.y = 0.65;
      eventField.width = 0.50;
      eventField.height = 0.06;
      eventField.fontSizePx = 24;
      eventField.fontFamily = 'Montserrat';
      eventField.fontWeight = '600';
      Editor.updateFieldElement(eventField);

      // 3. Load sample CSV participants
      const response = await fetch('assets/sample_participants.csv');
      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });

      ExcelManager.fileName = 'sample_participants.csv';
      ExcelManager.headers = Object.keys(jsonRows[0]);
      ExcelManager.rows = jsonRows;

      // Update Excel loaded badge
      document.getElementById('excel-loaded-badge').classList.remove('hidden');
      document.getElementById('excel-loaded-badge').classList.add('flex');
      document.getElementById('btn-upload-excel').classList.add('hidden');
      document.getElementById('excel-filename-text').textContent = 'sample_participants.csv';
      document.getElementById('excel-row-count-text').textContent = `(${jsonRows.length})`;

      // Auto map
      MappingManager.autoMapFields(FieldManager.fields, ExcelManager.headers);
      this.showToast('Loaded sample template & 15 participants!', 'success');
    } catch (err) {
      this.showToast('Error loading sample: ' + err.message, 'error');
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

      // Check column mapping
      const allConfident = MappingManager.autoMapFields(FieldManager.fields, ExcelManager.headers);

      if (!allConfident) {
        MappingManager.showMappingModal(FieldManager.fields, ExcelManager.headers, () => {
          this.showToast(`Excel loaded: ${res.rowCount} participants matched ✓`, 'success');
        });
      } else {
        this.showToast(`Excel loaded: ${res.rowCount} participants matched ✓`, 'success');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  handleGenerateClick() {
    // 1. Validation
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

    // 2. Check if all fields mapped
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
      this.switchState('state-preview');
      PreviewManager.setup(ExcelManager.rows);
      this.showToast(`Generated ${totalCount} certificates preview!`, 'success');
    });
  },

  resetApp() {
    TemplateManager.reset();
    FieldManager.clear();
    ExcelManager.reset();
    MappingManager.mappings = {};

    document.getElementById('excel-loaded-badge').classList.add('hidden');
    document.getElementById('excel-loaded-badge').classList.remove('flex');
    document.getElementById('btn-upload-excel').classList.remove('hidden');
    document.getElementById('template-file-input').value = '';
    document.getElementById('excel-file-input').value = '';

    this.switchState('state-upload');
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
