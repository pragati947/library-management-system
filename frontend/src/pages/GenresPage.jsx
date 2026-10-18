import React, { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const GenresPage = () => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState(null);
  const [genreName, setGenreName] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchGenres = async () => {
    setLoading(true);
    try {
      const data = await api.get('/genres');
      setGenres(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load genres', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const handleOpenAdd = () => {
    setEditingGenre(null);
    setGenreName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g) => {
    setEditingGenre(g);
    setGenreName(g.genre_name);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGenre) {
        await api.put(`/genres/${editingGenre.genre_id}`, { genre_name: genreName.trim() });
        setToast({ message: 'Genre updated successfully', type: 'success' });
      } else {
        await api.post('/genres', { genre_name: genreName.trim() });
        setToast({ message: 'Genre created successfully', type: 'success' });
      }
      setIsModalOpen(false);
      fetchGenres();
    } catch (err) {
      setToast({ message: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleDelete = async (g) => {
    if (!window.confirm(`Delete genre "${g.genre_name}"?`)) return;
    try {
      await api.delete(`/genres/${g.genre_id}`);
      setToast({ message: 'Genre deleted successfully', type: 'success' });
      fetchGenres();
    } catch (err) {
      setToast({ message: err.message || 'Delete failed', type: 'error' });
    }
  };

  const filtered = genres.filter((g) =>
    g.genre_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Genres & Category Taxonomy</h2>
          <p>Define literary genres used for book categorization and recommendation preferences.</p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} /> Add Genre
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-input">
          <input
            type="text"
            placeholder="Search genre name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Genre ID</th>
              <th>Genre Name</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px' }}>Loading genres...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px' }}>No genres found.</td></tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.genre_id}>
                  <td><code>#{g.genre_id}</code></td>
                  <td style={{ fontWeight: 600 }}>{g.genre_name}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => handleOpenEdit(g)} className="btn btn-secondary btn-sm" style={{ marginRight: '6px' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(g)} className="btn btn-danger btn-sm">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGenre ? 'Edit Genre' : 'Add New Genre'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Genre Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Database Systems"
              value={genreName}
              onChange={(e) => setGenreName(e.target.value)}
              required
            />
          </div>
          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editingGenre ? 'Save Changes' : 'Create Genre'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

