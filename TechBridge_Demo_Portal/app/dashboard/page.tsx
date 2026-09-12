import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyToken, getComments, getUploads } from '@/lib/auth';
import { CommentForm, SearchForm, UploadForm } from './forms';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? verifyToken(token) : null;

  if (!user) {
    redirect('/login');
  }

  const comments = getComments(undefined, 10);
  const uploads = getUploads(5);

  return (
    <div>
      <div className="header">
        <h1>🌸 TechBridge Academy</h1>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/courses">Courses</Link>
          <Link href="/dashboard">Dashboard</Link>
          {user.role === 'admin' && <Link href="/admin">Admin</Link>}
          <form action="/api/logout" method="POST" style={{ display: 'inline' }}>
            <button type="submit">Logout ({user.username})</button>
          </form>
        </nav>
      </div>

      <div className="dashboard">
        <div className="sidebar">
          <div className="user-info">
            <div className="name">{user.name}</div>
            <div className="role">{user.role}</div>
          </div>
          <h3>Menu</h3>
          <ul>
            <li><a href="#comment">💬 Comments</a></li>
            <li><a href="#search">🔍 Search</a></li>
            <li><a href="#upload">📎 Upload</a></li>
            <li><a href="/courses">📚 Courses</a></li>
            <li><a href="#session">🔑 Session</a></li>
          </ul>
        </div>

        <div className="main">
          <div className="notice">
            🛡️ Logged in as <strong>{user.username}</strong> ({user.role}).
            JWT cookie active. All actions on this page are tracked by Bloom SIEM in real-time.
          </div>

          {/* Session info — useful for session hijacking test */}
          <section id="session" className="section">
            <h2>🔑 Your Session</h2>
            <div className="hint">
              This is your JWT session info. To test <strong>session hijacking (T1078)</strong>:
              log in on another device/network using the same session cookie, and Bloom will detect it.
            </div>
            <div className="card" style={{ maxWidth: '100%', margin: 0 }}>
              <table className="table">
                <tbody>
                  <tr><td><strong>User ID</strong></td><td className="mono">{user.id}</td></tr>
                  <tr><td><strong>Username</strong></td><td>{user.username}</td></tr>
                  <tr><td><strong>Role</strong></td><td><span className={`role-badge role-${user.role}`}>{user.role}</span></td></tr>
                  <tr><td><strong>Email</strong></td><td>{user.email}</td></tr>
                  <tr><td><strong>JWT Token</strong></td><td className="mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>{token?.slice(0, 80)}...</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Comments — XSS target */}
          <section id="comment" className="section">
            <h2>💬 Post a Comment</h2>
            <div className="hint">
              Try XSS: <code>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</code> — Bloom middleware should block it (T1059).
              Stored comments are HTML-escaped at display time, so even if Bloom is disabled, scripts won&apos;t execute here.
            </div>
            <CommentForm />
            <div className="comment-list" style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12, color: '#6b7075' }}>Recent Comments</h3>
              {comments.length === 0 && <p className="muted">No comments yet. Be the first to post!</p>}
              {comments.map(c => (
                <div key={c.id} className="comment">
                  <div className="meta">
                    <span className="username">@{c.username}</span>
                    {' · '}
                    {new Date(c.createdAt).toLocaleString()}
                    {' · '}
                    Lesson: {c.lessonId}
                  </div>
                  <div className="message" dangerouslySetInnerHTML={{ __html: escapeHtml(c.message) }} />
                </div>
              ))}
            </div>
          </section>

          {/* Search — SQLi target */}
          <section id="search" className="section">
            <h2>🔍 Search Courses</h2>
            <div className="hint">
              Try SQLi: <code>&apos; OR &apos;1&apos;=&apos;1</code> or <code>UNION SELECT * FROM users</code> — Bloom middleware should block it (T1190).
            </div>
            <SearchForm />
          </section>

          {/* Upload — Malware target */}
          <section id="upload" className="section">
            <h2>📎 Upload Assignment</h2>
            <div className="hint">
              Try uploading <code>avatar.php.exe</code> (double extension) — Bloom will detect as malware (T1204).
              The file verdict will show &quot;malicious&quot; even if Bloom middleware is disabled (verdict is computed in the API).
            </div>
            <UploadForm username={user.username} />
            {uploads.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 14, marginBottom: 12, color: '#6b7075' }}>Recent Uploads</h3>
                <table className="table">
                  <thead>
                    <tr><th>File</th><th>Size</th><th>Verdict</th><th>By</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {uploads.map(u => (
                      <tr key={u.id}>
                        <td className="mono">{u.fileName}</td>
                        <td>{(u.fileSize / 1024).toFixed(1)} KB</td>
                        <td><span className={`verdict-${u.verdict}`}>{u.verdict}</span></td>
                        <td>@{u.username}</td>
                        <td>{new Date(u.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Client components for forms
// (CommentForm, SearchForm, UploadForm are in ./forms.tsx)

