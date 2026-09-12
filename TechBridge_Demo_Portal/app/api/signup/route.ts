import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, findUserByEmail, createUser, createToken, registerSession, audit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, email, password, name } = body as {
    username?: string; email?: string; password?: string; name?: string;
  };

  if (!username || !email || !password || !name) {
    return NextResponse.json({ error: 'All fields required (username, email, password, name)' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // Check if username/email already taken
  if (findUserByUsername(username)) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }
  if (findUserByEmail(email)) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  // Create new user (always 'student' role for self-signup)
  const user = createUser(username, email, password, 'student', name);
  const token = createToken(user);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  registerSession(token.slice(0, 32), user, ip, userAgent);
  audit(user.id, 'SIGNUP', ip, userAgent, { username: user.username });

  const res = NextResponse.json({
    success: true,
    role: user.role,
    name: user.name,
  });
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return res;
}
