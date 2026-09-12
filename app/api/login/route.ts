import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, findUserByEmail, verifyPassword, createToken, registerSession, audit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  // Look up by username OR email
  const user = findUserByUsername(username) || findUserByEmail(username);
  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  if (!verifyPassword(user, password)) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // Create JWT token
  const token = createToken(user);

  // Register session in memory (for session-replication detection)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  registerSession(token.slice(0, 32), user, ip, userAgent);

  // Audit log
  audit(user.id, 'LOGIN', ip, userAgent, { username: user.username });

  const res = NextResponse.json({
    success: true,
    role: user.role,
    name: user.name,
    username: user.username,
    email: user.email,
  });
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  });
  return res;
}
