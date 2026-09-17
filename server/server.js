/* ==========================================================================
   PARADOX-147 OFFICIAL BACKEND SERVER & GMAIL SMTP DISPATCHER
   Official Portal Email: mail.paradox147@gmail.com
   Department of Physics, Rajshahi College, Rajshahi
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Automatically load environment variables from .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (key && !process.env[key]) {
            process.env[key] = val.replace(/^["'](.*)["']$/, '$1');
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Config] Could not parse .env file:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration
const OFFICIAL_EMAIL = process.env.SMTP_USER || 'mail.paradox147@gmail.com';
const SENDER_NAME = 'PARADOX-147 Official Portal';
const SENDER_FULL = `"${SENDER_NAME}" <${OFFICIAL_EMAIL}>`;

// Gmail SMTP Transporter with Google Accounts App Password from environment variable
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // SSL
  auth: {
    user: OFFICIAL_EMAIL,
    pass: process.env.SMTP_PASS || ''
  }
});

// In-memory OTP Caches (persisted across requests during server runtime)
const otpStore = new Map();
const signupOtpStore = new Map();
const otpRateLimitStore = new Map();

function checkOtpRateLimit(identifier) {
  const key = (identifier || '').trim().toLowerCase();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const cooldownMs = 60 * 1000;
  const maxInWindow = 10;

  const current = otpRateLimitStore.get(key) || { requests: [], lastRequest: 0 };
  if (now - current.lastRequest < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now - current.lastRequest)) / 1000);
    return { allowed: false, message: `Please wait ${waitSec} second(s) before requesting another verification code.` };
  }

  current.requests = current.requests.filter(t => now - t < windowMs);
  if (current.requests.length >= maxInWindow) {
    return { allowed: false, message: 'Maximum verification code requests exceeded. Please try again in 15 minutes.' };
  }

  current.requests.push(now);
  current.lastRequest = now;
  otpRateLimitStore.set(key, current);
  return { allowed: true };
}

// Middleware
app.use(cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage Paths
const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const ADMIN_REQUESTS_FILE = path.join(DATA_DIR, 'admin_requests.json');
const SUPER_ADMIN_EMAIL = 'iam.nahidkhan.bd@gmail.com';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database Connection Manager
const { connectDB, isConnected, Student, Admin, AdminRequest } = require('./db');

/* --------------------------------------------------------------------------
   HYBRID DATA LAYER (MongoDB Atlas Cloud with Local JSON Fallback)
   -------------------------------------------------------------------------- */

function getLocalAdminsList() {
  let admins = [];
  if (fs.existsSync(ADMINS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
      if (Array.isArray(data)) admins = data;
    } catch (err) {
      console.error('Error reading admins file:', err.message);
    }
  }

  // Guarantee Super Admin Nahid is always present, active, and unconditionally privileged
  let superAdmin = admins.find(a => 
    (a.email && a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || 
    a.roll === '2024227170' || 
    a.id === 'admin-101'
  );

  if (!superAdmin) {
    superAdmin = {
      id: 'admin-101',
      studentId: 'std-101',
      roll: '2024227170',
      name: 'MD. KHAIRUL ISLAM NAHID',
      email: SUPER_ADMIN_EMAIL,
      phone: '+8801859445559',
      role: 'CR & Administrator',
      isSuperAdmin: true,
      isAdmin: true,
      status: 'Active',
      addedAt: '2024-01-01T00:00:00.000Z',
      password: '@NAHID_KHAN_2024227170'
    };
    admins.unshift(superAdmin);
    saveLocalAdminsList(admins);
  } else {
    let changed = false;
    if (superAdmin.isSuperAdmin !== true) { superAdmin.isSuperAdmin = true; changed = true; }
    if (superAdmin.isAdmin !== true) { superAdmin.isAdmin = true; changed = true; }
    if (superAdmin.status !== 'Active') { superAdmin.status = 'Active'; changed = true; }
    if (!superAdmin.role || superAdmin.role === 'admin' || superAdmin.role === 'Super Admin') { superAdmin.role = 'CR & Administrator'; changed = true; }
    if (changed) {
      saveLocalAdminsList(admins);
    }
  }

  return admins;
}

function saveLocalAdminsList(admins) {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing admins file:', err.message);
  }
}

async function getAdminsList() {
  if (isConnected()) {
    try {
      let admins = await Admin.find({}).lean();
      if (admins && admins.length > 0) {
        let superAdmin = admins.find(a => 
          (a.email && a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) || 
          a.roll === '2024227170' || 
          a.id === 'admin-101'
        );
        if (!superAdmin) {
          superAdmin = {
            id: 'admin-101',
            studentId: 'std-101',
            roll: '2024227170',
            name: 'MD. KHAIRUL ISLAM NAHID',
            email: SUPER_ADMIN_EMAIL,
            phone: '+8801859445559',
            role: 'CR & Administrator',
            isSuperAdmin: true,
            isAdmin: true,
            status: 'Active',
            addedAt: '2024-01-01T00:00:00.000Z',
            password: '@NAHID_KHAN_2024227170'
          };
          await Admin.create(superAdmin);
          admins.unshift(superAdmin);
        }
        return admins;
      }
    } catch (err) {
      console.error('[Database] Failed to read admins from MongoDB, falling back to local JSON:', err.message);
    }
  }
  return getLocalAdminsList();
}

async function saveAdminsList(admins) {
  saveLocalAdminsList(admins);
  if (isConnected()) {
    try {
      for (const a of admins) {
        const query = a.email ? { email: a.email.toLowerCase() } : { roll: a.roll };
        await Admin.findOneAndUpdate(query, a, { upsert: true, returnDocument: 'after' });
      }
    } catch (err) {
      console.error('[Database] Failed to sync admins to MongoDB:', err.message);
    }
  }
}

function getLocalAdminRequestsList() {
  if (fs.existsSync(ADMIN_REQUESTS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ADMIN_REQUESTS_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    } catch (err) {
      console.error('Error reading admin requests file:', err.message);
    }
  }
  return [];
}

function saveLocalAdminRequestsList(requests) {
  try {
    fs.writeFileSync(ADMIN_REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing admin requests file:', err.message);
  }
}

async function getAdminRequestsList() {
  if (isConnected()) {
    try {
      const reqs = await AdminRequest.find({}).sort({ createdAt: -1 }).lean();
      if (reqs && reqs.length > 0) return reqs;
    } catch (err) {
      console.error('[Database] Failed to read admin requests from MongoDB, falling back to local JSON:', err.message);
    }
  }
  return getLocalAdminRequestsList();
}

async function saveAdminRequestsList(requests) {
  saveLocalAdminRequestsList(requests);
  if (isConnected()) {
    try {
      for (const r of requests) {
        if (r.id) {
          await AdminRequest.findOneAndUpdate({ id: r.id }, r, { upsert: true, returnDocument: 'after' });
        }
      }
    } catch (err) {
      console.error('[Database] Failed to sync admin requests to MongoDB:', err.message);
    }
  }
}

function getLocalStudentsList() {
  let students = [];
  if (fs.existsSync(STUDENTS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) students = data;
    } catch (err) {
      console.error('Error reading students file:', err.message);
    }
  }

  if (students.length === 0) {
    const dataJsPath = path.join(__dirname, '..', 'js', 'data.js');
    if (fs.existsSync(dataJsPath)) {
      try {
        const context = {};
        vm.createContext(context);
        vm.runInContext(fs.readFileSync(dataJsPath, 'utf8'), context);
        if (context.SEED_DATA && Array.isArray(context.SEED_DATA.students)) {
          students = context.SEED_DATA.students;
          fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf8');
        }
      } catch (err) {
        console.error('Error seeding from data.js:', err.message);
      }
    }
  }

  // Unconditionally ensure Nahid (std-101) has isAdmin: true and isSuperAdmin: true
  const nahid = students.find(s => 
    s.id === 'std-101' || 
    s.roll === '2024227170' || 
    (s.email && s.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())
  );
  if (nahid) {
    let changed = false;
    if (nahid.isAdmin !== true) { nahid.isAdmin = true; changed = true; }
    if (nahid.isSuperAdmin !== true) { nahid.isSuperAdmin = true; changed = true; }
    if (!nahid.fatherName) { nahid.fatherName = 'Md. Rafiqul Islam'; changed = true; }
    if (!nahid.motherName) { nahid.motherName = 'Mrs. Khadeja Begum'; changed = true; }
    if (!nahid.dobOriginal) { nahid.dobOriginal = '2005-08-14'; changed = true; }
    if (!nahid.dobCertificate) { nahid.dobCertificate = '2006-02-10'; changed = true; }
    if (changed) {
      saveLocalStudentsList(students);
    }
  }

  return students;
}

function saveLocalStudentsList(students) {
  try {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing students file:', err.message);
  }
}

async function getStudentsList() {
  if (isConnected()) {
    try {
      let students = await Student.find({}).lean();
      if (students && students.length > 0) {
        // Enforce Super Admin Nahid
        const nahid = students.find(s => 
          s.id === 'std-101' || 
          s.roll === '2024227170' || 
          (s.email && s.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())
        );
        if (nahid) {
          if (!nahid.isAdmin || !nahid.isSuperAdmin) {
            nahid.isAdmin = true;
            nahid.isSuperAdmin = true;
            await Student.updateOne(
              { _id: nahid._id },
              { $set: { isAdmin: true, isSuperAdmin: true } }
            );
          }
        }
        return students;
      }
    } catch (err) {
      console.error('[Database] Failed to read students from MongoDB, falling back to local JSON:', err.message);
    }
  }
  return getLocalStudentsList();
}

async function saveStudentsList(students) {
  saveLocalStudentsList(students);
  if (isConnected()) {
    try {
      for (const s of students) {
        const query = s.roll ? { roll: s.roll } : { email: s.email };
        await Student.findOneAndUpdate(query, s, { upsert: true, returnDocument: 'after' });
      }
    } catch (err) {
      console.error('[Database] Failed to sync students to MongoDB:', err.message);
    }
  }
}

// Generate 6-digit numeric OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* --------------------------------------------------------------------------
   API ROUTES
   -------------------------------------------------------------------------- */

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Paradox-147 Portal Backend',
    department: 'Department of Physics, Rajshahi College',
    officialEmail: OFFICIAL_EMAIL,
    database: isConnected() ? 'MongoDB Atlas (Connected)' : 'Local JSON Data Store (Fallback)',
    timestamp: new Date().toISOString()
  });
});

// 1. Send Password Reset OTP
app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const { identifier } = req.body;
    const cleanId = (identifier || '').trim().toLowerCase();

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address or student roll is required.'
      });
    }

    const students = await getStudentsList();
    let student = students.find(s =>
      (s.email && s.email.toLowerCase() === cleanId) ||
      (s.roll && s.roll.toLowerCase() === cleanId) ||
      (s.studentId && s.studentId.toLowerCase() === cleanId) ||
      (s.id && s.id.toLowerCase() === cleanId)
    );

    let recipientEmail = '';
    let studentName = 'Student';

    if (student) {
      recipientEmail = (student.email || '').trim().toLowerCase();
      studentName = student.name || 'Student';
    } else if (cleanId.includes('@')) {
      // Direct email provided by user
      recipientEmail = cleanId;
      studentName = cleanId.split('@')[0];
    } else {
      return res.status(404).json({
        success: false,
        message: `No student record was found for roll number "${identifier}". Please enter your registered email address.`
      });
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Rate Limiting Check
    const rateCheck = checkOtpRateLimit(recipientEmail);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateCheck.message
      });
    }

    const otpCode = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(recipientEmail, {
      code: otpCode,
      studentId: student ? student.id : null,
      roll: student ? student.roll : null,
      name: studentName,
      email: recipientEmail,
      expiresAt: expiresAt,
      failedAttempts: 0
    });

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Email HTML template without any emoji
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; color: #1e293b;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: #0f172a; padding: 20px 24px; border-bottom: 3px solid #d4af37; text-align: center;">
            <h2 style="color: #d4af37; margin: 0 0 6px 0; font-size: 20px; letter-spacing: 0.05em;">PARADOX-147</h2>
            <p style="color: #cbd5e1; margin: 0; font-size: 13px;">The 147th Honours Batch - Department of Physics - Rajshahi College</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <strong>${studentName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              We received a request to reset your password for the official Paradox-147 Student Portal. Please use the following 6-digit security code to verify your request:
            </p>
            <div style="background: #f8fafc; border: 1px dashed #d4af37; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otpCode}</span>
              <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">This code is valid for 10 minutes from ${timestamp}.</p>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
              If you did not request this password reset, you can safely ignore this message. Your account credentials remain secure.
            </p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">Official Dispatch: <strong>${OFFICIAL_EMAIL}</strong></p>
              <p style="margin: 0;">Department of Physics, Rajshahi College, Rajshahi</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Send email via Gmail SMTP
    await mailTransporter.sendMail({
      from: SENDER_FULL,
      to: recipientEmail,
      subject: `[PARADOX-147] Password Reset Verification Code: ${otpCode}`,
      html: emailHtml
    });

    console.log(`[SMTP] Dispatched password reset OTP to ${recipientEmail}`);

    res.json({
      success: true,
      email: recipientEmail,
      message: `A 6-digit verification code has been dispatched to ${recipientEmail} from ${OFFICIAL_EMAIL}.`,
      expiresInMinutes: 10
    });
  } catch (err) {
    console.error('[SMTP Error]', err);
    res.status(500).json({
      success: false,
      message: `Failed to dispatch email via Gmail SMTP: ${err.message}`
    });
  }
});

// 2. Verify Password Reset OTP
app.post('/api/auth/forgot-password/verify-otp', (req, res) => {
  const { email, code } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();

  if (!cleanEmail || !cleanCode) {
    return res.status(400).json({
      success: false,
      message: 'Email address and verification code are required.'
    });
  }

  const record = otpStore.get(cleanEmail);
  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'Verification code has expired or was not requested. Please request a new code.'
    });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      message: 'Verification code has expired. Please request a new code.'
    });
  }

  if (record.code !== cleanCode) {
    record.failedAttempts = (record.failedAttempts || 0) + 1;
    if (record.failedAttempts >= 5) {
      otpStore.delete(cleanEmail);
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Code has been invalidated for security. Please request a new code.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Incorrect verification code. Please check your email and try again.'
    });
  }

  res.json({
    success: true,
    message: 'Verification code confirmed.'
  });
});

// 3. Complete Password Reset
app.post('/api/auth/forgot-password/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    const cleanPass = (newPassword || '').trim();

    if (!cleanEmail || !cleanCode || !cleanPass) {
      return res.status(400).json({
        success: false,
        message: 'All fields (email, code, new password) are required.'
      });
    }

    if (cleanPass.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters in length.'
      });
    }

    const record = otpStore.get(cleanEmail);
    if (!record || Date.now() > record.expiresAt || record.code !== cleanCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please restart the reset process.'
      });
    }

    const students = await getStudentsList();
    let student = students.find(s => s.email && s.email.toLowerCase() === cleanEmail);

    if (!student) {
      student = {
        id: 'std-' + Date.now(),
        roll: record.roll || 'N/A',
        name: record.name || 'Student',
        email: cleanEmail,
        status: 'Active'
      };
      students.push(student);
    }

    student.password = cleanPass;
    student.passwordUpdatedAt = new Date().toISOString();
    student.passwordResetVia = OFFICIAL_EMAIL;
    await saveStudentsList(students);

    // DUAL-ACCOUNT PASSWORD SYNC: Also update linked Admin / Super Admin account
    const admins = await getAdminsList();
    const linkedAdmin = admins.find(a => 
      (a.email && a.email.toLowerCase() === cleanEmail) || 
      (student.roll && a.roll && a.roll === student.roll)
    );
    if (linkedAdmin) {
      linkedAdmin.password = cleanPass;
      linkedAdmin.passwordUpdatedAt = new Date().toISOString();
      await saveAdminsList(admins);
      console.log(`[Sync] Updated password for linked Admin account: ${linkedAdmin.email} (${linkedAdmin.role})`);
    }

    otpStore.delete(cleanEmail);

    // Confirmation email
    const studentDisplayName = record.name || student.name || 'Student';
    try {
      const confirmHtml = `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; color: #1e293b;">
          <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background: #0f172a; padding: 20px 24px; border-bottom: 3px solid #d4af37; text-align: center;">
              <h2 style="color: #d4af37; margin: 0 0 6px 0; font-size: 20px;">PARADOX-147</h2>
              <p style="color: #cbd5e1; margin: 0; font-size: 13px;">Security Notice - Password Updated</p>
            </div>
            <div style="padding: 24px;">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${studentDisplayName}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                This is a confirmation that your password for the official Paradox-147 Portal was successfully updated.
              </p>
              <p style="font-size: 13px; color: #64748b;">
                You may now sign in using your registered email/ID and your new password.
              </p>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">Official Dispatch: ${OFFICIAL_EMAIL}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      mailTransporter.sendMail({
        from: SENDER_FULL,
        to: cleanEmail,
        subject: '[PARADOX-147] Security Notice: Your Portal Password Was Updated',
        html: confirmHtml
      }).catch(err => console.error('[SMTP Confirmation Notice Error]', err.message));
    } catch (e) {}

    res.json({
      success: true,
      message: 'Password successfully updated. You may now log in with your new credentials.'
    });
  } catch (err) {
    console.error('[Reset Error]', err);
    res.status(500).json({
      success: false,
      message: `Failed to reset password: ${err.message}`
    });
  }
});

// 4. Send Student Sign Up OTP via Gmail SMTP
app.post('/api/auth/signup/send-otp', async (req, res) => {
  try {
    const { name, email, roll, reg, phone, blood, district, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRoll = (roll || '').trim();
    const studentName = (name || '').trim() || 'Student';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.'
      });
    }

    // Check if roll or email is already registered and active
    const students = await getStudentsList();
    const existingRoll = students.find(s => s.roll && s.roll.trim() === cleanRoll);
    if (existingRoll) {
      const st = existingRoll.status === 'Pending' ? 'Pending Approval' : 'Active';
      return res.status(400).json({
        success: false,
        message: `Student ID / Roll ${cleanRoll} is already registered (${st}).`
      });
    }

    const existingEmail = students.find(s => s.email && s.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `The email address ${cleanEmail} is already registered to a student account.`
      });
    }

    // Check rate limit
    const rateCheck = checkOtpRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateCheck.message
      });
    }

    const otpCode = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    signupOtpStore.set(cleanEmail, {
      code: otpCode,
      name: studentName,
      email: cleanEmail,
      roll: cleanRoll,
      reg: (reg || '').trim(),
      phone: (phone || '').trim(),
      blood: (blood || 'B+').trim(),
      district: (district || 'Rajshahi').trim(),
      password: (password || '').trim(),
      expiresAt: expiresAt,
      failedAttempts: 0
    });

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 24px; color: #1e293b;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: #0f172a; padding: 20px 24px; border-bottom: 3px solid #d4af37; text-align: center;">
            <h2 style="color: #d4af37; margin: 0 0 6px 0; font-size: 20px;">PARADOX-147</h2>
            <p style="color: #cbd5e1; margin: 0; font-size: 13px;">The 147th Honours Batch - Department of Physics - Rajshahi College</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <strong>${studentName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              Thank you for applying to the Paradox-147 Official Portal. To verify your email address (<code>${cleanEmail}</code>), please use the following 6-digit verification code:
            </p>
            <div style="background: #f8fafc; border: 1px dashed #d4af37; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otpCode}</span>
              <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">This code is valid for 10 minutes from ${timestamp}.</p>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
              Once verified, your registration application will be forwarded to Class Representative & Administrator <strong>MD. KHAIRUL ISLAM NAHID</strong> for enrollment verification.
            </p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">Official Dispatch: <strong>${OFFICIAL_EMAIL}</strong></p>
              <p style="margin: 0;">Department of Physics, Rajshahi College, Rajshahi</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await mailTransporter.sendMail({
      from: SENDER_FULL,
      to: cleanEmail,
      subject: `[PARADOX-147] Verify Your Student Registration Email - Security Code: ${otpCode}`,
      html: emailHtml
    });

    console.log(`[SMTP] Dispatched sign up OTP to ${cleanEmail}`);

    res.json({
      success: true,
      email: cleanEmail,
      message: `A 6-digit verification code has been dispatched directly to ${cleanEmail} from ${OFFICIAL_EMAIL}.`,
      expiresInMinutes: 10
    });
  } catch (err) {
    console.error('[Signup SMTP Error]', err);
    res.status(500).json({
      success: false,
      message: `Failed to dispatch verification email via Gmail SMTP: ${err.message}`
    });
  }
});

// 5. Verify Student Sign Up OTP
app.post('/api/auth/signup/verify-otp', (req, res) => {
  const { email, code } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();

  if (!cleanEmail || !cleanCode) {
    return res.status(400).json({
      success: false,
      message: 'Email address and verification code are required.'
    });
  }

  const record = signupOtpStore.get(cleanEmail);
  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'Verification code has expired or was not requested. Please request a new code.'
    });
  }

  if (Date.now() > record.expiresAt) {
    signupOtpStore.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      message: 'Verification code has expired. Please request a new code.'
    });
  }

  if (record.code !== cleanCode) {
    record.failedAttempts = (record.failedAttempts || 0) + 1;
    if (record.failedAttempts >= 5) {
      signupOtpStore.delete(cleanEmail);
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Code has been invalidated for security. Please request a new code.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Incorrect verification code. Please check your email inbox and try again.'
    });
  }

  signupOtpStore.delete(cleanEmail);

  res.json({
    success: true,
    email: cleanEmail,
    verifiedVia: OFFICIAL_EMAIL,
    payload: record
  });
});

/* --------------------------------------------------------------------------
   ADMIN & ROLE MANAGEMENT ENDPOINTS
   Super Admin: iam.nahidkhan.bd@gmail.com
   -------------------------------------------------------------------------- */

// 5. Get current Admins and Pending Nominations
app.get('/api/admin/list', async (req, res) => {
  try {
    const admins = await getAdminsList();
    const requests = await getAdminRequestsList();
    // Security: Sanitize admin entries to strictly omit passwords from network transmission
    const sanitizedAdmins = admins.map(a => {
      const { password, ...safeAdmin } = a;
      return safeAdmin;
    });
    res.json({
      success: true,
      superAdminEmail: SUPER_ADMIN_EMAIL,
      admins: sanitizedAdmins,
      requests: requests
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Nominate Student to Become Admin (Requires Super Admin Approval)
app.post('/api/admin/nominate', async (req, res) => {
  try {
    const { studentId, roll, name, email, nominatedBy, note } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRoll = (roll || '').trim();

    if (!cleanEmail && !cleanRoll) {
      return res.status(400).json({ success: false, message: 'Student roll or email is required.' });
    }

    const admins = await getAdminsList();
    const isAlreadyAdmin = admins.some(a => 
      (a.email && a.email.toLowerCase() === cleanEmail) || 
      (cleanRoll && a.roll === cleanRoll)
    );
    if (isAlreadyAdmin) {
      return res.status(400).json({ success: false, message: 'Student is already an authorized Administrator.' });
    }

    const requests = await getAdminRequestsList();
    const existingPending = requests.find(r => 
      r.status === 'Pending Super Admin Approval' && 
      ((r.email && r.email.toLowerCase() === cleanEmail) || (cleanRoll && r.roll === cleanRoll))
    );
    if (existingPending) {
      return res.status(400).json({ success: false, message: 'A nomination for this student is already pending Super Admin approval.' });
    }

    const newRequest = {
      id: 'req-' + Date.now(),
      studentId: studentId || '',
      roll: cleanRoll,
      name: name || 'Student',
      email: cleanEmail,
      nominatedBy: (nominatedBy || 'Admin').trim(),
      note: (note || 'Nominated for administrative role').trim(),
      status: 'Pending Super Admin Approval',
      createdAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    await saveAdminRequestsList(requests);

    res.json({
      success: true,
      message: `Nomination submitted for ${newRequest.name}. It is now awaiting approval from Super Admin (MD. Khairul Islam Nahid).`,
      request: newRequest
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Super Admin Approves Admin Nomination
app.post('/api/admin/approve-nomination', async (req, res) => {
  try {
    const { requestId, approverEmail, superAdminEmail } = req.body;
    const cleanApprover = (approverEmail || superAdminEmail || '').trim().toLowerCase();

    if (cleanApprover !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized: Only Super Admin (${SUPER_ADMIN_EMAIL}) has authority to approve new administrators.`
      });
    }

    const requests = await getAdminRequestsList();
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Nomination request not found.' });
    }

    if (request.status !== 'Pending Super Admin Approval') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    request.status = 'Approved';
    request.approvedAt = new Date().toISOString();
    request.approvedBy = SUPER_ADMIN_EMAIL;
    await saveAdminRequestsList(requests);

    // Update students list
    const students = await getStudentsList();
    const student = students.find(s => 
      (request.email && s.email && s.email.toLowerCase() === request.email.toLowerCase()) ||
      (request.roll && s.roll === request.roll)
    );

    if (student) {
      student.isAdmin = true;
      if (!student.role || student.role === 'Member' || student.role === 'Student') {
        student.role = 'Batch Administrator';
      }
      await saveStudentsList(students);
    }

    // Add to admins list
    const admins = await getAdminsList();
    const existingAdmin = admins.find(a => 
      (a.email && a.email.toLowerCase() === request.email.toLowerCase()) ||
      (request.roll && a.roll === request.roll)
    );

    if (!existingAdmin) {
      const newAdminEntry = {
        id: 'admin-' + Date.now(),
        studentId: student ? student.id : (request.studentId || 'std-' + Date.now()),
        roll: request.roll,
        name: request.name,
        email: request.email,
        phone: student ? student.phone : '',
        role: 'Administrator',
        isSuperAdmin: false,
        status: 'Active',
        approvedBy: SUPER_ADMIN_EMAIL,
        addedAt: new Date().toISOString(),
        password: student ? student.password : '@NAHID_KHAN_2024227170'
      };
      admins.push(newAdminEntry);
      await saveAdminsList(admins);

      const { password: _p, ...safeNewAdmin } = newAdminEntry;
      return res.json({
        success: true,
        message: `Successfully approved ${request.name} as Administrator!`,
        request: request,
        admin: safeNewAdmin
      });
    }

    const { password: _p2, ...safeExistingAdmin } = existingAdmin;
    res.json({
      success: true,
      message: `Successfully approved ${request.name} as Administrator!`,
      request: request,
      admin: safeExistingAdmin
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Super Admin Rejects Admin Nomination
app.post('/api/admin/reject-nomination', async (req, res) => {
  try {
    const { requestId, approverEmail, superAdminEmail, reason } = req.body;
    const cleanApprover = (approverEmail || superAdminEmail || '').trim().toLowerCase();

    if (cleanApprover !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Unauthorized: Only Super Admin (${SUPER_ADMIN_EMAIL}) has authority to reject nominations.`
      });
    }

    const requests = await getAdminRequestsList();
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Nomination request not found.' });
    }

    request.status = 'Rejected';
    request.rejectedAt = new Date().toISOString();
    request.rejectedBy = SUPER_ADMIN_EMAIL;
    request.rejectionReason = (reason || 'Declined by Super Admin').trim();
    await saveAdminRequestsList(requests);

    res.json({
      success: true,
      message: `Nomination for ${request.name} was rejected.`,
      request: request
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Update Student Role to Any Custom Role
const handleStudentRoleUpdate = async (req, res) => {
  try {
    const { id, studentId, roll, email, role, newRole } = req.body;
    const targetId = id || studentId;
    const cleanRole = (newRole || role || '').trim();

    if (!cleanRole) {
      return res.status(400).json({ success: false, message: 'Role designation cannot be empty.' });
    }

    const students = await getStudentsList();
    const student = students.find(s => 
      (targetId && s.id === targetId) || 
      (roll && s.roll === roll) ||
      (email && s.email && s.email.toLowerCase() === email.toLowerCase())
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    student.role = cleanRole;
    student.roleUpdatedAt = new Date().toISOString();
    await saveStudentsList(students);

    // If also in admins list (and not Super Admin), sync role title
    const admins = await getAdminsList();
    const admin = admins.find(a => 
      (student.email && a.email && a.email.toLowerCase() === student.email.toLowerCase()) ||
      (student.roll && a.roll === student.roll)
    );
    if (admin && !admin.isSuperAdmin) {
      admin.role = cleanRole;
      await saveAdminsList(admins);
    }

    res.json({
      success: true,
      message: `Role for ${student.name} updated to "${cleanRole}".`,
      student: student
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

app.put('/api/admin/student-role', handleStudentRoleUpdate);
app.post('/api/admin/student-role', handleStudentRoleUpdate);

// 10. Direct Account Password Sync (Backend Synchronization for dual accounts)
app.post('/api/auth/update-account-password', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
    const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp.includes('127.0.0.1') || clientIp.includes('localhost');
    const authHeader = req.headers.authorization;
    if (!isLoopback && !authHeader) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Direct account password sync is restricted to authorized administrative calls.'
      });
    }

    const { email, roll, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRoll = (roll || '').trim();
    const cleanPass = (newPassword || '').trim();

    if ((!cleanEmail && !cleanRoll) || !cleanPass) {
      return res.status(400).json({ success: false, message: 'Email or Roll and new password are required.' });
    }

    if (cleanPass.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
    }

    let updatedStudents = 0;
    const students = await getStudentsList();
    students.forEach(s => {
      if ((cleanEmail && s.email && s.email.toLowerCase() === cleanEmail) || (cleanRoll && s.roll === cleanRoll)) {
        s.password = cleanPass;
        s.passwordUpdatedAt = new Date().toISOString();
        updatedStudents++;
      }
    });
    if (updatedStudents > 0) {
      await saveStudentsList(students);
    }

    let updatedAdmins = 0;
    const admins = await getAdminsList();
    admins.forEach(a => {
      if ((cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) || (cleanRoll && a.roll === cleanRoll)) {
        a.password = cleanPass;
        a.passwordUpdatedAt = new Date().toISOString();
        updatedAdmins++;
      }
    });
    if (updatedAdmins > 0) {
      await saveAdminsList(admins);
    }

    res.json({
      success: true,
      message: `Password synchronized across ${updatedStudents} student profile(s) and ${updatedAdmins} admin account(s).`,
      updatedStudents,
      updatedAdmins
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Security Firewall: Block direct static access to sensitive directories, database files, tests, and dotfiles
app.use((req, res, next) => {
  const normalizedPath = decodeURIComponent(req.path).replace(/\\/g, '/').toLowerCase();
  
  const forbiddenPatterns = [
    /^\/server(\/|$)/,
    /^\/tests(\/|$)/,
    /^\/\.planning(\/|$)/,
    /^\/node_modules(\/|$)/,
    /^\/\./,
    /package\.json$/,
    /package-lock\.json$/,
    /\.log$/
  ];

  if (forbiddenPatterns.some(regex => regex.test(normalizedPath))) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access to system, server, configuration, or data files is strictly prohibited.'
    });
  }

  next();
});

// Serve static frontend files from workspace root
app.use(express.static(path.join(__dirname, '..'), {
  dotfiles: 'ignore'
}));

// Fallback to index.html for root navigation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    const indexHtml = path.join(__dirname, '..', 'index.html');
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
  }
  next();
});

// Start Server
if (require.main === module) {
  // Initialize Database Connection (MongoDB Atlas Cloud or JSON Fallback)
  connectDB().catch(err => {
    console.warn('[Database] Initial connection attempt error:', err.message);
  });

  app.listen(PORT, () => {
    console.log(`[Server] Paradox-147 Portal backend active at http://localhost:${PORT}`);
    console.log(`[Server] Official Gmail SMTP sender configured: ${OFFICIAL_EMAIL}`);
  });
}

module.exports = { app, mailTransporter, otpStore, signupOtpStore };
