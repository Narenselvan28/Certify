import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function ProgressModal({ isOpen, current, total, statusText }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Exporting certificates…</ModalHeader>
      <ModalBody>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted truncate">{statusText || 'Processing…'}</span>
          <span className="text-xs font-mono text-muted ml-2">{current} / {total}</span>
        </div>
        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </ModalBody>
    </Modal>
  );
}
