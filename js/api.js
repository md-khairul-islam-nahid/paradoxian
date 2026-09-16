/* ==========================================================================
   PARADOXIAN '26 - MOCK REST API SERVICE LAYER
   Simulates asynchronous REST endpoints backed by localStorage.
   Ready to swap with fetch('/api/v1/...') for Node.js & MongoDB Atlas!
   ========================================================================== */

class BatchApiService {
  constructor() {
    this.STORAGE_KEYS = {
      STUDENTS: "paradox147_students_v3",
      NOTICES: "paradox147_notices_v3",
      GALLERY: "paradox147_gallery_v3",
      ROUTINE: "paradox147_routine_v3",
      AUTH_USER: "paradox147_current_user_v3",
      STATS: "paradox147_stats_v3",
      ADMINS: "paradox147_admins_v3",
      ADMIN_REQUESTS: "paradox147_admin_requests_v3",
      NOTIFICATIONS: "paradox147_notifications_v3",
      SITE_CONTENT: "paradox147_site_content_v3",
      CATEGORIES: "paradox147_gallery_categories_v3",
      CONTACT_MESSAGES: "paradox147_contact_messages_v3"
    };
    this.SUPER_ADMIN_EMAIL = "iam.nahidkhan.bd@gmail.com";
    this.OFFICIAL_EMAIL = "mail.paradox147@gmail.com";
    this.initStorage();
  }

  /* Internal: Initialize localStorage with SEED_DATA if empty and unconditionally self-heal Super Admin */
  initStorage() {
    // 1. Admins List
    let admins = [];
    try {
      admins = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]");
    } catch {
      admins = [];
    }
    if (!Array.isArray(admins)) admins = [];

    let nahidAdmin = admins.find(a => 
      (a.email && a.email.toLowerCase() === this.SUPER_ADMIN_EMAIL.toLowerCase()) || 
      a.roll === "2024227170" || 
      a.id === "admin-101"
    );

    if (!nahidAdmin) {
      nahidAdmin = {
        id: "admin-101",
        studentId: "std-101",
        roll: "2024227170",
        name: "MD. KHAIRUL ISLAM NAHID",
        email: this.SUPER_ADMIN_EMAIL,
        phone: "+8801859445559",
        role: "CR & Administrator",
        isAdmin: true,
        isSuperAdmin: true,
        status: "Active",
        addedAt: "2024-01-01T00:00:00.000Z",
        password: "@NAHID_KHAN_2024227170"
      };
      admins.unshift(nahidAdmin);
      localStorage.setItem(this.STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    } else {
      let changed = false;
      if (nahidAdmin.isAdmin !== true) { nahidAdmin.isAdmin = true; changed = true; }
      if (nahidAdmin.isSuperAdmin !== true) { nahidAdmin.isSuperAdmin = true; changed = true; }
      if (nahidAdmin.status !== "Active") { nahidAdmin.status = "Active"; changed = true; }
      if (!nahidAdmin.role || nahidAdmin.role === "admin" || nahidAdmin.role === "Super Admin") { nahidAdmin.role = "CR & Administrator"; changed = true; }
      if (changed) {
        localStorage.setItem(this.STORAGE_KEYS.ADMINS, JSON.stringify(admins));
      }
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.ADMIN_REQUESTS)) {
      localStorage.setItem(this.STORAGE_KEYS.ADMIN_REQUESTS, JSON.stringify([]));
    }

    // 2. Students List
    let students = [];
    if (!localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) {
      students = (typeof SEED_DATA !== "undefined" && SEED_DATA.students) ? [...SEED_DATA.students] : [];
    } else {
      try {
        students = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS) || "[]");
      } catch {
        students = [];
      }
    }
    if (!Array.isArray(students)) students = [];

    const nahidStudent = students.find(s => 
      s.id === "std-101" || 
      s.roll === "2024227170" || 
      (s.email && s.email.toLowerCase() === this.SUPER_ADMIN_EMAIL.toLowerCase())
    );
    if (nahidStudent) {
      let changed = false;
      if (nahidStudent.isAdmin !== true) { nahidStudent.isAdmin = true; changed = true; }
      if (nahidStudent.isSuperAdmin !== true) { nahidStudent.isSuperAdmin = true; changed = true; }
      if (!nahidStudent.fatherName) { nahidStudent.fatherName = "Md. Rafiqul Islam"; changed = true; }
      if (!nahidStudent.motherName) { nahidStudent.motherName = "Mrs. Khadeja Begum"; changed = true; }
      if (!nahidStudent.dobOriginal) { nahidStudent.dobOriginal = "2005-08-14"; changed = true; }
      if (!nahidStudent.dobCertificate) { nahidStudent.dobCertificate = "2006-02-10"; changed = true; }
      if (changed) {
        localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      }
    } else if (typeof SEED_DATA !== "undefined" && SEED_DATA.students && SEED_DATA.students[0]) {
      students.unshift({ ...SEED_DATA.students[0], isAdmin: true, isSuperAdmin: true });
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } else {
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }

    // Ensure currently logged-in user in localStorage also gets parental & DOB defaults if missing
    try {
      const curUser = this.getCurrentUser();
      if (curUser && (!curUser.fatherName || !curUser.dobCertificate)) {
        const matched = students.find(s => s.id === curUser.id || s.roll === curUser.roll || s.email === curUser.email);
        if (matched) {
          curUser.fatherName = curUser.fatherName || matched.fatherName || "Md. Rafiqul Islam";
          curUser.motherName = curUser.motherName || matched.motherName || "Mrs. Khadeja Begum";
          curUser.dobOriginal = curUser.dobOriginal || matched.dobOriginal || "2005-08-14";
          curUser.dobCertificate = curUser.dobCertificate || matched.dobCertificate || "2006-02-10";
          localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(curUser));
        }
      }
    } catch (e) {}

    if (!localStorage.getItem(this.STORAGE_KEYS.NOTICES)) {
      localStorage.setItem(this.STORAGE_KEYS.NOTICES, JSON.stringify(typeof SEED_DATA !== "undefined" ? SEED_DATA.notices : []));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.GALLERY)) {
      localStorage.setItem(this.STORAGE_KEYS.GALLERY, JSON.stringify(typeof SEED_DATA !== "undefined" ? SEED_DATA.gallery : []));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.ROUTINE)) {
      localStorage.setItem(this.STORAGE_KEYS.ROUTINE, JSON.stringify(typeof SEED_DATA !== "undefined" ? SEED_DATA.routine : []));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.STATS)) {
      localStorage.setItem(this.STORAGE_KEYS.STATS, JSON.stringify({
        batchFund: "৳ 42,500",
        fundNote: "Treasury Healthy",
        creditsCompleted: 116,
        totalCredits: 160,
        currentCGPA: 3.84,
        upcomingExams: 3,
        examNote: "Starts Oct 15, 2026",
        pendingDues: "৳ 0 (Cleared)"
      }));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CONTACT_MESSAGES)) {
      localStorage.setItem(this.STORAGE_KEYS.CONTACT_MESSAGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.SITE_CONTENT)) {
      const defaultSiteContent = {
        home: {
          heroBadge: "Session: 2022-2023 | Department of Physics",
          heroTitle: "PARADOX-147",
          heroSubtitle: "Official Portal of 147th Batch, Rajshahi College Physics",
          heroDesc: "A digital sanctuary documenting our academic excellence, camaraderie, quantum thoughts, and everlasting memories at Rajshahi College.",
          ctaPrimary: "Explore Directory",
          ctaSecondary: "View Routine",
          motto: "Where curiosity meets quantum rigor."
        },
        about: {
          badge: "About Paradox-147",
          title: "Our Legacy & Department",
          description: "Paradox-147 represents the dynamic 147th Batch of Physics Department at the historic Rajshahi College. Established with passion, intellectual curiosity, and brotherhood.",
          department: "Department of Physics, Rajshahi College",
          batchName: "Paradox-147",
          session: "2022-2023",
          vision: "Empowering young physicists with knowledge, analytical thinking, and lifelong bonds."
        },
        students: {
          title: "Student Directory",
          subtitle: "Meet the brilliant minds and upcoming physicists of Paradox-147",
          description: "Search, connect, and explore verified profiles of our batch members."
        },
        gallery: {
          title: "Batch Gallery & Chronicles",
          subtitle: "Visual timeline of our campus life, study tours, and department memories",
          contributeNotice: "Share your moments and memories with Paradox-147."
        },
        notice: {
          title: "Department & Batch Notices",
          subtitle: "Stay updated with official academic schedules, exam dates, and notices",
          emergencyNotice: "Always verify dates with official department board."
        },
        contacts: {
          title: "Official Batch Contacts",
          subtitle: "Get in touch with Class Representative and Batch Administration",
          email: "mail.paradox147@gmail.com",
          crName: "MD. KHAIRUL ISLAM NAHID",
          crPhone: "+8801859445559",
          crRole: "Class Representative & Administrator",
          address: "Department of Physics, Rajshahi College, Rajshahi-6000, Bangladesh"
        }
      };
      localStorage.setItem(this.STORAGE_KEYS.SITE_CONTENT, JSON.stringify(defaultSiteContent));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CATEGORIES)) {
      const defaultCategories = [
        "Orientation & Freshers",
        "Campus & Adda",
        "Study Tours & Picnic",
        "Tech Fest & Hackathons"
      ];
      localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(defaultCategories));
    }
  }

  /* Internal: Small delay to simulate realistic network latency */
  async delay(ms = 80) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ------------------------------------------------------------------------
     STUDENTS API
     ------------------------------------------------------------------------ */
  async getStudents(filters = {}) {
    await this.delay();
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];

    // Filter pending students out of public views unless explicitly requested by Admin
    if (!filters.includePending) {
      list = list.filter(s => s.status === "Active");
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.roll && s.roll.toLowerCase().includes(q)) ||
        (s.district && s.district.toLowerCase().includes(q)) ||
        (s.skills && s.skills.some(skill => skill.toLowerCase().includes(q)))
      );
    }

    if (filters.bloodGroup && filters.bloodGroup !== "All") {
      list = list.filter(s => s.bloodGroup === filters.bloodGroup);
    }

    if (filters.district && filters.district !== "All") {
      list = list.filter(s => s.district === filters.district);
    }

    if (filters.status && filters.status !== "All") {
      list = list.filter(s => s.status === filters.status);
    }

    if (filters.sort) {
      if (filters.sort === "roll-asc") {
        list.sort((a, b) => (a.roll || "").localeCompare(b.roll || ""));
      } else if (filters.sort === "roll-desc") {
        list.sort((a, b) => (b.roll || "").localeCompare(a.roll || ""));
      } else if (filters.sort === "name-asc") {
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      } else if (filters.sort === "name-desc") {
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      }
    }

    return list;
  }

  async getStudentById(id) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const student = list.find(s => s.id === id || s.roll === id);
    if (!student) throw new Error("Student not found");
    return student;
  }

  /* Self-Registration for New Students (Status: Pending Verification) */
  async registerStudent(studentData) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];

    const cleanName = (studentData.name || "").trim();
    const cleanRoll = (studentData.roll || studentData.studentId || "").trim();
    const cleanReg = (studentData.reg || "").trim();
    const cleanPhone = (studentData.phone || "").trim();
    const cleanEmail = (studentData.email || "").trim().toLowerCase();
    const cleanPassword = (studentData.password || "").trim();

    if (!cleanName) throw new Error("Please enter your full name.");
    if (!cleanRoll) throw new Error("Please enter your Student ID / Roll number.");
    if (!cleanReg) throw new Error("Please enter your University Registration Number.");
    if (!cleanPhone) throw new Error("Please enter your valid contact phone number.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw new Error("Please enter a valid university or personal email address.");
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error("Password must be at least 4 characters long.");
    }

    // Check uniqueness of Roll and Email
    const existingRoll = list.find(s => s.roll === cleanRoll);
    if (existingRoll) {
      const statusText = existingRoll.status === "Pending" ? "Pending Approval" : "Active";
      throw new Error(`Student ID ${cleanRoll} is already registered (${statusText}).`);
    }

    const existingEmail = list.find(s => s.email && s.email.toLowerCase() === cleanEmail);
    if (existingEmail) {
      throw new Error(`An account with email ${cleanEmail} is already registered.`);
    }

    const newStudent = {
      id: "std-" + Date.now(),
      roll: cleanRoll,
      studentId: cleanRoll,
      reg: cleanReg,
      name: cleanName,
      bloodGroup: studentData.bloodGroup || "B+",
      district: studentData.district || "Rajshahi",
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPassword, // Stored for login credential check
      role: "Member",
      avatar: studentData.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400",
      skills: ["Physics Honours", "Batch 147"],
      bio: "Student of Paradox-147, Department of Physics, Rajshahi College.",
      status: "Pending", // REQUIRES ADMIN / CR APPROVAL BEFORE LOGIN
      emailVerified: Boolean(studentData.emailVerified),
      verifiedVia: studentData.verifiedVia || "mail.paradox147@gmail.com",
      emailVerifiedAt: studentData.emailVerifiedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      creditsCompleted: 32,
      cgpa: 3.75
    };

    list.unshift(newStudent);
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    return newStudent;
  }

  /* Admin Action: Approve Student Verification Request */
  async approveStudent(idOrRoll) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const student = list.find(s => s.id === idOrRoll || s.roll === idOrRoll);
    if (!student) throw new Error("Student record not found");
    student.status = "Active";
    student.approvedAt = new Date().toISOString();
    student.approvedBy = "CR MD. KHAIRUL ISLAM NAHID";
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    return student;
  }

  /* Admin Action: Reject Student Verification Request */
  async rejectStudent(idOrRoll) {
    await this.delay();
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const student = list.find(s => s.id === idOrRoll || s.roll === idOrRoll);
    if (!student) throw new Error("Student record not found");
    student.status = "Rejected";
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    return student;
  }

  /* Password Reset via Official Email mail.paradox147@gmail.com */
  async resetStudentPassword(identifier, newPassword) {
    await this.delay();
    const cleanId = (identifier || "").trim().toLowerCase();
    const cleanPass = (newPassword || "").trim();
    if (!cleanPass || cleanPass.length < 4) {
      throw new Error("Password must be at least 4 characters long.");
    }

    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const student = list.find(s => 
      (s.roll && s.roll.toLowerCase() === cleanId) ||
      (s.studentId && s.studentId.toLowerCase() === cleanId) ||
      (s.email && s.email.toLowerCase() === cleanId)
    );

    if (!student) {
      throw new Error("No registered student account found with this Student ID or Email.");
    }

    student.password = cleanPass;
    student.passwordUpdatedAt = new Date().toISOString();
    student.passwordResetVia = "mail.paradox147@gmail.com";
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(list));

    // DUAL-ACCOUNT PASSWORD SYNC: Sync to linked admin account
    let admins = [];
    try { admins = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]"); } catch (e) {}
    const adminRecord = admins.find(a => 
      (a.email && a.email.toLowerCase() === student.email.toLowerCase()) ||
      (student.roll && a.roll && a.roll === student.roll)
    );
    if (adminRecord) {
      adminRecord.password = cleanPass;
      adminRecord.passwordUpdatedAt = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    }

    // If currently logged in user matches, update session
    const currentUser = this.getCurrentUser();
    if (currentUser && (currentUser.id === student.id || currentUser.roll === student.roll || (currentUser.email && currentUser.email.toLowerCase() === student.email.toLowerCase()))) {
      this.setCurrentUser({ ...currentUser, password: cleanPass });
    }

    return { success: true, message: "Password successfully updated via mail.paradox147@gmail.com", student };
  }

  async createStudent(studentData) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const cleanName = (studentData.name || "").trim();
    const cleanRoll = (studentData.roll || "").trim();
    const cleanReg = (studentData.reg || "").trim();
    const cleanPhone = (studentData.phone || "").trim();
    const cleanEmail = (studentData.email || "").trim().toLowerCase();

    if (!cleanName) throw new Error("Full name is required.");
    if (!cleanRoll) throw new Error("Student ID / Roll number is required.");
    if (!cleanReg) throw new Error("Registration number is required.");
    if (!cleanPhone) throw new Error("Phone number is required.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) throw new Error("Valid email address is required.");

    const newStudent = {
      id: "std-" + Date.now(),
      roll: cleanRoll,
      reg: cleanReg,
      name: cleanName,
      bloodGroup: studentData.bloodGroup || "O+",
      district: studentData.district || "Rajshahi",
      email: cleanEmail,
      phone: cleanPhone,
      fatherName: studentData.fatherName || "",
      motherName: studentData.motherName || "",
      dobOriginal: studentData.dobOriginal || "",
      dobCertificate: studentData.dobCertificate || "",
      role: studentData.role || "Member",
      avatar: studentData.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400",
      skills: Array.isArray(studentData.skills) ? studentData.skills : (studentData.skills ? studentData.skills.split(",").map(s => s.trim()) : ["Problem Solving"]),
      bio: studentData.bio || "Student of Paradox-147, Department of Physics, Rajshahi College.",
      github: studentData.github || "https://github.com",
      linkedin: studentData.linkedin || "https://linkedin.com",
      status: studentData.status || "Active",
      creditsCompleted: Number(studentData.creditsCompleted) || 112,
      cgpa: Number(studentData.cgpa) || 3.75
    };

    list.unshift(newStudent);
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    return newStudent;
  }

  async updateStudent(id, updateData) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const currentUser = this.getCurrentUser();

    // 1. Try finding by direct ID or roll
    let index = list.findIndex(s => s.id === id || s.roll === id);

    // 2. If not found, try matching against current logged in user roll or email
    if (index === -1 && currentUser) {
      index = list.findIndex(s => 
        (currentUser.roll && s.roll === currentUser.roll) ||
        (currentUser.email && s.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.name && s.name && s.name.toLowerCase() === currentUser.name.toLowerCase())
      );
    }

    // 3. If still not found, check if id is admin-01 or matches the CR MD. KHAIRUL ISLAM NAHID
    if (index === -1 && (id === "admin-01" || (currentUser && currentUser.role === "admin"))) {
      index = list.findIndex(s => s.id === "std-101" || s.roll === "2024227170");
    }

    if (updateData.skills && typeof updateData.skills === "string") {
      updateData.skills = updateData.skills.split(",").map(s => s.trim()).filter(Boolean);
    }

    let targetStudent;
    if (index !== -1) {
      list[index] = { ...list[index], ...updateData };
      targetStudent = list[index];
    } else {
      // If student was somehow not in list, create/append so update never fails
      targetStudent = {
        id: id || "std-" + Date.now(),
        roll: updateData.roll || (currentUser && currentUser.roll) || "2024227170",
        reg: updateData.reg || "24227106966",
        name: updateData.name || (currentUser && currentUser.name) || "Student",
        bloodGroup: updateData.bloodGroup || "B+",
        district: updateData.district || "Rajshahi",
        email: updateData.email || (currentUser && currentUser.email) || "iam.nahidkhan.bd@gmail.com",
        phone: updateData.phone || "+8801859445559",
        role: "Member",
        avatar: updateData.avatar || (currentUser && currentUser.avatar) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
        skills: Array.isArray(updateData.skills) ? updateData.skills : ["Theoretical Physics", "Web Architecture"],
        bio: updateData.bio || "Student of Paradox-147.",
        status: "Active",
        creditsCompleted: 32,
        cgpa: 3.95,
        ...updateData
      };
      list.unshift(targetStudent);
    }

    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(list));

    // Update current session user in storage
    if (currentUser) {
      const isSuper = this.isSuperiorAccount(currentUser) || this.isSuperiorAccount(targetStudent);
      const updatedUser = { 
        ...currentUser, 
        ...targetStudent,
        role: isSuper ? (currentUser.role && currentUser.role !== "Super Admin" ? currentUser.role : "Class Representative (CR) & Administrator") : (currentUser.role || targetStudent.role),
        isAdmin: isSuper ? true : Boolean(currentUser.isAdmin || targetStudent.isAdmin),
        isSuperAdmin: isSuper ? true : Boolean(currentUser.isSuperAdmin || targetStudent.isSuperAdmin)
      };
      this.setCurrentUser(updatedUser);
    }

    return targetStudent;
  }

  async deleteStudent(id) {
    await this.delay();
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const initialLen = list.length;
    list = list.filter(s => s.id !== id && s.roll !== id);
    if (list.length === initialLen) throw new Error("Student not found");
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    return { success: true, message: "Student record deleted successfully" };
  }

  /* ------------------------------------------------------------------------
     NOTICES API
     ------------------------------------------------------------------------ */
  async getNotices(filters = {}) {
    await this.delay();
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTICES)) || [];

    if (filters.category && filters.category !== "All") {
      list = list.filter(n => n.category.toLowerCase() === filters.category.toLowerCase());
    }

    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(n => 
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q)
      );
    }

    // Sort by urgent first, then date descending
    list.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return new Date(b.date) - new Date(a.date);
    });

    if (filters.limit) {
      list = list.slice(0, filters.limit);
    }

    return list;
  }

  async createNotice(noticeData) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTICES)) || [];
    const newNotice = {
      id: "not-" + Date.now(),
      title: noticeData.title,
      category: noticeData.category || "Academic",
      date: noticeData.date || new Date().toISOString().split("T")[0],
      urgent: Boolean(noticeData.urgent),
      author: noticeData.author || "Batch Representative / Department Office",
      description: noticeData.description,
      fileUrl: noticeData.fileUrl || "#",
      fileSize: noticeData.fileSize || "1.2 MB",
      fileName: noticeData.fileName || (noticeData.title.replace(/\s+/g, "_").slice(0, 30) + ".pdf")
    };

    list.unshift(newNotice);
    localStorage.setItem(this.STORAGE_KEYS.NOTICES, JSON.stringify(list));
    return newNotice;
  }

  async updateNotice(id, updateData) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTICES)) || [];
    const index = list.findIndex(n => n.id === id);
    if (index === -1) throw new Error("Notice record not found");
    list[index] = {
      ...list[index],
      ...updateData,
      urgent: Boolean(updateData.urgent !== undefined ? updateData.urgent : list[index].urgent)
    };
    localStorage.setItem(this.STORAGE_KEYS.NOTICES, JSON.stringify(list));
    return list[index];
  }

  async deleteNotice(id) {
    await this.delay();
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTICES)) || [];
    list = list.filter(n => n.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.NOTICES, JSON.stringify(list));
    return { success: true };
  }

  /* ------------------------------------------------------------------------
     GALLERY API & MEMORY APPROVAL PIPELINE (CUSTOM CATEGORIES & UP TO 50 IMAGES)
     ------------------------------------------------------------------------ */
  async getGalleryCategories() {
    await this.delay(30);
    let categories = [];
    try {
      categories = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CATEGORIES) || "[]");
    } catch {
      categories = [];
    }
    if (!Array.isArray(categories)) categories = [];

    // Fallback defaults
    const defaults = [
      "Orientation & Freshers",
      "Campus & Adda",
      "Study Tours & Picnic",
      "Tech Fest & Hackathons"
    ];
    defaults.forEach(d => {
      if (!categories.some(c => c.toLowerCase() === d.toLowerCase())) {
        categories.push(d);
      }
    });

    // Also scan existing gallery items for any custom categories
    let galleryItems = [];
    try {
      galleryItems = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY) || "[]");
    } catch {}

    galleryItems.forEach(item => {
      if (item.category && typeof item.category === "string") {
        const cleanCat = item.category.trim();
        if (cleanCat && !categories.some(c => c.toLowerCase() === cleanCat.toLowerCase())) {
          categories.push(cleanCat);
        }
      }
    });

    return categories;
  }

  async addGalleryCategory(name) {
    if (!name || typeof name !== "string") return null;
    const cleanName = name.trim();
    if (!cleanName) return null;

    let categories = await this.getGalleryCategories();
    if (!categories.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
      categories.push(cleanName);
      localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    }
    return cleanName;
  }

  async deleteGalleryCategory(name) {
    if (!name || typeof name !== "string") return false;
    const cleanName = name.trim().toLowerCase();
    let categories = [];
    try {
      categories = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CATEGORIES) || "[]");
    } catch {
      categories = [];
    }
    categories = categories.filter(c => c.toLowerCase() !== cleanName);
    localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    return true;
  }

  async getGallery(category = "All", includePending = false) {
    await this.delay();
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    if (!includePending) {
      list = list.filter(g => g.status === "Approved" || !g.status);
    }
    if (category && category !== "All") {
      list = list.filter(g => g.category && g.category.toLowerCase() === category.toLowerCase());
    }
    return list;
  }

  async submitMemory(memoryData, studentUser) {
    await this.delay();
    if (!studentUser) {
      throw new Error("Only registered students can upload a memory.");
    }

    // Multi-image parsing (up to 50 pictures)
    let images = [];
    if (Array.isArray(memoryData.images) && memoryData.images.length > 0) {
      images = memoryData.images.filter(img => typeof img === "string" && img.trim().length > 0);
    } else if (memoryData.image) {
      images = [memoryData.image];
    }

    if (images.length === 0) {
      throw new Error("At least one image file is required for memory upload.");
    }
    if (images.length > 50) {
      throw new Error("Maximum 50 pictures can be uploaded per memory.");
    }

    if (!memoryData.title || !memoryData.title.trim()) {
      throw new Error("Memory title/heading is required.");
    }

    // Auto-register custom category if new
    const categoryName = (memoryData.category || "Campus & Adda").trim();
    await this.addGalleryCategory(categoryName);

    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    const memoryId = "gal-" + Date.now();
    const primaryImage = images[0];

    const newMemory = {
      id: memoryId,
      title: memoryData.title.trim(),
      category: categoryName,
      date: memoryData.date || new Date().toISOString().split("T")[0],
      location: memoryData.location || "Rajshahi College Campus",
      image: primaryImage, // primary photo for backward compatibility
      images: images,      // full array of up to 50 photos
      photoCount: images.length,
      caption: memoryData.details || memoryData.caption || "",
      otherInfo: memoryData.otherInfo || "",
      submittedBy: {
        id: studentUser.id || "",
        name: studentUser.name || "Student",
        roll: studentUser.roll || "",
        email: studentUser.email || ""
      },
      status: "Pending",
      submittedAt: new Date().toISOString()
    };

    list.unshift(newMemory);
    localStorage.setItem(this.STORAGE_KEYS.GALLERY, JSON.stringify(list));

    // Notify Admins
    await this.addNotification({
      type: "memory_submission",
      title: "New Memory Awaiting Approval",
      message: `${newMemory.submittedBy.name} (Roll: ${newMemory.submittedBy.roll}) submitted "${newMemory.title}" with ${images.length} photo${images.length > 1 ? 's' : ''}`,
      referenceId: memoryId,
      referenceData: {
        memoryId: memoryId,
        title: newMemory.title,
        studentName: newMemory.submittedBy.name,
        roll: newMemory.submittedBy.roll,
        location: newMemory.location,
        image: newMemory.image,
        photoCount: images.length,
        submittedAt: newMemory.submittedAt
      }
    });

    return newMemory;
  }

  async approveMemory(memoryId, approver) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    const memory = list.find(m => m.id === memoryId);
    if (!memory) throw new Error("Memory not found");

    memory.status = "Approved";
    memory.approvedAt = new Date().toISOString();
    memory.approvedBy = approver ? (approver.name || approver.email || "Admin") : "Admin";
    localStorage.setItem(this.STORAGE_KEYS.GALLERY, JSON.stringify(list));

    await this.resolveNotification("memory_submission", memoryId);
    return memory;
  }

  async rejectMemory(memoryId, reason = "Not approved by admin") {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    const memory = list.find(m => m.id === memoryId);
    if (!memory) throw new Error("Memory not found");

    memory.status = "Rejected";
    memory.rejectionReason = reason;
    memory.rejectedAt = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEYS.GALLERY, JSON.stringify(list));

    await this.resolveNotification("memory_submission", memoryId);
    return memory;
  }

  async deleteMemory(memoryId) {
    await this.delay();
    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    list = list.filter(m => m.id !== memoryId);
    localStorage.setItem(this.STORAGE_KEYS.GALLERY, JSON.stringify(list));
    await this.resolveNotification("memory_submission", memoryId);
    return { success: true };
  }

  async getMemoryById(memoryId) {
    await this.delay(20);
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    return list.find(m => m.id === memoryId) || null;
  }

  async updateMemory(memoryId, updatedData) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    const index = list.findIndex(m => m.id === memoryId);
    if (index === -1) throw new Error("Memory not found");

    const memory = list[index];

    // Handle categories
    if (updatedData.category && typeof updatedData.category === "string") {
      const cleanCat = updatedData.category.trim();
      if (cleanCat) {
        memory.category = cleanCat;
        await this.addGalleryCategory(cleanCat);
      }
    }

    if (updatedData.title !== undefined) {
      const t = String(updatedData.title).trim();
      if (!t) throw new Error("Memory title is required");
      memory.title = t;
    }

    if (updatedData.date !== undefined) {
      memory.date = updatedData.date;
    }

    if (updatedData.location !== undefined) {
      memory.location = (updatedData.location || "").trim();
    }

    if (updatedData.caption !== undefined || updatedData.details !== undefined) {
      const c = updatedData.caption !== undefined ? updatedData.caption : updatedData.details;
      memory.caption = (c || "").trim();
    }

    if (updatedData.otherInfo !== undefined) {
      memory.otherInfo = (updatedData.otherInfo || "").trim();
    }

    // Handle images array (up to 50 photos)
    let images = null;
    if (Array.isArray(updatedData.images)) {
      images = updatedData.images.filter(img => typeof img === "string" && img.trim().length > 0);
    } else if (updatedData.image) {
      images = [updatedData.image];
    }

    if (images !== null) {
      if (images.length === 0) {
        throw new Error("At least one image is required for memory.");
      }
      if (images.length > 50) {
        throw new Error("Maximum 50 pictures can be uploaded per memory.");
      }
      memory.images = images;
      memory.image = images[0]; // primary photo
      memory.photoCount = images.length;
    }

    memory.updatedAt = new Date().toISOString();

    list[index] = memory;
    localStorage.setItem(this.STORAGE_KEYS.GALLERY, JSON.stringify(list));
    return memory;
  }

  async getPendingMemories() {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    return list.filter(m => m.status === "Pending");
  }

  async getStudentMemories(studentIdOrRoll) {
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];
    const clean = (studentIdOrRoll || "").toString().trim().toLowerCase();
    return list.filter(m => 
      m.submittedBy && (
        (m.submittedBy.id && m.submittedBy.id.toLowerCase() === clean) ||
        (m.submittedBy.roll && m.submittedBy.roll.toLowerCase() === clean)
      )
    );
  }

  async addMemory(memoryData) {
    // Backwards-compatible direct add for admins (with multi-image & custom category support)
    await this.delay();
    const list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.GALLERY)) || [];

    let images = [];
    if (Array.isArray(memoryData.images) && memoryData.images.length > 0) {
      images = memoryData.images.filter(img => typeof img === "string" && img.trim().length > 0);
    } else if (memoryData.image) {
      images = [memoryData.image];
    } else {
      images = ["https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800"];
    }

    if (images.length > 50) {
      throw new Error("Maximum 50 pictures can be uploaded per memory.");
    }

    const categoryName = (memoryData.category || "Campus & Adda").trim();
    await this.addGalleryCategory(categoryName);

    const primaryImage = images[0];

    const newMemory = {
      id: "gal-" + Date.now(),
      title: memoryData.title,
      category: categoryName,
      date: memoryData.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      location: memoryData.location || "Campus, Rajshahi University",
      image: primaryImage,
      images: images,
      photoCount: images.length,
      caption: memoryData.caption || memoryData.details || "A cherished moment from our Honours journey.",
      status: "Approved"
    };
    list.unshift(newMemory);
    localStorage.setItem(this.STORAGE_KEYS.GALLERY, JSON.stringify(list));
    return newMemory;
  }

  /* ------------------------------------------------------------------------
     ROUTINE & STATS API (FULL CRUD FOR ADMIN EDITING)
     ------------------------------------------------------------------------ */
  async getRoutine() {
    await this.delay();
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ROUTINE)) || SEED_DATA.routine;
  }

  async saveRoutine(routineList) {
    await this.delay();
    localStorage.setItem(this.STORAGE_KEYS.ROUTINE, JSON.stringify(routineList));
    return routineList;
  }

  async addRoutineSlot(dayName, slotData) {
    await this.delay();
    let routine = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ROUTINE)) || JSON.parse(JSON.stringify(SEED_DATA.routine));
    let dayObj = routine.find(d => d.day.toLowerCase() === dayName.toLowerCase());
    if (!dayObj) {
      dayObj = { day: dayName, slots: [] };
      routine.push(dayObj);
    }
    dayObj.slots.push({
      time: slotData.time || "10:00 AM - 11:30 AM",
      course: slotData.course || "PHY-401: Quantum Mechanics",
      room: slotData.room || "Room 304",
      teacher: slotData.teacher || "Department Faculty"
    });
    localStorage.setItem(this.STORAGE_KEYS.ROUTINE, JSON.stringify(routine));
    return routine;
  }

  async updateRoutineSlot(dayName, slotIndex, updatedSlot) {
    await this.delay();
    let routine = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ROUTINE)) || JSON.parse(JSON.stringify(SEED_DATA.routine));
    let dayObj = routine.find(d => d.day.toLowerCase() === dayName.toLowerCase());
    if (!dayObj || !dayObj.slots[slotIndex]) throw new Error("Routine slot not found");
    dayObj.slots[slotIndex] = { ...dayObj.slots[slotIndex], ...updatedSlot };
    localStorage.setItem(this.STORAGE_KEYS.ROUTINE, JSON.stringify(routine));
    return routine;
  }

  async deleteRoutineSlot(dayName, slotIndex) {
    await this.delay();
    let routine = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ROUTINE)) || JSON.parse(JSON.stringify(SEED_DATA.routine));
    let dayObj = routine.find(d => d.day.toLowerCase() === dayName.toLowerCase());
    if (!dayObj || !dayObj.slots[slotIndex]) throw new Error("Routine slot not found");
    dayObj.slots.splice(slotIndex, 1);
    localStorage.setItem(this.STORAGE_KEYS.ROUTINE, JSON.stringify(routine));
    return routine;
  }

  async getStats() {
    await this.delay();
    const students = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
    const notices = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTICES)) || [];
    const activeStudents = students.filter(s => s.status === "Active").length;
    const storedStats = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STATS)) || {};

    return {
      totalStudents: students.length,
      activeUsers: activeStudents,
      noticesPublished: notices.length,
      batchFund: storedStats.batchFund || "৳ 42,500",
      fundNote: storedStats.fundNote || "Treasury Healthy",
      creditsCompleted: storedStats.creditsCompleted || 116,
      totalCredits: storedStats.totalCredits || 160,
      currentCGPA: storedStats.currentCGPA || 3.84,
      upcomingExams: storedStats.upcomingExams !== undefined ? storedStats.upcomingExams : 3,
      examNote: storedStats.examNote || "Starts Oct 15, 2026",
      pendingDues: storedStats.pendingDues || "৳ 0 (Cleared)",
      ...storedStats,
      totalStudents: students.length,
      activeUsers: activeStudents,
      noticesPublished: notices.length
    };
  }

  async updateStats(newStats) {
    await this.delay();
    const current = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STATS)) || {};
    const updated = { ...current, ...newStats };
    localStorage.setItem(this.STORAGE_KEYS.STATS, JSON.stringify(updated));
    return updated;
  }

  /* ------------------------------------------------------------------------
     ROLE IDENTIFICATION & PERMISSION HELPERS
     ------------------------------------------------------------------------ */
  isSuperiorAccount(user) {
    if (!user) return false;
    const email = (user.email || "").trim().toLowerCase();
    const roll = (user.roll || "").trim();
    const id = (user.id || "").trim().toLowerCase();
    const studentId = (user.studentId || "").trim().toLowerCase();
    return (
      email === this.SUPER_ADMIN_EMAIL.toLowerCase() ||
      roll === "2024227170" ||
      id === "std-101" ||
      id === "admin-101" ||
      studentId === "std-101" ||
      user.isSuperAdmin === true
    );
  }

  isAdmin(user) {
    if (!user) return false;
    if (this.isSuperiorAccount(user)) return true;
    return Boolean(
      user.isAdmin === true || 
      user.role === "admin" || 
      user.role === "Super Admin" || 
      user.role === "Super Admin & CR" ||
      (typeof user.role === "string" && user.role.toLowerCase().includes("administrator"))
    );
  }

  isSuperAdmin(user) {
    if (!user) return false;
    if (this.isSuperiorAccount(user)) return true;
    return Boolean(user.isSuperAdmin === true);
  }

  /* ------------------------------------------------------------------------
     AUTHENTICATION & SESSION API
     ------------------------------------------------------------------------ */
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.AUTH_USER);
      if (!raw || raw === "null" || raw === "undefined") return null;
      const user = JSON.parse(raw);
      if (!user || typeof user !== "object") return null;
      if (!user.id && !user.roll && !user.email) return null;

      // Unconditionally heal and protect superior account
      if (this.isSuperiorAccount(user)) {
        let changed = false;
        if (user.isAdmin !== true) { user.isAdmin = true; changed = true; }
        if (user.isSuperAdmin !== true) { user.isSuperAdmin = true; changed = true; }
        if (changed) {
          localStorage.setItem(this.STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
        }
      }
      return user;
    } catch {
      return null;
    }
  }

  setCurrentUser(user) {
    if (user && this.isSuperiorAccount(user)) {
      user.isAdmin = true;
      user.isSuperAdmin = true;
    }
    localStorage.setItem(this.STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  }

  async login(credentials) {
    await this.delay(120);
    const { identifier, password, role } = credentials;

    if (!identifier || !password) {
      throw new Error("Please enter both Student ID / Email and password.");
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (role === "admin") {
      // Dynamic Admin Authentication: Check Admins List & Students with isAdmin flag
      const admins = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]");
      const students = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS) || "[]");

      const adminFound = admins.find(a => 
        (a.email && a.email.toLowerCase() === cleanId) || 
        (a.roll && a.roll.toLowerCase() === cleanId) ||
        (cleanId === "nahid" && a.isSuperAdmin)
      );

      const studentFound = students.find(s => 
        (s.email && s.email.toLowerCase() === cleanId) || 
        (s.roll && s.roll === identifier.trim())
      );

      const isNahidSuper = (cleanId === "nahid" || cleanId === "iam.nahidkhan.bd@gmail.com" || cleanId === "2024227170");

      let validPass = false;
      if (adminFound && adminFound.password && cleanPass === adminFound.password) {
        validPass = true;
      } else if (studentFound && studentFound.password && cleanPass === studentFound.password) {
        validPass = true;
      } else if (isNahidSuper && (cleanPass === "@NAHID_KHAN_2024227170" || cleanPass === "SecurePhysicsPassword2026")) {
        validPass = true;
      }

      const isAuthorized = adminFound || (studentFound && studentFound.isAdmin) || isNahidSuper;

      if (!isAuthorized || !validPass) {
        throw new Error("Access Denied: Invalid Administrator Credentials. This portal is strictly confidential and reserved for authorized Administrators.");
      }

      const isSuper = Boolean((adminFound && adminFound.isSuperAdmin) || isNahidSuper);

      const adminUser = {
        ...(studentFound || SEED_DATA.students[0]),
        role: isSuper ? (adminFound && adminFound.role !== "Super Admin" ? adminFound.role : "CR & Administrator") : (adminFound ? adminFound.role : "admin"),
        isAdmin: true,
        isSuperAdmin: isSuper,
        department: "Department of Physics",
        institution: "Rajshahi College, Rajshahi",
        batch: "Paradox-147 (147th Batch)"
      };
      this.setCurrentUser(adminUser);
      return adminUser;
    } else {
      // Student login
      const students = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS)) || [];
      const admins = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]");

      const found = students.find(s => 
        (s.email && s.email.toLowerCase() === cleanId) || 
        (s.roll && s.roll === identifier.trim()) ||
        (s.studentId && s.studentId === identifier.trim()) ||
        (cleanId === "nahid" && s.id === "std-101")
      );

      if (!found) {
        throw new Error("Student account not found for this Student ID/Roll or Email. If you are a new student, please click 'Sign Up and Student Verification' to register.");
      }

      // 1. APPROVAL GATE: Check student verification status
      if (found.status === "Pending") {
        throw new Error("Student Verification Pending: Your account request has been submitted and is awaiting approval by CR MD. KHAIRUL ISLAM NAHID. You can browse public information on the site in the meantime. Once approved, you can log in to your student dashboard.");
      }

      if (found.status === "Rejected") {
        throw new Error("Verification Rejected: Your student registration was not approved. Please contact Administrator CR MD. KHAIRUL ISLAM NAHID.");
      }

      // 2. DUAL-ACCOUNT PASSWORD CHECK: Check set student password, linked admin password, or Super Admin fallback
      const linkedAdmin = admins.find(a => 
        (a.email && a.email.toLowerCase() === cleanId) || 
        (a.roll && a.roll === identifier.trim()) ||
        (cleanId === "nahid" && a.isSuperAdmin)
      );
      const isNahidSuper = (cleanId === "nahid" || cleanId === "iam.nahidkhan.bd@gmail.com" || cleanId === "2024227170");

      let validPass = false;
      if (found.password && cleanPass === found.password) {
        validPass = true;
      } else if (linkedAdmin && linkedAdmin.password && cleanPass === linkedAdmin.password) {
        validPass = true;
      } else if (isNahidSuper && (cleanPass === "@NAHID_KHAN_2024227170" || cleanPass === "SecurePhysicsPassword2026")) {
        validPass = true;
      } else if (!found.password && cleanPass === "password123") {
        // Safe default fallback for pre-seeded student accounts
        validPass = true;
      }

      if (!validPass) {
        throw new Error("Incorrect password. Please verify your password and try again.");
      }

      const isUserAdmin = Boolean(found.isAdmin || linkedAdmin || isNahidSuper);
      const isUserSuper = Boolean((linkedAdmin && linkedAdmin.isSuperAdmin) || isNahidSuper);

      const studentUser = {
        id: found.id,
        name: found.name,
        roll: found.roll,
        reg: found.reg,
        email: found.email,
        phone: found.phone,
        bloodGroup: found.bloodGroup,
        district: found.district,
        role: isUserSuper ? (found.role && found.role !== "Super Admin" ? found.role : "Class Representative (CR) & Administrator") : (found.role || (isUserAdmin ? "admin" : "student")),
        isAdmin: isUserAdmin || isUserSuper,
        isSuperAdmin: isUserSuper,
        avatar: found.avatar,
        skills: found.skills,
        bio: found.bio,
        facebook: found.facebook,
        instagram: found.instagram,
        threads: found.threads,
        youtube: found.youtube,
        linkedin: found.linkedin,
        github: found.github,
        portfolio: found.portfolio,
        department: "Department of Physics",
        institution: "Rajshahi College, Rajshahi",
        batch: "Paradox-147 (147th Batch)"
      };

      this.setCurrentUser(studentUser);
      return studentUser;
    }
  }

  logout() {
    localStorage.removeItem(this.STORAGE_KEYS.AUTH_USER);
    sessionStorage.removeItem(this.STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem("paradox147_current_user");
    localStorage.removeItem("paradox147_current_user_v2");
    localStorage.removeItem("paradox147_current_user_v3");
    sessionStorage.clear();
  }

  /* ------------------------------------------------------------------------
     ADMIN & ROLE DELEGATION API
     Super Admin: iam.nahidkhan.bd@gmail.com
     ------------------------------------------------------------------------ */
  async getAdminsList() {
    await this.delay(50);
    try {
      const res = await fetch("http://localhost:5000/api/admin/list");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.admins)) {
          let existingAdmins = [];
          try {
            existingAdmins = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]");
          } catch (e) {}
          const mergedAdmins = data.admins.map(incoming => {
            const existing = existingAdmins.find(a => a.id === incoming.id || (a.email && incoming.email && a.email.toLowerCase() === incoming.email.toLowerCase()));
            if (existing && existing.password && !incoming.password) {
              return { ...incoming, password: existing.password };
            }
            return incoming;
          });
          localStorage.setItem(this.STORAGE_KEYS.ADMINS, JSON.stringify(mergedAdmins));
          if (Array.isArray(data.requests)) {
            localStorage.setItem(this.STORAGE_KEYS.ADMIN_REQUESTS, JSON.stringify(data.requests));
          }
          return mergedAdmins;
        }
      }
    } catch (e) {}

    let list = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]");
    if (!list || list.length === 0) {
      list = [
        {
          id: "admin-101",
          studentId: "std-101",
          roll: "2024227170",
          name: "MD. KHAIRUL ISLAM NAHID",
          email: this.SUPER_ADMIN_EMAIL,
          phone: "+8801859445559",
          role: "CR & Administrator",
          isSuperAdmin: true,
          status: "Active",
          addedAt: "2024-01-01T00:00:00.000Z"
        }
      ];
      localStorage.setItem(this.STORAGE_KEYS.ADMINS, JSON.stringify(list));
    }
    return list;
  }

  async getAdminRequests() {
    await this.delay(50);
    try {
      const res = await fetch("http://localhost:5000/api/admin/list");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.requests)) {
          localStorage.setItem(this.STORAGE_KEYS.ADMIN_REQUESTS, JSON.stringify(data.requests));
          return data.requests;
        }
      }
    } catch (e) {}

    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMIN_REQUESTS) || "[]");
  }

  /* Admin updates student's batch role to any custom designation */
  async updateStudentRole(idOrRoll, newRole) {
    await this.delay(80);
    const cleanRole = (newRole || "").trim();
    if (!cleanRole) throw new Error("Role title cannot be empty.");

    const students = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS) || "[]");
    const student = students.find(s => s.id === idOrRoll || s.roll === idOrRoll);
    if (!student) throw new Error("Student not found.");

    student.role = cleanRole;
    student.roleUpdatedAt = new Date().toISOString();
    localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    // Also sync to admins list if applicable
    const admins = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]");
    const admin = admins.find(a => 
      (student.email && a.email && a.email.toLowerCase() === student.email.toLowerCase()) || 
      (student.roll && a.roll === student.roll)
    );
    if (admin && !admin.isSuperAdmin) {
      admin.role = cleanRole;
      localStorage.setItem(this.STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    }

    // Try backend persistence
    try {
      fetch("http://localhost:5000/api/admin/student-role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, roll: student.roll, email: student.email, newRole: cleanRole })
      }).catch(() => {});
    } catch (e) {}

    return student;
  }

  /* Admin nominates someone to become an Admin (Awaits Super Admin Approval) */
  async nominateAdmin(studentData, note = "", nominatedBy = "Admin") {
    await this.delay(80);
    const cleanEmail = (studentData.email || "").trim().toLowerCase();
    const cleanRoll = (studentData.roll || "").trim();

    const admins = await this.getAdminsList();
    if (admins.some(a => (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) || (cleanRoll && a.roll === cleanRoll))) {
      throw new Error("This student is already an authorized Administrator.");
    }

    const requests = await this.getAdminRequests();
    const isPending = requests.find(r => 
      r.status === "Pending Super Admin Approval" && 
      ((cleanEmail && r.email && r.email.toLowerCase() === cleanEmail) || (cleanRoll && r.roll === cleanRoll))
    );
    if (isPending) {
      throw new Error("A nomination for this student is already pending Super Admin approval.");
    }

    const newReq = {
      id: "req-" + Date.now(),
      studentId: studentData.id || "",
      roll: cleanRoll,
      name: studentData.name || "Student",
      email: cleanEmail,
      nominatedBy: nominatedBy,
      note: (note || "Nominated for administrative role").trim(),
      status: "Pending Super Admin Approval",
      createdAt: new Date().toISOString()
    };

    requests.unshift(newReq);
    localStorage.setItem(this.STORAGE_KEYS.ADMIN_REQUESTS, JSON.stringify(requests));

    // Try backend
    try {
      const res = await fetch("http://localhost:5000/api/admin/nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReq)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {}

    return {
      success: true,
      message: `Nomination submitted for ${newReq.name}. Awaiting Super Admin approval.`,
      request: newReq
    };
  }

  /* Super Admin approves admin nomination */
  async approveAdminNomination(requestId, approverEmail) {
    await this.delay(80);
    const cleanApprover = (approverEmail || "").trim().toLowerCase();
    if (cleanApprover !== this.SUPER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error(`Unauthorized: Only Super Admin (${this.SUPER_ADMIN_EMAIL}) can approve new administrators.`);
    }

    // Try backend
    try {
      const res = await fetch("http://localhost:5000/api/admin/approve-nomination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, approverEmail: cleanApprover })
      });
      if (res.ok) {
        const data = await res.json();
        // Sync local caches
        await this.getAdminsList();
        return data;
      }
    } catch (e) {}

    // Offline / local fallback
    const requests = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMIN_REQUESTS) || "[]");
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error("Nomination request not found.");

    req.status = "Approved";
    req.approvedAt = new Date().toISOString();
    req.approvedBy = this.SUPER_ADMIN_EMAIL;
    localStorage.setItem(this.STORAGE_KEYS.ADMIN_REQUESTS, JSON.stringify(requests));

    // Add to students & admins in localStorage
    const students = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STUDENTS) || "[]");
    const student = students.find(s => (req.email && s.email && s.email.toLowerCase() === req.email.toLowerCase()) || (req.roll && s.roll === req.roll));
    if (student) {
      student.isAdmin = true;
      if (!student.role || student.role === "Member" || student.role === "Student") {
        student.role = "Batch Administrator";
      }
      localStorage.setItem(this.STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }

    const admins = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMINS) || "[]");
    if (!admins.some(a => (req.email && a.email && a.email.toLowerCase() === req.email.toLowerCase()) || (req.roll && a.roll === req.roll))) {
      admins.push({
        id: "admin-" + Date.now(),
        studentId: student ? student.id : req.studentId,
        roll: req.roll,
        name: req.name,
        email: req.email,
        role: "Administrator",
        isSuperAdmin: false,
        status: "Active",
        addedAt: new Date().toISOString(),
        password: student ? student.password : "@NAHID_KHAN_2024227170"
      });
      localStorage.setItem(this.STORAGE_KEYS.ADMINS, JSON.stringify(admins));
    }

    return { success: true, message: `Approved ${req.name} as Administrator!` };
  }

  /* Super Admin rejects admin nomination */
  async rejectAdminNomination(requestId, approverEmail, reason = "") {
    await this.delay(80);
    const cleanApprover = (approverEmail || "").trim().toLowerCase();
    if (cleanApprover !== this.SUPER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error(`Unauthorized: Only Super Admin (${this.SUPER_ADMIN_EMAIL}) can reject nominations.`);
    }

    try {
      const res = await fetch("http://localhost:5000/api/admin/reject-nomination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, approverEmail: cleanApprover, reason })
      });
      if (res.ok) {
        await this.getAdminRequests();
        return await res.json();
      }
    } catch (e) {}

    const requests = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ADMIN_REQUESTS) || "[]");
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error("Nomination request not found.");

    req.status = "Rejected";
    req.rejectedAt = new Date().toISOString();
    req.rejectedBy = this.SUPER_ADMIN_EMAIL;
    req.rejectionReason = (reason || "Declined by Super Admin").trim();
    localStorage.setItem(this.STORAGE_KEYS.ADMIN_REQUESTS, JSON.stringify(requests));

    return { success: true, message: `Nomination for ${req.name} was rejected.` };
  }

  /* ------------------------------------------------------------------------
     NOTIFICATIONS API
     ------------------------------------------------------------------------ */
  async getNotifications(unreadOnly = false) {
    await this.delay(50);
    let notifs = [];
    try {
      notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    } catch {
      notifs = [];
    }
    if (!Array.isArray(notifs)) notifs = [];
    notifs.forEach(n => {
      if (!n.category) {
        n.category = n.type === "contact_message" ? "contact" :
                     n.type === "memory_submission" ? "memory" : "system";
      }
    });
    if (unreadOnly) {
      notifs = notifs.filter(n => !n.isRead);
    }
    return notifs;
  }

  async addNotification(notifData) {
    let notifs = [];
    try {
      notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    } catch {
      notifs = [];
    }
    if (!Array.isArray(notifs)) notifs = [];

    const category = notifData.category || (
      notifData.type === "contact_message" ? "contact" :
      notifData.type === "memory_submission" ? "memory" : "system"
    );

    const newNotif = {
      id: "notif-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
      type: notifData.type || "general",
      category: category,
      title: notifData.title || "Notification",
      message: notifData.message || "",
      referenceId: notifData.referenceId || null,
      referenceData: notifData.referenceData || null,
      createdAt: new Date().toISOString(),
      isRead: false,
      isResolved: false
    };

    notifs.unshift(newNotif);
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    return newNotif;
  }

  async markNotificationRead(id) {
    let notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    const target = notifs.find(n => n.id === id);
    if (target) {
      target.isRead = true;
      localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    }
    return target;
  }

  async markNotificationUnread(id) {
    let notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    const target = notifs.find(n => n.id === id);
    if (target) {
      target.isRead = false;
      localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    }
    return target;
  }

  async getNotificationById(id) {
    const notifs = await this.getNotifications();
    return notifs.find(n => n.id === id) || null;
  }

  async markAllNotificationsRead() {
    let notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    notifs.forEach(n => { n.isRead = true; });
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    return notifs;
  }

  async resolveNotification(type, referenceId) {
    let notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    notifs.forEach(n => {
      if (n.type === type && (n.referenceId === referenceId || (n.referenceData && n.referenceData.memoryId === referenceId))) {
        n.isResolved = true;
        n.isRead = true;
      }
    });
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    return notifs;
  }

  async deleteNotification(id) {
    let notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    notifs = notifs.filter(n => n.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    return { success: true };
  }

  async clearAllNotifications(onlyRead = false) {
    let notifs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS) || "[]");
    if (onlyRead) {
      notifs = notifs.filter(n => !n.isRead);
    } else {
      notifs = [];
    }
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    return { success: true, remaining: notifs.length };
  }

  /* ------------------------------------------------------------------------
     SITE CONTENT CMS API (EDIT HOME, ABOUT, STUDENTS, GALLERY, NOTICE, CONTACTS)
     ------------------------------------------------------------------------ */
  async getSiteContent() {
    await this.delay(50);
    let content = null;
    try {
      content = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SITE_CONTENT));
    } catch {
      content = null;
    }
    if (!content) {
      this.initStorage();
      content = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SITE_CONTENT));
    }
    return content;
  }

  async updateSiteContent(section, sectionData) {
    await this.delay(80);
    let content = await this.getSiteContent() || {};
    content[section] = {
      ...(content[section] || {}),
      ...sectionData,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.STORAGE_KEYS.SITE_CONTENT, JSON.stringify(content));
    return content[section];
  }

  /* ------------------------------------------------------------------------
     CONTACT INQUIRIES & MESSAGES API
     ------------------------------------------------------------------------ */
  async getContactMessages() {
    await this.delay(40);
    let msgs = [];
    try {
      msgs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CONTACT_MESSAGES) || "[]");
    } catch {
      msgs = [];
    }
    return Array.isArray(msgs) ? msgs : [];
  }

  async submitContactMessage(data) {
    await this.delay(60);
    if (!data) throw new Error("Contact message payload is required.");

    const name = (data.name || "").trim();
    const email = (data.email || "").trim();
    const phone = (data.phone || "").trim();
    const subject = (data.subject || "").trim();
    const message = (data.message || "").trim();

    if (!name) throw new Error("Please enter your name.");
    if (!email) throw new Error("Please enter your email address or student roll.");
    if (!subject) throw new Error("Please enter a subject.");
    if (!message) throw new Error("Please enter your message.");

    const newMsg = {
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      name,
      email,
      phone,
      subject,
      message,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    let messages = [];
    try {
      messages = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CONTACT_MESSAGES) || "[]");
    } catch {
      messages = [];
    }
    if (!Array.isArray(messages)) messages = [];
    messages.unshift(newMsg);
    localStorage.setItem(this.STORAGE_KEYS.CONTACT_MESSAGES, JSON.stringify(messages));

    // Create immediate high-priority Notification for Administrator Dashboard
    const notif = await this.addNotification({
      type: "contact_message",
      title: `New Inquiry: ${newMsg.subject}`,
      message: `From ${newMsg.name} (${newMsg.email}): ${newMsg.message.length > 90 ? newMsg.message.slice(0, 90) + '...' : newMsg.message}`,
      referenceId: newMsg.id,
      referenceData: {
        messageId: newMsg.id,
        name: newMsg.name,
        email: newMsg.email,
        phone: newMsg.phone,
        subject: newMsg.subject,
        message: newMsg.message,
        submittedAt: newMsg.createdAt
      }
    });

    return {
      success: true,
      message: "Your message has been sent to the Class Representatives & Administrators.",
      messageId: newMsg.id,
      notificationId: notif.id,
      data: newMsg
    };
  }

  async markContactMessageRead(messageId) {
    let messages = await this.getContactMessages();
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      msg.isRead = true;
      localStorage.setItem(this.STORAGE_KEYS.CONTACT_MESSAGES, JSON.stringify(messages));
    }
    // Also mark any corresponding notification as read
    let notifs = await this.getNotifications();
    let notifUpdated = false;
    notifs.forEach(n => {
      if (n.type === "contact_message" && (n.referenceId === messageId || (n.referenceData && n.referenceData.messageId === messageId))) {
        n.isRead = true;
        notifUpdated = true;
      }
    });
    if (notifUpdated) {
      localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    }
    return { success: true };
  }
}

// Global API instance
window.api = new BatchApiService();
