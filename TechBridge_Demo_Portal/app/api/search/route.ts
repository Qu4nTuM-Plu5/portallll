import { NextRequest, NextResponse } from 'next/server';
import { getCourses, searchCourses } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q) {
    return NextResponse.json({ success: true, query: '', results: getCourses(), count: getCourses().length });
  }
  // In real life: SELECT * FROM courses WHERE title LIKE '%${q}%' — vulnerable to SQLi
  // Here we use in-memory filter (safe), but Bloom still detects the attack pattern
  // and blocks it at the middleware layer (returns 403 before reaching here).
  const results = searchCourses(q);
  return NextResponse.json({
    success: true,
    query: q,
    results,
    count: results.length,
  });
}
