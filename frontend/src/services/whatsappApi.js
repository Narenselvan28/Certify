// WhatsApp delivery API client
// NEVER put WHATSAPP_ACCESS_TOKEN here — it lives only in the backend .env

import { generateSinglePDF, getParticipantName } from './pdfExporter.js';
import { normalizePhone } from '../utils/phone.js';
import { buildCertFilename } from '../utils/filenames.js';

/**
 * Check if the backend is reachable.
 * @returns {boolean}
 */
export async function checkBackendHealth(apiBaseUrl) {
  try {
    const resp = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Get the event name from a row / field list.
 */
export function getEventName(row, fields, mappings) {
  const ef = fields.find(f => f.type === 'event_name');
  if (ef) {
    if (mappings[ef.id] && row && row[mappings[ef.id]]) {
      return String(row[mappings[ef.id]]).trim();
    }
    if (ef.placeholder && ef.placeholder !== '{{EVENT_NAME}}') return ef.placeholder;
  }
  if (row) {
    for (const k of Object.keys(row)) {
      if (/event|activity|workshop|programme/i.test(k) && row[k]) return String(row[k]).trim();
    }
  }
  return 'your event';
}

/**
 * Get phone from a row using field mappings, phone column, or key scan.
 */
export function getParticipantPhone(row, fields, mappings, phoneColumn) {
  if (!row) return '';
  const phoneField = fields.find(f => f.type === 'phone');
  if (phoneField && mappings[phoneField.id]) {
    const v = row[mappings[phoneField.id]];
    if (v !== undefined && String(v).trim()) return String(v).trim();
  }
  if (phoneColumn && row[phoneColumn] !== undefined) {
    const v = row[phoneColumn];
    if (String(v).trim()) return String(v).trim();
  }
  // Fallback: scan row keys for phone-like names
  for (const key of Object.keys(row)) {
    const clean = key.toLowerCase().trim().replace(/[_\-\.]/g, ' ');
    if (['phone', 'mobile', 'contact', 'whatsapp'].some(a => clean.includes(a))) {
      if (row[key] && String(row[key]).trim()) return String(row[key]).trim();
    }
  }
  return '';
}

/**
 * Send one certificate to the backend.
 * @returns {{ status: 'sent'|'failed'|'skipped', name, phone, error? }}
 */
export async function sendOneCertificate(apiBaseUrl, row, index, templateImg, fields, mappings, phoneColumn) {
  const name  = getParticipantName(row, fields, mappings);
  const rawPh = getParticipantPhone(row, fields, mappings, phoneColumn);
  const phone = normalizePhone(rawPh);
  const event = getEventName(row, fields, mappings);

  if (!phone) return { status: 'skipped', name, phone: rawPh };

  // Generate PDF in memory
  let pdfBlob, pdfFilename;
  try {
    const result = await generateSinglePDF(row, index, templateImg, fields, mappings);
    pdfBlob = result.blob;
    pdfFilename = result.filename;
  } catch (err) {
    return { status: 'failed', name, phone, error: `PDF failed: ${err.message}` };
  }

  // Encode to base64
  let b64;
  try {
    const buf = await pdfBlob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    b64 = btoa(bin);
  } catch (err) {
    return { status: 'failed', name, phone, error: `Encode failed: ${err.message}` };
  }

  // POST to backend
  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name, phone, event_name: event, certificate: { filename: pdfFilename, base64: b64 } }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      return { status: 'failed', name, phone, error: `HTTP ${res.status}: ${txt}` };
    }

    const data = await res.json();
    return data.success
      ? { status: 'sent',   name, phone }
      : { status: 'failed', name, phone, error: data.error || 'Backend error' };

  } catch (err) {
    const msg = err.name === 'AbortError'
      ? 'Timeout (60s)'
      : `Cannot reach ${apiBaseUrl}`;
    return { status: 'failed', name, phone, error: msg };
  }
}
