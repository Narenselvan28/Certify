// Toast notification display component

export function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  const styles = {
    info:    'bg-[#171717] text-white',
    success: 'bg-green-600 text-white',
    error:   'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`px-4 py-2.5 rounded-[6px] text-xs font-medium shadow-lg pointer-events-auto cursor-pointer
            flex items-center gap-2 max-w-xs animate-fade-in
            ${styles[t.type] || styles.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
