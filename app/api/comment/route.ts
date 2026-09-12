import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, addComment, audit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated — please log in' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { message, lessonId } = body as { message?: string; lessonId?: string };

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }
  if (message.length > 1000) {
    return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 });
  }

  // Store comment AS-IS (no HTML escaping) — Bloom's job is to detect/block XSS
  // If Bloom middleware blocked it, we'd never get here.
  // If it gets here, it's allowed — but display-time escaping on the client prevents execution.
  const comment = addComment(user.id, user.username, lessonId || 'general', message);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  audit(user.id, 'COMMENT', ip, req.headers.get('user-agent') || 'unknown', { lessonId, snippet: message.slice(0, 60) });

  return NextResponse.json({ success: true, comment });
}

export async function GET(req: NextRequest) {
  const lessonId = req.nextUrl.searchParams.get('lessonId') || undefined;
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
  const comments = await import('@/lib/auth').then(m => m.getComments(lessonId, limit));
  return NextResponse.json({ comments });
}
