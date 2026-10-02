/**
 * Certify Frontend — Brevo Email Delivery Service
 * Communicates with FastAPI Brevo Transactional Email delivery endpoints.
 */

import { EMAIL_ALIASES } from '../utils/email.js';

export function getParticipantEmail(row, fields, mappings, emailColumn) {
  if (!row) return '';
  const emailField = fields?.find(f => f.type === 'email');
  if (emailField && mappings && mappings[emailField.id]) {
    const v = row[mappings[emailField.id]];
    if (v !== undefined && String(v).trim()) return String(v).trim();
  }
  if (emailColumn && row[emailColumn] !== undefined) {
    const v = row[emailColumn];
    if (String(v).trim()) return String(v).trim();
  }
  // Fallback: scan row keys for email-like names
  for (const key of Object.keys(row)) {
    const clean = key.toLowerCase().trim().replace(/[_\-\.]/g, ' ');
    if (EMAIL_ALIASES.some(a => clean === a || clean.includes(a))) {
      if (row[key] && String(row[key]).trim()) return String(row[key]).trim();
    }
  }
  return '';
}

let cachedBackendUrl = null;

export async function getActiveBackendUrl(preferredUrl) {
  if (cachedBackendUrl) {
    try {
      const resp = await fetch(`${cachedBackendUrl}/health`, { signal: AbortSignal.timeout(1000) });
      if (resp.ok) return cachedBackendUrl;
    } catch (_) {
      cachedBackendUrl = null;
    }
  }

  const candidates = [
    preferredUrl,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8001',
    'http://127.0.0.1:8001',
  ].filter(Boolean);

  for (const raw of Array.from(new Set(candidates))) {
    const url = raw.replace(/\/$/, '');
    try {
      const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1200) });
      if (resp.ok) {
        cachedBackendUrl = url;
        return url;
      }
    } catch (_) {}
  }
  return preferredUrl ? preferredUrl.replace(/\/$/, '') : 'http://localhost:8000';
}

/** Check Brevo connection & configuration status */
export async function fetchEmailStatus(apiBaseUrl) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/email/status`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch Brevo status: HTTP ${resp.status}`);
  }
  return await resp.json();
}

/** Send single test email via Brevo */
export async function sendTestEmail(apiBaseUrl, recipientEmail, recipientName = 'Admin Tester') {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/email/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      recipient_email: recipientEmail,
      recipient_name: recipientName,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => resp.statusText);
    throw new Error(`Test email failed: HTTP ${resp.status} - ${txt}`);
  }
  return await resp.json();
}

/** Send a single certificate directly via Brevo */
export async function sendSingleCertificate(apiBaseUrl, {
  recipientEmail,
  recipientName,
  subject,
  body,
  eventName = 'SPECTRUM',
  pdfBase64,
  filename,
}) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/delivery/send-one`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject: subject || null,
      body: body || null,
      event_name: eventName,
      certificate: {
        filename,
        base64: pdfBase64,
      },
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => resp.statusText);
    throw new Error(`Failed to send certificate: HTTP ${resp.status} - ${txt}`);
  }
  return await resp.json();
}

/** Preflight validation request */
export async function validateDelivery(apiBaseUrl, participants) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/delivery/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ participants }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => resp.statusText);
    throw new Error(`Validation failed: HTTP ${resp.status} - ${txt}`);
  }
  return await resp.json();
}

/** Start a bulk delivery background queue */
export async function startDelivery(apiBaseUrl, participants) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/delivery/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ participants }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => resp.statusText);
    throw new Error(`Failed to start delivery: HTTP ${resp.status} - ${txt}`);
  }
  return await resp.json();
}

/** Poll real-time status of active delivery queue */
export async function getDeliveryStatus(apiBaseUrl, deliveryId) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/delivery/${deliveryId}/status`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch status: HTTP ${resp.status}`);
  }
  return await resp.json();
}

/** Get final breakdown and results */
export async function getDeliveryResults(apiBaseUrl, deliveryId) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/delivery/${deliveryId}/results`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch results: HTTP ${resp.status}`);
  }
  return await resp.json();
}

/** Retry temporary failed deliveries */
export async function retryFailedDelivery(apiBaseUrl, deliveryId) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/delivery/${deliveryId}/retry`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to retry: HTTP ${resp.status}`);
  }
  return await resp.json();
}

/** Download CSV delivery report */
export async function downloadDeliveryReport(apiBaseUrl, deliveryId) {
  const url = await getActiveBackendUrl(apiBaseUrl);
  const resp = await fetch(`${url}/api/delivery/${deliveryId}/report`);
  if (!resp.ok) {
    throw new Error(`Failed to download report: HTTP ${resp.status}`);
  }
  const blob = await resp.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `delivery_report_${deliveryId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
