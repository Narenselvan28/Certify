// Filename sanitization utilities

/** Remove characters illegal in filenames across platforms */
export function sanitizeFilename(name) {
  if (!name) return 'Participant';
  return name.trim()
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/** Build a certificate PDF filename */
export function buildCertFilename(index, participantName) {
  return `Certificate_${String(index + 1).padStart(3, '0')}_${sanitizeFilename(participantName)}.pdf`;
}
