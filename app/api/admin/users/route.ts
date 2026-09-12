import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAllUsers, getAuditLog, getActiveSessions, getUploads } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  return NextResponse.json({
    users: getAllUsers(),
    sessions: getActiveSessions(),
    audit: getAuditLog(50),
    uploads: getUploads(20),
  });
}
