import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, googleLogin } from '../utils/auth';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google Sign-In state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStep, setGoogleStep] = useState(1); // 1 = email, 2 = password & confirm
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [googleError, setGoogleError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleModal = () => {
    setGoogleEmail('');
    setGoogleName('');
    setGooglePassword('');
    setGoogleError('');
    setGoogleStep(1);
    setShowGoogleModal(true);
  };

  const closeGoogleModal = () => {
    setShowGoogleModal(false);
    setGoogleError('');
  };

  const handleGoogleEmailStep = (e) => {
    e.preventDefault();
    const email = googleEmail.trim();
    if (!email) {
      setGoogleError('Please enter your Google email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setGoogleError('Please enter a valid email address.');
      return;
    }
    setGoogleError('');
    setGoogleName(email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    setGoogleStep(2);
  };

  const handleGoogleConfirm = async (e) => {
    if (e) e.preventDefault();
    setGoogleError('');
    
    if (!googlePassword) {
      setGoogleError('Please enter your password to authenticate.');
      return;
    }

    setLoading(true);
    try {
      const email = googleEmail.trim();
      const name = googleName.trim() || email.split('@')[0];
      const data = await googleLogin({
        email,
        fullName: name,
        password: googlePassword,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4285F4&textColor=ffffff`,
        googleId: `google_${btoa(email)}_${Date.now()}`,
      });
      closeGoogleModal();
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setGoogleError(err.message || 'Authentication failed. Incorrect password or credentials.');
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
              <span className="auth-error-icon">⚠️</span>
              <div className="auth-error-content">
                <strong>Authentication Warning</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            className="auth-google-btn"
            onClick={openGoogleModal}
            disabled={loading}
          >
            <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.26v3.15C3.24 21.3 7.31 24 12 24z" />
              <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.02-3.15z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.26 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.72-4.96z" />
            </svg>
            Sign in with Google
          </button>

          <div className="auth-divider">
            <span>or sign in with username/email</span>
          </div>

          <div className="auth-field">
            <label htmlFor="login-username">Username or Email</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Enter your username or email"
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
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !username || !password}
          >
            {loading ? <span className="auth-spinner" /> : 'Sign In'}
          </button>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>

          <div className="auth-demo-hint">
            <span>Demo admin:</span> admin / admin123
          </div>
        </form>
      </div>

      {/* Google OAuth-style Sign-In Modal */}
      {showGoogleModal && (
        <div className="google-modal-overlay" onClick={closeGoogleModal}>
          <div className="google-oauth-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className="google-oauth-close" onClick={closeGoogleModal} aria-label="Close">✕</button>

            {/* Google branding header */}
            <div className="google-oauth-logo">
              <svg width="75" height="24" viewBox="0 0 272 92">
                <path fill="#4285F4" d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>
                <path fill="#EA4335" d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>
                <path fill="#FBBC05" d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z"/>
                <path fill="#4285F4" d="M225 3v65h-9.5V3h9.5z"/>
                <path fill="#34A853" d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z"/>
                <path fill="#EA4335" d="M35.29 41.19V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49-.01z"/>
              </svg>
            </div>

            {/* Step 1: Email entry */}
            {googleStep === 1 && (
              <form onSubmit={handleGoogleEmailStep} className="google-oauth-form">
                <h3 className="google-oauth-title">Sign in</h3>
                <p className="google-oauth-subtitle">to continue to UrjaSetu</p>

                {googleError && (
                  <div className="google-oauth-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#d93025" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="13" stroke="#d93025" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="16.5" r="1" fill="#d93025"/>
                    </svg>
                    {googleError}
                  </div>
                )}

                <div className="google-oauth-field">
                  <input
                    id="google-signin-email"
                    type="email"
                    value={googleEmail}
                    onChange={(e) => { setGoogleEmail(e.target.value); setGoogleError(''); }}
                    placeholder=" "
                    autoFocus
                    autoComplete="email"
                  />
                  <label htmlFor="google-signin-email">Email or phone</label>
                </div>

                <p className="google-oauth-help">
                  Enter your Google Account email to sign in to UrjaSetu.
                </p>

                <div className="google-oauth-actions">
                  <button type="button" className="google-oauth-link" onClick={() => { closeGoogleModal(); navigate('/signup'); }}>
                    Create account
                  </button>
                  <button type="submit" className="google-oauth-next" disabled={loading}>
                    {loading ? <span className="auth-spinner" /> : 'Next'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Password and Profile confirmation */}
            {googleStep === 2 && (
              <form onSubmit={handleGoogleConfirm} className="google-oauth-form">
                <h3 className="google-oauth-title">Welcome</h3>

                <div className="google-oauth-profile">
                  <div className="google-oauth-avatar">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleName || googleEmail)}&backgroundColor=4285F4&textColor=ffffff`}
                      alt="Profile"
                    />
                  </div>
                  <div className="google-oauth-profile-info">
                    <span className="google-oauth-profile-name">{googleName}</span>
                    <span className="google-oauth-profile-email">{googleEmail}</span>
                  </div>
                </div>

                {googleError && (
                  <div className="google-oauth-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#d93025" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="13" stroke="#d93025" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="16.5" r="1" fill="#d93025"/>
                    </svg>
                    {googleError}
                  </div>
                )}

                <div className="google-oauth-field">
                  <input
                    id="google-signin-password"
                    type="password"
                    value={googlePassword}
                    onChange={(e) => { setGooglePassword(e.target.value); setGoogleError(''); }}
                    placeholder=" "
                    autoFocus
                    required
                  />
                  <label htmlFor="google-signin-password">Enter password</label>
                </div>

                <p className="google-oauth-consent">
                  Your Google account authentication secures your isolated dataset on UrjaSetu.
                </p>

                <div className="google-oauth-actions">
                  <button type="button" className="google-oauth-back" onClick={() => setGoogleStep(1)}>
                    Back
                  </button>
                  <button
                    type="submit"
                    className="google-oauth-next"
                    disabled={loading || !googlePassword}
                  >
                    {loading ? <span className="auth-spinner" /> : 'Sign In'}
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="google-oauth-footer">
              <span>English (United States)</span>
              <div className="google-oauth-footer-links">
                <span>Help</span>
                <span>Privacy</span>
                <span>Terms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
