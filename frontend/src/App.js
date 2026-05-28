import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

function App() {
  const [showSignup, setShowSignup] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignupSuccess = () => {
    setShowSignup(false);
    setSuccessMsg('Account created! You can now log in.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.hero}>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>Sign in or create a new account</p>
        </div>

        {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

        {showSignup ? (
          <>
            <Signup onSignupSuccess={handleSignupSuccess} />
            <p style={styles.switchLink} onClick={() => setShowSignup(false)}>
              Already have an account? <span style={styles.linkAccent}>Log in</span>
            </p>
          </>
        ) : (
          <>
            <Login />
            <p style={styles.switchLink} onClick={() => setShowSignup(true)}>
              Don't have an account? <span style={styles.linkAccent}>Sign up</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '36px 32px',
    width: '100%',
    maxWidth: '420px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    margin: 0,
    fontSize: '26px',
    fontWeight: 700,
    color: '#1e293b',
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: '14px',
  },
  successBanner: {
    background: '#dcfce7',
    border: '1px solid #bbf7d0',
    color: '#166534',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  switchLink: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#64748b',
    fontSize: '14px',
    cursor: 'default',
  },
  linkAccent: {
    color: '#6366f1',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default App;
