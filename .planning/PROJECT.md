# Project: Paradox-147 Academic Portal & CMS
**Department of Physics • Rajshahi College, Rajshahi**  
*The 147th Honours Batch (2024-25 Session)*  
*Motto:* "A beautiful contradiction of Chaos and Brilliance."  
*Tagline:* "• We Live • We Laugh • We Conquer •"

---

## 1. Project Context & Vision

Paradox-147 is an academic web application and dynamic Content Management System (CMS) designed for the students and administrators of the 147th Honours Batch in the Department of Physics at Rajshahi College. 

The application resolves three key challenges:
1. **Public Information vs Privacy**: Provides public access to general batch circulars, routines, and a privacy-filtered directory (names, photo, district, email only), while securely protecting confidential student data (phone, registration number, blood group, private socials).
2. **Unified Administration & CMS**: Equips the Class Representative (CR MD. Khairul Islam Nahid) with administrative tools to edit routines, issue circulars, approve student verification requests, and export official roster PDFs.
3. **Guest Exploration & User Migration**: Delivers a Guest Dashboard where prospective students and visitors can bookmark notices, pin class routines, and write study notes, with a migration engine that transfers their guest data into their permanent student profile upon account registration or login.

---

## 2. Key Stakeholders & Personas

- **Administrator / CR (MD. Khairul Islam Nahid)**: Full CMS authority over all content, student verification approvals, and roster management.
- **Enrolled Student**: Accesses authenticated student dashboard, full peer contact directory, class routine, and personalized study resources.
- **Guest / Prospective Batch Mate**: Explores public portal, uses guest dashboard for notes and bookmarks, and initiates verification requests.

---

## 3. Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System with Physics Obsidian/Gold tokens), Modern Vanilla JavaScript (ES6+).
- **Architecture**: Modular Reusable Component Engine (`header.js`, `footer.js`, `toast.js`, `modal.js`) with zero template duplication.
- **Backend**: Dynamic Node.js / Express REST API server (`server/server.js`) backed by persistent JSON file store with dual-mode client fallback.
- **Reporting**: Client-side & backend PDF engine (`jspdf` + `autotable`) for academic batch roster exports.

---

## 4. Key Architectural Documents
- [design.md](file:///c:/Users/iamna/OneDrive/Desktop/Paradoxian/design.md) — System Design, UI Tokens, and Component Specifications
- [architecture.md](file:///c:/Users/iamna/OneDrive/Desktop/Paradoxian/architecture.md) — Directory Tree, Path Diagrams, and Communication Flows
- [phase-1.md](file:///c:/Users/iamna/OneDrive/Desktop/Paradoxian/phase-1.md) — Reusable Components & Guest Dashboard
- [phase-2.md](file:///c:/Users/iamna/OneDrive/Desktop/Paradoxian/phase-2.md) — Dynamic Backend & CMS Admin Portal
- [phase-3.md](file:///c:/Users/iamna/OneDrive/Desktop/Paradoxian/phase-3.md) — Guest-to-User Migration Engine
- [phase-4.md](file:///c:/Users/iamna/OneDrive/Desktop/Paradoxian/phase-4.md) — Security, PDF Roster & Verification
