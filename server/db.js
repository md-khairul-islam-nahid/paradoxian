const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Student = require('./models/Student');
const Admin = require('./models/Admin');
const AdminRequest = require('./models/AdminRequest');

const SUPER_ADMIN_EMAIL = 'iam.nahidkhan.bd@gmail.com';
const DATA_DIR = path.join(__dirname, 'data');

let isDbConnected = false;

function isConnected() {
  return isDbConnected && mongoose.connection.readyState === 1;
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('[Database] MONGODB_URI not provided. Running in High-Speed Local JSON Fallback Mode.');
    isDbConnected = false;
    return false;
  }

  try {
    console.log('[Database] Connecting to MongoDB Atlas Cloud...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    isDbConnected = true;
    console.log('[Database] Connected successfully to MongoDB Atlas!');

    // Run auto-seeding if database is freshly initialized
    await autoSeedDatabase();

    return true;
  } catch (err) {
    console.error('[Database] MongoDB Atlas connection failed:', err.message);
    console.log('[Database] Falling back smoothly to Local JSON Data Store (Zero Downtime).');
    isDbConnected = false;
    return false;
  }
}

async function autoSeedDatabase() {
  try {
    // 1. Seed Students
    const studentCount = await Student.countDocuments();
    const studentsFile = path.join(DATA_DIR, 'students.json');
    if (studentCount === 0 && fs.existsSync(studentsFile)) {
      const studentsData = JSON.parse(fs.readFileSync(studentsFile, 'utf8'));
      if (Array.isArray(studentsData) && studentsData.length > 0) {
        await Student.insertMany(studentsData);
        console.log(`[Database Seeder] Automatically seeded ${studentsData.length} students into MongoDB Atlas.`);
      }
    }

    // Ensure Super Admin Nahid exists and has full permissions in MongoDB
    const nahid = await Student.findOne({
      $or: [
        { email: SUPER_ADMIN_EMAIL.toLowerCase() },
        { roll: '2024227170' },
        { id: 'std-101' }
      ]
    });
    if (nahid) {
      if (!nahid.isAdmin || !nahid.isSuperAdmin || nahid.role !== 'Administrator') {
        nahid.isAdmin = true;
        nahid.isSuperAdmin = true;
        if (!nahid.role || nahid.role === 'Student' || nahid.role === 'Member') {
          nahid.role = 'Administrator';
        }
        await nahid.save();
        console.log('[Database Seeder] Super Admin privileges permanently verified in MongoDB.');
      }
    }

    // 2. Seed Admins
    const adminCount = await Admin.countDocuments();
    const adminsFile = path.join(DATA_DIR, 'admins.json');
    if (adminCount === 0 && fs.existsSync(adminsFile)) {
      const adminsData = JSON.parse(fs.readFileSync(adminsFile, 'utf8'));
      if (Array.isArray(adminsData) && adminsData.length > 0) {
        await Admin.insertMany(adminsData);
        console.log(`[Database Seeder] Automatically seeded ${adminsData.length} admins into MongoDB Atlas.`);
      }
    }

    // 3. Seed Admin Requests
    const requestCount = await AdminRequest.countDocuments();
    const requestsFile = path.join(DATA_DIR, 'admin_requests.json');
    if (requestCount === 0 && fs.existsSync(requestsFile)) {
      const requestsData = JSON.parse(fs.readFileSync(requestsFile, 'utf8'));
      if (Array.isArray(requestsData) && requestsData.length > 0) {
        await AdminRequest.insertMany(requestsData);
        console.log(`[Database Seeder] Automatically seeded ${requestsData.length} admin requests into MongoDB Atlas.`);
      }
    }
  } catch (seedErr) {
    console.warn('[Database Seeder] Auto-seed warning:', seedErr.message);
  }
}

module.exports = {
  connectDB,
  isConnected,
  autoSeedDatabase,
  Student,
  Admin,
  AdminRequest
};
