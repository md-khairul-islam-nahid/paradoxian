/* ==========================================================================
   PARADOXIAN '26 - GLOBAL CORE JAVASCRIPT
   Mobile Menu, Sticky Header, Toast Engine, PDF Simulator & Shared Handlers
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initToastContainer();
  initNewsletter();
  initAuthGuards();
  updateAuthUI();
  initSiteContentCMS();
  initContactForm();
});

/* --------------------------------------------------------------------------
   GLOBAL AUTHENTICATION & ACCESS GUARD
   -------------------------------------------------------------------------- */
function initAuthGuards() {
  document.addEventListener("click", (e) => {
    const dashboardLink = e.target.closest('a[href*="dashboard.html"]');
    if (dashboardLink) {
      const currentUser = window.api ? window.api.getCurrentUser() : null;
      if (!currentUser) {
        e.preventDefault();
        e.stopPropagation();
        sessionStorage.setItem("auth_redirect_reason", "Sign in required to access Dashboard.");
        window.showToast("Authentication required: Please sign in or register to access the dashboard.", "warning", 3500);
        setTimeout(() => {
          window.location.href = "login.html?redirect=dashboard";
        }, 350);
      }
    }
  });
}

/* --------------------------------------------------------------------------
   AUTHENTICATION STATUS IN NAV
   -------------------------------------------------------------------------- */
function updateAuthUI() {
  const authContainer = document.querySelector("#nav-auth-container");
  if (!authContainer) return;

  const currentUser = window.api ? window.api.getCurrentUser() : null;

  if (currentUser) {
    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <a href="dashboard.html" class="btn btn-sm btn-gold" title="Go to Dashboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          ${currentUser.isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
        </a>
        <button type="button" class="btn btn-sm btn-ghost" onclick="window.handleNavSignOut()" title="Sign Out of Portal" style="font-size:0.8rem; padding:0.35rem 0.55rem; color:var(--slate-600);">
          Sign Out
        </button>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.45rem;">
        <a href="login.html" class="btn btn-sm btn-outline-gold" id="nav-login-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Sign In
        </a>
        <a href="login.html?tab=signup" class="btn btn-sm btn-gold" id="nav-signup-btn" style="font-weight:700;">
          Sign Up & Verification
        </a>
      </div>
    `;
  }
}

window.handleNavSignOut = function() {
  if (window.api) window.api.logout();
  window.showToast("Signed out successfully", "info");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 300);
};
function initNavbar() {
  const navbar = document.querySelector(".navbar");
  const hamburger = document.querySelector(".hamburger-btn");
  const navMenu = document.querySelector(".nav-menu");

  // Sticky navbar shadow on scroll
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    });
  }

  // Mobile Hamburger Toggle
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      hamburger.classList.toggle("active");
      navMenu.classList.toggle("active");
      const expanded = hamburger.classList.contains("active");
      hamburger.setAttribute("aria-expanded", expanded);
      if (expanded) {
        document.body.classList.add("nav-menu-open");
      } else {
        document.body.classList.remove("nav-menu-open");
      }
    });

    // Close menu when clicking outside or on a link
    document.addEventListener("click", (e) => {
      if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
        document.body.classList.remove("nav-menu-open");
      }
    });

    navMenu.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
        document.body.classList.remove("nav-menu-open");
      });
    });
  }

  // Highlight active link based on current path
  highlightActiveNavLink();
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/* --------------------------------------------------------------------------
   AUTHENTICATION STATUS IN NAV
   -------------------------------------------------------------------------- */
function updateAuthUI() {
  const authContainer = document.querySelector("#nav-auth-container");
  if (!authContainer) return;

  const currentUser = window.api ? window.api.getCurrentUser() : null;

  if (currentUser) {
    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <a href="dashboard.html" class="btn btn-sm btn-gold" title="Go to Dashboard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </a>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-sm btn-outline-gold">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Login Portal
      </a>
    `;
  }
}

/* --------------------------------------------------------------------------
   TOAST NOTIFICATION ENGINE
   -------------------------------------------------------------------------- */
function initToastContainer() {
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
}

function showToast(message, type = "success", duration = 3500) {
  initToastContainer();
  const container = document.getElementById("toast-container");

  const icons = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    danger:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${icons[type] || icons.success}</span>
    <div style="flex:1;">${message}</div>
  `;

  container.appendChild(toast);

  // Trigger entrance transition
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

// Global accessibility
window.showToast = showToast;

/* --------------------------------------------------------------------------
   PDF DOWNLOAD & OFFICIAL NOTICE SIMULATOR
   -------------------------------------------------------------------------- */
function downloadNoticePdf(title, category, date, content, author) {
  showToast(`Generating official PDF for: "${title.slice(0, 28)}..."`, "success");

  // Direct jsPDF generation with enlarged dual logos (Left: RC Logo, Right: Paradox-147 Logo)
  if (window.jspdf && window.jspdf.jsPDF && window.BRAND_LOGOS) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const brand = window.BRAND_LOGOS;

      // Header Bar: 40mm height
      doc.setFillColor(15, 23, 42);
      doc.rect(14, 10, 182, 40, "F");

      // Left Logo: Rajshahi College (Enlarged 34x34mm)
      if (brand.rcLogoBase64) {
        doc.addImage(brand.rcLogoBase64, "PNG", 18, 13, 34, 34);
      }
      // Right Logo: Paradox-147 (Enlarged 34x34mm)
      if (brand.batchLogoBase64) {
        doc.addImage(brand.batchLogoBase64, "PNG", 158, 13, 34, 34);
      }

      // Center Texts
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("DEPARTMENT OF PHYSICS", 105, 20, { align: "center" });
      doc.setFontSize(11);
      doc.text("RAJSHAHI COLLEGE, RAJSHAHI", 105, 26, { align: "center" });

      doc.setTextColor(212, 175, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("Paradox-147 — The 147th Honours Batch", 105, 33, { align: "center" });

      doc.setTextColor(226, 232, 240);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Session 2024-25  •  Established 1873", 105, 39, { align: "center" });

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(7.5);
      doc.text("• We Live • We Laugh • We Conquer •", 105, 45, { align: "center" });

      // Notice Subtitle & Metadata
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text("OFFICIAL ACADEMIC NOTICE / CIRCULAR", 14, 58);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Notice Memo: RC/PHY/147/NOT-${Math.floor(1000 + Math.random() * 9000)}  |  Category: ${category || 'General'}  |  Date: ${date || new Date().toISOString().split('T')[0]}`, 14, 64);
      doc.text(`Authority: ${author || 'Department Administration'}`, 14, 70);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      const splitTitle = doc.splitTextToSize(title, 182);
      doc.text(splitTitle, 14, 82);

      // Content Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const splitContent = doc.splitTextToSize(content || "", 182);
      doc.text(splitContent, 14, 94);

      // Closing statement
      const afterBodyY = 94 + (splitContent.length * 6) + 4;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text("All concerned students, faculty members, and batch representatives of Paradox-147 are requested to comply accordingly.", 14, afterBodyY);

      // Signatures
      const finalY = Math.max(afterBodyY + 28, 175);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, finalY, 70, finalY);
      doc.line(130, finalY, 196, finalY);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Class Representative (CR)", 14, finalY + 5);
      doc.text("Head of Department", 130, finalY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("MD. KHAIRUL ISLAM NAHID • Paradox-147", 14, finalY + 9);
      doc.text("Dept. of Physics, Rajshahi College", 130, finalY + 9);

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Official academic circular for Paradox-147. Department of Physics, Rajshahi College.", 14, 290);

      const fileName = `Notice_${title.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      doc.save(fileName);
      showToast(`Downloaded official PDF: ${fileName}`, "success", 4000);
      return;
    } catch (e) {
      console.warn("Direct jsPDF error, falling back to print window:", e);
    }
  }

  // Fallback to high-res printable window
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Please allow popups to download/print the official PDF.", "warning");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Notice - ${title}</title>
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          margin: 30px auto;
          max-width: 820px;
          color: #0f172a;
          line-height: 1.6;
          padding: 24px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 18px;
          margin-bottom: 24px;
        }
        .logo-img {
          width: 92px;
          height: 92px;
          object-fit: contain;
          background: transparent;
          filter: drop-shadow(0 3px 8px rgba(0,0,0,0.15));
          flex-shrink: 0;
        }
        .header-center {
          text-align: center;
          flex: 1;
        }
        .university-name {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .dept-name {
          font-size: 14px;
          font-weight: 700;
          color: #b45309;
          margin-bottom: 3px;
        }
        .batch-sub {
          font-size: 12px;
          color: #475569;
          font-style: italic;
        }
        .est-sub {
          font-size: 10.5px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 2px;
        }
        .meta-table {
          width: 100%;
          margin: 18px 0;
          font-size: 13.5px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 12px;
        }
        .badge {
          display: inline-block;
          background: #f1f5f9;
          color: #0f172a;
          padding: 3px 9px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          border: 1px solid #cbd5e1;
        }
        .notice-title {
          font-size: 21px;
          font-weight: bold;
          color: #0f172a;
          margin: 24px 0 16px 0;
          text-align: center;
          text-decoration: underline;
        }
        .notice-body {
          font-size: 15.5px;
          text-align: justify;
          margin-bottom: 45px;
        }
        .seal-row {
          display: flex;
          justify-content: space-between;
          margin-top: 60px;
          padding-top: 20px;
        }
        .seal-box {
          text-align: center;
          width: 220px;
          border-top: 1px dashed #475569;
          padding-top: 8px;
          font-size: 13px;
          font-weight: bold;
        }
        .seal-stamp {
          width: 88px;
          height: 88px;
          border: 2px solid #b45309;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #b45309;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0 auto 10px auto;
          transform: rotate(-10deg);
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:right; margin-bottom:20px;">
        <button onclick="window.print()" style="padding:10px 22px; background:#0f172a; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div class="header">
        <img src="assets/images/rc-logo.png" alt="Rajshahi College" class="logo-img">
        <div class="header-center">
          <div class="university-name">DEPARTMENT OF PHYSICS • RAJSHAHI COLLEGE, RAJSHAHI</div>
          <div class="dept-name">The 147th Honours Batch (Session 2024-25) — Paradox-147</div>
          <div class="batch-sub">• We Live • We Laugh • We Conquer •</div>
          <div class="est-sub">Official Academic Circular • Established 1873</div>
        </div>
        <img src="assets/images/batch-logo.png" alt="Paradox-147" class="logo-img">
      </div>

      <table class="meta-table">
        <tr>
          <td><strong>Notice Memo No:</strong> RC/PHY/147/NOT-${Math.floor(1000 + Math.random() * 9000)}</td>
          <td style="text-align:right;"><strong>Date:</strong> ${date || new Date().toISOString().split('T')[0]}</td>
        </tr>
        <tr>
          <td><strong>Category:</strong> <span class="badge">${category || 'General'}</span></td>
          <td style="text-align:right;"><strong>Author:</strong> ${author || 'Department Administration'}</td>
        </tr>
      </table>

      <div class="notice-title">${title}</div>

      <div class="notice-body">
        <p>${content}</p>
        <p>All concerned students, faculty members, and batch representatives of Paradox-147 are requested to take necessary actions accordingly.</p>
      </div>

      <div class="seal-row">
        <div class="seal-box">
          <div class="seal-stamp">OFFICIAL<br>RC-PHY<br>147</div>
          Class Representative (CR)<br>MD. KHAIRUL ISLAM NAHID
        </div>
        <div class="seal-box">
          <div style="height:70px;"></div>
          Head of the Department<br>Dept. of Physics, Rajshahi College
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

window.downloadNoticePdf = downloadNoticePdf;

/* --------------------------------------------------------------------------
   NEWSLETTER SIGNUP
   -------------------------------------------------------------------------- */
function initNewsletter() {
  const form = document.querySelector(".newsletter-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector(".newsletter-input");
      if (input && input.value) {
        showToast(`Thank you! ${input.value} is subscribed to batch circulars.`, "success");
        input.value = "";
      }
    });
  }
}

/* --------------------------------------------------------------------------
   SITE CONTENT CMS DYNAMIC LOADER
   -------------------------------------------------------------------------- */
async function initSiteContentCMS() {
  if (!window.api || typeof window.api.getSiteContent !== "function") return;
  try {
    const content = await window.api.getSiteContent();
    if (!content) return;

    // 1. Home Section
    if (content.home) {
      const badge = document.querySelector(".hero-badge span");
      if (badge && content.home.heroBadge) badge.textContent = content.home.heroBadge;

      const desc = document.querySelector(".hero-description");
      if (desc && content.home.heroDesc) desc.textContent = content.home.heroDesc;

      const motto = document.querySelector(".hero-quote");
      if (motto && content.home.motto) motto.textContent = content.home.motto;

      const ctaDir = document.getElementById("hero-cta-directory");
      if (ctaDir && content.home.ctaPrimary) {
        const svg = ctaDir.querySelector("svg");
        ctaDir.innerHTML = `${svg ? svg.outerHTML : ''} ${content.home.ctaPrimary}`;
      }

      const ctaNotices = document.getElementById("hero-cta-notices");
      if (ctaNotices && content.home.ctaSecondary) {
        const svg = ctaNotices.querySelector("svg");
        ctaNotices.innerHTML = `${svg ? svg.outerHTML : ''} ${content.home.ctaSecondary}`;
      }
    }

    // 2. About Section
    if (content.about) {
      const aboutSec = document.getElementById("about");
      if (aboutSec) {
        const tag = aboutSec.querySelector(".section-tag");
        if (tag && content.about.badge) tag.textContent = content.about.badge;

        const h2 = aboutSec.querySelector("h2");
        if (h2 && content.about.title) h2.textContent = content.about.title;

        const desc = aboutSec.querySelector(".about-lead-desc, p");
        if (desc && content.about.description) desc.textContent = content.about.description;
      }
    }

    // 3. Students Section
    if (content.students) {
      const stdTitle = document.getElementById("students-page-title");
      if (stdTitle && content.students.title) stdTitle.textContent = content.students.title;

      const stdSub = document.getElementById("students-page-subtitle");
      if (stdSub && content.students.subtitle) stdSub.textContent = content.students.subtitle;
    }

    // 4. Gallery Section
    if (content.gallery) {
      const galTitle = document.getElementById("gallery-page-title");
      if (galTitle && content.gallery.title) galTitle.textContent = content.gallery.title;

      const galSub = document.getElementById("gallery-page-subtitle");
      if (galSub && content.gallery.subtitle) galSub.textContent = content.gallery.subtitle;
    }

    // 5. Notice Section
    if (content.notice) {
      const notTitle = document.getElementById("notices-page-title");
      if (notTitle && content.notice.title) notTitle.textContent = content.notice.title;

      const notSub = document.getElementById("notices-page-subtitle");
      if (notSub && content.notice.subtitle) notSub.textContent = content.notice.subtitle;
    }

    // 6. Contacts Section
    if (content.contacts) {
      const mailLinks = document.querySelectorAll('a[href^="mailto:"]');
      if (content.contacts.email) {
        mailLinks.forEach(link => {
          if (link.href.includes("mail.paradox147@gmail.com") || link.closest(".footer-bottom") || link.closest(".brand-info")) {
            link.href = `mailto:${content.contacts.email}`;
            link.textContent = content.contacts.email;
          }
        });
      }
    }
  } catch (err) {
    console.error("Error applying site content CMS:", err);
  }
}
window.initSiteContentCMS = initSiteContentCMS;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
window.escapeHtml = escapeHtml;

/* --------------------------------------------------------------------------
   CONTACT FORM HANDLER (WITH LIVE ADMIN DASHBOARD NOTIFICATION DISPATCH)
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById("home-contact-form");
  if (!form) return;

  // Autofill name/email/phone if current user is signed in
  try {
    const currentUser = window.api && typeof window.api.getCurrentUser === "function" ? window.api.getCurrentUser() : null;
    if (currentUser) {
      const nameInput = document.getElementById("contact-name");
      const emailInput = document.getElementById("contact-email");
      const phoneInput = document.getElementById("contact-phone");
      if (nameInput && !nameInput.value) nameInput.value = currentUser.name || "";
      if (emailInput && !emailInput.value) emailInput.value = currentUser.email || currentUser.roll || "";
      if (phoneInput && !phoneInput.value && currentUser.phone) phoneInput.value = currentUser.phone;
    }
  } catch (e) {
    // Ignore autofill exceptions
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("contact-name")?.value.trim();
    const email = document.getElementById("contact-email")?.value.trim();
    const phone = document.getElementById("contact-phone")?.value.trim() || "";
    const subject = document.getElementById("contact-subject")?.value.trim();
    const message = document.getElementById("contact-message")?.value.trim();
    const submitBtn = document.getElementById("contact-submit-btn");
    const statusAlert = document.getElementById("contact-status-alert");

    if (!name || !email || !subject || !message) {
      if (typeof window.showToast === "function") {
        window.showToast("Please fill in all required fields (Name, Email/Roll, Subject, and Message).", "danger");
      }
      return;
    }

    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner" style="width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; display:inline-block; animation:spin 0.8s linear infinite;"></span>
        <span>Sending Message...</span>
      `;
    }

    try {
      if (window.api && typeof window.api.submitContactMessage === "function") {
        await window.api.submitContactMessage({
          name,
          email,
          phone,
          subject,
          message
        });
      }

      form.reset();

      if (typeof window.showToast === "function") {
        window.showToast("Message sent! Class Representative MD. Khairul Islam Nahid & Admins have been notified in the dashboard.", "success", 5000);
      }

      if (statusAlert) {
        statusAlert.style.display = "block";
        statusAlert.style.background = "#d1fae5";
        statusAlert.style.color = "#065f46";
        statusAlert.style.border = "1px solid #a7f3d0";
        statusAlert.innerHTML = `<strong>✅ Message Dispatched:</strong> Thank you, <strong>${escapeHtml(name)}</strong>! Your inquiry regarding "<em>${escapeHtml(subject)}</em>" has been submitted. The administrator has been notified in their dashboard notification center.`;
        setTimeout(() => {
          statusAlert.style.display = "none";
        }, 7000);
      }
    } catch (err) {
      console.error("Error submitting contact message:", err);
      if (typeof window.showToast === "function") {
        window.showToast(err.message || "Failed to submit message. Please try again.", "danger");
      }
      if (statusAlert) {
        statusAlert.style.display = "block";
        statusAlert.style.background = "#fee2e2";
        statusAlert.style.color = "#991b1b";
        statusAlert.style.border = "1px solid #fecaca";
        statusAlert.textContent = err.message || "Failed to submit message. Please try again.";
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  });
}
window.initContactForm = initContactForm;

