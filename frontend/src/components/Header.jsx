import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getAlerts } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

export default function Header({ title, subtitle }) {
  const { data: alertsData } = useApi(getAlerts, [], true);
  const [time, setTime] = useState(new Date());
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const unackCount = alertsData?.unacknowledged_count || 0;

  return (
    <header className="header">
      <div>
        <div className="header-title">{title || 'Dashboard'}</div>
        <div className="header-subtitle">
          {subtitle || time.toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </div>
      </div>

      <div className="header-actions">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Dark / Light Mode"
          className="theme-toggle-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid var(--border-glass)',
            background: 'var(--bg-glass)',
            color: 'var(--text-primary)',
            transition: 'all 0.2s ease',
          }}
        >
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>

        <div className="header-badge">
          🕐 {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>

        {unackCount > 0 ? (
          <div className={`header-badge ${unackCount >= 3 ? 'critical' : 'warning'}`}>
            🔔 {unackCount} Alert{unackCount > 1 ? 's' : ''}
          </div>
        ) : (
          <div className="header-badge">
            ✅ All Clear
          </div>
        )}
      </div>
    </header>
  );
}

