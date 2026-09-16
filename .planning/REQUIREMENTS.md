# Paradox-147 — Requirements Matrix & Traceability
**Department of Physics • Rajshahi College, Rajshahi**

---

## 1. Functional Requirements (FR)

### Module A: Reusability & Component Architecture
- **FR-01**: Universal Header component dynamically injected into all pages displaying batch logo, navigation, and role-specific auth badge (Guest vs Student vs Admin).
- **FR-02**: Universal Footer component dynamically injected into all pages with department credentials, CR emergency contacts, and social links.
- **FR-03**: Reusable Toast notification system to provide non-blocking visual feedback for all CRUD and migration actions.
- **FR-04**: Code maintainability through clear section comments and modular file organization.

### Module B: Guest Dashboard & Migration Feature
- **FR-05**: Dedicated Guest Dashboard (`guest-dashboard.html`) accessible without authentication.
- **FR-06**: Guest Bookmarks: Guests can bookmark notices and circulars to browser storage.
- **FR-07**: Guest Schedule Planner: Guests can pin specific classes from routine to their personal timetable.
- **FR-08**: Guest Study Scratchpad: Guests can write and manage private study notes and lab reminders.
- **FR-09**: Guest-to-User Migration Engine: When a guest logs in or registers as a verified student, all guest bookmarks, pinned classes, and study notes are automatically migrated into the authenticated student profile with interactive confirmation.

### Module C: Dynamic Backend & REST API
- **FR-10**: Node.js/Express server providing REST endpoints for Authentication, Students, Notices, Routine, Guest Sync, and CMS.
- **FR-11**: Persistent JSON storage on the server with atomic read/writes.
- **FR-12**: Dual-mode API client (`js/api.js`) that uses HTTP REST endpoints when server is online and falls back to local storage if offline.
- **FR-22**: Automated Student Password Recovery with official Google Accounts App Password SMTP engine (`mail.paradox147@gmail.com`).
- **FR-23**: Login portal navigation refinement: top tab bar displays only Student Login and Admin Login, while maintaining the bottom registration trigger.

### Module D: CMS Admin Portal
- **FR-13**: Confidential Admin authentication (`nahid` / `@NAHID_KHAN_2024227170`).
- **FR-14**: Notice CMS: Admin can create, edit, delete, and pin circulars.
- **FR-15**: Routine CMS: Admin can edit time slots, subjects, rooms, and teachers.
- **FR-16**: Student Verification Desk: Admin can review, approve, or reject new student registrations.
- **FR-17**: Student Registry & Roster PDF: Admin can edit student records and download official PDF roster in exact column order with ID/Reg sorting.

### Module E: Privacy & Security Gates
- **FR-18**: Public Directory Privacy: Public visitors see only Name, District, Email, and Avatar.
- **FR-19**: Authenticated Student Directory: Logged-in students can view peer contacts, blood group, registration number, and full social media profiles.
- **FR-20**: Student Privacy Toggles: Students can toggle visibility of their contact phone and social handles.
- **FR-21**: Strict Session Guard: Immediate redirect to login on unauthorized dashboard access or sign-out.

---

## 2. Non-Functional Requirements (NFR)

- **NFR-01 (Performance)**: Page load under 1.5s, instantaneous local component rendering.
- **NFR-02 (Aesthetics)**: Dark space-physics theme (Obsidian Navy `#0F172A`, Honours Gold `#D4AF37`, Quantum Blue `#2563EB`).
- **NFR-03 (Offline Resilience)**: Client-side storage fallback when Node backend is inactive.
- **NFR-04 (Maintainability)**: Detailed inline comments throughout the codebase.
