import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Copy,
  CheckCircle2,
  Users,
  ArrowUpRight,
  AlertTriangle,
  BookmarkCheck,
  IndianRupee,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../api/client';
import { StatCard } from '../components/common/StatCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, chartsData] = await Promise.all([
        api.get('/dashboard/statistics'),
        api.get('/dashboard/charts'),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
        <RefreshCw className="spin" size={32} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 600 }}>Loading live library database statistics...</p>
      </div>
    );
  }

  // Chart Configurations
  const genreChartData = {
    labels: charts?.books_by_genre?.map((g) => g.genre) || [],
    datasets: [
      {
        label: 'Books',
        data: charts?.books_by_genre?.map((g) => g.count) || [],
        backgroundColor: [
          '#6366f1',
          '#0ea5e9',
          '#10b981',
          '#f59e0b',
          '#ec4899',
          '#8b5cf6',
          '#14b8a6',
          '#f97316',
        ],
        borderWidth: 1,
      },
    ],
  };

  const mostBorrowedChartData = {
    labels: charts?.most_borrowed_books?.map((b) => b.title) || [],
    datasets: [
      {
        label: 'Total Borrows',
        data: charts?.most_borrowed_books?.map((b) => b.count) || [],
        backgroundColor: '#4f46e5',
        borderRadius: 6,
      },
    ],
  };

  const monthlyTrendsChartData = {
    labels: charts?.monthly_borrowing_trends?.map((m) => m.month) || [],
    datasets: [
      {
        label: 'Checkout Volume',
        data: charts?.monthly_borrowing_trends?.map((m) => m.borrows) || [],
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#0ea5e9',
      },
    ],
  };

  const ratingsChartData = {
    labels: charts?.ratings_distribution?.map((r) => r.stars) || [],
    datasets: [
      {
        label: 'Review Count',
        data: charts?.ratings_distribution?.map((r) => r.count) || [],
        backgroundColor: '#f59e0b',
        borderRadius: 6,
      },
    ],
  };

  return (
    <div>
      {/* Top Welcome & Fast Actions Header */}
      <div className="page-header">
        <div className="page-title">
          <h2>Librarian Executive Dashboard</h2>
          <p>
            Real-time analytics and intelligent circulation metrics queried from MySQL 8.0.
          </p>
        </div>
        <div className="page-actions">
          <button onClick={() => navigate('/recommendations')} className="btn btn-primary" style={{ gap: '8px' }}>
            <Sparkles size={16} />
            <span>Search Member & Recommend</span>
          </button>
          <button onClick={() => navigate('/issue')} className="btn btn-secondary">
            <ArrowUpRight size={16} />
            <span>Issue Book</span>
          </button>
          <button onClick={fetchDashboardData} className="btn btn-secondary" title="Refresh data">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Primary KPI Grid (8 Cards as requested in Prompt Section 5) */}
      <div className="stats-grid">
        <StatCard
          title="Total Books"
          value={stats?.total_books ?? 0}
          subtext="Unique catalog titles"
          icon={BookOpen}
          color="#4f46e5"
          bgLight="#eef2ff"
        />
        <StatCard
          title="Total Book Copies"
          value={stats?.total_book_copies ?? 0}
          subtext="Physical inventory"
          icon={Copy}
          color="#0ea5e9"
          bgLight="#f0f9ff"
        />
        <StatCard
          title="Available Copies"
          value={stats?.available_copies ?? 0}
          subtext={`${stats?.issued_copies ?? 0} currently issued`}
          icon={CheckCircle2}
          color="#10b981"
          bgLight="#ecfdf5"
        />
        <StatCard
          title="Total Members"
          value={stats?.total_members ?? 0}
          subtext={`${stats?.active_members ?? 0} active patrons`}
          icon={Users}
          color="#8b5cf6"
          bgLight="#f5f3ff"
        />
        <StatCard
          title="Currently Issued"
          value={stats?.currently_issued_books ?? 0}
          subtext="Active loans in circulation"
          icon={ArrowUpRight}
          color="#3b82f6"
          bgLight="#eff6ff"
        />
        <StatCard
          title="Overdue Books"
          value={stats?.overdue_books ?? 0}
          subtext="Requiring return notice"
          icon={AlertTriangle}
          color="#ef4444"
          bgLight="#fef2f2"
        />
        <StatCard
          title="Reservations"
          value={stats?.total_reservations ?? 0}
          subtext={`${stats?.pending_reservations ?? 0} in active queue`}
          icon={BookmarkCheck}
          color="#f59e0b"
          bgLight="#fffbeb"
        />
        <StatCard
          title="Total Fines"
          value={`₹${stats?.total_fines?.toFixed(2) ?? '0.00'}`}
          subtext="Collected overdue penalties"
          icon={IndianRupee}
          color="#059669"
          bgLight="#ecfdf5"
        />
      </div>

      {/* Featured Intelligence Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          borderRadius: '14px',
          padding: '24px 28px',
          color: 'white',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 10px 20px -5px rgba(30, 27, 75, 0.4)',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Intelligent DBMS Feature
            </span>
            <span style={{ fontSize: '13px', opacity: 0.8 }}>Single-Operator Interface</span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
            Personalized Book Recommendation Engine
          </h3>
          <p style={{ fontSize: '13.5px', opacity: 0.9, lineHeight: 1.5 }}>
            When a patron visits your library desk, instantly pull up their member profile. Our deterministic database algorithm evaluates reading history, favorite authors, ratings, and real-time shelf availability to suggest their next read.
          </p>
        </div>
        <button
          onClick={() => navigate('/members')}
          className="btn"
          style={{
            backgroundColor: '#ffffff',
            color: '#312e81',
            padding: '11px 20px',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          <span>Select Patron from Registry</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Real Analytics Charts Grid */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title">
            <span>Books by Category / Genre</span>
          </div>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Doughnut
              data={genreChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } },
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Most Borrowed Titles</span>
          </div>
          <div style={{ height: '280px' }}>
            <Bar
              data={mostBorrowedChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Monthly Lending Trends</span>
          </div>
          <div style={{ height: '280px' }}>
            <Line
              data={monthlyTrendsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span>Patron Ratings Distribution (1 - 5 Stars)</span>
          </div>
          <div style={{ height: '280px' }}>
            <Bar
              data={ratingsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

