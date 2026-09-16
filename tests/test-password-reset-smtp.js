// Automated test for Forgot Password and Sign Up Gmail SMTP Dispatch
const { app, mailTransporter, otpStore, signupOtpStore } = require('../server/server');
const http = require('http');
const fs = require('fs');
const path = require('path');

let server;
const TEST_PORT = 5001;

function makeRequest(reqPath, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: reqPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING FORGOT PASSWORD & SIGN UP GMAIL SMTP TESTS ===\n');

  try {
    // 1. Start test server
    server = app.listen(TEST_PORT);
    console.log(`[PASS] Test server listening on port ${TEST_PORT}`);

    // 2. Health check
    console.log('\n--- TEST 1: Health Endpoint ---');
    const health = await makeRequest('/api/health');
    if (health.status !== 200 || health.data.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log(`[PASS] Health check verified: ${health.data.service} (${health.data.officialEmail})`);

    // 3. Forgot Password - Non-existent Roll Number
    console.log('\n--- TEST 2: Forgot Password - Non-existent Roll Number ---');
    const invalidReq = await makeRequest('/api/auth/forgot-password/send-otp', 'POST', { identifier: '9999999999' });
    if (invalidReq.status !== 404) {
      throw new Error(`Expected 404 for non-existent roll, got ${invalidReq.status}`);
    }
    console.log(`[PASS] Rejected non-existent roll as expected: "${invalidReq.data.message}"`);

    // 4. Forgot Password - Valid Registered Student (CR Nahid) via Gmail SMTP
    console.log('\n--- TEST 3: Forgot Password - Automated OTP Dispatch via Gmail SMTP ---');
    const sendOtpRes = await makeRequest('/api/auth/forgot-password/send-otp', 'POST', { identifier: 'iam.nahidkhan.bd@gmail.com' });
    if (sendOtpRes.status !== 200 || !sendOtpRes.data.success) {
      throw new Error(`Failed to send OTP: ${JSON.stringify(sendOtpRes)}`);
    }
    console.log(`[PASS] OTP successfully generated and dispatched via Gmail SMTP:`);
    console.log(`       Message: ${sendOtpRes.data.message}`);
    console.log(`       Recipient: ${sendOtpRes.data.email}`);

    // 5. Verify OTP with incorrect code
    console.log('\n--- TEST 4: Verify OTP - Incorrect Code Handling ---');
    const wrongVerify = await makeRequest('/api/auth/forgot-password/verify-otp', 'POST', {
      email: 'iam.nahidkhan.bd@gmail.com',
      code: '000000'
    });
    if (wrongVerify.status !== 400) {
      throw new Error(`Expected 400 for incorrect code, got ${wrongVerify.status}`);
    }
    console.log(`[PASS] Correctly rejected invalid code: "${wrongVerify.data.message}"`);

    // 6. Test password reset flow with valid OTP from server state
    console.log('\n--- TEST 5: Complete Password Reset Cycle with Real OTP ---');
    const otpRecord = otpStore.get('iam.nahidkhan.bd@gmail.com');
    if (!otpRecord || !otpRecord.code) throw new Error('Failed to find active OTP in otpStore');

    console.log(`[INFO] Active OTP code from store: ${otpRecord.code}`);

    // Verify OTP
    const validVerify = await makeRequest('/api/auth/forgot-password/verify-otp', 'POST', {
      email: 'iam.nahidkhan.bd@gmail.com',
      code: otpRecord.code
    });
    if (validVerify.status !== 200 || !validVerify.data.success) {
      throw new Error(`Failed to verify valid OTP: ${JSON.stringify(validVerify)}`);
    }
    console.log(`[PASS] OTP verification confirmed: "${validVerify.data.message}"`);

    // Reset password
    const newTestPassword = 'SecurePhysicsPassword2026';
    const resetRes = await makeRequest('/api/auth/forgot-password/reset-password', 'POST', {
      email: 'iam.nahidkhan.bd@gmail.com',
      code: otpRecord.code,
      newPassword: newTestPassword
    });
    if (resetRes.status !== 200 || !resetRes.data.success) {
      throw new Error(`Failed to reset password: ${JSON.stringify(resetRes)}`);
    }
    console.log(`[PASS] Password reset confirmed: "${resetRes.data.message}"`);

    // Verify persistence in students.json
    const studentsFile = path.join(__dirname, '..', 'server', 'data', 'students.json');
    const updatedStudents = JSON.parse(fs.readFileSync(studentsFile, 'utf8'));
    const updatedStudent = updatedStudents.find(s => s.email === 'iam.nahidkhan.bd@gmail.com');
    if (!updatedStudent || updatedStudent.password !== newTestPassword) {
      throw new Error('Password was not properly persisted in students database!');
    }
    console.log(`[PASS] Database verification: student password updated to "${updatedStudent.password}" via ${updatedStudent.passwordResetVia}`);

    // 7. Test Student Sign Up OTP Dispatch via Gmail SMTP
    console.log('\n--- TEST 6: Student Sign Up OTP Dispatch via Gmail SMTP ---');
    const signupEmail = 'test.student.2024@gmail.com';
    const signupRes = await makeRequest('/api/auth/signup/send-otp', 'POST', {
      name: 'Test Prospective Student',
      email: signupEmail,
      roll: '2024999999',
      phone: '+8801700000000',
      bloodGroup: 'O+',
      district: 'Rajshahi'
    });
    if (signupRes.status !== 200 || !signupRes.data.success) {
      throw new Error(`Failed to send sign up OTP: ${JSON.stringify(signupRes)}`);
    }
    console.log('[PASS] Sign up OTP generated and dispatched via Gmail SMTP:');
    console.log(`       Message: ${signupRes.data.message}`);

    // 8. Test Sign Up OTP Verification
    console.log('\n--- TEST 7: Student Sign Up OTP Verification ---');
    const signupRecord = signupOtpStore.get(signupEmail);
    if (!signupRecord || !signupRecord.code) {
      throw new Error('No signup OTP was saved in store!');
    }
    console.log(`[INFO] Active signup OTP code from store: ${signupRecord.code}`);

    const verifySignupRes = await makeRequest('/api/auth/signup/verify-otp', 'POST', {
      email: signupEmail,
      code: signupRecord.code
    });
    if (verifySignupRes.status !== 200 || !verifySignupRes.data.success) {
      throw new Error(`Failed to verify signup OTP: ${JSON.stringify(verifySignupRes)}`);
    }
    console.log(`[PASS] Sign up OTP successfully verified: payload roll "${verifySignupRes.data.payload.roll}" verifiedVia "${verifySignupRes.data.verifiedVia}"`);

    // Restore standard password
    await makeRequest('/api/auth/update-account-password', 'POST', {
      email: 'iam.nahidkhan.bd@gmail.com',
      newPassword: '@NAHID_KHAN_2024227170'
    });

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('\n[FAIL] Test error:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
      console.log('\n[INFO] Test server closed.');
    }
  }
}

runTests();
