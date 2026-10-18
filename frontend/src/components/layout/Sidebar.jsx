import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Copy,
  UserCheck,
  Building2,
  Tags,
  BookmarkCheck,
  Star,
  BarChart3,
  Settings,
  Library
} from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { section: 'Overview' },
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/recommendations', label: 'AI Recommender', icon: Sparkles, badge: 'Smart' },

    { section: 'Circulation & Members' },
    { to: '/members', label: 'Members', icon: Users },
    { to: '/issue', label: 'Issue Book', icon: ArrowUpRight },
    { to: '/return', label: 'Return Book', icon: ArrowDownLeft },
    { to: '/reservations', label: 'Reservations', icon: BookmarkCheck },
    { to: '/ratings', label: 'Member Ratings', icon: Star },

    { section: 'Catalog Management' },
    { to: '/books', label: 'Books Catalog', icon: BookOpen },
    { to: '/copies', label: 'Book Copies', icon: Copy },
    { to: '/authors', label: 'Authors', icon: UserCheck },
    { to: '/publishers', label: 'Publishers', icon: Building2 },
    { to: '/genres', label: 'Genres', icon: Tags },

    { section: 'Intelligence & System' },
    { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Library size={22} />
        </div>
        <div className="sidebar-brand-text">
          <h1>Librarian Portal</h1>
          <span>Smart DBMS v1.0</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.section) {
            return (
              <div key={idx} className="nav-section-title">
                {item.section}
              </div>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    color: '#fff',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

