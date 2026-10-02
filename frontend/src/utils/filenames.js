// Filename sanitization utilities

/** Remove characters illegal in filenames across platforms */
export function sanitizeFilename(name) {
  if (!name) return 'Participant';
  return name.trim()
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/** Build a certificate PDF filename according to SPECTRA format */
export function buildCertFilename(index, participantName, regNo = null) {
  const cleanName = sanitizeFilename(participantName);
  if (regNo && String(regNo).trim()) {
    const cleanReg = sanitizeFilename(String(regNo));
    return `${cleanName}_${cleanReg}_Certificate.pdf`;
  }
  return `${cleanName}_Certificate.pdf`;
}
