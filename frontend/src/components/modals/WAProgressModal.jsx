import { Modal, ModalHeader, ModalBody } from '../common/Modal.jsx';

export function WAProgressModal({ isOpen, current, total, statusText, sent, failed, skipped }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Sending via WhatsApp</ModalHeader>
      <ModalBody>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted truncate flex-1 mr-2">{statusText || 'Preparing…'}</span>
          <span className="text-xs font-mono text-muted">{current} / {total}</span>
        </div>
        <div className="w-full bg-border rounded-full h-1.5 mb-3 overflow-hidden">
          <div className="bg-success h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-success">✓ {sent} sent</span>
          <span className="text-error">✕ {failed} failed</span>
          <span className="text-muted">— {skipped} skipped</span>
        </div>
      </ModalBody>
    </Modal>
  );
}
