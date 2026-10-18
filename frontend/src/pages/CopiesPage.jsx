import React, { useState, useEffect } from 'react';
import { Copy, Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const CopiesPage = () => {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchCopies = async () => {
    setLoading(true);
    try {
      const data = await api.get('/copies', { status: statusFilter });
      setCopies(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load copies', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCopies();
  }, [statusFilter]);

  const handleStatusChange = async (copyId, newStatus) => {
    try {
      await api.put(`/copies/${copyId}`, { status: newStatus });
      setToast({ message: 'Copy status updated successfully', type: 'success' });
      fetchCopies();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const filtered = copies.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.book_title?.toLowerCase().includes(s) ||
      c.barcode?.toLowerCase().includes(s) ||
      c.isbn?.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Physical Book Copies Inventory</h2>
          <p>Track unique barcodes, circulating copies, maintenance status, and stock levels.</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-input">
          <input
            type="text"
            placeholder="Search by book title, barcode, or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-select">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="ISSUED">ISSUED</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Copy ID</th>
              <th>Book Title</th>
              <th>Barcode</th>
              <th>Date Added</th>
              <th>Current Status</th>
              <th style={{ textAlign: 'right' }}>Update Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading copies...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No physical copies found.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.copy_id}>
                  <td><code>#{c.copy_id}</code></td>
                  <td style={{ fontWeight: 600 }}>{c.book_title}</td>
                  <td><code>{c.barcode || 'N/A'}</code></td>
                  <td>{c.added_date}</td>
                  <td><Badge variant={c.status.toLowerCase()}>{c.status}</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.copy_id, e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="ISSUED">ISSUED</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="LOST">LOST</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

