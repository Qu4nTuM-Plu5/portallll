#!/usr/bin/env bash
# Test the TechBridge demo portal — fires all 6 attack types against the running site
# Usage: bash scripts/test-all-attacks.sh [URL]
# Default URL: http://localhost:4000

set -uo pipefail
URL="${1:-http://localhost:4000}"

echo "================================================================"
echo "  🌸 TechBridge Demo Portal — Full Functional Test"
echo "================================================================"
echo "Target: $URL"
echo ""

echo "=== 1. Wrong password (should fail) ==="
curl -s --max-time 5 -X POST "$URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"WRONG"}'
echo ""
echo ""

echo "=== 2. Correct login (admin) ==="
ADMIN_JWT=$(curl -s --max-time 5 -X POST "$URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@2025"}' \
  -c - | grep "session" | awk '{print $NF}')
echo "Got admin JWT: ${ADMIN_JWT:0:50}..."
echo ""

echo "=== 3. Login as student ==="
STUDENT_JWT=$(curl -s --max-time 5 -X POST "$URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"student","password":"Student@2025"}' \
  -c - | grep "session" | awk '{print $NF}')
echo "Got student JWT: ${STUDENT_JWT:0:50}..."
echo ""

echo "=== 4. Signup new user ==="
curl -s --max-time 5 -X POST "$URL/api/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser_'$RANDOM'","email":"new@x.com","password":"Test@123","name":"New User"}'
echo ""
echo ""

echo "=== 5. Post legit comment ==="
curl -s --max-time 5 -X POST "$URL/api/comment" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$STUDENT_JWT" \
  -d '{"message":"Hello world from the test script!"}'
echo ""
echo ""

echo "=== 6. Post XSS comment (Bloom T1059 target) ==="
curl -s --max-time 5 -X POST "$URL/api/comment" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$STUDENT_JWT" \
  -d '{"message":"<script>alert(document.cookie)</script>"}'
echo ""
echo ""

echo "=== 7. Search for python (legit) ==="
curl -s --max-time 5 "$URL/api/search?q=python"
echo ""
echo ""

echo "=== 8. SQLi search (Bloom T1190 target) ==="
curl -s --max-time 5 "$URL/api/search?q=' UNION SELECT * FROM users--"
echo ""
echo ""

echo "=== 9. Upload legit file ==="
echo "Hello, this is a test file." > /tmp/test_upload.txt
curl -s --max-time 5 -X POST "$URL/api/upload" \
  -H "Cookie: session=$STUDENT_JWT" \
  -F "file=@/tmp/test_upload.txt"
echo ""
echo ""

echo "=== 10. Upload malware (Bloom T1204 target) ==="
echo "fake malware content" > /tmp/avatar.php.exe
curl -s --max-time 5 -X POST "$URL/api/upload" \
  -H "Cookie: session=$STUDENT_JWT" \
  -F "file=@/tmp/avatar.php.exe"
echo ""
echo ""

echo "=== 11. Admin access as student (should 403) ==="
curl -s --max-time 5 -H "Cookie: session=$STUDENT_JWT" "$URL/api/admin/users"
echo ""
echo ""

echo "=== 12. Admin access as admin (should succeed) ==="
curl -s --max-time 5 -H "Cookie: session=$ADMIN_JWT" "$URL/api/admin/users" | head -200
echo ""
echo ""

echo "=== 13. Brute force (6 wrong attempts — Bloom T1110 target) ==="
for i in 1 2 3 4 5 6; do
  curl -s --max-time 5 -X POST "$URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"wrong$i\"}" > /dev/null
  echo "  attempt $i: sent"
done
echo ""

echo "=== 14. Route scanning (Bloom T1595 target) ==="
for p in /admin /.env /wp-admin /phpmyadmin /config.php /.git/config /api/admin/users; do
  code=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" "$URL$p")
  echo "  $code  $p"
done
echo ""

echo "================================================================"
echo "  ✓ All 14 functional tests complete."
echo "================================================================"
echo ""
echo "If Bloom SDK is configured (BLOOM_API_URL set in .env), all the"
echo "attack tests above should have triggered Bloom alerts. Open:"
echo "  https://preview-b0c5a002-b2c8-4f4a-a7a9-7d4e2b51a596.space-z.ai/"
echo "to see them in the dashboard."
