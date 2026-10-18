import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';

export const PublishersPage = () => {
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState(null);
  const [formData, setFormData] = useState({ publisher_name: '', city: '' });
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchPublishers = async () => {
    setLoading(true);
    try {
      const data = await api.get('/publishers');
      setPublishers(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load publishers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishers();
  }, []);

  const handleOpenAdd = () => {
    setEditingPublisher(null);
    setFormData({ publisher_name: '', city: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingPublisher(p);
    setFormData({ publisher_name: p.publisher_name, city: p.city || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPublisher) {
        await api.put(`/publishers/${editingPublisher.publisher_id}`, formData);
        setToast({ message: 'Publisher updated successfully', type: 'success' });
      } else {
        await api.post('/publishers', formData);
        setToast({ message: 'Publisher added successfully', type: 'success' });
      }
      setIsModalOpen(false);
      fetchPublishers();
    } catch (err) {
      setToast({ message: err.message || 'Operation failed', type: 'error' });
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete publisher "${p.publisher_name}"?`)) return;
    try {
      await api.delete(`/publishers/${p.publisher_id}`);
      setToast({ message: 'Publisher deleted successfully', type: 'success' });
      fetchPublishers();
    } catch (err) {
      setToast({ message: err.message || 'Delete failed', type: 'error' });
    }
  };

  const filtered = publishers.filter((p) =>
    p.publisher_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.city && p.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Publishers Registry</h2>
          <p>Manage publishing houses and press locations.</p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAdd} className="btn btn-primary">
            <Plus size={16} /> Add Publisher
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-input">
          <input
            type="text"
            placeholder="Search publisher or city..."
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
              <th>Publisher Name</th>
              <th>Headquarters City</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>Loading publishers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>No publishers found.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.publisher_id}>
                  <td><code>#{p.publisher_id}</code></td>
                  <td style={{ fontWeight: 600 }}>{p.publisher_name}</td>
                  <td>{p.city || 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => handleOpenEdit(p)} className="btn btn-secondary btn-sm" style={{ marginRight: '6px' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(p)} className="btn btn-danger btn-sm">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPublisher ? 'Edit Publisher' : 'Add New Publisher'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Publisher Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Pearson Education"
              value={formData.publisher_name}
              onChange={(e) => setFormData({ ...formData, publisher_name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Boston"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div className="modal-footer" style={{ margin: '20px -24px -24px', padding: '16px 24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">{editingPublisher ? 'Save Changes' : 'Create Publisher'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

