import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Tag,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const MembersPage = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    preferred_genre_ids: [],
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/members', {
        search: search.trim(),
        status: statusFilter,
      });
      setMembers(data);
    } catch (err) {
      setToast({ message: err.message || 'Error fetching members', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const data = await api.get('/genres');
      setGenres(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMembers();
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'ACTIVE',
      preferred_genre_ids: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m) => {
    setEditingMember(m);
    setFormData({
      name: m.name,
      email: m.email,
      phone: m.phone,
      status: m.status,
      preferred_genre_ids: m.preferred_genres?.map((g) => g.genre_id) || [],
    });
    setIsModalOpen(true);
  };

  const handleGenreToggle = (genreId) => {
    setFormData((prev) => {
      const current = prev.preferred_genre_ids;
      if (current.includes(genreId)) {
        return { ...prev, preferred_genre_ids: current.filter((id) => id !== genreId) };
      } else {
        return { ...prev, preferred_genre_ids: [...current, genreId] };
      }
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await api.put(`/members/${editingMember.member_id}`, formData);
        setToast({ message: 'Member details updated successfully!', type: 'success' });
      } else {
        await api.post('/members', formData);
        setToast({ message: 'New member registered successfully!', type: 'success' });
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (err) {
      setToast({ message: err.message || 'Failed to save member', type: 'error' });
    }
  };

  const handleDeleteMember = async (m) => {
    if (!window.confirm(`Are you sure you want to delete member '${m.name}'?`)) {
      return;
    }
    try {
      await api.delete(`/members/${m.member_id}`);
      setToast({ message: 'Member deleted successfully', type: 'success' });
      fetchMembers();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete member', type: 'error' });
    }
  };

  return (
    <div>
      {/* Toast Alert */}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h2>Member Registry & patron Database</h2>
          <p>
            Manage patron accounts, inspect loan histories, and access individual recommendation profiles.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <UserPlus size={16} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="filter-input">
          <input
            type="text"
            placeholder="Search member by name, email, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-select" style={{ minWidth: '160px' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>

        <button onClick={fetchMembers} className="btn btn-secondary">
          <Search size={15} />
          <span>Search</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Contact Info</th>
              <th>Preferred Genres</th>
              <th>Status</th>
              <th>Active Loans</th>
              <th>Joined Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading members from MySQL database...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No members found matching your search.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.member_id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.name}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>ID: #{m.member_id}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12.5px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                        <Mail size={12} color="#64748b" /> {m.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                        <Phone size={12} color="#94a3b8" /> {m.phone}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                      {m.preferred_genres && m.preferred_genres.length > 0 ? (
                        m.preferred_genres.map((g) => (
                          <span
                            key={g.genre_id}
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#eef2ff',
                              color: '#4338ca',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            {g.genre_name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>None set</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge variant={m.status.toLowerCase()}>{m.status}</Badge>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: m.active_borrows_count > 0 ? '#0284c7' : '#64748b' }}>
                      {m.active_borrows_count} book(s)
                    </span>
                    {m.overdue_count > 0 && (
                      <span style={{ marginLeft: '6px', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                        ({m.overdue_count} overdue!)
                      </span>
                    )}
                  </td>
                  <td style={{ color: '#64748b', fontSize: '12.5px' }}>{m.join_date}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => navigate(`/members/${m.member_id}`)}
                        className="btn btn-primary btn-sm"
                        title="View Full Member Profile & Personalized Recommendations"
                        style={{ gap: '4px' }}
                      >
                        <Sparkles size={13} />
                        <span>Profile & Recoms</span>
                      </button>
                      {m.status === 'ACTIVE' && (
                        <button
                          onClick={() => navigate(`/issue?member_id=${m.member_id}`)}
                          className="btn btn-secondary btn-sm"
                          title="Issue a book directly to this patron"
                          style={{ gap: '4px', color: '#4f46e5', borderColor: '#c7d2fe' }}
                        >
                          <ArrowUpRight size={13} />
                          <span>Issue</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(m)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Member"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(m)}
                        className="btn btn-danger btn-sm"
                        title="Delete Member"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMember ? `Edit Member: ${editingMember.name}` : 'Register New Member'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Pragati Ulman"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="pragati@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91-9823456781"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Membership Status</label>
            <select
              className="form-control"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>

          <div className="form-group">
            <label>Preferred Genres (Select all that apply for AI Recommendations)</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
              }}
            >
              {genres.map((g) => {
                const isSelected = formData.preferred_genre_ids.includes(g.genre_id);
                return (
                  <label
                    key={g.genre_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleGenreToggle(g.genre_id)}
                    />
                    <span>{g.genre_name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingMember ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

