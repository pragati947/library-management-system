import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Database,
  IndianRupee,
  Calendar,
  Save,
  CheckCircle2,
  Info,
  Server
} from 'lucide-react';
import { api } from '../api/client';
import { Toast } from '../components/common/Toast';

export const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [fineRate, setFineRate] = useState(5.0);
  const [borrowDays, setBorrowDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings');
      setSettings(data);
      if (data.config) {
        setFineRate(data.config.default_daily_fine_rate);
        setBorrowDays(data.config.default_borrow_days);
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to load settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', {
        default_daily_fine_rate: parseFloat(fineRate),
        default_borrow_days: parseInt(borrowDays),
      });
      setToast({ message: 'Circulation policies updated successfully!', type: 'success' });
      fetchSettings();
    } catch (err) {
      setToast({ message: err.message || 'Failed to update settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading system settings...</div>;
  }

  return (
    <div>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="page-header">
        <div className="page-title">
          <h2>System Settings & Librarian Profile</h2>
          <p>Configure circulation policies, review administrator details, and inspect database connectivity.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* Circulation Policies Form */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} color="#4f46e5" /> Circulation Policies & Fine Rates
            </span>
          </div>

          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label>Default Daily Overdue Fine Rate (₹ per day)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-control"
                  value={fineRate}
                  onChange={(e) => setFineRate(e.target.value)}
                  required
                />
              </div>
              <small style={{ color: '#64748b', fontSize: '12px' }}>
                Assessed automatically during book check-in when return date exceeds due date.
              </small>
            </div>

            <div className="form-group">
              <label>Standard Loan Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                className="form-control"
                value={borrowDays}
                onChange={(e) => setBorrowDays(e.target.value)}
                required
              />
              <small style={{ color: '#64748b', fontSize: '12px' }}>
                Default checkout period pre-populated on the Issue Book interface.
              </small>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: '6px' }}>
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Update Policies'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Administrator Profile Card */}
        <div className="card">
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#059669" /> Authenticated Librarian Profile
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Administrator Name:</span>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                {settings?.librarian?.name}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Username / Handle:</span>
              <div style={{ fontWeight: 600 }}><code>{settings?.librarian?.username}</code></div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Official Email:</span>
              <div>{settings?.librarian?.email}</div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Direct Phone:</span>
              <div>{settings?.librarian?.phone}</div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Access Level:</span>
              <div>
                <span className="badge badge-success">Full System Administrator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Diagnostic Card */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="#0ea5e9" /> Relational Database Diagnostic & Connection State
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={20} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Active Engine: {settings?.database?.database_type}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Target Endpoint: {settings?.database?.url_target}
                </div>
              </div>
            </div>

            <div>
              {settings?.database?.is_mysql ? (
                <span className="badge badge-success" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  ✓ Connected to MySQL 8.0 Server
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  Development SQLite Mode Active (MySQL Fallback)
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
            <p>
              <strong>To switch to your local MySQL 8.0 Server:</strong>
            </p>
            <ol style={{ paddingLeft: '20px', marginTop: '6px' }}>
              <li>Open <code>backend/.env</code> in your editor.</li>
              <li>Set <code>DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/library_db</code> with your actual MySQL root password.</li>
              <li>Restart the backend server. The application will connect directly to MySQL 8.0 and auto-seed if needed.</li>
              <li>You can also run <code>database/schema.sql</code> and <code>database/sample_data.sql</code> directly in MySQL Workbench.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

