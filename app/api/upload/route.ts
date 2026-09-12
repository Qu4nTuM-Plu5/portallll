import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, recordUpload, audit } from '@/lib/auth';
import { computeFileVerdict } from '@/lib/bloom-shield';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated — please log in' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 5MB max
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Compute verdict (malicious if double extension, etc.)
    const verdict = computeFileVerdict(file.name);

    // Simple hash from size + random
    const hash = file.size.toString(16) + Math.random().toString(36).slice(2, 8);

    // Record upload
    recordUpload(user.id, user.username, file.name, file.size, hash, verdict);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    audit(user.id, 'UPLOAD', ip, req.headers.get('user-agent') || 'unknown', { fileName: file.name, verdict });

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        hash,
        verdict,
      },
      uploadedBy: user.username,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Upload failed: ' + (e instanceof Error ? e.message : 'unknown') }, { status: 500 });
  }
}
