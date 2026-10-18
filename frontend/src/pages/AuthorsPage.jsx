import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const AuthorsPage = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [authorName, setAuthorName] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const data = await api.get('/authors');
      setAuthors(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load authors', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const handleOpenAdd = () => {
    setEditingAuthor(null);
    setAuthorName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a) => {
    setEditingAuthor(a);
    setAuthorName(a.author_name);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAuthor) {
        await api.put(`/authors/${editingAuthor.author_id}`, { author_name: authorName.trim() });
        setToast({ message: 'Author updated successfully', type: 'success' });
      } else {
        await api.post('/authors', { author_name: authorName.trim() });
        setToast({ message: 'Author added successfully', type: 'success' });
      }
      setIsModalOpen(false);
      fetchAuthors();
    } catch (err) {
      setToast({ message: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete author "${a.author_name}"?`)) return;
    try {
      await api.delete(`/authors/${a.author_id}`);
      setToast({ message: 'Author deleted successfully', type: 'success' });
      fetchAuthors();
    } catch (err) {
      setToast({ message: err.message || 'Delete failed', type: 'error' });
    }
  };

  const filtered = authors.filter((a) =>
    a.author_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Authors Registry</h2>
          <p>Maintain author records for catalog classification and recommendation affinity scoring.</p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} /> Add Author
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-input">
          <input
            type="text"
            placeholder="Search author name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Author Name</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px' }}>Loading authors...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px' }}>No authors found.</td></tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.author_id}>
                  <td><code>#{a.author_id}</code></td>
                  <td style={{ fontWeight: 600 }}>{a.author_name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => handleOpenEdit(a)} className="btn btn-secondary btn-sm" style={{ marginRight: '6px' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(a)} className="btn btn-danger btn-sm">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAuthor ? 'Edit Author' : 'Add New Author'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Author Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Abraham Silberschatz"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
            />
          </div>
          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editingAuthor ? 'Save Changes' : 'Create Author'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

