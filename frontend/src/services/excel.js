// Excel / CSV parsing service using SheetJS

import * as XLSX from 'xlsx';

/**
 * Parse an Excel or CSV file.
 * @returns {{ fileName, headers, rows, rowCount }}
 */
export async function parseExcelFile(file) {
  if (!file) throw new Error('No file provided');

  const validExts = ['.xlsx', '.xls', '.csv'];
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!validExts.includes(ext)) {
    throw new Error('Unsupported file type. Please upload .xlsx, .xls, or .csv');
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The file contains no sheets');

  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('The spreadsheet appears to be empty or has no data rows');
  }

  const headers = Object.keys(rawData[0]);
  // Ensure all values are strings for uniform handling
  const rows = rawData.map(row => {
    const clean = {};
    for (const key of headers) {
      clean[key] = row[key] !== undefined && row[key] !== null ? String(row[key]).trim() : '';
    }
    return clean;
  });

  return { fileName: file.name, headers, rows, rowCount: rows.length };
}
