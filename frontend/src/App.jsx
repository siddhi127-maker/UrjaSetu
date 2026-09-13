import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Dispatch from './pages/Dispatch';
import Forecast from './pages/Forecast';
import Scenarios from './pages/Scenarios';
import History from './pages/History';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import { isLoggedIn, getStoredUser, isAdmin, logout } from './utils/auth';
import { ThemeProvider } from './context/ThemeContext';

const pageConfig = {
  '/': { title: 'Dashboard', subtitle: 'Village Microgrid Overview' },
  '/dispatch': { title: 'Live Dispatch', subtitle: 'Real-time optimization controls' },
  '/forecast': { title: 'Energy Forecast', subtitle: 'Solar, wind & demand predictions' },
  '/scenarios': { title: 'What-If Simulator', subtitle: 'Explore scenario impacts' },
  '/history': { title: 'History', subtitle: 'Historical performance review' },
  '/admin': { title: 'Admin Panel', subtitle: 'User management & access control' },
};

function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppLayout({ user, onLogout }) {
  const location = useLocation();
  const config = pageConfig[location.pathname] || pageConfig['/'];

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">
        <Header title={config.title} subtitle={config.subtitle} />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/scenarios" element={<Scenarios />} />
            <Route path="/history" element={<History />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check auth state on mount
    if (isLoggedIn()) {
      setUser(getStoredUser());
    }
    setReady(true);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    logout();
  };

  if (!ready) return null;

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={
            isLoggedIn() ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
          } />
          <Route path="/signup" element={
            isLoggedIn() ? <Navigate to="/" replace /> : <Signup onLogin={handleLogin} />
          } />

          {/* Protected app routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

