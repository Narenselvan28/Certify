import React, { useState, useEffect } from 'react';
import { generateSinglePDF, getParticipantName, getParticipantRegNo, getEventName } from '../../services/pdfExporter.js';
import { getParticipantEmail, sendSingleCertificate } from '../../services/deliveryService.js';

export function SendOneModal({
  isOpen,
  onClose,
  participantIndex,
  row,
  templateImg,
  fields,
  mappings,
  emailColumn,
  override = null,
  apiBaseUrl,
  onSuccess,
}) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && row) {
      const effectiveData = override?.data ? { ...row, ...override.data } : row;
      const name = override?.data?.name || getParticipantName(effectiveData, fields, mappings);
      const email = getParticipantEmail(effectiveData, fields, mappings, emailColumn);
      const eventName = override?.data?.event_name || getEventName(effectiveData, fields, mappings) || 'SPECTRUM';

      setRecipientEmail(email || '');
      setRecipientName(name);
      setSubject(`Your Certificate – ${eventName}`);
      setBody(
        `Dear ${name},\n\nThank you for participating in ${eventName}.\n\nPlease find your certificate attached to this email.\n\nWe appreciate your participation and congratulate you on your achievement.\n\nRegards,\nSPECTRUM`
      );
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen, row, override, fields, mappings, emailColumn]);

  const effectiveData = override?.data ? { ...row, ...override.data } : row;
  const name = override?.data?.name || getParticipantName(effectiveData, fields, mappings);
  const regNo = override?.data?.reg_no || getParticipantRegNo(effectiveData, fields, mappings);
  const certFilename = `${name.replace(/\s+/g, '_')}${regNo ? `_${regNo}` : ''}_Certificate.pdf`;

  const handleSend = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }

    setSending(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      // 1. Generate the PDF in browser memory
      const { filename, blob } = await generateSinglePDF(
        row,
        participantIndex,
        templateImg,
        fields,
        mappings,
        override
      );

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result;
          const base64 = typeof res === 'string' ? res.split(',')[1] : '';
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const pdfBase64 = await base64Promise;

      // 2. Dispatch via Brevo backend
      const result = await sendSingleCertificate(apiBaseUrl, {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        subject,
        body,
        eventName: 'SPECTRUM',
        pdfBase64,
        filename,
      });

      if (result.success) {
        setStatus('success');
        onSuccess?.();
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Failed to deliver certificate.');
      }
    } catch (err) {
      console.error('Send certificate failed:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Could not send certificate. Please check backend connection.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-surface rounded-xl border border-border shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-indigo-50 text-accent">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <h3 className="text-sm font-semibold text-primary">Send Certificate</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-primary hover:bg-bg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          {status === 'success' ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-sm font-semibold text-primary">Certificate Sent!</h4>
              <p className="text-muted text-xs">
                Email with certificate PDF delivered to <strong>{recipientEmail}</strong>.
              </p>
            </div>
          ) : (
            <>
              {status === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-error space-y-1">
                  <p className="font-semibold text-xs">✗ Failed to send certificate</p>
                  <p className="text-[11px] text-error/80">{errorMessage}</p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Recipient Email <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Certificate Attachment
                </label>
                <div className="px-3 py-1.5 border border-border rounded-lg bg-bg text-primary font-mono text-[11px] flex items-center space-x-2">
                  <span className="text-red-500 font-bold">PDF</span>
                  <span className="truncate">{certFilename}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">
                  Message Body
                </label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-accent text-primary resize-none font-sans text-xs"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface flex items-center justify-end space-x-2">
          {status === 'success' ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-primary rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !recipientEmail}
                className="px-4 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center space-x-1.5 shadow-sm"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : status === 'error' ? (
                  <span>Retry Send</span>
                ) : (
                  <span>Send Certificate</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
