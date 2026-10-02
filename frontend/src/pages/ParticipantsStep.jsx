import React, { useState, useRef, useMemo } from 'react';
import { useAppContext, A } from '../context/AppContext.jsx';
import { parseExcelFile } from '../services/excel.js';
import { autoMapFields, detectEmailColumn } from '../utils/mapping.js';
import { isValidEmail } from '../utils/email.js';
import { MappingModal } from '../components/modals/MappingModal.jsx';

export function ParticipantsStep({ onShowToast }) {
  const { state, dispatch } = useAppContext();
  const fileInputRef = useRef(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const rows = state.excel?.rows || [];
  const headers = state.excel?.headers || [];
  const fileName = state.excel?.fileName || '';
  const emailCol = state.emailColumn;

  // Process uploaded Excel / CSV
  const handleProcessFile = async (file) => {
    if (!file) return;
    try {
      const { fileName: parsedName, headers: parsedHeaders, rows: parsedRows, rowCount } = await parseExcelFile(file);
      dispatch({ type: A.SET_EXCEL, excel: { fileName: parsedName, headers: parsedHeaders, rows: parsedRows } });

      const { mappings, confident } = autoMapFields(state.fields, parsedHeaders);
      dispatch({ type: A.SET_MAPPINGS, mappings });

      const detectedEmail = detectEmailColumn(parsedHeaders);
      if (detectedEmail) {
        dispatch({ type: A.SET_EMAIL_COLUMN, emailColumn: detectedEmail });
      }

      onShowToast?.(`Imported ${rowCount} participants from ${parsedName}`, 'success');

      if (!confident && state.fields.length > 0) {
        setIsMappingOpen(true);
      }
    } catch (err) {
      console.error('Participant import error:', err);
      onShowToast?.(`Import failed: ${err.message}`, 'error');
    }
  };

  // Quick Load Sample Participants for instant testing
  const handleLoadSample = () => {
    const sampleHeaders = ['S.No', 'Name', 'Reg No', 'Department', 'Email', 'Event Name', 'Date'];
    const sampleRows = [
      { 'S.No': '1', 'Name': 'Indrish', 'Reg No': '727624BEA001', 'Department': 'ECE', 'Email': 'indrish@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '2', 'Name': 'Selva Kumar', 'Reg No': '727624BEA002', 'Department': 'ECE', 'Email': 'selva@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '3', 'Name': 'Naren Selvan T', 'Reg No': '727624BEA005', 'Department': 'ECE', 'Email': 'naren@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '4', 'Name': 'Aarav Sharma', 'Reg No': '21BCS101', 'Department': 'CSE', 'Email': 'aarav.sharma@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '5', 'Name': 'Ananya Patel', 'Reg No': '21BEC204', 'Department': 'ECE', 'Email': 'ananya.patel@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '6', 'Name': 'Vignesh R', 'Reg No': '21BME045', 'Department': 'MECH', 'Email': 'vignesh@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '7', 'Name': 'Pooja Sundaram', 'Reg No': '21BIT088', 'Department': 'IT', 'Email': 'pooja@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '8', 'Name': 'Karthik Raja', 'Reg No': '21BAE012', 'Department': 'AUTO', 'Email': 'karthik@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '9', 'Name': 'Sneha Mohan', 'Reg No': '21BCS150', 'Department': 'CSE', 'Email': 'sneha@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
      { 'S.No': '10', 'Name': 'Rohit Verma', 'Reg No': '21BEA099', 'Department': 'ECE', 'Email': 'rohit@example.com', 'Event Name': 'SPECTRUM 2026', 'Date': '02-10-2026' },
    ];

    dispatch({
      type: A.SET_EXCEL,
      excel: { fileName: 'sample_participants.csv', headers: sampleHeaders, rows: sampleRows },
    });

    const { mappings } = autoMapFields(state.fields, sampleHeaders);
    dispatch({ type: A.SET_MAPPINGS, mappings });
    dispatch({ type: A.SET_EMAIL_COLUMN, emailColumn: 'Email' });

    onShowToast?.('Loaded 10 sample participants', 'success');
  };

  // Inspect participants and validate email status
  const evaluatedRows = useMemo(() => {
    return rows.map((r, index) => {
      let emailVal = '';
      if (emailCol && r[emailCol] !== undefined) emailVal = String(r[emailCol]).trim();
      else {
        for (const k of Object.keys(r)) {
          if (k.toLowerCase().includes('mail') && r[k]) {
            emailVal = String(r[k]).trim();
            break;
          }
        }
      }

      const hasValidEmail = Boolean(emailVal && isValidEmail(emailVal));

      // Resolve name
      let nameVal = '';
      for (const k of ['Name', 'Student Name', 'Participant Name', 'Full Name']) {
        if (r[k]) { nameVal = String(r[k]); break; }
      }
      if (!nameVal) {
        for (const k of Object.keys(r)) {
          if (k.toLowerCase().includes('name') && r[k]) { nameVal = String(r[k]); break; }
        }
      }

      // Resolve reg no
      let regVal = '';
      for (const k of ['Reg No', 'Register Number', 'Registration Number', 'Roll No']) {
        if (r[k]) { regVal = String(r[k]); break; }
      }

      // Resolve department
      let deptVal = '';
      for (const k of ['Department', 'Dept', 'Branch']) {
        if (r[k]) { deptVal = String(r[k]); break; }
      }

      return {
        originalIndex: index,
        raw: r,
        name: nameVal || `Participant ${index + 1}`,
        regNo: regVal || '—',
        department: deptVal || '—',
        email: emailVal || '',
        isValidEmail: hasValidEmail,
      };
    });
  }, [rows, emailCol]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return evaluatedRows.filter(r => {
      if (filter === 'valid' && !r.isValidEmail) return false;
      if (filter === 'invalid' && r.isValidEmail) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.regNo.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
    });
  }, [evaluatedRows, filter, search]);

  const validCount = evaluatedRows.filter(r => r.isValidEmail).length;
  const invalidCount = evaluatedRows.length - validCount;

  // Check mapping status
  const mappedFieldsCount = state.fields.filter(f => state.mappings[f.id]).length;
  const totalFieldsCount = state.fields.filter(f => f.type !== 'signature').length;
  const allMapped = totalFieldsCount > 0 && mappedFieldsCount >= totalFieldsCount;

  const handleConfirmMapping = (newMappings, _phone, newEmail) => {
    dispatch({ type: A.SET_MAPPINGS, mappings: newMappings });
    dispatch({ type: A.SET_EMAIL_COLUMN, emailColumn: newEmail });
    setIsMappingOpen(false);
    onShowToast?.('Field mapping confirmed', 'success');
  };

  const handleContinueToReview = () => {
    dispatch({ type: A.SET_PREVIEW, preview: { mode: 'grid', currentIndex: 0 } });
    dispatch({ type: A.SET_PAGE, page: 'preview' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg text-primary">
      {/* Sub-header */}
      <div className="bg-surface border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-base font-semibold text-primary">Participants</h1>
          <p className="text-xs text-muted">
            Upload your participant list via Excel or CSV. Only Name and Email are strictly required.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-muted hover:text-primary border border-border rounded-lg bg-surface hover:bg-bg transition-colors"
            >
              Replace File
            </button>
            <button
              type="button"
              onClick={() => setIsMappingOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-primary border border-border rounded-lg bg-surface hover:bg-bg transition-colors flex items-center space-x-1.5"
            >
              <span>{allMapped ? '✓' : '⚙'}</span>
              <span>Edit Mapping</span>
            </button>
            <button
              type="button"
              onClick={handleContinueToReview}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs flex items-center space-x-1"
            >
              <span>Generate & Review</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto flex flex-col space-y-4">
        {rows.length === 0 ? (
          /* Empty / Upload State */
          <div className="flex-1 flex flex-col items-center justify-center py-16">
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
              className={`max-w-xl w-full border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                  : 'border-border hover:border-indigo-400 bg-surface shadow-xs'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <h3 className="text-sm font-semibold text-primary mb-1">
                Upload Participant Spreadsheet
              </h3>
              <p className="text-xs text-muted mb-4 max-w-sm mx-auto">
                Drag and drop your Excel (.xlsx, .xls) or CSV file here, or click to browse.
              </p>

              <div className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors shadow-xs">
                Select File
              </div>

              <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted">
                <span>✓ S.No</span>
                <span>✓ Name</span>
                <span>✓ Reg No</span>
                <span>✓ Department</span>
                <span>✓ Email</span>
              </div>
            </div>

            <div className="mt-6 flex items-center space-x-2">
              <span className="text-xs text-muted">Want to try without a file?</span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline underline-offset-2"
              >
                Load 10 Sample Participants
              </button>
            </div>
          </div>
        ) : (
          /* Table View State */
          <div className="space-y-4">
            {/* Status & Mapping Summary Banner */}
            <div className="p-3.5 bg-surface border border-border rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-primary">{rows.length}</span>
                  <span className="text-muted">Total</span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center space-x-1.5 text-emerald-600">
                  <span className="font-semibold">{validCount}</span>
                  <span className="text-muted">Valid Emails</span>
                </div>
                {invalidCount > 0 && (
                  <>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center space-x-1.5 text-amber-600">
                      <span className="font-semibold">{invalidCount}</span>
                      <span className="text-muted">Missing/Invalid Email</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                  allMapped
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {allMapped
                    ? `✓ Automatically Mapped (${mappedFieldsCount}/${totalFieldsCount})`
                    : `⚠ Needs Mapping (${mappedFieldsCount}/${totalFieldsCount})`}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMappingOpen(true)}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center space-x-1 bg-surface border border-border p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filter === 'all' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-muted hover:text-primary'
                  }`}
                >
                  All ({evaluatedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('valid')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    filter === 'valid' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-muted hover:text-primary'
                  }`}
                >
                  Valid Emails ({validCount})
                </button>
                {invalidCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter('invalid')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      filter === 'invalid' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-muted hover:text-primary'
                    }`}
                  >
                    Needs Attention ({invalidCount})
                  </button>
                )}
              </div>

              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-primary focus:outline-none focus:border-indigo-500"
                />
                <svg className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Participant Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[58vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-bg/80 border-b border-border sticky top-0 z-10 text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4">Participant Name</th>
                      <th className="py-2.5 px-4">Reg No</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4 w-28 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.map((r, i) => (
                      <tr key={r.originalIndex} className="hover:bg-bg/50 transition-colors">
                        <td className="py-2.5 px-4 text-center font-mono text-muted text-[11px]">
                          {r.originalIndex + 1}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-primary">
                          {r.name}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-muted">
                          {r.regNo}
                        </td>
                        <td className="py-2.5 px-4 text-muted">
                          {r.department}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-muted truncate max-w-xs">
                          {r.email || <span className="text-amber-500 italic">None</span>}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {r.isValidEmail ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠ Missing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Continue Action */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-muted">
                Showing {filteredRows.length} of {rows.length} participants
              </span>
              <button
                type="button"
                onClick={handleContinueToReview}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <span>Generate & Review {rows.length} Certificates</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mapping Modal */}
      <MappingModal
        isOpen={isMappingOpen}
        fields={state.fields}
        headers={headers}
        mappings={state.mappings || {}}
        emailColumn={state.emailColumn}
        onConfirm={handleConfirmMapping}
        onCancel={() => setIsMappingOpen(false)}
      />
    </div>
  );
}
