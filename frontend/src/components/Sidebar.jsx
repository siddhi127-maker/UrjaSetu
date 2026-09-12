import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/dispatch', icon: '⚡', label: 'Live Dispatch' },
  { path: '/forecast', icon: '🌤️', label: 'Forecast' },
  { path: '/scenarios', icon: '🔬', label: 'What-If' },
  { path: '/history', icon: '📈', label: 'History' },
];

export default function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div>
          <h1>UrjaSetu</h1>
          <span>Energy Bridge</span>
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
              {user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?'}
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
