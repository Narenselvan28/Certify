import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function RestartModal({ isOpen, onCancel, onConfirm }) {
  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Start a new certificate project?</ModalHeader>
      <ModalBody>
        <p className="text-xs text-muted mb-2">
          This will clear the current template, participants, column mappings, and individual certificate overrides.
        </p>
        <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
          ✓ Your saved signatures in the Digital Signature Library will <strong>not</strong> be deleted.
        </p>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={onConfirm} variant="red">Start Over</BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
