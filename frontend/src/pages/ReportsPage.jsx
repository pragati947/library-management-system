import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  Star,
  Users,
  BookmarkCheck,
  BookX,
  Layers,
  Award,
  RefreshCw,
  Search,
  Database,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';

export const ReportsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('most-borrowed');
  
  // Independent cache per tab - avoids cross-tab data collisions & crashes
  const [reportsCache, setReportsCache] = useState({
    'most-borrowed': null,
    'popular-genres': null,
    'borrowed-authors': null,
    'top-members': null,
    'overdue': null,
    'fines': null,
    'never-borrowed': null,
    'top-rated': null,
    'reservations': null,
  });

  const [loadingTab, setLoadingTab] = useState(null);
  const [error, setError] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const reportTabs = [
    {
      id: 'most-borrowed',
      category: 'circulation',
      label: 'Most Borrowed Books',
      icon: TrendingUp,
      color: '#4f46e5',
      concept: 'GROUP BY Book.book_id HAVING COUNT(BorrowTransaction) > 0 ORDER BY borrow_count DESC',
      description: 'Identifies the most popular books in circulation using aggregate COUNT and average patron rating.'
    },
    {
      id: 'popular-genres',
      category: 'circulation',
      label: 'Popular Genres',
      icon: Layers,
      color: '#0ea5e9',
      concept: 'COUNT(DISTINCT Book.book_id), COUNT(BorrowTransaction) GROUP BY Genre.genre_id',
      description: 'Circulation volume and catalog depth grouped by genre to guide library purchasing.'
    },
    {
      id: 'borrowed-authors',
      category: 'circulation',
      label: 'Top Borrowed Authors',
      icon: Award,
      color: '#10b981',
      concept: 'JOIN book_authors, books, borrow_transactions GROUP BY Author.author_id HAVING COUNT > 0',
      description: 'Authors with highest total loans across all their authored library titles.'
    },
    {
      id: 'top-members',
      category: 'patrons',
      label: 'Active Patron Activity',
      icon: Users,
      color: '#6366f1',
      concept: 'GROUP BY Member.member_id, COUNT(BorrowTransaction), SUM(fine_amount)',
      description: 'Patrons ranked by borrowing frequency, active book holdings, and historical fines.'
    },
    {
      id: 'overdue',
      category: 'patrons',
      label: 'Overdue Loans List',
      icon: AlertTriangle,
      color: '#ef4444',
      concept: 'WHERE return_date IS NULL AND due_date < CURDATE() with dynamic fine calculation',
      description: 'Actionable list of all unreturned books past their due date with projected late fees.'
    },
    {
      id: 'fines',
      category: 'patrons',
      label: 'Fine Revenue Summary',
      icon: IndianRupee,
      color: '#f59e0b',
      concept: 'SUM(fine_amount), COUNT(transactions with fine > 0) with audit trail',
      description: 'Total revenue collected from overdue fines with recent transactions log.'
    },
    {
      id: 'never-borrowed',
      category: 'catalog',
      label: 'Never Borrowed Titles',
      icon: BookX,
      color: '#8b5cf6',
      concept: 'SQL SUBQUERY: WHERE book_id NOT IN (SELECT copy.book_id FROM borrow_transactions)',
      description: 'Demonstrates correlated SQL subquery. Surfaces idle catalog titles never borrowed.'
    },
    {
      id: 'top-rated',
      category: 'catalog',
      label: 'Highest Rated Books',
      icon: Star,
      color: '#d97706',
      concept: 'ROUND(AVG(Rating.rating), 2) GROUP BY Book.book_id ORDER BY avg_rating DESC',
      description: 'Books with the highest satisfaction scores based on member feedback.'
    },
    {
      id: 'reservations',
      category: 'catalog',
      label: 'Reservation Pipeline',
      icon: BookmarkCheck,
      color: '#06b6d4',
      concept: 'GROUP BY Reservation.status, and waitlist queue ranking',
      description: 'Pending, fulfilled, and cancelled reservation queues with demand analytics.'
    },
  ];

  const currentTabConfig = reportTabs.find((t) => t.id === activeTab) || reportTabs[0];

  // Fetch a single report and cache it
  const fetchSingleReport = async (tabId, force = false) => {
    if (!force && reportsCache[tabId]) {
      return reportsCache[tabId];
    }
    setLoadingTab(tabId);
    setError('');
    try {
      const data = await api.get(`/reports/${tabId}`);
      setReportsCache((prev) => ({ ...prev, [tabId]: data }));
      return data;
    } catch (err) {
      setError(err.message || `Failed to generate report: ${tabId}`);
      return null;
    } finally {
      setLoadingTab(null);
    }
  };

  // Pre-load all reports concurrently on mount so every tab switch is instant
  useEffect(() => {
    // 1. Immediately fetch the active tab
    fetchSingleReport(activeTab);

    // 2. Pre-fetch remaining reports in parallel background
    reportTabs.forEach((tab) => {
      if (tab.id !== activeTab && !reportsCache[tab.id]) {
        api.get(`/reports/${tab.id}`)
          .then((data) => {
            setReportsCache((prev) => ({ ...prev, [tab.id]: data }));
          })
          .catch((e) => {
            console.error(`Background prefetch error for ${tab.id}:`, e);
          });
      }
    });
  }, []);

  // When activeTab changes, fetch if not already in cache
  useEffect(() => {
    setFilterQuery('');
    if (!reportsCache[activeTab]) {
      fetchSingleReport(activeTab);
    }
  }, [activeTab]);

  // Refresh current active report
  const handleRefreshCurrent = () => {
    fetchSingleReport(activeTab, true);
  };

  const filteredTabs = useMemo(() => {
    if (categoryFilter === 'all') return reportTabs;
    return reportTabs.filter((t) => t.category === categoryFilter);
  }, [categoryFilter]);

  // Current active data from cache
  const currentData = reportsCache[activeTab];
  const isCurrentLoading = loadingTab === activeTab || !currentData;

  // Export report as CSV
  const handleExportCSV = () => {
    if (!currentData) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (Array.isArray(currentData)) {
      if (currentData.length === 0) return;
      const headers = Object.keys(currentData[0]);
      csvContent += headers.join(',') + '\r\n';
      currentData.forEach((row) => {
        csvContent += headers.map((h) => `"${row[h] ?? ''}"`).join(',') + '\r\n';
      });
    } else {
      csvContent += 'Metric,Value\r\n';
      Object.entries(currentData).forEach(([k, v]) => {
        if (typeof v !== 'object') {
          csvContent += `"${k}","${v}"\r\n`;
        }
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `report-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Page Title & Actions */}
      <div className="page-header">
        <div className="page-title">
          <h2>Database Reports & SQL Aggregations</h2>
          <p>
            Real-time MySQL 8.0 analytics powered by GROUP BY, HAVING, COUNT, AVG, SUM, Multi-table JOINs, and Subqueries.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ gap: '6px' }} title="Download as CSV">
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <button onClick={handleRefreshCurrent} className="btn btn-secondary" style={{ gap: '6px' }}>
            <RefreshCw size={15} className={isCurrentLoading ? 'spin' : ''} /> Refresh Current
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
          Filter Panels:
        </span>
        {[
          { id: 'all', label: 'All 9 Reports' },
          { id: 'circulation', label: '📊 Circulation & Popularity' },
          { id: 'patrons', label: '👥 Patron Activity & Overdues' },
          { id: 'catalog', label: '📚 Catalog, Stock & Demand' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: categoryFilter === cat.id ? '1px solid #4f46e5' : '1px solid #e2e8f0',
              backgroundColor: categoryFilter === cat.id ? '#eef2ff' : '#ffffff',
              color: categoryFilter === cat.id ? '#4f46e5' : '#64748b',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 9 Responsive Report Panels Grid - Instant Clickable Navigation */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {filteredTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCached = !!reportsCache[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '12px',
                border: isActive ? `2px solid ${tab.color}` : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#f8faff' : '#ffffff',
                color: isActive ? '#0f172a' : '#475569',
                fontWeight: isActive ? 700 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isActive ? `0 6px 18px rgba(79, 70, 229, 0.15)` : '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  backgroundColor: isActive ? tab.color : '#f1f5f9',
                  color: isActive ? '#ffffff' : tab.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Icon size={18} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>
                  {tab.label}
                </div>
                <div style={{ fontSize: '11px', color: isActive ? tab.color : '#94a3b8', textTransform: 'capitalize', fontWeight: 500, marginTop: '1px' }}>
                  {tab.category} panel {isCached && !isActive ? '• ready' : ''}
                </div>
              </div>

              {isActive && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: tab.color,
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Relational DBMS Concept & SQL Banner */}
      <div className="report-concept-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Database size={16} color="#059669" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#065f46' }}>
              Relational DBMS Concept: {currentTabConfig.label}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#047857', margin: 0 }}>
            {currentTabConfig.description}
          </p>
        </div>
        <div style={{ maxWidth: '100%' }}>
          <code>{currentTabConfig.concept}</code>
        </div>
      </div>

      {/* Report Content Body */}
      {isCurrentLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <RefreshCw className="spin" size={32} style={{ margin: '0 auto 12px', color: '#4f46e5' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Executing SQL Query on MySQL Engine</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Aggregating relational table records for <strong>{currentTabConfig.label}</strong>...
          </p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, marginBottom: '6px' }}>
            <AlertTriangle size={18} /> Error Generating Report
          </div>
          <p style={{ fontSize: '13px' }}>{error}</p>
          <button onClick={handleRefreshCurrent} className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
            Retry Query
          </button>
        </div>
      ) : (
        <div className="card">
          {/* Internal Search / Filter Bar for Table Data */}
          {Array.isArray(currentData) && currentData.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter rows in this report..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                Showing {currentData.length} total database records
              </div>
            </div>
          )}

          {/* TAB 1: MOST BORROWED BOOKS */}
          {activeTab === 'most-borrowed' && (
            <div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Book Title</th>
                      <th>ISBN</th>
                      <th>Genre</th>
                      <th>Total Borrows</th>
                      <th>Patron Rating</th>
                      <th style={{ textAlign: 'right' }}>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(currentData) ? currentData : [])
                      .filter((b) => {
                        if (!filterQuery) return true;
                        const q = filterQuery.toLowerCase();
                        return (
                          (b.title || '').toLowerCase().includes(q) ||
                          (b.isbn || '').toLowerCase().includes(q) ||
                          (b.genre || '').toLowerCase().includes(q)
                        );
                      })
                      .map((b, i) => (
                        <tr key={b.book_id}>
                          <td><strong>#{i + 1}</strong></td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.title}</td>
                          <td><code>{b.isbn}</code></td>
                          <td><span className="badge badge-info">{b.genre}</span></td>
                          <td><strong style={{ color: '#4f46e5', fontSize: '14px' }}>{b.borrow_count ?? 0} loans</strong></td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#d97706', fontWeight: 700 }}>
                              <Star size={13} fill="#f59e0b" color="#f59e0b" /> {b.avg_rating > 0 ? b.avg_rating : 'Unrated'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => navigate(`/issue?book_id=${b.book_id}`)}
                              className="btn btn-primary btn-sm"
                              style={{ gap: '4px' }}
                            >
                              <ArrowUpRight size={13} /> Issue Title
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: POPULAR GENRES */}
          {activeTab === 'popular-genres' && (
            <div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Genre ID</th>
                      <th>Genre Category Name</th>
                      <th>Catalog Titles</th>
                      <th>Total Borrow Checkouts</th>
                      <th>Circulation Intensity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(currentData) ? currentData : [])
                      .filter((g) => {
                        if (!filterQuery) return true;
                        return (g.genre_name || '').toLowerCase().includes(filterQuery.toLowerCase());
                      })
                      .map((g) => {
                        const titles = g.total_titles || 0;
                        const borrows = g.total_borrows || 0;
                        const intensity = titles > 0 ? (borrows / titles).toFixed(1) : '0';
                        return (
                          <tr key={g.genre_id}>
                            <td>#{g.genre_id}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{g.genre_name}</td>
                            <td>{titles} titles</td>
                            <td><strong style={{ color: '#0ea5e9', fontSize: '14px' }}>{borrows} loans</strong></td>
                            <td>
                              <span className="badge badge-neutral">
                                {intensity} checkouts / title
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BORROWED AUTHORS */}
          {activeTab === 'borrowed-authors' && (
            <div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Author Name</th>
                      <th>Author ID</th>
                      <th>Cumulative Circulated Loans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(currentData) ? currentData : [])
                      .filter((a) => {
                        if (!filterQuery) return true;
                        return (a.author_name || '').toLowerCase().includes(filterQuery.toLowerCase());
                      })
                      .map((a, i) => (
                        <tr key={a.author_id}>
                          <td><strong>#{i + 1}</strong></td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{a.author_name}</td>
                          <td><code>#{a.author_id}</code></td>
                          <td><strong style={{ color: '#059669', fontSize: '14px' }}>{a.total_loans ?? 0} checkouts</strong></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TOP MEMBERS */}
          {activeTab === 'top-members' && (
            <div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patron Name</th>
                      <th>Email</th>
                      <th>Membership Status</th>
                      <th>Total Checkouts</th>
                      <th>Currently Active</th>
                      <th>Fines Assessed</th>
                      <th style={{ textAlign: 'right' }}>Patron Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(currentData) ? currentData : [])
                      .filter((m) => {
                        if (!filterQuery) return true;
                        const q = filterQuery.toLowerCase();
                        return (
                          (m.name || '').toLowerCase().includes(q) ||
                          (m.email || '').toLowerCase().includes(q)
                        );
                      })
                      .map((m) => {
                        const status = m.status || 'ACTIVE';
                        return (
                          <tr key={m.member_id}>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{m.name || 'Patron'}</td>
                            <td>{m.email || 'N/A'}</td>
                            <td><Badge variant={status.toLowerCase()}>{status}</Badge></td>
                            <td><strong style={{ color: '#4f46e5' }}>{m.total_borrowed ?? 0}</strong></td>
                            <td>
                              <span style={{ color: (m.currently_active || 0) > 0 ? '#0284c7' : '#64748b', fontWeight: 600 }}>
                                {m.currently_active ?? 0} books
                              </span>
                            </td>
                            <td>₹{Number(m.fines_recorded || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => navigate(`/members/${m.member_id}`)}
                                className="btn btn-secondary btn-sm"
                                style={{ gap: '4px' }}
                              >
                                <ArrowUpRight size={13} /> View Profile
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: OVERDUE LOANS */}
          {activeTab === 'overdue' && (
            <div>
              {Array.isArray(currentData) && currentData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#059669' }}>
                  <CheckCircle2 size={36} style={{ margin: '0 auto 10px' }} />
                  <h4 style={{ fontWeight: 700 }}>Zero Overdue Loans!</h4>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    All currently borrowed books are within their active lending period.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tx ID</th>
                        <th>Patron Name</th>
                        <th>Phone</th>
                        <th>Book Title</th>
                        <th>Barcode</th>
                        <th>Due Date</th>
                        <th>Days Overdue</th>
                        <th>Projected Fine (₹5/day)</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(currentData) ? currentData : [])
                        .filter((o) => {
                          if (!filterQuery) return true;
                          const q = filterQuery.toLowerCase();
                          return (
                            (o.member_name || '').toLowerCase().includes(q) ||
                            (o.book_title || '').toLowerCase().includes(q) ||
                            (o.barcode || '').toLowerCase().includes(q)
                          );
                        })
                        .map((o) => (
                          <tr key={o.transaction_id}>
                            <td><code>#{o.transaction_id}</code></td>
                            <td style={{ fontWeight: 700 }}>{o.member_name || 'Patron'}</td>
                            <td>{o.phone || 'N/A'}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{o.book_title || 'N/A'}</td>
                            <td><code>{o.barcode || 'N/A'}</code></td>
                            <td style={{ color: '#dc2626', fontWeight: 700 }}>{o.due_date || 'N/A'}</td>
                            <td><span className="badge badge-danger">{o.days_overdue ?? 0} days</span></td>
                            <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '14px' }}>
                              ₹{Number(o.projected_fine || 0).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => navigate(`/return?search=${o.transaction_id}`)}
                                className="btn btn-secondary btn-sm"
                                style={{ gap: '4px', color: '#059669', borderColor: '#a7f3d0' }}
                              >
                                Return & Collect
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FINES SUMMARY */}
          {activeTab === 'fines' && (
            <div>
              {(() => {
                const finesObj = currentData && typeof currentData === 'object' && !Array.isArray(currentData) ? currentData : {};
                const totalFine = Number(finesObj.total_fine_collected || 0);
                const finedCount = Number(finesObj.total_fined_transactions || 0);
                const avgFine = finedCount > 0 ? (totalFine / finedCount).toFixed(2) : '0.00';
                const recentList = Array.isArray(finesObj.recent_fined_transactions) ? finesObj.recent_fined_transactions : [];

                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>
                          Total Late Fines Collected
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                          ₹{totalFine.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '2px' }}>
                          Aggregated via <code>SUM(fine_amount)</code>
                        </div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>
                          Fined Return Transactions
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                          {finedCount}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: '2px' }}>
                          Returns with overdue assessment
                        </div>
                      </div>

                      <div style={{ padding: '16px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>
                          Average Fine per Penalty
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                          ₹{avgFine}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '2px' }}>
                          Standard rate: ₹5.00/day
                        </div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '14.5px', fontWeight: 700, marginBottom: '12px', color: '#0f172a' }}>
                      Recent Overdue Fine Transaction Audit Log
                    </h4>

                    {recentList.length === 0 ? (
                      <p style={{ color: '#64748b', fontStyle: 'italic', padding: '16px' }}>
                        No overdue fine records found in history.
                      </p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Tx ID</th>
                              <th>Patron</th>
                              <th>Book Title</th>
                              <th>Return Date</th>
                              <th>Fine Collected</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentList.map((r) => (
                              <tr key={r.transaction_id}>
                                <td><code>#{r.transaction_id}</code></td>
                                <td style={{ fontWeight: 600 }}>{r.member_name}</td>
                                <td>{r.book_title}</td>
                                <td>{r.return_date}</td>
                                <td><strong style={{ color: '#dc2626', fontSize: '14px' }}>₹{Number(r.fine_amount || 0).toFixed(2)}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 7: BOOKS NEVER BORROWED (SUBQUERY) */}
          {activeTab === 'never-borrowed' && (
            <div>
              <div style={{ marginBottom: '14px', fontSize: '13px', color: '#475569' }}>
                Demonstrating Relational Subquery: <code>NOT IN (SELECT copy.book_id FROM borrow_transactions)</code>. These titles can be promoted or reviewed for acquisitions.
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Book ID</th>
                      <th>Title</th>
                      <th>ISBN</th>
                      <th>Genre</th>
                      <th>Publisher</th>
                      <th>Year</th>
                      <th>Copies in Stock</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(currentData) ? currentData : []).length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#059669' }}>
                          All titles in the library catalog have been borrowed at least once!
                        </td>
                      </tr>
                    ) : (
                      (Array.isArray(currentData) ? currentData : [])
                        .filter((b) => {
                          if (!filterQuery) return true;
                          const q = filterQuery.toLowerCase();
                          return (
                            (b.title || '').toLowerCase().includes(q) ||
                            (b.isbn || '').toLowerCase().includes(q) ||
                            (b.genre || '').toLowerCase().includes(q)
                          );
                        })
                        .map((b) => (
                          <tr key={b.book_id}>
                            <td>#{b.book_id}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.title}</td>
                            <td><code>{b.isbn}</code></td>
                            <td><span className="badge badge-info">{b.genre}</span></td>
                            <td>{b.publisher}</td>
                            <td>{b.publication_year}</td>
                            <td>{b.total_copies ?? 0} physical copies</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => navigate(`/issue?book_id=${b.book_id}`)}
                                className="btn btn-primary btn-sm"
                                style={{ gap: '4px' }}
                              >
                                <ArrowUpRight size={13} /> First Issue
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: TOP RATED BOOKS */}
          {activeTab === 'top-rated' && (
            <div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Book Title</th>
                      <th>Genre</th>
                      <th>Average Member Rating</th>
                      <th>Total Patron Reviews</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(currentData) ? currentData : [])
                      .filter((b) => {
                        if (!filterQuery) return true;
                        const q = filterQuery.toLowerCase();
                        return (
                          (b.title || '').toLowerCase().includes(q) ||
                          (b.genre || '').toLowerCase().includes(q)
                        );
                      })
                      .map((b, i) => (
                        <tr key={b.book_id}>
                          <td><strong>#{i + 1}</strong></td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.title}</td>
                          <td><span className="badge badge-info">{b.genre}</span></td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 800, fontSize: '14px' }}>
                              <Star size={14} fill="#f59e0b" color="#f59e0b" /> {b.avg_rating ?? '0.0'} / 5.0
                            </span>
                          </td>
                          <td>{b.total_ratings ?? 0} patron reviews</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => navigate(`/issue?book_id=${b.book_id}`)}
                              className="btn btn-primary btn-sm"
                              style={{ gap: '4px' }}
                            >
                              <ArrowUpRight size={13} /> Issue Title
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: RESERVATIONS */}
          {activeTab === 'reservations' && (
            <div>
              {(() => {
                const resObj = currentData && typeof currentData === 'object' && !Array.isArray(currentData) ? currentData : {};
                const pending = Number(resObj.pending || 0);
                const fulfilled = Number(resObj.fulfilled || 0);
                const cancelled = Number(resObj.cancelled || 0);
                const total = Number(resObj.total || 0);
                const topBooks = Array.isArray(resObj.top_reserved_books) ? resObj.top_reserved_books : [];

                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                      <div style={{ padding: '14px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
                        <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>Pending in Queue</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                          {pending}
                        </div>
                      </div>
                      <div style={{ padding: '14px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>Fulfilled</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                          {fulfilled}
                        </div>
                      </div>
                      <div style={{ padding: '14px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700 }}>Cancelled</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                          {cancelled}
                        </div>
                      </div>
                      <div style={{ padding: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>Total All Time</div>
                        <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                          {total}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                        Top In-Demand Reserved Books
                      </h4>
                      <button onClick={() => navigate('/reservations')} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                        Manage Waitlist Queue
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Book ID</th>
                            <th>Book Title</th>
                            <th>Waitlist Queue Size</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topBooks.map((b) => (
                            <tr key={b.book_id}>
                              <td>#{b.book_id}</td>
                              <td style={{ fontWeight: 600, color: '#0f172a' }}>{b.title}</td>
                              <td>
                                <span className="badge badge-warning" style={{ fontSize: '12px' }}>
                                  {b.reservations ?? 0} patron waitlist entries
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => navigate(`/reservations`)}
                                  className="btn btn-secondary btn-sm"
                                >
                                  View Queue
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
