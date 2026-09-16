/* ==========================================================================
   PARADOXIAN '26 - NOTICE BOARD CONTROLLER
   Category Filtering, Search, Full Notice Modal, & Simulated PDF Downloads
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNoticeBoard();
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

let noticeFilterState = {
  category: "All",
  search: ""
};

let cachedNotices = [];

async function initNoticeBoard() {
  const noticeListContainer = document.getElementById("notices-list-container");
  if (!noticeListContainer) return;

  setupNoticeListeners();
  await loadAndRenderNotices();
}

function setupNoticeListeners() {
  const searchInput = document.getElementById("notice-search-input");
  const categoryPills = document.querySelectorAll(".notice-category-pill");

  if (searchInput) {
    let debounce;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        noticeFilterState.search = e.target.value;
        loadAndRenderNotices();
      }, 250);
    });
  }

  categoryPills.forEach(pill => {
    pill.addEventListener("click", () => {
      categoryPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      noticeFilterState.category = pill.getAttribute("data-category") || "All";
      loadAndRenderNotices();
    });
  });
}

async function loadAndRenderNotices() {
  const container = document.getElementById("notices-list-container");
  const countDisplay = document.getElementById("notices-count-badge");
  if (!container) return;

  try {
    cachedNotices = await window.api.getNotices(noticeFilterState);

    if (countDisplay) {
      countDisplay.textContent = `${cachedNotices.length} Notice${cachedNotices.length === 1 ? '' : 's'}`;
    }

    if (cachedNotices.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 4rem 1.5rem; background:var(--white); border-radius:var(--radius-lg); border:1px dashed var(--slate-300);">
          <div style="font-size:3rem; margin-bottom:0.75rem;">📋</div>
          <h3 style="margin-bottom:0.5rem; color:var(--navy-900);">No Notices Found</h3>
          <p style="color:var(--slate-500); max-width:420px; margin:0 auto 1.5rem auto;">
            There are currently no active announcements matching your selected category or query.
          </p>
          <button class="btn btn-sm btn-outline-gold" onclick="document.querySelector('.notice-category-pill[data-category=\\'All\\']').click();">Show All Notices</button>
        </div>
      `;
      return;
    }

    container.innerHTML = cachedNotices.map(notice => {
      const dateObj = new Date(notice.date);
      const day = dateObj.getDate() || "01";
      const month = dateObj.toLocaleString("en-US", { month: "short" }) || "SEP";

      return `
        <div class="notice-item ${notice.urgent ? 'urgent-border' : ''}">
          <div class="notice-date-box">
            <span class="notice-date-day">${day}</span>
            <span class="notice-date-month">${month}</span>
          </div>

          <div class="notice-content">
            <div class="notice-meta">
              <span class="badge badge-gold">${escapeHtml(notice.category)}</span>
              ${notice.urgent ? `<span class="badge badge-blood">⚠️ Urgent Notice</span>` : ''}
              <span style="font-size:0.8rem; color:var(--slate-500);">
                From: <strong>${escapeHtml(notice.author || 'Department Office')}</strong>
              </span>
            </div>

            <h3 class="notice-title">
              <a href="javascript:void(0)" onclick="openNoticeModal('${escapeHtml(notice.id)}')">${escapeHtml(notice.title)}</a>
            </h3>

            <p class="notice-excerpt">${escapeHtml(notice.description)}</p>

            <div class="notice-actions">
              <button class="btn btn-sm btn-navy" onclick="openNoticeModal('${escapeHtml(notice.id)}')">
                Read Full Notice
              </button>
              <button class="btn btn-sm btn-outline-gold" onclick="handleDownloadNotice('${escapeHtml(notice.id)}')" title="Download Official PDF Circular">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download PDF (${escapeHtml(notice.fileSize || '1.2 MB')})
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Error fetching notices:", err);
    container.innerHTML = `<p style="color:var(--danger-500); text-align:center;">Failed to load announcements.</p>`;
  }
}

/* --------------------------------------------------------------------------
   NOTICE DETAIL MODAL
   -------------------------------------------------------------------------- */
function openNoticeModal(noticeId) {
  const notice = cachedNotices.find(n => n.id === noticeId);
  if (!notice) return;

  const modal = document.getElementById("notice-detail-modal");
  if (!modal) return;

  const titleEl = modal.querySelector("#notice-modal-title");
  const metaEl = modal.querySelector("#notice-modal-meta");
  const bodyEl = modal.querySelector("#notice-modal-body");
  const pdfBtn = modal.querySelector("#notice-modal-download-btn");

  if (titleEl) titleEl.textContent = notice.title;
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="badge badge-gold">${escapeHtml(notice.category)}</span>
      ${notice.urgent ? `<span class="badge badge-blood">⚠️ Urgent</span>` : ''}
      <span>Published: <strong>${escapeHtml(notice.date)}</strong></span>
      <span>Authority: <strong>${escapeHtml(notice.author)}</strong></span>
    `;
  }
  if (bodyEl) {
    bodyEl.innerHTML = `
      <p style="font-size:1.05rem; line-height:1.7; margin-bottom:1.5rem; color:var(--slate-800);">${escapeHtml(notice.description)}</p>
      <div style="padding:1rem; background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-sm); font-size:0.85rem; color:var(--slate-600);">
        <strong>Verification Memo:</strong> RC/PHY/147/NOT-${escapeHtml(notice.id.slice(-4))}<br>
        This document has been authorized and issued by the academic committee of Department of Physics, Rajshahi College (Paradox-147).
      </div>
    `;
  }

  if (pdfBtn) {
    pdfBtn.onclick = () => handleDownloadNotice(notice.id);
  }

  modal.classList.add("active");
}

function closeNoticeModal() {
  const modal = document.getElementById("notice-detail-modal");
  if (modal) modal.classList.remove("active");
}

function handleDownloadNotice(noticeId) {
  const notice = cachedNotices.find(n => n.id === noticeId);
  if (!notice) return;

  window.downloadNoticePdf(
    notice.title,
    notice.category,
    notice.date,
    notice.description,
    notice.author
  );
}

window.openNoticeModal = openNoticeModal;
window.closeNoticeModal = closeNoticeModal;
window.handleDownloadNotice = handleDownloadNotice;
