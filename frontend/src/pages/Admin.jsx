import { useState, useEffect } from 'react';
import { getAdminUsers, updateUserRole, toggleUserActive } from '../utils/api';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAdminUsers();
      setUsers(data.users);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    setMessage('');
    try {
      const result = await updateUserRole(userId, newRole);
      setMessage(result.message);
      fetchUsers();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId) => {
    setActionLoading(userId);
    setMessage('');
    try {
      const result = await toggleUserActive(userId);
      setMessage(result.message);
      fetchUsers();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="auth-spinner" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">
          <h1>👥 User Management</h1>
          <p>Manage user accounts and roles</p>
        </div>
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat-number">{users.length}</span>
            <span className="admin-stat-label">Total Users</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-number">
              {users.filter((u) => u.role === 'admin').length}
            </span>
            <span className="admin-stat-label">Admins</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-number">
              {users.filter((u) => u.is_active).length}
            </span>
            <span className="admin-stat-label">Active</span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`admin-message ${message.startsWith('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={!user.is_active ? 'inactive-row' : ''}>
                <td>
                  <div className="admin-user-cell">
                    <div className="admin-avatar">
                      {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="admin-username">{user.username}</div>
                      <div className="admin-fullname">{user.full_name}</div>
                    </div>
                  </div>
                </td>
                <td className="admin-email">{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role === 'admin' ? '🛡️ Admin' : '👤 Operator'}
                  </span>
                </td>
                <td>
                  <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="admin-date">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : '—'}
                </td>
                <td>
                  <div className="admin-actions">
                    <button
                      className="admin-btn role-btn"
                      onClick={() =>
                        handleRoleChange(
                          user.id,
                          user.role === 'admin' ? 'operator' : 'admin'
                        )
                      }
                      disabled={actionLoading === user.id}
                      title={
                        user.role === 'admin'
                          ? 'Demote to Operator'
                          : 'Promote to Admin'
                      }
                    >
                      {user.role === 'admin' ? '⬇' : '⬆'}
                    </button>
                    <button
                      className="admin-btn deactivate-btn"
                      onClick={() => handleToggleActive(user.id)}
                      disabled={actionLoading === user.id}
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active ? '🚫' : '✅'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
