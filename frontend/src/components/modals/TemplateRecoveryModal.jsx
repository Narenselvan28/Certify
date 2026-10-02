import { useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function TemplateRecoveryModal({ isOpen, onSelectTemplate, onReset }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onSelectTemplate) {
      onSelectTemplate(file);
    }
  };

  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Template Image Needed</ModalHeader>
      <ModalBody>
        <p className="text-sm text-muted mb-4">
          Your project session was recovered, but the certificate template image is no longer in browser cache.
          Please re-upload your template image to continue where you left off.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border-strong hover:border-accent rounded-lg p-6 text-center cursor-pointer transition-colors bg-bg/50"
        >
          <svg className="w-8 h-8 text-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-accent">Choose Template Image</span>
        </div>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onReset}>Discard Session &amp; Start Fresh</BtnSecondary>
        <BtnPrimary onClick={() => fileInputRef.current?.click()}>Browse File</BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
