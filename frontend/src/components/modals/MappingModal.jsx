import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function MappingModal({ isOpen, fields, headers, mappings, phoneColumn, onConfirm, onCancel }) {
  const [localMappings, setLocalMappings] = useState(mappings || {});
  const [localPhone, setLocalPhone] = useState(phoneColumn || '');

  useEffect(() => {
    if (isOpen) {
      setLocalMappings(mappings || {});
      setLocalPhone(phoneColumn || '');
    }
  }, [isOpen, mappings, phoneColumn]);

  const handleChange = (fieldId, value) => {
    setLocalMappings(prev => {
      const next = { ...prev };
      if (value) next[fieldId] = value;
      else delete next[fieldId];
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(localMappings, localPhone || null);
  };

  return (
    <Modal isOpen={isOpen}>
      <div className="px-6 pt-6">
        <h3 className="text-sm font-semibold text-primary">Map Excel Columns</h3>
        <p className="text-xs text-muted mt-1">Match each certificate field to the correct Excel column.</p>
      </div>
      <ModalBody>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {fields.map(field => (
            <div key={field.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-primary">{field.label}</div>
                <div className="text-[11px] text-muted">{field.placeholder}</div>
              </div>
              <select
                value={localMappings[field.id] || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                className="px-2.5 py-1 text-xs border border-border rounded-[4px] focus:outline-none focus:border-accent bg-white text-primary min-w-[140px]"
              >
                <option value="">-- None / Skip --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}

          {/* Phone column (always shown for WhatsApp delivery) */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="min-w-0">
              <div className="text-xs font-medium text-primary">WhatsApp Phone</div>
              <div className="text-[11px] text-muted">For WhatsApp delivery</div>
            </div>
            <select
              value={localPhone}
              onChange={e => setLocalPhone(e.target.value)}
              className="px-2.5 py-1 text-xs border border-border rounded-[4px] focus:outline-none focus:border-accent bg-white text-primary min-w-[140px]"
            >
              <option value="">-- None / Skip --</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={handleConfirm}>Confirm Mapping</BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
