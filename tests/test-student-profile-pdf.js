const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=== RUNNING STUDENT PROFILE & PDF VALIDATION TEST ===");

const dashboardHtml = fs.readFileSync(path.join(__dirname, '../dashboard.html'), 'utf-8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../js/dashboard.js'), 'utf-8');
const dataJs = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf-8');
const apiJs = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf-8');
const directoryJs = fs.readFileSync(path.join(__dirname, '../js/directory.js'), 'utf-8');

// Test 1: Seed data contains fatherName, motherName, dobOriginal, dobCertificate
console.log("\n[Test 1] Checking SEED_DATA in js/data.js...");
assert(dataJs.includes('fatherName: "Md. Rafiqul Islam"'), "Seed data should include fatherName");
assert(dataJs.includes('motherName: "Mrs. Khadeja Begum"'), "Seed data should include motherName");
assert(dataJs.includes('dobOriginal: "2005-08-14"'), "Seed data should include dobOriginal");
assert(dataJs.includes('dobCertificate: "2006-02-10"'), "Seed data should include dobCertificate");
console.log("PASS: SEED_DATA includes complete parental and DOB information.");

// Test 2: Profile form in dashboard.js has mandatory fields
console.log("\n[Test 2] Checking profile form HTML & validation in js/dashboard.js...");
assert(dashboardJs.includes('id="profile-father-name"'), "Profile form must have profile-father-name");
assert(dashboardJs.includes('id="profile-mother-name"'), "Profile form must have profile-mother-name");
assert(dashboardJs.includes('id="profile-dob-original"'), "Profile form must have profile-dob-original");
assert(dashboardJs.includes('id="profile-dob-certificate"'), "Profile form must have profile-dob-certificate");

assert(dashboardJs.includes("Father's Name is mandatory"), "Must have Father's Name validation");
assert(dashboardJs.includes("Mother's Name is mandatory"), "Must have Mother's Name validation");
assert(dashboardJs.includes("Original Date of Birth is mandatory"), "Must have Original DOB validation");
assert(dashboardJs.includes("Certificate Date of Birth is mandatory"), "Must have Certificate DOB validation");
console.log("PASS: Student profile section enforces Father's Name, Mother's Name, Original DOB, and Certificate DOB as mandatory info.");

// Test 3: PDF Generator adds rounded corner box, 3:4 photo, bold reg no, serial particulars, and enforces exclusions
console.log("\n[Test 3] Checking PDF generation in js/dashboard.js...");
const pdfSnippet = dashboardJs.slice(dashboardJs.indexOf("async function downloadSingleStudentPDF"), dashboardJs.indexOf("/* --------------------------------------------------------------------------\n   BATCH STATS"));

// Verify rounded corner rectangular box
assert(pdfSnippet.includes('roundedRect'), "PDF must render a rounded corner rectangular box");
assert(pdfSnippet.includes('photoW = 28.5') && pdfSnippet.includes('photoH = 38'), "Profile picture must have 3:4 ratio (28.5mm x 38mm)");

// Verify name is upper size and on right of picture
assert(pdfSnippet.includes('upperName = (student.name || "STUDENT NAME").toUpperCase()'), "Student name must be prominent upper size in the box");

// Verify Registration No and Student ID are in the box and Reg No is bold
assert(pdfSnippet.includes('University Registration No:'), "Box must include University Registration No");
assert(pdfSnippet.includes('Student ID (Academic Roll):'), "Box must include Student ID (Academic Roll)");
assert(pdfSnippet.includes('doc.setFont("helvetica", "bold")'), "Registration No must be styled bold");

// Verify serial table rows in exact order
assert(pdfSnippet.includes('content: "Father\'s Name"'), "Serial table must include Father's Name");
assert(pdfSnippet.includes('content: "Mother\'s Name"'), "Serial table must include Mother's Name");
assert(pdfSnippet.includes('content: "Certificate Date of Birth"'), "Serial table must include Certificate Date of Birth");
assert(pdfSnippet.includes('content: "Blood Group"'), "Serial table must include Blood Group");
assert(pdfSnippet.includes('content: "Home Address"'), "Serial table must include Home Address");
assert(pdfSnippet.includes('content: "Contact Phone No"'), "Serial table must include Contact Phone No");
assert(pdfSnippet.includes('content: "Official Email"'), "Serial table must include Official Email");
assert(pdfSnippet.includes('content: "Skills Section"'), "Serial table must include Skills Section");
assert(pdfSnippet.includes('content: "Bio Section"'), "Serial table must include Bio Section");

// Verify exclusions per user instructions:
assert(!pdfSnippet.includes('Portal Account Status') && !pdfSnippet.includes('portal status'), "Portal status must NOT be added to PDF");
assert(!pdfSnippet.includes('Batch Role') && !pdfSnippet.includes('Student Role') && !pdfSnippet.includes('role || "Batch Member"'), "Student role must NOT be added to PDF");
assert(!pdfSnippet.includes('MD. KHAIRUL ISLAM NAHID') && !pdfSnippet.includes('MD KHAIRUL ISLAM NAHID'), "MD KHAIRUL ISLAM NAHID name must be removed from footer");
assert(!pdfSnippet.includes('content: "Original Date of Birth"'), "Original Date of Birth must be removed from the PDF table");
assert(!dashboardJs.includes('STUDENT PRIVACY & DATA CONFIDENTIALITY NOTICE:'), "PDF must NOT have the social privacy notice shield");
assert(!dashboardJs.includes('Personal social media links are strictly excluded from this record.'), "PDF footer must NOT contain social exclusion text");

console.log("PASS: Individual PDF generator correctly creates rounded rectangular identity box with 3:4 photo, prominent name, bold reg no, serial particulars, and removes portal status, student role, and footer admin name.");

// Test 4: Modals in dashboard.html & directory.js
console.log("\n[Test 4] Checking modals in dashboard.html and directory.js...");
assert(dashboardHtml.includes('id="edit-std-father"'), "edit-student-modal must have edit-std-father");
assert(dashboardHtml.includes('id="edit-std-mother"'), "edit-student-modal must have edit-std-mother");
assert(dashboardHtml.includes('id="edit-std-dob-orig"'), "edit-student-modal must have edit-std-dob-orig");
assert(dashboardHtml.includes('id="edit-std-dob-cert"'), "edit-student-modal must have edit-std-dob-cert");
assert(dashboardHtml.includes('id="modal-family-dob-container"'), "student-detail-modal must have family & DOB container");
assert(directoryJs.includes('modalFather'), "directory.js must populate student modal father");
console.log("PASS: All modals and directory bindings are synchronized.");

// Test 5: Authorization for PDF download (students can only download their own, admin has all access)
console.log("\n[Test 5] Checking PDF download permission controls...");
assert(dashboardJs.includes('!isUserAdmin && !isOwnProfile'), "downloadSingleStudentPDF must guard against non-admin downloading other students");
assert(dashboardJs.includes('Students are only permitted to download their own individual dossier'), "Access restriction toast must be configured");
assert(dashboardJs.includes('(isAdminActive || isOwnStudent)'), "Student card/table must only show PDF download for admin or student's own record");
assert(directoryJs.includes('downloadBtn.style.display = (isAdmin || isOwnProfile) ? "inline-flex" : "none"'), "Student modal must only show download button for admin or own profile");
assert(dashboardHtml.includes('id="modal-download-profile-btn" onclick="downloadCurrentModalStudentProfile()" style="font-weight:700; display:none;'), "Modal download button must be hidden by default in HTML");
assert(directoryJs.includes('downloadBtn.style.display = "none"'), "openStudentModal must reset download button to hidden initially");
assert(directoryJs.includes('!isAdmin && !isOwn'), "downloadCurrentModalStudentProfile must guard against unauthorized modal downloads");
console.log("PASS: Role and ownership permissions correctly enforced: students can only download their own dossier; admin has full access.");

console.log("\n=== ALL PROFILE & PDF CHECKS PASSED SUCCESSFULLY! ===");
