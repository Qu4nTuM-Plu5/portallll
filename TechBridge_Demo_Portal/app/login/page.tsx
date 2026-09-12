'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(data.role === 'admin' ? '/admin' : '/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <h1>🌸 TechBridge Academy</h1>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign Up</Link>
        </nav>
      </div>

      <div className="card">
        <h2>Sign In</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin, teacher, or student"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="demo-creds">
          <strong>Demo Credentials:</strong>
          <table>
            <tbody>
              <tr><td>Admin</td><td><code>admin</code> / <code>Admin@2025</code></td></tr>
              <tr><td>Teacher</td><td><code>teacher</code> / <code>Teacher@2025</code></td></tr>
              <tr><td>Student</td><td><code>student</code> / <code>Student@2025</code></td></tr>
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color: '#4a90e2' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
