/**
 * Certify Frontend — useDelivery Hook
 * Manages Brevo Transactional Email delivery lifecycle: Preflight → Progress → Results → Retry
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  fetchEmailStatus,
  sendTestEmail,
  validateDelivery,
  startDelivery,
  getDeliveryStatus,
  getDeliveryResults,
  retryFailedDelivery,
  downloadDeliveryReport,
  getParticipantEmail,
} from '../services/deliveryService.js';
import { getParticipantName, getEventName, generateSinglePDF } from '../services/pdfExporter.js';

export function useDelivery({
  rows = [],
  templateImg,
  fields = [],
  mappings = {},
  emailColumn,
  apiBaseUrl = 'http://localhost:8001',
  onShowToast,
}) {
  const [step, setStep] = useState('ready'); // 'ready' | 'preflight' | 'progress' | 'results'

  // Brevo configuration status
  const [brevoStatus, setBrevoStatus] = useState({
    configured: false,
    test_mode: true,
    sender_email: '',
    sender_name: 'Certify',
    loading: true,
  });

  // Preflight validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Active delivery progress state
  const [deliveryId, setDeliveryId] = useState(null);
  const [status, setStatus] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
    skipped: 0,
    progress: 0,
    currently_sending: null,
    is_complete: false,
  });

  // Final results state
  const [results, setResults] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const pollTimer = useRef(null);

  // Clean polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  // Fetch Brevo configuration status
  const refreshBrevoStatus = useCallback(async () => {
    try {
      const data = await fetchEmailStatus(apiBaseUrl);
      setBrevoStatus({
        configured: data.configured,
        test_mode: data.test_mode,
        sender_email: data.sender_email || '',
        sender_name: data.sender_name || 'Certify',
        loading: false,
      });
    } catch (err) {
      setBrevoStatus(prev => ({ ...prev, loading: false }));
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    refreshBrevoStatus();
  }, [refreshBrevoStatus]);

  // Admin Single Test Email
  const handleSendTestEmail = useCallback(async (testRecipient) => {
    if (!testRecipient || !testRecipient.includes('@')) {
      onShowToast?.('Please enter a valid email address for testing', 'error');
      return;
    }
    setIsTestingEmail(true);
    try {
      const res = await sendTestEmail(apiBaseUrl, testRecipient);
      if (res.success) {
        onShowToast?.(res.message, 'success');
      } else {
        onShowToast?.(`Test email failed: ${res.message}`, 'error');
      }
    } catch (err) {
      onShowToast?.(`Test failed: ${err.message}`, 'error');
    } finally {
      setIsTestingEmail(false);
    }
  }, [apiBaseUrl, onShowToast]);

  // ── Step 1 → 2: Run Preflight Validation ─────────────────────────────────
  const runPreflightValidation = useCallback(async () => {
    setIsValidating(true);
    try {
      const items = rows.map((r, idx) => ({
        index: idx + 1,
        name: getParticipantName(r, fields, mappings),
        email: getParticipantEmail(r, fields, mappings, emailColumn),
        certificate_size_bytes: null,
      }));

      const res = await validateDelivery(apiBaseUrl, items);
      setValidationResult(res);
      setStep('preflight');
    } catch (err) {
      console.error('Validation error:', err);
      onShowToast?.(`Validation failed: ${err.message}`, 'error');
    } finally {
      setIsValidating(false);
    }
  }, [rows, fields, mappings, emailColumn, apiBaseUrl, onShowToast]);

  // ── Step 2 → 3: Start Queue Processing ────────────────────────────────────
  const startBulkDelivery = useCallback(async () => {
    if (!templateImg || rows.length === 0) return;
    setStep('progress');
    onShowToast?.('Generating certificate PDFs and initiating delivery...', 'info');

    try {
      const participants = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { blob, filename } = await generateSinglePDF(row, i, templateImg, fields, mappings);

        // Convert blob to base64
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let b = 0; b < bytes.length; b++) bin += String.fromCharCode(bytes[b]);
        const b64 = btoa(bin);

        const regNo = row['reg_no'] || row['Reg No'] || row['Roll No'] || row['regno'] || '';
        const dept = row['department'] || row['Department'] || row['Dept'] || '';

        participants.push({
          id: `p_${i + 1}`,
          sno: String(i + 1),
          name: getParticipantName(row, fields, mappings),
          email: getParticipantEmail(row, fields, mappings, emailColumn),
          reg_no: regNo,
          department: dept,
          event_name: getEventName(row, fields, mappings),
          certificate: { filename, base64: b64 },
        });
      }

      const startRes = await startDelivery(apiBaseUrl, participants);
      const newDeliveryId = startRes.delivery_id;
      setDeliveryId(newDeliveryId);

      // Start polling for real-time progress
      const poll = async () => {
        try {
          const st = await getDeliveryStatus(apiBaseUrl, newDeliveryId);
          setStatus(st);

          if (st.is_complete) {
            clearInterval(pollTimer.current);
            pollTimer.current = null;
            // Fetch final results
            const res = await getDeliveryResults(apiBaseUrl, newDeliveryId);
            setResults(res);
            setStep('results');
            onShowToast?.('Certificate delivery completed!', 'success');
          }
        } catch (err) {
          console.warn('Status poll error:', err);
        }
      };

      await poll();
      pollTimer.current = setInterval(poll, 750);

    } catch (err) {
      console.error('Start delivery failed:', err);
      onShowToast?.(`Delivery failed to start: ${err.message}`, 'error');
      setStep('ready');
    }
  }, [templateImg, rows, fields, mappings, emailColumn, apiBaseUrl, onShowToast]);

  // ── Retry Failed Deliveries ──────────────────────────────────────────────
  const handleRetryFailed = useCallback(async () => {
    if (!deliveryId) return;
    setIsRetrying(true);
    try {
      const res = await retryFailedDelivery(apiBaseUrl, deliveryId);
      if (res.retrying_count > 0) {
        onShowToast?.(`Retrying ${res.retrying_count} failed deliveries`, 'info');
        setStep('progress');

        // Resume status polling
        const poll = async () => {
          try {
            const st = await getDeliveryStatus(apiBaseUrl, deliveryId);
            setStatus(st);
            if (st.is_complete) {
              clearInterval(pollTimer.current);
              pollTimer.current = null;
              const finalRes = await getDeliveryResults(apiBaseUrl, deliveryId);
              setResults(finalRes);
              setStep('results');
              onShowToast?.('Retry batch completed!', 'success');
            }
          } catch (err) {
            console.warn('Poll error:', err);
          }
        };

        pollTimer.current = setInterval(poll, 750);
      } else {
        onShowToast?.('No temporary retryable jobs found.', 'info');
      }
    } catch (err) {
      onShowToast?.(`Retry failed: ${err.message}`, 'error');
    } finally {
      setIsRetrying(false);
    }
  }, [deliveryId, apiBaseUrl, onShowToast]);

  // ── Download CSV Report ──────────────────────────────────────────────────
  const handleDownloadReport = useCallback(async () => {
    if (!deliveryId) return;
    try {
      await downloadDeliveryReport(apiBaseUrl, deliveryId);
      onShowToast?.('Delivery report downloaded', 'success');
    } catch (err) {
      onShowToast?.(`Failed to download report: ${err.message}`, 'error');
    }
  }, [deliveryId, apiBaseUrl, onShowToast]);

  return {
    step,
    setStep,
    brevoStatus,
    refreshBrevoStatus,
    handleSendTestEmail,
    isTestingEmail,
    isValidating,
    validationResult,
    runPreflightValidation,
    startBulkDelivery,
    deliveryId,
    status,
    results,
    isRetrying,
    handleRetryFailed,
    handleDownloadReport,
  };
}
