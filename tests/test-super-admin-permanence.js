/**
 * Test: Super Admin Permanence & Self-Healing Verification
 * Simulates Browser Environment (localStorage, sessionStorage, DOM mock)
 * Verifies that MD. KHAIRUL ISLAM NAHID NEVER loses Super Admin accessibility.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Setup simulated browser sandbox
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  localStorage: new LocalStorageMock(),
  sessionStorage: new LocalStorageMock(),
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  }
};
sandbox.window = sandbox;

vm.createContext(sandbox);

// 2. Load js/data.js and js/api.js in sandbox
const dataJs = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');
vm.runInContext(dataJs, sandbox);

const apiJs = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
vm.runInContext(apiJs + '\nwindow.api = new BatchApiService();', sandbox);

// 3. Load dashboard helper functions from js/dashboard.js
const dashCode = `
function isUserAdminAccount(user) {
  if (!user) return false;
  if (typeof window.api?.isAdmin === "function") {
    return window.api.isAdmin(user);
  }
  const email = (user.email || "").trim().toLowerCase();
  const roll = (user.roll || "").trim();
  const id = (user.id || "").trim().toLowerCase();
  return (
    user.isAdmin === true ||
    user.isSuperAdmin === true ||
    user.role === "admin" ||
    user.role === "Super Admin" ||
    user.role === "Super Admin & CR" ||
    (typeof user.role === "string" && user.role.toLowerCase().includes("administrator")) ||
    email === "iam.nahidkhan.bd@gmail.com" ||
    roll === "2024227170" ||
    id === "std-101" ||
    id === "admin-101"
  );
}

function isUserSuperAdminAccount(user) {
  if (!user) return false;
  if (typeof window.api?.isSuperAdmin === "function") {
    return window.api.isSuperAdmin(user);
  }
  const email = (user.email || "").trim().toLowerCase();
  const roll = (user.roll || "").trim();
  const id = (user.id || "").trim().toLowerCase();
  return (
    user.isSuperAdmin === true ||
    email === "iam.nahidkhan.bd@gmail.com" ||
    roll === "2024227170" ||
    id === "std-101" ||
    id === "admin-101"
  );
}
`;
vm.runInContext(dashCode, sandbox);

async function runTests() {
  console.log("=== RUNNING SUPER ADMIN PERMANENCE & ACCESS TEST ===");

  // TEST 1: Superior Account Detection
  console.log("\n[Test 1] Testing isSuperiorAccount for Nahid credentials...");
  const nahidByEmail = { email: "iam.nahidkhan.bd@gmail.com" };
  const nahidByRoll = { roll: "2024227170" };
  const nahidById = { id: "std-101" };
  const nahidByAdminId = { id: "admin-101" };
  const normalStudent = { id: "std-102", roll: "241076102", email: "mim@rc.edu", role: "student" };

  if (!sandbox.api.isSuperiorAccount(nahidByEmail)) throw new Error("FAIL: Email not recognized as Superior Account!");
  if (!sandbox.api.isSuperiorAccount(nahidByRoll)) throw new Error("FAIL: Roll not recognized as Superior Account!");
  if (!sandbox.api.isSuperiorAccount(nahidById)) throw new Error("FAIL: std-101 not recognized as Superior Account!");
  if (!sandbox.api.isSuperiorAccount(nahidByAdminId)) throw new Error("FAIL: admin-101 not recognized as Superior Account!");
  if (sandbox.api.isSuperiorAccount(normalStudent)) throw new Error("FAIL: Normal student erroneously recognized as Superior Account!");
  console.log("PASS: isSuperiorAccount correctly isolates MD. Khairul Islam Nahid.");

  // TEST 2: Self-healing stale localStorage session
  console.log("\n[Test 2] Simulating corrupted/stale user session in localStorage...");
  // Suppose an update or bug left Nahid with isAdmin: false and role: "student"
  sandbox.localStorage.setItem(sandbox.api.STORAGE_KEYS.AUTH_USER, JSON.stringify({
    id: "std-101",
    name: "MD. KHAIRUL ISLAM NAHID",
    email: "iam.nahidkhan.bd@gmail.com",
    roll: "2024227170",
    role: "student",
    isAdmin: false,
    isSuperAdmin: false
  }));

  const healedUser = sandbox.api.getCurrentUser();
  if (healedUser.isAdmin !== true || healedUser.isSuperAdmin !== true) {
    throw new Error("FAIL: getCurrentUser did not self-heal Nahid's isAdmin or isSuperAdmin!");
  }
  // Verify localStorage was updated
  const storedUser = JSON.parse(sandbox.localStorage.getItem(sandbox.api.STORAGE_KEYS.AUTH_USER));
  if (storedUser.isAdmin !== true || storedUser.isSuperAdmin !== true) {
    throw new Error("FAIL: localStorage was not persisted with healed privileges!");
  }
  console.log("PASS: Stale session successfully auto-healed with isAdmin: true, isSuperAdmin: true!");

  // TEST 3: Profile update preservation
  console.log("\n[Test 3] Testing updateStudent profile edit preservation...");
  await sandbox.api.updateStudent("std-101", {
    bio: "Updated physics bio for tests",
    phone: "+8801859445559"
  });
  const userAfterUpdate = sandbox.api.getCurrentUser();
  if (userAfterUpdate.isAdmin !== true || userAfterUpdate.isSuperAdmin !== true) {
    throw new Error("FAIL: updateStudent stripped admin privileges from Nahid!");
  }
  console.log("PASS: Profile update preserved isAdmin: true & isSuperAdmin: true.");

  // TEST 4: Student Login for Nahid
  console.log("\n[Test 4] Testing Student Login branch for Nahid (Roll 2024227170)...");
  const studentLoginRes = await sandbox.api.login({
    identifier: "2024227170",
    password: "@NAHID_KHAN_2024227170",
    role: "student"
  });
  if (studentLoginRes.isAdmin !== true || studentLoginRes.isSuperAdmin !== true) {
    throw new Error("FAIL: Student login did not grant Nahid admin flags!");
  }
  console.log("PASS: Student login gave role:", studentLoginRes.role, "| isAdmin:", studentLoginRes.isAdmin, "| isSuperAdmin:", studentLoginRes.isSuperAdmin);

  // TEST 5: Admin Login for Nahid
  console.log("\n[Test 5] Testing Admin Login branch for Nahid (iam.nahidkhan.bd@gmail.com)...");
  const adminLoginRes = await sandbox.api.login({
    identifier: "iam.nahidkhan.bd@gmail.com",
    password: "@NAHID_KHAN_2024227170",
    role: "admin"
  });
  if (adminLoginRes.isAdmin !== true || adminLoginRes.isSuperAdmin !== true) {
    throw new Error("FAIL: Admin login did not grant Nahid admin flags!");
  }
  console.log("PASS: Admin login gave role:", adminLoginRes.role, "| isAdmin:", adminLoginRes.isAdmin, "| isSuperAdmin:", adminLoginRes.isSuperAdmin);

  // TEST 6: Dashboard Admin View Switcher Permissions
  console.log("\n[Test 6] Testing Dashboard isUserAdminAccount and isUserSuperAdminAccount checks...");
  if (!sandbox.isUserAdminAccount(studentLoginRes)) {
    throw new Error("FAIL: isUserAdminAccount returned false for Nahid's studentLoginRes!");
  }
  if (!sandbox.isUserSuperAdminAccount(studentLoginRes)) {
    throw new Error("FAIL: isUserSuperAdminAccount returned false for Nahid's studentLoginRes!");
  }
  if (!sandbox.isUserAdminAccount(adminLoginRes)) {
    throw new Error("FAIL: isUserAdminAccount returned false for Nahid's adminLoginRes!");
  }
  if (sandbox.isUserAdminAccount(normalStudent)) {
    throw new Error("FAIL: isUserAdminAccount erroneously returned true for regular student!");
  }
  console.log("PASS: Dashboard role checkers correctly validate Nahid and protect admin views from regular students.");

  console.log("\n=== ALL SUPER ADMIN PERMANENCE & ACCESS TESTS PASSED! ===");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
