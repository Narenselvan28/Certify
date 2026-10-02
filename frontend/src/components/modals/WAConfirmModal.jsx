import { useState } from 'react';
import { normalizePhone } from '../../utils/phone.js';
import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';
import { getParticipantPhone } from '../../services/whatsappApi.js';
import { API_BASE_URL_DEFAULT } from '../../constants/config.js';

function classifyParticipants(rows, fields, mappings, phoneColumn) {
  let valid = 0, missing = 0, invalid = 0;
  rows.forEach(row => {
    const raw = getParticipantPhone(row, fields, mappings, phoneColumn);
    if (!raw || !String(raw).trim()) { missing++; return; }
    if (normalizePhone(raw)) valid++;
    else invalid++;
  });
  return { valid, missing, invalid };
}

export function WAConfirmModal({ isOpen, rows, fields, mappings, phoneColumn, apiBaseUrl, onApiUrlChange, onCancel, onStart }) {
  const { valid, missing, invalid } = classifyParticipants(rows, fields, mappings, phoneColumn);
  const willSend = valid;
  const willSkip = missing + invalid;

  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Send certificates via WhatsApp?</ModalHeader>
      <ModalBody>
        <div className="bg-bg border border-border rounded-[6px] p-3 space-y-1.5 text-xs mb-4">
          <Row label="Total" value={rows.length} />
          <Row label="Valid numbers" value={valid} color="text-success" />
          <Row label="Missing phone" value={missing} />
          <Row label="Invalid phone" value={invalid} color="text-error" />
        </div>

        <div className="mb-2">
          <label className="block text-[11px] text-muted mb-1">Backend URL</label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={e => onApiUrlChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-border rounded-[4px] focus:outline-none focus:border-accent font-mono text-primary"
            placeholder={API_BASE_URL_DEFAULT}
          />
        </div>

        {willSkip > 0 && (
          <p className="text-[11px] text-muted">
            {willSkip} participant{willSkip !== 1 ? 's' : ''} without valid numbers will be skipped.
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={onStart} variant="green" disabled={willSend === 0}>
          Start Sending
        </BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}

function Row({ label, value, color = 'text-muted' }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
