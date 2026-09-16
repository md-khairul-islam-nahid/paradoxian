/* ==========================================================================
   PARADOXIAN '26 - DASHBOARD CONTROLLER (DUAL-VIEW INTERFACE)
   State Management Object, Role Switcher (Student View ⇄ Admin View),
   Profile Picture Uploader (Only Image Files: PNG, JPG, JPEG, IMG, WEBP),
   Profile Updates, Routine Table, Notice Publisher, & User Data Management
   ========================================================================== */

// Mock State Management Object
const dashboardState = {
  activeView: "student", // 'student' | 'admin'
  currentUser: null,
  stats: {},
  students: [],
  notices: [],
  routine: [],
  admins: [],
  adminRequests: [],
  notifications: [],
  contactMessages: [],
  pendingMemories: [],
  notifCategoryFilter: "all", // 'all' | 'contact' | 'memory' | 'system'
  notifStatusFilter: "all", // 'all' | 'unread' | 'read'
  activeNotifModalId: null,
  siteContent: null,
  currentTab: "overview", // 'overview' | 'profile' | 'routine' | 'notices' | 'memories' | 'cms' | 'users' | 'settings'
  cmsActiveSection: "home" // 'home' | 'about' | 'students' | 'gallery' | 'notice' | 'contacts'
};
window.dashboardState = dashboardState;

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
window.isUserAdminAccount = isUserAdminAccount;

function isStudentOwnRecord(currentUser, student) {
  if (!currentUser || !student) return false;
  const cId = String(currentUser.id || "").trim().toLowerCase();
  const cRoll = String(currentUser.roll || "").trim();
  const cEmail = String(currentUser.email || "").trim().toLowerCase();

  const sId = String(student.id || "").trim().toLowerCase();
  const sRoll = String(student.roll || "").trim();
  const sEmail = String(student.email || "").trim().toLowerCase();

  if (cId && (cId === sId || cId === sRoll)) return true;
  if (cRoll && (cRoll === sRoll || cRoll === sId)) return true;
  if (cEmail && sEmail && cEmail === sEmail) return true;
  return false;
}

function hasActiveAdminAccess(currentUser) {
  if (!currentUser) return false;
  const activeView = (window.dashboardState && window.dashboardState.activeView) || sessionStorage.getItem("paradox_active_view");
  if (activeView === "student") return false;

  return isUserAdminAccount(currentUser);
}

window.isStudentOwnRecord = isStudentOwnRecord;
window.hasActiveAdminAccess = hasActiveAdminAccess;

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

document.addEventListener("DOMContentLoaded", async () => {
  await initDashboard();
});

async function initDashboard() {
  // Check session with strict verification
  dashboardState.currentUser = window.api.getCurrentUser();
  if (!dashboardState.currentUser) {
    sessionStorage.setItem("auth_redirect_reason", "Authentication required. Please sign in to access the dashboard.");
    window.location.replace("login.html?redirect=dashboard");
    return;
  }

  // Unconditionally self-heal superior account if needed
  if (isUserAdminAccount(dashboardState.currentUser)) {
    dashboardState.currentUser.isAdmin = true;
    if (isUserSuperAdminAccount(dashboardState.currentUser)) {
      dashboardState.currentUser.isSuperAdmin = true;
    }
  }

  // Restore saved view or default appropriately:
  // Admins & Super Admins default to admin view unless student view was explicitly chosen in this session
  const savedView = sessionStorage.getItem("paradox_active_view");
  if (savedView === "admin" || savedView === "student") {
    dashboardState.activeView = (savedView === "admin" && !isUserAdminAccount(dashboardState.currentUser)) ? "student" : savedView;
  } else if (isUserAdminAccount(dashboardState.currentUser)) {
    dashboardState.activeView = "admin";
  } else {
    dashboardState.activeView = "student";
  }

  setupRoleSwitcher();
  setupSidebarNavigation();
  setupLogout();
  setupAllModalDismissals();
  setupAddStudentForm();
  setupEditStudentForm();
  setupPublishNoticeForm();
  setupEditNoticeForm();
  setupRoutineSlotForm();
  setupEditMetricsForm();
  await refreshDashboardData();
  renderDashboardUI();

  // Handle URL query parameters (e.g. ?tab=memories&edit=gal-xxx)
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const editMemParam = params.get("edit");
    if (tabParam) {
      dashboardState.currentTab = tabParam;
      const links = document.querySelectorAll(".dashboard-sidebar .sidebar-link[data-tab]");
      links.forEach(l => {
        if (l.getAttribute("data-tab") === tabParam) l.classList.add("active");
        else l.classList.remove("active");
      });
      renderDashboardUI();
    }
    if (editMemParam) {
      setTimeout(() => {
        if (typeof openEditGalleryMemoryModal === "function") {
          openEditGalleryMemoryModal(editMemParam);
        }
      }, 200);
    }
  } catch (e) {}
}

/* --------------------------------------------------------------------------
   STATE SYNCHRONIZATION
   -------------------------------------------------------------------------- */
async function refreshDashboardData() {
  try {
    dashboardState.stats = await window.api.getStats();
    // Include pending verification students for admin review
    dashboardState.students = await window.api.getStudents({ includePending: true });
    dashboardState.notices = await window.api.getNotices();
    dashboardState.routine = await window.api.getRoutine();
    
    // Load admin governance state
    if (window.api && typeof window.api.getAdminsList === "function") {
      dashboardState.admins = await window.api.getAdminsList();
    }
    if (window.api && typeof window.api.getAdminRequests === "function") {
      dashboardState.adminRequests = await window.api.getAdminRequests();
    }
    if (window.api && typeof window.api.getNotifications === "function") {
      dashboardState.notifications = await window.api.getNotifications();
      updateTopbarNotificationBadge();
    }
    if (window.api && typeof window.api.getPendingMemories === "function") {
      dashboardState.pendingMemories = await window.api.getPendingMemories();
    }
    if (window.api && typeof window.api.getSiteContent === "function") {
      dashboardState.siteContent = await window.api.getSiteContent();
    }
    if (window.api && typeof window.api.getContactMessages === "function") {
      dashboardState.contactMessages = await window.api.getContactMessages();
    }
  } catch (err) {
    console.error("Failed to load dashboard data:", err);
  }
}

/* --------------------------------------------------------------------------
   ROLE SWITCHER (CONFIDENTIAL: ONLY CR / ADMIN NAHID CAN ACCESS ADMIN VIEW)
   -------------------------------------------------------------------------- */
function setupRoleSwitcher() {
  const toggleStudentBtn = document.getElementById("toggle-role-student");
  const toggleAdminBtn = document.getElementById("toggle-role-admin");
  const roleSwitcherContainer = document.querySelector(".role-switcher-container");
  const userManagementSidebarItem = document.getElementById("sidebar-item-users");
  const sidebarUsersText = document.getElementById("sidebar-users-text");
  const roleDisplayBadge = document.getElementById("active-role-display-badge");
  const cmsSidebarItem = document.getElementById("sidebar-item-cms");
  const memoriesSidebarText = document.getElementById("sidebar-memories-text");

  const isUserAdmin = isUserAdminAccount(dashboardState.currentUser);

  // For ALL students (both regular students and Admin): Student Directory is ALWAYS accessible!
  if (userManagementSidebarItem) {
    userManagementSidebarItem.style.display = "flex";
  }

  const topbarRosterBtn = document.getElementById("topbar-download-roster-btn");

  // If logged in as normal student: completely hide admin toggles and keep Directory label
  if (!isUserAdmin) {
    if (roleSwitcherContainer) roleSwitcherContainer.style.display = "none";
    if (sidebarUsersText) sidebarUsersText.textContent = "Student Directory";
    if (topbarRosterBtn) topbarRosterBtn.style.display = "none";
    if (cmsSidebarItem) cmsSidebarItem.style.display = "none";
    if (memoriesSidebarText) memoriesSidebarText.textContent = "Contribute Memory";
    dashboardState.activeView = "student";
    return;
  }

  // Admin Nahid: Show view switcher and quick actions
  if (roleSwitcherContainer) roleSwitcherContainer.style.display = "flex";
  if (topbarRosterBtn) {
    topbarRosterBtn.style.display = (isUserAdmin && dashboardState.activeView === "admin") ? "inline-flex" : "none";
  }

  // Reflect active view on buttons, sidebar, and badges
  if (dashboardState.activeView === "admin") {
    toggleAdminBtn?.classList.add("active");
    toggleStudentBtn?.classList.remove("active");
    if (roleDisplayBadge) {
      roleDisplayBadge.textContent = "CR & Administrator (Nahid)";
      roleDisplayBadge.className = "badge badge-blood";
    }
    if (sidebarUsersText) sidebarUsersText.textContent = "User Management";
    if (cmsSidebarItem) cmsSidebarItem.style.display = "flex";
    if (memoriesSidebarText) memoriesSidebarText.textContent = "Gallery & Memories";
  } else {
    toggleStudentBtn?.classList.add("active");
    toggleAdminBtn?.classList.remove("active");
    if (roleDisplayBadge) {
      roleDisplayBadge.textContent = "Viewing as Student (CR Nahid)";
      roleDisplayBadge.className = "badge badge-gold";
    }
    if (sidebarUsersText) sidebarUsersText.textContent = "Student Directory";
    if (cmsSidebarItem) cmsSidebarItem.style.display = "none";
    if (memoriesSidebarText) memoriesSidebarText.textContent = "Contribute Memory";
    if (dashboardState.currentTab === "cms") {
      dashboardState.currentTab = "overview";
    }
  }

  if (toggleStudentBtn && toggleAdminBtn) {
    toggleStudentBtn.onclick = () => switchView("student");
    toggleAdminBtn.onclick = () => switchView("admin");
  }
}

function switchView(viewName) {
  const isUserAdmin = isUserAdminAccount(dashboardState.currentUser);

  if (viewName === "admin" && !isUserAdmin) {
    window.showToast("Access Denied: Only Administrator / CR has access to the Admin Dashboard.", "danger");
    dashboardState.activeView = "student";
    sessionStorage.setItem("paradox_active_view", "student");
    renderDashboardUI();
    return;
  }

  dashboardState.activeView = viewName;
  sessionStorage.setItem("paradox_active_view", viewName);

  const toggleStudentBtn = document.getElementById("toggle-role-student");
  const toggleAdminBtn = document.getElementById("toggle-role-admin");
  const roleDisplayBadge = document.getElementById("active-role-display-badge");
  const userManagementSidebarItem = document.getElementById("sidebar-item-users");
  const sidebarUsersText = document.getElementById("sidebar-users-text");
  const cmsSidebarItem = document.getElementById("sidebar-item-cms");
  const memoriesSidebarText = document.getElementById("sidebar-memories-text");

  if (viewName === "student") {
    toggleStudentBtn?.classList.add("active");
    toggleAdminBtn?.classList.remove("active");
    if (roleDisplayBadge) {
      roleDisplayBadge.textContent = isUserAdmin ? "Viewing as Student (CR Nahid)" : "Student";
      roleDisplayBadge.className = "badge badge-gold";
    }
    if (sidebarUsersText) sidebarUsersText.textContent = "Student Directory";
    if (cmsSidebarItem) cmsSidebarItem.style.display = "none";
    if (memoriesSidebarText) memoriesSidebarText.textContent = "Contribute Memory";
    if (dashboardState.currentTab === "cms") {
      dashboardState.currentTab = "overview";
    }
  } else {
    toggleAdminBtn?.classList.add("active");
    toggleStudentBtn?.classList.remove("active");
    if (roleDisplayBadge) {
      roleDisplayBadge.textContent = "CR & Administrator (Nahid)";
      roleDisplayBadge.className = "badge badge-blood";
    }
    if (sidebarUsersText) sidebarUsersText.textContent = "User Management";
    if (cmsSidebarItem) cmsSidebarItem.style.display = "flex";
    if (memoriesSidebarText) memoriesSidebarText.textContent = "Gallery & Memories";
  }

  // Keep Student Directory / User Management visible in both views
  if (userManagementSidebarItem) userManagementSidebarItem.style.display = "flex";

  // Toggle quick download roster button in topbar strictly for admin view
  const topbarRosterBtn = document.getElementById("topbar-download-roster-btn");
  if (topbarRosterBtn) {
    topbarRosterBtn.style.display = (isUserAdmin && viewName === "admin") ? "inline-flex" : "none";
  }

  window.showToast(`Switched to ${viewName === 'admin' ? 'Admin / CR Portal' : 'Student Dashboard'}`, "info");
  renderDashboardUI();
}

/* --------------------------------------------------------------------------
   SIDEBAR NAVIGATION
   -------------------------------------------------------------------------- */
function setupSidebarNavigation() {
  const links = document.querySelectorAll(".dashboard-sidebar .sidebar-link[data-tab]");
  links.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      dashboardState.currentTab = link.getAttribute("data-tab") || "overview";
      renderDashboardUI();
    });
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("dashboard-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.api.logout();
      window.showToast("Signed out successfully", "info");
      setTimeout(() => {
        window.location.replace("login.html");
      }, 300);
    });
  }
}

/* --------------------------------------------------------------------------
   MAIN UI ROUTER & RENDERER
   -------------------------------------------------------------------------- */
function renderDashboardUI() {
  updateSidebarUserInfo();

  // Sync active class on sidebar navigation links
  const links = document.querySelectorAll(".dashboard-sidebar .sidebar-link[data-tab]");
  links.forEach(link => {
    if (link.getAttribute("data-tab") === dashboardState.currentTab) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  const container = document.getElementById("dashboard-view-container");
  if (!container) return;

  // Render based on active sidebar tab
  if (dashboardState.currentTab === "profile") {
    renderProfileView(container);
    return;
  }
  if (dashboardState.currentTab === "routine") {
    renderRoutineView(container);
    return;
  }
  if (dashboardState.currentTab === "notices") {
    renderNoticesView(container);
    return;
  }
  if (dashboardState.currentTab === "users") {
    renderUsersView(container);
    return;
  }
  if (dashboardState.currentTab === "settings") {
    renderSettingsView(container);
    return;
  }
  if (dashboardState.currentTab === "memories") {
    renderMemoriesView(container);
    return;
  }
  if (dashboardState.currentTab === "cms") {
    renderCMSView(container);
    return;
  }

  // Default Overview
  if (dashboardState.activeView === "student") {
    renderStudentView(container);
  } else {
    renderAdminView(container);
  }
}

function updateSidebarUserInfo() {
  const user = dashboardState.currentUser;
  if (!user) return;

  const nameEl = document.getElementById("sidebar-username");
  const roleEl = document.getElementById("sidebar-userrole");
  const avatarEl = document.getElementById("sidebar-avatar-img");

  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = dashboardState.activeView === "admin" ? "CR & Administrator" : `Paradox-147 (${user.roll || 'Student'})`;
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;
}

/* --------------------------------------------------------------------------
   REUSABLE PROFILE FORM HTML & LOGIC (WITH STRICT IMAGE-ONLY UPLOADER)
   -------------------------------------------------------------------------- */
function generateProfileFormHTML(user, formId = "student-profile-form") {
  const avatarSrc = user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400";
  const skillsStr = Array.isArray(user.skills) ? user.skills.join(", ") : (user.skills || "React, Node.js, Python");

  return `
    <form id="${formId}">
      <!-- PROFILE PICTURE SECTION: ONLY ALLOWS IMAGE FILES -->
      <div class="form-group">
        <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
          <span>Profile Picture</span>
          <span class="badge badge-gold" style="font-size:0.75rem;">Only Image Files Allowed</span>
        </label>
        
        <div class="profile-picture-container">
          <div class="avatar-preview-wrapper">
            <img id="profile-preview-img" src="${avatarSrc}" alt="Avatar Preview" class="avatar-preview-img" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'">
          </div>

          <div class="avatar-upload-zone">
            <div class="avatar-upload-actions">
              <!-- Hidden file input strictly limited to image types only: png, jpg, jpeg, img, webp -->
              <input type="file" id="profile-file-input" accept="image/png, image/jpeg, image/jpg, image/webp, .png, .jpg, .jpeg, .img, .webp" style="display:none;">
              
              <button type="button" class="btn btn-sm btn-gold" id="btn-trigger-upload">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Upload Image File
              </button>

              <button type="button" class="btn btn-sm btn-ghost" id="btn-reset-photo" title="Reset to default picture" style="font-size:0.8rem;">
                Reset Default
              </button>
            </div>

            <div class="avatar-format-note">
              <span>Allowed image formats:</span>
              <span class="avatar-format-badge">.PNG</span>
              <span class="avatar-format-badge">.JPG</span>
              <span class="avatar-format-badge">.JPEG</span>
              <span class="avatar-format-badge">.IMG</span>
              <span class="avatar-format-badge">.WEBP</span>
              <span style="color:var(--slate-400);">(Max 5MB)</span>
            </div>

            <!-- Hidden holder for active base64 data -->
            <input type="hidden" id="profile-avatar-data" value="${user.avatar || ''}">
          </div>
        </div>
      </div>

      <!-- PERSONAL & ACADEMIC IDENTITY (MANDATORY VERIFICATION FIELDS) -->
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Full Name <span style="color:var(--danger-500);">*</span></label>
          <input type="text" id="profile-name" class="form-input" value="${user.name || ''}" placeholder="MD. KHAIRUL ISLAM NAHID" required>
        </div>
        <div class="form-group">
          <label class="form-label">Blood Group</label>
          <select id="profile-blood" class="form-select">
            ${["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => `
              <option value="${bg}" ${user.bloodGroup === bg ? 'selected' : ''}>${bg}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- MANDATORY PARENTAL DETAILS -->
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Father's Name <span style="color:var(--danger-500);">*</span></label>
          <input type="text" id="profile-father-name" class="form-input" value="${user.fatherName || ''}" placeholder="Enter Father's Name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Mother's Name <span style="color:var(--danger-500);">*</span></label>
          <input type="text" id="profile-mother-name" class="form-input" value="${user.motherName || ''}" placeholder="Enter Mother's Name" required>
        </div>
      </div>

      <!-- MANDATORY DATE OF BIRTH DETAILS -->
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Original Date of Birth <span style="color:var(--danger-500);">*</span></label>
          <input type="date" id="profile-dob-original" class="form-input" value="${user.dobOriginal || ''}" required>
          <span style="font-size:0.75rem; color:var(--slate-500); margin-top:0.25rem; display:block;">Actual / Real biological date of birth</span>
        </div>
        <div class="form-group">
          <label class="form-label">Certificate Date of Birth <span style="color:var(--danger-500);">*</span></label>
          <input type="date" id="profile-dob-certificate" class="form-input" value="${user.dobCertificate || ''}" required>
          <span style="font-size:0.75rem; color:var(--slate-500); margin-top:0.25rem; display:block;">Official date of birth on SSC / Board Certificates</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Student ID (Academic Roll) <span style="color:var(--danger-500);">*</span></label>
          <input type="text" id="profile-roll" class="form-input" value="${user.roll || '2024227170'}" placeholder="e.g. 2024227170" required>
        </div>
        <div class="form-group">
          <label class="form-label">Registration No. <span style="color:var(--danger-500);">*</span></label>
          <input type="text" id="profile-reg" class="form-input" value="${user.reg || '24227106966'}" placeholder="e.g. 24227106966" required>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone Number <span style="color:var(--danger-500);">*</span></label>
          <input type="tel" id="profile-phone" class="form-input" value="${user.phone || '+8801859445559'}" placeholder="+8801859445559" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email Address <span style="color:var(--danger-500);">*</span></label>
          <input type="email" id="profile-email" class="form-input" value="${user.email || 'iam.nahidkhan.bd@gmail.com'}" placeholder="iam.nahidkhan.bd@gmail.com" required>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Home District</label>
        <input type="text" id="profile-district" class="form-input" value="${user.district || 'Rajshahi'}" placeholder="Rajshahi">
      </div>

      <div class="form-group">
        <label class="form-label">Skills & Tech Stack (comma separated)</label>
        <input type="text" id="profile-skills" class="form-input" value="${skillsStr}">
      </div>

      <div class="form-group">
        <label class="form-label">Bio / Academic Aspirations</label>
        <textarea id="profile-bio" rows="3" class="form-textarea">${user.bio || "Honours Batch '147 Representative (CR) at Department of Physics, Rajshahi College. • We Live • We Laugh • We Conquer •"}</textarea>
      </div>

      <!-- SOCIAL HANDLES & WEB PRESENCE -->
      <div style="margin: 1.5rem 0 0.75rem 0; padding-top: 1rem; border-top: 1px solid var(--slate-200);">
        <h4 style="font-size: 0.98rem; color: var(--navy-900); margin-bottom: 0.35rem; display:flex; align-items:center; gap:0.5rem;">
          <span>🌐</span> Social Handles & Web Profiles
        </h4>
        <p style="font-size:0.8rem; color:var(--slate-500); margin:0 0 1rem 0;">Enter your profile handles (e.g. /username) or direct URLs.</p>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Facebook Handle / URL</label>
          <input type="text" id="profile-facebook" class="form-input" placeholder="/md.khairulislamnaheed or URL" value="${user.facebook || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Instagram Handle / URL</label>
          <input type="text" id="profile-instagram" class="form-input" placeholder="/md_khairul_islam_nahid or URL" value="${user.instagram || ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Threads Handle / URL</label>
          <input type="text" id="profile-threads" class="form-input" placeholder="/md_khairul_islam_nahid or URL" value="${user.threads || user.thread || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">YouTube Channel Handle / URL</label>
          <input type="text" id="profile-youtube" class="form-input" placeholder="/@md_khairul_islam_nahid or URL" value="${user.youtube || ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">LinkedIn Profile URL / Handle</label>
          <input type="text" id="profile-linkedin" class="form-input" placeholder="/-md-khairul-islam-nahid or URL" value="${user.linkedin || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">GitHub Profile URL / Handle</label>
          <input type="text" id="profile-github" class="form-input" placeholder="/md-khairul-islam-nahid or URL" value="${user.github || ''}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Portfolio Website URL</label>
        <input type="url" id="profile-portfolio" class="form-input" placeholder="https://nahid.page.gd" value="${user.portfolio || ''}">
      </div>

      <!-- PUBLIC DIRECTORY PRIVACY & VISIBILITY CONTROLS -->
      <div class="privacy-settings-box">
        <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom: 0.65rem;">
          <span style="font-size:1.2rem;">🛡️</span>
          <div>
            <h4 style="margin:0; font-size:0.95rem; color:var(--navy-900); font-weight:700;">Public Directory Privacy Controls</h4>
            <div style="font-size:0.75rem; color:var(--slate-500);">Customize what external visitors see on the Paradox-147 student directory</div>
          </div>
          <span class="badge badge-gold" style="font-size:0.7rem; margin-left:auto;">Privacy Controls</span>
        </div>

        <p style="font-size:0.83rem; color:var(--slate-600); margin:0 0 0.85rem 0; line-height:1.5;">
          Public visitors to the website can view your <strong>Name</strong>, <strong>Home District</strong>, <strong>Picture</strong>, and <strong>Email</strong>. Your Academic Roll number and Blood Group are protected and accessible only to verified students logged into the portal. You can choose whether to display or hide your phone number and social profiles publicly:
        </p>

        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          <label class="privacy-checkbox-label">
            <input type="checkbox" id="profile-show-phone" ${user.showPhonePublicly !== false ? 'checked' : ''} style="margin-top:0.2rem; width:17px; height:17px; accent-color:var(--gold-600); cursor:pointer;">
            <div>
              <div style="font-weight:600; color:var(--navy-900); font-size:0.88rem;">Show Phone Number in Public Directory</div>
              <div style="font-size:0.77rem; color:var(--slate-500);">When unchecked, your phone number will only be visible to logged-in students & CRs.</div>
            </div>
          </label>

          <label class="privacy-checkbox-label">
            <input type="checkbox" id="profile-show-socials" ${user.showSocialsPublicly !== false ? 'checked' : ''} style="margin-top:0.2rem; width:17px; height:17px; accent-color:var(--gold-600); cursor:pointer;">
            <div>
              <div style="font-weight:600; color:var(--navy-900); font-size:0.88rem;">Show Social Profiles (GitHub & LinkedIn) in Public Directory</div>
              <div style="font-size:0.77rem; color:var(--slate-500);">When unchecked, your social links will be hidden from the public and visible only after student login.</div>
            </div>
          </label>
        </div>
      </div>

      <button type="submit" class="btn btn-gold" id="btn-save-profile" style="width:100%; font-size:1rem; padding:0.85rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Save Profile Changes
      </button>
    </form>
  `;
}

function setupProfileFormListeners(formId = "student-profile-form") {
  const form = document.getElementById(formId);
  if (!form) return;

  const fileInput = form.querySelector("#profile-file-input");
  const btnTrigger = form.querySelector("#btn-trigger-upload");
  const previewImg = form.querySelector("#profile-preview-img");
  const avatarDataInput = form.querySelector("#profile-avatar-data");
  const btnReset = form.querySelector("#btn-reset-photo");

  // Trigger file browser on click
  if (btnTrigger && fileInput) {
    btnTrigger.addEventListener("click", () => fileInput.click());
  }

  // Strict image file upload validation
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check allowed extensions: png, jpg, jpeg, img, webp
      const allowedExts = ["png", "jpg", "jpeg", "img", "webp"];
      const fileNameParts = file.name.split(".");
      const fileExt = fileNameParts.length > 1 ? fileNameParts.pop().toLowerCase() : "";
      const isImageMime = file.type.startsWith("image/");

      if (!allowedExts.includes(fileExt) && !isImageMime) {
        window.showToast("Invalid file type! Only image files (.png, .jpg, .jpeg, .img, .webp) are allowed.", "danger", 4500);
        fileInput.value = "";
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        window.showToast("Image is too large! Please choose an image under 5MB.", "warning");
        fileInput.value = "";
        return;
      }

      // Read and compress via Canvas to 360x360 for fast performance and safe localStorage persistence
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 360;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h *= maxDim / w;
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w *= maxDim / h;
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);

          if (previewImg) previewImg.src = compressedDataUrl;
          if (avatarDataInput) avatarDataInput.value = compressedDataUrl;

          // Instant preview in sidebar too
          const sidebarAvatar = document.getElementById("sidebar-avatar-img");
          if (sidebarAvatar) sidebarAvatar.src = compressedDataUrl;

          window.showToast("Image ready! Click 'Save Profile Changes' to apply.", "info");
        };
        img.onerror = () => {
          window.showToast("Could not process image file. Please choose another image.", "danger");
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Reset to default photo
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      const defaultPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400";
      if (previewImg) previewImg.src = defaultPhoto;
      if (avatarDataInput) avatarDataInput.value = defaultPhoto;
      if (fileInput) fileInput.value = "";
      const sidebarAvatar = document.getElementById("sidebar-avatar-img");
      if (sidebarAvatar) sidebarAvatar.src = defaultPhoto;
      window.showToast("Reset to default photo. Click 'Save Profile Changes' to confirm.", "info");
    });
  }

  // Form submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("#profile-name").value.trim();
    const fatherName = form.querySelector("#profile-father-name")?.value.trim() || "";
    const motherName = form.querySelector("#profile-mother-name")?.value.trim() || "";
    const dobOriginal = form.querySelector("#profile-dob-original")?.value.trim() || "";
    const dobCertificate = form.querySelector("#profile-dob-certificate")?.value.trim() || "";
    const roll = form.querySelector("#profile-roll")?.value.trim() || dashboardState.currentUser.roll || "2024227170";
    const reg = form.querySelector("#profile-reg")?.value.trim() || dashboardState.currentUser.reg || "24227106966";
    const phone = form.querySelector("#profile-phone").value.trim();
    const email = form.querySelector("#profile-email")?.value.trim() || dashboardState.currentUser.email || "iam.nahidkhan.bd@gmail.com";
    const bloodGroup = form.querySelector("#profile-blood").value;
    const district = form.querySelector("#profile-district").value.trim();
    const skills = form.querySelector("#profile-skills").value.trim();
    const bio = form.querySelector("#profile-bio").value.trim();

    // Social Handles & Profiles
    const facebook = form.querySelector("#profile-facebook")?.value.trim() || "";
    const instagram = form.querySelector("#profile-instagram")?.value.trim() || "";
    const threads = form.querySelector("#profile-threads")?.value.trim() || "";
    const youtube = form.querySelector("#profile-youtube")?.value.trim() || "";
    const linkedin = form.querySelector("#profile-linkedin")?.value.trim() || "";
    const github = form.querySelector("#profile-github")?.value.trim() || "";
    const portfolio = form.querySelector("#profile-portfolio")?.value.trim() || "";
    
    // Privacy controls for public directory
    const showPhoneInput = form.querySelector("#profile-show-phone");
    const showSocialsInput = form.querySelector("#profile-show-socials");
    const showPhonePublicly = showPhoneInput ? showPhoneInput.checked : true;
    const showSocialsPublicly = showSocialsInput ? showSocialsInput.checked : true;

    const avatarData = form.querySelector("#profile-avatar-data")?.value.trim();
    const avatar = avatarData || dashboardState.currentUser.avatar;

    if (!name) {
      window.showToast("Please enter your full name.", "warning");
      form.querySelector("#profile-name")?.focus();
      return;
    }
    if (!fatherName) {
      window.showToast("Father's Name is mandatory. Please provide Father's Name.", "warning");
      form.querySelector("#profile-father-name")?.focus();
      return;
    }
    if (!motherName) {
      window.showToast("Mother's Name is mandatory. Please provide Mother's Name.", "warning");
      form.querySelector("#profile-mother-name")?.focus();
      return;
    }
    if (!dobOriginal) {
      window.showToast("Original Date of Birth is mandatory. Please select date.", "warning");
      form.querySelector("#profile-dob-original")?.focus();
      return;
    }
    if (!dobCertificate) {
      window.showToast("Certificate Date of Birth is mandatory. Please select date.", "warning");
      form.querySelector("#profile-dob-certificate")?.focus();
      return;
    }
    if (!roll) {
      window.showToast("Please enter your Student ID / Roll number.", "warning");
      return;
    }
    if (!reg) {
      window.showToast("Please enter your University Registration Number.", "warning");
      return;
    }
    if (!phone) {
      window.showToast("Please enter your valid contact Phone Number.", "warning");
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      window.showToast("Please enter a valid university or personal email address.", "warning");
      return;
    }

    const submitBtn = form.querySelector("#btn-save-profile");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Saving updates...</span>`;
    }

    try {
      const targetId = dashboardState.currentUser.id || dashboardState.currentUser.roll || "std-101";
      const updated = await window.api.updateStudent(targetId, {
        name,
        fatherName,
        motherName,
        dobOriginal,
        dobCertificate,
        roll,
        reg,
        phone,
        email,
        bloodGroup,
        district,
        avatar,
        skills,
        bio,
        facebook,
        instagram,
        threads,
        youtube,
        linkedin,
        github,
        portfolio,
        showPhonePublicly,
        showSocialsPublicly
      });

      dashboardState.currentUser = updated;
      updateSidebarUserInfo();

      // Refresh cached student list so directory reflects changes immediately
      dashboardState.students = await window.api.getStudents();

      window.showToast("Your profile was updated successfully!", "success");

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Profile Changes
        `;
      }
    } catch (err) {
      console.error("Profile update error:", err);
      window.showToast(err.message || "Failed to update profile", "danger");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Save Profile Changes`;
      }
    }
  });
}

/* --------------------------------------------------------------------------
   DEDICATED PROFILE VIEW (TAB: 'profile')
   -------------------------------------------------------------------------- */
function renderProfileView(container) {
  const user = dashboardState.currentUser;

  container.innerHTML = `
    <div style="max-width: 860px; margin: 0 auto;">
      <div class="card" style="margin-bottom: 2rem; background: linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 100%); color: var(--white); padding: 2rem;">
        <div class="flex-between flex-wrap gap-2">
          <div style="display:flex; align-items:center; gap:1.25rem;">
            <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}" alt="User Avatar" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid var(--gold-500);">
            <div>
              <h2 style="color:var(--white); font-size:1.6rem; margin:0 0 0.35rem 0;">${user.name}</h2>
              <div style="display:flex; gap:0.6rem; align-items:center;">
                <span class="badge badge-gold">${dashboardState.activeView === "admin" ? "CR & Admin" : "Student"}</span>
                <span style="font-size:0.85rem; color:var(--slate-300); font-family:monospace;">Roll: ${user.roll || '2024227170'}</span>
                <span class="badge badge-blood">${user.bloodGroup || 'B+'}</span>
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-gold" onclick="dashboardState.currentTab = 'overview'; renderDashboardUI();">
            ← Back to Overview
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 style="font-size:1.25rem;">Edit Profile & Academic Identity</h3>
          <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">
            Update your public profile photo (PNG, JPG, JPEG, IMG, WEBP), contact info, and skills.
          </p>
        </div>
        <div class="card-body">
          ${generateProfileFormHTML(user, "standalone-profile-form")}
        </div>
      </div>
    </div>
  `;

  setupProfileFormListeners("standalone-profile-form");
}

/* --------------------------------------------------------------------------
   STUDENT VIEW IMPLEMENTATION (TAB: 'overview')
   -------------------------------------------------------------------------- */
function renderStudentView(container) {
  const user = dashboardState.currentUser;

  container.innerHTML = `
    <!-- Official Academic Dual-Logo Header Banner -->
    <div class="official-header-banner">
      <img src="assets/images/rc-logo.png" alt="Rajshahi College" class="official-banner-logo" title="Rajshahi College (Est. 1873)">
      <div class="official-banner-center">
        <div class="official-banner-title">Department of Physics • Rajshahi College, Rajshahi</div>
        <div class="official-banner-batch">Paradox-147 — The 147th Honours Batch (Session 2024-25)</div>
        <div class="official-banner-tagline">• We Live • We Laugh • We Conquer •</div>
      </div>
      <img src="assets/images/batch-logo.png" alt="Paradox-147" class="official-banner-logo" title="Paradox-147 Official Batch Crest">
    </div>

    <!-- 1. Student Overview Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-info">
          <h4>Credits Completed</h4>
          <div class="metric-value">${user.creditsCompleted || 116} <span style="font-size:1.1rem; color:var(--slate-400);">/ 160</span></div>
          <span class="metric-badge badge badge-gold">72.5% Degree Progress</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Current CGPA</h4>
          <div class="metric-value">${user.cgpa || "3.88"}</div>
          <span class="metric-badge badge badge-success">Excellent Standing</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Upcoming Exams</h4>
          <div class="metric-value">3 <span style="font-size:1rem; color:var(--slate-400);">Modules</span></div>
          <span class="metric-badge badge badge-warning">Starts Oct 15, 2026</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Pending Batch Dues</h4>
          <div class="metric-value" style="color:var(--success-500);">৳ 0</div>
          <span class="metric-badge badge badge-success">All Dues Cleared</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>
    </div>

    <!-- 2. Dual Column Layout: Class Routine & Profile Editor -->
    <div style="display:grid; grid-template-columns: 1.05fr 1fr; gap: 2rem;" class="student-columns">
      
      <!-- Left Column: Class Routine -->
      <div class="card">
        <div class="card-header flex-between">
          <div>
            <h3 style="font-size:1.25rem;">Weekly Class Routine</h3>
            <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">8th Semester Final Year Timetable</p>
          </div>
          <span class="badge badge-gold">Active Session</span>
        </div>
        <div class="card-body">
          <div class="routine-grid" style="grid-template-columns:1fr;">
            ${(dashboardState.routine || []).slice(0, 3).map(daySchedule => `
              <div class="routine-day-card" style="margin-bottom:1rem;">
                <div class="routine-day-header">
                  <span>${daySchedule.day}</span>
                  <span style="font-size:0.75rem; font-weight:normal; opacity:0.8;">Dept. Science Complex</span>
                </div>
                <div>
                  ${daySchedule.slots.map(slot => `
                    <div class="routine-slot">
                      <div class="routine-time">${slot.time}</div>
                      <div class="routine-subject">${slot.course}</div>
                      <div class="routine-meta">
                        <span>📍 ${slot.room}</span>
                        <span>👨‍🏫 ${slot.teacher}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column: Profile Edit Form -->
      <div class="card">
        <div class="card-header flex-between" style="flex-wrap:wrap; gap:0.5rem;">
          <div>
            <h3 style="font-size:1.25rem;">My Profile Settings</h3>
            <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Update your official batch registry and profile details.</p>
          </div>
          <button type="button" class="btn btn-sm btn-outline-gold" onclick="downloadSingleStudentPDF('${user.id || user.roll}')" style="font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;" title="Download Official Student Dossier (PDF)">
            📄 Download Profile PDF
          </button>
        </div>
        <div class="card-body">
          ${generateProfileFormHTML(user, "student-profile-form")}
        </div>
      </div>

    </div>
  `;

  setupProfileFormListeners("student-profile-form");
}

/* --------------------------------------------------------------------------
   ADMIN VIEW IMPLEMENTATION (TAB: 'overview')
   -------------------------------------------------------------------------- */
function renderAdminView(container) {
  const stats = dashboardState.stats;

  container.innerHTML = `
    <!-- 1. Admin Overview Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-info">
          <h4>Total Students</h4>
          <div class="metric-value">${dashboardState.students.length}</div>
          <span class="metric-badge badge badge-navy">Paradox-147</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Active / Verified</h4>
          <div class="metric-value" style="color:var(--success-500);">
            ${dashboardState.students.filter(s => s.status === "Active").length}
          </div>
          <span class="metric-badge badge badge-success">Full Portal Access</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <h4>Notices Published</h4>
          <div class="metric-value">${dashboardState.notices.length}</div>
          <span class="metric-badge badge badge-gold">Official Circulars</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-info">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
            <h4 style="margin:0;">Batch Fund Balance</h4>
            <button type="button" class="btn btn-xs btn-outline-gold" onclick="openEditMetricsModal()" style="font-size:0.75rem; padding:0.15rem 0.5rem;" title="Edit Treasury & Metrics">✏️ Edit</button>
          </div>
          <div class="metric-value">${stats.batchFund || "৳ 42,500"}</div>
          <span class="metric-badge badge badge-gold">${stats.fundNote || "Treasury Healthy"}</span>
        </div>
        <div class="metric-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>
        </div>
      </div>
    </div>

    <!-- 2. Admin Actions Grid: Publish Notice Form, Manage Notices, & User Management Table -->
    <div style="display:flex; flex-direction:column; gap:2.5rem;">

      <!-- Publish Notice Form Card -->
      <div class="card">
        <div class="card-header flex-between">
          <div>
            <h3 style="font-size:1.25rem;">📢 Publish New Batch Announcement</h3>
            <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Instantly broadcast notices to students and the public notice board.</p>
          </div>
          <span class="badge badge-blood">CR & Admin Authorized</span>
        </div>
        <div class="card-body">
          <form id="admin-publish-notice-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Notice Headline / Title</label>
                <input type="text" id="admin-notice-title" class="form-input" placeholder="e.g. Schedule for Lab Test 2" required>
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select id="admin-notice-category" class="form-select">
                  <option value="Academic">Academic</option>
                  <option value="Exams">Exams & Routines</option>
                  <option value="Events">Events & Tours</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Effective Date</label>
                <input type="date" id="admin-notice-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
              </div>
              <div class="form-group">
                <label class="form-label">Official Document Attachment Name</label>
                <input type="text" id="admin-notice-filename" class="form-input" placeholder="e.g. Lab_Test_Schedule.pdf">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Detailed Notice Content</label>
              <textarea id="admin-notice-desc" rows="3" class="form-textarea" placeholder="Write the announcement description..." required></textarea>
            </div>

            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.9rem; font-weight:600; cursor:pointer;">
                <input type="checkbox" id="admin-notice-urgent" style="width:18px; height:18px;">
                Mark as High Priority / Urgent Notice (Shows Alert Badge)
              </label>

              <button type="submit" class="btn btn-navy">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Publish to Notice Board
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Published Notices Management Card (Full Edit & Delete for Admin) -->
      <div class="card">
        <div class="card-header flex-between flex-wrap gap-2">
          <div>
            <h3 style="font-size:1.25rem;">📢 Manage Published Notices (${(dashboardState.notices || []).length})</h3>
            <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Edit announcement headlines, dates, descriptions, or remove notices.</p>
          </div>
          <span class="badge badge-gold">Full Notice Editing</span>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Headline / Title</th>
                  <th>Category</th>
                  <th>Effective Date</th>
                  <th>Priority</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody id="admin-notice-table-body">
                ${(dashboardState.notices || []).length === 0 ? `
                  <tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--slate-400);">No notices published yet.</td></tr>
                ` : (dashboardState.notices || []).map(notice => `
                  <tr id="admin-notice-row-${notice.id}">
                    <td>
                      <div style="font-weight:700; color:var(--navy-900); font-size:0.92rem;">${escapeHtml(notice.title)}</div>
                      <div style="font-size:0.78rem; color:var(--slate-500); max-width:450px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:0.2rem;">
                        ${escapeHtml(notice.description)}
                      </div>
                    </td>
                    <td><span class="badge badge-navy">${notice.category}</span></td>
                    <td><span style="font-size:0.82rem; color:var(--slate-600);">${notice.date}</span></td>
                    <td>
                      ${notice.urgent ? '<span class="badge badge-blood">⚠️ Urgent</span>' : '<span class="badge badge-ghost">Standard</span>'}
                    </td>
                    <td style="text-align:right;">
                      <div style="display:inline-flex; gap:0.4rem;">
                        <button type="button" class="btn btn-sm btn-outline-gold" onclick="openEditNoticeModal('${notice.id}')" title="Edit Announcement Details">
                          ✏️ Edit
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteNoticeAdmin('${notice.id}')" title="Delete Announcement" style="padding:0.35rem 0.65rem;">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- User Management Data Table Card -->
      <div class="card">
        <div class="card-header flex-between flex-wrap gap-2">
          <div>
            <h3 style="font-size:1.25rem;">Student User Management</h3>
            <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Set custom student roles, download individual profiles, or manage records.</p>
          </div>
          <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm btn-outline-navy" onclick="openExportRosterModal()" style="font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;" title="Download Official Student Roster (PDF)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Roster (PDF)
            </button>
            <button class="btn btn-sm btn-gold" onclick="openAddStudentModal()">+ Add New Student</button>
          </div>
        </div>
        
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Student & Role</th>
                  <th>Roll / ID</th>
                  <th>Blood Group</th>
                  <th>District</th>
                  <th>Status</th>
                  <th style="text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody id="admin-student-table-body">
                ${renderStudentTableRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;

  setupPublishNoticeForm();
}

function renderStudentTableRows() {
  const activeAdmins = dashboardState.admins || [];
  return dashboardState.students.map(student => {
    const isStudentAdmin = student.isAdmin === true || 
      student.role === "admin" || 
      activeAdmins.some(a => a.email === student.email || a.roll === student.roll);

    return `
    <tr id="row-${student.id}">
      <td>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <img src="${student.avatar}" alt="${student.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'">
          <div>
            <div style="font-weight:700; color:var(--navy-900);">${student.name}</div>
            <div style="display:flex; align-items:center; gap:0.35rem; margin-top:0.15rem; flex-wrap:wrap;">
              <span class="badge ${student.role && student.role !== 'Member' && student.role !== 'Student' ? 'badge-gold' : 'badge-ghost'}" style="font-size:0.72rem; padding:0.1rem 0.45rem;">
                ${student.role || 'Member'}
              </span>
              ${isStudentAdmin ? '<span class="badge badge-blood" style="font-size:0.68rem; padding:0.1rem 0.35rem;">👑 Admin</span>' : ''}
            </div>
          </div>
        </div>
      </td>
      <td><code style="font-weight:600; color:var(--navy-800);">${student.roll}</code></td>
      <td><span class="badge badge-blood">${student.bloodGroup}</span></td>
      <td>${student.district || 'Rajshahi'}</td>
      <td>
        <span class="badge ${student.status === 'Active' ? 'badge-success' : 'badge-warning'}">
          ${student.status}
        </span>
      </td>
      <td style="text-align:right;">
        <div style="display:inline-flex; gap:0.35rem; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
          <button type="button" class="btn btn-sm btn-outline-gold" onclick="openStudentModal('${student.id}')" title="View Full Details">
            More Details
          </button>
          <button type="button" class="btn btn-sm btn-outline-navy" onclick="downloadSingleStudentPDF('${student.id}')" title="Download Official Student Dossier (PDF)" style="display:inline-flex; align-items:center; gap:0.25rem;">
            📄 Info PDF
          </button>
          <button type="button" class="btn btn-sm btn-outline-navy" onclick="openEditStudentModal('${student.id}')" title="Edit Student Profile & Role">
            ✏️ Edit
          </button>
          ${student.status !== 'Active' ? `
            <button type="button" class="btn btn-sm btn-gold" onclick="approveStudent('${student.id}')" title="Approve Registration">
              ✓ Approve
            </button>
          ` : ''}
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteStudentAdmin('${student.id}')" title="Delete Student Record" style="padding:0.35rem 0.65rem;">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

/* --------------------------------------------------------------------------
   CLASS ROUTINE VIEW (TAB: 'routine')
   -------------------------------------------------------------------------- */
function renderRoutineView(container) {
  const isAdmin = isUserAdminAccount(dashboardState.currentUser) && dashboardState.activeView === "admin";

  container.innerHTML = `
    <div style="max-width: 1000px; margin: 0 auto;">
      <div class="card" style="margin-bottom: 2rem; background: var(--navy-900); color: var(--white); padding: 2rem;">
        <div class="flex-between flex-wrap gap-2">
          <div>
            <span class="badge badge-gold" style="margin-bottom: 0.5rem;">Academic Schedule</span>
            <h2 style="color: var(--white); margin: 0 0 0.5rem 0;">Weekly Class Timetable</h2>
            <p style="color: var(--slate-300); margin: 0;">Department of Physics, Rajshahi College • Paradox-147 (Session 2024-25)</p>
          </div>
          <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
            ${isAdmin ? `
              <button class="btn btn-sm btn-gold" onclick="openAddRoutineModal()">
                + Add Class Slot
              </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-gold" onclick="window.print()">🖨️ Print Routine</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2" style="gap: 1.5rem;">
        ${(dashboardState.routine || []).map(daySchedule => `
          <div class="card" style="overflow:hidden;">
            <div class="routine-day-header" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span>📅 ${daySchedule.day}</span>
                <span style="font-size:0.8rem; font-weight:normal; opacity:0.85; margin-left:0.5rem;">Dept. Complex</span>
              </div>
              ${isAdmin ? `
                <button type="button" class="btn btn-xs btn-outline-gold" onclick="openAddRoutineModal('${daySchedule.day}')" style="font-size:0.75rem; padding:0.2rem 0.5rem; background:rgba(255,255,255,0.15);" title="Add slot to ${daySchedule.day}">
                  + Add Slot
                </button>
              ` : ''}
            </div>
            <div>
              ${(daySchedule.slots || []).length === 0 ? `
                <div style="padding:1.5rem; text-align:center; color:var(--slate-400); font-size:0.88rem;">No classes scheduled for ${daySchedule.day}.</div>
              ` : (daySchedule.slots || []).map((slot, sIdx) => `
                <div class="routine-slot" style="position:relative;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div class="routine-time">${slot.time}</div>
                    ${isAdmin ? `
                      <div style="display:inline-flex; gap:0.3rem; align-items:center;">
                        <button type="button" class="btn btn-xs btn-outline-gold" onclick="openEditRoutineModal('${daySchedule.day}', ${sIdx})" style="font-size:0.75rem; padding:0.2rem 0.45rem;" title="Edit this class slot">
                          ✏️ Edit
                        </button>
                        <button type="button" class="btn btn-xs btn-danger" onclick="deleteRoutineSlotHandler('${daySchedule.day}', ${sIdx})" style="font-size:0.75rem; padding:0.2rem 0.45rem;" title="Delete this slot">
                          🗑️
                        </button>
                      </div>
                    ` : ''}
                  </div>
                  <div class="routine-subject">${slot.course}</div>
                  <div class="routine-meta">
                    <span>📍 ${slot.room}</span>
                    <span>👨‍🏫 ${slot.teacher}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            ${isAdmin ? `
              <div style="padding:0.75rem 1rem; background:var(--slate-50); border-top:1px solid var(--slate-100); text-align:center;">
                <button type="button" class="btn btn-xs btn-ghost" onclick="openAddRoutineModal('${daySchedule.day}')" style="font-weight:600; color:var(--navy-800);">
                  + Add Another Slot to ${daySchedule.day}
                </button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   NOTICES & CIRCULARS VIEW (TAB: 'notices')
   -------------------------------------------------------------------------- */
function renderNoticesView(container) {
  const isAdmin = isUserAdminAccount(dashboardState.currentUser) && dashboardState.activeView === "admin";

  const notices = dashboardState.notices || [];

  container.innerHTML = `
    <div style="max-width: 1100px; margin: 0 auto;">
      <!-- Official Academic Dual-Logo Header Banner -->
      <div class="official-header-banner">
        <img src="assets/images/rc-logo.png" alt="Rajshahi College" class="official-banner-logo" title="Rajshahi College (Est. 1873)">
        <div class="official-banner-center">
          <div class="official-banner-title">Department of Physics • Rajshahi College, Rajshahi</div>
          <div class="official-banner-batch">Official Notices, Exam Alerts & Academic Circulars</div>
          <div class="official-banner-tagline">Paradox-147 — Session 2024-25 • • We Live • We Laugh • We Conquer •</div>
        </div>
        <img src="assets/images/batch-logo.png" alt="Paradox-147" class="official-banner-logo" title="Paradox-147 Official Batch Crest">
      </div>

      ${isAdmin ? `
        <div style="display:flex; justify-content:flex-end; margin-bottom: 1.25rem;">
          <button class="btn btn-sm btn-gold" onclick="document.getElementById('notice-broadcast-section')?.scrollIntoView({ behavior: 'smooth' })">
            📢 Broadcast New Notice
          </button>
        </div>
      ` : ''}

      ${isAdmin ? `
        <!-- Quick Broadcast Form (Admin) -->
        <div class="card" id="notice-broadcast-section" style="margin-bottom: 2rem;">
          <div class="card-header flex-between">
            <div>
              <h3 style="font-size:1.25rem;">📢 Broadcast New Batch Announcement</h3>
              <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Instantly post notices to both the student dashboard and public board.</p>
            </div>
            <span class="badge badge-blood">CR & Admin Authorized</span>
          </div>
          <div class="card-body">
            <form id="admin-publish-notice-form-tab">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Notice Headline / Title</label>
                  <input type="text" id="admin-notice-title-tab" class="form-input" placeholder="e.g. Schedule for Lab Test 2" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Category</label>
                  <select id="admin-notice-category-tab" class="form-select">
                    <option value="Academic">Academic</option>
                    <option value="Exams">Exams & Routines</option>
                    <option value="Events">Events & Tours</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Effective Date</label>
                  <input type="date" id="admin-notice-date-tab" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                  <label class="form-label">Document Attachment Name</label>
                  <input type="text" id="admin-notice-filename-tab" class="form-input" placeholder="e.g. Lab_Test_Schedule.pdf">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Detailed Notice Content</label>
                <textarea id="admin-notice-desc-tab" rows="3" class="form-textarea" placeholder="Write announcement description..." required></textarea>
              </div>

              <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.9rem; font-weight:600; cursor:pointer;">
                  <input type="checkbox" id="admin-notice-urgent-tab" style="width:18px; height:18px;">
                  Mark as High Priority / Urgent Notice
                </label>

                <button type="submit" class="btn btn-navy">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}

      <!-- Notices Cards List -->
      <div style="display:flex; flex-direction:column; gap:1.25rem; margin-bottom:3rem;">
        ${notices.length === 0 ? `
          <div class="card" style="text-align:center; padding:3rem 1.5rem;">
            <p style="color:var(--slate-400); margin:0;">No official announcements published yet.</p>
          </div>
        ` : notices.map(notice => `
          <div class="card notice-card-item" id="notice-item-${notice.id}" style="padding:1.5rem; ${notice.urgent ? 'border-left: 4px solid var(--danger-500);' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.75rem;">
              <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap;">
                <span class="badge ${notice.category === 'Academic' ? 'badge-navy' : notice.category === 'Exams' ? 'badge-blood' : 'badge-gold'}">
                  ${notice.category}
                </span>
                ${notice.urgent ? '<span class="badge badge-blood">⚠️ Urgent Alert</span>' : ''}
                <span style="font-size:0.82rem; color:var(--slate-500);">📅 ${notice.date}</span>
                <span style="font-size:0.82rem; color:var(--slate-400);">• ${notice.author || 'Department Administration'}</span>
              </div>

              ${isAdmin ? `
                <div style="display:inline-flex; gap:0.4rem;">
                  <button type="button" class="btn btn-sm btn-outline-gold" onclick="openEditNoticeModal('${notice.id}')" title="Edit Announcement">
                    ✏️ Edit
                  </button>
                  <button type="button" class="btn btn-sm btn-danger" onclick="deleteNoticeAdmin('${notice.id}')" title="Delete Announcement" style="padding:0.35rem 0.65rem;">
                    🗑️
                  </button>
                </div>
              ` : ''}
            </div>

            <h3 style="font-size:1.15rem; color:var(--navy-900); margin:0 0 0.65rem 0;">${escapeHtml(notice.title)}</h3>
            <p style="font-size:0.92rem; color:var(--slate-600); line-height:1.6; margin:0 0 1rem 0; white-space:pre-line;">
              ${escapeHtml(notice.description)}
            </p>

            ${notice.fileName ? `
              <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0.95rem; background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-sm); width:fit-content;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style="font-size:0.85rem; font-weight:600; color:var(--navy-800);">${escapeHtml(notice.fileName)}</span>
                <button type="button" class="btn btn-xs btn-ghost" onclick="window.showToast('Downloading ${escapeHtml(notice.fileName)}...', 'info')">
                  ⬇️ Download
                </button>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Attach listener if admin form is rendered
  const tabForm = document.getElementById("admin-publish-notice-form-tab");
  if (tabForm) {
    tabForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("admin-notice-title-tab").value.trim();
      const category = document.getElementById("admin-notice-category-tab").value;
      const date = document.getElementById("admin-notice-date-tab").value;
      const filename = document.getElementById("admin-notice-filename-tab").value.trim();
      const description = document.getElementById("admin-notice-desc-tab").value.trim();
      const urgent = document.getElementById("admin-notice-urgent-tab").checked;

      try {
        const newNotice = await window.api.createNotice({
          title,
          category,
          date,
          description,
          urgent,
          author: "Batch Representative (CR MD. KHAIRUL ISLAM NAHID)",
          fileName: filename || (title.replace(/\s+/g, "_") + ".pdf")
        });

        dashboardState.notices.unshift(newNotice);
        window.showToast("Notice broadcasted successfully to all students!", "success");
        tabForm.reset();
        renderDashboardUI();
      } catch (err) {
        window.showToast("Failed to publish notice", "danger");
      }
    });
  }
}

/* --------------------------------------------------------------------------
   STUDENT DIRECTORY & USER MANAGEMENT VIEW (TAB: 'users')
   All students can explore batchmates, search, filter by district & blood group,
   toggle between Card Grid & Roster Table, view social handles & More Details.
   -------------------------------------------------------------------------- */
const dashDirFilters = {
  search: "",
  district: "All",
  bloodGroup: "All",
  viewMode: "cards" // 'cards' | 'table'
};

function renderDashboardStudentCard(student, isAdmin) {
  const footerHTML = window.renderStudentCardFooterHTML 
    ? window.renderStudentCardFooterHTML(student, true)
    : (typeof renderStudentCardFooterHTML === "function" ? renderStudentCardFooterHTML(student, true) : "");

  const isOwnStudent = isStudentOwnRecord(dashboardState.currentUser, student);
  const isAdminActive = hasActiveAdminAccess(dashboardState.currentUser);

  return `
    <div class="card student-card" id="dash-card-${student.id}">
      <div class="student-card-header">
        <div class="student-avatar-wrapper">
          <img src="${student.avatar}" alt="${student.name}" class="student-avatar" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'">
          <span class="student-blood-badge" title="Blood Group: ${student.bloodGroup}">${student.bloodGroup}</span>
        </div>
        <h3 class="student-name">${student.name}</h3>
        <div class="student-id"><code style="font-weight:700; color:var(--navy-900);">Roll: ${student.roll}</code></div>
        <div class="student-district">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${student.district || 'Rajshahi'}
        </div>
      </div>

      <div class="student-card-body">
        <div style="margin-bottom:0.65rem; font-size:0.75rem; font-weight:700; color:var(--gold-600); text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
          <span>${student.role || 'Batch Member'}</span>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            ${student.status === 'Pending' ? '<span class="badge badge-warning" style="font-size:0.7rem;">Pending</span>' : ''}
            ${(isAdminActive || isOwnStudent) ? `
              <button type="button" class="btn btn-xs btn-outline-navy" onclick="downloadSingleStudentPDF('${student.id}')" style="font-size:0.72rem; padding:0.15rem 0.45rem;" title="Download Official Student Dossier (PDF)">📄 PDF</button>
            ` : ''}
            ${isAdminActive ? `
              <button type="button" class="btn btn-xs btn-outline-navy" onclick="openEditStudentModal('${student.id}')" style="font-size:0.72rem; padding:0.15rem 0.45rem;" title="Edit Student & Role">✏️ Edit</button>
            ` : ''}
          </div>
        </div>

        <div class="student-skills">
          ${(student.skills || []).slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
          ${(student.skills || []).length > 3 ? `<span class="skill-tag">+${student.skills.length - 3}</span>` : ''}
        </div>

        <p class="student-bio-snippet">${student.bio || 'Physics Honours undergraduate • Paradox-147.'}</p>
      </div>

      ${footerHTML}
    </div>
  `;
}

function renderDashboardStudentTableRow(student, isAdmin) {
  const activeAdmins = dashboardState.admins || [];
  const isStudentAdmin = student.isAdmin === true || 
    student.role === "admin" || 
    activeAdmins.some(a => a.email === student.email || a.roll === student.roll);
  const isOwnStudent = isStudentOwnRecord(dashboardState.currentUser, student);
  const isAdminActive = hasActiveAdminAccess(dashboardState.currentUser);

  return `
    <tr id="row-${student.id}">
      <td>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <img src="${student.avatar}" alt="${student.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'">
          <div>
            <div style="font-weight:700; color:var(--navy-900);">${student.name}</div>
            <div style="display:flex; align-items:center; gap:0.35rem; margin-top:0.15rem; flex-wrap:wrap;">
              <span class="badge ${student.role && student.role !== 'Member' && student.role !== 'Student' ? 'badge-gold' : 'badge-ghost'}" style="font-size:0.72rem; padding:0.1rem 0.45rem;">
                ${student.role || 'Member'}
              </span>
              ${isStudentAdmin ? '<span class="badge badge-blood" style="font-size:0.68rem; padding:0.1rem 0.35rem;">👑 Admin</span>' : ''}
            </div>
          </div>
        </div>
      </td>
      <td><code style="font-weight:600; color:var(--navy-800);">${student.roll}</code></td>
      <td><span class="badge badge-blood">${student.bloodGroup}</span></td>
      <td>${student.district || 'Rajshahi'}</td>
      <td>
        <span class="badge ${student.status === 'Active' ? 'badge-success' : 'badge-warning'}">
          ${student.status || 'Active'}
        </span>
      </td>
      <td style="text-align:right;">
        <div style="display:inline-flex; gap:0.35rem; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
          <button type="button" class="btn btn-sm btn-outline-gold" onclick="openStudentModal('${student.id}')" title="View Full Academic Profile">
            More Details
          </button>
          ${(isAdminActive || isOwnStudent) ? `
            <button type="button" class="btn btn-sm btn-outline-navy" onclick="downloadSingleStudentPDF('${student.id}')" title="Download Official Student Dossier (PDF)" style="display:inline-flex; align-items:center; gap:0.25rem;">
              📄 Info PDF
            </button>
          ` : ''}
          ${isAdminActive ? `
            <button type="button" class="btn btn-sm btn-outline-navy" onclick="openEditStudentModal('${student.id}')" title="Edit Student Profile & Custom Role">
              ✏️ Edit
            </button>
          ` : ''}
          ${isAdmin && student.status !== 'Active' ? `
            <button type="button" class="btn btn-sm btn-gold" onclick="approveStudent('${student.id}')" title="Approve Registration">
              ✓ Approve
            </button>
          ` : ''}
          ${isAdmin ? `
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteStudentAdmin('${student.id}')" title="Delete Student Record" style="padding:0.35rem 0.65rem;">
              🗑️
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

function renderUsersView(container) {
  const isAdmin = isUserAdminAccount(dashboardState.currentUser) && dashboardState.activeView === "admin";

  const pendingStudents = (dashboardState.students || []).filter(s => s.status === "Pending");
  const allStudents = dashboardState.students || [];

  // Unique districts for dropdown
  const uniqueDistricts = Array.from(
    new Set(allStudents.map(s => s.district).filter(Boolean))
  ).sort();

  // Filter list
  let filtered = allStudents;
  if (!isAdmin) {
    filtered = filtered.filter(s => s.status === "Active" || !s.status);
  }

  if (dashDirFilters.search.trim()) {
    const q = dashDirFilters.search.toLowerCase().trim();
    filtered = filtered.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.roll && s.roll.toLowerCase().includes(q)) ||
      (s.district && s.district.toLowerCase().includes(q)) ||
      (s.bloodGroup && s.bloodGroup.toLowerCase().includes(q)) ||
      (Array.isArray(s.skills) && s.skills.some(sk => sk.toLowerCase().includes(q)))
    );
  }

  if (dashDirFilters.district !== "All") {
    filtered = filtered.filter(s => s.district === dashDirFilters.district);
  }

  if (dashDirFilters.bloodGroup !== "All") {
    filtered = filtered.filter(s => s.bloodGroup === dashDirFilters.bloodGroup);
  }

  container.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto;">
      
      <!-- Official Academic Dual-Logo Header Banner -->
      <div class="official-header-banner">
        <img src="assets/images/rc-logo.png" alt="Rajshahi College" class="official-banner-logo" title="Rajshahi College (Est. 1873)">
        <div class="official-banner-center">
          <div class="official-banner-title">Department of Physics • Rajshahi College, Rajshahi</div>
          <div class="official-banner-batch">Paradox-147 — Student Directory & Academic Registry</div>
          <div class="official-banner-tagline">Session 2024-25 • • We Live • We Laugh • We Conquer •</div>
        </div>
        <img src="assets/images/batch-logo.png" alt="Paradox-147" class="official-banner-logo" title="Paradox-147 Official Batch Crest">
      </div>

      <!-- PENDING VERIFICATION REQUESTS (VISIBLE IN CR ADMIN VIEW) -->
      ${isAdmin && pendingStudents.length > 0 ? `
        <div class="card" style="margin-bottom: 2rem; border: 2px solid #F59E0B; background: linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%);">
          <div class="card-header flex-between flex-wrap gap-2" style="background: transparent; border-bottom: 1px solid #FCD34D;">
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:1.4rem;">⏳</span>
                <h3 style="font-size:1.25rem; color:#92400E; margin:0;">
                  Pending Student Verification Requests (${pendingStudents.length})
                </h3>
              </div>
              <p style="font-size:0.84rem; color:#B45309; margin:0.25rem 0 0 0;">
                These students have submitted verification requests and require your approval as CR & Admin before they can access the student dashboard.
              </p>
            </div>
          </div>
          <div class="card-body">
            <div style="display:flex; flex-direction:column; gap:0.85rem;">
              ${pendingStudents.map(p => `
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; padding:0.9rem 1.15rem; background:var(--white); border:1px solid #FCD34D; border-radius:var(--radius-md); box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                  <div style="display:flex; align-items:center; gap:0.85rem;">
                    <img src="${p.avatar}" alt="${p.name}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid #F59E0B;" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'">
                    <div>
                      <div style="font-weight:700; color:var(--navy-900); font-size:1rem;">${p.name}</div>
                      <div style="font-size:0.82rem; color:var(--slate-600); display:flex; gap:0.85rem; flex-wrap:wrap; margin-top:0.15rem;">
                        <span>Student ID: <code style="font-weight:700; color:var(--navy-800);">${p.roll}</code></span>
                        <span>Email: <strong>${p.email}</strong></span>
                        <span>District: <strong>${p.district || 'Rajshahi'}</strong></span>
                        <span>Blood: <strong style="color:var(--danger-600);">${p.bloodGroup || 'B+'}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <button class="btn btn-sm btn-gold" onclick="approveStudent('${p.id}')" style="font-weight:700; padding:0.45rem 0.95rem;">
                      ✓ Approve Student
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudentAdmin('${p.id}')" style="padding:0.45rem 0.75rem;" title="Reject Request">
                      ✕ Reject
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- DIRECTORY CONTROLS & FILTER TOOLBAR -->
      <div class="card" style="margin-bottom: 2rem; padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <h3 style="font-size: 1.35rem; color: var(--navy-900); margin: 0 0 0.25rem 0; display: flex; align-items: center; gap: 0.5rem;">
              <span>🎓</span> ${isAdmin ? "Student User Registry & Directory" : "Paradox-147 Student Directory"}
            </h3>
            <p style="font-size: 0.85rem; color: var(--slate-500); margin: 0;">
              ${isAdmin ? "Manage active profiles, approve requests, and explore batchmates." : "Explore your batchmates, view verified academic details, social channels, and profiles."}
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            ${isAdmin ? `
              <button type="button" class="btn btn-sm btn-outline-navy" onclick="openExportRosterModal()" style="font-weight:700; display:inline-flex; align-items:center; gap:0.4rem;" title="Download Official Student Roster (PDF)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Roster (PDF)
              </button>
              <button class="btn btn-sm btn-gold" onclick="openAddStudentModal()">
                + Add New Student
              </button>
            ` : ''}

            <div style="display: inline-flex; background: var(--slate-100); padding: 3px; border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
              <button type="button" class="btn btn-xs ${dashDirFilters.viewMode === 'cards' ? 'btn-navy' : 'btn-ghost'}" id="dash-btn-view-cards" style="padding: 0.4rem 0.85rem; font-size: 0.82rem; font-weight: 600;" title="Card Grid View">
                ⊞ Cards
              </button>
              <button type="button" class="btn btn-xs ${dashDirFilters.viewMode === 'table' ? 'btn-navy' : 'btn-ghost'}" id="dash-btn-view-table" style="padding: 0.4rem 0.85rem; font-size: 0.82rem; font-weight: 600;" title="Table Roster View">
                ☰ Table
              </button>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr auto; gap: 0.85rem; align-items: center;" class="dash-filter-grid">
          <div>
            <input type="text" id="dash-dir-search" class="form-input" placeholder="Search by name, roll, district, blood group, skills..." value="${escapeHtml(dashDirFilters.search)}" style="padding: 0.6rem 0.95rem; font-size: 0.88rem;">
          </div>
          <div>
            <select id="dash-dir-district" class="form-select" style="padding: 0.6rem 0.95rem; font-size: 0.88rem;">
              <option value="All">All Districts</option>
              ${uniqueDistricts.map(d => `<option value="${d}" ${dashDirFilters.district === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div>
            <select id="dash-dir-blood" class="form-select" style="padding: 0.6rem 0.95rem; font-size: 0.88rem;">
              <option value="All">All Blood Groups</option>
              ${["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => `<option value="${bg}" ${dashDirFilters.bloodGroup === bg ? 'selected' : ''}>${bg}</option>`).join('')}
            </select>
          </div>
          <div>
            <button type="button" class="btn btn-outline-gold" id="dash-dir-reset-filters" style="padding: 0.6rem 1rem; font-size: 0.85rem; white-space: nowrap;">
              Reset Filters
            </button>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; font-size: 0.84rem; color: var(--slate-600); border-top: 1px solid var(--slate-100); padding-top: 0.75rem;">
          <span>Showing <strong>${filtered.length}</strong> of <strong>${allStudents.length}</strong> batchmates</span>
          ${dashDirFilters.search || dashDirFilters.district !== 'All' || dashDirFilters.bloodGroup !== 'All' ? '<span class="badge badge-gold" style="font-size:0.75rem;">Filters Active</span>' : '<span style="font-size:0.8rem; color:var(--slate-400);">All batch records unlocked for student view</span>'}
        </div>
      </div>

      <!-- MAIN CONTENT: CARDS VIEW OR TABLE VIEW -->
      ${dashDirFilters.viewMode === 'cards' ? `
        <div class="cards-grid" id="dash-student-cards-grid" style="grid-template-columns: repeat(auto-fill, minmax(295px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem;">
          ${filtered.length === 0 ? `
            <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--white); border-radius: var(--radius-lg); border: 1px dashed var(--slate-300);">
              <div style="font-size: 2.5rem; margin-bottom: 0.6rem;">🔍</div>
              <h4 style="color: var(--navy-900); margin-bottom: 0.35rem; font-size: 1.15rem;">No Batchmates Found</h4>
              <p style="font-size: 0.88rem; color: var(--slate-500); max-width: 420px; margin: 0 auto 1.25rem auto;">
                We couldn't find any students matching your current search criteria. Try modifying your keywords or clearing the district/blood filters.
              </p>
              <button class="btn btn-sm btn-outline-gold" onclick="document.getElementById('dash-dir-reset-filters')?.click()">Reset Filters</button>
            </div>
          ` : filtered.map(student => renderDashboardStudentCard(student, isAdmin)).join('')}
        </div>
      ` : `
        <div class="card" style="margin-bottom: 2.5rem;">
          <div class="card-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll / ID</th>
                    <th>Blood Group</th>
                    <th>District</th>
                    <th>Status</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="admin-student-table-body">
                  ${filtered.length === 0 ? `
                    <tr><td colspan="6" style="text-align:center; padding:2.5rem; color:var(--slate-500);">No students match your filter criteria.</td></tr>
                  ` : filtered.map(student => renderDashboardStudentTableRow(student, isAdmin)).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `}

    </div>
  `;

  // Attach Filter Listeners
  setupDashDirFilterListeners(container);
}

function setupDashDirFilterListeners(container) {
  const searchEl = document.getElementById("dash-dir-search");
  const districtEl = document.getElementById("dash-dir-district");
  const bloodEl = document.getElementById("dash-dir-blood");
  const resetBtn = document.getElementById("dash-dir-reset-filters");
  const cardsBtn = document.getElementById("dash-btn-view-cards");
  const tableBtn = document.getElementById("dash-btn-view-table");

  if (searchEl) {
    let searchDebounce;
    searchEl.addEventListener("input", (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        dashDirFilters.search = e.target.value;
        renderUsersView(container);
        const newSearch = document.getElementById("dash-dir-search");
        if (newSearch) {
          newSearch.focus();
          newSearch.selectionStart = newSearch.selectionEnd = newSearch.value.length;
        }
      }, 150);
    });
  }

  if (districtEl) {
    districtEl.addEventListener("change", (e) => {
      dashDirFilters.district = e.target.value;
      renderUsersView(container);
    });
  }

  if (bloodEl) {
    bloodEl.addEventListener("change", (e) => {
      dashDirFilters.bloodGroup = e.target.value;
      renderUsersView(container);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      dashDirFilters.search = "";
      dashDirFilters.district = "All";
      dashDirFilters.bloodGroup = "All";
      renderUsersView(container);
    });
  }

  if (cardsBtn) {
    cardsBtn.addEventListener("click", () => {
      dashDirFilters.viewMode = "cards";
      renderUsersView(container);
    });
  }

  if (tableBtn) {
    tableBtn.addEventListener("click", () => {
      dashDirFilters.viewMode = "table";
      renderUsersView(container);
    });
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* --------------------------------------------------------------------------
   SETTINGS VIEW (TAB: 'settings')
   -------------------------------------------------------------------------- */
function renderSettingsView(container) {
  container.innerHTML = `
    <div style="max-width: 720px; margin: 0 auto;">
      <div class="card" style="margin-bottom: 2rem;">
        <div class="card-header">
          <h3 style="font-size:1.25rem;">Portal Preferences & Diagnostics</h3>
          <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Configure local state and demo test controls.</p>
        </div>
        <div class="card-body" style="display:flex; flex-direction:column; gap:1.5rem;">
          <div style="padding:1.25rem; background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md);">
            <h4 style="margin-bottom:0.4rem;">Active Authentication Session</h4>
            <p style="font-size:0.85rem; color:var(--slate-600); margin-bottom:1rem;">
              Logged in as: <strong>${dashboardState.currentUser.name}</strong> (${dashboardState.currentUser.email})
            </p>
            <button class="btn btn-sm btn-navy" onclick="dashboardState.currentTab = 'profile'; renderDashboardUI();">
              Edit My Profile & Photo →
            </button>
          </div>

          <div style="padding:1.25rem; background:var(--gold-100); border:1px solid var(--gold-500); border-radius:var(--radius-md);">
            <h4 style="margin-bottom:0.4rem; color:var(--navy-950);">Reset Demonstration Data</h4>
            <p style="font-size:0.85rem; color:var(--navy-900); margin-bottom:1rem;">
              Reset all student records, notices, and memories back to original defaults.
            </p>
            <button class="btn btn-sm btn-danger" onclick="handleResetFactoryData()">
              Reset All Seed Data
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleResetFactoryData() {
  if (confirm("Reset all portal data back to original seed records?")) {
    window.api.resetData();
    window.showToast("All data reset to initial seeds!", "info");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  }
}

/* --------------------------------------------------------------------------
   ADMIN ACTION HANDLERS
   -------------------------------------------------------------------------- */
function setupPublishNoticeForm() {
  const form = document.getElementById("admin-publish-notice-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("admin-notice-title").value.trim();
    const category = document.getElementById("admin-notice-category").value;
    const date = document.getElementById("admin-notice-date").value;
    const filename = document.getElementById("admin-notice-filename").value.trim();
    const description = document.getElementById("admin-notice-desc").value.trim();
    const urgent = document.getElementById("admin-notice-urgent").checked;

    try {
      const newNotice = await window.api.createNotice({
        title,
        category,
        date,
        description,
        urgent,
        author: "Batch Representative (CR MD. KHAIRUL ISLAM NAHID)",
        fileName: filename || (title.replace(/\s+/g, "_") + ".pdf")
      });

      dashboardState.notices.unshift(newNotice);
      window.showToast("Notice broadcasted successfully to all students!", "success");
      form.reset();
      renderDashboardUI();
    } catch (err) {
      window.showToast("Failed to publish notice", "danger");
    }
  });
}

async function approveStudent(studentId) {
  try {
    const updated = await window.api.approveStudent(studentId);
    const student = dashboardState.students.find(s => s.id === studentId || s.roll === studentId);
    if (student) student.status = "Active";
    window.showToast(`Student ${updated.name} approved! They can now log in to the Student Dashboard.`, "success", 4000);
    renderDashboardUI();
  } catch (err) {
    window.showToast(err.message || "Could not approve student", "danger");
  }
}

async function deleteStudentAdmin(studentId) {
  const student = dashboardState.students.find(s => s.id === studentId || s.roll === studentId);
  const name = student ? student.name : "this student";

  if (!confirm(`Are you sure you want to permanently delete/reject ${name} from the batch directory?`)) {
    return;
  }

  try {
    await window.api.deleteStudent(studentId);
    dashboardState.students = dashboardState.students.filter(s => s.id !== studentId && s.roll !== studentId);
    window.showToast(`Student record for ${name} removed.`, "info");
    renderDashboardUI();
  } catch (err) {
    window.showToast("Failed to delete student", "danger");
  }
}

/* --------------------------------------------------------------------------
   ADD NEW STUDENT MODAL (ADMIN)
   -------------------------------------------------------------------------- */
function openAddStudentModal() {
  const modal = document.getElementById("add-student-modal");
  if (modal) modal.classList.add("active");
}

function closeAddStudentModal() {
  const modal = document.getElementById("add-student-modal");
  if (modal) modal.classList.remove("active");
}

function setupAddStudentForm() {
  const form = document.getElementById("add-student-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("#new-std-name").value.trim();
    const fatherName = form.querySelector("#new-std-father") ? form.querySelector("#new-std-father").value.trim() : "";
    const motherName = form.querySelector("#new-std-mother") ? form.querySelector("#new-std-mother").value.trim() : "";
    const dobOriginal = form.querySelector("#new-std-dob-orig") ? form.querySelector("#new-std-dob-orig").value.trim() : "";
    const dobCertificate = form.querySelector("#new-std-dob-cert") ? form.querySelector("#new-std-dob-cert").value.trim() : "";
    const roll = form.querySelector("#new-std-roll").value.trim();
    const reg = form.querySelector("#new-std-reg") ? form.querySelector("#new-std-reg").value.trim() : "";
    const phone = form.querySelector("#new-std-phone") ? form.querySelector("#new-std-phone").value.trim() : "";
    const email = form.querySelector("#new-std-email").value.trim();
    const bloodGroup = form.querySelector("#new-std-blood").value;
    const district = form.querySelector("#new-std-district").value.trim();
    const role = form.querySelector("#new-std-role").value;

    if (!name || !roll || !reg || !phone || !email) {
      window.showToast("All 5 primary fields (Name, Roll, Reg, Phone, Email) are mandatory.", "warning");
      return;
    }

    try {
      const created = await window.api.createStudent({
        name,
        fatherName: fatherName || "Md. Rafiqul Islam",
        motherName: motherName || "Mrs. Khadeja Begum",
        dobOriginal: dobOriginal || "2005-08-14",
        dobCertificate: dobCertificate || "2006-02-10",
        roll,
        reg,
        phone,
        email,
        bloodGroup,
        district: district || "Rajshahi",
        role,
        status: "Active"
      });

      dashboardState.students.unshift(created);
      window.showToast(`Student ${created.name} added to Batch Directory!`, "success");
      form.reset();
      closeAddStudentModal();
      const tbody = document.getElementById("admin-student-table-body");
      if (tbody) tbody.innerHTML = renderStudentTableRows();
    } catch (err) {
      window.showToast("Failed to register new student: " + (err.message || err), "danger");
    }
  });
}

// Global exposure
window.approveStudent = approveStudent;
window.deleteStudentAdmin = deleteStudentAdmin;
window.openAddStudentModal = openAddStudentModal;
window.closeAddStudentModal = closeAddStudentModal;
window.setupAddStudentForm = setupAddStudentForm;
window.handleResetFactoryData = handleResetFactoryData;

/* --------------------------------------------------------------------------
   ROUTINE SLOT MANAGEMENT MODAL (ADD / EDIT / DELETE)
   -------------------------------------------------------------------------- */
function openAddRoutineModal(defaultDay = "Sunday") {
  const modal = document.getElementById("routine-slot-modal");
  const form = document.getElementById("routine-slot-form");
  if (!modal || !form) return;

  const titleEl = document.getElementById("routine-modal-title");
  const dayOrigEl = document.getElementById("routine-slot-day-orig");
  const indexEl = document.getElementById("routine-slot-index");
  const dayEl = document.getElementById("routine-slot-day");

  if (titleEl) titleEl.textContent = "Add Class Routine Slot";
  if (dayOrigEl) dayOrigEl.value = "";
  if (indexEl) indexEl.value = "-1";
  if (dayEl && defaultDay) dayEl.value = defaultDay;

  form.reset();
  if (dayEl && defaultDay) dayEl.value = defaultDay;
  if (indexEl) indexEl.value = "-1";

  modal.classList.add("active");
}

function openEditRoutineModal(dayName, slotIndex) {
  const modal = document.getElementById("routine-slot-modal");
  if (!modal) return;

  const daySchedule = (dashboardState.routine || []).find(d => d.day === dayName);
  if (!daySchedule || !daySchedule.slots || !daySchedule.slots[slotIndex]) {
    window.showToast("Could not find requested routine slot", "danger");
    return;
  }

  const slot = daySchedule.slots[slotIndex];

  const titleEl = document.getElementById("routine-modal-title");
  const dayOrigEl = document.getElementById("routine-slot-day-orig");
  const indexEl = document.getElementById("routine-slot-index");
  const dayEl = document.getElementById("routine-slot-day");
  const timeEl = document.getElementById("routine-slot-time");
  const courseEl = document.getElementById("routine-slot-course");
  const roomEl = document.getElementById("routine-slot-room");
  const teacherEl = document.getElementById("routine-slot-teacher");

  if (titleEl) titleEl.textContent = `Edit Class Slot (${dayName})`;
  if (dayOrigEl) dayOrigEl.value = dayName;
  if (indexEl) indexEl.value = String(slotIndex);
  if (dayEl) dayEl.value = dayName;
  if (timeEl) timeEl.value = slot.time || "";
  if (courseEl) courseEl.value = slot.course || "";
  if (roomEl) roomEl.value = slot.room || "";
  if (teacherEl) teacherEl.value = slot.teacher || "";

  modal.classList.add("active");
}

function closeRoutineModal() {
  const modal = document.getElementById("routine-slot-modal");
  if (modal) modal.classList.remove("active");
}

function setupRoutineSlotForm() {
  const form = document.getElementById("routine-slot-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dayOrig = document.getElementById("routine-slot-day-orig").value;
    const slotIndex = parseInt(document.getElementById("routine-slot-index").value, 10);
    const day = document.getElementById("routine-slot-day").value;
    const time = document.getElementById("routine-slot-time").value.trim();
    const course = document.getElementById("routine-slot-course").value.trim();
    const room = document.getElementById("routine-slot-room").value.trim();
    const teacher = document.getElementById("routine-slot-teacher").value.trim();

    const slotData = { time, course, room, teacher };

    try {
      if (slotIndex >= 0 && dayOrig) {
        // Updating existing slot
        if (day === dayOrig) {
          await window.api.updateRoutineSlot(day, slotIndex, slotData);
        } else {
          // Changed day: delete from old day, add to new day
          await window.api.deleteRoutineSlot(dayOrig, slotIndex);
          await window.api.addRoutineSlot(day, slotData);
        }
        window.showToast("Class routine slot updated!", "success");
      } else {
        // Adding new slot
        await window.api.addRoutineSlot(day, slotData);
        window.showToast(`Class slot added to ${day}!`, "success");
      }

      dashboardState.routine = await window.api.getRoutine();
      closeRoutineModal();
      renderDashboardUI();
    } catch (err) {
      window.showToast("Failed to save routine slot: " + (err.message || err), "danger");
    }
  });
}

async function deleteRoutineSlotHandler(dayName, slotIndex) {
  if (!confirm(`Are you sure you want to delete this class slot from ${dayName}?`)) {
    return;
  }

  try {
    await window.api.deleteRoutineSlot(dayName, slotIndex);
    dashboardState.routine = await window.api.getRoutine();
    window.showToast(`Routine slot deleted from ${dayName}.`, "info");
    renderDashboardUI();
  } catch (err) {
    window.showToast("Failed to delete routine slot", "danger");
  }
}

/* --------------------------------------------------------------------------
   NOTICE EDIT & DELETE (ADMIN)
   -------------------------------------------------------------------------- */
function openEditNoticeModal(noticeId) {
  const notice = (dashboardState.notices || []).find(n => n.id === noticeId);
  if (!notice) {
    window.showToast("Notice not found", "danger");
    return;
  }

  const modal = document.getElementById("edit-notice-modal");
  if (!modal) return;

  document.getElementById("edit-notice-id").value = notice.id;
  document.getElementById("edit-notice-title").value = notice.title || "";
  document.getElementById("edit-notice-category").value = notice.category || "Academic";
  document.getElementById("edit-notice-date").value = notice.date || "";
  document.getElementById("edit-notice-filename").value = notice.fileName || "";
  document.getElementById("edit-notice-desc").value = notice.description || "";
  document.getElementById("edit-notice-urgent").checked = Boolean(notice.urgent);

  modal.classList.add("active");
}

function closeEditNoticeModal() {
  const modal = document.getElementById("edit-notice-modal");
  if (modal) modal.classList.remove("active");
}

function setupEditNoticeForm() {
  const form = document.getElementById("edit-notice-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-notice-id").value;
    const title = document.getElementById("edit-notice-title").value.trim();
    const category = document.getElementById("edit-notice-category").value;
    const date = document.getElementById("edit-notice-date").value;
    const fileName = document.getElementById("edit-notice-filename").value.trim();
    const description = document.getElementById("edit-notice-desc").value.trim();
    const urgent = document.getElementById("edit-notice-urgent").checked;

    try {
      const updated = await window.api.updateNotice(id, {
        title,
        category,
        date,
        fileName,
        description,
        urgent
      });

      const idx = dashboardState.notices.findIndex(n => n.id === id);
      if (idx !== -1) {
        dashboardState.notices[idx] = updated;
      }

      window.showToast("Notice updated successfully!", "success");
      closeEditNoticeModal();
      renderDashboardUI();
    } catch (err) {
      window.showToast("Failed to update notice: " + (err.message || err), "danger");
    }
  });
}

async function deleteNoticeAdmin(noticeId) {
  const notice = (dashboardState.notices || []).find(n => n.id === noticeId);
  const title = notice ? notice.title : "this notice";

  if (!confirm(`Are you sure you want to delete "${title}"?`)) {
    return;
  }

  try {
    await window.api.deleteNotice(noticeId);
    dashboardState.notices = dashboardState.notices.filter(n => n.id !== noticeId);
    window.showToast("Notice removed from notice board.", "info");
    renderDashboardUI();
  } catch (err) {
    window.showToast("Failed to delete notice", "danger");
  }
}

/* --------------------------------------------------------------------------
   STUDENT PROFILE EDIT (ADMIN FULL CONTROL)
   -------------------------------------------------------------------------- */
function openEditStudentModal(studentId) {
  const student = (dashboardState.students || []).find(s => s.id === studentId || s.roll === studentId);
  if (!student) {
    window.showToast("Student not found", "danger");
    return;
  }

  const modal = document.getElementById("edit-student-modal");
  if (!modal) return;

  const titleEl = document.getElementById("edit-student-title");
  if (titleEl) titleEl.textContent = `Edit Profile: ${student.name}`;

  document.getElementById("edit-student-id").value = student.id;
  document.getElementById("edit-std-name").value = student.name || "";
  document.getElementById("edit-std-father").value = student.fatherName || "";
  document.getElementById("edit-std-mother").value = student.motherName || "";
  document.getElementById("edit-std-dob-orig").value = student.dobOriginal || "";
  document.getElementById("edit-std-dob-cert").value = student.dobCertificate || "";
  document.getElementById("edit-std-role").value = student.role || "Member";
  document.getElementById("edit-std-roll").value = student.roll || "";
  document.getElementById("edit-std-reg").value = student.reg || "";
  document.getElementById("edit-std-blood").value = student.bloodGroup || "B+";
  document.getElementById("edit-std-district").value = student.district || "Rajshahi";
  document.getElementById("edit-std-email").value = student.email || "";
  document.getElementById("edit-std-phone").value = student.phone || "";
  document.getElementById("edit-std-status").value = student.status || "Active";
  document.getElementById("edit-std-skills").value = Array.isArray(student.skills) ? student.skills.join(", ") : (student.skills || "");
  document.getElementById("edit-std-bio").value = student.bio || "";

  modal.classList.add("active");
}

function closeEditStudentModal() {
  const modal = document.getElementById("edit-student-modal");
  if (modal) modal.classList.remove("active");
}

function setupEditStudentForm() {
  const form = document.getElementById("edit-student-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-student-id").value;
    const name = document.getElementById("edit-std-name").value.trim();
    const fatherName = document.getElementById("edit-std-father") ? document.getElementById("edit-std-father").value.trim() : "";
    const motherName = document.getElementById("edit-std-mother") ? document.getElementById("edit-std-mother").value.trim() : "";
    const dobOriginal = document.getElementById("edit-std-dob-orig") ? document.getElementById("edit-std-dob-orig").value.trim() : "";
    const dobCertificate = document.getElementById("edit-std-dob-cert") ? document.getElementById("edit-std-dob-cert").value.trim() : "";
    const role = document.getElementById("edit-std-role").value.trim() || "Member";
    const roll = document.getElementById("edit-std-roll").value.trim();
    const reg = document.getElementById("edit-std-reg").value.trim();
    const bloodGroup = document.getElementById("edit-std-blood").value;
    const district = document.getElementById("edit-std-district").value.trim();
    const email = document.getElementById("edit-std-email").value.trim();
    const phone = document.getElementById("edit-std-phone").value.trim();
    const status = document.getElementById("edit-std-status").value;
    const skillsRaw = document.getElementById("edit-std-skills").value.trim();
    const bio = document.getElementById("edit-std-bio").value.trim();

    const skills = skillsRaw ? skillsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

    if (!name || !roll || !reg || !phone || !email) {
      window.showToast("All 5 primary fields (Name, Roll, Reg, Phone, Email) are mandatory.", "warning");
      return;
    }

    try {
      const updated = await window.api.updateStudent(id, {
        name,
        fatherName,
        motherName,
        dobOriginal,
        dobCertificate,
        role,
        roll,
        reg,
        bloodGroup,
        district,
        email,
        phone,
        status,
        skills,
        bio
      });

      // Synchronize role across administration endpoints if available
      if (window.api && typeof window.api.updateStudentRole === "function") {
        try {
          await window.api.updateStudentRole(id, role);
        } catch (rErr) {
          console.warn("Direct role endpoint sync notice:", rErr);
        }
      }

      const idx = dashboardState.students.findIndex(s => s.id === id);
      if (idx !== -1) {
        dashboardState.students[idx] = { ...dashboardState.students[idx], ...updated };
      }

      // If updating current logged in user
      if (dashboardState.currentUser && (dashboardState.currentUser.id === id || dashboardState.currentUser.roll === roll)) {
        dashboardState.currentUser = { ...dashboardState.currentUser, ...updated };
      }

      window.showToast(`Updated student profile for ${name}! Role set to "${role}".`, "success");
      closeEditStudentModal();
      await refreshDashboardData();
      renderDashboardUI();
    } catch (err) {
      window.showToast("Failed to update student: " + (err.message || err), "danger");
    }
  });
}



/* --------------------------------------------------------------------------
   INDIVIDUAL STUDENT OFFICIAL DOSSIER PDF GENERATOR
   Generates a certified, official single-student academic dossier PDF.
   Features student profile picture, prominent certificate date of birth,
   parental identity details, and clean official university styling.
   -------------------------------------------------------------------------- */
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  try {
    const parts = String(dateStr).trim().split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

async function loadStudentAvatarForPdf(url) {
  if (!url) return null;
  if (url.startsWith("data:image")) {
    return url;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 240;
        canvas.height = img.naturalHeight || 280;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 2500);
    img.src = url;
  });
}

async function downloadSingleStudentPDF(studentId) {
  const currentUser = dashboardState.currentUser || (window.api && window.api.getCurrentUser ? window.api.getCurrentUser() : null);
  const student = (dashboardState.students || []).find(s => s.id === studentId || s.roll === studentId) ||
    (currentUser && (currentUser.id === studentId || currentUser.roll === studentId) ? currentUser : null);

  if (!student) {
    window.showToast("Student profile not found", "danger");
    return;
  }

  // Permission Check: A student can download their own individual info PDF, but not others. Admin has all access.
  const isUserAdmin = hasActiveAdminAccess(currentUser);
  const isOwnProfile = isStudentOwnRecord(currentUser, student);

  if (!isUserAdmin && !isOwnProfile) {
    window.showToast("Access Restricted: Students are only permitted to download their own individual dossier.", "warning", 4500);
    return;
  }

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    console.warn("jsPDF library unavailable, falling back to clean print preview.");
    printSingleStudentHTML(student);
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = 210;
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // 1. Header Banner: Deep Navy (#0f172a) with gold (#d4af37) line
    doc.setFillColor(15, 23, 42);
    doc.rect(14, 14, 182, 28, "F");

    doc.setFillColor(212, 175, 55);
    doc.rect(14, 42, 182, 1.5, "F");

    // Optional Institutional logos in header
    const brandLogos = window.BRAND_LOGOS;
    let textOffsetLeft = 20;
    if (brandLogos && brandLogos.rcLogoBase64) {
      try {
        doc.addImage(brandLogos.rcLogoBase64, "PNG", 16, 16, 23, 23);
        textOffsetLeft = 43;
      } catch (e) {}
    }
    if (brandLogos && brandLogos.batchLogoBase64) {
      try {
        doc.addImage(brandLogos.batchLogoBase64, "PNG", 169, 16, 23, 23);
      } catch (e) {}
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("DEPARTMENT OF PHYSICS • RAJSHAHI COLLEGE", textOffsetLeft, 23);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(212, 175, 55);
    doc.text("Paradox-147 — The 147th Honours Batch (Session 2024-25)", textOffsetLeft, 29);

    doc.setFontSize(7.8);
    doc.setTextColor(226, 232, 240);
    doc.text("OFFICIAL INDIVIDUAL STUDENT ACADEMIC DOSSIER", textOffsetLeft, 35);

    // Preload Avatar
    const avatarImgData = await loadStudentAvatarForPdf(student.avatar);

    // 2. Rounded Corner Rectangular Identity Box (Contains ONLY: Photo, Full Name, Registration No., Student ID)
    const cardX = 14;
    const cardY = 47.5;
    const cardW = 182;
    const cardH = 46;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.4);
    if (typeof doc.roundedRect === "function") {
      doc.roundedRect(cardX, cardY, cardW, cardH, 3.5, 3.5, "FD");
    } else {
      doc.rect(cardX, cardY, cardW, cardH, "FD");
    }

    // Left of Box: User Profile Picture (3:4 ratio: 28.5mm width x 38mm height)
    const photoX = cardX + 4;
    const photoY = cardY + 4;
    const photoW = 28.5;
    const photoH = 38;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(photoX, photoY, photoW, photoH, "FD");

    if (avatarImgData) {
      try {
        doc.addImage(avatarImgData, "JPEG", photoX, photoY, photoW, photoH);
      } catch (imgErr) {
        console.warn("Could not draw avatar into jsPDF:", imgErr);
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      const initials = (student.name || "S").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("");
      doc.text(initials, photoX + (photoW / 2), photoY + (photoH / 2) - 1, { align: "center" });
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("OFFICIAL PHOTO", photoX + (photoW / 2), photoY + (photoH / 2) + 5, { align: "center" });
    }

    // Right of Profile Picture: Full Name (upper size), Registration No. (bold), Student ID
    const textX = photoX + photoW + 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(15, 23, 42);
    const upperName = (student.name || "STUDENT NAME").toUpperCase();
    doc.text(upperName, textX, cardY + 13.5);

    // Subtle divider accent line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.35);
    doc.line(textX, cardY + 17.5, cardX + cardW - 8, cardY + 17.5);

    // Registration No (Bold)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text("University Registration No:", textX, cardY + 26);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(String(student.reg || "N/A"), textX + 48, cardY + 26);

    // Student ID
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Student ID (Academic Roll):", textX, cardY + 34.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(String(student.roll || "N/A"), textX + 48, cardY + 34.5);

    // 3. Serial Particulars Table (After the Box)
    // Serially: Father's Name, Mother's Name, Certificate DOB, Blood Group, Home Address, Contact Phone No, Email, Skills Section, Bio Section
    const tableStartY = cardY + cardH + 4;
    const certDobFormatted = formatDisplayDate(student.dobCertificate) || student.dobCertificate || "10 February 2006";

    const serialTableBody = [
      [
        { content: "Father's Name", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42], cellWidth: 50 } },
        { content: student.fatherName || "Md. Rafiqul Islam", styles: { fontStyle: "bold", textColor: [15, 23, 42] } }
      ],
      [
        { content: "Mother's Name", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        { content: student.motherName || "Mrs. Khadeja Begum", styles: { fontStyle: "bold", textColor: [15, 23, 42] } }
      ],
      [
        { content: "Certificate Date of Birth", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        { content: student.dobCertificate ? `${certDobFormatted} (${student.dobCertificate})` : "10 February 2006 (2006-02-10)", styles: { fontStyle: "bold", textColor: [180, 83, 9] } }
      ],
      [
        { content: "Blood Group", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        { content: student.bloodGroup || "N/A", styles: { fontStyle: "bold", textColor: [185, 28, 28] } }
      ],
      [
        { content: "Home Address", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        student.district ? `${student.district}, Bangladesh` : "Rajshahi, Bangladesh"
      ],
      [
        { content: "Contact Phone No", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        student.phone || "N/A"
      ],
      [
        { content: "Official Email", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        student.email || "N/A"
      ],
      [
        { content: "Skills Section", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        Array.isArray(student.skills) ? student.skills.join(", ") : (student.skills || "Physics Honours Curriculum")
      ],
      [
        { content: "Bio Section", styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
        student.bio || "Undergraduate Honours Scholar, Department of Physics, Rajshahi College."
      ]
    ];

    if (doc.autoTable) {
      doc.autoTable({
        startY: tableStartY,
        margin: { left: 14, right: 14 },
        body: serialTableBody,
        theme: "grid",
        styles: {
          fontSize: 8.4,
          cellPadding: 2.7,
          overflow: "linebreak",
          lineColor: [226, 232, 240],
          lineWidth: 0.2
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        }
      });
    }

    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 185) + 12;

    // 4. Verification & Certification Seal
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(14, finalY, 196, finalY);

    // Left info
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Official academic student dossier authorized from Paradox-147 Registry.", 14, finalY + 7);
    doc.text(`Issue Date: ${dateStr}  •  Department of Physics, Rajshahi College`, 14, finalY + 11);

    // Right signature block (personal administrator name removed as requested)
    const sigStartX = pageWidth - 14 - 68;
    const sigEndX = pageWidth - 14;
    const sigCenterX = (sigStartX + sigEndX) / 2;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(sigStartX, finalY + 14, sigEndX, finalY + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text("Class Representative & Administrator", sigCenterX, finalY + 19, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text("Department of Physics, Rajshahi College", sigCenterX, finalY + 23, { align: "center" });

    // File download
    const safeRoll = (student.roll || student.id || "student").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `Paradox147_Student_Dossier_${safeRoll}.pdf`;
    doc.save(fileName);

    window.showToast(`Official student dossier saved: ${fileName}`, "success", 4000);
  } catch (err) {
    console.error("Single student PDF error:", err);
    printSingleStudentHTML(student);
  }
}

function printSingleStudentHTML(student) {
  const currentUser = dashboardState.currentUser || (window.api && window.api.getCurrentUser ? window.api.getCurrentUser() : null);
  const isUserAdmin = hasActiveAdminAccess(currentUser);
  const isOwnProfile = isStudentOwnRecord(currentUser, student);

  if (!isUserAdmin && !isOwnProfile) {
    window.showToast("Access Restricted: Students are only permitted to download their own individual dossier.", "warning", 4500);
    return;
  }

  const printWin = window.open("", "_blank", "width=850,height=800");
  if (!printWin) {
    window.showToast("Please allow popups to preview/print the student dossier.", "warning");
    return;
  }

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const certDob = formatDisplayDate(student.dobCertificate) || student.dobCertificate || "10 February 2006";

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Academic Dossier - ${escapeHtml(student.name)} (${student.roll})</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 25px; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.5; }
        .header { background: #0f172a; color: white; padding: 20px; border-radius: 6px; border-bottom: 4px solid #d4af37; }
        .header h1 { margin: 0 0 5px 0; font-size: 18px; }
        .header h2 { margin: 0; font-size: 13px; color: #d4af37; font-weight: normal; }
        .identity-box { display: flex; align-items: center; gap: 20px; background: #f8fafc; border: 1.5px solid #d4af37; border-radius: 8px; padding: 16px 20px; margin-top: 18px; margin-bottom: 18px; box-sizing: border-box; }
        .photo-container { width: 105px; height: 140px; min-width: 105px; border-radius: 4px; overflow: hidden; border: 1px solid #cbd5e1; background: #f1f5f9; display: flex; align-items: center; justify-content: center; }
        .photo-container img { width: 100%; height: 100%; object-fit: cover; }
        .identity-details { flex: 1; }
        .identity-name { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 8px; }
        .identity-divider { height: 2px; width: 100%; background: #d4af37; margin-bottom: 12px; }
        .identity-row { font-size: 14px; margin-bottom: 6px; color: #334155; }
        .table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .table th, .table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
        .table th { background: #f8fafc; color: #334155; width: 34%; font-weight: 600; }
        .table td { color: #0f172a; }
        .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
        .signature { text-align: center; width: 220px; }
        .signature-line { border-top: 1px solid #0f172a; margin-bottom: 6px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:15px; display:flex; justify-content:flex-end;">
        <button onclick="window.print()" style="padding:8px 16px; background:#0f172a; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">🖨️ Print Dossier</button>
      </div>
      <div class="header">
        <h1>DEPARTMENT OF PHYSICS • RAJSHAHI COLLEGE</h1>
        <h2>Paradox-147 — The 147th Honours Batch (Session 2024-25)</h2>
        <div style="font-size:12px; color:#cbd5e1; margin-top:6px;">OFFICIAL INDIVIDUAL STUDENT ACADEMIC DOSSIER</div>
      </div>

      <!-- Rounded Corner Rectangular Box with Photo on Left, Full Name, Reg No, Student ID on Right -->
      <div class="identity-box">
        <div class="photo-container">
          <img src="${student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}" alt="${escapeHtml(student.name)}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'">
        </div>
        <div class="identity-details">
          <div class="identity-name">${escapeHtml(student.name)}</div>
          <div class="identity-divider"></div>
          <div class="identity-row"><strong style="color:#475569;">University Registration No:</strong> <strong style="color:#0f172a;">${escapeHtml(student.reg || 'N/A')}</strong></div>
          <div class="identity-row"><strong style="color:#475569;">Student ID (Academic Roll):</strong> <strong style="color:#0f172a;">${escapeHtml(student.roll || 'N/A')}</strong></div>
        </div>
      </div>

      <!-- Serial Particulars Table (After the Box) -->
      <table class="table">
        <tr><th>Father's Name</th><td><strong>${escapeHtml(student.fatherName || 'Md. Rafiqul Islam')}</strong></td></tr>
        <tr><th>Mother's Name</th><td><strong>${escapeHtml(student.motherName || 'Mrs. Khadeja Begum')}</strong></td></tr>
        <tr><th>Certificate Date of Birth</th><td><strong style="color:#b45309;">${escapeHtml(certDob)}</strong></td></tr>
        <tr><th>Blood Group</th><td><strong style="color:#b91c1c;">${escapeHtml(student.bloodGroup || 'N/A')}</strong></td></tr>
        <tr><th>Home Address</th><td>${escapeHtml(student.district ? `${student.district}, Bangladesh` : 'Rajshahi, Bangladesh')}</td></tr>
        <tr><th>Contact Phone No</th><td>${escapeHtml(student.phone || 'N/A')}</td></tr>
        <tr><th>Official Email</th><td>${escapeHtml(student.email || 'N/A')}</td></tr>
        <tr><th>Skills Section</th><td>${escapeHtml(Array.isArray(student.skills) ? student.skills.join(', ') : (student.skills || 'N/A'))}</td></tr>
        <tr><th>Bio Section</th><td>${escapeHtml(student.bio || 'Undergraduate Honours Scholar, Department of Physics, Rajshahi College.')}</td></tr>
      </table>

      <div class="footer">
        <div>
          <div>Official Academic Dossier • Department of Physics, Rajshahi College</div>
          <div>Issue Date: ${dateStr}</div>
        </div>
        <div class="signature">
          <div class="signature-line"></div>
          <div style="font-weight:600; color:#0f172a;">Class Representative & Administrator</div>
          <div>Department of Physics, Rajshahi College</div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWin.document.close();
}

/* --------------------------------------------------------------------------
   BATCH STATS & TREASURY MODAL (ADMIN)
   -------------------------------------------------------------------------- */
function openEditMetricsModal() {
  const modal = document.getElementById("edit-metrics-modal");
  if (!modal) return;

  const stats = dashboardState.stats || {};
  const fundEl = document.getElementById("edit-metric-fund");
  const noteEl = document.getElementById("edit-metric-fundnote");
  const creditsEl = document.getElementById("edit-metric-credits");
  const totalCreditsEl = document.getElementById("edit-metric-totalcredits");
  const examNoteEl = document.getElementById("edit-metric-examnote");

  if (fundEl) fundEl.value = stats.batchFund || "৳ 42,500";
  if (noteEl) noteEl.value = stats.fundNote || "Treasury Healthy";
  if (creditsEl) creditsEl.value = stats.creditsCompleted || 116;
  if (totalCreditsEl) totalCreditsEl.value = stats.totalCredits || 160;
  if (examNoteEl) examNoteEl.value = stats.examNote || "3 Modules • Starts Oct 15, 2026";

  modal.classList.add("active");
}

function closeEditMetricsModal() {
  const modal = document.getElementById("edit-metrics-modal");
  if (modal) modal.classList.remove("active");
}

function setupEditMetricsForm() {
  const form = document.getElementById("edit-metrics-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const batchFund = document.getElementById("edit-metric-fund").value.trim();
    const fundNote = document.getElementById("edit-metric-fundnote").value.trim();
    const creditsCompleted = parseInt(document.getElementById("edit-metric-credits").value, 10);
    const totalCredits = parseInt(document.getElementById("edit-metric-totalcredits").value, 10);
    const examNote = document.getElementById("edit-metric-examnote").value.trim();

    try {
      const updated = await window.api.updateStats({
        batchFund,
        fundNote,
        creditsCompleted,
        totalCredits,
        examNote
      });

      dashboardState.stats = updated;
      window.showToast("Batch fund & academic metrics updated successfully!", "success");
      closeEditMetricsModal();
      renderDashboardUI();
    } catch (err) {
      window.showToast("Failed to update batch metrics", "danger");
    }
  });
}

/* --------------------------------------------------------------------------
   UNIVERSAL MODAL DISMISSAL SETUP
   -------------------------------------------------------------------------- */
function setupAllModalDismissals() {
  // Backdrop click dismissal
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("active");
      }
    });
  });

  // ESC key dismissal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-backdrop.active").forEach(modal => {
        modal.classList.remove("active");
      });
    }
  });
}

// Window exposures
window.openEditStudentModal = openEditStudentModal;
window.closeEditStudentModal = closeEditStudentModal;
window.setupEditStudentForm = setupEditStudentForm;

window.openEditNoticeModal = openEditNoticeModal;
window.closeEditNoticeModal = closeEditNoticeModal;
window.deleteNoticeAdmin = deleteNoticeAdmin;
window.setupEditNoticeForm = setupEditNoticeForm;

window.openAddRoutineModal = openAddRoutineModal;
window.openEditRoutineModal = openEditRoutineModal;
window.closeRoutineModal = closeRoutineModal;
window.deleteRoutineSlotHandler = deleteRoutineSlotHandler;
window.setupRoutineSlotForm = setupRoutineSlotForm;

window.openEditMetricsModal = openEditMetricsModal;
window.closeEditMetricsModal = closeEditMetricsModal;
window.setupEditMetricsForm = setupEditMetricsForm;
window.setupAllModalDismissals = setupAllModalDismissals;

// Individual Student Profile (No Socials) PDF exposures
window.downloadSingleStudentPDF = downloadSingleStudentPDF;
window.printSingleStudentHTML = printSingleStudentHTML;

/* --------------------------------------------------------------------------
   MS OFFICE-STYLE DYNAMIC STUDENT ROSTER STUDIO & ENGINE
   Guarantees strictly ONE single line per student row across all 6 columns:
   Col 1: SL No. | Col 2: Name | Col 3: Student ID | Col 4: Reg. No. | Col 5: Phone Number | Col 6: Valid Email
   Fully customizable: Orientation, Column Widths, Font Sizes, Themes, Headers & Seals.
   -------------------------------------------------------------------------- */

const OFFICE_THEMES = {
  navy: { name: "Deep Navy", primary: [15, 23, 42], hex: "#0f172a", goldHex: "#d4af37", textHex: "#ffffff" },
  blue: { name: "Royal Blue", primary: [3, 105, 161], hex: "#0369a1", goldHex: "#f59e0b", textHex: "#ffffff" },
  slate: { name: "Executive Slate", primary: [51, 65, 85], hex: "#334155", goldHex: "#eab308", textHex: "#ffffff" },
  emerald: { name: "Emerald", primary: [6, 95, 70], hex: "#065f46", goldHex: "#fbbf24", textHex: "#ffffff" },
  monochrome: { name: "Charcoal", primary: [23, 23, 23], hex: "#171717", goldHex: "#a3a3a3", textHex: "#ffffff" }
};

let officeRosterState = {
  orientation: "portrait",
  theme: "navy",
  fontSize: 7.5,
  headerSize: 8.5,
  zebra: true,
  compactPadding: false,
  autoFit: true,
  columns: [
    { title: "SL No.", width: 8, key: "sl" },
    { title: "Name", width: 54, key: "name" },
    { title: "Student ID", width: 20, key: "roll" },
    { title: "Reg. No.", width: 25, key: "reg" },
    { title: "Phone Number", width: 25, key: "phone" },
    { title: "Valid Email", width: 50, key: "email" }
  ],
  instTitle: "DEPARTMENT OF PHYSICS • RAJSHAHI COLLEGE, RAJSHAHI",
  batchSubtitle: "Paradox-147 — The 147th Honours Batch (Session 2024-25)",
  motto: "• We Live • We Laugh • We Conquer •",
  signeeName: "MD. KHAIRUL ISLAM NAHID",
  signeeRole: "Class Representative & Batch Admin",
  showLogos: true,
  showSeal: true,
  sortBy: "roll-asc",
  statusFilter: "active"
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAvailableTableWidth(orientation) {
  // A4 dimensions in mm: Portrait = 210 x 297, Landscape = 297 x 210
  // Standard margins: 14mm left, 14mm right (28mm total)
  return orientation === "landscape" ? (297 - 28) : (210 - 28); // 269mm vs 182mm
}

function calculateSingleRowOptimalWidths(students, orientation = "portrait") {
  const totalW = getAvailableTableWidth(orientation);

  if (orientation === "landscape") {
    // Landscape has a roomy 269mm printable width
    const col0 = 10; // SL No.
    const col2 = 28; // Student ID
    const col3 = 34; // Reg. No.
    const col4 = 34; // Phone Number
    const fixedSum = col0 + col2 + col3 + col4; // 106mm
    const remainingW = totalW - fixedSum; // 163mm

    let maxNameLen = 20;
    let maxEmailLen = 20;
    (students || []).forEach(s => {
      if (s.name && s.name.length > maxNameLen) maxNameLen = s.name.length;
      if (s.email && s.email.length > maxEmailLen) maxEmailLen = s.email.length;
    });

    const ratio = Math.max(0.51, Math.min(0.55, maxNameLen / (maxNameLen + maxEmailLen)));
    const col1 = Math.round(remainingW * ratio); // ~86mm
    const col5 = remainingW - col1;              // ~77mm
    return [col0, col1, col2, col3, col4, col5];
  } else {
    // Portrait has 182mm printable width
    const col0 = 8;  // SL No.
    const col2 = 20; // Student ID
    const col3 = 25; // Reg. No.
    const col4 = 25; // Phone Number
    const fixedSum = col0 + col2 + col3 + col4; // 78mm
    const remainingW = totalW - fixedSum; // 104mm

    let maxNameLen = 18;
    let maxEmailLen = 18;
    (students || []).forEach(s => {
      if (s.name && s.name.length > maxNameLen) maxNameLen = s.name.length;
      if (s.email && s.email.length > maxEmailLen) maxEmailLen = s.email.length;
    });

    const ratio = Math.max(0.52, Math.min(0.56, maxNameLen / (maxNameLen + maxEmailLen)));
    const col1 = Math.round(remainingW * ratio); // ~55mm
    const col5 = remainingW - col1;              // ~49mm
    return [col0, col1, col2, col3, col4, col5];
  }
}

function getSortedFilteredStudents(sortBy = "roll-asc", statusFilter = "active") {
  let studentsSource = [];

  // 1. Check dashboardState if populated
  if (typeof window !== "undefined" && window.dashboardState && Array.isArray(window.dashboardState.students) && window.dashboardState.students.length > 0) {
    studentsSource = window.dashboardState.students;
  } else if (typeof dashboardState !== "undefined" && Array.isArray(dashboardState.students) && dashboardState.students.length > 0) {
    studentsSource = dashboardState.students;
  }

  // 2. Check localStorage cache
  if (!studentsSource.length && typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("paradox147_students_v3");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          studentsSource = parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read students from localStorage:", e);
    }
  }

  // 3. Fall back to window.SEED_DATA or SEED_DATA
  if (!studentsSource.length) {
    const seed = (typeof window !== "undefined" && window.SEED_DATA && Array.isArray(window.SEED_DATA.students))
      ? window.SEED_DATA.students
      : (typeof SEED_DATA !== "undefined" && Array.isArray(SEED_DATA.students))
        ? SEED_DATA.students
        : [];
    if (seed.length > 0) {
      studentsSource = seed;
    }
  }

  let list = [...studentsSource];

  if (statusFilter === "active") {
    list = list.filter(s => s.status === "Active" || !s.status);
  }

  list.sort((a, b) => {
    if (sortBy === "roll-asc") {
      return String(a.roll || a.studentId || "").localeCompare(String(b.roll || b.studentId || ""), undefined, { numeric: true });
    }
    if (sortBy === "roll-desc") {
      return String(b.roll || b.studentId || "").localeCompare(String(a.roll || a.studentId || ""), undefined, { numeric: true });
    }
    if (sortBy === "reg-asc") {
      return String(a.reg || a.regNo || "").localeCompare(String(b.reg || b.regNo || ""), undefined, { numeric: true });
    }
    if (sortBy === "reg-desc") {
      return String(b.reg || b.regNo || "").localeCompare(String(a.reg || a.regNo || ""), undefined, { numeric: true });
    }
    if (sortBy === "name-asc") {
      return String(a.name || a.fullName || "").localeCompare(String(b.name || b.fullName || ""));
    }
    return 0;
  });

  return list;
}

function isAuthorizedAdmin() {
  const user = (typeof window !== "undefined" && window.api && typeof window.api.getCurrentUser === "function" ? window.api.getCurrentUser() : null)
    || (typeof dashboardState !== "undefined" && dashboardState && dashboardState.currentUser)
    || (typeof localStorage !== "undefined" ? (function() {
         try {
           const u = localStorage.getItem("paradox147_current_user_v3") || localStorage.getItem("paradox_current_user") || localStorage.getItem("paradox147_current_user");
           return u ? JSON.parse(u) : null;
         } catch(e) { return null; }
       })() : null);

  return isUserAdminAccount(user);
}

function openExportRosterModal() {
  if (!isAuthorizedAdmin()) {
    if (window.showToast) {
      window.showToast("Access Restricted: Only Class Representative & Batch Administrator (MD. Khairul Islam Nahid) can access the student roster studio.", "danger");
    }
    return;
  }

  const modal = document.getElementById("export-roster-modal");
  if (modal) {
    modal.classList.add("active");
    syncOfficeStateToInputs();
    updateExportRosterPreview();
  }
}

function closeExportRosterModal() {
  const modal = document.getElementById("export-roster-modal");
  if (modal) modal.classList.remove("active");
}

function switchOfficeTab(tabId) {
  const tabs = document.querySelectorAll(".office-tab-btn");
  const panes = document.querySelectorAll(".office-pane");
  tabs.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-office-tab") === tabId);
  });
  panes.forEach(pane => {
    pane.classList.toggle("active", pane.id === `office-pane-${tabId}`);
  });
}

function selectOfficeTheme(themeKey) {
  if (!OFFICE_THEMES[themeKey]) return;
  officeRosterState.theme = themeKey;

  const chips = document.querySelectorAll(".office-theme-chip");
  chips.forEach(chip => {
    chip.classList.toggle("active", chip.getAttribute("data-theme") === themeKey);
  });

  updateExportRosterPreview();
}

function toggleAutoFit(isAuto) {
  officeRosterState.autoFit = Boolean(isAuto);
  if (isAuto) {
    resetColumnWidths();
  } else {
    onOfficeConfigChange();
  }
}

function resetColumnWidths() {
  const sortedList = getSortedFilteredStudents(officeRosterState.sortBy, officeRosterState.statusFilter);
  const optimal = calculateSingleRowOptimalWidths(sortedList, officeRosterState.orientation);
  for (let i = 0; i < 6; i++) {
    officeRosterState.columns[i].width = optimal[i];
    const input = document.getElementById(`col-width-${i}`);
    if (input) input.value = optimal[i];
  }
  onOfficeConfigChange();
}

function stepColWidth(colIdx, delta) {
  const input = document.getElementById(`col-width-${colIdx}`);
  if (!input) return;
  let val = parseInt(input.value, 10) || 10;
  val = Math.max(5, Math.min(130, val + delta));
  input.value = val;
  officeRosterState.columns[colIdx].width = val;
  officeRosterState.autoFit = false;
  const autoCheckbox = document.getElementById("office-autofit");
  if (autoCheckbox) autoCheckbox.checked = false;
  onOfficeConfigChange();
}

function onManualColWidthChange(colIdx) {
  const input = document.getElementById(`col-width-${colIdx}`);
  if (!input) return;
  const val = Math.max(5, Math.min(130, parseInt(input.value, 10) || 10));
  input.value = val;
  officeRosterState.columns[colIdx].width = val;
  officeRosterState.autoFit = false;
  const autoCheckbox = document.getElementById("office-autofit");
  if (autoCheckbox) autoCheckbox.checked = false;
  onOfficeConfigChange();
}

function syncInputsToOfficeState() {
  const orientSel = document.getElementById("office-orientation");
  if (orientSel) officeRosterState.orientation = orientSel.value;

  const fontInp = document.getElementById("office-font-size");
  if (fontInp) officeRosterState.fontSize = parseFloat(fontInp.value) || 7.5;

  const headerInp = document.getElementById("office-header-size");
  if (headerInp) officeRosterState.headerSize = parseFloat(headerInp.value) || 8.5;

  const zebraChk = document.getElementById("office-zebra");
  if (zebraChk) officeRosterState.zebra = zebraChk.checked;

  const compactChk = document.getElementById("office-compact-padding");
  if (compactChk) officeRosterState.compactPadding = compactChk.checked;

  const autoChk = document.getElementById("office-autofit");
  if (autoChk) officeRosterState.autoFit = autoChk.checked;

  for (let i = 0; i < 6; i++) {
    const titleInp = document.getElementById(`col-title-${i}`);
    if (titleInp && titleInp.value.trim()) {
      officeRosterState.columns[i].title = titleInp.value.trim();
    }
    const widthInp = document.getElementById(`col-width-${i}`);
    if (widthInp) {
      officeRosterState.columns[i].width = parseInt(widthInp.value, 10) || officeRosterState.columns[i].width;
    }
  }

  const instInp = document.getElementById("office-inst-title");
  if (instInp) officeRosterState.instTitle = instInp.value.trim();

  const batchInp = document.getElementById("office-batch-subtitle");
  if (batchInp) officeRosterState.batchSubtitle = batchInp.value.trim();

  const mottoInp = document.getElementById("office-motto");
  if (mottoInp) officeRosterState.motto = mottoInp.value.trim();

  const signeeInp = document.getElementById("office-signee-name");
  if (signeeInp) officeRosterState.signeeName = signeeInp.value.trim();

  const roleInp = document.getElementById("office-signee-role");
  if (roleInp) officeRosterState.signeeRole = roleInp.value.trim();

  const logosChk = document.getElementById("office-show-logos");
  if (logosChk) officeRosterState.showLogos = logosChk.checked;

  const sealChk = document.getElementById("office-show-seal");
  if (sealChk) officeRosterState.showSeal = sealChk.checked;

  const sortSel = document.getElementById("export-sort-by");
  if (sortSel) officeRosterState.sortBy = sortSel.value;

  const filterSel = document.getElementById("export-status-filter");
  if (filterSel) officeRosterState.statusFilter = filterSel.value;
}

function syncOfficeStateToInputs() {
  const orientSel = document.getElementById("office-orientation");
  if (orientSel) orientSel.value = officeRosterState.orientation;

  const fontInp = document.getElementById("office-font-size");
  if (fontInp) fontInp.value = officeRosterState.fontSize;

  const headerInp = document.getElementById("office-header-size");
  if (headerInp) headerInp.value = officeRosterState.headerSize;

  const zebraChk = document.getElementById("office-zebra");
  if (zebraChk) zebraChk.checked = officeRosterState.zebra;

  const compactChk = document.getElementById("office-compact-padding");
  if (compactChk) compactChk.checked = officeRosterState.compactPadding;

  const autoChk = document.getElementById("office-autofit");
  if (autoChk) autoChk.checked = officeRosterState.autoFit;

  for (let i = 0; i < 6; i++) {
    const titleInp = document.getElementById(`col-title-${i}`);
    if (titleInp) titleInp.value = officeRosterState.columns[i].title;
    const widthInp = document.getElementById(`col-width-${i}`);
    if (widthInp) widthInp.value = officeRosterState.columns[i].width;
  }

  const instInp = document.getElementById("office-inst-title");
  if (instInp) instInp.value = officeRosterState.instTitle;

  const batchInp = document.getElementById("office-batch-subtitle");
  if (batchInp) batchInp.value = officeRosterState.batchSubtitle;

  const mottoInp = document.getElementById("office-motto");
  if (mottoInp) mottoInp.value = officeRosterState.motto;

  const signeeInp = document.getElementById("office-signee-name");
  if (signeeInp) signeeInp.value = officeRosterState.signeeName;

  const roleInp = document.getElementById("office-signee-role");
  if (roleInp) roleInp.value = officeRosterState.signeeRole;

  const logosChk = document.getElementById("office-show-logos");
  if (logosChk) logosChk.checked = officeRosterState.showLogos;

  const sealChk = document.getElementById("office-show-seal");
  if (sealChk) sealChk.checked = officeRosterState.showSeal;

  const sortSel = document.getElementById("export-sort-by");
  if (sortSel) sortSel.value = officeRosterState.sortBy;

  const filterSel = document.getElementById("export-status-filter");
  if (filterSel) filterSel.value = officeRosterState.statusFilter;

  const chips = document.querySelectorAll(".office-theme-chip");
  chips.forEach(chip => {
    chip.classList.toggle("active", chip.getAttribute("data-theme") === officeRosterState.theme);
  });
}

function onOfficeConfigChange() {
  syncInputsToOfficeState();

  if (officeRosterState.autoFit) {
    const sortedList = getSortedFilteredStudents(officeRosterState.sortBy, officeRosterState.statusFilter);
    const optimal = calculateSingleRowOptimalWidths(sortedList, officeRosterState.orientation);
    for (let i = 0; i < 6; i++) {
      officeRosterState.columns[i].width = optimal[i];
      const wInp = document.getElementById(`col-width-${i}`);
      if (wInp) wInp.value = optimal[i];
    }
  }

  updateExportRosterPreview();
}

function resetToOfficeDefaults() {
  officeRosterState = {
    orientation: "portrait",
    theme: "navy",
    fontSize: 7.5,
    headerSize: 8.5,
    zebra: true,
    compactPadding: false,
    autoFit: true,
    columns: [
      { title: "SL No.", width: 8, key: "sl" },
      { title: "Name", width: 54, key: "name" },
      { title: "Student ID", width: 20, key: "roll" },
      { title: "Reg. No.", width: 25, key: "reg" },
      { title: "Phone Number", width: 25, key: "phone" },
      { title: "Valid Email", width: 50, key: "email" }
    ],
    instTitle: "DEPARTMENT OF PHYSICS • RAJSHAHI COLLEGE, RAJSHAHI",
    batchSubtitle: "Paradox-147 — The 147th Honours Batch (Session 2024-25)",
    motto: "• We Live • We Laugh • We Conquer •",
    signeeName: "MD. KHAIRUL ISLAM NAHID",
    signeeRole: "Class Representative & Batch Admin",
    showLogos: true,
    showSeal: true,
    sortBy: "roll-asc",
    statusFilter: "active"
  };

  syncOfficeStateToInputs();
  updateExportRosterPreview();
  if (window.showToast) window.showToast("Reset roster options to optimal Office defaults.", "info");
}

function updateExportRosterPreview() {
  const sortedList = getSortedFilteredStudents(officeRosterState.sortBy, officeRosterState.statusFilter);
  const countEl = document.getElementById("export-preview-count");
  if (countEl) countEl.textContent = sortedList.length;

  const theme = OFFICE_THEMES[officeRosterState.theme] || OFFICE_THEMES.navy;
  const targetW = getAvailableTableWidth(officeRosterState.orientation);

  // Update Mini Header Texts & Theme Color
  const bannerEl = document.getElementById("roster-preview-mini-banner");
  if (bannerEl) bannerEl.style.backgroundColor = theme.hex;

  const instEl = document.getElementById("preview-banner-inst");
  if (instEl) instEl.textContent = officeRosterState.instTitle;

  const batchEl = document.getElementById("preview-banner-batch");
  if (batchEl) {
    batchEl.textContent = officeRosterState.batchSubtitle;
    batchEl.style.color = theme.goldHex;
  }

  const mottoEl = document.getElementById("preview-banner-motto");
  if (mottoEl) mottoEl.textContent = officeRosterState.motto;

  // Update Mini Footer
  const footerSignee = document.getElementById("preview-footer-signee");
  if (footerSignee) footerSignee.textContent = officeRosterState.signeeName;

  const footerRole = document.getElementById("preview-footer-role");
  if (footerRole) footerRole.textContent = officeRosterState.signeeRole;

  // Update Total Width Meter
  const totalW = officeRosterState.columns.reduce((sum, c) => sum + (Number(c.width) || 0), 0);
  const meterText = document.getElementById("office-total-width-text");
  const targetText = document.getElementById("office-target-width-text");
  const badgeEl = document.getElementById("office-width-status-badge");
  const modeBadge = document.getElementById("office-preview-mode-badge");

  if (meterText) meterText.textContent = `${totalW} mm`;
  if (targetText) targetText.textContent = `${targetW} mm`;

  if (badgeEl) {
    const diff = totalW - targetW;
    if (diff === 0) {
      badgeEl.textContent = "✓ Exact Single-Row Fit";
      badgeEl.style.color = "#16a34a";
      badgeEl.style.background = "#dcfce7";
    } else if (diff > 0) {
      badgeEl.textContent = `⚠️ Wide: +${diff}mm (Will scale)`;
      badgeEl.style.color = "#b45309";
      badgeEl.style.background = "#fef3c7";
    } else {
      badgeEl.textContent = `ℹ️ Compact: ${diff}mm`;
      badgeEl.style.color = "#0284c7";
      badgeEl.style.background = "#e0f2fe";
    }
  }

  if (modeBadge) {
    const orientLabel = officeRosterState.orientation === "landscape" ? "Landscape (269mm)" : "Portrait (182mm)";
    modeBadge.textContent = `Single-Row Strict • ${orientLabel}`;
  }

  // Render Preview Table Header & Body
  const thead = document.getElementById("roster-live-preview-thead");
  const tbody = document.getElementById("roster-live-preview-tbody");
  if (!thead || !tbody) return;

  const cols = officeRosterState.columns;
  const p0 = ((cols[0].width || 8) / totalW) * 100;
  const p1 = ((cols[1].width || 54) / totalW) * 100;
  const p2 = ((cols[2].width || 20) / totalW) * 100;
  const p3 = ((cols[3].width || 25) / totalW) * 100;
  const p4 = ((cols[4].width || 25) / totalW) * 100;
  const p5 = ((cols[5].width || 50) / totalW) * 100;

  thead.style.backgroundColor = theme.hex;
  thead.innerHTML = `
    <tr>
      <th style="width:${p0}%; text-align:center; font-size:${officeRosterState.headerSize * 0.9}pt;">${escapeHtml(cols[0].title)}</th>
      <th style="width:${p1}%; text-align:left; font-size:${officeRosterState.headerSize * 0.9}pt;">${escapeHtml(cols[1].title)}</th>
      <th style="width:${p2}%; text-align:center; font-size:${officeRosterState.headerSize * 0.9}pt;">${escapeHtml(cols[2].title)}</th>
      <th style="width:${p3}%; text-align:center; font-size:${officeRosterState.headerSize * 0.9}pt;">${escapeHtml(cols[3].title)}</th>
      <th style="width:${p4}%; text-align:center; font-size:${officeRosterState.headerSize * 0.9}pt;">${escapeHtml(cols[4].title)}</th>
      <th style="width:${p5}%; text-align:left; font-size:${officeRosterState.headerSize * 0.9}pt;">${escapeHtml(cols[5].title)}</th>
    </tr>
  `;

  if (sortedList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:18px; color:#64748b; font-size:0.8rem;">No enrolled students match current query criteria.</td></tr>`;
    return;
  }

  const sample = sortedList.slice(0, 6);
  const cellPad = officeRosterState.compactPadding ? "4px 5px" : "6px 6px";
  const fontSizeCss = `${officeRosterState.fontSize * 0.95}pt`;

  tbody.innerHTML = sample.map((s, idx) => {
    const bg = officeRosterState.zebra ? (idx % 2 === 0 ? "#ffffff" : "#f8fafc") : "#ffffff";
    return `
      <tr style="background:${bg};">
        <td style="text-align:center; color:#64748b; font-weight:700; padding:${cellPad}; font-size:${fontSizeCss};">${idx + 1}</td>
        <td style="padding:${cellPad}; font-weight:700; color:#0f172a; font-size:${fontSizeCss};">${escapeHtml(s.name || 'N/A')}</td>
        <td style="text-align:center; padding:${cellPad}; font-size:${fontSizeCss};"><code style="background:#f1f5f9; padding:2px 5px; border-radius:3px; font-weight:700; color:#0f172a;">${escapeHtml(s.roll || s.studentId || 'N/A')}</code></td>
        <td style="text-align:center; padding:${cellPad}; font-size:${fontSizeCss};"><code style="background:#f1f5f9; padding:2px 5px; border-radius:3px; color:#334155;">${escapeHtml(s.reg || 'N/A')}</code></td>
        <td style="text-align:center; padding:${cellPad}; color:#334155; font-size:${fontSizeCss};">${escapeHtml(s.phone || 'N/A')}</td>
        <td style="padding:${cellPad}; color:#0284c7; font-size:${fontSizeCss};">${escapeHtml(s.email || 'N/A')}</td>
      </tr>
    `;
  }).join("");
}

async function downloadStudentRosterPDF() {
  if (!isAuthorizedAdmin()) {
    if (window.showToast) {
      window.showToast("Access Restricted: Only Class Representative & Batch Administrator (MD. Khairul Islam Nahid) can download the official student roster.", "danger");
    }
    return;
  }

  syncInputsToOfficeState();
  const sortedList = getSortedFilteredStudents(officeRosterState.sortBy, officeRosterState.statusFilter);

  if (sortedList.length === 0) {
    if (window.showToast) window.showToast("No students available to export.", "warning");
    return;
  }

  const hasJsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!hasJsPDF) {
    if (window.showToast) window.showToast("Opening printable roster view...", "info");
    printStudentRosterHTML();
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const orientation = officeRosterState.orientation === "landscape" ? "landscape" : "portrait";
    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4"
    });

    if (typeof doc.autoTable !== "function") {
      printStudentRosterHTML();
      return;
    }

    const theme = OFFICE_THEMES[officeRosterState.theme] || OFFICE_THEMES.navy;
    const isLandscape = orientation === "landscape";
    const pageWidth = isLandscape ? 297 : 210;
    const bannerW = isLandscape ? 269 : 182;
    const bannerH = isLandscape ? 34 : 40;
    const bannerX = 14;
    const bannerY = 10;
    const centerX = pageWidth / 2;

    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // ========================================================================
    // HEADER BANNER & DUAL INSTITUTIONAL LOGOS
    // ========================================================================
    doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.rect(bannerX, bannerY, bannerW, bannerH, "F");

    const brandLogos = window.BRAND_LOGOS;
    if (officeRosterState.showLogos && brandLogos) {
      if (brandLogos.rcLogoBase64) {
        try {
          doc.addImage(brandLogos.rcLogoBase64, "PNG", bannerX + 4, bannerY + 4, isLandscape ? 26 : 32, isLandscape ? 26 : 32);
        } catch (e) {
          console.warn("Could not embed RC logo:", e);
        }
      }
      if (brandLogos.batchLogoBase64) {
        try {
          const rightLogoX = isLandscape ? (pageWidth - 14 - 30) : (pageWidth - 14 - 36);
          doc.addImage(brandLogos.batchLogoBase64, "PNG", rightLogoX, bannerY + 4, isLandscape ? 26 : 32, isLandscape ? 26 : 32);
        } catch (e) {
          console.warn("Could not embed Batch logo:", e);
        }
      }
    }

    // Centered Institution Headings
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isLandscape ? 11 : 12);
    doc.text(officeRosterState.instTitle, centerX, isLandscape ? 18 : 20, { align: "center" });

    doc.setTextColor(theme.primary === OFFICE_THEMES.monochrome.primary ? 200 : 212, 175, 55); // Gold / Accent
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isLandscape ? 9 : 9.5);
    doc.text(officeRosterState.batchSubtitle, centerX, isLandscape ? 24 : 26.5, { align: "center" });

    doc.setTextColor(226, 232, 240);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(isLandscape ? 7.5 : 8);
    doc.text(officeRosterState.motto, centerX, isLandscape ? 29.5 : 33, { align: "center" });

    if (!isLandscape) {
      doc.setTextColor(203, 213, 225);
      doc.setFontSize(7.5);
      doc.text("Official Academic Batch Registry  •  Established 1873", centerX, 39, { align: "center" });
    }

    // Subtitle & Query Metadata Bar
    const subY = isLandscape ? 50 : 58;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isLandscape ? 10.5 : 11.5);
    doc.text("OFFICIAL BATCH STUDENT ROSTER", 14, subY);

    const sortDescription = officeRosterState.sortBy.startsWith("roll")
      ? "Sorted by: Student ID / Academic Roll"
      : officeRosterState.sortBy.startsWith("reg")
      ? "Sorted by: University Registration Number"
      : "Sorted by: Student Full Name";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(`${sortDescription}  |  Total Enrolled: ${sortedList.length} Students  |  Issue Date: ${dateStr}`, 14, subY + 5.5);

    // ========================================================================
    // PREPARE 6-COLUMN DATA & AUTO-FIT SINGLE-ROW GUARANTEE
    // ========================================================================
    const tableHead = [officeRosterState.columns.map(c => c.title)];
    const tableBody = sortedList.map((student, idx) => [
      idx + 1,
      student.name || student.fullName || "N/A",
      student.roll || student.studentId || "N/A",
      student.reg || student.regNo || "N/A",
      student.phone || student.phoneNo || "N/A",
      student.email || student.validEmail || "N/A"
    ]);

    // Calculate Column Widths (normalize to exact target width)
    const targetW = getAvailableTableWidth(orientation);
    const configuredSum = officeRosterState.columns.reduce((s, c) => s + (Number(c.width) || 10), 0);
    const scaleFactor = targetW / configuredSum;

    const finalColWidths = officeRosterState.columns.map(c => {
      return Math.round((Number(c.width) || 10) * scaleFactor * 100) / 100;
    });

    // Make sure exact sum equals targetW
    const finalSum = finalColWidths.reduce((a, b) => a + b, 0);
    const diff = Math.round((targetW - finalSum) * 100) / 100;
    finalColWidths[1] += diff; // absorb rounding in Name column

    const cellPadding = officeRosterState.compactPadding
      ? { top: 1.8, bottom: 1.8, left: 1.6, right: 1.6 }
      : { top: 2.2, bottom: 2.2, left: 1.8, right: 1.8 };

    // ========================================================================
    // AUTOTABLE ROSTER RENDERING (SINGLE ROW STRICT)
    // ========================================================================
    doc.autoTable({
      startY: subY + 9,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      showHead: "everyPage",
      headStyles: {
        fillColor: [theme.primary[0], theme.primary[1], theme.primary[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: officeRosterState.headerSize,
        cellPadding: { top: 2.5, bottom: 2.5, left: 1.8, right: 1.8 },
        lineWidth: 0.15,
        lineColor: [40, 50, 65],
        valign: "middle"
      },
      styles: {
        fontSize: officeRosterState.fontSize,
        cellPadding: cellPadding,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
        overflow: "ellipsize", // STRICT SINGLE ROW GUARANTEE: Never wraps onto 2 lines
        valign: "middle",
        minCellHeight: 6
      },
      columnStyles: {
        0: { halign: "center", cellWidth: finalColWidths[0], textColor: [100, 116, 139], fontStyle: "bold" },
        1: { halign: "left", cellWidth: finalColWidths[1], fontStyle: "bold", textColor: [15, 23, 42] },
        2: { halign: "center", cellWidth: finalColWidths[2], fontStyle: "bold", textColor: [15, 23, 42] },
        3: { halign: "center", cellWidth: finalColWidths[3], textColor: [51, 65, 85] },
        4: { halign: "center", cellWidth: finalColWidths[4], textColor: [51, 65, 85] },
        5: { halign: "left", cellWidth: finalColWidths[5], textColor: [2, 132, 199] }
      },
      alternateRowStyles: officeRosterState.zebra ? { fillColor: [248, 250, 252] } : {},
      margin: { top: 22, left: 14, right: 14, bottom: 20 }
    });

    // ========================================================================
    // OFFICIAL CERTIFICATION SIGN-OFF BLOCK
    // ========================================================================
    if (officeRosterState.showSeal) {
      const finalTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 180;
      const pageHeight = isLandscape ? 210 : 297;
      let sigPage = doc.internal.getNumberOfPages();
      let sigY = finalTableY + 12;

      if (sigY > (pageHeight - 38)) {
        doc.addPage();
        sigPage = doc.internal.getNumberOfPages();
        sigY = 30;
      }

      doc.setPage(sigPage);

      // Left verification statement
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Official certified batch registry of Paradox-147.", 14, sigY + 12);
      doc.text(`Generated: ${dateStr}  •  Department of Physics, Rajshahi College`, 14, sigY + 16);

      // Right seal & signature line
      const lineStartX = pageWidth - 14 - 66;
      const lineEndX = pageWidth - 14;
      const sigCenterX = (lineStartX + lineEndX) / 2;

      doc.setDrawColor(theme.primary[0], theme.primary[1], theme.primary[2]);
      doc.setLineWidth(0.3);
      doc.line(lineStartX, sigY + 8, lineEndX, sigY + 8);

      doc.setFontSize(8.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(officeRosterState.signeeName, sigCenterX, sigY + 12, { align: "center" });

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(officeRosterState.signeeRole, sigCenterX, sigY + 16, { align: "center" });
      doc.text("Department of Physics, Rajshahi College", sigCenterX, sigY + 19.5, { align: "center" });
    }

    // ========================================================================
    // POST-PROCESSING: MULTI-PAGE RUNNING HEADERS & PAGE NUMBERING
    // ========================================================================
    const totalPages = doc.internal.getNumberOfPages();
    const pageBottomY = (isLandscape ? 210 : 297) - 10;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      if (i > 1) {
        doc.setFillColor(theme.primary[0], theme.primary[1], theme.primary[2]);
        doc.rect(14, 8, bannerW, 9, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text("PARADOX-147 — OFFICIAL BATCH STUDENT ROSTER", 18, 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(212, 175, 55);
        doc.text("Dept. of Physics, Rajshahi College (Cont.)", bannerW + 10, 14, { align: "right" });
      }

      // Footer divider
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(14, pageBottomY - 4, pageWidth - 14, pageBottomY - 4);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Official academic registry • Paradox-147 Physics Honours", 14, pageBottomY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageBottomY, { align: "right" });
    }

    const safeSort = (officeRosterState.sortBy || "roll_asc").replace(/[^a-zA-Z0-9_]/g, "_");
    const fileName = `Paradox147_Student_Roster_${officeRosterState.orientation}_${safeSort}.pdf`;

    try {
      doc.save(fileName);
    } catch (saveErr) {
      console.warn("doc.save failed, checking Blob fallback:", saveErr);
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && URL.createObjectURL && typeof document !== "undefined") {
        try {
          const blob = doc.output("blob");
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 1000);
        } catch (bErr) {
          console.warn("Blob export failed:", bErr);
        }
      }
    }

    if (window.showToast) window.showToast(`Official Roster PDF downloaded: ${fileName}`, "success", 4500);
    closeExportRosterModal();
  } catch (err) {
    console.error("PDF generation failed:", err);
    if (window.showToast) window.showToast("Falling back to printable roster view...", "info");
    printStudentRosterHTML();
  }
}

function printStudentRosterHTML() {
  if (!isAuthorizedAdmin()) {
    if (window.showToast) {
      window.showToast("Access Restricted: Only Class Representative & Batch Administrator (MD. Khairul Islam Nahid) can print or preview the official student roster.", "danger");
    }
    return;
  }

  syncInputsToOfficeState();
  const sortedList = getSortedFilteredStudents(officeRosterState.sortBy, officeRosterState.statusFilter);

  if (sortedList.length === 0) {
    if (window.showToast) window.showToast("No students available to print or export.", "warning");
    return;
  }

  const theme = OFFICE_THEMES[officeRosterState.theme] || OFFICE_THEMES.navy;
  const isLandscape = officeRosterState.orientation === "landscape";
  const cols = officeRosterState.columns;
  const totalW = cols.reduce((sum, c) => sum + (Number(c.width) || 10), 0);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const printWindow = window.open("", "_blank", "width=960,height=800");
  if (!printWindow) {
    if (window.showToast) window.showToast("Please allow popups to preview/print the roster.", "warning");
    return;
  }

  const rowsHTML = sortedList.map((s, idx) => `
    <tr style="background:${officeRosterState.zebra ? (idx % 2 === 0 ? '#ffffff' : '#f8fafc') : '#ffffff'};">
      <td style="text-align:center; font-weight:700; color:#475569; padding:5px 6px; white-space:nowrap;">${idx + 1}</td>
      <td style="font-weight:700; color:#0f172a; padding:5px 8px; white-space:nowrap;">${escapeHtml(s.name || 'N/A')}</td>
      <td style="text-align:center; padding:5px 6px; white-space:nowrap;"><code style="font-weight:700; color:#0f172a; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${escapeHtml(s.roll || s.studentId || 'N/A')}</code></td>
      <td style="text-align:center; padding:5px 6px; white-space:nowrap;"><code style="font-weight:700; color:#334155; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${escapeHtml(s.reg || 'N/A')}</code></td>
      <td style="text-align:center; color:#334155; padding:5px 6px; white-space:nowrap;">${escapeHtml(s.phone || 'N/A')}</td>
      <td style="padding:5px 8px; white-space:nowrap;"><a href="mailto:${escapeHtml(s.email)}" style="color:#0284c7; text-decoration:none;">${escapeHtml(s.email || 'N/A')}</a></td>
    </tr>
  `).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Paradox-147 Official Student Roster (${officeRosterState.orientation})</title>
      <style>
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          color: #0f172a;
          background: #ffffff;
        }
        .header-banner {
          background: ${theme.hex};
          color: #ffffff;
          padding: 16px 20px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 16px;
        }
        .header-content {
          text-align: center;
          flex: 1;
        }
        .meta-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #334155;
          margin-bottom: 12px;
          background: #f8fafc;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: ${officeRosterState.fontSize * 1.25}px;
        }
        th {
          background: ${theme.hex};
          color: #ffffff;
          text-align: left;
          font-weight: 700;
          padding: 6px 8px;
          border: 1px solid ${theme.hex};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        td {
          border: 1px solid #cbd5e1;
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .footer-seal {
          margin-top: 20px;
          border-top: 1px solid #cbd5e1;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #64748b;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
          @page { margin: 12mm 10mm; size: ${isLandscape ? 'landscape' : 'portrait'}; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; background:#e0f2fe; padding:8px 16px; border-radius:6px;">
        <span style="font-size:12px; font-weight:600; color:#0369a1;">📄 Student Roster (${isLandscape ? 'Landscape' : 'Portrait'} • Single-Row Guarantee)</span>
        <button onclick="window.print()" style="padding:6px 14px; background:${theme.hex}; color:#ffffff; border:none; border-radius:4px; font-weight:700; cursor:pointer;">🖨️ Print / Save as PDF</button>
      </div>

      <div class="header-banner">
        ${officeRosterState.showLogos ? '<img src="assets/images/rc-logo.png" alt="Rajshahi College" style="width:72px; height:72px; object-fit:contain; flex-shrink:0;">' : ''}
        <div class="header-content">
          <h1 style="margin:0 0 4px 0; font-size:18px; font-weight:800; letter-spacing:0.03em;">${escapeHtml(officeRosterState.instTitle)}</h1>
          <h2 style="margin:0 0 3px 0; font-size:13px; font-weight:700; color:${theme.goldHex};">${escapeHtml(officeRosterState.batchSubtitle)}</h2>
          <p style="margin:0; font-size:11px; color:#cbd5e1; font-style:italic;">${escapeHtml(officeRosterState.motto)}</p>
        </div>
        ${officeRosterState.showLogos ? '<img src="assets/images/batch-logo.png" alt="Paradox-147" style="width:72px; height:72px; object-fit:contain; flex-shrink:0;">' : ''}
      </div>

      <div class="meta-bar">
        <span><strong>OFFICIAL BATCH STUDENT ROSTER</strong></span>
        <span>Total Students: <strong>${sortedList.length}</strong></span>
        <span>Date: <strong>${dateStr}</strong></span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:${(cols[0].width/totalW)*100}%; text-align:center;">${escapeHtml(cols[0].title)}</th>
            <th style="width:${(cols[1].width/totalW)*100}%;">${escapeHtml(cols[1].title)}</th>
            <th style="width:${(cols[2].width/totalW)*100}%; text-align:center;">${escapeHtml(cols[2].title)}</th>
            <th style="width:${(cols[3].width/totalW)*100}%; text-align:center;">${escapeHtml(cols[3].title)}</th>
            <th style="width:${(cols[4].width/totalW)*100}%; text-align:center;">${escapeHtml(cols[4].title)}</th>
            <th style="width:${(cols[5].width/totalW)*100}%;">${escapeHtml(cols[5].title)}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>

      ${officeRosterState.showSeal ? `
      <div class="footer-seal">
        <span>Official certified registry • Department of Physics, Rajshahi College.</span>
        <span>Certified & Sealed: <strong>${escapeHtml(officeRosterState.signeeName)}</strong> (${escapeHtml(officeRosterState.signeeRole)})</span>
      </div>` : ''}
    </body>
    </html>
  `);
  printWindow.document.close();
  closeExportRosterModal();
}

/* ==========================================================================
   TOPBAR NOTIFICATIONS FLYOUT & NOTIFICATION MANAGEMENT
   ========================================================================== */
function updateTopbarNotificationBadge() {
  const badge = document.getElementById("topbar-notif-badge");
  const countBadge = document.getElementById("notif-count-badge");
  const unreadPill = document.getElementById("notif-unread-count-pill");
  const readPill = document.getElementById("notif-read-count-pill");

  const notifs = dashboardState.notifications || [];
  const unreadCount = notifs.filter(n => !n.isRead).length;
  const readCount = notifs.filter(n => n.isRead).length;

  if (badge) {
    badge.style.display = unreadCount > 0 ? "block" : "none";
  }
  if (countBadge) {
    countBadge.textContent = `${unreadCount} New`;
  }
  if (unreadPill) {
    unreadPill.textContent = `${unreadCount} Unread`;
  }
  if (readPill) {
    readPill.textContent = `${readCount} Read`;
  }
}

function toggleNotificationDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("notification-dropdown-menu");
  if (!menu) return;

  const isHidden = menu.style.display === "none" || !menu.style.display;
  if (isHidden) {
    renderNotificationList();
    menu.style.display = "block";
  } else {
    menu.style.display = "none";
  }
}

function setNotificationCategoryFilter(cat, e) {
  if (e) e.stopPropagation();
  dashboardState.notifCategoryFilter = cat || "all";
  renderNotificationList();
}

function setNotificationStatusFilter(status, e) {
  if (e) e.stopPropagation();
  dashboardState.notifStatusFilter = status || "all";
  renderNotificationList();
}

function renderNotificationList() {
  const container = document.getElementById("notification-items-list");
  const filterContainer = document.getElementById("notif-filter-controls");
  if (!container) return;

  const allNotifs = dashboardState.notifications || [];
  const totalCount = allNotifs.length;
  const unreadCount = allNotifs.filter(n => !n.isRead).length;
  const readCount = allNotifs.filter(n => n.isRead).length;

  // Category counts
  const contactCount = allNotifs.filter(n => n.category === "contact" || n.type === "contact_message").length;
  const memoryCount = allNotifs.filter(n => n.category === "memory" || n.type === "memory_submission").length;
  const systemCount = allNotifs.filter(n => n.category === "system" || (n.type !== "contact_message" && n.type !== "memory_submission")).length;

  // Update Topbar Badges
  updateTopbarNotificationBadge();

  // Render Filter Controls (Categories & Read/Unread Status Tabs)
  if (filterContainer) {
    const activeCat = dashboardState.notifCategoryFilter || "all";
    const activeStatus = dashboardState.notifStatusFilter || "all";

    // Filter by active category first to calculate status sub-counts
    let catSubset = allNotifs;
    if (activeCat === "contact") {
      catSubset = allNotifs.filter(n => n.category === "contact" || n.type === "contact_message");
    } else if (activeCat === "memory") {
      catSubset = allNotifs.filter(n => n.category === "memory" || n.type === "memory_submission");
    } else if (activeCat === "system") {
      catSubset = allNotifs.filter(n => n.category === "system" || (n.type !== "contact_message" && n.type !== "memory_submission"));
    }

    const catUnread = catSubset.filter(n => !n.isRead).length;
    const catRead = catSubset.filter(n => n.isRead).length;

    filterContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.4rem;">
        <!-- Category Filter Tabs -->
        <div style="display: flex; gap: 0.3rem; overflow-x: auto; padding-bottom: 0.15rem; align-items: center;" class="hide-scrollbar">
          <button type="button" class="btn btn-xs ${activeCat === 'all' ? 'btn-navy' : 'btn-ghost'}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; white-space: nowrap;" onclick="setNotificationCategoryFilter('all', event)">
            All (${totalCount})
          </button>
          <button type="button" class="btn btn-xs ${activeCat === 'contact' ? 'btn-navy' : 'btn-ghost'}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; white-space: nowrap;" onclick="setNotificationCategoryFilter('contact', event)">
            💬 Messages (${contactCount})
          </button>
          <button type="button" class="btn btn-xs ${activeCat === 'memory' ? 'btn-navy' : 'btn-ghost'}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; white-space: nowrap;" onclick="setNotificationCategoryFilter('memory', event)">
            📸 Memories (${memoryCount})
          </button>
          <button type="button" class="btn btn-xs ${activeCat === 'system' ? 'btn-navy' : 'btn-ghost'}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; white-space: nowrap;" onclick="setNotificationCategoryFilter('system', event)">
            🔔 System (${systemCount})
          </button>
        </div>

        <!-- Read / Unread Status Filter Pills -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--slate-200); padding-top: 0.35rem; font-size: 0.72rem;">
          <div style="display: flex; gap: 0.3rem; align-items: center;">
            <span style="color: var(--slate-400); font-weight: 600; text-transform: uppercase; font-size: 0.65rem; margin-right: 0.2rem;">Status:</span>
            <button type="button" class="btn btn-xs ${activeStatus === 'all' ? 'btn-outline-navy' : 'btn-ghost'}" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;" onclick="setNotificationStatusFilter('all', event)">
              All (${catSubset.length})
            </button>
            <button type="button" class="btn btn-xs ${activeStatus === 'unread' ? 'btn-gold' : 'btn-ghost'}" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;" onclick="setNotificationStatusFilter('unread', event)">
              🟢 Unread (${catUnread})
            </button>
            <button type="button" class="btn btn-xs ${activeStatus === 'read' ? 'btn-secondary' : 'btn-ghost'}" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;" onclick="setNotificationStatusFilter('read', event)">
              ⚪ Read (${catRead})
            </button>
          </div>
          ${(activeCat !== 'all' || activeStatus !== 'all') ? `
            <button type="button" class="btn btn-xs btn-ghost" style="color: var(--danger-500); font-size: 0.68rem; padding: 0.1rem 0.3rem;" onclick="setNotificationCategoryFilter('all', event); setNotificationStatusFilter('all', event);" title="Reset Filters">
              Reset
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Filter items
  let filteredNotifs = allNotifs;
  const activeCat = dashboardState.notifCategoryFilter || "all";
  const activeStatus = dashboardState.notifStatusFilter || "all";

  if (activeCat === "contact") {
    filteredNotifs = filteredNotifs.filter(n => n.category === "contact" || n.type === "contact_message");
  } else if (activeCat === "memory") {
    filteredNotifs = filteredNotifs.filter(n => n.category === "memory" || n.type === "memory_submission");
  } else if (activeCat === "system") {
    filteredNotifs = filteredNotifs.filter(n => n.category === "system" || (n.type !== "contact_message" && n.type !== "memory_submission"));
  }

  if (activeStatus === "unread") {
    filteredNotifs = filteredNotifs.filter(n => !n.isRead);
  } else if (activeStatus === "read") {
    filteredNotifs = filteredNotifs.filter(n => n.isRead);
  }

  if (filteredNotifs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--slate-400); font-size: 0.85rem;">
        <div style="font-size: 2.2rem; margin-bottom: 0.4rem;">🔕</div>
        <strong style="color: var(--navy-800); display: block; margin-bottom: 0.2rem;">No notifications found</strong>
        <span>${activeCat !== 'all' || activeStatus !== 'all' ? 'No items match your active category or status filter.' : 'You have no notifications in your inbox.'}</span>
        ${activeCat !== 'all' || activeStatus !== 'all' ? `
          <div style="margin-top: 0.75rem;">
            <button type="button" class="btn btn-xs btn-outline-navy" onclick="setNotificationCategoryFilter('all', event); setNotificationStatusFilter('all', event);">
              View All Notifications
            </button>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = filteredNotifs.map(n => {
    const isMemory = n.category === "memory" || n.type === "memory_submission";
    const isContact = n.category === "contact" || n.type === "contact_message";
    const ref = n.referenceData || {};

    const categoryLabel = isContact ? '💬 Inquiry' : (isMemory ? '📸 Memory' : '🔔 System');
    const categoryStyle = isContact ? 'background: var(--navy-50); color: var(--navy-800); border: 1px solid rgba(11,29,58,0.15);' :
                          (isMemory ? 'background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff;' :
                          'background: var(--slate-100); color: var(--slate-700); border: 1px solid var(--slate-200);');

    return `
      <div class="notification-item-card" style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--slate-100); background: ${n.isRead ? 'var(--white)' : '#fefdf9'}; border-left: 3px solid ${n.isRead ? 'transparent' : 'var(--gold-500)'}; transition: background 0.15s ease;">
        <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
          <div style="font-size: 1.35rem; flex-shrink: 0; line-height: 1; cursor: pointer;" onclick="openNotificationModal('${n.id}')" title="Click to open and read">
            ${isMemory ? '📸' : (isContact ? '💬' : '🔔')}
          </div>
          <div style="flex: 1; min-width: 0;">
            
            <!-- Item Header: Title, Category Badge, Status, and Time -->
            <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; margin-bottom: 0.25rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;" onclick="openNotificationModal('${n.id}')" title="Click to open and read full message">
                <strong style="font-size: 0.85rem; color: var(--navy-900); font-weight: ${n.isRead ? '600' : '800'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${escapeHtml(n.title)}
                </strong>
                ${!n.isRead ? '<span class="badge badge-gold" style="font-size: 0.6rem; padding: 0.1rem 0.35rem; flex-shrink: 0;">New</span>' : ''}
              </div>
              <span style="font-size: 0.68rem; color: var(--slate-400); flex-shrink: 0;">
                ${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <!-- Category & Details Sub-bar -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.7rem;">
              <span class="badge" style="${categoryStyle} font-size: 0.65rem; padding: 0.1rem 0.45rem; font-weight: 700;">
                ${categoryLabel}
              </span>
              <span style="color: var(--slate-400); font-size: 0.68rem;">
                ${new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <!-- Message Excerpt -->
            <p style="font-size: 0.78rem; color: var(--slate-600); margin: 0 0 0.45rem 0; line-height: 1.35; word-break: break-word; cursor: pointer;" onclick="openNotificationModal('${n.id}')" title="Click to open and read">
              ${escapeHtml(n.message)}
            </p>

            ${isMemory && ref.image ? `
              <div style="display: flex; gap: 0.55rem; align-items: center; margin-bottom: 0.5rem; background: var(--navy-50); padding: 0.35rem 0.55rem; border-radius: var(--radius-sm); cursor: pointer;" onclick="openNotificationModal('${n.id}')">
                <img src="${ref.image}" alt="Preview" style="width: 38px; height: 38px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">
                <div style="font-size: 0.72rem; color: var(--navy-800); min-width: 0;">
                  <div style="font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(ref.title || 'Memory Photo')}</div>
                  <div style="color: var(--slate-500); font-size: 0.68rem;">${escapeHtml(ref.studentName || 'Student')} (Roll: ${escapeHtml(ref.roll || 'N/A')})</div>
                </div>
              </div>
            ` : ''}

            <!-- Action Buttons: Open & Read, Toggle Read/Unread, Delete, and Direct Links -->
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; margin-top: 0.25rem;">
              <button type="button" class="btn btn-xs btn-navy" style="font-size: 0.7rem; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="openNotificationModal('${n.id}')" title="Open and read full details">
                📖 Open & Read
              </button>

              <button type="button" class="btn btn-xs ${n.isRead ? 'btn-ghost' : 'btn-outline'}" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;" onclick="handleToggleSingleNotificationRead('${n.id}', event)" title="${n.isRead ? 'Mark as Unread' : 'Mark as Read'}">
                ${n.isRead ? '↺ Unread' : '✓ Read'}
              </button>

              <button type="button" class="btn btn-xs btn-ghost" style="color: var(--danger-500); font-size: 0.7rem; padding: 0.2rem 0.45rem;" onclick="handleDeleteNotification('${n.id}', event)" title="Delete Notification">
                🗑️
              </button>

              ${isContact && ref.email && ref.email.includes('@') ? `
                <button type="button" class="btn btn-xs btn-ghost" style="font-size: 0.7rem; padding: 0.2rem 0.45rem; text-decoration: none;" onclick="handleOfficialReplyFromNotifId('${n.id}', 'default'); event.stopPropagation();" title="Reply from Official Email (mail.paradox147@gmail.com)">
                  ✉️ Reply
                </button>
              ` : ''}

              ${isMemory && !n.isResolved ? `
                <button type="button" class="btn btn-xs btn-success" style="font-size: 0.68rem; padding: 0.2rem 0.45rem;" onclick="handleNotificationApproveMemory('${ref.memoryId || n.referenceId}', '${n.id}'); event.stopPropagation();">
                  Approve
                </button>
              ` : ''}
            </div>

          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function openNotificationModal(notifId) {
  const notif = (dashboardState.notifications || []).find(n => n.id === notifId);
  if (!notif) return;

  dashboardState.activeNotifModalId = notifId;

  // Auto-mark notification as read when opened!
  if (!notif.isRead && window.api && typeof window.api.markNotificationRead === "function") {
    await window.api.markNotificationRead(notifId);
    notif.isRead = true;
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
  }

  const modal = document.getElementById("notification-detail-modal");
  if (!modal) return;

  const isMemory = notif.category === "memory" || notif.type === "memory_submission";
  const isContact = notif.category === "contact" || notif.type === "contact_message";
  const ref = notif.referenceData || {};

  // Fill Modal Headers
  const iconEl = document.getElementById("notif-modal-icon");
  if (iconEl) iconEl.textContent = isMemory ? "📸" : (isContact ? "💬" : "🔔");

  const catBadge = document.getElementById("notif-modal-category-badge");
  if (catBadge) {
    catBadge.textContent = isContact ? "💬 Inquiries & Messages" : (isMemory ? "📸 Memories & Photos" : "🔔 Governance & System");
    catBadge.className = isContact ? "badge badge-navy" : (isMemory ? "badge badge-gold" : "badge badge-secondary");
  }

  const statusBadge = document.getElementById("notif-modal-status-badge");
  if (statusBadge) {
    statusBadge.textContent = notif.isRead ? "Read" : "Unread";
    statusBadge.className = notif.isRead ? "badge badge-secondary" : "badge badge-gold";
  }

  const titleEl = document.getElementById("notif-modal-title");
  if (titleEl) titleEl.textContent = notif.title || "Notification Details";

  const timeEl = document.getElementById("notif-modal-time");
  if (timeEl) timeEl.textContent = new Date(notif.createdAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" });

  const idEl = document.getElementById("notif-modal-id");
  if (idEl) idEl.textContent = `ID: ${notif.id}`;

  // Fill Modal Body Content
  const contentArea = document.getElementById("notif-modal-content-area");
  if (contentArea) {
    let bodyHtml = "";

    if (isContact) {
      bodyHtml = `
        <div style="background: var(--navy-50); border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 1.1rem; margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.95rem; color: var(--navy-900); margin: 0 0 0.75rem 0; border-bottom: 1px solid var(--slate-200); padding-bottom: 0.5rem; display:flex; justify-content:space-between; align-items:center;">
            <span>👤 Sender Information</span>
            <span class="badge badge-navy" style="font-size:0.68rem;">Contact Inquiry</span>
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.65rem; font-size: 0.85rem;">
            <div><strong style="color:var(--slate-500);">Full Name:</strong> <div style="color:var(--navy-900); font-weight:700;">${escapeHtml(ref.name || 'Anonymous')}</div></div>
            <div><strong style="color:var(--slate-500);">Email or Student Roll:</strong> <div style="color:var(--navy-800); font-weight:600;">${escapeHtml(ref.email || 'N/A')}</div></div>
            <div><strong style="color:var(--slate-500);">Phone / WhatsApp:</strong> <div style="color:var(--navy-900);">${ref.phone ? `<a href="tel:${escapeHtml(ref.phone)}" style="color:var(--navy-700); font-weight:600; text-decoration:none;">${escapeHtml(ref.phone)}</a>` : '—'}</div></div>
            <div><strong style="color:var(--slate-500);">Subject:</strong> <div style="color:var(--navy-900); font-weight:600;">${escapeHtml(ref.subject || 'Inquiry')}</div></div>
          </div>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--slate-600); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.04em;">Full Message Body:</label>
          <div style="background: var(--white); border: 1px solid var(--slate-200); border-left: 4px solid var(--gold-500); padding: 1rem 1.2rem; border-radius: var(--radius-sm); font-size: 0.92rem; color: var(--navy-950); line-height: 1.6; white-space: pre-wrap; word-break: break-word;">
            ${escapeHtml(ref.message || notif.message || '')}
          </div>
        </div>

        <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: var(--radius-sm); padding: 0.85rem 1rem; margin-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.35rem;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--navy-900); display: flex; align-items: center; gap: 0.35rem;">
              🛡️ Official Batch Reply From:
            </span>
            <span class="badge badge-navy" style="font-size: 0.72rem; font-family: monospace; font-weight: 700;">
              mail.paradox147@gmail.com
            </span>
          </div>
          <p style="font-size: 0.76rem; color: var(--slate-600); margin: 0 0 0.65rem 0;">
            Replying automatically closes this notification modal and opens your composer pre-filled with the sender address, subject, and official Paradox-147 batch committee signature with CC to <strong style="color:var(--navy-900);">mail.paradox147@gmail.com</strong>.
          </p>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${ref.email && ref.email.includes('@') ? `
              <button type="button" class="btn btn-sm btn-navy" onclick="handleOfficialReplyFromNotifId('${notif.id}', 'default')" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700;">
                ✉️ Reply via Email App
              </button>
              <button type="button" class="btn btn-sm btn-outline-navy" onclick="handleOfficialReplyFromNotifId('${notif.id}', 'gmail')" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700;">
                🌐 Reply via Gmail Web
              </button>
            ` : `
              <span style="font-size: 0.8rem; color: var(--slate-500);">No email address provided by sender.</span>
            `}
            ${ref.phone ? `
              <a href="tel:${escapeHtml(ref.phone)}" class="btn btn-sm btn-outline" style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;" onclick="closeNotificationModal();">
                📞 Call Sender (${escapeHtml(ref.phone)})
              </a>
            ` : ''}
          </div>
        </div>
      `;
    } else if (isMemory) {
      bodyHtml = `
        <div style="background: var(--navy-50); border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 1.1rem; margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.95rem; color: var(--navy-900); margin: 0 0 0.75rem 0; border-bottom: 1px solid var(--slate-200); padding-bottom: 0.5rem;">
            📸 Memory Submission Particulars
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.65rem; font-size: 0.85rem;">
            <div><strong style="color:var(--slate-500);">Album Title:</strong> <div style="color:var(--navy-900); font-weight:700;">${escapeHtml(ref.title || 'Untitled Memory')}</div></div>
            <div><strong style="color:var(--slate-500);">Submitted By:</strong> <div style="color:var(--navy-800);">${escapeHtml(ref.studentName || 'Student')} (Roll: ${escapeHtml(ref.roll || 'N/A')})</div></div>
            <div><strong style="color:var(--slate-500);">Category:</strong> <div style="color:var(--navy-800);">${escapeHtml(ref.category || 'General')}</div></div>
            <div><strong style="color:var(--slate-500);">Status:</strong> <div>${notif.isResolved ? '<span class="badge badge-success">Approved & Published</span>' : '<span class="badge badge-warning">Pending Approval</span>'}</div></div>
          </div>
        </div>

        ${ref.image ? `
          <div style="margin-bottom: 1.25rem; text-align:center;">
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--slate-600); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.04em; text-align:left;">Submitted Picture:</label>
            <img src="${ref.image}" alt="Memory Preview" style="max-height: 260px; max-width: 100%; object-fit: contain; border-radius: var(--radius-md); border: 1px solid var(--slate-200); box-shadow: var(--shadow-sm);">
          </div>
        ` : ''}

        <div style="margin-bottom: 1.25rem;">
          <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--slate-600); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.04em;">Caption / Story Details:</label>
          <div style="background: var(--white); border: 1px solid var(--slate-200); padding: 0.9rem 1.1rem; border-radius: var(--radius-sm); font-size: 0.88rem; color: var(--navy-950); line-height: 1.5; white-space: pre-wrap;">
            ${escapeHtml(ref.caption || ref.details || notif.message || 'No caption provided.')}
          </div>
        </div>

        ${!notif.isResolved ? `
          <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1rem;">
            <button type="button" class="btn btn-sm btn-success" onclick="handleNotificationApproveMemory('${ref.memoryId || notif.referenceId}', '${notif.id}'); closeNotificationModal();">
              ✅ Approve & Publish Memory
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="handleNotificationRejectMemory('${ref.memoryId || notif.referenceId}', '${notif.id}'); closeNotificationModal();">
              ❌ Reject Memory
            </button>
          </div>
        ` : ''}
      `;
    } else {
      bodyHtml = `
        <div style="background: var(--white); border: 1px solid var(--slate-200); border-left: 4px solid var(--navy-700); padding: 1.2rem; border-radius: var(--radius-sm); font-size: 0.92rem; color: var(--navy-950); line-height: 1.6; white-space: pre-wrap;">
          ${escapeHtml(notif.message || 'No additional message details.')}
        </div>
      `;
    }

    contentArea.innerHTML = bodyHtml;
  }

  // Update Toggle Read Button
  const toggleBtn = document.getElementById("notif-modal-toggle-read-btn");
  if (toggleBtn) {
    toggleBtn.innerHTML = notif.isRead ? "↺ Mark Unread" : "✓ Mark Read";
  }

  modal.classList.add("active");
  modal.style.display = "flex";
}

function closeNotificationModal() {
  const modal = document.getElementById("notification-detail-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
  dashboardState.activeNotifModalId = null;
}

async function handleModalToggleReadNotification() {
  const notifId = dashboardState.activeNotifModalId;
  if (!notifId) return;
  const notif = (dashboardState.notifications || []).find(n => n.id === notifId);
  if (!notif) return;

  if (window.api) {
    if (notif.isRead) {
      await window.api.markNotificationUnread(notifId);
      notif.isRead = false;
      if (typeof window.showToast === "function") window.showToast("Notification marked as unread.", "info");
    } else {
      await window.api.markNotificationRead(notifId);
      notif.isRead = true;
      if (typeof window.showToast === "function") window.showToast("Notification marked as read.", "info");
    }

    const statusBadge = document.getElementById("notif-modal-status-badge");
    if (statusBadge) {
      statusBadge.textContent = notif.isRead ? "Read" : "Unread";
      statusBadge.className = notif.isRead ? "badge badge-secondary" : "badge badge-gold";
    }
    const toggleBtn = document.getElementById("notif-modal-toggle-read-btn");
    if (toggleBtn) {
      toggleBtn.innerHTML = notif.isRead ? "↺ Mark Unread" : "✓ Mark Read";
    }

    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
  }
}

async function handleModalDeleteNotification() {
  const notifId = dashboardState.activeNotifModalId;
  if (!notifId) return;
  if (!confirm("Are you sure you want to delete this notification?")) return;

  if (window.api && typeof window.api.deleteNotification === "function") {
    await window.api.deleteNotification(notifId);
    if (typeof window.showToast === "function") {
      window.showToast("Notification deleted successfully.", "info");
    }
    closeNotificationModal();
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
  }
}

async function handleDeleteNotification(notifId, e) {
  if (e) e.stopPropagation();
  if (!confirm("Delete this notification?")) return;

  if (window.api && typeof window.api.deleteNotification === "function") {
    await window.api.deleteNotification(notifId);
    if (typeof window.showToast === "function") {
      window.showToast("Notification deleted.", "info");
    }
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
  }
}

async function handleToggleSingleNotificationRead(notifId, e) {
  if (e) e.stopPropagation();
  const notif = (dashboardState.notifications || []).find(n => n.id === notifId);
  if (!notif) return;

  if (window.api) {
    if (notif.isRead) {
      await window.api.markNotificationUnread(notifId);
      if (typeof window.showToast === "function") window.showToast("Marked as unread.", "info");
    } else {
      await window.api.markNotificationRead(notifId);
      if (typeof window.showToast === "function") window.showToast("Marked as read.", "info");
    }
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
  }
}

async function handleClearReadNotifications(e) {
  if (e) e.stopPropagation();
  const readCount = (dashboardState.notifications || []).filter(n => n.isRead).length;
  if (readCount === 0) {
    if (typeof window.showToast === "function") window.showToast("No read notifications to clear.", "info");
    return;
  }
  if (!confirm(`Delete all ${readCount} read notification(s)?`)) return;

  if (window.api && typeof window.api.clearAllNotifications === "function") {
    await window.api.clearAllNotifications(true);
    if (typeof window.showToast === "function") window.showToast(`Cleared ${readCount} read notification(s).`, "info");
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
  }
}

async function handleMarkSingleNotificationRead(notifId) {
  if (window.api && typeof window.api.markNotificationRead === "function") {
    await window.api.markNotificationRead(notifId);
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
    if (typeof window.showToast === "function") {
      window.showToast("Notification marked as read.", "info");
    }
  }
}

async function markAllNotificationsAsRead(e) {
  if (e) e.stopPropagation();
  if (window.api && typeof window.api.markAllNotificationsRead === "function") {
    await window.api.markAllNotificationsRead();
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
    if (typeof window.showToast === "function") {
      window.showToast("All notifications marked as read.", "info");
    }
  }
}

/* --------------------------------------------------------------------------
   OFFICIAL EMAIL REPLY HANDLER (ALWAYS FROM mail.paradox147@gmail.com)
   Closes modal & notification dropdown immediately upon opening mail client
   -------------------------------------------------------------------------- */
function handleOfficialMailReply(recipientEmail, subject, senderName, originalMessage, mode = 'default') {
  if (!recipientEmail) {
    if (typeof window.showToast === "function") {
      window.showToast("No recipient email address available for this message.", "warning");
    }
    return;
  }

  // 1. Immediately close the notification modal so it disappears as requested!
  closeNotificationModal();

  // 2. Also close the topbar notification dropdown flyout if open
  const menu = document.getElementById("notification-dropdown-menu");
  if (menu) {
    menu.style.display = "none";
  }

  // 3. Prepare official Paradox email parameters
  const officialEmail = "mail.paradox147@gmail.com";
  const reSubject = subject ? (subject.startsWith("Re:") ? subject : `Re: [Paradox-147] ${subject}`) : "Re: [Paradox-147] Inquiry";

  const safeSenderName = senderName || "Batchmate / Visitor";
  const cleanOriginalMsg = (originalMessage || "").trim();
  const quotedExcerpt = cleanOriginalMsg.length > 200 ? cleanOriginalMsg.slice(0, 200) + "..." : cleanOriginalMsg;

  const emailBody = 
`Dear ${safeSenderName},

Thank you for contacting the PARADOX-147 Honours Batch Committee (Department of Physics, Rajshahi College).

Regarding your message:
"${quotedExcerpt}"

[Write your reply here]

---
Official Communication from:
PARADOX-147 Batch Portal Administration
Department of Physics, Rajshahi College, Rajshahi-6000
Official Email: ${officialEmail}
Class Representative & Admin: MD. KHAIRUL ISLAM NAHID
Official Phone / WhatsApp: +8801859445559
Portal: https://iamnahidkhan.github.io/Paradoxian/`;

  // 4. Show informative toast
  if (typeof window.showToast === "function") {
    window.showToast(`Opening official reply composer from ${officialEmail}...`, "info", 4500);
  }

  // 5. Open email composer according to mode
  if (mode === 'gmail') {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(reSubject)}&cc=${encodeURIComponent(officialEmail)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, "_blank");
  } else {
    // Default mailto: protocol
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(reSubject)}&cc=${encodeURIComponent(officialEmail)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
  }
}

function handleOfficialReplyFromNotifId(notifId, mode = 'default') {
  const notif = (dashboardState.notifications || []).find(n => n.id === notifId);
  const ref = (notif && notif.referenceData) || {};
  const email = ref.email || (notif && notif.message && notif.message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]);
  const subject = ref.subject || notif?.title || "Batch Inquiry";
  const name = ref.name || "Batchmate";
  const message = ref.message || notif?.message || "";
  handleOfficialMailReply(email, subject, name, message, mode);
}

function handleOfficialReplyFromMessageId(messageId, mode = 'default') {
  const msg = (dashboardState.contactMessages || []).find(m => m.id === messageId);
  if (!msg) return;
  handleOfficialMailReply(msg.email, msg.subject, msg.name, msg.message, mode);
}

async function handleNotificationApproveMemory(memoryId, notifId) {
  try {
    await window.api.approveMemory(memoryId, dashboardState.currentUser);
    if (typeof window.showToast === "function") {
      window.showToast("Memory approved & published to public gallery!", "success");
    }
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
    if (dashboardState.currentTab === "memories" || dashboardState.currentTab === "cms") {
      renderDashboardUI();
    }
  } catch (err) {
    if (typeof window.showToast === "function") {
      window.showToast(err.message || "Failed to approve memory", "danger");
    }
  }
}

async function handleNotificationRejectMemory(memoryId, notifId) {
  const reason = prompt("Enter a brief reason for rejection:", "Does not adhere to batch portal guidelines");
  if (reason === null) return;
  try {
    await window.api.rejectMemory(memoryId, reason);
    if (typeof window.showToast === "function") {
      window.showToast("Memory contribution was rejected.", "info");
    }
    await refreshDashboardData();
    renderNotificationList();
    updateTopbarNotificationBadge();
    if (dashboardState.currentTab === "memories" || dashboardState.currentTab === "cms") {
      renderDashboardUI();
    }
  } catch (err) {
    if (typeof window.showToast === "function") {
      window.showToast(err.message || "Failed to reject memory", "danger");
    }
  }
}

document.addEventListener("click", (e) => {
  const menu = document.getElementById("notification-dropdown-menu");
  const bell = document.getElementById("topbar-notif-bell");
  if (menu && menu.style.display === "block") {
    if (!menu.contains(e.target) && !bell.contains(e.target)) {
      menu.style.display = "none";
    }
  }
});

/* ==========================================================================
   STUDENT & ADMIN DASHBOARD - CONTRIBUTE MEMORIES & MODERATION
   Dynamic Categories & Multi-Photo (Up to 50) Upload Support
   ========================================================================== */
let dashboardMemoryUploadedImages = []; // Array of Base64 strings (up to 50)

function resetDashMemoryFileInput() {
  dashboardMemoryUploadedImages = [];
  const fileInput = document.getElementById("dash-mem-file-input");
  const promptArea = document.getElementById("dash-mem-prompt");
  const previewContainer = document.getElementById("dash-mem-preview-container");
  const grid = document.getElementById("dash-mem-preview-grid");
  const badge = document.getElementById("dash-mem-photo-count-badge");
  const summary = document.getElementById("dash-mem-preview-summary");

  if (fileInput) fileInput.value = "";
  if (promptArea) promptArea.style.display = "block";
  if (previewContainer) previewContainer.style.display = "none";
  if (grid) grid.innerHTML = "";
  if (badge) {
    badge.textContent = "0 / 50 selected";
    badge.style.background = "";
    badge.style.color = "";
  }
  if (summary) summary.textContent = "";
}

function removeDashMemoryImage(index) {
  if (index >= 0 && index < dashboardMemoryUploadedImages.length) {
    dashboardMemoryUploadedImages.splice(index, 1);
    renderDashMemoryPreviewGrid();
  }
}

function renderDashMemoryPreviewGrid() {
  const container = document.getElementById("dash-mem-preview-container");
  const grid = document.getElementById("dash-mem-preview-grid");
  const badge = document.getElementById("dash-mem-photo-count-badge");
  const summary = document.getElementById("dash-mem-preview-summary");
  const promptArea = document.getElementById("dash-mem-prompt");

  if (badge) {
    badge.textContent = `${dashboardMemoryUploadedImages.length} / 50 selected`;
    if (dashboardMemoryUploadedImages.length >= 50) {
      badge.style.background = "var(--danger-500)";
      badge.style.color = "#fff";
    } else {
      badge.style.background = "";
      badge.style.color = "";
    }
  }

  if (dashboardMemoryUploadedImages.length === 0) {
    if (container) container.style.display = "none";
    if (promptArea) promptArea.style.display = "block";
    if (grid) grid.innerHTML = "";
    return;
  }

  if (promptArea) promptArea.style.display = "none";
  if (container) container.style.display = "block";

  if (summary) {
    summary.textContent = `${dashboardMemoryUploadedImages.length} photo${dashboardMemoryUploadedImages.length > 1 ? 's' : ''} ready to submit`;
  }

  if (grid) {
    grid.innerHTML = dashboardMemoryUploadedImages.map((src, idx) => `
      <div style="position: relative; width: 65px; height: 65px; border-radius: 4px; overflow: hidden; border: 1px solid var(--slate-300); background: #000;">
        <img src="${src}" alt="Photo ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" 
          onclick="event.stopPropagation(); removeDashMemoryImage(${idx});" 
          title="Remove photo" 
          style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.9); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; line-height: 1;">
          ✕
        </button>
        <span style="position: absolute; bottom: 2px; left: 3px; font-size: 9px; color: #fff; text-shadow: 0 1px 2px #000; font-weight: 700;">#${idx + 1}</span>
      </div>
    `).join('');
  }
}

function handleDashMemCategoryChange(selectElem) {
  const customGroup = document.getElementById("dash-mem-custom-category-group");
  const customInput = document.getElementById("dash-mem-custom-category");
  if (!customGroup) return;

  if (selectElem && selectElem.value === "__custom__") {
    customGroup.style.display = "block";
    if (customInput) customInput.focus();
  } else {
    customGroup.style.display = "none";
    if (customInput) customInput.value = "";
  }
}

function compressDashImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.75);
          resolve(compressed);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function renderMemoriesView(container) {
  const user = dashboardState.currentUser;
  const isAdminView = dashboardState.activeView === "admin";

  let myMemories = [];
  if (window.api && typeof window.api.getStudentMemories === "function") {
    myMemories = await window.api.getStudentMemories(user.id || user.roll);
  }
  let pendingList = [];
  let allGallery = [];
  if (isAdminView) {
    if (window.api && typeof window.api.getPendingMemories === "function") {
      pendingList = await window.api.getPendingMemories();
    }
    if (window.api && typeof window.api.getGallery === "function") {
      allGallery = await window.api.getGallery("All", true);
    }
  }

  // Fetch dynamic categories
  let categories = [];
  try {
    if (window.api && typeof window.api.getGalleryCategories === "function") {
      categories = await window.api.getGalleryCategories();
    }
  } catch (e) {}
  if (!categories || categories.length === 0) {
    categories = [
      "Orientation & Freshers",
      "Campus & Adda",
      "Study Tours & Picnic",
      "Tech Fest & Hackathons"
    ];
  }

  container.innerHTML = `
    <div style="max-width: 1050px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem;">
      
      <!-- Top Banner -->
      <div class="card" style="background: linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 100%); color: var(--white); padding: 2rem;">
        <div class="flex-between flex-wrap gap-2">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem;">
              <span class="badge badge-gold">${isAdminView ? "Admin & Moderation" : "Student Contributor"}</span>
              <span style="color:var(--slate-300); font-size:0.85rem;">Batch Chronicles</span>
            </div>
            <h2 style="color:var(--white); font-size:1.65rem; margin:0 0 0.4rem 0;">
              ${isAdminView ? "📸 Gallery & Batch Memories Moderation" : "📸 Contribute a Batch Memory"}
            </h2>
            <p style="color:var(--slate-300); font-size:0.92rem; margin:0; max-width:650px;">
              ${isAdminView 
                ? "Review and approve student-submitted memories, manage public gallery exhibitions, or publish new departmental moments (up to 50 photos per album)."
                : "Submit memories from physics lab experiments, campus addas, study tours, and batch picnics (up to 50 photos per memory). All submissions undergo admin approval before appearing on the public batch gallery."}
            </p>
          </div>
          <a href="gallery.html" target="_blank" class="btn btn-sm btn-outline-gold" style="font-weight:700;">
            View Public Gallery ↗
          </a>
        </div>
      </div>

      ${isAdminView && pendingList.length > 0 ? `
        <!-- ADMIN PENDING APPROVAL QUEUE -->
        <div class="card" style="border: 2px solid var(--gold-500); background: rgba(212,175,55,0.03);">
          <div class="card-header flex-between">
            <div>
              <h3 style="font-size:1.25rem; color:var(--navy-900); display:flex; align-items:center; gap:0.5rem;">
                ⏳ Pending Memories Awaiting Your Approval
                <span class="badge badge-gold">${pendingList.length} Pending</span>
              </h3>
              <p style="font-size:0.84rem; color:var(--slate-500); margin:0;">Approve valid student submissions to publish them to the live public gallery.</p>
            </div>
          </div>
          <div class="card-body">
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
              ${pendingList.map(m => {
                const photoCount = m.photoCount || (m.images ? m.images.length : 1);
                const isMulti = photoCount > 1;
                return `
                  <div style="background:var(--white); border:1px solid var(--slate-200); border-radius:var(--radius-md); overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.06); display:flex; flex-direction:column;">
                    <div style="height:170px; position:relative; overflow:hidden; background:var(--navy-950);">
                      <img src="${m.image || (m.images && m.images[0])}" alt="${escapeHtml(m.title)}" style="width:100%; height:100%; object-fit:cover;">
                      <span class="badge badge-gold" style="position:absolute; top:8px; left:8px; font-size:0.7rem;">${escapeHtml(m.category)}</span>
                      ${isMulti ? `
                        <span class="badge" style="position:absolute; top:8px; right:8px; font-size:0.7rem; background:rgba(10,25,47,0.85); color:#fff;">
                          📸 ${photoCount} Photos
                        </span>
                      ` : ''}
                    </div>
                    <div style="padding:1rem; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                      <div>
                        <h4 style="margin:0 0 0.35rem 0; font-size:1rem; color:var(--navy-900); line-height:1.3;">${escapeHtml(m.title)}</h4>
                        <div style="font-size:0.78rem; color:var(--slate-500); margin-bottom:0.4rem;">
                          📍 ${escapeHtml(m.location || 'Rajshahi College')} • 🗓️ ${escapeHtml(m.date || 'Recent')}
                        </div>
                        <div style="font-size:0.8rem; color:var(--slate-700); margin-bottom:0.6rem; line-height:1.4;">
                          ${escapeHtml(m.caption || m.details || 'No description provided.')}
                        </div>
                        ${m.otherInfo ? `<div style="font-size:0.75rem; color:var(--slate-500); font-style:italic; margin-bottom:0.6rem;">With: ${escapeHtml(m.otherInfo)}</div>` : ''}
                        <div style="font-size:0.75rem; background:var(--navy-50); padding:0.4rem 0.6rem; border-radius:var(--radius-sm); color:var(--navy-800); margin-bottom:0.75rem;">
                          Submitted by: <strong>${escapeHtml(m.submittedBy?.name || 'Student')}</strong> (Roll: ${escapeHtml(m.submittedBy?.roll || 'N/A')})
                        </div>
                      </div>
                      <div style="display:flex; gap:0.5rem; margin-top:auto;">
                        <button type="button" class="btn btn-xs btn-success" style="flex:1;" onclick="handleNotificationApproveMemory('${m.id}')">
                          ✅ Approve & Publish
                        </button>
                        <button type="button" class="btn btn-xs btn-outline-danger" onclick="handleNotificationRejectMemory('${m.id}')">
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- UPLOAD / CONTRIBUTE FORM CARD -->
      <div class="card">
        <div class="card-header">
          <h3 style="font-size:1.25rem;">
            ${isAdminView ? "Upload New Memory (Direct Publish)" : "Submit a Memory for Review"}
          </h3>
          <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">
            ${isAdminView ? "Admins can upload multi-photo albums (up to 50 photos) directly to the public batch gallery." : "Upload up to 50 photographs per memory. Only image files (PNG, JPG, JPEG, WEBP) are accepted."}
          </p>
        </div>
        <div class="card-body">
          <form id="dashboard-contribute-memory-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Memory Heading / Title <span style="color:var(--danger-500);">*</span></label>
                <input type="text" id="dash-mem-title" class="form-input" placeholder="e.g. Optics Lab Diffraction Experiment" required>
              </div>
              <div class="form-group">
                <label class="form-label">Date of Event <span style="color:var(--danger-500);">*</span></label>
                <input type="date" id="dash-mem-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Location / Spot <span style="color:var(--danger-500);">*</span></label>
                <input type="text" id="dash-mem-location" class="form-input" placeholder="e.g. Physics Department Room 204" required>
              </div>
              <div class="form-group">
                <label class="form-label">Album Category</label>
                <select id="dash-mem-category" class="form-select" onchange="handleDashMemCategoryChange(this)">
                  ${categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
                  <option value="__custom__" style="color:var(--gold-600); font-weight:700;">+ Add New Custom Category...</option>
                </select>
              </div>
            </div>

            <!-- Custom Category Inline Input -->
            <div class="form-group" id="dash-mem-custom-category-group" style="display: none;">
              <label class="form-label">Custom Category Name <span style="color:var(--danger-500);">*</span></label>
              <input type="text" id="dash-mem-custom-category" class="form-input" placeholder="e.g. Saint Martin Tour, Physics Cricket Cup, Farewell...">
            </div>

            <!-- Multi-Image File Picker (Up to 50 Images) -->
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                <label class="form-label" style="margin:0;">
                  Upload Photographs (Up to 50 images) <span style="color:var(--danger-500);">*</span>
                </label>
                <span id="dash-mem-photo-count-badge" class="badge badge-gold" style="font-size:0.75rem;">
                  0 / 50 selected
                </span>
              </div>
              <div style="border: 2px dashed var(--slate-300); border-radius: var(--radius-md); padding: 1.25rem; text-align: center; background: var(--navy-50); cursor: pointer;" onclick="document.getElementById('dash-mem-file-input').click()">
                <input type="file" id="dash-mem-file-input" multiple accept="image/png, image/jpeg, image/jpg, image/webp" style="display: none;">
                <div id="dash-mem-prompt">
                  <div style="font-size: 2rem; margin-bottom: 0.35rem;">🖼️</div>
                  <div style="font-weight: 600; color: var(--navy-900); font-size: 0.95rem;">Click to select photos (Up to 50 pictures)</div>
                  <div style="font-size: 0.78rem; color: var(--slate-500); margin-top: 0.2rem;">Select multiple photos at once • Accepts PNG, JPG, JPEG, WEBP</div>
                </div>
                <div id="dash-mem-upload-progress" style="display: none; padding: 0.5rem; font-size: 0.82rem; color: var(--gold-600); font-weight: 600;">
                  ⏳ Optimizing images...
                </div>
                <div id="dash-mem-preview-container" style="display: none; margin-top: 0.75rem; text-align: left;">
                  <div id="dash-mem-preview-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(65px, 1fr)); gap: 0.5rem; max-height: 180px; overflow-y: auto; padding: 0.35rem; background: var(--white); border-radius: var(--radius-sm); border: 1px solid var(--slate-200);">
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                    <span id="dash-mem-preview-summary" style="font-size: 0.76rem; color: var(--slate-600);"></span>
                    <div style="display:flex; gap:0.4rem;">
                      <button type="button" class="btn btn-xs btn-outline-navy" onclick="event.stopPropagation(); document.getElementById('dash-mem-file-input').click();">+ Add More</button>
                      <button type="button" class="btn btn-xs btn-outline-danger" onclick="event.stopPropagation(); resetDashMemoryFileInput();">Clear All</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Story / Details</label>
              <textarea id="dash-mem-details" rows="3" class="form-textarea" placeholder="Share the background story or funny memory..."></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Others Info / Batchmates Present</label>
              <input type="text" id="dash-mem-others" class="form-input" placeholder="e.g. Sakib, Tanvir, Nahid, Dr. Rafiq Sir">
            </div>

            ${!isAdminView ? `
              <div style="background: rgba(212,175,55,0.12); border-left: 3px solid var(--gold-500); padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem; font-size: 0.82rem; color: var(--navy-900);">
                🛡️ <strong>Notification Trigger:</strong> When you submit, the Class Representative / Administrator will immediately receive an alert in their dashboard notification center to review and approve your submission.
              </div>
            ` : ''}

            <button type="submit" id="dash-mem-submit-btn" class="btn btn-navy" style="font-weight: 700;">
              ${isAdminView ? "Publish Directly to Public Gallery 🚀" : "Submit for Admin Approval 🚀"}
            </button>
          </form>
        </div>
      </div>

      <!-- MY SUBMITTED MEMORIES (STUDENT VIEW) -->
      ${!isAdminView ? `
        <div class="card">
          <div class="card-header flex-between">
            <div>
              <h3 style="font-size: 1.25rem;">My Contributed Memories</h3>
              <p style="font-size: 0.85rem; color: var(--slate-500); margin: 0;">Track the approval status of your submitted photos.</p>
            </div>
            <span class="badge badge-gold">${myMemories.length} Submitted</span>
          </div>
          <div class="card-body">
            ${myMemories.length === 0 ? `
              <div style="text-align: center; padding: 2.5rem 1rem; color: var(--slate-500);">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📷</div>
                <h4 style="color: var(--navy-900); margin-bottom: 0.25rem;">You haven't contributed any memories yet</h4>
                <p style="font-size: 0.85rem; max-width: 400px; margin: 0 auto;">Use the form above to immortalize your favorite campus moments!</p>
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem;">
                ${myMemories.map(m => {
                  let statusBadge = `<span class="badge badge-warning">⏳ Pending Approval</span>`;
                  if (m.status === "Approved") statusBadge = `<span class="badge badge-success">✅ Approved</span>`;
                  if (m.status === "Rejected") statusBadge = `<span class="badge badge-danger">❌ Rejected</span>`;
                  const photoCount = m.photoCount || (m.images ? m.images.length : 1);
                  const isMulti = photoCount > 1;

                  return `
                    <div style="background: var(--white); border: 1px solid var(--slate-200); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column;">
                      <div style="height: 150px; position: relative; overflow: hidden; background: var(--navy-950);">
                        <img src="${m.image || (m.images && m.images[0])}" alt="${escapeHtml(m.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                        <div style="position: absolute; top: 8px; right: 8px;">${statusBadge}</div>
                        ${isMulti ? `
                          <span class="badge" style="position:absolute; bottom:8px; right:8px; font-size:0.7rem; background:rgba(10,25,47,0.85); color:#fff;">
                            📸 ${photoCount} Photos
                          </span>
                        ` : ''}
                      </div>
                      <div style="padding: 0.85rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                          <div style="font-size: 0.72rem; color: var(--gold-600); font-weight: 700; margin-bottom: 0.2rem;">${escapeHtml(m.category)}</div>
                          <h4 style="font-size: 0.95rem; margin: 0 0 0.35rem 0; color: var(--navy-900);">${escapeHtml(m.title)}</h4>
                          <div style="font-size: 0.78rem; color: var(--slate-500); margin-bottom: 0.4rem;">
                            🗓️ ${escapeHtml(m.date || 'N/A')} • 📍 ${escapeHtml(m.location || 'Campus')}
                          </div>
                          ${m.caption ? `<p style="font-size: 0.8rem; color: var(--slate-600); margin: 0 0 0.4rem 0; line-height: 1.35;">${escapeHtml(m.caption)}</p>` : ''}
                          ${m.status === "Rejected" && m.rejectionReason ? `
                            <div style="font-size: 0.75rem; color: var(--danger-500); background: var(--maroon-50); padding: 0.35rem 0.5rem; border-radius: var(--radius-sm);">
                              Reason: ${escapeHtml(m.rejectionReason)}
                            </div>
                          ` : ''}
                        </div>
                        <div style="display: flex; gap: 0.4rem; margin-top: 0.6rem;">
                          ${m.status === "Approved" ? `
                            <a href="gallery.html" target="_blank" class="btn btn-xs btn-outline-navy" style="flex: 1; text-align: center;">View in Gallery ↗</a>
                          ` : ''}
                          <button type="button" class="btn btn-xs ${m.status === 'Approved' ? 'btn-outline-navy' : 'btn-navy'}" style="flex: 1;" onclick="openEditGalleryMemoryModal('${m.id}')">
                            ✏️ Edit Details
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- ADMIN VIEW: ALL PUBLISHED GALLERY ITEMS -->
      ${isAdminView ? `
        <div class="card">
          <div class="card-header flex-between">
            <div>
              <h3 style="font-size: 1.25rem;">All Published Gallery Items</h3>
              <p style="font-size: 0.85rem; color: var(--slate-500); margin: 0;">Live items visible to visitors on gallery.html.</p>
            </div>
            <span class="badge badge-gold">${allGallery.length} Items</span>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem;">
              ${allGallery.map(m => {
                const photoCount = m.photoCount || (m.images ? m.images.length : 1);
                const isMulti = photoCount > 1;

                return `
                  <div style="background: var(--white); border: 1px solid var(--slate-200); border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column;">
                    <div style="height: 140px; position: relative; overflow: hidden; background: var(--navy-950);">
                      <img src="${m.image || (m.images && m.images[0])}" alt="${escapeHtml(m.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                      <span class="badge badge-gold" style="position: absolute; top: 6px; left: 6px; font-size: 0.68rem;">${escapeHtml(m.category)}</span>
                      ${isMulti ? `
                        <span class="badge" style="position:absolute; bottom:6px; right:6px; font-size:0.68rem; background:rgba(10,25,47,0.85); color:#fff;">
                          📸 ${photoCount}
                        </span>
                      ` : ''}
                    </div>
                    <div style="padding: 0.8rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <h4 style="font-size: 0.92rem; margin: 0 0 0.3rem 0; color: var(--navy-900);">${escapeHtml(m.title)}</h4>
                        <div style="font-size: 0.75rem; color: var(--slate-500); margin-bottom: 0.4rem;">
                          🗓️ ${escapeHtml(m.date || 'N/A')} • 📍 ${escapeHtml(m.location || 'Campus')}
                        </div>
                      </div>
                      <div style="display: flex; gap: 0.4rem; margin-top: 0.6rem;">
                        <button type="button" class="btn btn-xs btn-navy" style="flex: 1;" onclick="openEditGalleryMemoryModal('${m.id}')">
                          ✏️ Edit Memory
                        </button>
                        <button type="button" class="btn btn-xs btn-outline-danger" onclick="handleDeleteGalleryMemory('${m.id}')" title="Delete Memory">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}

    </div>
  `;

  setupDashboardMemoryFormListeners(isAdminView);
}

function setupDashboardMemoryFormListeners(isAdminView) {
  const fileInput = document.getElementById("dash-mem-file-input");
  const progressDiv = document.getElementById("dash-mem-upload-progress");
  const form = document.getElementById("dashboard-contribute-memory-form");

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const nonImages = files.filter(f => !f.type.startsWith("image/"));
      if (nonImages.length > 0) {
        window.showToast("Only image files (PNG, JPG, JPEG, WEBP) are allowed.", "danger");
        fileInput.value = "";
        return;
      }

      const availableSlots = 50 - dashboardMemoryUploadedImages.length;
      if (availableSlots <= 0) {
        window.showToast("You have already selected the maximum of 50 pictures.", "warning");
        fileInput.value = "";
        return;
      }

      let toProcess = files;
      if (files.length > availableSlots) {
        window.showToast(`Only ${availableSlots} more photo(s) can be added (Maximum 50 photos). Processing first ${availableSlots}.`, "warning");
        toProcess = files.slice(0, availableSlots);
      }

      if (progressDiv) {
        progressDiv.style.display = "block";
        progressDiv.textContent = `⏳ Optimizing 0 / ${toProcess.length} images...`;
      }

      let count = 0;
      for (const file of toProcess) {
        try {
          const compressed = await compressDashImageFile(file);
          dashboardMemoryUploadedImages.push(compressed);
          count++;
          if (progressDiv) {
            progressDiv.textContent = `⏳ Optimizing ${count} / ${toProcess.length} images...`;
          }
        } catch (err) {
          console.error("Dashboard image compression error:", err);
        }
      }

      if (progressDiv) progressDiv.style.display = "none";
      fileInput.value = "";
      renderDashMemoryPreviewGrid();

      window.showToast(`Added ${count} photo(s). Total: ${dashboardMemoryUploadedImages.length}/50`, "success");
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentUser = dashboardState.currentUser;
      const title = (document.getElementById("dash-mem-title")?.value || "").trim();
      const date = document.getElementById("dash-mem-date")?.value;
      const location = (document.getElementById("dash-mem-location")?.value || "").trim();
      const categorySelect = document.getElementById("dash-mem-category");
      let category = categorySelect ? categorySelect.value : "Campus & Adda";

      if (category === "__custom__") {
        const customCatInput = document.getElementById("dash-mem-custom-category");
        const customVal = customCatInput ? customCatInput.value.trim() : "";
        if (!customVal) {
          window.showToast("Please enter a custom category name.", "warning");
          if (customCatInput) customCatInput.focus();
          return;
        }
        category = customVal;
      }

      const details = (document.getElementById("dash-mem-details")?.value || "").trim();
      const others = (document.getElementById("dash-mem-others")?.value || "").trim();

      if (!title) {
        window.showToast("Memory heading is required.", "warning");
        return;
      }
      if (dashboardMemoryUploadedImages.length === 0) {
        window.showToast("Please upload at least one image file.", "warning");
        return;
      }
      if (dashboardMemoryUploadedImages.length > 50) {
        window.showToast("Maximum 50 pictures can be uploaded per memory.", "danger");
        return;
      }

      const submitBtn = document.getElementById("dash-mem-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = `Uploading ${dashboardMemoryUploadedImages.length} Photos...`;
      }

      try {
        if (isAdminView) {
          // Direct add for admin
          await window.api.addMemory({
            title,
            date,
            location: location || "Department of Physics, Rajshahi College",
            category,
            caption: details,
            images: dashboardMemoryUploadedImages,
            image: dashboardMemoryUploadedImages[0]
          });
          window.showToast(`Memory with ${dashboardMemoryUploadedImages.length} photo(s) published to live gallery!`, "success");
        } else {
          // Submit for admin review
          await window.api.submitMemory({
            title,
            date,
            location: location || "Department of Physics, Rajshahi College",
            category,
            details,
            otherInfo: others,
            images: dashboardMemoryUploadedImages,
            image: dashboardMemoryUploadedImages[0]
          }, currentUser);
          window.showToast(`Memory with ${dashboardMemoryUploadedImages.length} photo(s) submitted! Awaiting admin approval.`, "success");
        }

        form.reset();
        resetDashMemoryFileInput();
        await refreshDashboardData();
        renderDashboardUI();
      } catch (err) {
        console.error("Dashboard memory submission failed:", err);
        window.showToast(err.message || "Failed to submit memory", "danger");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = isAdminView ? "Publish Directly to Public Gallery 🚀" : "Submit for Admin Approval 🚀";
        }
      }
    });
  }
}

async function handleDeleteGalleryMemory(memoryId) {
  if (!confirm("Are you sure you want to remove this memory from the gallery?")) return;
  try {
    await window.api.deleteMemory(memoryId);
    window.showToast("Memory removed from gallery.", "info");
    await refreshDashboardData();
    renderDashboardUI();
  } catch (err) {
    window.showToast(err.message || "Failed to delete memory", "danger");
  }
}

/* ==========================================================================
   EDIT PUBLISHED / CONTRIBUTED GALLERY MEMORY MODAL CONTROLLER
   ========================================================================== */
let editMemoryUploadedImages = [];

async function openEditGalleryMemoryModal(memoryId) {
  const modal = document.getElementById("edit-gallery-modal");
  if (!modal) return;

  let memory = null;
  try {
    memory = await window.api.getMemoryById(memoryId);
  } catch (e) {
    console.error("Error fetching memory for edit:", e);
  }

  if (!memory) {
    window.showToast("Memory not found", "danger");
    return;
  }

  // Populate form fields
  const idInput = document.getElementById("edit-mem-id");
  const titleInput = document.getElementById("edit-mem-title");
  const dateInput = document.getElementById("edit-mem-date");
  const locInput = document.getElementById("edit-mem-location");
  const detailsInput = document.getElementById("edit-mem-details");
  const othersInput = document.getElementById("edit-mem-others");

  if (idInput) idInput.value = memory.id;
  if (titleInput) titleInput.value = memory.title || "";
  if (dateInput) dateInput.value = memory.date || new Date().toISOString().split("T")[0];
  if (locInput) locInput.value = memory.location || "";
  if (detailsInput) detailsInput.value = memory.caption || memory.details || "";
  if (othersInput) othersInput.value = memory.otherInfo || "";

  // Populate dynamic category dropdown
  const catSelect = document.getElementById("edit-mem-category");
  const customCatGroup = document.getElementById("edit-mem-custom-category-group");
  const customCatInput = document.getElementById("edit-mem-custom-category");

  let categories = [];
  try {
    categories = await window.api.getGalleryCategories();
  } catch {}
  if (!categories || categories.length === 0) {
    categories = ["Orientation & Freshers", "Campus & Adda", "Study Tours & Picnic", "Tech Fest & Hackathons"];
  }

  const currentCat = memory.category || "Campus & Adda";
  const isExistingCat = categories.some(c => c.toLowerCase() === currentCat.toLowerCase());

  let catOptionsHtml = categories.map(cat => `
    <option value="${escapeHtml(cat)}" ${cat.toLowerCase() === currentCat.toLowerCase() ? 'selected' : ''}>
      ${escapeHtml(cat)}
    </option>
  `).join('');

  catOptionsHtml += `
    <option value="__custom__" style="color:var(--gold-600); font-weight:700;" ${!isExistingCat ? 'selected' : ''}>
      + Add New Custom Category...
    </option>
  `;

  if (catSelect) catSelect.innerHTML = catOptionsHtml;

  if (!isExistingCat) {
    if (customCatGroup) customCatGroup.style.display = "block";
    if (customCatInput) customCatInput.value = currentCat;
  } else {
    if (customCatGroup) customCatGroup.style.display = "none";
    if (customCatInput) customCatInput.value = "";
  }

  // Populate images array
  if (Array.isArray(memory.images) && memory.images.length > 0) {
    editMemoryUploadedImages = [...memory.images];
  } else if (memory.image) {
    editMemoryUploadedImages = [memory.image];
  } else {
    editMemoryUploadedImages = [];
  }

  renderEditMemoryPreviewGrid();

  // Setup modal listeners if not already initialized
  setupEditGalleryMemoryModalListeners();

  modal.classList.add("active");
}

function closeEditGalleryMemoryModal() {
  const modal = document.getElementById("edit-gallery-modal");
  if (modal) modal.classList.remove("active");
}

function handleEditMemCategoryChange(selectElem) {
  const customGroup = document.getElementById("edit-mem-custom-category-group");
  const customInput = document.getElementById("edit-mem-custom-category");
  if (!customGroup) return;

  if (selectElem && selectElem.value === "__custom__") {
    customGroup.style.display = "block";
    if (customInput) customInput.focus();
  } else {
    customGroup.style.display = "none";
    if (customInput) customInput.value = "";
  }
}

function renderEditMemoryPreviewGrid() {
  const grid = document.getElementById("edit-mem-preview-grid");
  const countSpan = document.getElementById("edit-mem-photo-count");
  const summarySpan = document.getElementById("edit-mem-preview-summary");

  if (countSpan) countSpan.textContent = editMemoryUploadedImages.length;
  if (summarySpan) {
    summarySpan.textContent = `${editMemoryUploadedImages.length} photo${editMemoryUploadedImages.length !== 1 ? 's' : ''} in album`;
  }

  if (!grid) return;

  if (editMemoryUploadedImages.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 1.5rem; color: var(--slate-500); font-size: 0.85rem;">
        No photos attached. Click "+ Add Photos" above to select images.
      </div>
    `;
    return;
  }

  grid.innerHTML = editMemoryUploadedImages.map((src, idx) => `
    <div style="position: relative; width: 65px; height: 65px; border-radius: 4px; overflow: hidden; border: 1px solid var(--slate-300); background: #000;">
      <img src="${src}" alt="Photo ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
      <button type="button" 
        onclick="event.stopPropagation(); removeEditMemoryImage(${idx});" 
        title="Remove photo" 
        style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.9); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; line-height: 1;">
        ✕
      </button>
      <span style="position: absolute; bottom: 2px; left: 3px; font-size: 9px; color: #fff; text-shadow: 0 1px 2px #000; font-weight: 700;">#${idx + 1}</span>
    </div>
  `).join('');
}

function removeEditMemoryImage(index) {
  if (index >= 0 && index < editMemoryUploadedImages.length) {
    editMemoryUploadedImages.splice(index, 1);
    renderEditMemoryPreviewGrid();
  }
}

function clearAllEditMemoryImages() {
  if (confirm("Remove all photos from this memory? You will need to add at least one photo before saving.")) {
    editMemoryUploadedImages = [];
    renderEditMemoryPreviewGrid();
  }
}

let editMemoryModalInitialized = false;
function setupEditGalleryMemoryModalListeners() {
  if (editMemoryModalInitialized) return;
  editMemoryModalInitialized = true;

  const fileInput = document.getElementById("edit-mem-file-input");
  const progressDiv = document.getElementById("edit-mem-upload-progress");
  const form = document.getElementById("edit-gallery-form");

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const nonImages = files.filter(f => !f.type.startsWith("image/"));
      if (nonImages.length > 0) {
        window.showToast("Only image files (PNG, JPG, JPEG, WEBP) are allowed.", "danger");
        fileInput.value = "";
        return;
      }

      const availableSlots = 50 - editMemoryUploadedImages.length;
      if (availableSlots <= 0) {
        window.showToast("Maximum of 50 photos reached.", "warning");
        fileInput.value = "";
        return;
      }

      let toProcess = files;
      if (files.length > availableSlots) {
        window.showToast(`Only ${availableSlots} more photo(s) can be added (Max 50). Processing first ${availableSlots}.`, "warning");
        toProcess = files.slice(0, availableSlots);
      }

      if (progressDiv) {
        progressDiv.style.display = "block";
        progressDiv.textContent = `⏳ Optimizing 0 / ${toProcess.length} images...`;
      }

      let count = 0;
      for (const file of toProcess) {
        try {
          const compressed = await compressDashImageFile(file);
          editMemoryUploadedImages.push(compressed);
          count++;
          if (progressDiv) {
            progressDiv.textContent = `⏳ Optimizing ${count} / ${toProcess.length} images...`;
          }
        } catch (err) {
          console.error("Edit image compression error:", err);
        }
      }

      if (progressDiv) progressDiv.style.display = "none";
      fileInput.value = "";
      renderEditMemoryPreviewGrid();

      window.showToast(`Added ${count} photo(s). Total: ${editMemoryUploadedImages.length}/50`, "success");
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const memoryId = document.getElementById("edit-mem-id")?.value;
      const title = (document.getElementById("edit-mem-title")?.value || "").trim();
      const date = document.getElementById("edit-mem-date")?.value;
      const location = (document.getElementById("edit-mem-location")?.value || "").trim();
      const categorySelect = document.getElementById("edit-mem-category");
      let category = categorySelect ? categorySelect.value : "Campus & Adda";

      if (category === "__custom__") {
        const customCatInput = document.getElementById("edit-mem-custom-category");
        const customVal = customCatInput ? customCatInput.value.trim() : "";
        if (!customVal) {
          window.showToast("Please enter a custom category name.", "warning");
          if (customCatInput) customCatInput.focus();
          return;
        }
        category = customVal;
      }

      const details = (document.getElementById("edit-mem-details")?.value || "").trim();
      const others = (document.getElementById("edit-mem-others")?.value || "").trim();

      if (!title) {
        window.showToast("Memory heading is required.", "warning");
        return;
      }
      if (editMemoryUploadedImages.length === 0) {
        window.showToast("At least one image is required.", "warning");
        return;
      }
      if (editMemoryUploadedImages.length > 50) {
        window.showToast("Maximum 50 pictures allowed per memory.", "danger");
        return;
      }

      const submitBtn = document.getElementById("edit-mem-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving changes...";
      }

      try {
        await window.api.updateMemory(memoryId, {
          title,
          date,
          location,
          category,
          caption: details,
          otherInfo: others,
          images: editMemoryUploadedImages
        });

        window.showToast("Published memory updated successfully!", "success");
        closeEditGalleryMemoryModal();
        await refreshDashboardData();
        renderDashboardUI();
      } catch (err) {
        console.error("Failed to update memory:", err);
        window.showToast(err.message || "Failed to update memory", "danger");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save & Update Memory 💾";
        }
      }
    });
  }
}

/* ==========================================================================
   ADMIN SITE CONTENT MANAGER CMS VIEW (TAB: 'cms')
   ========================================================================== */
async function renderCMSView(container) {
  if (!isUserAdminAccount(dashboardState.currentUser)) {
    window.showToast("Access Denied: Only Administrator can access Site Content Manager", "danger");
    dashboardState.currentTab = "overview";
    renderDashboardUI();
    return;
  }

  const content = await window.api.getSiteContent();
  const activeSection = dashboardState.cmsActiveSection || "home";

  let galleryCategories = [];
  try {
    if (window.api && typeof window.api.getGalleryCategories === "function") {
      galleryCategories = await window.api.getGalleryCategories();
    }
  } catch (e) {}
  if (!galleryCategories || galleryCategories.length === 0) {
    galleryCategories = [
      "Orientation & Freshers",
      "Campus & Adda",
      "Study Tours & Picnic",
      "Tech Fest & Hackathons"
    ];
  }

  const home = content.home || {};
  const about = content.about || {};
  const students = content.students || {};
  const gallery = content.gallery || {};
  const notice = content.notice || {};
  const contacts = content.contacts || {};

  container.innerHTML = `
    <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem;">
      
      <!-- Top Banner -->
      <div class="card" style="background: linear-gradient(135deg, var(--navy-950) 0%, var(--navy-900) 100%); color: var(--white); padding: 2rem;">
        <div class="flex-between flex-wrap gap-2">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.3rem;">
              <span class="badge badge-gold">Admin CMS</span>
              <span style="color:var(--slate-300); font-size:0.85rem;">Live Site Editor</span>
            </div>
            <h2 style="color:var(--white); font-size:1.65rem; margin:0 0 0.4rem 0;">🌐 Site Content Manager</h2>
            <p style="color:var(--slate-300); font-size:0.92rem; margin:0; max-width:650px;">
              Edit headings, mottos, descriptions, and contact info across the public portal. Changes take effect immediately across all visitor pages.
            </p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <a href="index.html" target="_blank" class="btn btn-sm btn-outline-gold" style="font-weight:700;">
              Preview Public Site ↗
            </a>
          </div>
        </div>
      </div>

      <!-- CMS Navigation Sub-Tabs -->
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; background: var(--white); padding: 0.6rem; border-radius: var(--radius-md); border: 1px solid var(--slate-200);">
        <button type="button" class="btn btn-sm ${activeSection === 'home' ? 'btn-navy' : 'btn-ghost'}" onclick="switchCMSSection('home')">
          🏠 Home Page
        </button>
        <button type="button" class="btn btn-sm ${activeSection === 'about' ? 'btn-navy' : 'btn-ghost'}" onclick="switchCMSSection('about')">
          ℹ️ About Section
        </button>
        <button type="button" class="btn btn-sm ${activeSection === 'students' ? 'btn-navy' : 'btn-ghost'}" onclick="switchCMSSection('students')">
          👨‍🎓 Students Directory
        </button>
        <button type="button" class="btn btn-sm ${activeSection === 'gallery' ? 'btn-navy' : 'btn-ghost'}" onclick="switchCMSSection('gallery')">
          📸 Gallery & Memories
        </button>
        <button type="button" class="btn btn-sm ${activeSection === 'notice' ? 'btn-navy' : 'btn-ghost'}" onclick="switchCMSSection('notice')">
          📢 Notice Board
        </button>
        <button type="button" class="btn btn-sm ${activeSection === 'contacts' ? 'btn-navy' : 'btn-ghost'}" onclick="switchCMSSection('contacts')">
          📞 Contacts & CR
        </button>
      </div>

      <!-- CMS Forms -->
      <div class="card">
        <div class="card-body">
          
          <!-- 1. HOME SECTION FORM -->
          ${activeSection === 'home' ? `
            <form id="cms-home-form">
              <div class="card-header" style="padding-left:0; padding-right:0; padding-top:0;">
                <h3 style="font-size:1.25rem;">🏠 Edit Home Page Content</h3>
                <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Configure hero headers, motto quotes, and call-to-actions on index.html.</p>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Hero Badge / Session Tag</label>
                  <input type="text" id="cms-home-badge" class="form-input" value="${escapeHtml(home.heroBadge || '')}">
                </div>
                <div class="form-group">
                  <label class="form-label">Hero Title (Main Brand)</label>
                  <input type="text" id="cms-home-title" class="form-input" value="${escapeHtml(home.heroTitle || 'PARADOX-147')}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Hero Subtitle</label>
                <input type="text" id="cms-home-subtitle" class="form-input" value="${escapeHtml(home.heroSubtitle || '')}">
              </div>

              <div class="form-group">
                <label class="form-label">Hero Description Paragraph</label>
                <textarea id="cms-home-desc" rows="3" class="form-textarea">${escapeHtml(home.heroDesc || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Batch Motto Quote</label>
                <input type="text" id="cms-home-motto" class="form-input" value="${escapeHtml(home.motto || '')}">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Primary CTA Button Label</label>
                  <input type="text" id="cms-home-cta-primary" class="form-input" value="${escapeHtml(home.ctaPrimary || 'Explore Directory')}">
                </div>
                <div class="form-group">
                  <label class="form-label">Secondary CTA Button Label</label>
                  <input type="text" id="cms-home-cta-secondary" class="form-input" value="${escapeHtml(home.ctaSecondary || 'Notice Board')}">
                </div>
              </div>

              <button type="submit" class="btn btn-navy" style="font-weight:700;">
                Save Home Page Content
              </button>
            </form>
          ` : ''}

          <!-- 2. ABOUT SECTION FORM -->
          ${activeSection === 'about' ? `
            <form id="cms-about-form">
              <div class="card-header" style="padding-left:0; padding-right:0; padding-top:0;">
                <h3 style="font-size:1.25rem;">ℹ️ Edit About Section Content</h3>
                <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Update batch history, department description, and vision on the About section.</p>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Section Tag Badge</label>
                  <input type="text" id="cms-about-badge" class="form-input" value="${escapeHtml(about.badge || 'About Paradox-147')}">
                </div>
                <div class="form-group">
                  <label class="form-label">Section Heading</label>
                  <input type="text" id="cms-about-title" class="form-input" value="${escapeHtml(about.title || 'A Beautiful Contradiction of Chaos and Brilliance')}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Batch Description & History</label>
                <textarea id="cms-about-desc" rows="4" class="form-textarea">${escapeHtml(about.description || '')}</textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <input type="text" id="cms-about-department" class="form-input" value="${escapeHtml(about.department || 'Department of Physics, Rajshahi College')}">
                </div>
                <div class="form-group">
                  <label class="form-label">Batch Session</label>
                  <input type="text" id="cms-about-session" class="form-input" value="${escapeHtml(about.session || '2024-25 Session')}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Vision & Mission</label>
                <textarea id="cms-about-vision" rows="3" class="form-textarea">${escapeHtml(about.vision || '')}</textarea>
              </div>

              <button type="submit" class="btn btn-navy" style="font-weight:700;">
                Save About Section Content
              </button>
            </form>
          ` : ''}

          <!-- 3. STUDENTS DIRECTORY FORM -->
          ${activeSection === 'students' ? `
            <form id="cms-students-form">
              <div class="card-header" style="padding-left:0; padding-right:0; padding-top:0;">
                <h3 style="font-size:1.25rem;">👨‍🎓 Edit Students Directory Page Content</h3>
                <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Configure headlines and descriptions on students.html.</p>
              </div>

              <div class="form-group">
                <label class="form-label">Directory Page Heading</label>
                <input type="text" id="cms-students-title" class="form-input" value="${escapeHtml(students.title || 'Student Directory')}">
              </div>

              <div class="form-group">
                <label class="form-label">Directory Subtitle / Tagline</label>
                <input type="text" id="cms-students-subtitle" class="form-input" value="${escapeHtml(students.subtitle || '')}">
              </div>

              <div class="form-group">
                <label class="form-label">Welcome / Search Instructions</label>
                <textarea id="cms-students-desc" rows="3" class="form-textarea">${escapeHtml(students.description || '')}</textarea>
              </div>

              <button type="submit" class="btn btn-navy" style="font-weight:700;">
                Save Students Directory Content
              </button>
            </form>
          ` : ''}

          <!-- 4. GALLERY PAGE FORM & CATEGORIES MANAGER -->
          ${activeSection === 'gallery' ? `
            <form id="cms-gallery-form">
              <div class="card-header" style="padding-left:0; padding-right:0; padding-top:0;">
                <h3 style="font-size:1.25rem;">📸 Edit Gallery Page Content</h3>
                <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Configure album titles, subtitles, and contribution guidelines on gallery.html.</p>
              </div>

              <div class="form-group">
                <label class="form-label">Gallery Page Title</label>
                <input type="text" id="cms-gallery-title" class="form-input" value="${escapeHtml(gallery.title || 'Memories & Milestones')}">
              </div>

              <div class="form-group">
                <label class="form-label">Gallery Subtitle</label>
                <textarea id="cms-gallery-subtitle" rows="3" class="form-textarea">${escapeHtml(gallery.subtitle || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Contribution Notice Banner</label>
                <input type="text" id="cms-gallery-notice" class="form-input" value="${escapeHtml(gallery.contributeNotice || 'Share your moments and memories with Paradox-147.')}">
              </div>

              <button type="submit" class="btn btn-navy" style="font-weight:700;">
                Save Gallery Page Content
              </button>
            </form>

            <!-- CUSTOM ALBUM CATEGORIES MANAGER -->
            <div style="margin-top: 2rem; border-top: 1px solid var(--slate-200); padding-top: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <h4 style="font-size: 1.15rem; color: var(--navy-900); margin: 0 0 0.2rem 0;">🏷️ Custom Album Categories Manager</h4>
                  <p style="font-size: 0.82rem; color: var(--slate-600); margin: 0;">Add, remove, or customize categories. These automatically power the gallery filter tabs and submission dropdowns.</p>
                </div>
                <span class="badge badge-gold">${galleryCategories.length} Categories</span>
              </div>

              <!-- Active Category Badges -->
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0 1.25rem 0;">
                ${galleryCategories.map(cat => `
                  <span class="badge" style="background: var(--navy-50); color: var(--navy-900); border: 1px solid var(--slate-300); padding: 0.45rem 0.85rem; font-size: 0.84rem; display: inline-flex; align-items: center; gap: 0.5rem; border-radius: 9999px;">
                    <span>📁 ${escapeHtml(cat)}</span>
                    <button type="button" onclick="handleDeleteCMSCategory('${escapeHtml(cat)}')" title="Delete Category" style="background: none; border: none; color: var(--danger-500); cursor: pointer; padding: 0; font-size: 1rem; line-height: 1; font-weight: 700;">&times;</button>
                  </span>
                `).join('')}
              </div>

              <!-- Add New Category Inline Form -->
              <div style="background: var(--navy-50); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--navy-100);">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 0.4rem;">Create New Custom Category</label>
                <div style="display: flex; gap: 0.75rem; align-items: center; max-width: 520px;">
                  <input type="text" id="cms-new-category-input" class="form-input" placeholder="e.g. Physics Picnic 2026, Sports Week..." style="background:#fff;">
                  <button type="button" class="btn btn-sm btn-navy" onclick="handleAddCMSCategory()" style="white-space: nowrap; height: 38px; font-weight: 600;">
                    + Add Category
                  </button>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- 5. NOTICE BOARD FORM -->
          ${activeSection === 'notice' ? `
            <form id="cms-notice-form">
              <div class="card-header" style="padding-left:0; padding-right:0; padding-top:0;">
                <h3 style="font-size:1.25rem;">📢 Edit Notice Board Page Content</h3>
                <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Configure headlines and bulletins on notices.html.</p>
              </div>

              <div class="form-group">
                <label class="form-label">Notice Board Title</label>
                <input type="text" id="cms-notice-title" class="form-input" value="${escapeHtml(notice.title || 'Official Notices & Circulars')}">
              </div>

              <div class="form-group">
                <label class="form-label">Notice Board Subtitle</label>
                <textarea id="cms-notice-subtitle" rows="3" class="form-textarea">${escapeHtml(notice.subtitle || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Emergency Bulletin Notice Banner</label>
                <input type="text" id="cms-notice-emergency" class="form-input" value="${escapeHtml(notice.emergencyNotice || 'Always verify dates with the official department board.')}">
              </div>

              <button type="submit" class="btn btn-navy" style="font-weight:700;">
                Save Notice Board Content
              </button>
            </form>
          ` : ''}

          <!-- 6. CONTACTS & CR FORM -->
          ${activeSection === 'contacts' ? `
            <form id="cms-contacts-form">
              <div class="card-header" style="padding-left:0; padding-right:0; padding-top:0;">
                <h3 style="font-size:1.25rem;">📞 Edit Contacts & CR Information</h3>
                <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Update official portal email, CR contact details, and department address.</p>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Official Batch Portal Email</label>
                  <input type="email" id="cms-contacts-email" class="form-input" value="${escapeHtml(contacts.email || 'mail.paradox147@gmail.com')}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Class Representative (CR) Full Name</label>
                  <input type="text" id="cms-contacts-cr-name" class="form-input" value="${escapeHtml(contacts.crName || 'MD. KHAIRUL ISLAM NAHID')}" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">CR Official Phone / WhatsApp</label>
                  <input type="text" id="cms-contacts-cr-phone" class="form-input" value="${escapeHtml(contacts.crPhone || '+8801859445559')}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">CR Official Role / Designation</label>
                  <input type="text" id="cms-contacts-cr-role" class="form-input" value="${escapeHtml(contacts.crRole || 'Class Representative & Administrator')}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Official Department Address</label>
                <textarea id="cms-contacts-address" rows="3" class="form-textarea">${escapeHtml(contacts.address || 'Department of Physics, Rajshahi College, Rajshahi-6000, Bangladesh')}</textarea>
              </div>

              <button type="submit" class="btn btn-navy" style="font-weight:700;">
                Save Contacts Information
              </button>
            </form>

            <!-- Received Inquiries & Messages Panel -->
            <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--slate-200);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <div>
                  <h4 style="font-size:1.15rem; color:var(--navy-900); margin:0;">📥 Received Contact Inquiries & Messages</h4>
                  <p style="font-size:0.8rem; color:var(--slate-500); margin:0.2rem 0 0 0;">Messages submitted by visitors and batchmates via the public contact section.</p>
                </div>
                <span class="badge badge-gold" style="font-size:0.75rem;">${(dashboardState.contactMessages || []).length} Received</span>
              </div>

              ${(dashboardState.contactMessages || []).length === 0 ? `
                <div style="text-align:center; padding:2rem; background:var(--slate-50); border-radius:var(--radius-md); color:var(--slate-500); font-size:0.85rem; border:1px dashed var(--slate-200);">
                  <div style="font-size:1.8rem; margin-bottom:0.35rem;">📭</div>
                  No inquiries received yet. When visitors submit the contact form, their messages will appear here and in the topbar notification bell!
                </div>
              ` : `
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                  ${(dashboardState.contactMessages || []).map(m => `
                    <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-sm); padding:1rem;">
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
                        <div>
                          <strong style="font-size:0.92rem; color:var(--navy-900);">${escapeHtml(m.subject)}</strong>
                          <div style="font-size:0.78rem; color:var(--slate-500); margin-top:0.2rem;">
                            From <strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.email)})${m.phone ? ` • 📞 ${escapeHtml(m.phone)}` : ''}
                          </div>
                        </div>
                        <span style="font-size:0.72rem; color:var(--slate-400);">
                          ${new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style="background:var(--white); padding:0.6rem 0.85rem; border-radius:4px; font-size:0.83rem; color:var(--slate-700); line-height:1.45; border-left:3px solid var(--gold-500); white-space:pre-wrap; margin-bottom:0.6rem;">${escapeHtml(m.message)}</div>
                      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        ${m.email && m.email.includes('@') ? `
                          <button type="button" class="btn btn-xs btn-navy" style="display:inline-flex; align-items:center; gap:0.25rem;" onclick="handleOfficialReplyFromMessageId('${m.id}', 'default')" title="Reply from mail.paradox147@gmail.com">
                            ✉️ Reply from mail.paradox147@gmail.com
                          </button>
                          <button type="button" class="btn btn-xs btn-outline-navy" style="display:inline-flex; align-items:center; gap:0.25rem;" onclick="handleOfficialReplyFromMessageId('${m.id}', 'gmail')" title="Open Gmail Web with official signature">
                            🌐 Gmail Web
                          </button>
                        ` : ''}
                        ${m.phone ? `
                          <a href="tel:${escapeHtml(m.phone)}" class="btn btn-xs btn-outline-navy" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.25rem;">
                            📞 Call (${escapeHtml(m.phone)})
                          </a>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          ` : ''}

        </div>
      </div>

    </div>
  `;

  setupCMSFormListeners(activeSection);
}

function switchCMSSection(section) {
  dashboardState.cmsActiveSection = section;
  const container = document.getElementById("dashboard-view-container");
  if (container) renderCMSView(container);
}

function setupCMSFormListeners(activeSection) {
  if (activeSection === "home") {
    const form = document.getElementById("cms-home-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await window.api.updateSiteContent("home", {
            heroBadge: document.getElementById("cms-home-badge")?.value.trim(),
            heroTitle: document.getElementById("cms-home-title")?.value.trim(),
            heroSubtitle: document.getElementById("cms-home-subtitle")?.value.trim(),
            heroDesc: document.getElementById("cms-home-desc")?.value.trim(),
            motto: document.getElementById("cms-home-motto")?.value.trim(),
            ctaPrimary: document.getElementById("cms-home-cta-primary")?.value.trim(),
            ctaSecondary: document.getElementById("cms-home-cta-secondary")?.value.trim()
          });
          window.showToast("Home page content updated successfully!", "success");
        } catch (err) {
          window.showToast(err.message || "Failed to update home content", "danger");
        }
      });
    }
  }

  if (activeSection === "about") {
    const form = document.getElementById("cms-about-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await window.api.updateSiteContent("about", {
            badge: document.getElementById("cms-about-badge")?.value.trim(),
            title: document.getElementById("cms-about-title")?.value.trim(),
            description: document.getElementById("cms-about-desc")?.value.trim(),
            department: document.getElementById("cms-about-department")?.value.trim(),
            session: document.getElementById("cms-about-session")?.value.trim(),
            vision: document.getElementById("cms-about-vision")?.value.trim()
          });
          window.showToast("About section content updated successfully!", "success");
        } catch (err) {
          window.showToast(err.message || "Failed to update about content", "danger");
        }
      });
    }
  }

  if (activeSection === "students") {
    const form = document.getElementById("cms-students-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await window.api.updateSiteContent("students", {
            title: document.getElementById("cms-students-title")?.value.trim(),
            subtitle: document.getElementById("cms-students-subtitle")?.value.trim(),
            description: document.getElementById("cms-students-desc")?.value.trim()
          });
          window.showToast("Students directory content updated successfully!", "success");
        } catch (err) {
          window.showToast(err.message || "Failed to update students content", "danger");
        }
      });
    }
  }

  if (activeSection === "gallery") {
    const form = document.getElementById("cms-gallery-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await window.api.updateSiteContent("gallery", {
            title: document.getElementById("cms-gallery-title")?.value.trim(),
            subtitle: document.getElementById("cms-gallery-subtitle")?.value.trim(),
            contributeNotice: document.getElementById("cms-gallery-notice")?.value.trim()
          });
          window.showToast("Gallery page content updated successfully!", "success");
        } catch (err) {
          window.showToast(err.message || "Failed to update gallery content", "danger");
        }
      });
    }
  }

  if (activeSection === "notice") {
    const form = document.getElementById("cms-notice-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await window.api.updateSiteContent("notice", {
            title: document.getElementById("cms-notice-title")?.value.trim(),
            subtitle: document.getElementById("cms-notice-subtitle")?.value.trim(),
            emergencyNotice: document.getElementById("cms-notice-emergency")?.value.trim()
          });
          window.showToast("Notice board content updated successfully!", "success");
        } catch (err) {
          window.showToast(err.message || "Failed to update notice content", "danger");
        }
      });
    }
  }

  if (activeSection === "contacts") {
    const form = document.getElementById("cms-contacts-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await window.api.updateSiteContent("contacts", {
            email: document.getElementById("cms-contacts-email")?.value.trim(),
            crName: document.getElementById("cms-contacts-cr-name")?.value.trim(),
            crPhone: document.getElementById("cms-contacts-cr-phone")?.value.trim(),
            crRole: document.getElementById("cms-contacts-cr-role")?.value.trim(),
            address: document.getElementById("cms-contacts-address")?.value.trim()
          });
          window.showToast("Contacts information updated successfully!", "success");
        } catch (err) {
          window.showToast(err.message || "Failed to update contacts", "danger");
        }
      });
    }
  }
}


async function handleAddCMSCategory() {
  const input = document.getElementById("cms-new-category-input");
  const name = input ? input.value.trim() : "";
  if (!name) {
    window.showToast("Please enter a category name.", "warning");
    if (input) input.focus();
    return;
  }
  try {
    await window.api.addGalleryCategory(name);
    window.showToast(`Category "${name}" created successfully!`, "success");
    const container = document.getElementById("dashboard-view-container");
    if (container) renderCMSView(container);
  } catch (err) {
    window.showToast(err.message || "Failed to add category", "danger");
  }
}

async function handleDeleteCMSCategory(categoryName) {
  if (!confirm(`Are you sure you want to remove the category "${categoryName}"?`)) return;
  try {
    await window.api.deleteGalleryCategory(categoryName);
    window.showToast(`Category "${categoryName}" removed.`, "info");
    const container = document.getElementById("dashboard-view-container");
    if (container) renderCMSView(container);
  } catch (err) {
    window.showToast(err.message || "Failed to delete category", "danger");
  }
}

window.openExportRosterModal = openExportRosterModal;
window.closeExportRosterModal = closeExportRosterModal;
window.updateExportRosterPreview = updateExportRosterPreview;
window.getSortedFilteredStudents = getSortedFilteredStudents;
window.downloadStudentRosterPDF = downloadStudentRosterPDF;
window.printStudentRosterHTML = printStudentRosterHTML;
window.calculateSingleRowOptimalWidths = calculateSingleRowOptimalWidths;
window.switchOfficeTab = switchOfficeTab;
window.selectOfficeTheme = selectOfficeTheme;
window.toggleAutoFit = toggleAutoFit;
window.stepColWidth = stepColWidth;
window.onManualColWidthChange = onManualColWidthChange;
window.onOfficeConfigChange = onOfficeConfigChange;
window.resetToOfficeDefaults = resetToOfficeDefaults;
window.resetColumnWidths = resetColumnWidths;
window.refreshDashboardData = refreshDashboardData;
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.handleMarkSingleNotificationRead = handleMarkSingleNotificationRead;
window.handleNotificationApproveMemory = handleNotificationApproveMemory;
window.handleNotificationRejectMemory = handleNotificationRejectMemory;
window.resetDashMemoryFileInput = resetDashMemoryFileInput;
window.removeDashMemoryImage = removeDashMemoryImage;
window.handleDashMemCategoryChange = handleDashMemCategoryChange;
window.handleDeleteGalleryMemory = handleDeleteGalleryMemory;
window.switchCMSSection = switchCMSSection;
window.handleAddCMSCategory = handleAddCMSCategory;
window.handleDeleteCMSCategory = handleDeleteCMSCategory;
window.openEditGalleryMemoryModal = openEditGalleryMemoryModal;
window.closeEditGalleryMemoryModal = closeEditGalleryMemoryModal;
window.handleEditMemCategoryChange = handleEditMemCategoryChange;
window.removeEditMemoryImage = removeEditMemoryImage;
window.clearAllEditMemoryImages = clearAllEditMemoryImages;
window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.handleModalToggleReadNotification = handleModalToggleReadNotification;
window.handleModalDeleteNotification = handleModalDeleteNotification;
window.handleDeleteNotification = handleDeleteNotification;
window.handleToggleSingleNotificationRead = handleToggleSingleNotificationRead;
window.handleClearReadNotifications = handleClearReadNotifications;
window.setNotificationCategoryFilter = setNotificationCategoryFilter;
window.setNotificationStatusFilter = setNotificationStatusFilter;
window.handleOfficialMailReply = handleOfficialMailReply;
window.handleOfficialReplyFromNotifId = handleOfficialReplyFromNotifId;
window.handleOfficialReplyFromMessageId = handleOfficialReplyFromMessageId;





