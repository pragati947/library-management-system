import React, { useState, useEffect } from 'react';
import { BookmarkCheck, Plus, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const ReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Add Reservation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [bookId, setBookId] = useState('');

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const data = await api.get('/reservations', { status: statusFilter });
      setReservations(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load reservations', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [m, b] = await Promise.all([
        api.get('/members'),
        api.get('/books')
      ]);
      setMembers(m);
      setBooks(b);
      if (m.length > 0) setMemberId(m[0].member_id);
      if (b.length > 0) setBookId(b[0].book_id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [statusFilter]);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reservations', {
        member_id: parseInt(memberId),
        book_id: parseInt(bookId),
      });
      setToast({ message: 'Reservation queue entry created successfully', type: 'success' });
      setIsModalOpen(false);
      fetchReservations();
    } catch (err) {
      setToast({ message: err.message || 'Failed to create reservation', type: 'error' });
    }
  };

  const handleUpdateStatus = async (resId, newStatus) => {
    try {
      await api.put(`/reservations/${resId}`, { status: newStatus });
      setToast({ message: `Reservation marked as ${newStatus}`, type: 'success' });
      fetchReservations();
    } catch (err) {
      setToast({ message: err.message || 'Update failed', type: 'error' });
    }
  };

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Book Reservation Queue</h2>
          <p>Prioritized FIFO waitlists for in-demand library books based on reservation timestamps.</p>
        </div>
        <div className="page-actions">
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> New Reservation
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-select">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="FULFILLED">FULFILLED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Queue #</th>
              <th>Book Title</th>
              <th>Patron / Member</th>
              <th>Reservation Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading reservations...</td></tr>
            ) : reservations.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No reservations found.</td></tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.reservation_id}>
                  <td>
                    {r.queue_position ? (
                      <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: 800, padding: '3px 8px', borderRadius: '999px', fontSize: '11px' }}>
                        Position #{r.queue_position}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.book_title}</td>
                  <td>{r.member_name}</td>
                  <td>{new Date(r.reservation_date).toLocaleString()}</td>
                  <td><Badge variant={r.status.toLowerCase()}>{r.status}</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => handleUpdateStatus(r.reservation_id, 'FULFILLED')}
                          className="btn btn-success btn-sm"
                          style={{ gap: '4px' }}
                        >
                          <CheckCircle size={13} /> Fulfill
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(r.reservation_id, 'CANCELLED')}
                          className="btn btn-secondary btn-sm"
                          style={{ gap: '4px', color: '#dc2626' }}
                        >
                          <XCircle size={13} /> Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Place Book Reservation">
        <form onSubmit={handleCreateReservation}>
          <div className="form-group">
            <label>Member / Patron *</label>
            <select
              className="form-control"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
            >
              {members.map((m) => (
                <option key={m.member_id} value={m.member_id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Book Title *</label>
            <select
              className="form-control"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              required
            >
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>{b.title} (ISBN: {b.isbn})</option>
              ))}
            </select>
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Add to Reservation Queue</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

