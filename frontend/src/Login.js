import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setLoggedInUser(data);
      } else {
        setError(data.message);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedInUser(null);
    setForm({ email: '', password: '' });
  };

  // Logged-in state shown inline (no separate Dashboard)
  if (loggedInUser) {
    return (
      <div style={styles.welcome}>
        <div style={styles.avatar}>{loggedInUser.username.charAt(0).toUpperCase()}</div>
        <h2 style={styles.welcomeTitle}>Welcome, {loggedInUser.username}!</h2>
        <p style={styles.welcomeEmail}>{loggedInUser.email}</p>
        <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} style={styles.form}>
      <h2 style={styles.heading}>Log In</h2>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.field}>
        <label style={styles.label}>Email</label>
        <input
          name="email"
          type="email"
          value={form.email}
          placeholder="you@example.com"
          onChange={handleChange}
          required
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Password</label>
        <input
          name="password"
          type="password"
          value={form.password}
          placeholder="Your password"
          onChange={handleChange}
          required
          style={styles.input}
        />
      </div>

      <button type="submit" disabled={loading} style={styles.button}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  heading: { margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#1e293b' },
  errorBox: {
    background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c',
    borderRadius: '8px', padding: '10px 12px', fontSize: '14px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#374151' },
  input: {
    padding: '11px 14px', borderRadius: '8px',
    border: '1px solid #d1d5db', fontSize: '14px',
    outline: 'none', color: '#1e293b',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '12px', borderRadius: '8px', border: 'none',
    background: '#6366f1', color: '#fff', fontWeight: 700,
    fontSize: '15px', cursor: 'pointer',
  },
  welcome: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingTop: '8px',
  },
  avatar: {
    width: '64px', height: '64px', borderRadius: '50%',
    background: '#6366f1', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px', fontWeight: 700,
  },
  welcomeTitle: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#1e293b' },
  welcomeEmail: { margin: 0, fontSize: '14px', color: '#64748b' },
  logoutBtn: {
    marginTop: '8px', padding: '10px 24px', borderRadius: '8px',
    border: '1px solid #e2e8f0', background: '#fff', color: '#374151',
    fontWeight: 600, cursor: 'pointer', fontSize: '14px',
  },
};

export default Login;
