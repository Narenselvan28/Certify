// PDF generation service using jsPDF

import { jsPDF } from 'jspdf';
import { renderCertificate } from './certificateRenderer.js';
import { buildCertFilename } from '../utils/filenames.js';

/**
 * Get a participant's name from a row, using field mappings then fallback.
 */
export function getParticipantName(row, fields, mappings) {
  const nameField = fields.find(f => f.type === 'name');
  if (nameField && mappings[nameField.id] && row[mappings[nameField.id]]) {
    return String(row[mappings[nameField.id]]).trim();
  }
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().includes('name') && row[key]) return String(row[key]).trim();
  }
  return 'Participant';
}

/**
 * Get event name from a row or field configuration.
 */
export function getEventName(row, fields, mappings) {
  const eventField = fields?.find(f => f.type === 'event_name');
  if (eventField && mappings && mappings[eventField.id] && row?.[mappings[eventField.id]]) {
    return String(row[mappings[eventField.id]]).trim();
  }
  if (eventField && eventField.placeholder) {
    const ph = eventField.placeholder.replace(/^\{\{|\}\}$/g, '').trim();
    if (ph) return ph;
  }
  if (row) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes('event') && row[key]) return String(row[key]).trim();
    }
  }
  return '';
}

export function getParticipantRegNo(row, fields, mappings) {
  const regField = fields?.find(f => f.type === 'reg_no');
  if (regField && mappings?.[regField.id] && row?.[mappings[regField.id]]) {
    return String(row[mappings[regField.id]]).trim();
  }
  if (row) {
    for (const key of Object.keys(row)) {
      const lower = key.toLowerCase();
      if ((lower.includes('reg') || lower.includes('roll')) && row[key]) {
        return String(row[key]).trim();
      }
    }
  }
  return '';
}

/**
 * Generate a single PDF for one participant.
 * @returns {{ filename: string, blob: Blob }}
 */
export async function generateSinglePDF(row, index, templateImg, fields, mappings, override = null) {
  const w = templateImg.naturalWidth;
  const h = templateImg.naturalHeight;
  const orientation = w >= h ? 'landscape' : 'portrait';

  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });

  const canvas = document.createElement('canvas');
  await renderCertificate(canvas, templateImg, fields, row, mappings, { width: w, height: h, override });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, w, h);

  const effectiveRow = override?.data ? { ...row, ...override.data } : row;
  const name = override?.data?.name || getParticipantName(effectiveRow, fields, mappings);
  const regNo = override?.data?.reg_no || getParticipantRegNo(effectiveRow, fields, mappings);
  const filename = buildCertFilename(index, name, regNo);
  const blob = pdf.output('blob');

  return { filename, blob };
}

/**
 * Generate and auto-download a combined multi-page PDF.
 */
export async function exportCombinedPDF(rows, templateImg, fields, mappings, onProgress, overrides = {}) {
  const w = templateImg.naturalWidth;
  const h = templateImg.naturalHeight;
  const orientation = w >= h ? 'landscape' : 'portrait';

  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
  const canvas = document.createElement('canvas');

  for (let i = 0; i < rows.length; i++) {
    if (i > 0) pdf.addPage([w, h], orientation);
    const row = rows[i];
    const override = overrides[i] || null;
    const effectiveRow = override?.data ? { ...row, ...override.data } : row;
    const name = override?.data?.name || getParticipantName(effectiveRow, fields, mappings);
    onProgress?.(i + 1, rows.length, name);

    await renderCertificate(canvas, templateImg, fields, row, mappings, { width: w, height: h, override });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, w, h);

    await new Promise(r => setTimeout(r, 0)); // yield to browser
  }

  pdf.save('All_Certificates.pdf');
}
