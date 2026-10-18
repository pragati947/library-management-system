import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Star,
  BookmarkCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowLeft,
  Award,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const MemberProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Manage Preferences Modal
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [allGenres, setAllGenres] = useState([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState([]);

  // Direct Issue from Recommendation Modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState(null);
  const [availableCopies, setAvailableCopies] = useState([]);
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [dueDays, setDueDays] = useState(14);
  const [issuing, setIssuing] = useState(false);

  // Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedTxForReturn, setSelectedTxForReturn] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/members/${id}/profile`);
      setProfile(data);
      setSelectedGenreIds(data.preferred_genres?.map((g) => g.genre_id) || []);
    } catch (err) {
      setError(err.message || 'Failed to load member profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGenres = async () => {
    try {
      const data = await api.get('/genres');
      setAllGenres(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAllGenres();
  }, [id]);

  // Handle Save Preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/members/${id}/preferences`, selectedGenreIds);
      setToast({ message: 'Member genre preferences updated successfully!', type: 'success' });
      setIsPrefModalOpen(false);
      fetchProfile(); // Re-calculates recommendations dynamically!
    } catch (err) {
      setToast({ message: err.message || 'Failed to update preferences', type: 'error' });
    }
  };

  // Prepare Instant Issue Modal for a Recommended Book
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
      setToast({ message: 'Could not fetch available copies for this book', type: 'error' });
    }
  };

  // Confirm Instant Issue
  const handleConfirmIssue = async (e) => {
    e.preventDefault();
    if (!selectedCopyId) {
      setToast({ message: 'Please select an available physical copy', type: 'error' });
      return;
    }
    setIssuing(true);
    try {
      await api.post('/transactions/issue', {
        member_id: parseInt(id),
        copy_id: parseInt(selectedCopyId),
        due_days: parseInt(dueDays),
      });
      setToast({
        message: `Successfully issued "${selectedBookForIssue.title}" to ${profile.member.name}!`,
        type: 'success',
      });
      setIssueModalOpen(false);
      fetchProfile();
    } catch (err) {
      setToast({ message: err.message || 'Failed to issue book', type: 'error' });
    } finally {
      setIssuing(false);
    }
  };

  // Confirm Return Book
  const handleConfirmReturn = async () => {
    if (!selectedTxForReturn) return;
    try {
      const res = await api.post('/transactions/return', {
        transaction_id: selectedTxForReturn.transaction_id,
      });
      const fineMsg = res.fine_amount > 0 ? ` Overdue fine recorded: ₹${res.fine_amount}` : '';
      setToast({
        message: `Book "${selectedTxForReturn.book_title}" returned successfully.${fineMsg}`,
        type: 'success',
      });
      setReturnModalOpen(false);
      fetchProfile();
    } catch (err) {
      setToast({ message: err.message || 'Failed to process return', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
        <RefreshCw className="spin" size={32} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 600 }}>Assembling patron profile and personalized recommendations...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error || 'Member not found'}</div>
        <button onClick={() => navigate('/members')} className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Members List
        </button>
      </div>
    );
  }

  const { member, stats, recommendations } = profile;

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '13px', color: '#64748b' }}>
        <button
          onClick={() => navigate('/members')}
          style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <ArrowLeft size={14} /> Back to Members Registry
        </button>
        <span>/</span>
        <span>Patron Profile #{member.member_id}</span>
      </div>

      {/* Member Details Top Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          marginBottom: '28px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 800,
                boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)',
              }}
            >
              {member.name.charAt(0)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{member.name}</h2>
                <Badge variant={member.status.toLowerCase()}>{member.status}</Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '6px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={14} color="#6366f1" /> {member.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={14} color="#6366f1" /> {member.phone}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={14} color="#6366f1" /> Member since {member.join_date}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setIsPrefModalOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '13px', gap: '6px' }}
            >
              <Layers size={15} />
              <span>Manage Preferences</span>
            </button>
            <button
              onClick={() => navigate(`/issue?member_id=${member.member_id}`)}
              className="btn btn-primary"
              style={{ fontSize: '13px', gap: '6px' }}
            >
              <ArrowUpRight size={15} />
              <span>Issue New Book</span>
            </button>
          </div>
        </div>

        {/* Member Profile Quick Stats Counter Ribbon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            marginTop: '22px',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Loans</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{stats.total_borrowed}</div>
          </div>
          <div style={{ background: '#f0f9ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Active Loans</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>{stats.currently_issued}</div>
          </div>
          <div style={{ background: stats.total_overdue > 0 ? '#fef2f2' : '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${stats.total_overdue > 0 ? '#fecaca' : '#e2e8f0'}` }}>
            <div style={{ fontSize: '11px', color: stats.total_overdue > 0 ? '#b91c1c' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Overdue</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: stats.total_overdue > 0 ? '#dc2626' : '#0f172a' }}>{stats.total_overdue}</div>
          </div>
          <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Fines Recorded</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>₹{stats.total_fines_paid.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fffbeb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Reviews Given</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>{stats.total_ratings}</div>
          </div>
          <div style={{ background: '#f5f3ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 700, textTransform: 'uppercase' }}>Reservations</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed' }}>{stats.total_reservations}</div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SECTION 1: INTELLIGENT PERSONALIZED RECOMMENDATIONS (CORE FEATURE) */}
      {/* ================================================================ */}
      <div
        className="card"
        style={{
          marginBottom: '32px',
          border: '2px solid #818cf8',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.12)',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: 'white',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                }}
              >
                <Sparkles size={18} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e1b4b' }}>
                Intelligent Personalized Recommendations
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Calculated using: preferred genres, borrow history, author affinities, ratings, reservations, and shelf availability.
            </p>
          </div>

          <button onClick={fetchProfile} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            <RefreshCw size={13} />
            <span>Recalculate Recommendations</span>
          </button>
        </div>

        {recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
            No recommendations generated. Try adding preferred genres below!
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px',
            }}
          >
            {recommendations.map((rec, idx) => (
              <div key={rec.book_id} className="rec-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '60px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#4f46e5',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Rank #{idx + 1} • {rec.genre_name}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px', lineHeight: 1.3 }}>
                    {rec.title}
                  </h4>

                  <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '3px' }}>
                    By {rec.authors?.join(', ') || 'Unknown Author'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#b45309', fontWeight: 600 }}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b" /> {rec.average_rating > 0 ? rec.average_rating : 'New'}
                    </span>
                    <span style={{ color: '#94a3b8' }}>•</span>
                    <span style={{ color: '#64748b' }}>ISBN: {rec.isbn}</span>
                  </div>

                  {/* Primary Recommendation Reason Box */}
                  <div className="rec-reason-box">
                    <strong>Reason:</strong> “{rec.primary_reason}”
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    {rec.is_available ? (
                      <span className="badge badge-success" style={{ fontSize: '11.5px' }}>
                        <CheckCircle2 size={12} /> {rec.available_copies} Copy Available
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ fontSize: '11.5px' }}>
                        All Copies Checked Out
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
                      <span>Issue to Member</span>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/reservations', { book_id: rec.book_id, member_id: parseInt(id) });
                          setToast({ message: 'Reservation placed in queue!', type: 'success' });
                          fetchProfile();
                        } catch (err) {
                          setToast({ message: err.message || 'Reservation failed', type: 'error' });
                        }
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '4px' }}
                    >
                      <BookmarkCheck size={13} />
                      <span>Reserve Book</span>
                    </button>
                  )}
                </div>

                {/* Algorithmic Match Score Pill */}
                <div className="rec-score-pill" title="Deterministic match affinity score">
                  <Award size={13} />
                  <span>{rec.recommendation_score} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Preferred Genres & Frequently Borrowed Authors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Preferred Genres */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={17} color="#4f46e5" /> Preferred Reading Categories
            </span>
            <button onClick={() => setIsPrefModalOpen(true)} className="btn btn-secondary btn-sm">
              <Plus size={13} /> Edit
            </button>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
            Stored in <code>member_preferences</code> table to calibrate recommendations.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.preferred_genres?.length > 0 ? (
              profile.preferred_genres.map((g) => (
                <span
                  key={g.genre_id}
                  style={{
                    backgroundColor: '#eef2ff',
                    color: '#3730a3',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: '1px solid #c7d2fe',
                  }}
                >
                  {g.genre_name}
                </span>
              ))
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                No favorite categories set yet. Click Edit to select genres.
              </span>
            )}
          </div>
        </div>

        {/* Frequently Borrowed Authors */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={17} color="#059669" /> Frequently Borrowed Authors
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
            Derived from SQL joins across the patron's borrow transaction history.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.frequently_borrowed_authors?.length > 0 ? (
              profile.frequently_borrowed_authors.map((a, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{a.author_name}</span>
                  <span
                    style={{
                      backgroundColor: '#dcfce7',
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontWeight: 700,
                    }}
                  >
                    {a.borrow_count} loans
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                No previous author loans recorded yet.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Active Borrowed Books */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpRight size={17} color="#0284c7" /> Currently Borrowed Books ({profile.current_borrows?.length || 0})
          </span>
        </div>

        {profile.current_borrows?.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13.5px', fontStyle: 'italic' }}>
            No books are currently checked out by this patron.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Copy Barcode</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {profile.current_borrows.map((tx) => (
                  <tr key={tx.transaction_id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{tx.book_title}</td>
                    <td>
                      <code>{tx.barcode}</code>
                    </td>
                    <td>{tx.issue_date}</td>
                    <td>
                      <span style={{ color: tx.is_overdue ? '#dc2626' : '#334155', fontWeight: tx.is_overdue ? 700 : 500 }}>
                        {tx.due_date}
                      </span>
                    </td>
                    <td>
                      {tx.is_overdue ? (
                        <span className="badge badge-danger">
                          Overdue ({tx.days_overdue} days)
                        </span>
                      ) : (
                        <span className="badge badge-info">Active Loan</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedTxForReturn(tx);
                          setReturnModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#059669', borderColor: '#a7f3d0' }}
                      >
                        <ArrowDownLeft size={13} />
                        <span>Process Return</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Borrowing History */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={17} color="#64748b" /> Historical Borrow Transactions ({profile.borrow_history?.length || 0})
          </span>
        </div>

        {profile.borrow_history?.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '13.5px', fontStyle: 'italic' }}>
            No previous completed loan transactions.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Barcode</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Fine Paid</th>
                </tr>
              </thead>
              <tbody>
                {profile.borrow_history.map((tx) => (
                  <tr key={tx.transaction_id}>
                    <td style={{ fontWeight: 600 }}>{tx.book_title}</td>
                    <td><code>{tx.barcode}</code></td>
                    <td>{tx.issue_date}</td>
                    <td>{tx.due_date}</td>
                    <td><span style={{ color: '#059669', fontWeight: 600 }}>{tx.return_date}</span></td>
                    <td>
                      {tx.fine_amount > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>₹{tx.fine_amount.toFixed(2)}</span>
                      ) : (
                        <span style={{ color: '#64748b' }}>₹0.00</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Ratings and Reservations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Ratings Given */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={17} color="#f59e0b" /> Patron Ratings ({profile.ratings?.length || 0})
            </span>
          </div>
          {profile.ratings?.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>No ratings submitted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {profile.ratings.map((r) => (
                <div
                  key={r.rating_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{r.book_title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} size={14} fill="#f59e0b" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reservations */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookmarkCheck size={17} color="#8b5cf6" /> Reservation Queue ({profile.reservations?.length || 0})
            </span>
          </div>
          {profile.reservations?.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '13px' }}>No active book reservations.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {profile.reservations.map((res) => (
                <div
                  key={res.reservation_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{res.book_title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Reserved {new Date(res.reservation_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={res.status.toLowerCase()}>{res.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Edit Genre Preferences */}
      <Modal isOpen={isPrefModalOpen} onClose={() => setIsPrefModalOpen(false)} title="Update Member Preferred Genres">
        <form onSubmit={handleSavePreferences}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
            Choose the literary categories this patron is interested in. Changing these preferences will instantly recalibrate the recommendation algorithm.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              padding: '12px',
              borderRadius: '8px',
            }}
          >
            {allGenres.map((g) => {
              const isChecked = selectedGenreIds.includes(g.genre_id);
              return (
                <label
                  key={g.genre_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      if (isChecked) {
                        setSelectedGenreIds(selectedGenreIds.filter((gid) => gid !== g.genre_id));
                      } else {
                        setSelectedGenreIds([...selectedGenreIds, g.genre_id]);
                      }
                    }}
                  />
                  <span>{g.genre_name}</span>
                </label>
              );
            })}
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsPrefModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save & Recalculate
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Instant Issue Book from Recommendations */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title={`Issue Book: ${selectedBookForIssue?.title}`}
      >
        <form onSubmit={handleConfirmIssue}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>Issuing to Patron:</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{member.name} (ID: #{member.member_id})</div>
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
                  Copy #{c.copy_id} (Barcode: {c.barcode || 'N/A'}) - AVAILABLE
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

      {/* Modal: Process Return Confirmation */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Confirm Book Return"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '14px', marginBottom: '12px' }}>
            Process return for <strong>{selectedTxForReturn?.book_title}</strong> (Barcode: <code>{selectedTxForReturn?.barcode}</code>)?
          </p>

          {selectedTxForReturn?.is_overdue && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', color: '#991b1b', marginBottom: '14px', fontSize: '13px' }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> Overdue Notice
              </div>
              <p style={{ marginTop: '4px' }}>
                This loan is {selectedTxForReturn.days_overdue} days past due. A calculated fine of ₹{(selectedTxForReturn.days_overdue * 5.0).toFixed(2)} will be assessed automatically.
              </p>
            </div>
          )}

          <p style={{ fontSize: '12.5px', color: '#64748b' }}>
            The physical copy status will be updated to <strong>AVAILABLE</strong> in the MySQL database.
          </p>
        </div>

        <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
          <button type="button" onClick={() => setReturnModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleConfirmReturn} className="btn btn-success">
            Confirm Return
          </button>
        </div>
      </Modal>
    </div>
  );
};

