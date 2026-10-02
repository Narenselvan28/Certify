import { useState, useEffect } from 'react';
import { Modal, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function MappingModal({
  isOpen,
  fields,
  headers,
  mappings,
  emailColumn,
  onConfirm,
  onCancel,
}) {
  const [localMappings, setLocalMappings] = useState(mappings || {});
  const [localEmail, setLocalEmail] = useState(emailColumn || '');

  useEffect(() => {
    if (isOpen) {
      setLocalMappings(mappings || {});
      setLocalEmail(emailColumn || '');
    }
  }, [isOpen, mappings, emailColumn]);

  const handleChange = (fieldId, value) => {
    setLocalMappings(prev => {
      const next = { ...prev };
      if (value) next[fieldId] = value;
      else delete next[fieldId];
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(localMappings, null, localEmail || null);
  };

  return (
    <Modal isOpen={isOpen}>
      <div className="px-6 pt-6">
        <h3 className="text-sm font-semibold text-primary">Map Excel Columns</h3>
        <p className="text-xs text-muted mt-1">
          Match each certificate field and delivery recipient email to the correct Excel column.
        </p>
      </div>

      <ModalBody>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {/* Certificate Visual Fields */}
          {fields.map(field => (
            <div key={field.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-primary">{field.label}</div>
                <div className="text-[11px] text-muted">{field.placeholder}</div>
              </div>
              <select
                value={localMappings[field.id] || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                className="px-2.5 py-1 text-xs border border-border rounded-[4px] focus:outline-none focus:border-accent bg-white text-primary min-w-[150px]"
              >
                <option value="">-- None / Skip --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}

          {/* Email delivery column */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="min-w-0">
              <div className="text-xs font-medium text-primary flex items-center space-x-1.5">
                <span>Recipient Email</span>
                <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded font-medium">Required for delivery</span>
              </div>
              <div className="text-[11px] text-muted">Used for sending certificate via Brevo</div>
            </div>
            <select
              value={localEmail}
              onChange={e => setLocalEmail(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border rounded-[4px] focus:outline-none focus:border-accent bg-white text-primary min-w-[150px]"
            >
              <option value="">-- None / Skip --</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          {!localEmail && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800">
              <strong>Notice:</strong> No email column detected. Please map an email column before continuing if you plan to send certificates via email.
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={handleConfirm}>Confirm Mapping</BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
