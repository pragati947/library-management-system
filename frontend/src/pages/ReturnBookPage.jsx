import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  IndianRupee,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { Toast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';

export const ReturnBookPage = () => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Return Process Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [fineRate, setFineRate] = useState(5.0);
  const [processing, setProcessing] = useState(false);

  const fetchActiveLoans = async () => {
    setLoading(true);
    try {
      const data = await api.get('/transactions', {
        status: 'ACTIVE',
        is_overdue: filterOverdue ? 'true' : '',
      });
      setActiveLoans(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load active loans', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, [filterOverdue]);

  const handleOpenReturnModal = (tx) => {
    setSelectedTx(tx);
    setReturnModalOpen(true);
  };

  const handleProcessReturn = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    setProcessing(true);
    try {
      const res = await api.post('/transactions/return', {
        transaction_id: selectedTx.transaction_id,
        fine_rate: fineRate,
      });

      const fineMsg = res.fine_amount > 0 ? ` (Overdue fine assessed: ₹${res.fine_amount})` : ' (No overdue fine)';
      setToast({
        message: `Book "${selectedTx.book_title}" returned successfully by ${selectedTx.member_name}!${fineMsg}`,
        type: 'success',
      });

      setReturnModalOpen(false);
      fetchActiveLoans();
    } catch (err) {
      setToast({ message: err.message || 'Failed to process return', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredLoans = activeLoans.filter((tx) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      tx.member_name?.toLowerCase().includes(s) ||
      tx.book_title?.toLowerCase().includes(s) ||
      tx.barcode?.toLowerCase().includes(s) ||
      tx.transaction_id.toString().includes(s)
    );
  });

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Return Book & Circulation In-take</h2>
          <p>
            Process returned books, automatically calculate overdue penalty fines (₹5/day), and return copies to inventory.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-input">
          <input
            type="text"
            placeholder="Search by Patron name, Book title, Barcode, or Transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={filterOverdue}
            onChange={(e) => setFilterOverdue(e.target.checked)}
          />
          <span>Overdue Loans Only</span>
        </label>

        <button onClick={fetchActiveLoans} className="btn btn-secondary">
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Active Loans Table */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Tx ID</th>
              <th>Member / Patron</th>
              <th>Book Title & Barcode</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Loan Status</th>
              <th>Calculated Fine</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading active loans from MySQL database...
                </td>
              </tr>
            ) : filteredLoans.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No active loans found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredLoans.map((tx) => (
                <tr key={tx.transaction_id}>
                  <td><code>#{tx.transaction_id}</code></td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{tx.member_name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Member #{tx.member_id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{tx.book_title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Copy Barcode: <code>{tx.barcode}</code></div>
                  </td>
                  <td>{tx.issue_date}</td>
                  <td>
                    <span style={{ fontWeight: tx.is_overdue ? 700 : 500, color: tx.is_overdue ? '#dc2626' : '#334155' }}>
                      {tx.due_date}
                    </span>
                  </td>
                  <td>
                    {tx.is_overdue ? (
                      <span className="badge badge-danger">
                        Overdue ({tx.days_overdue} days)
                      </span>
                    ) : (
                      <span className="badge badge-info">Active</span>
                    )}
                  </td>
                  <td>
                    {tx.is_overdue ? (
                      <span style={{ color: '#dc2626', fontWeight: 800 }}>
                        ₹{(tx.days_overdue * 5.0).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>₹0.00</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleOpenReturnModal(tx)}
                      className="btn btn-success btn-sm"
                      style={{ gap: '4px' }}
                    >
                      <ArrowDownLeft size={13} />
                      <span>Process Return</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Return Confirmation & Fine Calculator Modal */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Process Book Return & Calculate Fine"
      >
        <form onSubmit={handleProcessReturn}>
          {selectedTx && (
            <div>
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{selectedTx.book_title}</div>
                <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                  Patron: <strong>{selectedTx.member_name}</strong> • Copy: <code>{selectedTx.barcode}</code>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Issued on: {selectedTx.issue_date} • Due on: <strong>{selectedTx.due_date}</strong>
                </div>
              </div>

              {selectedTx.is_overdue ? (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', marginBottom: '18px', color: '#991b1b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px' }}>
                    <AlertTriangle size={17} /> Overdue Calculation
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '13px' }}>
                    Days Overdue: <strong>{selectedTx.days_overdue} days</strong>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 800 }}>
                    Calculated Overdue Fine: ₹{(selectedTx.days_overdue * fineRate).toFixed(2)}
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px', marginBottom: '18px', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} /> Returned on time. No overdue fine is assessed.
                </div>
              )}

              <div className="form-group">
                <label>Daily Fine Rate (₹ per overdue day)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-control"
                  value={fineRate}
                  onChange={(e) => setFineRate(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                Submitting will set return_date to today, update copy status to AVAILABLE, and persist the fine in borrow_transactions.
              </p>
            </div>
          )}

          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setReturnModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={processing}>
              {processing ? 'Processing Database Transaction...' : 'Complete Return'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

