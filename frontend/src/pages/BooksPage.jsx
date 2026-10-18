import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Layers,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Toast } from '../components/common/Toast';
import { Badge } from '../components/common/Badge';

export const BooksPage = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [publisherFilter, setPublisherFilter] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    isbn: '',
    publisher_id: '',
    genre_id: '',
    publication_year: 2023,
    author_ids: [],
  });

  // Copies Modal
  const [copiesModalOpen, setCopiesModalOpen] = useState(false);
  const [selectedBookForCopies, setSelectedBookForCopies] = useState(null);
  const [bookCopiesList, setBookCopiesList] = useState([]);
  const [newBarcode, setNewBarcode] = useState('');

  const fetchFiltersData = async () => {
    try {
      const [g, a, p] = await Promise.all([
        api.get('/genres'),
        api.get('/authors'),
        api.get('/publishers'),
      ]);
      setGenres(g);
      setAuthors(a);
      setPublishers(p);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await api.get('/books', {
        search: search.trim(),
        genre_id: genreFilter,
        author_id: authorFilter,
        publisher_id: publisherFilter,
        only_available: onlyAvailable ? 'true' : '',
      });
      setBooks(data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to load books', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [genreFilter, authorFilter, publisherFilter, onlyAvailable]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBooks();
  };

  const handleOpenAddModal = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      isbn: '',
      publisher_id: publishers[0]?.publisher_id || '',
      genre_id: genres[0]?.genre_id || '',
      publication_year: new Date().getFullYear(),
      author_ids: authors[0] ? [authors[0].author_id] : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b) => {
    setEditingBook(b);
    setFormData({
      title: b.title,
      isbn: b.isbn,
      publisher_id: b.publisher_id,
      genre_id: b.genre_id,
      publication_year: b.publication_year,
      author_ids: b.authors?.map((a) => a.author_id) || [],
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await api.put(`/books/${editingBook.book_id}`, formData);
        setToast({ message: 'Book updated successfully', type: 'success' });
      } else {
        await api.post('/books', formData);
        setToast({ message: 'New book created with initial copy!', type: 'success' });
      }
      setIsModalOpen(false);
      fetchBooks();
    } catch (err) {
      setToast({ message: err.message || 'Failed to save book', type: 'error' });
    }
  };

  const handleDeleteBook = async (b) => {
    if (!window.confirm(`Delete book "${b.title}"?`)) return;
    try {
      await api.delete(`/books/${b.book_id}`);
      setToast({ message: 'Book deleted successfully', type: 'success' });
      fetchBooks();
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete book', type: 'error' });
    }
  };

  // Copies Management
  const handleOpenCopiesModal = async (book) => {
    setSelectedBookForCopies(book);
    try {
      const data = await api.get('/copies', { book_id: book.book_id });
      setBookCopiesList(data);
      setNewBarcode(`BC-${book.book_id.toString().padStart(3, '0')}-${String.fromCharCode(65 + data.length)}`);
      setCopiesModalOpen(true);
    } catch (err) {
      setToast({ message: 'Failed to load copies', type: 'error' });
    }
  };

  const handleAddCopy = async (e) => {
    e.preventDefault();
    try {
      await api.post('/copies', {
        book_id: selectedBookForCopies.book_id,
        barcode: newBarcode.trim(),
        status: 'AVAILABLE',
      });
      setToast({ message: 'New copy added to inventory!', type: 'success' });
      // Refresh copies list and books
      const updated = await api.get('/copies', { book_id: selectedBookForCopies.book_id });
      setBookCopiesList(updated);
      setNewBarcode(`BC-${selectedBookForCopies.book_id.toString().padStart(3, '0')}-${String.fromCharCode(65 + updated.length)}`);
      fetchBooks();
    } catch (err) {
      setToast({ message: err.message || 'Failed to add copy', type: 'error' });
    }
  };

  const handleUpdateCopyStatus = async (copyId, newStatus) => {
    try {
      await api.put(`/copies/${copyId}`, { status: newStatus });
      setToast({ message: 'Copy status updated', type: 'success' });
      const updated = await api.get('/copies', { book_id: selectedBookForCopies.book_id });
      setBookCopiesList(updated);
      fetchBooks();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update copy status', type: 'error' });
    }
  };

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>Library Book Catalog</h2>
          <p>Manage titles, ISBNs, authors, publishers, and physical copy inventory.</p>
        </div>
        <div className="page-actions">
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add New Book</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="filter-input">
          <input
            type="text"
            placeholder="Search book title or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="filter-select">
          <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
            <option value="">All Genres</option>
            {genres.map((g) => (
              <option key={g.genre_id} value={g.genre_id}>{g.genre_name}</option>
            ))}
          </select>
        </div>

        <div className="filter-select">
          <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
            <option value="">All Authors</option>
            {authors.map((a) => (
              <option key={a.author_id} value={a.author_id}>{a.author_name}</option>
            ))}
          </select>
        </div>

        <div className="filter-select">
          <select value={publisherFilter} onChange={(e) => setPublisherFilter(e.target.value)}>
            <option value="">All Publishers</option>
            {publishers.map((p) => (
              <option key={p.publisher_id} value={p.publisher_id}>{p.publisher_name}</option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          <span>In Stock Only</span>
        </label>

        <button onClick={fetchBooks} className="btn btn-secondary">
          <Search size={15} />
          <span>Apply</span>
        </button>
      </div>

      {/* Catalog Table */}
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Title & ISBN</th>
              <th>Author(s)</th>
              <th>Genre</th>
              <th>Publisher & Year</th>
              <th>Rating</th>
              <th>Inventory (Avail / Total)</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading book catalog from MySQL database...
                </td>
              </tr>
            ) : books.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No books found matching criteria.
                </td>
              </tr>
            ) : (
              books.map((b) => (
                <tr key={b.book_id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{b.title}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>ISBN: {b.isbn}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#334155' }}>
                      {b.authors?.map((a) => a.author_name).join(', ') || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {b.genre?.genre_name || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                      <span>{b.publisher?.publisher_name || 'N/A'}</span>
                      <span style={{ color: '#94a3b8' }}>{b.publication_year}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#d97706', fontWeight: 700, fontSize: '12.5px' }}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      {b.average_rating > 0 ? `${b.average_rating} (${b.total_ratings})` : 'Unrated'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {b.available_copies > 0 ? (
                        <span className="badge badge-success">
                          {b.available_copies} of {b.total_copies} Avail
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          0 of {b.total_copies} Avail
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {b.available_copies > 0 && (
                        <button
                          onClick={() => navigate(`/issue?book_id=${b.book_id}`)}
                          className="btn btn-primary btn-sm"
                          title="Issue this book to a member"
                          style={{ gap: '4px' }}
                        >
                          <ArrowUpRight size={13} />
                          <span>Issue</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenCopiesModal(b)}
                        className="btn btn-secondary btn-sm"
                        title="Manage Physical Copies"
                        style={{ gap: '4px' }}
                      >
                        <Copy size={13} />
                        <span>Copies</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="btn btn-secondary btn-sm"
                        title="Edit Book"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(b)}
                        className="btn btn-danger btn-sm"
                        title="Delete Book"
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

      {/* Add / Edit Book Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBook ? `Edit Book: ${editingBook.title}` : 'Add New Book to Catalog'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Designing Data-Intensive Applications"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ISBN *</label>
              <input
                type="text"
                className="form-control"
                placeholder="978-0134757599"
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Publication Year *</label>
              <input
                type="number"
                className="form-control"
                min="1500"
                max="2100"
                value={formData.publication_year}
                onChange={(e) => setFormData({ ...formData, publication_year: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Genre *</label>
              <select
                className="form-control"
                value={formData.genre_id}
                onChange={(e) => setFormData({ ...formData, genre_id: parseInt(e.target.value) })}
                required
              >
                {genres.map((g) => (
                  <option key={g.genre_id} value={g.genre_id}>{g.genre_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Publisher *</label>
              <select
                className="form-control"
                value={formData.publisher_id}
                onChange={(e) => setFormData({ ...formData, publisher_id: parseInt(e.target.value) })}
                required
              >
                {publishers.map((p) => (
                  <option key={p.publisher_id} value={p.publisher_id}>{p.publisher_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Authors (Select all that contributed)</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                padding: '10px',
                borderRadius: '6px',
              }}
            >
              {authors.map((a) => {
                const isSelected = formData.author_ids.includes(a.author_id);
                return (
                  <label key={a.author_id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setFormData({ ...formData, author_ids: formData.author_ids.filter((aid) => aid !== a.author_id) });
                        } else {
                          setFormData({ ...formData, author_ids: [...formData.author_ids, a.author_id] });
                        }
                      }}
                    />
                    <span>{a.author_name}</span>
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
              {editingBook ? 'Save Changes' : 'Create Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage Physical Copies Modal */}
      <Modal
        isOpen={copiesModalOpen}
        onClose={() => setCopiesModalOpen(false)}
        title={`Copies for: ${selectedBookForCopies?.title}`}
      >
        <div>
          {/* Add Copy Form */}
          <form onSubmit={handleAddCopy} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Barcode (e.g. BC-001-D)"
              value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={15} /> Add Copy
            </button>
          </form>

          {/* List Copies */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Copy ID</th>
                  <th>Barcode</th>
                  <th>Status</th>
                  <th>Change Status</th>
                </tr>
              </thead>
              <tbody>
                {bookCopiesList.map((c) => (
                  <tr key={c.copy_id}>
                    <td>#{c.copy_id}</td>
                    <td><code>{c.barcode || 'N/A'}</code></td>
                    <td><Badge variant={c.status.toLowerCase()}>{c.status}</Badge></td>
                    <td>
                      <select
                        value={c.status}
                        onChange={(e) => handleUpdateCopyStatus(c.copy_id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="ISSUED">ISSUED</option>
                        <option value="MAINTENANCE">MAINTENANCE</option>
                        <option value="LOST">LOST</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

