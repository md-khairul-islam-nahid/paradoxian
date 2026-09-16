/* ==========================================================================
   PARADOXIAN '26 - OFFICIAL EMAIL & OTP VERIFICATION SERVICE
   Official Portal Email: mail.paradox147@gmail.com
   Automated Verification, Sign Up OTP Validation & Dynamic Password Reset Engine
   Department of Physics - Rajshahi College, Rajshahi
   ========================================================================== */

(function (root, factory) {
  const service = factory();
  if (typeof root !== "undefined") {
    root.emailService = service;
    root.EMAIL_SERVICE = service;
  }
  if (typeof window !== "undefined") {
    window.emailService = service;
    window.EMAIL_SERVICE = service;
  }
  if (typeof module === "object" && module.exports) {
    module.exports = service;
  }
})(typeof self !== "undefined" ? self : (typeof window !== "undefined" ? window : this), function () {
  "use strict";

  const OFFICIAL_EMAIL = "mail.paradox147@gmail.com";
  const SENDER_NAME = "PARADOX-147 Official Portal";
  const SENDER_FULL = `"${SENDER_NAME}" <${OFFICIAL_EMAIL}>`;

  const STORAGE_KEYS = {
    OTPS: "paradox147_email_otps_v3",
    STUDENTS: "paradox147_students_v3"
  };

  class ParadoxEmailService {
    constructor() {
      this.officialEmail = OFFICIAL_EMAIL;
      this.senderName = SENDER_NAME;
      this.senderFull = SENDER_FULL;
    }

    /* Mask email for security display (e.g. n***m@gmail.com) */
    maskEmail(email) {
      if (!email || !email.includes("@")) return email;
      const [user, domain] = email.split("@");
      if (user.length <= 2) return `${user[0]}***@${domain}`;
      const maskedUser = user[0] + "***" + user[user.length - 1];
      return `${maskedUser}@${domain}`;
    }

    getApiEndpoints(path) {
      const endpoints = [];
      if (typeof window !== "undefined" && window.location && window.location.origin) {
        if (window.location.origin.startsWith("http") && !window.location.origin.includes(":5500") && !window.location.origin.includes(":3000")) {
          endpoints.push(path);
        }
      }
      endpoints.push(`http://localhost:5000${path}`);
      endpoints.push(`http://127.0.0.1:5000${path}`);
      return endpoints;
    }

    async callApi(path, options = {}) {
      const endpoints = this.getApiEndpoints(path);
      let lastErr = null;
      for (const endpoint of endpoints) {
        let timeoutId = null;
        try {
          const controller = new AbortController();
          // Allow up to 50s on live endpoints for Render cloud cold-start spin up
          const isLocal = endpoint.includes("localhost") || endpoint.includes("127.0.0.1");
          const timeoutMs = isLocal ? 10000 : 50000;
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          const res = await fetch(endpoint, {
            ...options,
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              ...(options.headers || {})
            }
          });
          clearTimeout(timeoutId);
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.message || `Server returned error (${res.status})`);
          }
          return data;
        } catch (err) {
          if (timeoutId) clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            lastErr = new Error("Connection to the mail server timed out. Please verify that the backend server is running.");
            continue;
          }
          if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError") && !err.message.includes("Load failed")) {
            throw err;
          }
          lastErr = err;
        }
      }
      throw new Error("Unable to connect to the official mail server at http://localhost:5000. Please ensure the backend server is running to dispatch automated emails from mail.paradox147@gmail.com.");
    }

    /* ------------------------------------------------------------------------
       1. SIGN UP EMAIL OTP VALIDATION DISPATCH (REAL INBOX DELIVERY)
       ------------------------------------------------------------------------ */
    async sendSignupOtp(formData) {
      const { name, email, roll, reg, phone, blood, district, password } = formData;
      const cleanEmail = (email || "").trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.includes("@")) {
        throw new Error("A valid email address is required.");
      }

      // Check local storage for duplicate roll or email
      let students = [];
      try {
        students = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || "[]");
      } catch (e) {}

      const cleanRoll = (roll || "").trim();
      const existingRoll = students.find(s => s.roll === cleanRoll);
      if (existingRoll) {
        const st = existingRoll.status === "Pending" ? "Pending Approval" : "Active";
        throw new Error(`Student ID / Roll ${cleanRoll} is already registered (${st}).`);
      }

      const existingEmail = students.find(s => s.email && s.email.toLowerCase() === cleanEmail);
      if (existingEmail) {
        throw new Error(`The email address ${cleanEmail} is already registered to a student account.`);
      }

      try {
        // Call Backend REST API for real Gmail SMTP dispatch directly to recipient's inbox
        const resData = await this.callApi("/api/auth/signup/send-otp", {
          method: "POST",
          body: JSON.stringify({
            name: name || "",
            email: cleanEmail,
            roll: cleanRoll,
            reg: (reg || "").trim(),
            phone: (phone || "").trim(),
            blood: (blood || "B+").trim(),
            district: (district || "Rajshahi").trim(),
            password: (password || "").trim()
          })
        });

        if (window.showToast) {
          window.showToast(`Verification code dispatched directly to your inbox at ${cleanEmail} from ${OFFICIAL_EMAIL}. Please check your email inbox and spam folder.`, "info", 8000);
        }

        return {
          success: true,
          email: cleanEmail,
          maskedEmail: this.maskEmail(cleanEmail),
          sender: OFFICIAL_EMAIL
        };
      } catch (err) {
        const isOffline = err.message && (err.message.includes("Unable to connect") || err.message.includes("Failed to fetch") || err.message.includes("timed out"));
        if (!isOffline) throw err;

        const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const offlineData = {
          email: cleanEmail,
          code: fallbackOtp,
          payload: formData,
          expiresAt: Date.now() + 10 * 60 * 1000
        };
        try { sessionStorage.setItem("paradox147_offline_signup_otp", JSON.stringify(offlineData)); } catch (e) {}

        if (window.showToast) {
          window.showToast(`Backend server offline. Verification Code: ${fallbackOtp} (Start server for real inbox delivery)`, "warning", 14000);
        }

        return {
          success: true,
          email: cleanEmail,
          maskedEmail: this.maskEmail(cleanEmail),
          sender: OFFICIAL_EMAIL,
          offlineCode: fallbackOtp
        };
      }
    }

    /* Verify Sign Up OTP via backend */
    async verifySignupOtp(email, enteredCode) {
      const cleanEmail = (email || "").trim().toLowerCase();
      const cleanCode = (enteredCode || "").trim();

      if (!cleanEmail || !cleanCode) {
        return {
          success: false,
          message: "Email address and verification code are required."
        };
      }

      try {
        const resData = await this.callApi("/api/auth/signup/verify-otp", {
          method: "POST",
          body: JSON.stringify({ email: cleanEmail, code: cleanCode })
        });

        return {
          success: true,
          email: cleanEmail,
          verifiedVia: OFFICIAL_EMAIL,
          payload: resData.payload || {}
        };
      } catch (err) {
        const isOffline = err.message && (err.message.includes("Unable to connect") || err.message.includes("Failed to fetch") || err.message.includes("timed out"));
        if (!isOffline) {
          return {
            success: false,
            message: err.message || "Invalid or expired verification code."
          };
        }

        let offlineData = null;
        try { offlineData = JSON.parse(sessionStorage.getItem("paradox147_offline_signup_otp") || "null"); } catch (e) {}
        if (offlineData && offlineData.email === cleanEmail && offlineData.code === cleanCode && Date.now() < offlineData.expiresAt) {
          return {
            success: true,
            email: cleanEmail,
            verifiedVia: OFFICIAL_EMAIL,
            payload: offlineData.payload || {}
          };
        }

        return {
          success: false,
          message: "Invalid or expired verification code."
        };
      }
    }

    /* ------------------------------------------------------------------------
       2. PASSWORD RESET OTP DISPATCH & UPDATE (GMAIL SMTP AUTOMATED)
       ------------------------------------------------------------------------ */
    async sendPasswordResetOtp(identifier) {
      const cleanId = (identifier || "").trim().toLowerCase();
      if (!cleanId) {
        throw new Error("Please enter your registered email address or student roll.");
      }

      try {
        // Call Backend REST API for real Google Accounts App Password SMTP dispatch
        const resData = await this.callApi("/api/auth/forgot-password/send-otp", {
          method: "POST",
          body: JSON.stringify({ identifier: cleanId })
        });

        const targetEmail = resData.email || cleanId;

        if (window.showToast) {
          window.showToast(`Verification code dispatched from ${OFFICIAL_EMAIL} directly to ${targetEmail}. Please check your email inbox (and spam folder).`, "info", 8000);
        }

        return {
          success: true,
          email: targetEmail,
          maskedEmail: this.maskEmail(targetEmail),
          sender: OFFICIAL_EMAIL
        };
      } catch (err) {
        const isOffline = err.message && (err.message.includes("Unable to connect") || err.message.includes("Failed to fetch") || err.message.includes("timed out"));
        if (!isOffline) throw err;

        // Fallback: Check local student store if server is offline
        let students = [];
        try { students = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || "[]"); } catch (e) {}
        if ((!students || students.length === 0) && typeof window !== "undefined" && window.SEED_DATA && window.SEED_DATA.students) {
          students = window.SEED_DATA.students;
        }

        const student = students.find(s => 
          (s.email && s.email.toLowerCase() === cleanId) || 
          (s.roll && s.roll.toLowerCase() === cleanId) ||
          (s.studentId && s.studentId.toLowerCase() === cleanId)
        );

        let targetEmail = cleanId;
        if (student && student.email) {
          targetEmail = student.email.toLowerCase();
        } else if (!cleanId.includes("@")) {
          throw new Error(`No student record was found for roll number "${identifier}". Please enter your registered email address.`);
        }

        const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const offlineData = {
          email: targetEmail,
          code: fallbackOtp,
          expiresAt: Date.now() + 10 * 60 * 1000
        };
        try { sessionStorage.setItem("paradox147_offline_reset_otp", JSON.stringify(offlineData)); } catch (e) {}

        if (window.showToast) {
          window.showToast(`Backend server offline. Verification Code: ${fallbackOtp} (Start server for Gmail inbox delivery)`, "warning", 14000);
        }

        return {
          success: true,
          email: targetEmail,
          maskedEmail: this.maskEmail(targetEmail),
          sender: OFFICIAL_EMAIL,
          offlineCode: fallbackOtp
        };
      }
    }

    /* Verify Password Reset OTP */
    async verifyPasswordResetOtp(email, enteredCode) {
      const cleanEmail = (email || "").trim().toLowerCase();
      const cleanCode = (enteredCode || "").trim();

      if (!cleanEmail || !cleanCode) {
        throw new Error("Email address and verification code are required.");
      }

      try {
        return await this.callApi("/api/auth/forgot-password/verify-otp", {
          method: "POST",
          body: JSON.stringify({ email: cleanEmail, code: cleanCode })
        });
      } catch (err) {
        const isOffline = err.message && (err.message.includes("Unable to connect") || err.message.includes("Failed to fetch") || err.message.includes("timed out"));
        if (!isOffline) throw err;

        let offlineData = null;
        try { offlineData = JSON.parse(sessionStorage.getItem("paradox147_offline_reset_otp") || "null"); } catch (e) {}
        if (offlineData && offlineData.email === cleanEmail && offlineData.code === cleanCode && Date.now() < offlineData.expiresAt) {
          return { success: true, message: "Code verified (offline mode)." };
        }
        throw new Error("Invalid or expired verification code.");
      }
    }

    /* Reset Password with OTP and update student password */
    async resetPasswordWithOtp(identifier, enteredCode, newPassword) {
      const cleanId = (identifier || "").trim().toLowerCase();
      const cleanCode = (enteredCode || "").trim();
      const cleanPass = (newPassword || "").trim();

      if (!cleanPass || cleanPass.length < 4) {
        throw new Error("Password must be at least 4 characters long.");
      }

      try {
        await this.callApi("/api/auth/forgot-password/reset-password", {
          method: "POST",
          body: JSON.stringify({ email: cleanId, code: cleanCode, newPassword: cleanPass })
        });
      } catch (err) {
        const isOffline = err.message && (err.message.includes("Unable to connect") || err.message.includes("Failed to fetch") || err.message.includes("timed out"));
        if (!isOffline) throw err;
      }

      // Update local storage for client-side persistence
      let students = [];
      try { students = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || "[]"); } catch (e) {}
      if ((!students || students.length === 0) && typeof window !== "undefined" && window.SEED_DATA && window.SEED_DATA.students) {
        students = JSON.parse(JSON.stringify(window.SEED_DATA.students));
      }
      const student = students.find(s => (s.email && s.email.toLowerCase() === cleanId) || (s.roll && s.roll.toLowerCase() === cleanId));
      if (student) {
        student.password = cleanPass;
        student.passwordUpdatedAt = new Date().toISOString();
        student.passwordResetVia = OFFICIAL_EMAIL;
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      }

      // DUAL-ACCOUNT PASSWORD SYNC: Also sync to Admins storage
      let admins = [];
      try { admins = JSON.parse(localStorage.getItem("paradox147_admins_v3") || "[]"); } catch (e) {}
      const linkedAdmin = admins.find(a => 
        (a.email && a.email.toLowerCase() === cleanId) || 
        (a.roll && a.roll.toLowerCase() === cleanId) ||
        (cleanId === "nahid" && a.isSuperAdmin)
      );
      if (linkedAdmin) {
        linkedAdmin.password = cleanPass;
        linkedAdmin.passwordUpdatedAt = new Date().toISOString();
        localStorage.setItem("paradox147_admins_v3", JSON.stringify(admins));
      }

      try { sessionStorage.removeItem("paradox147_offline_reset_otp"); } catch (e) {}

      if (window.showToast) {
        window.showToast(`Password successfully updated through official email ${OFFICIAL_EMAIL}!`, "success", 6000);
      }

      return { success: true, message: "Password updated successfully." };
    }

    /* ------------------------------------------------------------------------
       3. NO-OP STUBS (SIMULATOR REMOVED - DIRECT INBOX DISPATCH ONLY)
       ------------------------------------------------------------------------ */
    openEmailPreviewModal() {
      // Disabled: emails are delivered directly to real user inbox
    }

    closeEmailPreviewModal() {
      // Disabled: emails are delivered directly to real user inbox
    }

    triggerEmailDispatchEvent() {
      // Disabled: emails are delivered directly to real user inbox
    }

    autofillOtpInputs() {
      // Disabled: user types code received in their actual inbox
    }
  }

  return new ParadoxEmailService();
});
