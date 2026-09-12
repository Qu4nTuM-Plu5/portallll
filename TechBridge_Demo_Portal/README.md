# TechBridge Academy — Demo Education Portal

A **fully functional** Next.js education portal for testing Bloom SIEM. Has real JWT auth, file uploads, comments, search, admin panel — all instrumented with Bloom SDK middleware.

## Features (all functional)

| Feature | What it does | Bloom detection it triggers |
|---------|--------------|------------------------------|
| 🔐 JWT Login | bcrypt password hashing + JWT in HTTP-only cookie | T1110 Brute Force (6+ failed logins) |
| 📝 Sign Up | Create new student accounts | — |
| 💬 Comments | Post messages on lessons | T1059 XSS (`<script>` tags) |
| 🔍 Course Search | Search courses by title/category | T1190 SQLi (`UNION SELECT`, `OR 1=1`) |
| 📎 File Upload | Upload assignments (5MB max) | T1204 Malware (double extension) |
| 🛡️ Admin Panel | Admin-only user + audit log management | T1595 Route Scan, T1078 Session Replication |
| 🔑 Sessions | In-memory session tracking | T1078 Same session from 2 IPs |
| 📜 Audit Log | Every action logged with IP + user agent | — |

## Quick Start

### 1. Install
```bash
cd demo-portal
npm install
# or: bun install
```

### 2. Set up env vars
Copy `.env.example` to `.env.local` and fill in your Bloom SIEM credentials:
```env
BLOOM_API_URL=https://preview-b0c5a002-b2c8-4f4a-a7a9-7d4e2b51a596.space-z.ai
BLOOM_PROJECT_ID=proj_h4du59c8r2b
BLOOM_API_KEY=bloom_5glay3fudrdkx6e3lwy7fm
JWT_SECRET=change-this-to-a-long-random-secret
```

If you don't set `BLOOM_API_URL`, the middleware skips Bloom calls and the site works locally without monitoring.

### 3. Run locally
```bash
npm run dev
# App on http://localhost:4000
```

### 4. Deploy to Vercel
```bash
vercel
# Set the same env vars in Vercel → Settings → Environment Variables
```

## Demo Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin` | `Admin@2025` | Full admin panel + dashboard |
| Teacher | `teacher` | `Teacher@2025` | Dashboard + course management |
| Student | `student` | `Student@2025` | Dashboard only |
| Student 2 | `mgmg` | `MgMg@2025` | Second student (for session hijack test) |

## Test Scenarios — All Real, All Tracked

### 1. Brute Force Login (T1110)
Visit `/login`, try wrong password 6+ times. Bloom detects after 5 failed attempts.

```bash
# Or via curl
for i in {1..7}; do
  curl -X POST https://YOUR-URL/api/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"wrong$i\"}"
done
```

### 2. SQL Injection (T1190)
Visit dashboard → Search → enter: `' OR '1'='1` or `UNION SELECT * FROM users`

```bash
curl "https://YOUR-URL/api/search?q=' UNION SELECT * FROM users--"
```

### 3. Cross-Site Scripting (T1059)
Visit dashboard → Comments → enter: `<script>alert('XSS')</script>`

```bash
# After login (get cookie)
curl -X POST https://YOUR-URL/api/comment \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_JWT" \
  -d '{"message":"<script>alert(1)</script>"}'
```

### 4. Malware Upload (T1204)
Visit dashboard → Upload → upload a file named `avatar.php.exe`

```bash
echo "fake malware" > test.php.exe
curl -X POST https://YOUR-URL/api/upload \
  -H "Cookie: session=YOUR_JWT" \
  -F "file=@test.php.exe"
```

### 5. Route Scanning (T1595)
Try accessing `/admin`, `/.env`, `/wp-admin`, etc.

```bash
for p in /admin /.env /wp-admin /phpmyadmin /config.php /.git/config; do
  curl -o /dev/null -w "%{http_code} $p\n" https://YOUR-URL$p
done
```

### 6. Session Hijacking (T1078) — REAL TWO-DEVICE TEST
1. Open Chrome on laptop → log in to techbridgeacademymm → JWT cookie set
2. Open Firefox on phone (different network — use VPN/proxy) → use same JWT cookie
3. Both make requests to /api/me or /dashboard
4. Bloom sees same session from 2 different IPs → fires T1078 → revokes session

```bash
# Get the JWT cookie after logging in
JWT="eyJhbGc..."  # from your browser devtools → Application → Cookies → session

# Use it from a different IP (VPN/proxy)
curl https://YOUR-URL/api/me -H "Cookie: session=$JWT" --proxy http://vpn:port

# Or from a different network entirely (your phone's 4G)
curl https://YOUR-URL/api/me -H "Cookie: session=$JWT"
```

### 7. Unauthorized Admin Access
Log in as `student`, then visit `/admin` or `curl https://YOUR-URL/api/admin/users` — gets 403.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Browser (real user)                                     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/HTTPS request
                         ▼
┌─────────────────────────────────────────────────────────┐
│ middleware.ts (Bloom Shield)                             │
│   - Extract IP, JWT cookie, user-agent, body             │
│   - POST /api/sdk/evaluate → BLOCK if rule matches       │
│   - POST /api/sdk/ingest → track every request           │
└────────────────────────┬────────────────────────────────┘
                         │ (only if not blocked)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Next.js App Router (login, comment, search, upload, admin)│
│   - Real JWT auth with bcrypt                            │
│   - In-memory user store (Map)                           │
│   - File upload with verdict computation                 │
│   - Comments + audit log                                 │
└────────────────────────┬────────────────────────────────┘
                         │ (fire-and-forget fetch)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Bloom SIEM Dashboard                                     │
│   - MITRE ATT&CK detection (6 active rules)              │
│   - AI analyst verdicts (GLM-4.6)                       │
│   - Auto IP block + session revocation                   │
│   - Telegram alerts (report-only)                        │
└─────────────────────────────────────────────────────────┘
```

## Files

```
demo-portal/
├── middleware.ts                 # Bloom Shield — wraps every request
├── lib/
│   ├── bloom-shield.ts          # Zero-dep Bloom SDK (eval + track + verdict)
│   └── auth.ts                  # JWT + bcrypt + in-memory user store
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                  # Homepage (server component)
│   ├── globals.css              # Styles
│   ├── login/page.tsx           # Login form (client)
│   ├── signup/page.tsx          # Signup form (client)
│   ├── dashboard/page.tsx       # Student/teacher dashboard (server)
│   ├── dashboard/forms.tsx      # Comment/Search/Upload forms (client)
│   ├── admin/page.tsx           # Admin panel (server, role-protected)
│   ├── courses/page.tsx         # Course listing
│   └── api/
│       ├── login/route.ts       # JWT login (bcrypt verify + cookie)
│       ├── logout/route.ts      # Clear cookie
│       ├── signup/route.ts      # New user registration
│       ├── me/route.ts           # Get current user from JWT
│       ├── comment/route.ts      # Post comment (XSS target)
│       ├── search/route.ts       # Search courses (SQLi target)
│       ├── upload/route.ts       # File upload (malware target)
│       ├── courses/route.ts      # List all courses
│       └── admin/
│           ├── users/route.ts    # Admin: list users + sessions + uploads
│           └── audit/route.ts    # Admin: view audit log
├── package.json
├── tsconfig.json
├── next.config.js
├── vercel.json
├── .env.example
└── README.md
```

## Notes

- **In-memory data** — resets on cold start. Fine for demo; replace with a DB (Postgres/MySQL/MongoDB) for production.
- **JWT secret** — change `JWT_SECRET` to a long random string before deploying.
- **CORS** — Bloom SDK uses fetch with `signal: AbortSignal.timeout(3000)` so it never blocks user requests if Bloom is unreachable.
- **Bloom verdicts** — when Bloom middleware isn't configured, the demo site still works perfectly. You just won't see attacks blocked at the middleware level. The `/api/upload` endpoint still computes file verdicts locally via `computeFileVerdict()`.

## What You'll See in Bloom Dashboard

After deploying this site with Bloom SDK enabled:

1. **Real visitor traffic** in `/live-logs` (not synthetic test data)
2. **Real attacks blocked** at the middleware level (403 responses)
3. **MITRE alerts** with real attacker IPs
4. **Auto-blocked IPs** in the blocklist
5. **Telegram alerts** with real attacker info
6. **AI verdicts** with confidence scores on real attacks

Open Bloom SIEM:
**👉 https://preview-b0c5a002-b2c8-4f4a-a7a9-7d4e2b51a596.space-z.ai/**
