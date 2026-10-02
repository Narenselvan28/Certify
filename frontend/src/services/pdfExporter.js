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
 * Generate a single PDF for one participant.
 * @returns {{ filename: string, blob: Blob }}
 */
export async function generateSinglePDF(row, index, templateImg, fields, mappings) {
  const w = templateImg.naturalWidth;
  const h = templateImg.naturalHeight;
  const orientation = w >= h ? 'landscape' : 'portrait';

  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });

  const canvas = document.createElement('canvas');
  await renderCertificate(canvas, templateImg, fields, row, mappings, { width: w, height: h });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, w, h);

  const name = getParticipantName(row, fields, mappings);
  const filename = buildCertFilename(index, name);
  const blob = pdf.output('blob');

  return { filename, blob };
}

/**
 * Generate and auto-download a combined multi-page PDF.
 */
export async function exportCombinedPDF(rows, templateImg, fields, mappings, onProgress) {
  const w = templateImg.naturalWidth;
  const h = templateImg.naturalHeight;
  const orientation = w >= h ? 'landscape' : 'portrait';

  const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
  const canvas = document.createElement('canvas');

  for (let i = 0; i < rows.length; i++) {
    if (i > 0) pdf.addPage([w, h], orientation);
    const row = rows[i];
    const name = getParticipantName(row, fields, mappings);
    onProgress?.(i + 1, rows.length, name);

    await renderCertificate(canvas, templateImg, fields, row, mappings, { width: w, height: h });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, w, h);

    await new Promise(r => setTimeout(r, 0)); // yield to browser
  }

  pdf.save('All_Certificates.pdf');
}
