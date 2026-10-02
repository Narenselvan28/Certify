// JSZip bulk ZIP export service

import JSZip from 'jszip';
import { generateSinglePDF } from './pdfExporter.js';

/**
 * Generate individual PDFs for all participants and download as a ZIP archive.
 */
export async function exportZip(rows, templateImg, fields, mappings, onProgress, overrides = {}) {
  const zip = new JSZip();
  const folder = zip.folder('Certificates');
  const total = rows.length;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    const override = overrides[i] || null;
    const { filename, blob } = await generateSinglePDF(row, i, templateImg, fields, mappings, override);

    const name = filename.replace(/\.pdf$/i, '');
    onProgress?.(i + 1, total, `Generating ${name}...`);

    folder.file(filename, blob);
    await new Promise(r => setTimeout(r, 0)); // yield
  }

  onProgress?.(total, total, 'Compiling ZIP archive...');

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (meta) => {
    if (meta.percent && onProgress) {
      onProgress(total, total, `Packaging ZIP (${Math.round(meta.percent)}%)...`);
    }
  });

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Certificates.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
