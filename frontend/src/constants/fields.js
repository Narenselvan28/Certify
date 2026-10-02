// Default field template definitions.
// Coordinates (x, y, width, height) are normalized: 0.0–1.0 relative to template.

export const FIELD_TEMPLATES = {
  name: {
    type: 'name',
    label: 'Participant Name',
    placeholder: '{{NAME}}',
    width: 0.50, height: 0.08,
    fontSizePx: 38, fontWeight: 'bold', fontFamily: 'Poppins',
    align: 'center', autoFit: true,
  },
  reg_no: {
    type: 'reg_no',
    label: 'Registration Number',
    placeholder: '{{REG_NO}}',
    width: 0.32, height: 0.05,
    fontSizePx: 22, fontWeight: 'normal', fontFamily: 'Inter',
    align: 'center', autoFit: false,
  },
  department: {
    type: 'department',
    label: 'Department',
    placeholder: '{{DEPARTMENT}}',
    width: 0.45, height: 0.06,
    fontSizePx: 22, fontWeight: 'normal', fontFamily: 'Inter',
    align: 'center', autoFit: true,
  },
  sno: {
    type: 'sno',
    label: 'S.No',
    placeholder: '{{S_NO}}',
    width: 0.15, height: 0.04,
    fontSizePx: 16, fontWeight: 'normal', fontFamily: 'Inter',
    align: 'left', autoFit: false,
  },
  event_name: {
    type: 'event_name',
    label: 'Event Name',
    placeholder: '{{EVENT_NAME}}',
    width: 0.55, height: 0.07,
    fontSizePx: 26, fontWeight: '600', fontFamily: 'Montserrat',
    align: 'center', autoFit: true,
  },
  date: {
    type: 'date',
    label: 'Date',
    placeholder: '{{DATE}}',
    width: 0.25, height: 0.04,
    fontSizePx: 18, fontWeight: 'normal', fontFamily: 'Inter',
    align: 'center', autoFit: false,
  },
  signature: {
    type: 'signature',
    label: 'Digital Signature',
    placeholder: '[ Signature ]',
    width: 0.18, height: 0.08,
    signatureId: null,
    imageSrc: null,
    designation: '',
    fontSizePx: 14, fontWeight: 'normal', fontFamily: 'Inter',
    align: 'center', autoFit: false,
  },
  custom: {
    type: 'custom',
    label: 'Custom Field',
    placeholder: '{{CUSTOM}}',
    width: 0.30, height: 0.05,
    fontSizePx: 20, fontWeight: 'normal', fontFamily: 'Inter',
    align: 'center', autoFit: false,
  },
};

/** All addable field types shown in the bottom panel */
export const FIELD_TYPES = [
  { type: 'name',       label: '+ Name' },
  { type: 'reg_no',     label: '+ Reg No' },
  { type: 'department', label: '+ Dept' },
  { type: 'sno',        label: '+ S.No' },
  { type: 'event_name', label: '+ Event Name' },
  { type: 'date',       label: '+ Date' },
  { type: 'signature',  label: '+ Signature', icon: 'signature' },
  { type: 'custom',     label: '+ Custom', dashed: true },
];

/** Create a new field object from a type string */
export function createField(type, existingCount, counter, extra = {}) {
  const tmpl = FIELD_TEMPLATES[type] || FIELD_TEMPLATES.custom;
  const id = `field_${counter}`;
  const initialX = Math.max(0.1, 0.5 - tmpl.width / 2);
  const initialY = Math.min(0.8, 0.35 + existingCount * 0.08);

  return {
    id,
    type,
    label: type === 'custom' ? `Custom ${counter}` : (extra.label || tmpl.label),
    placeholder: tmpl.placeholder,
    x: Number(initialX.toFixed(4)),
    y: Number(initialY.toFixed(4)),
    width: extra.width || tmpl.width,
    height: extra.height || tmpl.height,
    rotation: 0,
    fontSizePx: tmpl.fontSizePx,
    fontWeight: tmpl.fontWeight,
    fontStyle: 'normal',
    fontFamily: tmpl.fontFamily,
    color: '#171717',
    align: tmpl.align,
    letterSpacing: 0,
    lineHeight: 1.2,
    autoFit: tmpl.autoFit,
    signatureId: extra.signatureId || tmpl.signatureId || null,
    imageSrc: extra.imageSrc || tmpl.imageSrc || null,
    designation: extra.designation || tmpl.designation || '',
  };
}
