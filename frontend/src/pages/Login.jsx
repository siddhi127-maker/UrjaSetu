import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../utils/auth';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-effects">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">⚡</div>
          <h1>UrjaSetu</h1>
          <p>Microgrid Energy Management</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Welcome Back</h2>

          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              'Sign In'
            )}
          </button>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/signup">Create one</Link>
          </p>

          <div className="auth-demo-hint">
            <span>Demo admin:</span> admin / admin123
          </div>
        </form>
      </div>
    </div>
  );
}
