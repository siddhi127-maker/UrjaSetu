import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/dispatch', icon: '⚡', label: 'Live Dispatch' },
  { path: '/forecast', icon: '🌤️', label: 'Forecast & Demand' },
  { path: '/maintenance', icon: '🛠️', label: 'Predictive Maintenance' },
  { path: '/scenarios', icon: '🔬', label: 'Scenario Lab' },
  { path: '/history', icon: '📈', label: 'Optimization History' },
];

export default function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <img src="/logo.jpg" alt="UrjaSetu Logo" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', boxShadow: '0 0 12px rgba(16,185,129,0.3)' }} />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>UrjaSetu</h1>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', lineHeight: 1.2, marginTop: 2 }}>
            Connecting renewable generation with demand
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Admin link — only for admin users */}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">🛡️</span>
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-username">{user.full_name || user.username}</span>
              <span className="sidebar-role">{user.role === 'admin' ? '🛡️ Admin' : '👤 Operator'}</span>
            </div>
            <button className="sidebar-logout" onClick={onLogout} title="Sign out">
              ↪
            </button>
          </div>
        )}

        <div className="sidebar-status">
          <div className="status-dot" />
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
}
