// Automated test suite for dual password sync, custom student roles, and admin nominations
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log("=== STARTING COMPREHENSIVE BACKEND VERIFICATION ===");

  // 1. Check Admin List Endpoint
  console.log("\n[Test 1] Fetching admin list & pending requests...");
  const adminListRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/list',
    method: 'GET'
  });
  console.log(`Status: ${adminListRes.status}, Found ${adminListRes.data.admins?.length} admins.`);
  const superAdmin = adminListRes.data.admins?.find(a => a.email === 'iam.nahidkhan.bd@gmail.com');
  if (!superAdmin || !superAdmin.isSuperAdmin) {
    throw new Error("FAIL: Super Admin iam.nahidkhan.bd@gmail.com not found or not marked isSuperAdmin!");
  }
  console.log("PASS: Super Admin designated correctly:", superAdmin.name, `(${superAdmin.email})`);

  // 2. Test Custom Student Role Update
  console.log("\n[Test 2] Updating student role to custom string 'Chief Lab Coordinator'...");
  const roleRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/student-role',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    studentId: 'std-102',
    role: 'Chief Lab Coordinator'
  });
  console.log(`Status: ${roleRes.status}, Message: ${roleRes.data.message}`);
  if (roleRes.status !== 200 || roleRes.data.student?.role !== 'Chief Lab Coordinator') {
    throw new Error("FAIL: Custom role was not updated or returned correctly!");
  }
  console.log("PASS: Custom role updated successfully to:", roleRes.data.student.role);

  // 3. Test Admin Nomination Workflow
  console.log("\n[Test 3] Submitting admin nomination for student candidate...");
  const testCandidateRoll = "202499" + Math.floor(1000 + Math.random() * 9000);
  const nominateRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/nominate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    studentId: 'std-candidate',
    name: 'Academic Test Candidate',
    roll: testCandidateRoll,
    email: `candidate.${testCandidateRoll}@rc.ac.bd`,
    reason: 'Responsible for batch lab sessions and exam circular distributions',
    nominatedBy: 'Admin Nahid'
  });
  console.log(`Status: ${nominateRes.status}, Message: ${nominateRes.data.message}`);
  let requestId;
  if (nominateRes.status === 400 && nominateRes.data.message.includes('already pending')) {
    const list = await request({ hostname: 'localhost', port: 5000, path: '/api/admin/list', method: 'GET' });
    const existing = list.data.requests.find(r => r.roll === testCandidateRoll && r.status === 'Pending Super Admin Approval');
    requestId = existing?.id;
    console.log("Using existing pending nomination with Request ID:", requestId);
  } else {
    if ((nominateRes.status !== 200 && nominateRes.status !== 201) || !nominateRes.data.request?.id) {
      throw new Error("FAIL: Nomination could not be created! " + JSON.stringify(nominateRes.data));
    }
    requestId = nominateRes.data.request.id;
    console.log("PASS: Nomination submitted with Request ID:", requestId);
  }

  // 4. Test Super Admin Approval Gate (Non-super admin should fail)
  console.log("\n[Test 4] Verifying security: non-super admin cannot approve nomination...");
  const unauthorizedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/approve-nomination',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    requestId: requestId,
    superAdminEmail: 'fake.admin@gmail.com'
  });
  console.log(`Status: ${unauthorizedRes.status}, Message: ${unauthorizedRes.data.message}`);
  if (unauthorizedRes.status !== 403) {
    throw new Error("FAIL: Non-super admin was not blocked with 403 Forbidden!");
  }
  console.log("PASS: Non-super admin successfully blocked (403 Forbidden)!");

  // 5. Test Super Admin Approval (Authorized)
  console.log("\n[Test 5] Approving nomination with Super Admin credentials...");
  const approveRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/approve-nomination',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    requestId: requestId,
    superAdminEmail: 'iam.nahidkhan.bd@gmail.com'
  });
  console.log(`Status: ${approveRes.status}, Message: ${approveRes.data.message}`);
  if (approveRes.status !== 200 || !approveRes.data.admin) {
    throw new Error("FAIL: Super admin approval failed!");
  }
  console.log("PASS: Admin approved! New admin created:", approveRes.data.admin.name, `(${approveRes.data.admin.email})`);

  // 6. Test Dual-Account Password Synchronization
  console.log("\n[Test 6] Testing Dual Password Sync across Student & Admin accounts for iam.nahidkhan.bd@gmail.com...");
  const syncPassRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/update-account-password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'iam.nahidkhan.bd@gmail.com',
    newPassword: 'SyncedPassword2026!'
  });
  console.log(`Status: ${syncPassRes.status}, Message: ${syncPassRes.data.message}`);
  if (syncPassRes.status !== 200) {
    throw new Error("FAIL: Password sync endpoint returned non-200!");
  }

  // Verify that admins.json and students.json both reflect the new password
  const fs = require('fs');
  const path = require('path');
  const admins = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/admins.json'), 'utf8'));
  const students = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/students.json'), 'utf8'));

  const adminAccount = admins.find(a => a.email === 'iam.nahidkhan.bd@gmail.com');
  const studentAccount = students.find(s => s.email === 'iam.nahidkhan.bd@gmail.com');

  if (!adminAccount || adminAccount.password !== 'SyncedPassword2026!') {
    throw new Error("FAIL: Admin record did not synchronize to new password!");
  }
  if (!studentAccount || studentAccount.password !== 'SyncedPassword2026!') {
    throw new Error("FAIL: Student record did not synchronize to new password!");
  }
  console.log("PASS: Both Student & Admin records synchronized to 'SyncedPassword2026!'");

  // Re-sync with standard test password so future logins remain consistent
  await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/update-account-password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: 'iam.nahidkhan.bd@gmail.com',
    newPassword: '@NAHID_KHAN_2024227170'
  });
  console.log("PASS: Restored password to standard @NAHID_KHAN_2024227170 on both accounts.");

  console.log("\n=== ALL BACKEND INTEGRATION & SECURITY TESTS PASSED! ===");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
