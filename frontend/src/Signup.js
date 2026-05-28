import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Signup({ onSignupSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        onSignupSuccess();
      } else {
        setError(data.message);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} style={styles.form}>
      <h2 style={styles.heading}>Create Account</h2>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.field}>
        <label style={styles.label}>Username</label>
        <input
          name="username"
          value={form.username}
          placeholder="Your username"
          onChange={handleChange}
          required
          style={styles.input}
        />
      </div>

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
          placeholder="At least 6 characters"
          onChange={handleChange}
          required
          style={styles.input}
        />
      </div>

      <button type="submit" disabled={loading} style={styles.button}>
        {loading ? 'Creating account...' : 'Sign Up'}
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
  },
  button: {
    padding: '12px', borderRadius: '8px', border: 'none',
    background: '#10b981', color: '#fff', fontWeight: 700,
    fontSize: '15px', cursor: 'pointer',
  },
};

export default Signup;
