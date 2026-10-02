// Pixel-perfect HTML5 Canvas certificate renderer.
// Single source of truth used by preview, PDF, and ZIP exporters.

import { ensureFontLoaded } from '../constants/fonts.js';

/**
 * Render a single certificate onto a canvas element.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} templateImg
 * @param {Array} fields  - Field definitions with normalized coordinates
 * @param {Object|null} row - Participant data row (null = show placeholders)
 * @param {Object} mappings - { fieldId: headerName }
 * @param {{ width: number, height: number }} options
 */
export async function renderCertificate(canvas, templateImg, fields, row, mappings, options = {}) {
  const ctx = canvas.getContext('2d');
  const width  = options.width  || templateImg.naturalWidth;
  const height = options.height || templateImg.naturalHeight;

  canvas.width  = width;
  canvas.height = height;

  // 1. Draw template background
  ctx.drawImage(templateImg, 0, 0, width, height);

  const naturalH = templateImg.naturalHeight || 1000;
  const scale    = height / naturalH;

  // 2. Render each field
  for (const field of fields) {
    let text = '';
    if (row) {
      const col = mappings[field.id];
      if (col && row[col] !== undefined) {
        text = String(row[col]);
      } else if (row[field.label] !== undefined) {
        text = String(row[field.label]);
      }
    } else {
      text = field.placeholder;
    }
    if (!text) continue;

    await ensureFontLoaded(field.fontFamily, field.fontWeight, field.fontStyle);

    const boxX = field.x * width;
    const boxY = field.y * height;
    const boxW = field.width * width;
    const boxH = field.height * height;

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
