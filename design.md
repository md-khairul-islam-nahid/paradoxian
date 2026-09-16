# Paradox-147 — System Design Specification
**Department of Physics • Rajshahi College, Rajshahi**  
*The 147th Honours Batch (2024-25 Session)*  
*Motto:* "A beautiful contradiction of Chaos and Brilliance."  
*Tagline:* "• We Live • We Laugh • We Conquer •"

---

## 1. Executive Summary & Design Vision

Paradox-147 is a next-generation academic portal and Content Management System (CMS) designed for the 147th Physics Honours batch of Rajshahi College. The platform delivers three unified experiences:
1. **Public Academic Portal & Directory**: Showcase batch identity, verified public student directory (with privacy controls), official circulars, exam notices, and event galleries.
2. **Authenticated Student Dashboard**: Personalized academic hub displaying full student profiles, class routines, academic resources, batch treasury tracking, and peer directory with social handles.
3. **Confidential CMS Admin Portal**: High-security management cockpit for Class Representative (CR) / Administrators to perform full CRUD on class routines, circulars, student registrations, verification approvals, roster PDF generation, and batch finances.
4. **Guest Dashboard & Seamless User Migration Engine**: An interactive guest workspace where prospective students, visitors, and unverified batch mates can explore schedules, bookmark notices, take study notes, and submit verification requests. Upon login or account approval, all guest data is automatically migrated into their permanent authenticated profile.

---

## 2. Visual Design System & Design Tokens

The visual identity embodies the physical concepts of astrophysics and quantum dynamics, combined with the heritage of Rajshahi College.

### 2.1 Color Palette Tokens
```css
:root {
  /* Brand Foundations */
  --color-primary: #0f172a;        /* Deep Space Obsidian Navy */
  --color-primary-light: #1e293b;  /* Slate Navy (Surface Cards) */
  --color-primary-dark: #020617;   /* Void Black */
  
  /* Quantum Energy Accents */
  --color-accent-blue: #2563eb;    /* Electric Quantum Blue */
  --color-accent-cyan: #06b6d4;    /* Photon Cyan */
  --color-accent-gold: #d4af37;    /* Physics Honours Gold */
  --color-accent-crimson: #991b1b; /* Royal Rajshahi Crimson */

  /* Neutral Spectrum */
  --color-bg-body: #0a0e17;        /* Cosmic Dark Background */
  --color-bg-surface: #111827;     /* Card & Panel Base */
  --color-bg-surface-elevated: #1f2937; /* Dropdowns & Modals */
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-glow: rgba(37, 99, 235, 0.35);

  /* Typography */
  --color-text-primary: #f8fafc;   /* Pure Frost White */
  --color-text-secondary: #94a3b8; /* Muted Slate */
  --color-text-tertiary: #64748b;  /* Dark Slate */

  /* Status Colors */
  --color-success: #10b981;        /* Active / Verified Green */
  --color-warning: #f59e0b;        /* Pending Approval Amber */
  --color-danger: #ef4444;         /* Error / Rejected Red */
  --color-info: #3b82f6;           /* Informational Cyan-Blue */

  /* Glassmorphism & Elevation */
  --glass-bg: rgba(17, 24, 39, 0.75);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-backdrop-blur: blur(16px);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 24px rgba(37, 99, 235, 0.25);
}
```

### 2.2 Typography Hierarchy
- **Display & Headings**: `'Outfit', 'Plus Jakarta Sans', sans-serif` — weights `700`, `800`, `900`.
- **Body & Interface**: `'Inter', system-ui, sans-serif` — weights `400`, `500`, `600`.
- **Monospace & Code**: `'JetBrains Mono', 'Fira Code', monospace` — for IDs, Roll Numbers, Timestamps, and API Keys.

---

## 3. Reusable UI Component Architecture

To eliminate redundant markup and ensure effortless long-term maintainability, all global layouts share self-contained modular components.

### 3.1 Reusable Header Component (`js/components/header.js`)
- **Structure**:
  - Brand identity with Batch-147 official crest and physics badge.
  - Responsive navigation links (Home, Student Directory, Routine & Notices, Gallery, Guest Hub, Dashboard).
  - Dynamic Auth Status Pill:
    - **Guest Mode**: Shows "Guest Mode" badge with a "Sign In / Register" CTA and "Guest Workspace" quick trigger.
    - **Student Mode**: Shows verified avatar, student name, roll number, and "My Dashboard" shortcut.
    - **Admin Mode**: Shows gold "Administrator (CR)" badge, secret CMS cockpit link, and quick sign-out.
  - Mobile hamburger toggle with smooth glassmorphism overlay.

### 3.2 Reusable Footer Component (`js/components/footer.js`)
- **Structure**:
  - Physics batch bio: *"A beautiful contradiction of Chaos and Brilliance."*
  - Quick academic links (Rajshahi College Official, National University Portal, Physics e-Library).
  - Emergency CR Contacts: MD. Khairul Islam Nahid (+8801859445559).
  - Batch social links (Facebook, GitHub, YouTube, LinkedIn).
  - Dynamic year & copyright declaration.

### 3.3 Reusable Feedback & Notification Toast (`js/components/toast.js`)
- Lightweight, accessible notification manager handling success, warning, error, and migration confirmation events.

### 3.4 Reusable Modal Dialog Controller (`js/components/modal.js`)
- Universal modal manager for verification requests, profile editors, notice viewer, and routine schedule forms.

---

## 4. Guest Dashboard & Migration Engine Specification

### 4.1 Guest Dashboard Experience
Visitors and non-verified students are not locked out; they receive an empowering **Guest Dashboard**:
- **Guest Bookmarks**: Save important notices, exam dates, or lab announcements locally in `localStorage['paradox147_guest_bookmarks']`.
- **Personalized Schedule Planner**: Pin classes from the routine table to "My Class Schedule" with local storage persistence.
- **Guest Study Notes Scratchpad**: Quick notepad for lab prep, formulas, and homework items.
- **Verification Trigger**: Dedicated card allowing the guest to submit their student verification request directly from their workspace.

### 4.2 Guest-to-User Migration Protocol
When a guest signs in or registers as a verified student:
```
[Guest Workspace Activity]
  ├── Bookmarked Notices (IDs: [3, 7])
  ├── Pinned Routine Classes (IDs: [12, 18])
  └── Study Notes ("Lab 3 Experiment Notes...")
           │
           ▼
[Authentication / Verification Trigger]
  - User signs in with Student ID or completes registration
           │
           ▼
[Migration Controller: executeGuestMigration(user)]
  1. Inspect local guest storage keys (`paradox147_guest_*`)
  2. If data exists:
     a. Fetch existing student user profile from API/Store
     b. Merge bookmarked notices into user.bookmarks (de-duplicated)
     c. Merge pinned classes into user.savedRoutine (de-duplicated)
     d. Append guest notes into user.studyNotes with migration timestamp
     e. Send migration telemetry payload to Backend API `/api/users/migrate`
     f. Clear temporary guest storage or mark as migrated
  3. Display interactive toast: "Migration Successful! 3 notices and 2 notes moved to your student account."
```

---

## 5. Confidential CMS Admin Portal Specification

### 5.1 Authentication Guard
- Admin credentials strictly enforced:
  - Username: `nahid` or official email `iam.nahidkhan.bd@gmail.com`
  - Passphrase: `@NAHID_KHAN_2024227170`
- Zero guest or unverified student leakage into admin operations.

### 5.2 Admin CMS Functional Modules
1. **Notice & Circular CMS**: Add, edit, archive, and pin batch notices with rich markdown/HTML support.
2. **Academic Routine CMS**: Edit days, course codes (e.g. PHY-101), room numbers, teachers, and lab slots with immediate live reflection.
3. **Student Verification Desk**: Review incoming registration requests with Student ID, Reg Number, Blood Group, Phone, and Email; approve or reject with one click.
4. **Student Registry & PDF Roster Generator**:
   - Filter and search by roll, name, district, blood group.
   - Edit student profiles or override contact details.
   - Export official batch roster PDF sorted by Student ID (Roll) or Registration Number with clean columnar format.
5. **Batch Treasury CMS**: Update fund balance, collection dues, and expenditures.

---

## 6. Security, Privacy & Compliance Rules

1. **Student Privacy Gate**:
   - Public view exposes only: Full Name, Home District, Profile Avatar, and Email.
   - Sensitive data (Phone Number, Registration Number, Blood Group, CGPA, and Private Socials) is locked behind the authenticated student dashboard.
   - Students can customize privacy flags on their own social handles and phone visibility.
2. **Data Integrity & Fallback**:
   - Dual-layer storage: High-speed REST API backend with automated client-side localStorage fallback ensures offline resilience.
