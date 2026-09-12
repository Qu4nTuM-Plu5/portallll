import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyToken, getAllUsers, getAuditLog, getActiveSessions, getUploads } from '@/lib/auth';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? verifyToken(token) : null;

  if (!user) redirect('/login');
  if (user.role !== 'admin') {
    return (
      <div>
        <div className="header">
          <h1>🌸 TechBridge Academy</h1>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
        <div className="card" style={{ maxWidth: 460 }}>
          <h2>🚫 Access Denied</h2>
          <div className="error">
            Admin access required. Your role: <strong>{user.role}</strong>.
            <br />
            Try logging in as <code>admin</code> / <code>Admin@2025</code> to access this page.
          </div>
          <Link href="/login" className="btn" style={{ textAlign: 'center', textDecoration: 'none' }}>Go to Login</Link>
        </div>
      </div>
    );
  }

  const users = getAllUsers();
  const sessions = getActiveSessions();
  const audit = getAuditLog(50);
  const uploads = getUploads(20);

  return (
    <div>
      <div className="header">
        <h1>🌸 TechBridge Academy</h1>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/admin">Admin</Link>
          <form action="/api/logout" method="POST" style={{ display: 'inline' }}>
            <button type="submit">Logout ({user.username})</button>
          </form>
        </nav>
      </div>

      <div className="dashboard">
        <div className="sidebar">
          <div className="user-info">
            <div className="name">{user.name}</div>
            <div className="role">Administrator</div>
          </div>
          <h3>Admin</h3>
          <ul>
            <li><a href="#users">👥 Users</a></li>
            <li><a href="#sessions">🔑 Sessions</a></li>
            <li><a href="#uploads">📎 Uploads</a></li>
            <li><a href="#audit">📜 Audit Log</a></li>
          </ul>
        </div>

        <div className="main">
          <div className="alert-banner">
            🔐 Admin access only. All actions are logged and monitored by Bloom SIEM.
          </div>

          <section id="users" className="section">
            <h2>👥 All Users ({users.length})</h2>
            <div className="hint">In-memory user store. Resets on cold start. Real apps use a database.</div>
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="mono" style={{ fontSize: 11 }}>{u.id}</td>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.name}</td>
                    <td className="mono">{u.email}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section id="sessions" className="section">
            <h2>🔑 Active Sessions ({sessions.length})</h2>
            <div className="hint">
              Each login creates an in-memory session. If the same session ID appears from 2 IPs,
              Bloom&apos;s T1078 rule fires (session hijacking).
            </div>
            <table className="table">
              <thead>
                <tr><th>Session ID</th><th>User ID</th><th>Created</th><th>IP</th><th>User Agent</th></tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>No active sessions. Log in to create one.</td></tr>
                ) : (
                  sessions.map((s, i) => (
                    <tr key={i}>
                      <td className="mono">{s.sessionId}</td>
                      <td className="mono">{s.userId}</td>
                      <td>{new Date(s.createdAt).toLocaleString()}</td>
                      <td className="mono">{s.ip}</td>
                      <td style={{ fontSize: 11 }}>{s.userAgent}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section id="uploads" className="section">
            <h2>📎 Recent File Uploads ({uploads.length})</h2>
            <div className="hint">Every upload is analyzed. Bloom verdicts: malicious / suspicious / clean.</div>
            <table className="table">
              <thead>
                <tr><th>File</th><th>Size</th><th>Verdict</th><th>By</th><th>Time</th></tr>
              </thead>
              <tbody>
                {uploads.length === 0 ? (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>No uploads yet.</td></tr>
                ) : (
                  uploads.map(u => (
                    <tr key={u.id}>
                      <td className="mono">{u.fileName}</td>
                      <td>{(u.fileSize / 1024).toFixed(1)} KB</td>
                      <td><span className={`verdict-${u.verdict}`}>{u.verdict}</span></td>
                      <td>@{u.username}</td>
                      <td>{new Date(u.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section id="audit" className="section">
            <h2>📜 Audit Log ({audit.length} events)</h2>
            <div className="hint">All user actions are logged. Bloom SIEM also tracks via /api/sdk/ingest.</div>
            <table className="table">
              <thead>
                <tr><th>Time</th><th>Action</th><th>User ID</th><th>IP</th><th>Details</th></tr>
              </thead>
              <tbody>
                {audit.length === 0 ? (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 20 }}>No audit events.</td></tr>
                ) : (
                  audit.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontSize: 11 }}>{new Date(a.timestamp).toLocaleString()}</td>
                      <td><strong>{a.action}</strong></td>
                      <td className="mono">{a.userId}</td>
                      <td className="mono">{a.ip}</td>
                      <td style={{ fontSize: 11 }}>{a.meta ? JSON.stringify(a.meta) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
