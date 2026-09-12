import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAuditLog, audit } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  audit(user.id, 'VIEW_AUDIT_LOG', ip, req.headers.get('user-agent') || 'unknown');

  return NextResponse.json({ audit: getAuditLog(100) });
}
