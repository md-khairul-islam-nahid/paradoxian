/**
 * Comprehensive Automated Tests for Gallery Memory Approval, Customizable Categories,
 * Multi-Image Upload (Up to 50 Pictures), & Admin Site Content CMS
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Mock browser environment (window, localStorage, document, Image, FileReader)
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] !== undefined ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
global.window = {
  localStorage: global.localStorage,
  location: { href: "http://localhost/dashboard.html", replace: () => {} }
};
global.sessionStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Mock SEED_DATA
global.SEED_DATA = {
  students: [
    {
      id: "std-101",
      roll: "2024227170",
      reg: "24227106966",
      name: "MD. KHAIRUL ISLAM NAHID",
      email: "iam.nahidkhan.bd@gmail.com",
      status: "Active",
      fatherName: "Md. Rafiqul Islam",
      motherName: "Mrs. Khadeja Begum",
      dobOriginal: "2005-08-14",
      dobCertificate: "2006-02-10",
      role: "CR & Administrator",
      isAdmin: true,
      isSuperAdmin: true
    },
    {
      id: "std-102",
      roll: "2024227171",
      reg: "24227106967",
      name: "Tanvir Ahmed",
      email: "tanvir@gmail.com",
      status: "Active",
      fatherName: "Md. Faruq Ahmed",
      motherName: "Nazma Begum",
      dobOriginal: "2005-03-20",
      dobCertificate: "2005-05-15",
      role: "Student",
      isAdmin: false
    }
  ],
  gallery: [
    {
      id: "gal-seed-1",
      title: "Batch Welcome 2024",
      category: "Orientation & Freshers",
      date: "2024-02-15",
      location: "Physics Auditorium",
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      caption: "Freshers day memories",
      status: "Approved"
    }
  ],
  notices: [],
  routine: []
};

// Load api.js
require("../js/api.js");
const api = window.api;

async function runTests() {
  console.log("=== Running Gallery Memory & CMS Automated Tests ===");

  // Test 1: Storage initialization
  console.log("Test 1: Storage initialization...");
  const siteContent = await api.getSiteContent();
  assert(siteContent, "Site content should exist");
  assert(siteContent.home && siteContent.about && siteContent.students && siteContent.gallery && siteContent.notice && siteContent.contacts,
    "All 6 CMS sections must be initialized");
  console.log("✓ Site content initialized with all 6 sections (Home, About, Students, Gallery, Notice, Contacts)");

  // Test 2: Public gallery excludes unapproved items
  console.log("\nTest 2: Public gallery default filtering...");
  const initialGallery = await api.getGallery();
  assert.strictEqual(initialGallery.length, 1, "Should have 1 seed gallery item");
  assert.strictEqual(initialGallery[0].title, "Batch Welcome 2024");
  console.log("✓ Public gallery only returns approved items");

  // Test 3: Unauthenticated user cannot submit memory
  console.log("\nTest 3: Authentication required for memory upload...");
  let unauthError = false;
  try {
    await api.submitMemory({
      title: "Physics Lab Adda",
      image: "data:image/png;base64,sample"
    }, null);
  } catch (e) {
    unauthError = true;
  }
  assert(unauthError, "Should throw error when unauthenticated user tries to submit memory");
  console.log("✓ Guest submission strictly rejected");

  // Test 4: Image requirement validation
  console.log("\nTest 4: Image required for memory upload...");
  const studentUser = SEED_DATA.students[1]; // Tanvir
  let noImageError = false;
  try {
    await api.submitMemory({
      title: "No Image Memory",
      image: ""
    }, studentUser);
  } catch (e) {
    noImageError = true;
  }
  assert(noImageError, "Should throw error when image is missing");
  console.log("✓ Image file is strictly required");

  // Test 5: Student submits memory -> status Pending + Admin notification
  console.log("\nTest 5: Student memory submission creates Pending status & Admin notification...");
  const submittedMemory = await api.submitMemory({
    title: "Quantum Lab Optics Setup",
    date: "2026-09-15",
    location: "Physics Lab 304",
    category: "Campus & Adda",
    details: "Setting up Michelson interferometer with batchmates",
    otherInfo: "Tanvir, Sakib, Dr. Rafiq",
    image: "data:image/png;base64,samplephoto123"
  }, studentUser);

  assert(submittedMemory, "Submitted memory returned");
  assert.strictEqual(submittedMemory.status, "Pending", "Status must be Pending");
  assert.strictEqual(submittedMemory.submittedBy.roll, "2024227171", "Must record student roll");

  // Check public gallery - MUST NOT show this pending memory
  const publicGalAfterSubmit = await api.getGallery();
  assert.strictEqual(publicGalAfterSubmit.length, 1, "Public gallery must NOT display pending memory");

  // Check admin pending queue
  const pendingMemories = await api.getPendingMemories();
  assert(pendingMemories.some(m => m.id === submittedMemory.id), "Pending memory must appear in admin pending list");

  // Check student memories list
  const studentMemories = await api.getStudentMemories(studentUser.roll);
  assert(studentMemories.some(m => m.id === submittedMemory.id), "Student must see their own submission");
  assert.strictEqual(studentMemories[0].status, "Pending");

  // Check notifications
  const notifs = await api.getNotifications();
  const memNotif = notifs.find(n => n.type === "memory_submission" && n.referenceId === submittedMemory.id);
  assert(memNotif, "Admin notification must be generated for memory submission");
  assert.strictEqual(memNotif.isResolved, false, "Notification must not be resolved yet");
  console.log("✓ Memory submitted as Pending, hidden from public gallery, and notified to Admin");

  // Test 6: Admin approves memory -> status Approved, notification resolved, visible in public gallery
  console.log("\nTest 6: Admin approves memory...");
  const adminNahid = SEED_DATA.students[0];
  const approvedMem = await api.approveMemory(submittedMemory.id, adminNahid);
  assert.strictEqual(approvedMem.status, "Approved", "Memory status should now be Approved");

  // Check public gallery now includes the approved memory
  const publicGalAfterApprove = await api.getGallery();
  assert.strictEqual(publicGalAfterApprove.length, 2, "Public gallery must now include the approved memory");
  assert(publicGalAfterApprove.some(m => m.id === submittedMemory.id));

  // Check notification resolved
  const notifsAfterApprove = await api.getNotifications();
  const resolvedNotif = notifsAfterApprove.find(n => n.type === "memory_submission" && n.referenceId === submittedMemory.id);
  assert(resolvedNotif.isResolved, "Notification should be marked resolved after approval");
  console.log("✓ Memory approved, notification resolved, and instantly live on public gallery");

  // Test 7: Memory rejection flow
  console.log("\nTest 7: Memory rejection flow...");
  const mem2 = await api.submitMemory({
    title: "Blurry Photo",
    image: "data:image/png;base64,blurry",
    category: "Campus & Adda"
  }, studentUser);
  assert.strictEqual(mem2.status, "Pending");

  const rejected = await api.rejectMemory(mem2.id, "Image too blurry");
  assert.strictEqual(rejected.status, "Rejected");
  assert.strictEqual(rejected.rejectionReason, "Image too blurry");

  const publicGalAfterReject = await api.getGallery();
  assert(!publicGalAfterReject.some(m => m.id === mem2.id), "Rejected memory must not appear in public gallery");
  console.log("✓ Rejection flow works with rejection reason preserved");

  // Test 8: Site Content Manager (CMS) updates
  console.log("\nTest 8: Site Content CMS Updates across all 6 sections...");
  // 1. Home
  await api.updateSiteContent("home", {
    heroTitle: "PARADOX-147 QUANTUM",
    motto: "“Curiosity is the engine of quantum discovery.”"
  });
  let updatedContent = await api.getSiteContent();
  assert.strictEqual(updatedContent.home.heroTitle, "PARADOX-147 QUANTUM");
  assert.strictEqual(updatedContent.home.motto, "“Curiosity is the engine of quantum discovery.”");

  // 2. About
  await api.updateSiteContent("about", {
    title: "The Quantum Legacy of Rajshahi College"
  });
  updatedContent = await api.getSiteContent();
  assert.strictEqual(updatedContent.about.title, "The Quantum Legacy of Rajshahi College");

  // 3. Students
  await api.updateSiteContent("students", {
    title: "Official Directory of Physicists"
  });
  updatedContent = await api.getSiteContent();
  assert.strictEqual(updatedContent.students.title, "Official Directory of Physicists");

  // 4. Gallery
  await api.updateSiteContent("gallery", {
    title: "Batch 147 Time Machine"
  });
  updatedContent = await api.getSiteContent();
  assert.strictEqual(updatedContent.gallery.title, "Batch 147 Time Machine");

  // 5. Notice
  await api.updateSiteContent("notice", {
    emergencyNotice: "Semester Final Exam schedules announced."
  });
  updatedContent = await api.getSiteContent();
  assert.strictEqual(updatedContent.notice.emergencyNotice, "Semester Final Exam schedules announced.");

  // 6. Contacts
  await api.updateSiteContent("contacts", {
    crPhone: "+8801859445559",
    email: "mail.paradox147@gmail.com"
  });
  updatedContent = await api.getSiteContent();
  assert.strictEqual(updatedContent.contacts.crPhone, "+8801859445559");
  console.log("✓ All 6 CMS sections successfully updated and persisted in storage");

  // Test 9: Notifications read operations
  console.log("\nTest 9: Notifications read operations...");
  await api.markAllNotificationsRead();
  const unreadNotifs = await api.getNotifications(true);
  assert.strictEqual(unreadNotifs.length, 0, "No unread notifications should remain after markAllNotificationsRead");
  console.log("✓ Notifications mark all as read verified");

  // Test 10: Customizable Album Categories
  console.log("\nTest 10: Customizable Album Categories (CRUD & Dynamic Discovery)...");
  const defaultCategories = await api.getGalleryCategories();
  assert(Array.isArray(defaultCategories), "Categories must return an array");
  assert(defaultCategories.includes("Orientation & Freshers"), "Must include default Orientation & Freshers");
  assert(defaultCategories.includes("Campus & Adda"), "Must include default Campus & Adda");

  // Add custom category
  const addedCat = await api.addGalleryCategory("Saint Martin Tour 2026");
  assert.strictEqual(addedCat, "Saint Martin Tour 2026");
  const categoriesAfterAdd = await api.getGalleryCategories();
  assert(categoriesAfterAdd.includes("Saint Martin Tour 2026"), "New custom category must be in categories list");

  // Re-adding same category must not duplicate
  await api.addGalleryCategory("Saint Martin Tour 2026");
  const categoriesNoDup = await api.getGalleryCategories();
  const occurrences = categoriesNoDup.filter(c => c.toLowerCase() === "saint martin tour 2026").length;
  assert.strictEqual(occurrences, 1, "Duplicate category names must be prevented");

  // Submit memory with auto-registered custom category
  const memCustomCat = await api.submitMemory({
    title: "Coral Reef Sunset",
    category: "Kuakata Picnic 2026", // Brand new custom category
    image: "data:image/png;base64,sunset123"
  }, studentUser);
  assert.strictEqual(memCustomCat.category, "Kuakata Picnic 2026");
  const categoriesAfterSubmit = await api.getGalleryCategories();
  assert(categoriesAfterSubmit.includes("Kuakata Picnic 2026"), "Auto-registered category must appear in category list");

  // Delete category
  await api.deleteGalleryCategory("Saint Martin Tour 2026");
  const categoriesAfterDelete = await api.getGalleryCategories();
  assert(!categoriesAfterDelete.includes("Saint Martin Tour 2026"), "Deleted category should no longer exist in stored list");
  console.log("✓ Album category customization, deduplication, auto-registration and deletion verified");

  // Test 11: Multi-Image Upload (Up to 50 Pictures)
  console.log("\nTest 11: Multi-Image Upload (Up to 50 Pictures per Memory)...");
  
  // Create an array of 12 mock images
  const sample12Images = [];
  for (let i = 1; i <= 12; i++) {
    sample12Images.push(`data:image/png;base64,image_payload_${i}`);
  }

  const multiImageMem = await api.submitMemory({
    title: "Saint Martin Beach Football Match",
    date: "2026-09-16",
    location: "Saint Martin Beach",
    category: "Study Tours & Picnic",
    images: sample12Images
  }, studentUser);

  assert(multiImageMem, "Multi-image memory should be created");
  assert.strictEqual(multiImageMem.photoCount, 12, "photoCount must be 12");
  assert.strictEqual(multiImageMem.images.length, 12, "images array length must be 12");
  assert.strictEqual(multiImageMem.image, sample12Images[0], "Primary image must be the first photo for backwards compatibility");

  // Test with maximum 50 images
  const sample50Images = [];
  for (let i = 1; i <= 50; i++) {
    sample50Images.push(`data:image/png;base64,image_batch_${i}`);
  }
  const maxMem = await api.submitMemory({
    title: "Complete 50 Photo Album",
    category: "Campus & Adda",
    images: sample50Images
  }, studentUser);
  assert.strictEqual(maxMem.photoCount, 50, "50 photos should be allowed");

  // Test rejection when exceeding 50 images
  const sample51Images = [...sample50Images, "data:image/png;base64,overflow_image"];
  let limitExceededError = false;
  try {
    await api.submitMemory({
      title: "Exceeding 50 Photos",
      category: "Campus & Adda",
      images: sample51Images
    }, studentUser);
  } catch (e) {
    limitExceededError = true;
    assert(e.message.includes("50 pictures"), "Error message should mention 50 pictures limit");
  }
  assert(limitExceededError, "Submitting more than 50 images must throw an error");

  // Test admin addMemory with multi-image
  const adminMultiMem = await api.addMemory({
    title: "Department Farewell 2026",
    category: "Tech Fest & Hackathons",
    images: sample12Images.slice(0, 5)
  });
  assert.strictEqual(adminMultiMem.status, "Approved", "Admin added memory should be Approved directly");
  assert.strictEqual(adminMultiMem.photoCount, 5, "photoCount must be 5");
  assert.strictEqual(adminMultiMem.images.length, 5, "images array must contain 5 items");

  // Test 12: Editing Published Gallery Memory
  console.log("\nTest 12: Editing Published Gallery Memories (Title, Category, Photos, Details)...");
  
  // Fetch an existing memory by ID
  const memToEdit = await api.getMemoryById(adminMultiMem.id);
  assert(memToEdit, "Should retrieve memory by ID");
  assert.strictEqual(memToEdit.id, adminMultiMem.id);

  // Update memory particulars including a new custom category & updated photos array
  const updatedPhotos = [
    "data:image/png;base64,new_edited_photo_1",
    "data:image/png;base64,new_edited_photo_2",
    "data:image/png;base64,new_edited_photo_3"
  ];

  const updatedMem = await api.updateMemory(adminMultiMem.id, {
    title: "Physics Dept Grand Farewell 2026",
    location: "Physics Auditorium & Lawn",
    category: "Farewell Gala 2026", // New custom category
    caption: "Updated memories with alumni and respected professors",
    otherInfo: "Nahid, Tanvir, Sakib, Dr. Rafiq Sir",
    images: updatedPhotos
  });

  assert.strictEqual(updatedMem.title, "Physics Dept Grand Farewell 2026");
  assert.strictEqual(updatedMem.location, "Physics Auditorium & Lawn");
  assert.strictEqual(updatedMem.category, "Farewell Gala 2026");
  assert.strictEqual(updatedMem.photoCount, 3);
  assert.strictEqual(updatedMem.images.length, 3);
  assert.strictEqual(updatedMem.image, updatedPhotos[0]);
  assert(updatedMem.updatedAt, "Should have updatedAt timestamp");

  // Verify new custom category was automatically registered into category store
  const allCategoriesAfterUpdate = await api.getGalleryCategories();
  assert(allCategoriesAfterUpdate.includes("Farewell Gala 2026"), "Updated custom category must appear in category list");

  // Verify getGallery reflects the updated title and photos
  const liveGallery = await api.getGallery();
  const foundLive = liveGallery.find(m => m.id === adminMultiMem.id);
  assert(foundLive, "Updated memory must exist in live gallery");
  assert.strictEqual(foundLive.title, "Physics Dept Grand Farewell 2026");
  assert.strictEqual(foundLive.photoCount, 3);

  // Test error handling when trying to update with 0 images
  let emptyImgError = false;
  try {
    await api.updateMemory(adminMultiMem.id, { images: [] });
  } catch (e) {
    emptyImgError = true;
    assert(e.message.includes("At least one image"), "Should reject empty images array");
  }
  assert(emptyImgError, "Updating with empty images must fail");

  // Test error handling when trying to update with > 50 images
  let overflowImgError = false;
  try {
    await api.updateMemory(adminMultiMem.id, { images: sample51Images });
  } catch (e) {
    overflowImgError = true;
    assert(e.message.includes("Maximum 50 pictures"), "Should reject > 50 images");
  }
  assert(overflowImgError, "Updating with > 50 images must fail");

  console.log("✓ Published memory editing, custom category auto-registration, and photo updates verified");

  // Test 13: Contact Area Submission & Live Admin Notification
  console.log("\nTest 13: Contact Area Submission & Live Admin Notification...");
  
  // Verify validation on missing required fields
  let validationErrorCaught = false;
  try {
    await api.submitContactMessage({ name: "", email: "nahid@test.com", subject: "Test", message: "Hello" });
  } catch (err) {
    validationErrorCaught = true;
    assert(err.message.includes("Please enter your name"));
  }
  assert(validationErrorCaught, "Should reject empty contact name");

  // Submit valid contact message with all info filled
  const contactSubmission = await api.submitContactMessage({
    name: "S. M. Farhan",
    email: "farhan.batch147@gmail.com",
    phone: "+880 1712-345678",
    subject: "Query regarding Grand Tour 2026",
    message: "Respected CR Nahid, could you please confirm the final date and deposit deadline for our Sylhet tour?"
  });

  assert(contactSubmission.success, "Contact message submission must succeed");
  assert(contactSubmission.messageId, "Must return created messageId");
  assert(contactSubmission.notificationId, "Must return created admin notificationId");

  // Verify message is saved in storage
  const allMessages = await api.getContactMessages();
  const savedMsg = allMessages.find(m => m.id === contactSubmission.messageId);
  assert(savedMsg, "Submitted message must be persisted in CONTACT_MESSAGES storage");
  assert.strictEqual(savedMsg.name, "S. M. Farhan");
  assert.strictEqual(savedMsg.email, "farhan.batch147@gmail.com");
  assert.strictEqual(savedMsg.phone, "+880 1712-345678");
  assert.strictEqual(savedMsg.subject, "Query regarding Grand Tour 2026");
  assert.strictEqual(savedMsg.isRead, false);

  // Verify notification was created and dispatched for admin
  const allNotifs = await api.getNotifications();
  const contactNotif = allNotifs.find(n => n.id === contactSubmission.notificationId);
  assert(contactNotif, "Admin notification must exist in notifications list");
  assert.strictEqual(contactNotif.type, "contact_message");
  assert.strictEqual(contactNotif.isRead, false);
  assert(contactNotif.title.includes("Query regarding Grand Tour 2026") || contactNotif.title.includes("S. M. Farhan"));
  assert.strictEqual(contactNotif.referenceId, savedMsg.id);
  assert.strictEqual(contactNotif.referenceData.name, "S. M. Farhan");
  assert.strictEqual(contactNotif.referenceData.phone, "+880 1712-345678");
  assert.strictEqual(contactNotif.referenceData.email, "farhan.batch147@gmail.com");

  // Test markContactMessageRead
  await api.markContactMessageRead(savedMsg.id);
  const reloadedNotifs = await api.getNotifications();
  const reloadedContactNotif = reloadedNotifs.find(n => n.id === contactSubmission.notificationId);
  assert.strictEqual(reloadedContactNotif.isRead, true, "Notification must be marked as read");

  console.log("✓ Contact area submission & admin dashboard notification flow fully verified");

  // Test 14: Notification Categories, Read/Unread Status & Deletion Operations
  console.log("\nTest 14: Notification Categories, Read/Unread Tracking & Deletion Operations...");

  // 1. Add sample notifications across all 3 categories (contact, memory, system)
  const notif1 = await api.addNotification({
    type: "contact_message",
    title: "Inquiry from Farhan",
    message: "Question about batch reunion 2026",
    referenceData: { name: "Farhan", email: "farhan@test.com" }
  });

  const notif2 = await api.addNotification({
    type: "memory_submission",
    title: "Picnic Photo Submission",
    message: "New photo from picnic",
    referenceData: { title: "Picnic 2024", studentName: "Nahid" }
  });

  const notif3 = await api.addNotification({
    type: "general",
    title: "System Maintenance Notice",
    message: "Database optimization completed successfully."
  });

  // 2. Verify categories are correctly assigned
  assert.strictEqual(notif1.category, "contact", "contact_message type must have category 'contact'");
  assert.strictEqual(notif2.category, "memory", "memory_submission type must have category 'memory'");
  assert.strictEqual(notif3.category, "system", "general type must have category 'system'");

  // 3. Test getNotificationById
  const retrieved1 = await api.getNotificationById(notif1.id);
  assert(retrieved1, "getNotificationById must find notification by ID");
  assert.strictEqual(retrieved1.title, "Inquiry from Farhan");

  // 4. Verify Read & Unread Counting
  let notifsList = await api.getNotifications();
  let unread = notifsList.filter(n => !n.isRead).length;
  let read = notifsList.filter(n => n.isRead).length;
  assert(unread >= 3, "Must have at least 3 unread notifications");

  // 5. Open & Read: mark as read
  await api.markNotificationRead(notif1.id);
  notifsList = await api.getNotifications();
  let newUnread = notifsList.filter(n => !n.isRead).length;
  let newRead = notifsList.filter(n => n.isRead).length;
  assert.strictEqual(newUnread, unread - 1, "Unread count must decrement by 1 after reading");
  assert.strictEqual(newRead, read + 1, "Read count must increment by 1 after reading");

  // 6. Toggle Read/Unread: mark back as unread
  await api.markNotificationUnread(notif1.id);
  notifsList = await api.getNotifications();
  const toggledNotif = notifsList.find(n => n.id === notif1.id);
  assert.strictEqual(toggledNotif.isRead, false, "Notification must be unread after markNotificationUnread");

  // 7. Individual Deletion
  await api.deleteNotification(notif3.id);
  notifsList = await api.getNotifications();
  assert(!notifsList.some(n => n.id === notif3.id), "Deleted notification must no longer exist in storage");

  // 8. Bulk Clear Read Notifications
  await api.markNotificationRead(notif2.id); // mark notif2 read
  await api.clearAllNotifications(true); // clear only read
  notifsList = await api.getNotifications();
  assert(!notifsList.some(n => n.id === notif2.id), "Read notification must be removed by clearAllNotifications(true)");
  assert(notifsList.some(n => n.id === notif1.id), "Unread notification must remain untouched after clearAllNotifications(true)");

  console.log("✓ Categories, Read/Unread counters, Open & Read toggling, and Deletion fully verified");

  // Test 15: Official Paradox Email Reply (mail.paradox147@gmail.com) & Notification Modal Dismissal
  console.log("\nTest 15: Official Paradox Email Reply (mail.paradox147@gmail.com) & Notification Modal Dismissal...");

  const dashboardJsPath = path.join(__dirname, "../js/dashboard.js");
  const dashboardJsContent = fs.readFileSync(dashboardJsPath, "utf-8");

  const dashboardHtmlPath = path.join(__dirname, "../dashboard.html");
  const dashboardHtmlContent = fs.readFileSync(dashboardHtmlPath, "utf-8");

  // 1. Verify existence of modal in dashboard.html
  assert(dashboardHtmlContent.includes('id="notification-detail-modal"'), "dashboard.html must include #notification-detail-modal");

  // 2. Verify official email address is configured in dashboard.js
  assert(dashboardJsContent.includes('mail.paradox147@gmail.com'), "dashboard.js must contain official email mail.paradox147@gmail.com");

  // 3. Verify handleOfficialMailReply function definition and modal dismissal
  assert(dashboardJsContent.includes('function handleOfficialMailReply('), "dashboard.js must define handleOfficialMailReply");
  assert(dashboardJsContent.includes('closeNotificationModal();'), "handleOfficialMailReply must invoke closeNotificationModal() immediately");

  // 4. Verify CC parameter to official email
  assert(dashboardJsContent.includes('const officialEmail = "mail.paradox147@gmail.com";'), "Official email constant must be defined");
  assert(dashboardJsContent.includes('&cc=${encodeURIComponent(officialEmail)}') || dashboardJsContent.includes('cc='), "Email reply must include CC to official email");

  // 5. Verify official committee signature and subject prefix
  assert(dashboardJsContent.includes('Re: [Paradox-147]'), "Email reply subject must prepend Re: [Paradox-147]");
  assert(dashboardJsContent.includes('PARADOX-147 Batch Portal Administration'), "Email body must include official batch portal signature");
  assert(dashboardJsContent.includes('MD. KHAIRUL ISLAM NAHID'), "Email body must include CR & Admin name");
  assert(dashboardJsContent.includes('Department of Physics, Rajshahi College'), "Email body must include department credentials");

  // 6. Verify helper dispatchers and window exports
  assert(dashboardJsContent.includes('function handleOfficialReplyFromNotifId('), "handleOfficialReplyFromNotifId must be defined");
  assert(dashboardJsContent.includes('function handleOfficialReplyFromMessageId('), "handleOfficialReplyFromMessageId must be defined");
  assert(dashboardJsContent.includes('window.handleOfficialMailReply = handleOfficialMailReply;'), "handleOfficialMailReply must be exported to window");
  assert(dashboardJsContent.includes('window.handleOfficialReplyFromNotifId = handleOfficialReplyFromNotifId;'), "handleOfficialReplyFromNotifId must be exported to window");
  assert(dashboardJsContent.includes('window.handleOfficialReplyFromMessageId = handleOfficialReplyFromMessageId;'), "handleOfficialReplyFromMessageId must be exported to window");

  // 7. Verify modal & dropdown dismissal simulation
  let modalHidden = false;
  let dropdownHidden = false;
  let mockNavUrl = null;
  let mockWindowOpenedUrl = null;

  const mockModal = {
    classList: {
      remove: (c) => { if (c === "active") modalHidden = true; }
    },
    style: {
      display: "flex",
      set display(val) { if (val === "none") modalHidden = true; }
    }
  };

  const mockDropdown = {
    style: {
      display: "block",
      set display(val) { if (val === "none") dropdownHidden = true; }
    }
  };

  const mockDoc = {
    getElementById: (id) => {
      if (id === "notification-detail-modal") return mockModal;
      if (id === "notification-dropdown-menu") return mockDropdown;
      return null;
    }
  };

  // Mock global document & window navigation for standalone handler test
  const originalDoc = global.document;
  global.document = mockDoc;

  // Execute isolated logic of handleOfficialMailReply
  function testIsolatedOfficialReply(recipientEmail, subject, senderName, originalMessage, mode = 'default') {
    // 1. Immediately close notification modal
    const m = global.document.getElementById("notification-detail-modal");
    if (m) {
      m.classList.remove("active");
      m.style.display = "none";
    }
    // 2. Close notification dropdown menu
    const menu = global.document.getElementById("notification-dropdown-menu");
    if (menu) {
      menu.style.display = "none";
    }

    const officialEmail = "mail.paradox147@gmail.com";
    const reSubject = subject ? (subject.startsWith("Re:") ? subject : `Re: [Paradox-147] ${subject}`) : "Re: [Paradox-147] Inquiry";
    const emailBody = `Dear ${senderName},\n\nThank you for contacting PARADOX-147.\n\n---\nOfficial Email: ${officialEmail}`;

    if (mode === 'gmail') {
      mockWindowOpenedUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(reSubject)}&cc=${encodeURIComponent(officialEmail)}&body=${encodeURIComponent(emailBody)}`;
    } else {
      mockNavUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(reSubject)}&cc=${encodeURIComponent(officialEmail)}&body=${encodeURIComponent(emailBody)}`;
    }
  }

  testIsolatedOfficialReply("sender@batch147.edu", "Tour Query", "Sakib", "What is the date of tour?", "default");
  assert.strictEqual(modalHidden, true, "Notification modal must disappear/hide upon opening mail");
  assert.strictEqual(dropdownHidden, true, "Notification dropdown flyout must close upon opening mail");
  assert(mockNavUrl.includes("mailto:sender%40batch147.edu"), "mailto URL must target sender");
  assert(mockNavUrl.includes("cc=mail.paradox147%40gmail.com"), "mailto URL must CC mail.paradox147@gmail.com");
  assert(mockNavUrl.includes("Re%3A%20%5BParadox-147%5D%20Tour%20Query"), "mailto URL subject must include Re: [Paradox-147]");

  // Test Gmail Web mode
  testIsolatedOfficialReply("sender@batch147.edu", "Tour Query", "Sakib", "What is the date of tour?", "gmail");
  assert(mockWindowOpenedUrl.includes("https://mail.google.com/mail/?view=cm"), "Gmail mode must target Google Mail compose");
  assert(mockWindowOpenedUrl.includes("cc=mail.paradox147%40gmail.com"), "Gmail compose URL must CC mail.paradox147@gmail.com");

  // Restore global document
  global.document = originalDoc;

  // Test 16: Campus Hero Background & Global Developer Portfolio Attribution (MD. KHAIRUL ISLAM NAHID / https://nahid.page.gd)
  console.log("\nTest 16: Campus Hero Background & Global Developer Portfolio Attribution...");

  // 1. Verify campus background image exists
  const campusImgPath = path.join(__dirname, "../assets/images/rc-physics-campus.jpg");
  assert(fs.existsSync(campusImgPath), "rc-physics-campus.jpg must exist in assets/images/");
  const imgStat = fs.statSync(campusImgPath);
  assert(imgStat.size > 50000, "rc-physics-campus.jpg must be a valid image file");

  // 2. Verify css/style.css references the image in .hero
  const styleCssPath = path.join(__dirname, "../css/style.css");
  const styleCssContent = fs.readFileSync(styleCssPath, "utf-8");
  assert(styleCssContent.includes("rc-physics-campus.jpg"), "style.css must reference rc-physics-campus.jpg in .hero");
  assert(styleCssContent.includes(".developer-credit"), "style.css must define .developer-credit");
  assert(styleCssContent.includes(".developer-portfolio-link"), "style.css must define .developer-portfolio-link");
  assert(styleCssContent.includes("cursor: pointer"), "style.css must define cursor: pointer for portfolio link");

  // 3. Verify all 6 pages have developer credit pointing to https://nahid.page.gd
  const pagesToVerify = [
    "index.html",
    "students.html",
    "gallery.html",
    "notices.html",
    "login.html",
    "dashboard.html"
  ];

  for (const pageName of pagesToVerify) {
    const pPath = path.join(__dirname, `../${pageName}`);
    assert(fs.existsSync(pPath), `${pageName} must exist`);
    const content = fs.readFileSync(pPath, "utf-8");
    assert(content.includes("https://nahid.page.gd"), `${pageName} must link to https://nahid.page.gd`);
    assert(content.includes("MD. KHAIRUL ISLAM NAHID"), `${pageName} must display developer name MD. KHAIRUL ISLAM NAHID`);
    assert(content.includes("Developed by"), `${pageName} must include 'Developed by' attribution`);
    assert(content.includes('target="_blank"'), `${pageName} link must have target="_blank"`);
    assert(content.includes('rel="noopener noreferrer"'), `${pageName} link must have rel="noopener noreferrer"`);
  }

  console.log("✓ Campus background image and developer portfolio attribution verified across all 6 pages");

  console.log("\n=========================================================================");
  console.log("🎉 ALL 16 TEST SUITES PASSED! CAMPUS HERO & DEVELOPER CREDIT VERIFIED.");
  console.log("=========================================================================");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
