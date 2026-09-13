/**
 * UrjaSetu Auth Utility
 * Handles login, signup, logout, token management, and role checks.
 */

const API_BASE = 'http://localhost:8000/api/auth';

// ── Token Management ────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem('urjasetu_token');
}

export function setToken(token) {
  localStorage.setItem('urjasetu_token', token);
}

export function removeToken() {
  localStorage.removeItem('urjasetu_token');
  localStorage.removeItem('urjasetu_user');
}

export function getStoredUser() {
  try {
    const user = localStorage.getItem('urjasetu_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem('urjasetu_user', JSON.stringify(user));
}

export function isLoggedIn() {
  return !!getToken() && !!getStoredUser();
}

export function isAdmin() {
  const user = getStoredUser();
  return user?.role === 'admin';
}

// ── API Calls ───────────────────────────────────────────────────────────

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }

  const data = await response.json();
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function signup(username, email, fullName, password) {
  const response = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      email,
      full_name: fullName,
      password,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Signup failed');
  }

  const data = await response.json();
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

export function logout() {
  removeToken();
  window.location.href = '/login';
}

export async function getMe() {
  const token = getToken();
  if (!token) return null;

  const response = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    removeToken();
    return null;
  }

  const user = await response.json();
  setStoredUser(user);
  return user;
}

export async function googleLogin({ email, fullName, avatarUrl, googleId, password, idToken } = {}) {
  if (!email) throw new Error('Email is required for Google sign-in.');

  const response = await fetch(`${API_BASE}/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      full_name: fullName || email.split('@')[0],
      avatar_url: avatarUrl || '',
      google_id: googleId || `google_${btoa(email)}_${Date.now()}`,
      password: password || undefined,
      id_token: idToken || 'google_token_simulated',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Google sign-in failed');
  }

  const data = await response.json();
  setToken(data.token);
  setStoredUser(data.user);
  return data;
}

