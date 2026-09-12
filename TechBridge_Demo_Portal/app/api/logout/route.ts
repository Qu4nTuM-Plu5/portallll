import { NextRequest, NextResponse } from 'next/server';
import { revokeSession, audit, verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const sessionId = token?.slice(0, 32);

  if (token) {
    const user = verifyToken(token);
    if (user) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      audit(user.id, 'LOGOUT', ip, req.headers.get('user-agent') || 'unknown', { username: user.username });
    }
  }

  if (sessionId) revokeSession(sessionId);

  const res = NextResponse.json({ success: true });
  res.cookies.delete('session');
  return res;
}
