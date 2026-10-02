import { useEffect, useState } from 'react';
import { AppProvider, useAppContext, A } from './context/AppContext.jsx';
import { useSession } from './hooks/useSession.js';
import { useToast } from './hooks/useToast.js';
import { loadImage } from './services/storage.js';

import { UploadPage } from './pages/UploadPage.jsx';
import { EditorPage } from './pages/EditorPage.jsx';
import { PreviewPage } from './pages/PreviewPage.jsx';
import { TemplateRecoveryModal } from './components/modals/TemplateRecoveryModal.jsx';
import { ToastContainer } from './components/common/Toast.jsx';

function MainRouter() {
  const { state, dispatch, clearHistory } = useAppContext();
  const { restore, wipeSession } = useSession();
  const { toasts, showToast, dismissToast } = useToast();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Restore persistent session on mount
  useEffect(() => {
    restore().finally(() => {
      setHasInitialized(true);
    });
  }, [restore]);

  const handleRecoveryTemplateSelect = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        const img = await loadImage(dataUrl);
        dispatch({
          type: A.SET_TEMPLATE,
          template: {
            ...state.template,
            src: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            aspectRatio: Number((img.naturalWidth / img.naturalHeight).toFixed(4)),
          },
          image: img,
        });
        dispatch({ type: A.SET_PAGE, page: 'editor' });
        showToast('Template restored successfully', 'success');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast(`Failed to restore template: ${err.message}`, 'error');
    }
  };

  const handleRecoveryReset = async () => {
    await wipeSession();
    clearHistory();
    dispatch({ type: A.RESET });
    showToast('Session reset', 'info');
  };

  if (!hasInitialized) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-bg text-muted text-xs">
        Loading session...
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen flex flex-col bg-bg text-primary font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {state.page === 'upload' && <UploadPage onShowToast={showToast} />}
      {state.page === 'editor' && <EditorPage onShowToast={showToast} />}
      {state.page === 'preview' && <PreviewPage onShowToast={showToast} />}

      {/* Template Image Recovery Modal */}
      <TemplateRecoveryModal
        isOpen={state.page === 'recovery'}
        onSelectTemplate={handleRecoveryTemplateSelect}
        onReset={handleRecoveryReset}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
