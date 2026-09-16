/* ==========================================================================
   PARADOXIAN '26 - STUDENT DIRECTORY CONTROLLER
   Search, Multi-Filter (Blood Group, District, Roll), & Rich Profile Modal
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initDirectoryPage();
});

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let currentFilters = {
  search: "",
  bloodGroup: "All",
  district: "All",
  sort: "roll-asc"
};

async function initDirectoryPage() {
  const directoryContainer = document.getElementById("student-cards-container");
  if (!directoryContainer) return;

  // Check URL query parameters (e.g. ?blood=O+ from home page emergency card)
  const urlParams = new URLSearchParams(window.location.search);
  const bloodParam = urlParams.get("blood");
  if (bloodParam) {
    currentFilters.bloodGroup = bloodParam;
    const bloodButton = document.querySelector(`.blood-filter-btn[data-blood="${bloodParam}"]`);
    if (bloodButton) {
      document.querySelectorAll(".blood-filter-btn").forEach(b => b.classList.remove("active"));
      bloodButton.classList.add("active");
    }
  }

  setupFilterListeners();
  await loadDistrictsDropdown();
  await renderStudents();
}

function setupFilterListeners() {
  const searchInput = document.getElementById("directory-search-input");
  const districtSelect = document.getElementById("directory-district-select");
  const sortSelect = document.getElementById("directory-sort-select");
  const clearBtn = document.getElementById("directory-clear-filters");
  const bloodButtons = document.querySelectorAll(".blood-filter-btn");

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentFilters.search = e.target.value;
        renderStudents();
      }, 250);
    });
  }

  if (districtSelect) {
    districtSelect.addEventListener("change", (e) => {
      currentFilters.district = e.target.value;
      renderStudents();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentFilters.sort = e.target.value;
      renderStudents();
    });
  }

  bloodButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      bloodButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilters.bloodGroup = btn.getAttribute("data-blood");
      renderStudents();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      currentFilters = { search: "", bloodGroup: "All", district: "All", sort: "roll-asc" };
      if (searchInput) searchInput.value = "";
      if (districtSelect) districtSelect.value = "All";
      if (sortSelect) sortSelect.value = "roll-asc";
      bloodButtons.forEach(b => b.classList.remove("active"));
      const allBtn = document.querySelector('.blood-filter-btn[data-blood="All"]');
      if (allBtn) allBtn.classList.add("active");
      renderStudents();
      window.showToast("Filters reset to default", "info");
    });
  }
}

async function loadDistrictsDropdown() {
  const districtSelect = document.getElementById("directory-district-select");
  if (!districtSelect) return;

  const students = await window.api.getStudents();
  const districts = [...new Set(students.map(s => s.district).filter(Boolean))].sort();

  districtSelect.innerHTML = `<option value="All">All Districts (${districts.length})</option>`;
  districts.forEach(d => {
    districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

function renderAuthStatusBanner(isLoggedIn, currentUser) {
  const banner = document.getElementById("directory-auth-banner");
  if (!banner) return;

  if (isLoggedIn) {
    banner.innerHTML = `
      <div class="student-privacy-banner logged-in">
        <div style="display:flex; align-items:center; gap:0.85rem;">
          <span style="font-size:1.6rem;">🎓</span>
          <div>
            <strong style="color:var(--white); font-size:0.95rem;">Logged In as ${currentUser.name} (${currentUser.role === 'admin' ? 'CR / Admin' : 'Student'})</strong>
            <div style="font-size:0.82rem; color:var(--slate-300);">Full Student Directory Unlocked — Viewing roll numbers, blood groups, and verified profiles.</div>
          </div>
        </div>
        <a href="dashboard.html" class="btn btn-sm btn-outline-gold">My Student Dashboard →</a>
      </div>
    `;
  } else {
    banner.innerHTML = `
      <div class="student-privacy-banner">
        <div style="display:flex; align-items:center; gap:0.85rem;">
          <span style="font-size:1.6rem;">🔒</span>
          <div>
            <strong style="color:var(--white); font-size:0.95rem;">Public View Mode</strong>
            <div style="font-size:0.82rem; color:var(--slate-300);">Public visitors can view Student Name, Home District, Picture, and Email. Roll numbers and blood groups are protected.</div>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <a href="login.html" class="btn btn-sm btn-outline-gold">Student Login ↗</a>
          <a href="login.html?tab=signup" class="btn btn-sm btn-gold" style="font-weight:700;">Sign Up & Verification</a>
        </div>
      </div>
    `;
  }
}

async function renderStudents() {
  const container = document.getElementById("student-cards-container");
  const countBadge = document.getElementById("directory-results-count");
  if (!container) return;

  const currentUser = window.api.getCurrentUser();
  const isLoggedIn = !!currentUser;
  renderAuthStatusBanner(isLoggedIn, currentUser);

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem;">
      <div style="display:inline-block; width:36px; height:36px; border:3px solid rgba(212,175,55,0.3); border-top-color:var(--gold-500); border-radius:50%; animation:spin 1s infinite linear;"></div>
      <p style="margin-top:1rem; color:var(--slate-500);">Loading batch directory...</p>
    </div>
  `;

  try {
    const students = await window.api.getStudents(currentFilters);

    if (countBadge) {
      countBadge.textContent = `${students.length} Student${students.length === 1 ? '' : 's'}`;
    }

    if (students.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1.5rem; background:var(--white); border-radius:var(--radius-lg); border:1px dashed var(--slate-300);">
          <div style="font-size:3rem; margin-bottom:0.75rem;">🔍</div>
          <h3 style="margin-bottom:0.5rem; color:var(--navy-900);">No Batchmates Found</h3>
          <p style="color:var(--slate-500); max-width:400px; margin:0 auto 1.5rem auto;">
            We couldn't find any students matching your current search criteria. Try modifying your filters or search keywords.
          </p>
          <button class="btn btn-sm btn-outline-gold" onclick="document.getElementById('directory-clear-filters').click();">Reset Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = students.map(student => {
      // Privacy logic:
      // Phone is visible if logged-in OR (has phone AND showPhonePublicly !== false)
      const canShowPhone = Boolean(student.phone && (isLoggedIn || student.showPhonePublicly !== false));
      // Socials are visible if logged-in OR (showSocialsPublicly !== false)
      const canShowSocials = Boolean(isLoggedIn || student.showSocialsPublicly !== false);
      
      // Roll is visible ONLY if logged in
      const rollMarkup = isLoggedIn 
        ? `<div class="student-id">Roll: ${escapeHtml(student.roll)}</div>`
        : `<a href="login.html" class="student-id-locked" title="Student login required to view roll number">🔒 Roll: Log in to view</a>`;

      // Blood badge is visible ONLY if logged in
      const bloodBadgeMarkup = isLoggedIn
        ? `<span class="student-blood-badge" title="Blood Group: ${escapeHtml(student.bloodGroup)}">${escapeHtml(student.bloodGroup)}</span>`
        : `<span class="student-blood-badge locked" title="Log in to view blood group">🔒</span>`;

      return `
        <div class="card student-card">
          <div class="student-card-header">
            <div class="student-avatar-wrapper">
              <img src="${escapeHtml(student.avatar)}" alt="${escapeHtml(student.name)}" class="student-avatar" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'">
              ${bloodBadgeMarkup}
            </div>
            <h3 class="student-name">${escapeHtml(student.name)}</h3>
            ${rollMarkup}
            <div class="student-district">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${escapeHtml(student.district || 'Rajshahi')}
            </div>
          </div>

          <div class="student-card-body">
            <div style="margin-bottom:0.65rem; font-size:0.75rem; font-weight:700; color:var(--gold-600); text-transform:uppercase; letter-spacing:0.04em;">
              ${escapeHtml(student.role || 'Batch Member')}
            </div>

            <div class="student-skills">
              ${(student.skills || []).slice(0, 3).map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
              ${(student.skills || []).length > 3 ? `<span class="skill-tag">+${(student.skills || []).length - 3}</span>` : ''}
            </div>

            <p class="student-bio-snippet">${escapeHtml(student.bio || 'Physics Honours undergraduate • Paradox-147.')}</p>
          </div>

          ${renderStudentCardFooterHTML(student, isLoggedIn)}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Error fetching students:", err);
    container.innerHTML = `<p style="grid-column:1/-1; color:var(--danger-500); text-align:center;">Failed to load student directory.</p>`;
  }
}

/* --------------------------------------------------------------------------
   STUDENT SOCIAL CHANNELS EXTRACTOR & 4-ITEM CARD FOOTER GENERATOR
   -------------------------------------------------------------------------- */
function getStudentSocialChannels(student, isLoggedIn = false) {
  const canShowPhone = Boolean(student.phone && (isLoggedIn || student.showPhonePublicly !== false));
  const canShowSocials = Boolean(isLoggedIn || student.showSocialsPublicly !== false);

  const channels = [];

  if (canShowSocials && student.portfolio) {
    channels.push({
      platform: 'Portfolio',
      url: formatSocialLink(student.portfolio, 'portfolio'),
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
    });
  }

  if (canShowSocials && student.github) {
    channels.push({
      platform: 'GitHub',
      url: formatSocialLink(student.github, 'github'),
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#181717"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>`
    });
  }

  if (canShowSocials && student.linkedin) {
    channels.push({
      platform: 'LinkedIn',
      url: formatSocialLink(student.linkedin, 'linkedin'),
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#0A66C2"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78z"/></svg>`
    });
  }

  if (canShowSocials && student.facebook) {
    channels.push({
      platform: 'Facebook',
      url: formatSocialLink(student.facebook, 'facebook'),
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
    });
  }

  if (canShowSocials && student.instagram) {
    channels.push({
      platform: 'Instagram',
      url: formatSocialLink(student.instagram, 'instagram'),
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="igCardGrad-${student.id || 'def'}" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="25%" stop-color="#e6683c"/><stop offset="50%" stop-color="#dc2743"/><stop offset="75%" stop-color="#cc2366"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#igCardGrad-${student.id || 'def'})"/><rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="#ffffff" stroke-width="1.6" fill="none"/><circle cx="12" cy="12" r="3.2" stroke="#ffffff" stroke-width="1.6" fill="none"/><circle cx="15.8" cy="8.2" r="0.85" fill="#ffffff"/></svg>`
    });
  }

  const threadVal = student.threads || student.thread;
  if (canShowSocials && threadVal) {
    channels.push({
      platform: 'Threads',
      url: formatSocialLink(threadVal, 'threads'),
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="#000000"><path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/></svg>`
    });
  }

  if (canShowSocials && student.youtube) {
    channels.push({
      platform: 'YouTube',
      url: formatSocialLink(student.youtube, 'youtube'),
      icon: `<svg width="15" height="15" viewBox="0 0 24 24"><path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><polygon fill="#ffffff" points="9.545,15.568 15.818,12 9.545,8.432"/></svg>`
    });
  }

  if (student.email) {
    channels.push({
      platform: 'Email',
      url: `mailto:${student.email}`,
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
    });
  }

  if (canShowPhone) {
    channels.push({
      platform: 'Phone',
      url: `tel:${student.phone}`,
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`
    });
  }

  return channels;
}

function renderStudentCardFooterHTML(student, isLoggedIn = false) {
  const channels = getStudentSocialChannels(student, isLoggedIn);
  const total = channels.length;
  const hasMoreThan4 = total > 4;

  let visibleChannelsMarkup = '';
  let moreButtonMarkup = '';
  let expandedTrayMarkup = '';

  if (hasMoreThan4) {
    // Exactly 3 visible
    const visible3 = channels.slice(0, 3);

    visibleChannelsMarkup = visible3.map(c => `
      <a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="${escapeHtml(c.platform)}: ${escapeHtml(c.url)}">
        ${c.icon}
      </a>
    `).join('');

    // 4th option is the + More button
    moreButtonMarkup = `
      <button type="button" class="social-more-btn" id="social-toggle-btn-${escapeHtml(student.id)}" data-total="${total}" data-extra="${total - 3}" onclick="window.toggleAllSocials('${escapeHtml(student.id)}')" title="Click to view all ${total} social links">
        +${total - 3} More
      </button>
    `;

    // Tray with ALL social sites visible upon clicking
    expandedTrayMarkup = `
      <div class="student-social-expanded" id="social-expanded-${escapeHtml(student.id)}" style="display: none;">
        <div class="social-expanded-label">
          <span>All Social Profiles (${total})</span>
          <span style="font-size:0.75rem; color:var(--slate-400); cursor:pointer; font-weight:bold;" onclick="window.toggleAllSocials('${escapeHtml(student.id)}')">✕ Close</span>
        </div>
        ${channels.map(c => `
          <a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer" class="social-expanded-badge-link" title="${escapeHtml(c.platform)}">
            ${c.icon}
            <span>${escapeHtml(c.platform)}</span>
          </a>
        `).join('')}
      </div>
    `;
  } else {
    // 4 or fewer: show all available icons directly
    visibleChannelsMarkup = channels.map(c => `
      <a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer" class="social-icon-btn" title="${escapeHtml(c.platform)}: ${escapeHtml(c.url)}">
        ${c.icon}
      </a>
    `).join('');
  }

  return `
    <div class="student-card-footer">
      <div class="student-footer-row">
        <!-- 4-element social container (3 visible + 4th More button, or up to 4 items) -->
        <div class="student-social-links" id="social-primary-${student.id}">
          ${visibleChannelsMarkup}
          ${moreButtonMarkup}
        </div>

        <!-- By the side of these 4: 'More Details' button -->
        <button type="button" class="btn btn-sm btn-outline-gold btn-more-details" onclick="openStudentModal('${student.id}')" title="View Full Academic Profile">
          More Details
        </button>
      </div>

      ${expandedTrayMarkup}
    </div>
  `;
}

window.toggleAllSocials = function(studentId) {
  const tray = document.getElementById(`social-expanded-${studentId}`);
  const btn = document.getElementById(`social-toggle-btn-${studentId}`);
  if (!tray) return;

  const isHidden = tray.style.display === "none" || !tray.style.display;
  if (isHidden) {
    tray.style.display = "flex";
    if (btn) btn.textContent = "Less ▴";
  } else {
    tray.style.display = "none";
    if (btn) {
      const extra = btn.getAttribute("data-extra") || "More";
      btn.textContent = `+${extra} More`;
    }
  }
};

window.renderStudentCardFooterHTML = renderStudentCardFooterHTML;
window.getStudentSocialChannels = getStudentSocialChannels;

/* --------------------------------------------------------------------------
   URL FORMATTER HELPER
   -------------------------------------------------------------------------- */
function formatSocialLink(val, platform) {
  if (!val) return "";
  const trimmed = val.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const clean = trimmed.replace(/^\/+/, "");
  switch (platform) {
    case "facebook":
      return `https://facebook.com/${clean}`;
    case "instagram":
      return `https://instagram.com/${clean}`;
    case "threads":
      return `https://threads.net/@${clean.replace(/^@/, '')}`;
    case "youtube":
      return `https://youtube.com/@${clean.replace(/^@/, '')}`;
    case "linkedin":
      return clean.startsWith("in/") ? `https://linkedin.com/${clean}` : `https://linkedin.com/in/${clean}`;
    case "github":
      return `https://github.com/${clean}`;
    case "portfolio":
      return `https://${clean}`;
    default:
      return `https://${clean}`;
  }
}

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

  if (typeof window.isUserAdminAccount === "function" && window.isUserAdminAccount(currentUser)) {
    return true;
  }
  if (typeof window.api?.isAdmin === "function" && window.api.isAdmin(currentUser)) {
    return true;
  }
  return Boolean(
    currentUser.isAdmin === true ||
    currentUser.isSuperAdmin === true ||
    currentUser.role === "admin" ||
    currentUser.role === "Super Admin" ||
    currentUser.role === "Super Admin & CR" ||
    (typeof currentUser.role === "string" && currentUser.role.toLowerCase().includes("administrator")) ||
    currentUser.roll === "2024227170" ||
    currentUser.id === "std-101"
  );
}

window.isStudentOwnRecord = isStudentOwnRecord;
window.hasActiveAdminAccess = hasActiveAdminAccess;

/* --------------------------------------------------------------------------
   STUDENT PROFILE DETAIL MODAL
   -------------------------------------------------------------------------- */
async function openStudentModal(studentId) {
  const modal = document.getElementById("student-detail-modal");
  if (!modal) return;

  const downloadBtn = modal.querySelector("#modal-download-profile-btn");
  if (downloadBtn) {
    downloadBtn.style.display = "none";
  }

  try {
    const student = await window.api.getStudentById(studentId);
    window.currentActiveModalStudentId = student.id;
    const currentUser = (window.dashboardState && window.dashboardState.currentUser) || (window.api && window.api.getCurrentUser ? window.api.getCurrentUser() : null);
    const isLoggedIn = !!currentUser;
    const isAdmin = hasActiveAdminAccess(currentUser);
    const isOwnProfile = isStudentOwnRecord(currentUser, student);

    const modalAvatar = modal.querySelector("#modal-student-avatar");
    const modalName = modal.querySelector("#modal-student-name");
    const modalRoll = modal.querySelector("#modal-student-roll");
    const modalBloodContainer = modal.querySelector("#modal-student-blood-container");
    const modalBlood = modal.querySelector("#modal-student-blood");
    const modalDistrict = modal.querySelector("#modal-student-district");
    const modalRole = modal.querySelector("#modal-student-role");
    const modalEmail = modal.querySelector("#modal-student-email");
    const modalPhone = modal.querySelector("#modal-student-phone");
    const modalPhoneHiddenBadge = modal.querySelector("#modal-phone-hidden-badge");
    const modalBio = modal.querySelector("#modal-student-bio");
    const modalSkills = modal.querySelector("#modal-student-skills");
    const modalSocialsContainer = modal.querySelector("#modal-socials-container");
    const modalAcademicLock = modal.querySelector("#modal-academic-lock");

    // Publicly accessible fields: Name, Avatar, District, Email
    if (modalAvatar) modalAvatar.src = student.avatar;
    if (modalName) modalName.textContent = student.name;
    if (modalDistrict) modalDistrict.textContent = student.district || 'Rajshahi';
    if (modalRole) modalRole.textContent = student.role || "Batch Member";
    if (modalEmail) {
      modalEmail.textContent = student.email;
      modalEmail.href = `mailto:${student.email}`;
    }
    if (modalBio) modalBio.textContent = student.bio || 'Physics Honours undergraduate • Paradox-147.';

    if (modalSkills) {
      modalSkills.innerHTML = (student.skills || []).map(skill => `
        <span class="skill-tag" style="background:var(--navy-50); color:var(--navy-900); font-weight:600; padding:0.35rem 0.75rem; border-radius:var(--radius-sm);">
          ${escapeHtml(skill)}
        </span>
      `).join('');
    }

    // Phone visibility:
    const canShowPhone = Boolean(student.phone && (isLoggedIn || student.showPhonePublicly !== false));
    if (modalPhone) {
      if (canShowPhone) {
        modalPhone.style.display = "inline";
        modalPhone.textContent = student.phone;
        modalPhone.href = `tel:${student.phone}`;
        if (modalPhoneHiddenBadge) modalPhoneHiddenBadge.style.display = "none";
      } else {
        modalPhone.style.display = "none";
        if (modalPhoneHiddenBadge) {
          modalPhoneHiddenBadge.style.display = "inline";
          modalPhoneHiddenBadge.textContent = student.phone ? "[Hidden by student privacy setting]" : "[Not provided]";
        }
      }
    }

    // Social profiles visibility:
    const canShowSocials = Boolean(isLoggedIn || student.showSocialsPublicly !== false);
    if (modalSocialsContainer) {
      if (!canShowSocials) {
        modalSocialsContainer.innerHTML = `<span style="font-size:0.82rem; color:var(--slate-400); font-style:italic;">[Social profiles hidden by student privacy preference]</span>`;
      } else {
        const buttons = [];
        if (student.portfolio) {
          buttons.push(`
            <a href="${escapeHtml(formatSocialLink(student.portfolio, 'portfolio'))}" target="_blank" rel="noopener noreferrer" class="contact-social-btn portfolio-btn" title="Portfolio: ${escapeHtml(student.portfolio)}" aria-label="Portfolio Website">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </a>
          `);
        }
        if (student.github) {
          buttons.push(`
            <a href="${escapeHtml(formatSocialLink(student.github, 'github'))}" target="_blank" rel="noopener noreferrer" class="contact-social-btn github-btn" title="GitHub: ${escapeHtml(student.github)}" aria-label="GitHub">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#181717">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
          `);
        }
        if (student.linkedin) {
          buttons.push(`
            <a href="${escapeHtml(formatSocialLink(student.linkedin, 'linkedin'))}" target="_blank" rel="noopener noreferrer" class="contact-social-btn linkedin-btn" title="LinkedIn: ${escapeHtml(student.linkedin)}" aria-label="LinkedIn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78z"/>
              </svg>
            </a>
          `);
        }
        if (student.facebook) {
          buttons.push(`
            <a href="${escapeHtml(formatSocialLink(student.facebook, 'facebook'))}" target="_blank" rel="noopener noreferrer" class="contact-social-btn facebook-btn" title="Facebook: ${escapeHtml(student.facebook)}" aria-label="Facebook">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          `);
        }
        if (student.instagram) {
          buttons.push(`
            <a href="${escapeHtml(formatSocialLink(student.instagram, 'instagram'))}" target="_blank" rel="noopener noreferrer" class="contact-social-btn instagram-btn" title="Instagram: ${escapeHtml(student.instagram)}" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="ig-grad-${student.id || 'default'}" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#f09433"/>
                    <stop offset="25%" stop-color="#e6683c"/>
                    <stop offset="50%" stop-color="#dc2743"/>
                    <stop offset="75%" stop-color="#cc2366"/>
                    <stop offset="100%" stop-color="#bc1888"/>
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-grad-${student.id || 'default'})"/>
                <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="#ffffff" stroke-width="1.6" fill="none"/>
                <circle cx="12" cy="12" r="3.2" stroke="#ffffff" stroke-width="1.6" fill="none"/>
                <circle cx="15.8" cy="8.2" r="0.85" fill="#ffffff"/>
              </svg>
            </a>
          `);
        }
        if (student.threads || student.thread) {
          buttons.push(`
            <a href="${escapeHtml(formatSocialLink(student.threads || student.thread, 'threads'))}" target="_blank" rel="noopener noreferrer" class="contact-social-btn threads-btn" title="Threads: ${escapeHtml(student.threads || student.thread)}" aria-label="Threads">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000">
                <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/>
              </svg>
            </a>
          `);
        }
        if (student.youtube) {
          buttons.push(`
            <a href="${escapeHtml(formatSocialLink(student.youtube, 'youtube'))}" target="_blank" rel="noopener noreferrer" class="contact-social-btn youtube-btn" title="YouTube: ${escapeHtml(student.youtube)}" aria-label="YouTube">
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                <polygon fill="#ffffff" points="9.545,15.568 15.818,12 9.545,8.432"/>
              </svg>
            </a>
          `);
        }

        modalSocialsContainer.innerHTML = buttons.length 
          ? buttons.join('') 
          : `<span style="font-size:0.82rem; color:var(--slate-400); font-style:italic;">[No external social profiles added]</span>`;
      }
    }

    // Protected Academic Information: Roll, Reg, Blood Group
    // Protected Academic & Family Information: Roll, Reg, Blood Group, Parental & Birth details
    const modalFather = modal.querySelector("#modal-student-father");
    const modalMother = modal.querySelector("#modal-student-mother");
    const modalDobOrig = modal.querySelector("#modal-student-dob-orig");
    const modalDobCert = modal.querySelector("#modal-student-dob-cert");
    const modalFamilyContainer = modal.querySelector("#modal-family-dob-container");

    const formatDob = (dateVal) => {
      if (!dateVal) return "Not provided";
      try {
        const parts = String(dateVal).trim().split("-");
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!isNaN(d.getTime())) return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        }
        return dateVal;
      } catch {
        return dateVal;
      }
    };

    if (isLoggedIn) {
      if (modalRoll) modalRoll.textContent = `Student ID: ${student.roll} | Reg: ${student.reg || 'N/A'}`;
      if (modalBloodContainer) modalBloodContainer.style.display = "inline-flex";
      if (modalBlood) modalBlood.textContent = student.bloodGroup;
      if (modalAcademicLock) modalAcademicLock.style.display = "none";
      if (modalFamilyContainer) modalFamilyContainer.style.display = "block";
      if (modalFather) modalFather.textContent = student.fatherName || "Md. Rafiqul Islam";
      if (modalMother) modalMother.textContent = student.motherName || "Mrs. Khadeja Begum";
      if (modalDobOrig) modalDobOrig.textContent = formatDob(student.dobOriginal || "2005-08-14");
      if (modalDobCert) modalDobCert.textContent = formatDob(student.dobCertificate || "2006-02-10");
    } else {
      if (modalRoll) modalRoll.textContent = `Student ID: •••••••• (Protected)`;
      if (modalBloodContainer) modalBloodContainer.style.display = "none";
      if (modalAcademicLock) modalAcademicLock.style.display = "block";
      if (modalFamilyContainer) modalFamilyContainer.style.display = "none";
    }

    const downloadBtn = modal.querySelector("#modal-download-profile-btn");
    if (downloadBtn) {
      // A student can download their own individual info PDF, but not others. Admin has all access.
      downloadBtn.style.display = (isAdmin || isOwnProfile) ? "inline-flex" : "none";
    }

    modal.classList.add("active");

  } catch (err) {
    window.showToast("Could not load student profile", "danger");
  }
}

function closeStudentModal() {
  const modal = document.getElementById("student-detail-modal");
  if (modal) modal.classList.remove("active");
}

// Close modal on backdrop click or Escape key
document.addEventListener("click", (e) => {
  const modal = document.getElementById("student-detail-modal");
  if (modal && e.target === modal) {
    closeStudentModal();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeStudentModal();
  }
});

window.openStudentModal = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.formatSocialLink = formatSocialLink;
window.downloadCurrentModalStudentProfile = function() {
  const modalStudentId = window.currentActiveModalStudentId;
  if (!modalStudentId) return;

  const currentUser = (window.dashboardState && window.dashboardState.currentUser) || (window.api && window.api.getCurrentUser ? window.api.getCurrentUser() : null);
  const studentsList = (window.dashboardState && window.dashboardState.students) || [];
  const student = studentsList.find(s => s.id === modalStudentId || s.roll === modalStudentId) || { id: modalStudentId, roll: modalStudentId };

  const isAdmin = hasActiveAdminAccess(currentUser);
  const isOwn = isStudentOwnRecord(currentUser, student);

  if (!isAdmin && !isOwn) {
    if (window.showToast) {
      window.showToast("Access Restricted: Students are only permitted to download their own individual dossier.", "warning", 4500);
    }
    return;
  }

  if (window.downloadSingleStudentPDF) {
    window.downloadSingleStudentPDF(modalStudentId);
  } else if (window.showToast) {
    window.showToast("Preparing student record download...", "info");
  }
};
