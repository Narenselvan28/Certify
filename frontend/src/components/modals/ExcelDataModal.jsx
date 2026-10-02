import { useState, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, BtnSecondary } from '../common/Modal.jsx';
import { normalizePhone } from '../../utils/phone.js';
import { getParticipantPhone } from '../../services/whatsappApi.js';

export function ExcelDataModal({ isOpen, excel, fields, mappings, phoneColumn, onClose }) {
  const [search, setSearch] = useState('');

  const headers = excel?.headers || [];
  const rows = excel?.rows || [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const query = search.toLowerCase();
    return rows.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(query))
    );
  }, [rows, search]);

  return (
    <Modal isOpen={isOpen}>
      <ModalHeader>
        <div className="flex items-center justify-between w-full pr-6">
          <div>
            <span>Participant Data</span>
            <span className="ml-2 text-xs font-normal text-muted">
              ({rows.length} records{excel?.fileName ? ` • ${excel.fileName}` : ''})
            </span>
          </div>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search participants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded border border-border focus:border-accent outline-none bg-surface"
          />
        </div>

        <div className="border border-border rounded overflow-hidden max-h-[50vh] overflow-y-auto overflow-x-auto text-xs">
          <table className="w-full border-collapse text-left">
            <thead className="bg-bg border-b border-border sticky top-0 z-10">
              <tr>
                <th className="py-2 px-3 font-semibold text-muted w-10">#</th>
                {headers.map(h => (
                  <th key={h} className="py-2 px-3 font-semibold text-primary whitespace-nowrap">
                    {h}
                    {h === phoneColumn && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700">
                        Phone
                      </span>
                    )}
                  </th>
                ))}
                <th className="py-2 px-3 font-semibold text-muted whitespace-nowrap">WhatsApp Ready</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.slice(0, 100).map((row, idx) => {
                const rawPhone = getParticipantPhone(row, fields, mappings, phoneColumn);
                const norm = normalizePhone(rawPhone);
                return (
                  <tr key={idx} className="hover:bg-bg/50">
                    <td className="py-1.5 px-3 text-muted">{idx + 1}</td>
                    {headers.map(h => (
                      <td key={h} className="py-1.5 px-3 whitespace-nowrap text-primary max-w-xs truncate">
                        {String(row[h] ?? '')}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      {norm ? (
                        <span className="inline-flex items-center text-green-600 font-mono text-[11px]">
                          ✓ +{norm}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-muted text-[11px]">
                          {rawPhone ? `⚠ Invalid (${rawPhone})` : '— No Phone'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 2} className="py-6 text-center text-muted">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRows.length > 100 && (
          <p className="text-[11px] text-muted mt-2 text-right">
            Showing first 100 of {filteredRows.length} matching rows.
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <BtnSecondary onClick={onClose}>Close</BtnSecondary>
      </ModalFooter>
    </Modal>
  );
}
