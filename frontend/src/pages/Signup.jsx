import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../utils/auth';

export default function Signup({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field) => (e) =>
    setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const data = await signup(
        formData.username,
        formData.email,
        formData.fullName,
        formData.password
      );
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

      <div className="auth-card auth-card-signup">
        <div className="auth-header">
          <div className="auth-logo">⚡</div>
          <h1>UrjaSetu</h1>
          <p>Join the Energy Bridge</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Create Account</h2>

          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              type="text"
              value={formData.username}
              onChange={updateField('username')}
              placeholder="Choose a username"
              required
              autoFocus
              minLength={3}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              value={formData.email}
              onChange={updateField('email')}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-fullname">Full Name</label>
            <input
              id="signup-fullname"
              type="text"
              value={formData.fullName}
              onChange={updateField('fullName')}
              placeholder="Your full name"
              required
              minLength={2}
            />
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                value={formData.password}
                onChange={updateField('password')}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="signup-confirm">Confirm</label>
              <input
                id="signup-confirm"
                type="password"
                value={formData.confirmPassword}
                onChange={updateField('confirmPassword')}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !formData.username || !formData.email || !formData.password}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              'Create Account'
            )}
          </button>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
