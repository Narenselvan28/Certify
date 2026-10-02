import React, { useState, useEffect, useRef } from 'react';
import { renderCertificate } from '../../services/certificateRenderer.js';
import { generateSinglePDF, getParticipantName, getParticipantRegNo } from '../../services/pdfExporter.js';
import { SignatureManagerModal } from '../signatures/SignatureManagerModal.jsx';

export function IndividualCertificateEditor({
  participantIndex,
  total,
  row,
  templateImg,
  fields,
  mappings,
  existingOverride,
  onSaveOverride,
  onResetOverride,
  onBack,
  onSendEmail,
  onShowToast,
}) {
  const canvasRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    reg_no: '',
    department: '',
    event_name: '',
    date: '',
  });

  // Per-field text overrides: { [fieldId]: string }
  const [fieldTextOverrides, setFieldTextOverrides] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [activeSigFieldId, setActiveSigFieldId] = useState(null);

  const isEdited = Boolean(existingOverride && (
    (existingOverride.data && Object.keys(existingOverride.data).length > 0) ||
    (existingOverride.fields && Object.keys(existingOverride.fields).length > 0)
  ));

  // Initialize form from row data + existing override
  useEffect(() => {
    const effectiveData = { ...row, ...(existingOverride?.data || {}) };

    const initialName = effectiveData.name || effectiveData.Name || getParticipantName(row, fields, mappings);
    const initialReg = effectiveData.reg_no || effectiveData['Reg No'] || effectiveData['Register Number'] || getParticipantRegNo(row, fields, mappings);
    const initialDept = effectiveData.department || effectiveData.Department || effectiveData.Dept || '';
    const initialEvent = effectiveData.event_name || effectiveData['Event Name'] || '';
    const initialDate = effectiveData.date || effectiveData.Date || '';

    setFormData({
      name: initialName,
      reg_no: initialReg,
      department: initialDept,
      event_name: initialEvent,
      date: initialDate,
    });

    const initialFieldTexts = {};
    if (existingOverride?.fields) {
      for (const [fId, val] of Object.entries(existingOverride.fields)) {
        if (val.text !== undefined) initialFieldTexts[fId] = val.text;
      }
    }
    setFieldTextOverrides(initialFieldTexts);
    setIsDirty(false);
  }, [row, existingOverride, fields, mappings]);

  // Construct current working override object
  const currentWorkingOverride = {
    data: {
      ...formData,
      // Map back to mapped column names as well
      ...(fields.find(f => f.type === 'name' && mappings[f.id]) ? { [mappings[fields.find(f => f.type === 'name').id]]: formData.name } : {}),
      ...(fields.find(f => f.type === 'reg_no' && mappings[f.id]) ? { [mappings[fields.find(f => f.type === 'reg_no').id]]: formData.reg_no } : {}),
      ...(fields.find(f => f.type === 'department' && mappings[f.id]) ? { [mappings[fields.find(f => f.type === 'department').id]]: formData.department } : {}),
    },
    fields: {
      ...(existingOverride?.fields || {}),
      ...Object.fromEntries(
        Object.entries(fieldTextOverrides).map(([fId, text]) => [fId, { ...(existingOverride?.fields?.[fId] || {}), text }])
      ),
    },
  };

  // Re-render live canvas preview whenever form data or overrides change
  useEffect(() => {
    let active = true;
    if (canvasRef.current && templateImg) {
      renderCertificate(
        canvasRef.current,
        templateImg,
        fields,
        row,
        mappings,
        { override: currentWorkingOverride }
      ).catch(console.error);
    }
    return () => { active = false; };
  }, [formData, fieldTextOverrides, templateImg, fields, row, mappings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleFieldTextChange = (fieldId, value) => {
    setFieldTextOverrides(prev => ({ ...prev, [fieldId]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onSaveOverride(participantIndex, currentWorkingOverride);
    setIsDirty(false);
    onShowToast?.(`Saved overrides for Certificate #${participantIndex + 1}`, 'success');
  };

  const handleReset = () => {
    if (window.confirm('Reset this certificate to match the master template? Custom individual changes will be discarded.')) {
      onResetOverride(participantIndex);
      setIsDirty(false);
      onShowToast?.(`Reset Certificate #${participantIndex + 1} to template`, 'info');
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes on this certificate. Discard and leave?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleDownloadSingle = async () => {
    if (!templateImg) return;
    try {
      const { filename, blob } = await generateSinglePDF(
        row,
        participantIndex,
        templateImg,
        fields,
        mappings,
        currentWorkingOverride
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
      onShowToast?.(`Download failed: ${err.message}`, 'error');
    }
  };

  const handleSignatureSelect = (sig) => {
    if (!activeSigFieldId) return;
    onSaveOverride(participantIndex, {
      ...currentWorkingOverride,
      fields: {
        ...(currentWorkingOverride.fields || {}),
        [activeSigFieldId]: {
          ...(currentWorkingOverride.fields?.[activeSigFieldId] || {}),
          imageSrc: sig.dataUrl,
          signatureId: sig.id,
          label: sig.name,
          designation: sig.designation,
        },
      },
    });
    setIsDirty(false);
    onShowToast?.(`Assigned signature to Certificate #${participantIndex + 1}`, 'success');
  };

  const signatureFields = fields.filter(f => f.type === 'signature');

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-bg text-primary">
      {/* Top Bar */}
      <header className="h-14 border-b border-border bg-surface px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="flex items-center space-x-1.5 text-xs text-muted hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-bg border border-border/60 transition-colors"
          >
            <span>←</span>
            <span className="font-medium">Back to Review</span>
          </button>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-primary">
              Certificate {participantIndex + 1} of {total}
            </span>
            <span className="text-xs text-muted">— {formData.name || 'Participant'}</span>
            {isEdited && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
                <span>✎</span>
                <span>Edited</span>
              </span>
            )}
            {isDirty && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                Unsaved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isEdited && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium text-error hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
              title="Revert this certificate to master template"
            >
              Reset to Template
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadSingle}
            className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-bg border border-border rounded-lg transition-colors flex items-center space-x-1"
          >
            <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download PDF</span>
          </button>

          {onSendEmail && (
            <button
              type="button"
              onClick={() => onSendEmail(participantIndex, currentWorkingOverride)}
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center space-x-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Send Email</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-sm ${
              isDirty
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-muted/20 text-muted cursor-not-allowed'
            }`}
          >
            Save Changes
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Certificate Live Canvas Preview */}
        <div className="flex-1 bg-bg p-6 flex flex-col items-center justify-center overflow-auto relative">
          <div className="max-w-4xl w-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="w-full h-auto max-h-[75vh] object-contain rounded-lg shadow-xl border border-border bg-white"
            />
          </div>
          <p className="text-[11px] text-muted mt-3">
            Individual Override Mode: Changes made here apply <strong>only to this certificate</strong>. Master template and other certificates remain unchanged.
          </p>
        </div>

        {/* Right: Individual Overrides Form */}
        <aside className="w-80 md:w-96 border-l border-border bg-surface flex flex-col overflow-y-auto shrink-0 shadow-sm">
          <div className="p-5 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Participant Overrides
              </h3>
              <p className="text-xs text-muted">
                Override data values for this recipient without modifying the CSV.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-primary mb-1">
                  Participant Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-primary mb-1">
                  Registration / Roll Number
                </label>
                <input
                  type="text"
                  value={formData.reg_no}
                  onChange={(e) => handleInputChange('reg_no', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                  placeholder="e.g. 727624BEA005"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-primary mb-1">
                  Department / Branch
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                  placeholder="e.g. ECE"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-primary mb-1">
                  Event Name
                </label>
                <input
                  type="text"
                  value={formData.event_name}
                  onChange={(e) => handleInputChange('event_name', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                  placeholder="e.g. SPECTRUM Quiz"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-primary mb-1">
                  Date
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                  placeholder="e.g. 02-10-2026"
                />
              </div>
            </div>

            {/* Custom Field Text Overrides */}
            {fields.filter(f => f.type !== 'signature').length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Field Content Overrides
                </h4>
                <div className="space-y-2.5">
                  {fields.filter(f => f.type !== 'signature').map(field => (
                    <div key={field.id}>
                      <label className="block text-[11px] font-medium text-muted mb-0.5">
                        {field.label} ({field.type})
                      </label>
                      <input
                        type="text"
                        value={fieldTextOverrides[field.id] !== undefined ? fieldTextOverrides[field.id] : ''}
                        onChange={(e) => handleFieldTextChange(field.id, e.target.value)}
                        placeholder={`Default: ${field.placeholder}`}
                        className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature Overrides */}
            {signatureFields.length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Signature Override
                </h4>
                {signatureFields.map(sigField => {
                  const currentSigSrc = currentWorkingOverride.fields?.[sigField.id]?.imageSrc || sigField.imageSrc;
                  return (
                    <div key={sigField.id} className="p-3 border border-border rounded-lg bg-bg/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-primary">{sigField.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSigFieldId(sigField.id);
                            setIsSigModalOpen(true);
                          }}
                          className="text-xs text-accent hover:underline font-medium"
                        >
                          Change
                        </button>
                      </div>
                      {currentSigSrc && (
                        <div className="h-14 rounded bg-white border border-border/80 flex items-center justify-center p-1 overflow-hidden">
                          <img src={currentSigSrc} alt="Signature" className="max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Signature Selector Modal */}
      <SignatureManagerModal
        isOpen={isSigModalOpen}
        onClose={() => {
          setIsSigModalOpen(false);
          setActiveSigFieldId(null);
        }}
        onSelectSignature={handleSignatureSelect}
      />
    </div>
  );
}
