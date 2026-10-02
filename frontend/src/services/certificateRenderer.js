// Pixel-perfect HTML5 Canvas certificate renderer.
// Single source of truth used by preview, PDF, and ZIP exporters.

import { ensureFontLoaded } from '../constants/fonts.js';

// Cache loaded signature / asset images to prevent reloading per frame
const _imgCache = new Map();

export async function getLoadedImage(src) {
  if (!src) return null;
  if (_imgCache.has(src)) return _imgCache.get(src);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      _imgCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn('Failed to load image asset for canvas:', src.slice(0, 50));
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Render a single certificate onto a canvas element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} templateImg
 * @param {Array} fields  - Field definitions with normalized coordinates
 * @param {Object|null} row - Participant data row (null = show placeholders)
 * @param {Object} mappings - { fieldId: headerName }
 * @param {{ width?: number, height?: number, override?: Object }} options
 */
export async function renderCertificate(canvas, templateImg, fields, row, mappings = {}, options = {}) {
  const ctx = canvas.getContext('2d');
  const width  = options.width  || templateImg.naturalWidth;
  const height = options.height || templateImg.naturalHeight;

  canvas.width  = width;
  canvas.height = height;

  // 1. Draw template background
  ctx.drawImage(templateImg, 0, 0, width, height);

  const naturalH = templateImg.naturalHeight || 1000;
  const scale    = height / naturalH;

  // Extract any individual override for this participant
  const override = options.override || (row && row._override) || null;
  const participantData = override?.data ? { ...row, ...override.data } : row;

  // 2. Render each field
  for (let originalField of fields) {
    // Check if this field has individual overrides (e.g. repositioned, resized, or text changed)
    const fieldOverride = override?.fields?.[originalField.id] || {};
    const field = { ...originalField, ...fieldOverride };

    const boxX = field.x * width;
    const boxY = field.y * height;
    const boxW = field.width * width;
    const boxH = field.height * height;

    // ── Signature Field ──────────────────────────────────────────────────────
    if (field.type === 'signature') {
      ctx.save();

      // Apply rotation around field center
      if (field.rotation && field.rotation !== 0) {
        const cx = boxX + boxW / 2;
        const cy = boxY + boxH / 2;
        ctx.translate(cx, cy);
        ctx.rotate((field.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (field.imageSrc) {
        const sigImg = await getLoadedImage(field.imageSrc);
        if (sigImg) {
          ctx.drawImage(sigImg, boxX, boxY, boxW, boxH);
        }
      } else {
        // Placeholder outline if no image selected yet
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1 * scale;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = '#64748B';
        ctx.font = `italic ${13 * scale}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(field.label || 'Signature', boxX + boxW / 2, boxY + boxH / 2);
      }

      ctx.restore();
      continue;
    }

    // ── Text Fields ──────────────────────────────────────────────────────────
    let text = '';

    // Direct text override takes top precedence
    if (field.text !== undefined && field.text !== null && field.text !== '') {
      text = String(field.text);
    } else if (participantData) {
      const col = mappings[field.id];
      if (col && participantData[col] !== undefined) {
        text = String(participantData[col]);
      } else if (participantData[field.label] !== undefined) {
        text = String(participantData[field.label]);
      } else if (participantData[field.type] !== undefined) {
        text = String(participantData[field.type]);
      }
    } else {
      text = field.placeholder || field.label;
    }

    if (!text) continue;

    await ensureFontLoaded(field.fontFamily, field.fontWeight, field.fontStyle);

    let fontSize = field.fontSizePx * scale;
    const padding = 6 * scale;
    const maxTextW = boxW - padding * 2;

    ctx.save();

    // Set font
    ctx.font = `${field.fontStyle || 'normal'} ${field.fontWeight || 'normal'} ${fontSize}px "${field.fontFamily}", sans-serif`;

    // Letter spacing (Chrome 94+)
    if (field.letterSpacing && 'letterSpacing' in ctx) {
      ctx.letterSpacing = `${(field.letterSpacing || 0) * scale}px`;
    }

    // Auto-fit: shrink font if text overflows box width
    if (field.autoFit && maxTextW > 10) {
      const measured = ctx.measureText(text).width;
      if (measured > maxTextW) {
        const factor = maxTextW / measured;
        fontSize = Math.max(10 * scale, Math.floor(fontSize * factor));
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
    if (field.align === 'left')        { textX = boxX + padding;        ctx.textAlign = 'left'; }
    else if (field.align === 'right')  { textX = boxX + boxW - padding; ctx.textAlign = 'right'; }
    else                               { textX = boxX + boxW / 2;       ctx.textAlign = 'center'; }

    const textY = boxY + boxH / 2;

    // Apply rotation around field center
    if (field.rotation && field.rotation !== 0) {
      const cx = boxX + boxW / 2;
      const cy = boxY + boxH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((field.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.fillText(text, textX, textY);
    ctx.restore();
  }

  return canvas;
}
