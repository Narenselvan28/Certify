import { useState } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import { clearSession, clearTemplateAsset } from '../services/storage.js';

import { PreviewNavbar } from '../components/preview/PreviewNavbar.jsx';
import { SinglePreview } from '../components/preview/SinglePreview.jsx';
import { GridPreview } from '../components/preview/GridPreview.jsx';

import { ExportModal } from '../components/modals/ExportModal.jsx';
import { ProgressModal } from '../components/modals/ProgressModal.jsx';
import { RestartModal } from '../components/modals/RestartModal.jsx';

import { exportZip } from '../services/zipExporter.js';
import { exportCombinedPDF } from '../services/pdfExporter.js';

export function PreviewPage({ onShowToast }) {
  const { state, dispatch, clearHistory } = useAppContext();

  const rows = state.excel?.rows || [];
  const total = rows.length;
  const mode = state.preview?.mode || 'single';
  const currentIndex = Math.max(0, Math.min(total - 1, state.preview?.currentIndex || 0));

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRestartOpen, setIsRestartOpen] = useState(false);

  // Export progress
  const [exportProgress, setExportProgress] = useState({
    isOpen: false,
    current: 0,
    total: 0,
    statusText: '',
  });

  // Ensure template image element exists
  const templateImg = state.templateImage;

  const handleModeChange = (newMode) => {
    dispatch({ type: A.SET_PREVIEW, preview: { mode: newMode } });
  };

  const handleNavigate = (newIndex) => {
    dispatch({ type: A.SET_PREVIEW, preview: { currentIndex: newIndex } });
  };

  const handleSelectFromGrid = (index) => {
    dispatch({ type: A.SET_PREVIEW, preview: { mode: 'single', currentIndex: index } });
  };

  const handleBackToEditor = () => {
    dispatch({ type: A.SET_PAGE, page: 'editor' });
  };

  const handleConfirmRestart = async () => {
    clearSession();
    await clearTemplateAsset();
    clearHistory();
    dispatch({ type: A.RESET });
    setIsRestartOpen(false);
    onShowToast?.('Project reset', 'info');
  };

  // ── Bulk PDF Export Handlers ───────────────────────────────────────────────

  const handleExportZip = async () => {
    setIsExportOpen(false);
    if (!templateImg || rows.length === 0) return;

    setExportProgress({
      isOpen: true,
      current: 0,
      total: rows.length,
      statusText: 'Preparing individual certificates...',
    });

    try {
      await exportZip(
        rows,
        templateImg,
        state.fields,
        state.mappings,
        (current, total, statusText) => {
          setExportProgress({ isOpen: true, current, total, statusText });
        }
      );
      onShowToast?.('ZIP archive created and downloaded', 'success');
    } catch (err) {
      console.error('ZIP export error:', err);
      onShowToast?.(`Export failed: ${err.message}`, 'error');
    } finally {
      setTimeout(() => {
        setExportProgress(prev => ({ ...prev, isOpen: false }));
      }, 800);
    }
  };

  const handleExportCombined = async () => {
    setIsExportOpen(false);
    if (!templateImg || rows.length === 0) return;

    setExportProgress({
      isOpen: true,
      current: 0,
      total: rows.length,
      statusText: 'Rendering multi-page PDF...',
    });

    try {
      await exportCombinedPDF(
        rows,
        templateImg,
        state.fields,
        state.mappings,
        (current, total, name) => {
          setExportProgress({
            isOpen: true,
            current,
            total,
            statusText: `Page ${current} of ${total}: ${name}`,
          });
        }
      );
      onShowToast?.('Combined PDF created and downloaded', 'success');
    } catch (err) {
      console.error('Combined PDF export error:', err);
      onShowToast?.(`Export failed: ${err.message}`, 'error');
    } finally {
      setTimeout(() => {
        setExportProgress(prev => ({ ...prev, isOpen: false }));
      }, 800);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg">
      {/* Top Navbar */}
      <PreviewNavbar
        count={total}
        mode={mode}
        onModeChange={handleModeChange}
        onBack={handleBackToEditor}
        onRestart={() => setIsRestartOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDeliveryCenter={() => dispatch({ type: A.SET_PAGE, page: 'delivery' })}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-auto p-4 md:p-6 flex flex-col items-center justify-center relative">
        {mode === 'single' ? (
          <SinglePreview
            currentIndex={currentIndex}
            total={total}
            rows={rows}
            templateImg={templateImg}
            fields={state.fields}
            mappings={state.mappings}
            emailColumn={state.emailColumn}
            apiBaseUrl={state.delivery?.apiBaseUrl || 'http://localhost:8001'}
            onNavigate={handleNavigate}
            onShowToast={onShowToast}
          />
        ) : (
          <GridPreview
            rows={rows}
            templateImg={templateImg}
            fields={state.fields}
            mappings={state.mappings}
            emailColumn={state.emailColumn}
            onSelectParticipant={handleSelectFromGrid}
          />
        )}
      </main>

      {/* Export Options Modal (ZIP / Combined PDF) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExportZip={handleExportZip}
        onExportCombined={handleExportCombined}
      />

      {/* PDF Export Progress Modal */}
      <ProgressModal
        isOpen={exportProgress.isOpen}
        current={exportProgress.current}
        total={exportProgress.total}
        statusText={exportProgress.statusText}
      />

      {/* Confirm Restart Modal */}
      <RestartModal
        isOpen={isRestartOpen}
        onConfirm={handleConfirmRestart}
        onCancel={() => setIsRestartOpen(false)}
      />
    </div>
  );
}
