import { useState } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import { useDelivery } from '../hooks/useDelivery.js';
import { exportZip } from '../services/zipExporter.js';

import { DeliveryMethodSelector } from '../components/delivery/DeliveryMethodSelector.jsx';
import { DeliveryPreflight } from '../components/delivery/DeliveryPreflight.jsx';
import { DeliveryProgress } from '../components/delivery/DeliveryProgress.jsx';
import { DeliveryResults } from '../components/delivery/DeliveryResults.jsx';
import { ProgressModal } from '../components/modals/ProgressModal.jsx';

export function DeliveryCenter({ onShowToast }) {
  const { state, dispatch } = useAppContext();

  const rows = state.excel?.rows || [];
  const templateImg = state.templateImage;
  const fields = state.fields;
  const mappings = state.mappings;
  const emailColumn = state.emailColumn;
  const apiBaseUrl = state.delivery?.apiBaseUrl || 'http://localhost:8001';

  const [zipProgress, setZipProgress] = useState({
    isOpen: false,
    current: 0,
    total: 0,
    statusText: '',
  });

  const {
    step,
    setStep,
    brevoStatus,
    handleSendTestEmail,
    isTestingEmail,
    isValidating,
    validationResult,
    runPreflightValidation,
    startBulkDelivery,
    status,
    results,
    isRetrying,
    handleRetryFailed,
    handleDownloadReport,
  } = useDelivery({
    rows,
    templateImg,
    fields,
    mappings,
    emailColumn,
    overrides: state.individualOverrides || {},
    apiBaseUrl,
    onShowToast,
  });

  const handleBackToPreview = () => {
    dispatch({ type: A.SET_PAGE, page: 'preview' });
  };

  const handleDownloadZipFallback = async () => {
    if (!templateImg || rows.length === 0) return;
    setZipProgress({
      isOpen: true,
      current: 0,
      total: rows.length,
      statusText: 'Generating ZIP archive...',
    });

    try {
      await exportZip(rows, templateImg, fields, mappings, (current, total, statusText) => {
        setZipProgress({ isOpen: true, current, total, statusText });
      }, state.individualOverrides || {});
      onShowToast?.('All certificates downloaded as ZIP', 'success');
    } catch (err) {
      onShowToast?.(`ZIP export failed: ${err.message}`, 'error');
    } finally {
      setTimeout(() => setZipProgress(p => ({ ...p, isOpen: false })), 600);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg text-primary">
      {/* Top Header */}
      <header className="h-[52px] border-b border-border bg-surface px-5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-2.5">
          <span className="font-bold text-sm tracking-tight text-primary">SPECTRA</span>
          <button
            type="button"
            onClick={handleBackToPreview}
            className="flex items-center space-x-1 text-xs text-muted hover:text-primary px-2.5 py-1 rounded-lg border border-border/80 hover:bg-bg transition-colors"
          >
            <span>←</span>
            <span>Back to Review</span>
          </button>
          <div className="h-3.5 w-px bg-border"></div>
          <span className="text-sm font-semibold text-primary">Email Delivery</span>
        </div>

        {/* Stepper Pills */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-muted">
          <span className={`px-2 py-0.5 rounded ${step === 'ready' ? 'bg-accent text-white font-medium' : 'bg-surface border border-border'}`}>
            1. Setup
          </span>
          <span>→</span>
          <span className={`px-2 py-0.5 rounded ${step === 'preflight' ? 'bg-accent text-white font-medium' : 'bg-surface border border-border'}`}>
            2. Preflight
          </span>
          <span>→</span>
          <span className={`px-2 py-0.5 rounded ${step === 'progress' ? 'bg-accent text-white font-medium' : 'bg-surface border border-border'}`}>
            3. Sending
          </span>
          <span>→</span>
          <span className={`px-2 py-0.5 rounded ${step === 'results' ? 'bg-accent text-white font-medium' : 'bg-surface border border-border'}`}>
            4. Report
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDownloadZipFallback}
            className="px-3 py-1.5 text-xs font-medium text-primary bg-surface border border-border rounded-lg hover:bg-bg transition-colors"
          >
            Export ZIP
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {step === 'ready' && (
          <DeliveryMethodSelector
            rowCount={rows.length}
            brevoStatus={brevoStatus}
            onSendTestEmail={handleSendTestEmail}
            isTestingEmail={isTestingEmail}
            onValidate={runPreflightValidation}
            isValidating={isValidating}
            onDownloadZip={handleDownloadZipFallback}
          />
        )}

        {step === 'preflight' && (
          <DeliveryPreflight
            validationResult={validationResult}
            onBack={() => setStep('ready')}
            onStartDelivery={startBulkDelivery}
          />
        )}

        {step === 'progress' && (
          <DeliveryProgress status={status} />
        )}

        {step === 'results' && (
          <DeliveryResults
            results={results}
            onRetryFailed={handleRetryFailed}
            isRetrying={isRetrying}
            onDownloadReport={handleDownloadReport}
            onDownloadZip={handleDownloadZipFallback}
            onDone={handleBackToPreview}
          />
        )}
      </main>

      {/* ZIP Fallback Progress Modal */}
      <ProgressModal
        isOpen={zipProgress.isOpen}
        current={zipProgress.current}
        total={zipProgress.total}
        statusText={zipProgress.statusText}
      />
    </div>
  );
}
