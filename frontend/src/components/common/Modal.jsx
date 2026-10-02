// Generic Modal wrapper

export function Modal({ isOpen, children, onBackdropClick }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onBackdropClick}
    >
      <div
        className="bg-white rounded-[8px] border border-border w-full max-w-sm"
        style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.10)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children }) {
  return <div className="px-6 pt-6 pb-0"><h3 className="text-sm font-semibold text-primary">{children}</h3></div>;
}

export function ModalBody({ children }) {
  return <div className="px-6 py-4">{children}</div>;
}

export function ModalFooter({ children }) {
  return <div className="px-6 pb-6 flex items-center justify-end gap-2">{children}</div>;
}

export function BtnSecondary({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3.5 py-1.5 text-xs font-medium text-primary bg-white border border-border rounded-[6px] hover:bg-bg transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BtnPrimary({ children, onClick, disabled, variant = 'indigo' }) {
  const colors = {
    indigo: 'bg-accent hover:bg-accent-hover text-white',
    green:  'bg-success hover:bg-green-700 text-white',
    red:    'bg-error hover:bg-red-700 text-white',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-1.5 text-xs font-medium rounded-[6px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors[variant]}`}
    >
      {children}
    </button>
  );
}
