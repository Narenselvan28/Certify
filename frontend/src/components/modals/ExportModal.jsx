import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary, BtnPrimary } from '../common/Modal.jsx';

export function ExportModal({ isOpen, rowCount, onCancel, onExportZip, onExportCombined }) {
  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>Export {rowCount} certificates</ModalHeader>
      <ModalBody>
        <div className="space-y-2">
          <button
            onClick={onExportZip}
            className="w-full flex items-start gap-3 p-3 border border-border rounded-[6px] hover:bg-bg transition-colors text-left"
          >
            <div className="mt-0.5 text-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-primary">ZIP Archive — Individual PDFs</div>
              <div className="text-[11px] text-muted">One PDF per participant, bundled in a ZIP file</div>
            </div>
          </button>
          <button
            onClick={onExportCombined}
            className="w-full flex items-start gap-3 p-3 border border-border rounded-[6px] hover:bg-bg transition-colors text-left"
          >
            <div className="mt-0.5 text-muted">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-primary">Combined PDF — All in One</div>
              <div className="text-[11px] text-muted">Single multi-page PDF with all certificates</div>
            </div>
          </button>
        </div>
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
      </ModalFooter>
    </Modal>
  );
}
