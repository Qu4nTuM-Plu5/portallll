import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken, getCourses } from '@/lib/auth';

export default async function CoursesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = token ? verifyToken(token) : null;
  const courses = getCourses();

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

      <div className="container">
        <h2 style={{ marginBottom: 20 }}>📚 All Courses ({courses.length})</h2>
        <div className="features">
          {courses.map(c => (
            <div key={c.id} className="feature-card">
              <h3>{c.title}</h3>
              <p><strong>Category:</strong> {c.category}</p>
              <p><strong>Teacher:</strong> {c.teacher}</p>
              <p><strong>Enrolled:</strong> {c.students.toLocaleString()} students</p>
            </div>
          ))}
        </div>
        <div className="notice">
          💡 Tip: Use the search box on your dashboard to search courses. Try SQLi payloads to trigger Bloom&apos;s T1190 detection.
        </div>
      </div>
    </div>
  );
}
