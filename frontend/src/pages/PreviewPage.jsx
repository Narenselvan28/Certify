import { useState, useMemo } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';

import { PreviewNavbar } from '../components/preview/PreviewNavbar.jsx';
import { SinglePreview } from '../components/preview/SinglePreview.jsx';
import { GridPreview } from '../components/preview/GridPreview.jsx';
import { IndividualCertificateEditor } from '../components/review/IndividualCertificateEditor.jsx';
import { SendOneModal } from '../components/modals/SendOneModal.jsx';

import { ExportModal } from '../components/modals/ExportModal.jsx';
import { ProgressModal } from '../components/modals/ProgressModal.jsx';

import { exportZip } from '../services/zipExporter.js';
import { exportCombinedPDF, getParticipantName, getParticipantRegNo, generateSinglePDF } from '../../src/services/pdfExporter.js';
import { getParticipantEmail } from '../services/deliveryService.js';

export function PreviewPage({ onShowToast }) {
  const { state, dispatch } = useAppContext();

  const rows = state.excel?.rows || [];
  const total = rows.length;
  const mode = state.preview?.mode || 'grid';
  const currentIndex = Math.max(0, Math.min(total - 1, state.preview?.currentIndex || 0));

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'edited'

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [sendingIndex, setSendingIndex] = useState(null);

  // Export progress
  const [exportProgress, setExportProgress] = useState({
    isOpen: false,
    current: 0,
    total: 0,
    statusText: '',
  });

  const templateImg = state.templateImage;
  const overrides = state.individualOverrides || {};
  const editedCount = Object.keys(overrides).length;

  const handleModeChange = (newMode) => {
    dispatch({ type: A.SET_PREVIEW, preview: { mode: newMode } });
  };

  const handleNavigate = (newIndex) => {
    dispatch({ type: A.SET_PREVIEW, preview: { currentIndex: newIndex } });
  };

  const handleSelectFromGrid = (index) => {
    dispatch({ type: A.SET_PREVIEW, preview: { mode: 'single', currentIndex: index } });
  };

  const handleBackToParticipants = () => {
    dispatch({ type: A.SET_PAGE, page: 'participants' });
  };

  // ── Override Handlers ───────────────────────────────────────────────────────

  const handleSaveOverride = (index, override) => {
    dispatch({ type: A.SET_INDIVIDUAL_OVERRIDE, index, override });
  };

  const handleResetOverride = (index) => {
    dispatch({ type: A.RESET_INDIVIDUAL_OVERRIDE, index });
  };

  // ── Single Certificate Actions ──────────────────────────────────────────────

  const handleDownloadSinglePdf = async (index) => {
    if (!templateImg || !rows[index]) return;
    try {
      const { filename, blob } = await generateSinglePDF(
        rows[index],
        index,
        templateImg,
        state.fields,
        state.mappings,
        overrides[index] || null
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onShowToast?.(`Downloaded ${filename}`, 'success');
    } catch (err) {
      onShowToast?.(`PDF download failed: ${err.message}`, 'error');
    }
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
        },
        overrides
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
        },
        overrides
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

  // Filtered rows for grid display
  const displayedRows = useMemo(() => {
    return rows
      .map((r, i) => ({ raw: r, index: i }))
      .filter(({ raw, index }) => {
        if (filter === 'edited' && !overrides[index]) return false;

        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const effective = overrides[index]?.data ? { ...raw, ...overrides[index].data } : raw;
        const name = overrides[index]?.data?.name || getParticipantName(effective, state.fields, state.mappings);
        const regNo = overrides[index]?.data?.reg_no || getParticipantRegNo(effective, state.fields, state.mappings);
        const email = getParticipantEmail(effective, state.fields, state.mappings, state.emailColumn);

        return (
          name.toLowerCase().includes(q) ||
          regNo.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q)
        );
      });
  }, [rows, overrides, filter, search, state.fields, state.mappings, state.emailColumn]);

  // ── If Individual Editor is open, render it full view ───────────────────────
  if (editingIndex !== null && rows[editingIndex]) {
    return (
      <IndividualCertificateEditor
        participantIndex={editingIndex}
        total={total}
        row={rows[editingIndex]}
        templateImg={templateImg}
        fields={state.fields}
        mappings={state.mappings}
        existingOverride={overrides[editingIndex] || null}
        onSaveOverride={handleSaveOverride}
        onResetOverride={handleResetOverride}
        onBack={() => setEditingIndex(null)}
        onSendEmail={(idx) => {
          setSendingIndex(idx);
        }}
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg">
      {/* Top Navbar */}
      <PreviewNavbar
        count={total}
        editedCount={editedCount}
        mode={mode}
        onModeChange={handleModeChange}
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onBack={handleBackToParticipants}
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
            overrides={overrides}
            onNavigate={handleNavigate}
            onEditParticipant={(idx) => setEditingIndex(idx)}
            onSendEmail={(idx) => setSendingIndex(idx)}
            onShowToast={onShowToast}
          />
        ) : (
          <GridPreview
            rows={displayedRows.map(d => d.raw)}
            templateImg={templateImg}
            fields={state.fields}
            mappings={state.mappings}
            emailColumn={state.emailColumn}
            overrides={Object.fromEntries(displayedRows.map(d => [d.index, overrides[d.index]]))}
            onSelectParticipant={(idx) => {
              const actualIdx = displayedRows[idx]?.index ?? idx;
              handleSelectFromGrid(actualIdx);
            }}
            onEditParticipant={(idx) => {
              const actualIdx = displayedRows[idx]?.index ?? idx;
              setEditingIndex(actualIdx);
            }}
            onDownloadSingle={(idx) => {
              const actualIdx = displayedRows[idx]?.index ?? idx;
              handleDownloadSinglePdf(actualIdx);
            }}
            onSendEmailSingle={(idx) => {
              const actualIdx = displayedRows[idx]?.index ?? idx;
              setSendingIndex(actualIdx);
            }}
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

      {/* Individual Email Modal */}
      {sendingIndex !== null && rows[sendingIndex] && (
        <SendOneModal
          isOpen={true}
          onClose={() => setSendingIndex(null)}
          participantIndex={sendingIndex}
          row={rows[sendingIndex]}
          templateImg={templateImg}
          fields={state.fields}
          mappings={state.mappings}
          emailColumn={state.emailColumn}
          override={overrides[sendingIndex] || null}
          apiBaseUrl={state.delivery?.apiBaseUrl || 'http://localhost:8000'}
          onSuccess={() => {
            onShowToast?.(`Certificate emailed to ${getParticipantName(rows[sendingIndex], state.fields, state.mappings)}`, 'success');
          }}
        />
      )}
    </div>
  );
}
