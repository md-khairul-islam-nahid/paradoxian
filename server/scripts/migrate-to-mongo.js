/* ==========================================================================
   PARADOX-147 MONGODB ATLAS MIGRATION UTILITY
   Uploads local JSON database records directly to MongoDB Atlas Cloud
   Usage: npm run db:migrate
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load .env
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
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
}

const Student = require('../models/Student');
const Admin = require('../models/Admin');
const AdminRequest = require('../models/AdminRequest');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const ADMIN_REQUESTS_FILE = path.join(DATA_DIR, 'admin_requests.json');

async function runMigration() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('======================================================================');
    console.error('ERROR: MONGODB_URI environment variable is missing!');
    console.error('Please add MONGODB_URI to your .env file or pass it directly:');
    console.error('Example: MONGODB_URI="mongodb+srv://..." node server/scripts/migrate-to-mongo.js');
    console.error('======================================================================');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas Cloud...');
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas successfully!\n');

    // 1. Migrate Students
    if (fs.existsSync(STUDENTS_FILE)) {
      const students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
      console.log(`[Students] Read ${students.length} records from students.json. Upserting into MongoDB...`);
      let studentUpsertCount = 0;
      for (const s of students) {
        const query = s.roll ? { roll: s.roll } : { email: s.email };
        await Student.findOneAndUpdate(query, s, { upsert: true, returnDocument: 'after' });
        studentUpsertCount++;
      }
      console.log(`[Students] Successfully synced ${studentUpsertCount} student profiles to MongoDB Atlas.`);
    }

    // 2. Migrate Admins
    if (fs.existsSync(ADMINS_FILE)) {
      const admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
      console.log(`\n[Admins] Read ${admins.length} records from admins.json. Upserting into MongoDB...`);
      let adminUpsertCount = 0;
      for (const a of admins) {
        const query = a.email ? { email: a.email.toLowerCase() } : { roll: a.roll };
        await Admin.findOneAndUpdate(query, a, { upsert: true, returnDocument: 'after' });
        adminUpsertCount++;
      }
      console.log(`[Admins] Successfully synced ${adminUpsertCount} admin accounts to MongoDB Atlas.`);
    }

    // 3. Migrate Admin Requests
    if (fs.existsSync(ADMIN_REQUESTS_FILE)) {
      const requests = JSON.parse(fs.readFileSync(ADMIN_REQUESTS_FILE, 'utf8'));
      console.log(`\n[Admin Requests] Read ${requests.length} records from admin_requests.json...`);
      let reqCount = 0;
      for (const r of requests) {
        if (r.id) {
          await AdminRequest.findOneAndUpdate({ id: r.id }, r, { upsert: true, returnDocument: 'after' });
          reqCount++;
        }
      }
      console.log(`[Admin Requests] Successfully synced ${reqCount} nomination requests to MongoDB Atlas.`);
    }

    console.log('\n======================================================================');
    console.log('SUCCESS: All Paradoxian portal data has been migrated to MongoDB Atlas!');
    console.log('======================================================================');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  }
}

runMigration();
