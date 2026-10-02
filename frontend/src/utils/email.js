// Email validation utilities for client-side preflight

export const EMAIL_ALIASES = [
  'email', 'email address', 'e-mail', 'mail', 'student email', 'contact email',
  'participant email', 'email_id', 'email id', 'e_mail', 'mail_id',
];

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function normalizeEmail(raw) {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str || str.length > 254) return null;
  if (!EMAIL_REGEX.test(str)) return null;

  const parts = str.split('@');
  if (parts.length !== 2) return null;
  return `${parts[0]}@${parts[1].toLowerCase().trim()}`;
}
