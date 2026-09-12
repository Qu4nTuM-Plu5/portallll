/**
 * Bloom Security Shield — Zero-dependency inline SDK for Next.js middleware.
 *
 * This file is the SDK that connects your site to Bloom SIEM.
 * Every request passes through middleware.ts which calls these functions.
 *
 * Configure via env vars (set in .env.local or Vercel):
 *  BLOOM_API_URL    = https://your-bloom-instance.com
 *  BLOOM_PROJECT_ID = proj_xxx
 *  BLOOM_API_KEY    = bloom_xxx
 */

export interface BloomEvent {
  method: string;
  path: string;
  host: string;
  ip: string;
  userAgent?: string;
  sessionId?: string;
  inputSnippet?: string;
  fileName?: string;
  fileHash?: string;
  fileVerdict?: string;
  statusCode?: number;
  responseTime?: number;
}

export interface BloomDecision {
  action: 'ALLOW' | 'BLOCK' | 'CHALLENGE' | 'LOG';
  rule?: string;
  reason?: string;
}

const BLOOM_API_URL = process.env.BLOOM_API_URL || '';
const BLOOM_PROJECT_ID = process.env.BLOOM_PROJECT_ID || '';
const BLOOM_API_KEY = process.env.BLOOM_API_KEY || '';

const AUTH_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Bloom-Project': BLOOM_PROJECT_ID,
  'X-Bloom-Key': BLOOM_API_KEY,
};

/**
 * Evaluate a request threat — calls Bloom /api/sdk/evaluate.
 * Returns BLOCK if the IP/session/path matches a rule.
 */
export async function bloomEvaluate(event: BloomEvent): Promise<BloomDecision> {
  if (!BLOOM_API_URL || !BLOOM_PROJECT_ID || !BLOOM_API_KEY) {
    return { action: 'ALLOW' };
  }
  try {
    const res = await fetch(`${BLOOM_API_URL}/api/sdk/evaluate`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        ip: event.ip,
        path: event.path,
        userAgent: event.userAgent,
        sessionId: event.sessionId,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { action: 'ALLOW' };
    const data = await res.json();
    return {
      action: data.action || 'ALLOW',
      rule: data.rule,
      reason: data.reason,
    };
  } catch {
    return { action: 'ALLOW' };
  }
}

/**
 * Track an event — fire-and-forget POST to Bloom /api/sdk/ingest.
 * Never throws.
 */
export async function bloomTrack(event: BloomEvent): Promise<void> {
  if (!BLOOM_API_URL || !BLOOM_PROJECT_ID || !BLOOM_API_KEY) return;
  try {
    await fetch(`${BLOOM_API_URL}/api/sdk/ingest`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ events: [event] }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Silent fail — don't crash the user request
  }
}

/**
 * Sanitize input — returns truncated snippet (max 200 chars).
 */
export function sanitizeInput(body: string): string | null {
  if (!body || body.length === 0) return null;
  try {
    if (body.startsWith('{') || body.startsWith('[')) {
      const obj = JSON.parse(body);
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') {
          fields[k] = v.slice(0, 100);
        }
      }
      return JSON.stringify(fields).slice(0, 200);
    }
    return body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

/**
 * Compute a simple malware verdict from filename heuristics.
 */
export function computeFileVerdict(fileName: string): 'malicious' | 'clean' | 'suspicious' {
  if (!fileName) return 'clean';
  const lower = fileName.toLowerCase();
  // Double extension (e.g., avatar.php.exe, photo.jpg.exe)
  if (/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|txt)\.(exe|bat|cmd|sh|php|jsp|asp|aspx|js|vbs|wsf)$/i.test(fileName)) {
    return 'malicious';
  }
  // Direct malicious extensions
  if (/\.(exe|bat|cmd|sh|php|jsp|asp|aspx|vbs|wsf|msi|dll|scr|com|pif)$/i.test(fileName)) {
    return 'suspicious';
  }
  return 'clean';
}
