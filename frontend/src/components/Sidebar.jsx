import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard' },
  { path: '/dispatch', icon: '⚡', label: 'Live Dispatch' },
  { path: '/forecast', icon: '🌤️', label: 'Forecast' },
  { path: '/scenarios', icon: '🔬', label: 'What-If' },
  { path: '/history', icon: '📈', label: 'History' },
];

export default function Sidebar() {
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
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className="status-dot" />
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
}
