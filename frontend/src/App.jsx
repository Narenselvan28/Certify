import { useEffect, useState } from 'react';
import { AppProvider, useAppContext, A } from './context/AppContext.jsx';
import { useSession } from './hooks/useSession.js';
import { useToast } from './hooks/useToast.js';
import { loadImage } from './services/storage.js';

import { AppHeader } from './components/common/AppHeader.jsx';
import { UploadPage } from './pages/UploadPage.jsx';
import { EditorPage } from './pages/EditorPage.jsx';
import { ParticipantsStep } from './pages/ParticipantsStep.jsx';
import { PreviewPage } from './pages/PreviewPage.jsx';
import { DeliveryCenter } from './pages/DeliveryCenter.jsx';

import { TemplateRecoveryModal } from './components/modals/TemplateRecoveryModal.jsx';
import { RestartModal } from './components/modals/RestartModal.jsx';
import { SignatureManagerModal } from './components/signatures/SignatureManagerModal.jsx';
import { ToastContainer } from './components/common/Toast.jsx';

function MainRouter() {
  const { state, dispatch, clearHistory } = useAppContext();
  const { restore, wipeSession } = useSession();
  const { toasts, showToast, dismissToast } = useToast();
  const [hasInitialized, setHasInitialized] = useState(false);

  const [isRestartOpen, setIsRestartOpen] = useState(false);
  const [isGlobalSigOpen, setIsGlobalSigOpen] = useState(false);

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

  const handleConfirmRestart = async () => {
    await wipeSession();
    clearHistory();
    dispatch({ type: A.RESET });
    setIsRestartOpen(false);
    showToast('Project cleared. Saved signatures remain available.', 'info');
  };

  // Determine current active step for the header
  let currentStep = 'template';
  if (state.page === 'upload' || state.page === 'editor') currentStep = 'template';
  else if (state.page === 'participants') currentStep = 'participants';
  else if (state.page === 'preview') currentStep = 'review';
  else if (state.page === 'delivery') currentStep = 'deliver';

  const hasTemplate = Boolean(state.template?.width > 0);
  const hasParticipants = Boolean(state.excel?.rows?.length > 0);

  const handleNavigateStep = (targetStep) => {
    if (targetStep === 'template') {
      dispatch({ type: A.SET_PAGE, page: hasTemplate ? 'editor' : 'upload' });
    } else if (targetStep === 'participants') {
      dispatch({ type: A.SET_PAGE, page: 'participants' });
    } else if (targetStep === 'review') {
      dispatch({ type: A.SET_PAGE, page: 'preview' });
    } else if (targetStep === 'deliver') {
      dispatch({ type: A.SET_PAGE, page: 'delivery' });
    }
  };

  if (!hasInitialized) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-bg text-muted text-xs">
        Loading SPECTRA...
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen flex flex-col bg-bg text-primary font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Application Header (Visible on top-level views) */}
      {state.page !== 'editor' && (
        <AppHeader
          currentStep={currentStep}
          hasTemplate={hasTemplate}
          hasParticipants={hasParticipants}
          onNavigateStep={handleNavigateStep}
          onOpenSignatures={() => setIsGlobalSigOpen(true)}
          onStartOver={() => setIsRestartOpen(true)}
        />
      )}

      {/* Main Page Routing */}
      {state.page === 'upload' && <UploadPage onShowToast={showToast} />}
      {state.page === 'editor' && <EditorPage onShowToast={showToast} />}
      {state.page === 'participants' && <ParticipantsStep onShowToast={showToast} />}
      {state.page === 'preview' && <PreviewPage onShowToast={showToast} />}
      {state.page === 'delivery' && <DeliveryCenter onShowToast={showToast} />}

      {/* Template Image Recovery Modal */}
      <TemplateRecoveryModal
        isOpen={state.page === 'recovery'}
        onSelectTemplate={handleRecoveryTemplateSelect}
        onReset={handleRecoveryReset}
      />

      {/* Start Over Confirmation Modal */}
      <RestartModal
        isOpen={isRestartOpen}
        onCancel={() => setIsRestartOpen(false)}
        onConfirm={handleConfirmRestart}
      />

      {/* Global Digital Signature Manager Modal */}
      <SignatureManagerModal
        isOpen={isGlobalSigOpen}
        onClose={() => setIsGlobalSigOpen(false)}
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
