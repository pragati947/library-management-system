import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Search,
  User,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  BookmarkCheck,
  Award,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const RecommendationsPage = () => {
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Direct Issue Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState(null);
  const [availableCopies, setAvailableCopies] = useState([]);
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [dueDays, setDueDays] = useState(14);
  const [issuing, setIssuing] = useState(false);

  // Fetch initial list of members
  useEffect(() => {
    api.get('/members', { limit: 20 })
      .then((data) => {
        setMembers(data);
        if (data.length > 0) {
          // Default to Pragati or first member
          const defaultMember = data.find((m) => m.name.toLowerCase().includes('pragati')) || data[0];
          setSelectedMember(defaultMember);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Fetch recommendations whenever selectedMember changes
  const fetchRecommendations = async (memberId) => {
    setLoading(true);
    try {
      const data = await api.get(`/members/${memberId}/recommendations`, { limit: 9 });
      setRecommendations(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to generate recommendations', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMember) {
      fetchRecommendations(selectedMember.member_id);
    }
  }, [selectedMember]);

  const handleOpenIssueModal = async (book) => {
    setSelectedBookForIssue(book);
    try {
      const copies = await api.get('/copies', { book_id: book.book_id, status: 'AVAILABLE' });
      setAvailableCopies(copies);
      if (copies.length > 0) {
        setSelectedCopyId(copies[0].copy_id);
      } else {
        setSelectedCopyId('');
      }
      setIssueModalOpen(true);
    } catch (err) {
      setToast({ message: 'Could not fetch copies', type: 'error' });
    }
  };

  const handleConfirmIssue = async (e) => {
    e.preventDefault();
    if (!selectedCopyId) {
      setToast({ message: 'No available copy selected', type: 'error' });
      return;
    }
    setIssuing(true);
    try {
      await api.post('/transactions/issue', {
        member_id: selectedMember.member_id,
        copy_id: parseInt(selectedCopyId),
        due_days: parseInt(dueDays),
      });
      setToast({
        message: `Book "${selectedBookForIssue.title}" issued to ${selectedMember.name}!`,
        type: 'success',
      });
      setIssueModalOpen(false);
      fetchRecommendations(selectedMember.member_id);
    } catch (err) {
      setToast({ message: err.message || 'Failed to issue book', type: 'error' });
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Intelligent & Personalized Book Recommender</h2>
          <p>
            Multi-factor deterministic engine evaluating patron preferences, historical borrow frequencies, author affinities, ratings, and shelf availability.
          </p>
        </div>
      </div>

      {/* Select Member Bar */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
          border: '1px solid #c7d2fe',
          marginBottom: '28px',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#4f46e5',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#4338ca', letterSpacing: '0.5px' }}>
                Select Visiting Patron
              </label>
              <select
                className="form-control"
                style={{ fontWeight: 700, fontSize: '14.5px', marginTop: '2px', borderColor: '#c7d2fe' }}
                value={selectedMember?.member_id || ''}
                onChange={(e) => {
                  const m = members.find((x) => x.member_id === parseInt(e.target.value));
                  setSelectedMember(m);
                }}
              >
                {members.map((m) => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.name} ({m.email}) - {m.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedMember && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Preferred Categories:</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '3px' }}>
                  {selectedMember.preferred_genres?.map((g) => (
                    <span key={g.genre_id} style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {g.genre_name}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate(`/members/${selectedMember.member_id}`)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '4px', whiteSpace: 'nowrap' }}
              >
                <span>Full Profile</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Output */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <RefreshCw className="spin" size={30} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600 }}>Computing algorithmic rankings from MySQL tables...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }} className="card">
          No recommendations found for this patron.
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Top Personalized Book Recommendations for {selectedMember?.name}
            </h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              Showing {recommendations.length} tailored selections
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {recommendations.map((rec, index) => (
              <div key={rec.book_id} className="rec-card">
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#4f46e5',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Match #{index + 1} • {rec.genre_name}
                  </span>

                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px', lineHeight: 1.3 }}>
                    {rec.title}
                  </h4>

                  <p style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>
                    By {rec.authors?.join(', ') || 'Unknown'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#b45309', fontWeight: 700 }}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b" /> {rec.average_rating > 0 ? rec.average_rating : 'New'}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span style={{ color: '#64748b' }}>{rec.publisher_name}</span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span style={{ color: '#64748b' }}>ISBN {rec.isbn}</span>
                  </div>

                  {/* Primary Explainability Reason */}
                  <div className="rec-reason-box">
                    <strong>Why Recommended:</strong> “{rec.primary_reason}”
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    {rec.is_available ? (
                      <span className="badge badge-success">
                        <CheckCircle2 size={12} /> {rec.available_copies} of {rec.total_copies} in stock
                      </span>
                    ) : (
                      <span className="badge badge-danger">
                        All copies currently out
                      </span>
                    )}
                  </div>

                  {rec.is_available ? (
                    <button
                      onClick={() => handleOpenIssueModal(rec)}
                      className="btn btn-primary btn-sm"
                      style={{ gap: '4px', fontWeight: 700 }}
                    >
                      <ArrowUpRight size={13} />
                      <span>Issue Book</span>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/reservations', { book_id: rec.book_id, member_id: selectedMember.member_id });
                          setToast({ message: 'Reservation placed in queue!', type: 'success' });
                        } catch (err) {
                          setToast({ message: err.message || 'Reservation failed', type: 'error' });
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '4px' }}
                    >
                      <BookmarkCheck size={13} />
                      <span>Reserve</span>
                    </button>
                  )}
                </div>

                {/* Algorithmic Match Score Pill */}
                <div className="rec-score-pill">
                  <Award size={13} />
                  <span>{rec.recommendation_score} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Issue Recommended Book */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title={`Issue Book: ${selectedBookForIssue?.title}`}
      >
        <form onSubmit={handleConfirmIssue}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Issuing to Patron:</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              {selectedMember?.name} (ID: #{selectedMember?.member_id})
            </div>
          </div>

          <div className="form-group">
            <label>Select Physical Copy *</label>
            <select
              className="form-control"
              value={selectedCopyId}
              onChange={(e) => setSelectedCopyId(e.target.value)}
              required
            >
              {availableCopies.map((c) => (
                <option key={c.copy_id} value={c.copy_id}>
                  Copy #{c.copy_id} (Barcode: {c.barcode}) - AVAILABLE
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Lending Duration (Days)</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="90"
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIssueModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={issuing}>
              {issuing ? 'Recording Transaction...' : 'Complete Book Issue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

