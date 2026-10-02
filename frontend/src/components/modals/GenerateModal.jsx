import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function GenerateModal({ isOpen, rowCount, onCancel, onConfirm }) {
  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Generate {rowCount} certificates?</ModalHeader>
      <ModalBody>
        <p className="text-xs text-muted">
          Certify will render a certificate for each of the <strong>{rowCount}</strong> participants. You can
          preview and export them on the next screen.
        </p>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={onConfirm}>Generate</BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
