// Column mapping fuzzy-matching utilities

import { PHONE_ALIASES } from './phone.js';

/** Fuzzy alias tables per field type */
const ALIASES = {
  name:       ['name', 'student name', 'participant name', 'full name', 'candidate name', 'member name', 'attendee name'],
  reg_no:     ['reg no', 'reg. no', 'reg no.', 'registration', 'registration no', 'registration number', 'roll no', 'roll number', 'enroll', 'enrollment', 'enrolment'],
  department: ['department', 'dept', 'dept.', 'branch', 'stream', 'programme', 'program', 'course', 'discipline'],
  sno:        ['s.no', 's no', 'sno', 'serial no', 'serial number', 'sl no', 'sl.no', 'index'],
  event_name: ['event', 'event name', 'activity', 'workshop', 'programme', 'program', 'competition'],
  date:       ['date', 'event date', 'date of event', 'programme date'],
  phone:      PHONE_ALIASES,
  custom:     [],
};

/** Normalize a header string for comparison */
function normalize(str) {
  return str.toLowerCase().trim().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Auto-map fields to Excel headers via fuzzy alias matching.
 * Returns { mappings: { fieldId: header }, confident: boolean }
 */
export function autoMapFields(fields, headers) {
  const mappings = {};
  let allConfident = true;

  fields.forEach(field => {
    const aliases = ALIASES[field.type] || [];
    if (aliases.length === 0) { allConfident = false; return; }

    const match = headers.find(h => aliases.includes(normalize(h)));
    if (match) {
      mappings[field.id] = match;
    } else {
      allConfident = false;
    }
  });

  return { mappings, confident: allConfident };
}

/**
 * Detect the phone column from available headers without requiring a placed phone field.
 */
export function detectPhoneColumn(headers) {
  return headers.find(h => PHONE_ALIASES.includes(normalize(h))) || null;
}

/**
 * Get the alias list for a given field type (for display in mapping modal).
 */
export function getAliases(type) {
  return ALIASES[type] || [];
}
