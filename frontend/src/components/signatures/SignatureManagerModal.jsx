import React, { useState, useEffect, useRef } from 'react';
import { loadSignatures, saveSignature, deleteSignature } from '../../services/storage.js';

export function SignatureManagerModal({
  isOpen,
  onClose,
  onSelectSignature,
  initialMode = 'list',
}) {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(initialMode); // 'list' | 'add'

  // New signature state
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const reloadSignatures = async () => {
    setLoading(true);
    try {
      const list = await loadSignatures();
      setSignatures(list || []);
      if (!list || list.length === 0) {
        setMode('add');
      } else if (initialMode === 'list') {
        setMode('list');
      }
    } catch (err) {
      console.error('Failed to load signatures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadSignatures();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setDesignation('');
    setDataUrl('');
    setIsDragging(false);
  };

  const handleProcessFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file (transparent PNG recommended).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setDataUrl(e.target.result);
      if (!name) {
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!dataUrl) {
      alert('Please upload a signature image.');
      return;
    }
    if (!name.trim()) {
      alert('Please enter a name for the signature (e.g., Principal Signature).');
      return;
    }

    try {
      const newSig = await saveSignature({
        name: name.trim(),
        designation: designation.trim(),
        dataUrl,
      });
      await reloadSignatures();
      if (onSelectSignature) {
        onSelectSignature(newSig);
        onClose();
      } else {
        setMode('list');
        resetForm();
      }
    } catch (err) {
      console.error('Failed to save signature:', err);
      alert('Failed to save signature: ' + err.message);
    }
  };

  const handleDelete = async (id, sigName) => {
    if (window.confirm(`Delete signature "${sigName}" from your library?`)) {
      await deleteSignature(id);
      await reloadSignatures();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-surface rounded-xl border border-border shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-base font-semibold text-primary">Digital Signature Library</h2>
            <p className="text-xs text-muted mt-0.5">
              Saved signatures are stored securely in your browser and reusable across certificates.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-bg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {mode === 'list' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Saved Signatures ({signatures.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('add');
                  }}
                  className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors flex items-center space-x-1 shadow-sm"
                >
                  <span>+</span>
                  <span>Add Signature</span>
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-muted">Loading signatures...</div>
              ) : signatures.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-border rounded-xl">
                  <p className="text-xs text-muted mb-3">No saved signatures yet.</p>
                  <button
                    type="button"
                    onClick={() => setMode('add')}
                    className="px-3.5 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
                  >
                    + Add Your First Signature
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="border border-border rounded-xl p-3 bg-surface hover:border-accent/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow"
                    >
                      {/* Signature preview container with checkered transparent pattern */}
                      <div className="w-full h-24 rounded-lg bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] border border-border/60 flex items-center justify-center p-2 mb-2 overflow-hidden">
                        <img
                          src={sig.dataUrl}
                          alt={sig.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                        />
                      </div>

                      <div className="mb-2">
                        <h4 className="text-xs font-semibold text-primary truncate">{sig.name}</h4>
                        {sig.designation && (
                          <p className="text-[11px] text-muted truncate">{sig.designation}</p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 pt-2 border-t border-border/50">
                        {onSelectSignature && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSignature(sig);
                              onClose();
                            }}
                            className="flex-1 px-2.5 py-1 bg-accent text-white rounded-md text-xs font-medium hover:bg-accent-hover transition-colors text-center"
                          >
                            Use
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(sig.id, sig.name)}
                          className="px-2 py-1 text-xs text-error hover:bg-red-50 rounded-md transition-colors"
                          title="Delete signature"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Add New Signature Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Signature Image <span className="text-muted font-normal">(Transparent PNG preferred)</span>
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-accent bg-accent/5'
                      : dataUrl
                      ? 'border-border bg-surface'
                      : 'border-border hover:border-accent/60 bg-bg/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProcessFile(file);
                    }}
                  />
                  {dataUrl ? (
                    <div className="flex flex-col items-center">
                      <div className="w-full h-28 rounded-lg bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] border border-border flex items-center justify-center p-2 mb-2">
                        <img
                          src={dataUrl}
                          alt="Signature Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="text-xs text-accent font-medium hover:underline">
                        Click or drag to change image
                      </span>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-primary mb-0.5">
                        Upload Signature Image
                      </p>
                      <p className="text-[11px] text-muted">
                        Drop PNG/JPG file here or click to browse
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Signatory Name / Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. M. C. E. T. or Principal Signature"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Designation <span className="text-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Principal / Head of Department"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-surface text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                {signatures.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className="px-3.5 py-2 text-xs font-medium text-muted hover:text-primary rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!dataUrl || !name.trim()}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Save Signature
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
