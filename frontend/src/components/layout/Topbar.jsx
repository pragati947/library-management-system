import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, Database, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export const Topbar = () => {
  const { librarian, logout } = useAuth();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState({ database_type: 'Connecting...', is_mysql: false });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const root = await api.get('/');
        if (root.database) {
          setDbStatus(root.database);
        }
      } catch (e) {
        console.error("DB status fetch error", e);
      }
    };
    fetchStatus();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    // Route to members or books search
    navigate(`/members?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <form onSubmit={handleSearchSubmit} className="topbar-search">
        <Search className="topbar-search-icon" size={17} />
        <input
          type="text"
          placeholder="Search member name, email or phone (Enter)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>

      <div className="topbar-actions">
        {/* Database indicator */}
        <div className="db-badge" title={`Engine: ${dbStatus.database_type}`}>
          <div className="db-dot"></div>
          <span>{dbStatus.database_type}</span>
        </div>

        {/* Librarian user pill */}
        <div className="librarian-profile-pill">
          <div className="librarian-avatar">
            <ShieldCheck size={16} />
          </div>
          <div className="librarian-info">
            <span className="librarian-name">{librarian?.name || librarian?.username || 'Librarian'}</span>
            <span className="librarian-role">System Administrator</span>
          </div>
        </div>

        {/* Logout action */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          title="Sign out of librarian portal"
          style={{ padding: '7px 12px', color: '#dc2626' }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

