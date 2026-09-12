import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? verifyToken(token) : null;

  return (
    <div>
      <div className="header">
        <h1>🌸 TechBridge Academy</h1>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/courses">Courses</Link>
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              {user.role === 'admin' && <Link href="/admin">Admin</Link>}
              <form action="/api/logout" method="POST" style={{ display: 'inline' }}>
                <button type="submit">Logout ({user.username})</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </div>

      <div className="hero">
        <h2>Learn. Build. Succeed.</h2>
        <p>A functional demo education portal for testing Bloom SIEM security monitoring.
          Real JWT auth, file uploads, comments, search — all instrumented with Bloom SDK.</p>
        {user ? (
          <Link href="/dashboard" className="cta">Go to Dashboard →</Link>
        ) : (
          <>
            <Link href="/login" className="cta">Sign In</Link>
            <Link href="/signup" className="cta">Create Account</Link>
          </>
        )}
      </div>

      <div className="container">
        <div className="features">
          <div className="feature-card">
            <h3>🔐 JWT Authentication</h3>
            <p>Real bcrypt password hashing + JWT tokens in HTTP-only cookies. Try brute force with <code>wrong passwords 6+ times</code>.</p>
          </div>
          <div className="feature-card">
            <h3>💬 Comments</h3>
            <p>Post comments on lessons. Try XSS: <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> — Bloom will block it.</p>
          </div>
          <div className="feature-card">
            <h3>🔍 Course Search</h3>
            <p>Search courses. Try SQLi: <code>&apos; OR &apos;1&apos;=&apos;1</code> or <code>UNION SELECT</code> — Bloom will block.</p>
          </div>
          <div className="feature-card">
            <h3>📎 File Upload</h3>
            <p>Upload assignments. Try <code>avatar.php.exe</code> — Bloom will flag it as malware (T1204).</p>
          </div>
          <div className="feature-card">
            <h3>📊 Admin Panel</h3>
            <p>Admin-only user management + audit log. Try accessing <code>/admin</code> as a student.</p>
          </div>
          <div className="feature-card">
            <h3>🛡️ Bloom Protected</h3>
            <p>Every request passes through Bloom middleware. IP blocking, session revocation, MITRE detection all active.</p>
          </div>
        </div>

        {user && (
          <div className="card" style={{ maxWidth: '100%', marginTop: '40px' }}>
            <h2>Welcome, {user.name}!</h2>
            <div className="notice">
              You&apos;re signed in as <strong>{user.role}</strong>. JWT token stored in HTTP-only cookie.
              Bloom SIEM is tracking all your actions in real-time.
            </div>
            <div className="btn-row">
              <Link href="/dashboard" className="btn" style={{ textDecoration: 'none', textAlign: 'center' }}>Dashboard</Link>
              <Link href="/courses" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>Browse Courses</Link>
              {user.role === 'admin' && <Link href="/admin" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>Admin Panel</Link>}
            </div>
          </div>
        )}

        {!user && (
          <div className="card" style={{ maxWidth: '100%', marginTop: '40px' }}>
            <h2>Quick Start — Demo Credentials</h2>
            <div className="demo-creds">
              <table>
                <thead>
                  <tr><th>Role</th><th>Username</th><th>Password</th><th>Access</th></tr>
                </thead>
                <tbody>
                  <tr><td><span className="role-badge role-admin">Admin</span></td><td><code>admin</code></td><td><code>Admin@2025</code></td><td>Full admin panel + dashboard</td></tr>
                  <tr><td><span className="role-badge role-teacher">Teacher</span></td><td><code>teacher</code></td><td><code>Teacher@2025</code></td><td>Dashboard + course management</td></tr>
                  <tr><td><span className="role-badge role-student">Student</span></td><td><code>student</code></td><td><code>Student@2025</code></td><td>Dashboard only</td></tr>
                  <tr><td><span className="role-badge role-student">Student</span></td><td><code>mgmg</code></td><td><code>MgMg@2025</code></td><td>Second student (session hijack test)</td></tr>
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: '#6b7075' }}>
              Try attacking the site with SQLi, XSS, brute force, or malware uploads —
              watch Bloom SIEM detect and block them in real-time.
            </p>
          </div>
        )}
      </div>

      <div className="footer">
        <p>TechBridge Academy — Demo Portal for Bloom SIEM Testing</p>
        <p className="muted">Real JWT auth · bcrypt passwords · HTTP-only cookies · Bloom SDK middleware</p>
      </div>
    </div>
  );
}
