// Phone number utilities — normalization and display formatting

/** Normalize a raw phone string to digits-only E.164 (without +) or return null */
export function normalizePhone(rawPhone) {
  if (rawPhone === undefined || rawPhone === null) return null;
  let str = String(rawPhone).trim();
  if (!str) return null;

  // Strip Excel floating-point .0 suffix
  str = str.replace(/\.0+$/, '');

  const digits = str.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10)                                   return '91' + digits;           // Indian mobile
  if (digits.length === 11 && digits.startsWith('0'))         return '91' + digits.substring(1); // 0-prefixed
  if (digits.length === 12 && digits.startsWith('91'))        return digits;                 // already E.164 Indian
  if (digits.length >= 10 && digits.length <= 15)             return digits;                 // international E.164

  return null; // uninterpretable
}

/** Format a normalized phone for display (e.g. "+91 98765 43210") */
export function formatPhoneDisplay(normalized) {
  if (!normalized) return '';
  if (normalized.startsWith('91') && normalized.length === 12) {
    return `+91 ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
  }
  return `+${normalized}`;
}

/** Phone column header aliases for auto-detection */
export const PHONE_ALIASES = [
  'phone', 'phone number', 'mobile', 'mobile number', 'contact',
  'contact number', 'whatsapp', 'whatsapp number', 'phone_number',
  'mobile_number', 'contact_no', 'mobile_no', 'phone no', 'mobile no',
];
