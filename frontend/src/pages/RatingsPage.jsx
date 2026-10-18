import React, { useState, useEffect } from 'react';
import { Star, Plus, Trash2, Search } from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const RatingsPage = () => {
  const [ratings, setRatings] = useState([]);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Add Rating Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [bookId, setBookId] = useState('');
  const [ratingVal, setRatingVal] = useState(5);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/ratings');
      setRatings(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load ratings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
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
    fetchDropdowns();
    fetchRatings();
  }, []);

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ratings', {
        member_id: parseInt(memberId),
        book_id: parseInt(bookId),
        rating: parseInt(ratingVal),
      });
      setToast({ message: 'Patron rating logged successfully!', type: 'success' });
      setIsModalOpen(false);
      fetchRatings();
    } catch (err) {
      setToast({ message: err.message || 'Failed to save rating', type: 'error' });
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Remove rating for "${r.book_title}"?`)) return;
    try {
      await api.delete(`/ratings/${r.rating_id}`);
      setToast({ message: 'Rating removed', type: 'success' });
      fetchRatings();
    } catch (err) {
      setToast({ message: err.message || 'Delete failed', type: 'error' });
    }
  };

  const filtered = ratings.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.book_title?.toLowerCase().includes(s) ||
      r.member_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Patron Book Ratings & Reviews</h2>
          <p>
            Record book feedback (1-5 stars) collected at circulation to feed the collaborative recommendation algorithm.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> Log Rating
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-input">
          <input
            type="text"
            placeholder="Search by book title or patron name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Rating ID</th>
              <th>Book Title</th>
              <th>Patron / Member</th>
              <th>Score (1-5)</th>
              <th>Recorded Date</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>Loading ratings...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>No ratings recorded.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.rating_id}>
                  <td><code>#{r.rating_id}</code></td>
                  <td style={{ fontWeight: 600 }}>{r.book_title}</td>
                  <td>{r.member_name}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}>
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} size={15} fill="#f59e0b" />
                      ))}
                      <span style={{ marginLeft: '4px', fontWeight: 700, color: '#b45309', fontSize: '13px' }}>
                        ({r.rating}/5)
                      </span>
                    </div>
                  </td>
                  <td>{new Date(r.rating_date).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => handleDelete(r)} className="btn btn-danger btn-sm">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Member Book Rating">
        <form onSubmit={handleSubmitRating}>
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
                <option key={b.book_id} value={b.book_id}>{b.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Rating Score (1 to 5 Stars)</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  type="button"
                  key={score}
                  onClick={() => setRatingVal(score)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: ratingVal === score ? '#f59e0b' : '#e2e8f0',
                    backgroundColor: ratingVal === score ? '#fffbeb' : 'white',
                    color: ratingVal === score ? '#b45309' : '#475569',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Star size={15} fill={ratingVal >= score ? '#f59e0b' : 'none'} color="#f59e0b" />
                  <span>{score}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Rating</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

