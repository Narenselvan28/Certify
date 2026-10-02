import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function RestartModal({ isOpen, onCancel, onConfirm }) {
  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Start over?</ModalHeader>
      <ModalBody>
        <p className="text-xs text-muted">
          This will clear the current template, all fields, and participant data. This action cannot be undone.
        </p>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={onConfirm} variant="red">Restart</BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
