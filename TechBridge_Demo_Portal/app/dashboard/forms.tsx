'use client';

import { useState } from 'react';

export function CommentForm() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, lessonId: 'general' }),
      });
      const data = await res.json();
      if (data.success) {
        setResult('✓ Comment posted!');
        setMessage('');
        // Reload to see the new comment
        setTimeout(() => window.location.reload(), 800);
      } else {
        setError(data.error || 'Failed to post comment');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 600 }}>
      {result && <div className="success">{result}</div>}
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a comment... Try <script>alert(1)</script> to test XSS detection"
          required
          style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: 6, minHeight: 80, fontFamily: 'inherit', fontSize: 14 }}
        />
      </div>
      <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 24px' }} disabled={loading}>
        {loading ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
}

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; title: string; category: string; teacher: string; students: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 16, maxWidth: 600 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search... Try ' OR '1'='1 to test SQLi"
          style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
        />
        <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 24px' }} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {results.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Course</th><th>Category</th><th>Teacher</th><th>Students</th></tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.category}</td>
                <td>{r.teacher}</td>
                <td>{r.students}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function UploadForm({ username }: { username: string }) {
  const [result, setResult] = useState<{ name: string; size: number; verdict: string; hash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setResult(data.file);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {error && <div className="error">{error}</div>}
      {result && (
        <div className={`notice ${result.verdict === 'malicious' ? 'alert-banner' : ''}`}>
          <strong>✓ Uploaded:</strong> {result.name}<br />
          <strong>Size:</strong> {(result.size / 1024).toFixed(1)} KB<br />
          <strong>Hash:</strong> <code>{result.hash}</code><br />
          <strong>Verdict:</strong>{' '}
          <span className={`verdict-${result.verdict}`}>{result.verdict}</span>
          {result.verdict === 'malicious' && ' — ⚠️ Bloom would block this upload and revoke your session'}
        </div>
      )}
      <div className="form-group">
        <input type="file" onChange={submit} disabled={uploading} style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, width: '100%' }} />
      </div>
      {uploading && <p className="muted">Uploading...</p>}
      <p className="muted" style={{ fontSize: 12 }}>
        Uploaded by @{username}. Max 5MB. Verdict computed by Bloom Shield heuristic.
      </p>
    </div>
  );
}
