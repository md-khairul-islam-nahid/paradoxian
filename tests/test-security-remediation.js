// Automated Security Remediation Verification Suite
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, data: json, raw: body });
      });
    });
    req.on('error', reject);
    if (data) {
      if (typeof data === 'string') {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

async function runSecurityTests() {
  console.log("=== STARTING SECURITY & DEFENSE AUDIT TESTS ===");

  // 1. Security Headers & Health Check
  console.log("\n[Sec-Test 1] Verifying HTTP Security Headers...");
  const healthRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  });
  if (healthRes.status !== 200) {
    throw new Error(`FAIL: Health check failed with status ${healthRes.status}`);
  }
  if (healthRes.headers['x-content-type-options'] !== 'nosniff') {
    throw new Error("FAIL: X-Content-Type-Options missing or not nosniff!");
  }
  if (healthRes.headers['x-frame-options'] !== 'SAMEORIGIN') {
    throw new Error("FAIL: X-Frame-Options missing or not SAMEORIGIN!");
  }
  if (healthRes.headers['x-xss-protection'] !== '1; mode=block') {
    throw new Error("FAIL: X-XSS-Protection missing or not 1; mode=block!");
  }
  console.log("PASS: All required security headers present.");

  // 2. Sensitive File Access Blocking (Firewall)
  console.log("\n[Sec-Test 2] Verifying Express Firewall Blocks Sensitive Files...");
  const forbiddenPaths = [
    '/server/data/admins.json',
    '/server/data/students.json',
    '/server/server.js',
    '/package.json',
    '/package-lock.json',
    '/.planning/ROADMAP.md',
    '/tests/test-backend-governance.js'
  ];

  for (const path of forbiddenPaths) {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET'
    });
    if (res.status !== 403) {
      throw new Error(`FAIL: Expected 403 Forbidden for ${path}, but got ${res.status}`);
    }
    console.log(`  ✓ Blocked: ${path} (HTTP 403 Forbidden)`);
  }
  console.log("PASS: Express firewall successfully blocked all sensitive server and data paths.");

  // 3. Legitimate Static Assets Allowed
  console.log("\n[Sec-Test 3] Verifying Legitimate Static Files Are Accessible...");
  const allowedPaths = ['/index.html', '/css/styles.css', '/js/main.js'];
  for (const path of allowedPaths) {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET'
    });
    if (res.status !== 200) {
      throw new Error(`FAIL: Expected 200 OK for ${path}, but got ${res.status}`);
    }
    console.log(`  ✓ Served: ${path} (HTTP 200 OK)`);
  }
  console.log("PASS: Legitimate static frontend assets are cleanly accessible.");

  // 4. Admin Password Leakage Sanitization
  console.log("\n[Sec-Test 4] Verifying Admin Password Sanitization in API...");
  const adminRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/list',
    method: 'GET'
  });
  if (adminRes.status !== 200 || !adminRes.data || !Array.isArray(adminRes.data.admins)) {
    throw new Error(`FAIL: /api/admin/list did not return admin list (status: ${adminRes.status})`);
  }
  for (const admin of adminRes.data.admins) {
    if (admin.password !== undefined) {
      throw new Error(`FAIL: Found password property in admin ${admin.email}!`);
    }
  }
  if (Array.isArray(adminRes.data.pending)) {
    for (const pending of adminRes.data.pending) {
      if (pending.password !== undefined) {
        throw new Error(`FAIL: Found password property in pending admin ${pending.email}!`);
      }
    }
  }
  console.log(`PASS: All ${adminRes.data.admins.length} admins and pending accounts completely sanitized (no password fields).`);

  // 5. OTP Rate Limiting Defense
  console.log("\n[Sec-Test 5] Verifying OTP Cooldown Rate Limiting (HTTP 429)...");
  // 1st request
  const otpRes1 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/forgot-password/send-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: '2024227170' });

  // 2nd rapid request immediately after (within 60s cooldown)
  const otpRes2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/forgot-password/send-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: '2024227170' });

  if (otpRes2.status !== 429) {
    throw new Error(`FAIL: Expected HTTP 429 on rapid OTP request, got ${otpRes2.status}`);
  }
  console.log(`PASS: Rate limit triggered successfully: HTTP 429 - "${otpRes2.data?.message}"`);

  // 6. OTP Brute-Force Lockout Defense
  console.log("\n[Sec-Test 6] Verifying OTP Brute-Force Invalidation After 5 Failed Attempts...");
  // Attempt 5 bad codes
  for (let i = 1; i <= 5; i++) {
    const verifyBad = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/forgot-password/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'iam.nahidkhan.bd@gmail.com', code: '000000' });
    console.log(`  Bad attempt #${i} returned status: ${verifyBad.status}, message: "${verifyBad.data?.message}"`);
  }
  
  // 6th attempt should state the code was invalidated due to too many attempts
  const verify6th = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/forgot-password/verify-otp',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'iam.nahidkhan.bd@gmail.com', code: '000000' });
  if (verify6th.status !== 400 || !verify6th.data?.message?.includes("expired or was not requested")) {
    throw new Error(`FAIL: OTP was not invalidated after 5 failed attempts! Response: ${JSON.stringify(verify6th.data)}`);
  }
  console.log("PASS: OTP record successfully invalidated and purged after 5 failed attempts.");

  console.log("\n=========================================================================");
  console.log("🎉 ALL SECURITY AUDIT & REMEDIATION TESTS PASSED!");
  console.log("=========================================================================");
}

module.exports = { runSecurityTests };

if (require.main === module) {
  runSecurityTests().catch(err => {
    console.error("\n❌ Security test failed:", err.message);
    process.exit(1);
  });
}
