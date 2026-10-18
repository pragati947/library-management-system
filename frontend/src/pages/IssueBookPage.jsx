import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Search,
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { Toast } from '../components/common/Toast';
import { Badge } from '../components/common/Badge';

export const IssueBookPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedMemberId = searchParams.get('member_id');
  const preselectedBookId = searchParams.get('book_id');
  const navigate = useNavigate();

  // All catalog data for instant selection without typing
  const [allMembers, setAllMembers] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Step 1: Member Selection
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  // Step 2: Book Selection
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);

  // Step 3: Copy Selection
  const [availableCopies, setAvailableCopies] = useState([]);
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [loadingCopies, setLoadingCopies] = useState(false);

  // Step 4: Dates & Terms
  const todayStr = new Date().toISOString().split('T')[0];
  const [issueDate, setIssueDate] = useState(todayStr);
  const [dueDays, setDueDays] = useState(14);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [lastIssuedTx, setLastIssuedTx] = useState(null);

  // Initial Data Load: Load members and books so dropdowns and quick selects are immediately populated
  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [membersData, booksData] = await Promise.all([
        api.get('/members'),
        api.get('/books', { only_available: 'true' })
      ]);
      // Sort members: ACTIVE first
      const sortedMembers = [...membersData].sort((a, b) => {
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
        if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
        return a.name.localeCompare(b.name);
      });
      setAllMembers(sortedMembers);
      setAllBooks(booksData);

      // Check pre-selected member
      if (preselectedMemberId) {
        const foundM = sortedMembers.find((m) => m.member_id === parseInt(preselectedMemberId));
        if (foundM) {
          setSelectedMember(foundM);
        } else {
          try {
            const m = await api.get(`/members/${preselectedMemberId}`);
            setSelectedMember(m);
          } catch (e) {
            console.error('Failed to load preselected member:', e);
          }
        }
      }

      // Check pre-selected book
      if (preselectedBookId) {
        const foundB = booksData.find((b) => b.book_id === parseInt(preselectedBookId));
        if (foundB) {
          setSelectedBook(foundB);
        } else {
          try {
            const b = await api.get(`/books/${preselectedBookId}`);
            setSelectedBook(b.book);
          } catch (e) {
            console.error('Failed to load preselected book:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error preloading data for issue page:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [preselectedMemberId, preselectedBookId]);

  // When a book is selected, fetch its available copies
  useEffect(() => {
    if (selectedBook) {
      setLoadingCopies(true);
      api.get('/copies', { book_id: selectedBook.book_id, status: 'AVAILABLE' })
        .then((copies) => {
          setAvailableCopies(copies);
          if (copies.length > 0) {
            setSelectedCopyId(copies[0].copy_id.toString());
          } else {
            setSelectedCopyId('');
          }
        })
        .catch((e) => {
          console.error('Error fetching copies:', e);
          setAvailableCopies([]);
          setSelectedCopyId('');
        })
        .finally(() => {
          setLoadingCopies(false);
        });
    } else {
      setAvailableCopies([]);
      setSelectedCopyId('');
    }
  }, [selectedBook]);

  // Filtered members based on search
  const filteredMembers = allMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      m.member_id.toString().includes(q)
    );
  });

  // Filtered books based on search
  const filteredBooks = allBooks.filter((b) => {
    if (!bookSearch.trim()) return true;
    const q = bookSearch.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q) ||
      b.genre?.genre_name?.toLowerCase().includes(q) ||
      b.authors?.some((a) => a.author_name.toLowerCase().includes(q))
    );
  });

  // Compute calculated due date
  const calculatedDueDate = () => {
    if (!issueDate) return '';
    const d = new Date(issueDate);
    d.setDate(d.getDate() + parseInt(dueDays || 14));
    return d.toISOString().split('T')[0];
  };

  // Submit Issue Book Transaction
  const handleIssueBook = async (e) => {
    e.preventDefault();
    setLastIssuedTx(null);

    if (!selectedMember) {
      setToast({ message: 'Please select a library patron first', type: 'error' });
      return;
    }
    if (selectedMember.status !== 'ACTIVE') {
      setToast({
        message: `Cannot issue book: Member '${selectedMember.name}' is ${selectedMember.status}. Active status is required.`,
        type: 'error'
      });
      return;
    }
    if (!selectedBook) {
      setToast({ message: 'Please select a book to issue', type: 'error' });
      return;
    }
    if (!selectedCopyId) {
      setToast({ message: 'No available physical copy selected for this title', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/transactions/issue', {
        member_id: selectedMember.member_id,
        copy_id: parseInt(selectedCopyId),
        due_days: parseInt(dueDays),
        issue_date: issueDate,
      });

      const successData = {
        transaction_id: res.transaction_id,
        member_name: selectedMember.name,
        member_id: selectedMember.member_id,
        book_title: selectedBook.title,
        copy_id: selectedCopyId,
        issue_date: res.issue_date || issueDate,
        due_date: res.due_date || calculatedDueDate(),
      };
      setLastIssuedTx(successData);

      setToast({
        message: `Book "${selectedBook.title}" successfully issued to ${selectedMember.name}!`,
        type: 'success',
      });

      // Refresh catalog data in background
      loadInitialData();
    } catch (err) {
      setToast({ message: err.message || 'Failed to issue book', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedBook(null);
    setSelectedCopyId('');
    setBookSearch('');
    setLastIssuedTx(null);
  };

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Issue Book to Patron</h2>
          <p>
            Circulation Management: Verify patron active status, select book from available inventory, assign barcode copy, and record borrow transaction in MySQL database.
          </p>
        </div>
      </div>

      {/* Success Banner if Book Just Issued */}
      {lastIssuedTx && (
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '2px solid #10b981',
            borderRadius: '12px',
            marginBottom: '28px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#065f46', margin: 0 }}>
                  Transaction #{lastIssuedTx.transaction_id} Successfully Recorded!
                </h3>
                <p style={{ fontSize: '13px', color: '#047857', marginTop: '2px', margin: 0 }}>
                  <strong>{lastIssuedTx.book_title}</strong> (Copy #{lastIssuedTx.copy_id}) is now loaned to <strong>{lastIssuedTx.member_name}</strong>. Due on <strong>{lastIssuedTx.due_date}</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate(`/members/${lastIssuedTx.member_id}`)}
                className="btn btn-secondary btn-sm"
                style={{ backgroundColor: 'white', borderColor: '#a7f3d0', color: '#065f46', fontWeight: 700 }}
              >
                View Patron Profile
              </button>
              <button
                onClick={handleResetForm}
                className="btn btn-success btn-sm"
                style={{ gap: '4px' }}
              >
                Issue Another Book
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.95fr', gap: '28px', alignItems: 'flex-start' }}>
        {/* Left Column: 4-Step Issue Circulation Form */}
        <div className="card">
          <form onSubmit={handleIssueBook}>
            {/* Step 1: Member Selection */}
            <div style={{ marginBottom: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: selectedMember ? '#10b981' : '#4f46e5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {selectedMember ? '✓' : '1'}
                  </span>
                  <label style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                    Select Member / Patron *
                  </label>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {allMembers.filter((m) => m.status === 'ACTIVE').length} Active Patrons Available
                </span>
              </div>

              {selectedMember ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: selectedMember.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2',
                    border: selectedMember.status === 'ACTIVE' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: selectedMember.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {selectedMember.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                        {selectedMember.name} <span style={{ color: '#64748b', fontWeight: 500 }}>(#{selectedMember.member_id})</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {selectedMember.email} • {selectedMember.phone}
                      </div>
                      {selectedMember.status !== 'ACTIVE' && (
                        <div style={{ color: '#b91c1c', fontSize: '11.5px', fontWeight: 700, marginTop: '2px' }}>
                          ⚠️ Status is {selectedMember.status}. Must be ACTIVE to borrow books.
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant={selectedMember.status.toLowerCase()}>{selectedMember.status}</Badge>
                    <button
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      className="btn btn-secondary btn-sm"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Search Input */}
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                      }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Type patron name, phone, or email to search..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </div>

                  {/* Dropdown Selector of All Active Members */}
                  <select
                    className="form-control"
                    onChange={(e) => {
                      const m = allMembers.find((mem) => mem.member_id === parseInt(e.target.value));
                      if (m) setSelectedMember(m);
                    }}
                    value=""
                    style={{ marginBottom: '10px', fontSize: '13px' }}
                  >
                    <option value="">-- Choose Patron from List ({filteredMembers.length} matches) --</option>
                    {filteredMembers.map((m) => (
                      <option key={m.member_id} value={m.member_id}>
                        {m.name} (#{m.member_id}) - [{m.status}] - {m.email}
                      </option>
                    ))}
                  </select>

                  {/* Quick Pick Patron Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Quick select active patron:</span>
                    {allMembers
                      .filter((m) => m.status === 'ACTIVE')
                      .slice(0, 4)
                      .map((m) => (
                        <button
                          key={m.member_id}
                          type="button"
                          onClick={() => setSelectedMember(m)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '999px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            color: '#334155',
                            fontWeight: 600,
                          }}
                        >
                          + {m.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Book Selection */}
            <div style={{ marginBottom: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: selectedBook ? '#10b981' : '#4f46e5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {selectedBook ? '✓' : '2'}
                  </span>
                  <label style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                    Select Book from Catalog *
                  </label>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {allBooks.length} Titles Currently In Stock
                </span>
              </div>

              {selectedBook ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '14px' }}>
                        {selectedBook.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#1d4ed8' }}>
                        ISBN: {selectedBook.isbn} • {selectedBook.genre?.genre_name || selectedBook.genre_name || 'General'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                        By {selectedBook.authors?.map((a) => a.author_name).join(', ') || 'Catalog Author'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(null);
                      setSelectedCopyId('');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  {/* Search Input */}
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                      }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Type book title, ISBN, or author..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                    />
                  </div>

                  {/* Dropdown Selector of Available Books */}
                  <select
                    className="form-control"
                    onChange={(e) => {
                      const b = allBooks.find((item) => item.book_id === parseInt(e.target.value));
                      if (b) setSelectedBook(b);
                    }}
                    value=""
                    style={{ marginBottom: '10px', fontSize: '13px' }}
                  >
                    <option value="">-- Choose Available Book from Catalog ({filteredBooks.length} matches) --</option>
                    {filteredBooks.map((b) => (
                      <option key={b.book_id} value={b.book_id}>
                        {b.title} ({b.available_copies} of {b.total_copies} available) - ISBN: {b.isbn}
                      </option>
                    ))}
                  </select>

                  {/* Quick Pick Popular Book Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Quick pick in-stock title:</span>
                    {allBooks.slice(0, 3).map((b) => (
                      <button
                        key={b.book_id}
                        type="button"
                        onClick={() => setSelectedBook(b)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          color: '#334155',
                          fontWeight: 600,
                          maxWidth: '180px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={b.title}
                      >
                        + {b.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Physical Copy Barcode Selection */}
            {selectedBook && (
              <div style={{ marginBottom: '26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: selectedCopyId ? '#10b981' : '#4f46e5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {selectedCopyId ? '✓' : '3'}
                  </span>
                  <label style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                    Select Physical Copy / Barcode *
                  </label>
                </div>

                {loadingCopies ? (
                  <div style={{ padding: '10px', fontSize: '13px', color: '#64748b' }}>
                    <RefreshCw className="spin" size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    Checking copy availability in MySQL database...
                  </div>
                ) : availableCopies.length === 0 ? (
                  <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
                    <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    No copies are currently available in inventory for this title. All are checked out. You can create a waitlist reservation instead.
                  </div>
                ) : (
                  <div>
                    <select
                      className="form-control"
                      value={selectedCopyId}
                      onChange={(e) => setSelectedCopyId(e.target.value)}
                      required
                      style={{ fontSize: '13.5px', fontWeight: 600 }}
                    >
                      {availableCopies.map((c) => (
                        <option key={c.copy_id} value={c.copy_id}>
                          Physical Copy #{c.copy_id} • Barcode: {c.barcode} (Status: AVAILABLE)
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                      ✓ {availableCopies.length} copy/copies ready for loan. Copy #{selectedCopyId} pre-selected.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Loan Period & Due Date Calculation */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  4
                </span>
                <label style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                  Lending Period & Dates
                </label>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Loan Duration (Days)</label>
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
              </div>

              <div style={{ fontSize: '13px', color: '#0369a1', background: '#f0f9ff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                <Clock size={15} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#0284c7' }} />
                Calculated Due Date: <strong style={{ color: '#0369a1', fontSize: '14px' }}>{calculatedDueDate()}</strong> (Late fee of ₹5.00/day applies thereafter)
              </div>
            </div>

            {/* Validation Callout if Form is Incomplete */}
            {(!selectedMember || !selectedBook || availableCopies.length === 0 || selectedMember?.status !== 'ACTIVE') && (
              <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '18px', fontSize: '12.5px', color: '#92400e' }}>
                <Info size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                <strong>To complete issue:</strong>
                {!selectedMember && ' Choose a library patron.'}
                {selectedMember && selectedMember.status !== 'ACTIVE' && ` Patron status is ${selectedMember.status} (must be ACTIVE).`}
                {!selectedBook && ' Select a book from the catalog.'}
                {selectedBook && availableCopies.length === 0 && ' This title has no available copies.'}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '15px',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
              }}
              disabled={submitting || !selectedMember || !selectedBook || availableCopies.length === 0 || selectedMember?.status !== 'ACTIVE'}
            >
              {submitting ? (
                <>
                  <RefreshCw className="spin" size={17} /> Recording Transaction in MySQL...
                </>
              ) : (
                <>
                  Confirm & Issue Book <ArrowUpRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Live Transaction Preview Card */}
        <div>
          <div
            className="card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              position: 'sticky',
              top: '90px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <Sparkles size={18} color="#4f46e5" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Borrow Transaction Preview
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Borrower Patron:
                </span>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', marginTop: '2px' }}>
                  {selectedMember ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {selectedMember.name} <Badge variant={selectedMember.status.toLowerCase()}>{selectedMember.status}</Badge>
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Awaiting patron selection...</span>
                  )}
                </div>
                {selectedMember && (
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    Patron ID: #{selectedMember.member_id} • {selectedMember.email}
                  </div>
                )}
              </div>

              <div style={{ paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Selected Book Title:
                </span>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', marginTop: '2px' }}>
                  {selectedBook ? selectedBook.title : <span style={{ color: '#94a3b8' }}>Awaiting book selection...</span>}
                </div>
                {selectedBook && (
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    ISBN: {selectedBook.isbn} • {selectedBook.genre?.genre_name || selectedBook.genre_name || 'General'}
                  </div>
                )}
              </div>

              <div style={{ paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Physical Inventory Copy:
                </span>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', marginTop: '2px' }}>
                  {selectedCopyId ? (
                    `Physical Copy #${selectedCopyId}`
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Will assign upon book choice</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                    Issue Date:
                  </span>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
                    {issueDate}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                    Due Date:
                  </span>
                  <div style={{ fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                    {calculatedDueDate()}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Database Automation:
                </span>
                <ul style={{ fontSize: '12px', color: '#475569', marginTop: '4px', paddingLeft: '16px' }}>
                  <li>Inserts row into <code>borrow_transactions</code></li>
                  <li>Sets <code>book_copies.status = 'ISSUED'</code></li>
                  <li>Enforces MySQL trigger constraint on active member</li>
                  <li>Overdue rate: ₹5.00 / day applied on return</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
