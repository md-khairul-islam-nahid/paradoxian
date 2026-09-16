/* ==========================================================================
   PARADOXIAN '26 - GALLERY & MEMORIES CONTROLLER
   Dynamic Categories, Multi-Photo (Up to 50) Upload, Masonry Grid & Lightbox
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initGalleryPage();
});

let galleryItems = [];
let currentLightboxIndex = 0;
let currentLightboxPhotoIndex = 0;
let activeCategory = "All";
let memoryUploadedImages = []; // Array of compressed Base64 strings (up to 50)

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function initGalleryPage() {
  const galleryContainer = document.getElementById("gallery-grid-container");
  if (!galleryContainer) return;

  await loadCategoryTabs();
  setupLightboxListeners();
  setupAddMemoryModal();
  await loadAndRenderGallery();
}

/* --------------------------------------------------------------------------
   DYNAMIC CATEGORY TABS
   -------------------------------------------------------------------------- */
async function loadCategoryTabs() {
  const nav = document.getElementById("gallery-tabs-nav");
  if (!nav) return;

  let categories = [];
  try {
    if (window.api && typeof window.api.getGalleryCategories === "function") {
      categories = await window.api.getGalleryCategories();
    }
  } catch (err) {
    console.error("Failed to load categories:", err);
  }

  if (!categories || categories.length === 0) {
    categories = [
      "Orientation & Freshers",
      "Campus & Adda",
      "Study Tours & Picnic",
      "Tech Fest & Hackathons"
    ];
  }

  // Render "All Memories" + dynamic category buttons
  let tabsHtml = `
    <button type="button" class="gallery-tab-btn ${activeCategory === 'All' ? 'active' : ''}" data-category="All">
      All Memories
    </button>
  `;

  categories.forEach(cat => {
    tabsHtml += `
      <button type="button" class="gallery-tab-btn ${activeCategory === cat ? 'active' : ''}" data-category="${escapeHtml(cat)}">
        ${escapeHtml(cat)}
      </button>
    `;
  });

  nav.innerHTML = tabsHtml;

  // Rebind click listeners
  const tabs = nav.querySelectorAll(".gallery-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeCategory = tab.getAttribute("data-category") || "All";
      loadAndRenderGallery();
    });
  });
}

/* --------------------------------------------------------------------------
   RENDER GALLERY CARDS (WITH MULTI-PHOTO INDICATOR)
   -------------------------------------------------------------------------- */
async function loadAndRenderGallery() {
  const container = document.getElementById("gallery-grid-container");
  if (!container) return;

  try {
    galleryItems = await window.api.getGallery(activeCategory);

    if (galleryItems.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1.5rem; background:var(--white); border-radius:var(--radius-lg); border:1px dashed var(--slate-300);">
          <div style="font-size:3rem; margin-bottom:0.75rem;">📷</div>
          <h3 style="margin-bottom:0.5rem; color:var(--navy-900);">No Memories in "${escapeHtml(activeCategory)}" Yet</h3>
          <p style="color:var(--slate-500); max-width:400px; margin:0 auto 1.5rem auto;">
            Be the first to immortalize this event by contributing photos to the batch album.
          </p>
          <button class="btn btn-sm btn-gold" onclick="openAddMemoryModal()">+ Share a Memory</button>
        </div>
      `;
      return;
    }

    container.innerHTML = galleryItems.map((item, index) => {
      const photoCount = item.photoCount || (item.images ? item.images.length : 1);
      const isMultiPhoto = photoCount > 1;

      return `
        <div class="gallery-card" onclick="openLightbox(${index})" style="cursor: pointer;">
          <div class="gallery-img-wrapper" style="position: relative;">
            <img src="${item.image || (item.images && item.images[0])}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800'">
            
            ${isMultiPhoto ? `
              <div style="position: absolute; top: 12px; right: 12px; background: rgba(10, 25, 47, 0.82); backdrop-filter: blur(6px); color: #fff; padding: 4px 9px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); z-index: 2; border: 1px solid rgba(255,255,255,0.15);">
                <span>📸</span>
                <span>${photoCount} Photos</span>
              </div>
            ` : ''}

            <div class="gallery-overlay">
              <div class="gallery-zoom-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </div>
              <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.5rem;">
                <span class="badge badge-gold">${escapeHtml(item.category)}</span>
                ${isMultiPhoto ? `<span class="badge" style="background:rgba(255,255,255,0.2); color:#fff; font-size:0.68rem;">📸 ${photoCount} Pics</span>` : ''}
              </div>
              <div style="font-size:0.8rem; color:var(--slate-200); margin-bottom:0.25rem;">📍 ${escapeHtml(item.location || 'Rajshahi College')}</div>
              <h4 style="color:var(--white); font-size:1.1rem; line-height:1.3; margin:0;">${escapeHtml(item.title)}</h4>
            </div>
          </div>
          <div class="gallery-info" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h4 class="gallery-title" style="margin-bottom:0.2rem;">${escapeHtml(item.title)}</h4>
              <div class="gallery-date">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline; vertical-align:middle; margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${escapeHtml(item.date)}
              </div>
            </div>
            ${isMultiPhoto ? `
              <span class="badge badge-outline-navy" style="font-size:0.72rem;">📸 ${photoCount}</span>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error("Error loading gallery:", err);
  }
}

/* --------------------------------------------------------------------------
   LIGHTBOX MODAL & MULTI-PHOTO KEYBOARD NAVIGATION
   -------------------------------------------------------------------------- */
function openLightbox(index) {
  if (!galleryItems[index]) return;
  currentLightboxIndex = index;
  currentLightboxPhotoIndex = 0;

  const lightbox = document.getElementById("gallery-lightbox");
  if (!lightbox) return;

  updateLightboxContent();
  lightbox.classList.add("active");
  document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function updateLightboxContent() {
  const item = galleryItems[currentLightboxIndex];
  if (!item) return;

  const photos = (Array.isArray(item.images) && item.images.length > 0)
    ? item.images
    : [item.image];

  if (currentLightboxPhotoIndex >= photos.length) {
    currentLightboxPhotoIndex = 0;
  }
  if (currentLightboxPhotoIndex < 0) {
    currentLightboxPhotoIndex = photos.length - 1;
  }

  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxMeta = document.getElementById("lightbox-meta");
  const counterBadge = document.getElementById("lightbox-photo-counter");
  const thumbsContainer = document.getElementById("lightbox-thumbs-container");

  if (lightboxImg) {
    lightboxImg.src = photos[currentLightboxPhotoIndex];
  }
  if (lightboxTitle) {
    lightboxTitle.textContent = item.title;
  }
  if (lightboxCaption) {
    lightboxCaption.textContent = item.caption || item.details || item.title;
  }
  if (lightboxMeta) {
    lightboxMeta.textContent = `${item.category} • ${item.date} • ${item.location || 'Rajshahi College'}`;
  }

  // Photo Counter
  if (counterBadge) {
    if (photos.length > 1) {
      counterBadge.style.display = "inline-block";
      counterBadge.textContent = `Photo ${currentLightboxPhotoIndex + 1} of ${photos.length}`;
    } else {
      counterBadge.style.display = "none";
    }
  }

  // Admin Edit Link
  const adminEditLink = document.getElementById("lightbox-admin-edit-link");
  if (adminEditLink) {
    const curUser = window.api ? window.api.getCurrentUser() : null;
    if (curUser && curUser.isAdmin) {
      adminEditLink.style.display = "inline-flex";
      adminEditLink.href = `dashboard.html?tab=memories&edit=${encodeURIComponent(item.id)}`;
    } else {
      adminEditLink.style.display = "none";
    }
  }

  // Multi-photo Thumbnail Strip
  if (thumbsContainer) {
    if (photos.length > 1) {
      thumbsContainer.style.display = "flex";
      thumbsContainer.innerHTML = photos.map((src, pIdx) => `
        <img src="${src}" alt="Thumb ${pIdx + 1}" 
          onclick="event.stopPropagation(); selectLightboxPhoto(${pIdx});"
          style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid ${pIdx === currentLightboxPhotoIndex ? 'var(--gold-400)' : 'transparent'}; opacity: ${pIdx === currentLightboxPhotoIndex ? '1' : '0.55'}; transition: all 0.2s ease;">
      `).join('');
    } else {
      thumbsContainer.style.display = "none";
      thumbsContainer.innerHTML = "";
    }
  }
}

function selectLightboxPhoto(photoIndex) {
  currentLightboxPhotoIndex = photoIndex;
  updateLightboxContent();
}

function nextLightboxImage() {
  const item = galleryItems[currentLightboxIndex];
  const photos = (item && Array.isArray(item.images) && item.images.length > 0) ? item.images : [item?.image];

  if (photos.length > 1 && currentLightboxPhotoIndex < photos.length - 1) {
    // Navigate to next photo in current album
    currentLightboxPhotoIndex++;
    updateLightboxContent();
  } else {
    // Navigate to next album
    currentLightboxIndex = (currentLightboxIndex + 1) % galleryItems.length;
    currentLightboxPhotoIndex = 0;
    updateLightboxContent();
  }
}

function prevLightboxImage() {
  const item = galleryItems[currentLightboxIndex];
  const photos = (item && Array.isArray(item.images) && item.images.length > 0) ? item.images : [item?.image];

  if (photos.length > 1 && currentLightboxPhotoIndex > 0) {
    // Navigate to previous photo in current album
    currentLightboxPhotoIndex--;
    updateLightboxContent();
  } else {
    // Navigate to previous album
    currentLightboxIndex = (currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length;
    const prevItem = galleryItems[currentLightboxIndex];
    const prevPhotos = (prevItem && Array.isArray(prevItem.images) && prevItem.images.length > 0) ? prevItem.images : [prevItem?.image];
    currentLightboxPhotoIndex = Math.max(0, prevPhotos.length - 1);
    updateLightboxContent();
  }
}

function closeLightbox() {
  const lightbox = document.getElementById("gallery-lightbox");
  if (lightbox) lightbox.classList.remove("active");
  document.body.style.overflow = "";
}

function setupLightboxListeners() {
  const prevBtn = document.getElementById("lightbox-prev-btn");
  const nextBtn = document.getElementById("lightbox-next-btn");
  const closeBtn = document.getElementById("lightbox-close-btn");
  const lightbox = document.getElementById("gallery-lightbox");

  if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); prevLightboxImage(); });
  if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); nextLightboxImage(); });
  if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.classList.contains("lightbox-content")) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (!lightbox || !lightbox.classList.contains("active")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextLightboxImage();
    if (e.key === "ArrowLeft") prevLightboxImage();
  });
}

/* --------------------------------------------------------------------------
   ADD MEMORY MODAL FORM (AUTH-AWARE, CUSTOM CATEGORIES & UP TO 50 PHOTOS)
   -------------------------------------------------------------------------- */
async function openAddMemoryModal() {
  const modal = document.getElementById("add-memory-modal");
  if (!modal) return;

  const guestBox = document.getElementById("memory-guest-box");
  const studentBox = document.getElementById("memory-student-box");
  const loggedInUserSpan = document.getElementById("memory-logged-in-user");
  const dateInput = document.getElementById("memory-date");

  const currentUser = window.api ? window.api.getCurrentUser() : null;

  if (!currentUser) {
    if (guestBox) guestBox.style.display = "block";
    if (studentBox) studentBox.style.display = "none";
  } else {
    if (guestBox) guestBox.style.display = "none";
    if (studentBox) studentBox.style.display = "block";
    if (loggedInUserSpan) {
      loggedInUserSpan.textContent = `${currentUser.name || "Student"} (${currentUser.roll || "ID"})`;
    }
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split("T")[0];
    }
    // Populate dynamic categories into dropdown
    await populateGalleryCategoryDropdown();
  }

  modal.classList.add("active");
}

function closeAddMemoryModal() {
  const modal = document.getElementById("add-memory-modal");
  if (modal) modal.classList.remove("active");
}

async function populateGalleryCategoryDropdown() {
  const select = document.getElementById("memory-category");
  if (!select) return;

  let categories = [];
  try {
    if (window.api && typeof window.api.getGalleryCategories === "function") {
      categories = await window.api.getGalleryCategories();
    }
  } catch (e) {
    console.error("Failed loading categories for select:", e);
  }

  if (!categories || categories.length === 0) {
    categories = [
      "Orientation & Freshers",
      "Campus & Adda",
      "Study Tours & Picnic",
      "Tech Fest & Hackathons"
    ];
  }

  let optionsHtml = categories.map(cat => `
    <option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>
  `).join('');

  optionsHtml += `
    <option value="__custom__" style="color:var(--gold-600); font-weight:700;">+ Add New Custom Category...</option>
  `;

  select.innerHTML = optionsHtml;
  handleMemoryCategoryChange(select);
}

function handleMemoryCategoryChange(selectElem) {
  const customGroup = document.getElementById("memory-custom-category-group");
  const customInput = document.getElementById("memory-custom-category");

  if (!customGroup) return;

  if (selectElem && selectElem.value === "__custom__") {
    customGroup.style.display = "block";
    if (customInput) customInput.focus();
  } else {
    customGroup.style.display = "none";
    if (customInput) customInput.value = "";
  }
}

/* --------------------------------------------------------------------------
   MULTI-IMAGE UPLOAD & CANVAS COMPRESSION (UP TO 50 PHOTOS)
   -------------------------------------------------------------------------- */
function renderMemoryPreviewGrid() {
  const container = document.getElementById("memory-preview-container");
  const grid = document.getElementById("memory-preview-grid");
  const badge = document.getElementById("memory-photo-count-badge");
  const summary = document.getElementById("memory-preview-summary");
  const promptArea = document.getElementById("memory-upload-prompt");

  if (badge) {
    badge.textContent = `${memoryUploadedImages.length} / 50 selected`;
    if (memoryUploadedImages.length >= 50) {
      badge.style.background = "var(--danger-500)";
      badge.style.color = "#fff";
    } else {
      badge.style.background = "";
      badge.style.color = "";
    }
  }

  if (memoryUploadedImages.length === 0) {
    if (container) container.style.display = "none";
    if (promptArea) promptArea.style.display = "block";
    if (grid) grid.innerHTML = "";
    return;
  }

  if (promptArea) promptArea.style.display = "none";
  if (container) container.style.display = "block";

  if (summary) {
    summary.textContent = `${memoryUploadedImages.length} photo${memoryUploadedImages.length > 1 ? 's' : ''} ready to submit`;
  }

  if (grid) {
    grid.innerHTML = memoryUploadedImages.map((src, idx) => `
      <div style="position: relative; width: 65px; height: 65px; border-radius: 4px; overflow: hidden; border: 1px solid var(--slate-300); background: #000;">
        <img src="${src}" alt="Photo ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
        <button type="button" 
          onclick="event.stopPropagation(); removeMemoryImage(${idx});" 
          title="Remove photo" 
          style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.9); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; line-height: 1;">
          ✕
        </button>
        <span style="position: absolute; bottom: 2px; left: 3px; font-size: 9px; color: #fff; text-shadow: 0 1px 2px #000; font-weight: 700;">#${idx + 1}</span>
      </div>
    `).join('');
  }
}

function removeMemoryImage(index) {
  if (index >= 0 && index < memoryUploadedImages.length) {
    memoryUploadedImages.splice(index, 1);
    renderMemoryPreviewGrid();
  }
}

function resetMemoryFileInput() {
  memoryUploadedImages = [];
  const fileInput = document.getElementById("memory-file-input");
  if (fileInput) fileInput.value = "";
  renderMemoryPreviewGrid();
}

// Compress single image file to lightweight Base64 string via Canvas
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 900; // Balanced for high clarity + lightweight storage
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

          // 0.75 JPEG compression yields ~30KB-50KB per photo
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function setupAddMemoryModal() {
  const form = document.getElementById("add-memory-form");
  const fileInput = document.getElementById("memory-file-input");
  const progressDiv = document.getElementById("memory-upload-progress");

  // Handle Multi-Image File Selection
  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Validate all are images
      const nonImages = files.filter(f => !f.type.startsWith("image/"));
      if (nonImages.length > 0) {
        if (typeof window.showToast === "function") {
          window.showToast("Only image files (PNG, JPG, JPEG, WEBP) are allowed.", "danger");
        } else {
          alert("Only image files (PNG, JPG, JPEG, WEBP) are allowed.");
        }
        fileInput.value = "";
        return;
      }

      // Check max 50 images limit
      const availableSlots = 50 - memoryUploadedImages.length;
      if (availableSlots <= 0) {
        const msg = "You have already selected the maximum of 50 pictures.";
        if (typeof window.showToast === "function") window.showToast(msg, "warning");
        else alert(msg);
        fileInput.value = "";
        return;
      }

      let toProcess = files;
      if (files.length > availableSlots) {
        const msg = `Only ${availableSlots} more photo(s) can be added (Maximum 50 photos). Processing the first ${availableSlots}.`;
        if (typeof window.showToast === "function") window.showToast(msg, "warning");
        else alert(msg);
        toProcess = files.slice(0, availableSlots);
      }

      if (progressDiv) {
        progressDiv.style.display = "block";
        progressDiv.textContent = `⏳ Optimizing 0 / ${toProcess.length} images...`;
      }

      let count = 0;
      for (const file of toProcess) {
        try {
          const compressed = await compressImageFile(file);
          memoryUploadedImages.push(compressed);
          count++;
          if (progressDiv) {
            progressDiv.textContent = `⏳ Optimizing ${count} / ${toProcess.length} images...`;
          }
        } catch (err) {
          console.error("Image compression error for file:", file.name, err);
        }
      }

      if (progressDiv) progressDiv.style.display = "none";
      fileInput.value = "";
      renderMemoryPreviewGrid();

      if (typeof window.showToast === "function") {
        window.showToast(`Added ${count} photo(s). Total: ${memoryUploadedImages.length}/50`, "success");
      }
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentUser = window.api ? window.api.getCurrentUser() : null;
      if (!currentUser) {
        if (typeof window.showToast === "function") {
          window.showToast("Authentication required. Please log in first.", "warning");
        }
        openAddMemoryModal();
        return;
      }

      const title = (document.getElementById("memory-title")?.value || "").trim();
      const date = document.getElementById("memory-date")?.value;
      const location = (document.getElementById("memory-location")?.value || "").trim();
      const categorySelect = document.getElementById("memory-category");
      let category = categorySelect ? categorySelect.value : "Campus & Adda";

      if (category === "__custom__") {
        const customCatInput = document.getElementById("memory-custom-category");
        const customVal = customCatInput ? customCatInput.value.trim() : "";
        if (!customVal) {
          if (typeof window.showToast === "function") {
            window.showToast("Please enter a custom category name.", "warning");
          } else {
            alert("Please enter a custom category name.");
          }
          if (customCatInput) customCatInput.focus();
          return;
        }
        category = customVal;
      }

      const details = (document.getElementById("memory-details")?.value || "").trim();
      const otherInfo = (document.getElementById("memory-other-info")?.value || "").trim();

      if (!title) {
        window.showToast?.("Memory Heading / Title is required.", "warning");
        return;
      }
      if (memoryUploadedImages.length === 0) {
        window.showToast?.("Please choose and upload at least one image file.", "warning");
        return;
      }
      if (memoryUploadedImages.length > 50) {
        window.showToast?.("Maximum 50 pictures can be uploaded per memory.", "danger");
        return;
      }

      const submitBtn = document.getElementById("submit-memory-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `Uploading ${memoryUploadedImages.length} Photos & Notifying Admin...`;
      }

      try {
        await window.api.submitMemory({
          title,
          date,
          location: location || "Department of Physics, Rajshahi College",
          category,
          details,
          otherInfo,
          images: memoryUploadedImages,
          image: memoryUploadedImages[0]
        }, currentUser);

        if (typeof window.showToast === "function") {
          window.showToast(`Memory with ${memoryUploadedImages.length} photo(s) submitted! Awaiting Admin approval.`, "success");
        }

        form.reset();
        resetMemoryFileInput();
        closeAddMemoryModal();

        // Refresh dynamic tabs & gallery list
        await loadCategoryTabs();
        await loadAndRenderGallery();
      } catch (err) {
        console.error("Memory submission error:", err);
        if (typeof window.showToast === "function") {
          window.showToast(err.message || "Failed to submit memory.", "danger");
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Submit for Admin Approval 🚀`;
        }
      }
    });
  }
}

// Global window bindings
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.selectLightboxPhoto = selectLightboxPhoto;
window.openAddMemoryModal = openAddMemoryModal;
window.closeAddMemoryModal = closeAddMemoryModal;
window.resetMemoryFileInput = resetMemoryFileInput;
window.removeMemoryImage = removeMemoryImage;
window.handleMemoryCategoryChange = handleMemoryCategoryChange;
