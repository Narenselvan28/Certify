// Email validation and aliases for client-side preflight and column auto-mapping

export const EMAIL_ALIASES = [
  'email',
  'email address',
  'e-mail',
  'e-mail address',
  'e mail',
  'mail',
  'mail id',
  'mail_id',
  'email_id',
  'email id',
  'student email',
  'contact email',
  'participant email',
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
