/* ==========================================================================
   PARADOXIAN '26 - AUTHENTICATION & STUDENT VERIFICATION CONTROLLER
   Tabs (Student Sign In ⇄ Sign Up & Verification ⇄ Admin Login),
   Client Form Validation, Verification Request Submission & Password Toggle
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initAuthPage();
});

let currentAuthTab = "student-login"; // 'student-login' | 'student-signup' | 'admin-login'
let currentRole = "student"; // 'student' | 'admin'

function initAuthPage() {
  setupAuthTabs();
  setupPasswordToggle();
  setupDemoFillButtons();
  setupLoginForm();
  setupSignupForm();
  setupForgotPassword();
  checkUrlParamsAndRedirects();
}

/* --------------------------------------------------------------------------
   TAB NAVIGATION & PANEL SWITCHING
   -------------------------------------------------------------------------- */
function setupAuthTabs() {
  const tabs = document.querySelectorAll(".auth-tab");
  const loginPanel = document.getElementById("auth-login-panel");
  const signupPanel = document.getElementById("auth-signup-panel");
  const successPanel = document.getElementById("auth-success-panel");

  const identifierLabel = document.getElementById("auth-identifier-label");
  const identifierInput = document.getElementById("auth-identifier");
  const helperText = document.getElementById("auth-role-helper");
  const demoPills = document.getElementById("demo-pills-container");
  const newStudentCta = document.getElementById("new-student-cta");
  const authSubmitBtn = document.getElementById("auth-submit-btn");

  function activateTab(tabKey) {
    currentAuthTab = tabKey;
    tabs.forEach(t => {
      const isMatch = t.getAttribute("data-tab") === tabKey;
      t.classList.toggle("active", isMatch);
      t.setAttribute("aria-selected", isMatch ? "true" : "false");
    });

    clearValidationErrors();

    // Reset panels
    if (tabKey === "student-signup") {
      if (loginPanel) loginPanel.style.display = "none";
      if (signupPanel) signupPanel.style.display = "block";
      if (successPanel) successPanel.style.display = "none";
    } else {
      if (loginPanel) loginPanel.style.display = "block";
      if (signupPanel) signupPanel.style.display = "none";
      if (successPanel) successPanel.style.display = "none";

      if (tabKey === "admin-login") {
        currentRole = "admin";
        if (identifierLabel) identifierLabel.textContent = "Administrator Username or Official Email";
        if (identifierInput) identifierInput.placeholder = "nahid or iam.nahidkhan.bd@gmail.com";
        if (helperText) helperText.textContent = "Confidential administrator access. Only authorized CR / Administrator credentials accepted.";
        if (demoPills) demoPills.style.display = "none";
        if (newStudentCta) newStudentCta.style.display = "none";
        if (authSubmitBtn) {
          authSubmitBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Authenticate Administrator
          `;
        }
      } else {
        // student-login
        currentRole = "student";
        if (identifierLabel) identifierLabel.textContent = "Student ID (Roll) or Registered Email";
        if (identifierInput) identifierInput.placeholder = "e.g. 241076102 or student@gmail.com";
        if (helperText) helperText.textContent = "Access your student dashboard, academic routine, and batch metrics.";
        if (demoPills) demoPills.style.display = "flex";
        if (newStudentCta) newStudentCta.style.display = "block";
        if (authSubmitBtn) {
          authSubmitBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            Sign In to Portal
          `;
        }
      }
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTab = tab.getAttribute("data-tab");
      activateTab(targetTab);
    });
  });

  // Quick navigation triggers
  const btnGotoSignup = document.getElementById("btn-goto-signup");
  if (btnGotoSignup) {
    btnGotoSignup.addEventListener("click", () => activateTab("student-signup"));
  }

  const linkGotoLogin = document.getElementById("link-goto-login");
  if (linkGotoLogin) {
    linkGotoLogin.addEventListener("click", () => activateTab("student-login"));
  }

  const btnSuccessToLogin = document.getElementById("btn-success-to-login");
  if (btnSuccessToLogin) {
    btnSuccessToLogin.addEventListener("click", () => activateTab("student-login"));
  }

  // Expose tab switcher
  window.switchAuthTab = activateTab;
}

/* --------------------------------------------------------------------------
   PASSWORD SHOW / HIDE TOGGLE
   -------------------------------------------------------------------------- */
function setupPasswordToggle() {
  const toggleBtn = document.getElementById("auth-toggle-password");
  const passwordInput = document.getElementById("auth-password");

  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      toggleBtn.innerHTML = isPassword 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="10" r="3"/></svg>`;
    });
  }
}

/* --------------------------------------------------------------------------
   QUICK DEMO CREDENTIALS AUTOFILL
   -------------------------------------------------------------------------- */
function setupDemoFillButtons() {
  const fillStudentBtn = document.getElementById("fill-student-demo");
  const identifierInput = document.getElementById("auth-identifier");
  const passwordInput = document.getElementById("auth-password");

  if (fillStudentBtn) {
    fillStudentBtn.addEventListener("click", () => {
      if (window.switchAuthTab) window.switchAuthTab("student-login");
      if (identifierInput) identifierInput.value = "241076102";
      if (passwordInput) passwordInput.value = "password123";
      clearValidationErrors();
      window.showToast("Filled Demo Student credentials (Nusrat Jahan Mim)", "info");
    });
  }
}

/* --------------------------------------------------------------------------
   SIGN IN FORM SUBMISSION
   -------------------------------------------------------------------------- */
function setupLoginForm() {
  const form = document.getElementById("auth-login-form");
  const identifierInput = document.getElementById("auth-identifier");
  const passwordInput = document.getElementById("auth-password");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearValidationErrors();

    let isValid = true;
    const identifierVal = identifierInput.value.trim();
    const passwordVal = passwordInput.value.trim();

    if (!identifierVal) {
      showError(identifierInput, "Please enter your Student ID (Roll) or Email.");
      isValid = false;
    }

    if (!passwordVal) {
      showError(passwordInput, "Please enter your password.");
      isValid = false;
    } else if (passwordVal.length < 4) {
      showError(passwordInput, "Password must be at least 4 characters long.");
      isValid = false;
    }

    if (!isValid) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Signing in...</span>`;

    try {
      const user = await window.api.login({
        identifier: identifierVal,
        password: passwordVal,
        role: currentRole
      });

      // Set initial view according to role or user admin status
      const isSuperOrAdmin = Boolean(
        (window.api && typeof window.api.isAdmin === "function" && window.api.isAdmin(user)) ||
        user.isAdmin === true || 
        user.isSuperAdmin === true || 
        user.email === "iam.nahidkhan.bd@gmail.com" || 
        user.roll === "2024227170" ||
        currentRole === "admin"
      );
      sessionStorage.setItem("paradox_active_view", isSuperOrAdmin ? "admin" : "student");

      window.showToast(`Welcome back, ${user.name}!`, "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 600);

    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      const msg = err.message || "Invalid credentials.";

      // Check if message is a pending verification notification
      if (msg.includes("Pending") || msg.includes("PENDING")) {
        showGlobalAlert(msg, "warning");
        showError(identifierInput, "Verification Pending: Waiting for CR approval.");
      } else {
        showError(passwordInput, msg);
        showGlobalAlert(msg, "danger");
      }
      window.showToast(msg, "danger", 4500);
    }
  });
}

/* --------------------------------------------------------------------------
   STUDENT SIGN UP & VERIFICATION FORM SUBMISSION
   -------------------------------------------------------------------------- */
function setupSignupForm() {
  const form = document.getElementById("auth-signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearValidationErrors();

    const nameInput = document.getElementById("signup-name");
    const rollInput = document.getElementById("signup-roll");
    const regInput = document.getElementById("signup-reg");
    const phoneInput = document.getElementById("signup-phone");
    const bloodSelect = document.getElementById("signup-blood");
    const districtInput = document.getElementById("signup-district");
    const emailInput = document.getElementById("signup-email");
    const passwordInput = document.getElementById("signup-password");
    const confirmInput = document.getElementById("signup-confirm-password");

    const nameVal = nameInput ? nameInput.value.trim() : "";
    const rollVal = rollInput ? rollInput.value.trim() : "";
    const regVal = regInput ? regInput.value.trim() : "";
    const phoneVal = phoneInput ? phoneInput.value.trim() : "";
    const bloodVal = bloodSelect ? bloodSelect.value : "B+";
    const districtVal = districtInput ? districtInput.value.trim() : "Rajshahi";
    const emailVal = emailInput ? emailInput.value.trim() : "";
    const passwordVal = passwordInput ? passwordInput.value.trim() : "";
    const confirmVal = confirmInput ? confirmInput.value.trim() : "";

    let isValid = true;

    if (!nameVal) {
      showError(nameInput, "Please enter your full name.");
      isValid = false;
    }

    if (!rollVal) {
      showError(rollInput, "Please enter your Student ID / Roll number.");
      isValid = false;
    }

    if (!regVal) {
      showError(regInput, "Please enter your University Registration Number.");
      isValid = false;
    }

    if (!phoneVal) {
      showError(phoneInput, "Please enter your valid contact phone number.");
      isValid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailPattern.test(emailVal)) {
      showError(emailInput, "Please enter a valid university or personal email address.");
      isValid = false;
    }

    if (!passwordVal || passwordVal.length < 4) {
      showError(passwordInput, "Password must be at least 4 characters.");
      isValid = false;
    }

    if (passwordVal !== confirmVal) {
      showError(confirmInput, "Passwords do not match. Please re-enter.");
      isValid = false;
    }

    if (!isValid) return;

    pendingSignupData = {
      name: nameVal,
      roll: rollVal,
      studentId: rollVal,
      reg: regVal,
      phone: phoneVal,
      bloodGroup: bloodVal,
      district: districtVal,
      email: emailVal,
      password: passwordVal
    };

    const submitBtn = document.getElementById("signup-submit-btn");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Dispatching OTP from mail.paradox147@gmail.com...</span>`;

    try {
      if (!window.emailService) {
        throw new Error("Email service is initializing. Please try again in a moment.");
      }

      // Dispatch 6-digit OTP from official portal mailer mail.paradox147@gmail.com
      const otpRes = await window.emailService.sendSignupOtp(pendingSignupData);

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      // Open Sign Up OTP Verification Modal
      openSignupOtpModal(otpRes.email);

    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      const msg = err.message || "Registration submission failed.";
      showGlobalAlert(msg, "danger");
      window.showToast(msg, "danger");
    }
  });
}

/* --------------------------------------------------------------------------
   EMAIL OTP SIGN UP VERIFICATION MODAL CONTROLLERS
   -------------------------------------------------------------------------- */
let pendingSignupData = null;
let signupCountdownInterval = null;
let resetCountdownInterval = null;
let activeResetIdentifier = "";

function openSignupOtpModal(email) {
  const modal = document.getElementById("signup-otp-modal");
  const emailDisplay = document.getElementById("signup-otp-email-display");
  const otpInput = document.getElementById("signup-otp-input");
  const feedback = document.getElementById("signup-otp-feedback");

  if (emailDisplay) emailDisplay.textContent = email || (pendingSignupData && pendingSignupData.email) || "student@gmail.com";
  if (otpInput) {
    otpInput.value = "";
    otpInput.classList.remove("is-invalid");
  }
  if (feedback) feedback.style.display = "none";

  if (modal) modal.classList.add("active");
  startSignupCountdown();

  setTimeout(() => {
    if (otpInput) otpInput.focus();
  }, 150);
}

function closeSignupOtpModal() {
  const modal = document.getElementById("signup-otp-modal");
  if (modal) modal.classList.remove("active");
  if (signupCountdownInterval) {
    clearInterval(signupCountdownInterval);
    signupCountdownInterval = null;
  }
}

function startSignupCountdown() {
  let seconds = 60;
  const countdownEl = document.getElementById("signup-otp-countdown");
  const timerTextEl = document.getElementById("signup-otp-timer-text");
  const resendBtn = document.getElementById("signup-otp-resend-btn");

  if (timerTextEl) timerTextEl.style.display = "inline";
  if (resendBtn) resendBtn.style.display = "none";
  if (countdownEl) countdownEl.textContent = String(seconds);

  if (signupCountdownInterval) clearInterval(signupCountdownInterval);

  signupCountdownInterval = setInterval(() => {
    seconds--;
    if (countdownEl) countdownEl.textContent = String(seconds);
    if (seconds <= 0) {
      clearInterval(signupCountdownInterval);
      signupCountdownInterval = null;
      if (timerTextEl) timerTextEl.style.display = "none";
      if (resendBtn) resendBtn.style.display = "inline-flex";
    }
  }, 1000);
}

async function handleSignupOtpResend() {
  if (!pendingSignupData || !window.emailService) return;
  try {
    const res = await window.emailService.sendSignupOtp(pendingSignupData);
    startSignupCountdown();
    window.showToast(`New verification code dispatched to ${res.email} from mail.paradox147@gmail.com!`, "success");
  } catch (err) {
    window.showToast(err.message || "Failed to resend code.", "danger");
  }
}

async function handleSignupOtpSubmit(e) {
  if (e) e.preventDefault();
  const otpInput = document.getElementById("signup-otp-input");
  const feedback = document.getElementById("signup-otp-feedback");
  const verifyBtn = document.getElementById("btn-verify-signup-otp");

  if (!otpInput || !pendingSignupData) return;
  const codeVal = otpInput.value.trim();

  if (!codeVal || codeVal.length < 6) {
    otpInput.classList.add("is-invalid");
    if (feedback) {
      feedback.textContent = "Please enter the complete 6-digit verification code.";
      feedback.style.display = "block";
    }
    return;
  }

  // Verify OTP via Email Service
  const verification = await window.emailService.verifySignupOtp(pendingSignupData.email, codeVal);

  if (!verification.success) {
    otpInput.classList.add("is-invalid");
    if (feedback) {
      feedback.textContent = verification.message || "Invalid or expired verification code.";
      feedback.style.display = "block";
    }
    return;
  }

  // Valid OTP: proceed with registration and set emailVerified = true
  const originalBtnText = verifyBtn.innerHTML;
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = `<span>Creating Verified Account...</span>`;

  try {
    const createdStudent = await window.api.registerStudent({
      ...pendingSignupData,
      emailVerified: true,
      verifiedVia: "mail.paradox147@gmail.com",
      emailVerifiedAt: new Date().toISOString()
    });

    closeSignupOtpModal();

    // Show Success Confirmation Panel
    const signupPanel = document.getElementById("auth-signup-panel");
    const successPanel = document.getElementById("auth-success-panel");

    const displayName = document.getElementById("success-display-name");
    const displayId = document.getElementById("success-display-id");
    const displayEmail = document.getElementById("success-display-email");

    if (displayName) displayName.textContent = createdStudent.name;
    if (displayId) displayId.textContent = createdStudent.roll;
    if (displayEmail) displayEmail.innerHTML = `${createdStudent.email} <span class="badge badge-success" style="margin-left:0.35rem; font-size:0.75rem;">Verified via mail.paradox147@gmail.com</span>`;

    if (signupPanel) signupPanel.style.display = "none";
    if (successPanel) successPanel.style.display = "block";

    window.showToast("Email validated! Registration request submitted for CR Nahid's approval.", "success", 5000);

    // Pre-fill login identifier
    const loginIdentifier = document.getElementById("auth-identifier");
    if (loginIdentifier) loginIdentifier.value = createdStudent.email;

  } catch (err) {
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = originalBtnText;
    if (feedback) {
      feedback.textContent = err.message || "Failed to finalize registration.";
      feedback.style.display = "block";
    }
  }
}

/* --------------------------------------------------------------------------
   FORGOT PASSWORD RECOVERY CONTROLLER
   Official Email: mail.paradox147@gmail.com
   -------------------------------------------------------------------------- */
let currentForgotEmail = "";
let currentForgotOtp = "";
let forgotOtpTimerInterval = null;

function setupForgotPassword() {
  const btnForgotPassword = document.getElementById("btn-forgot-password");
  if (btnForgotPassword) {
    btnForgotPassword.addEventListener("click", (e) => {
      e.preventDefault();
      openForgotPasswordModal();
    });
  }

  // Close modal when clicking on backdrop
  const modal = document.getElementById("forgot-password-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeForgotPasswordModal();
    });
  }

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && (modal.classList.contains("active") || modal.style.display === "flex")) {
      closeForgotPasswordModal();
    }
  });
}

function openForgotPasswordModal() {
  const modal = document.getElementById("forgot-password-modal");
  if (!modal) return;

  switchForgotStep("email");

  const emailInput = document.getElementById("forgot-email-input");
  const loginInput = document.getElementById("auth-identifier");
  if (emailInput) {
    emailInput.value = (loginInput && loginInput.value) ? loginInput.value.trim() : "";
  }

  const feedback = document.getElementById("forgot-email-feedback");
  if (feedback) feedback.style.display = "none";

  modal.style.display = "";
  modal.classList.add("active");
  setTimeout(() => {
    if (emailInput) emailInput.focus();
  }, 100);
}

function closeForgotPasswordModal() {
  const modal = document.getElementById("forgot-password-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "";
  }
  if (forgotOtpTimerInterval) {
    clearInterval(forgotOtpTimerInterval);
    forgotOtpTimerInterval = null;
  }
}

function switchForgotStep(step) {
  const stepEmail = document.getElementById("forgot-step-email");
  const stepOtp = document.getElementById("forgot-step-otp");
  const stepNewpass = document.getElementById("forgot-step-newpass");
  const stepSuccess = document.getElementById("forgot-step-success");

  if (stepEmail) stepEmail.style.display = step === "email" ? "block" : "none";
  if (stepOtp) stepOtp.style.display = step === "otp" ? "block" : "none";
  if (stepNewpass) stepNewpass.style.display = step === "newpass" ? "block" : "none";
  if (stepSuccess) stepSuccess.style.display = step === "success" ? "block" : "none";

  if (step === "otp") {
    const otpInput = document.getElementById("forgot-otp-input");
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }
  } else if (step === "newpass") {
    const passInput = document.getElementById("forgot-new-password");
    if (passInput) {
      passInput.value = "";
      passInput.focus();
    }
  }
}

async function handleForgotEmailSubmit(event) {
  if (event) event.preventDefault();
  const emailInput = document.getElementById("forgot-email-input");
  const feedback = document.getElementById("forgot-email-feedback");
  const submitBtn = document.getElementById("btn-forgot-send-otp");

  if (!emailInput) return;
  const rawId = emailInput.value.trim();

  if (!rawId) {
    if (feedback) {
      feedback.textContent = "Please enter your registered email address or student roll.";
      feedback.style.display = "block";
    }
    return;
  }

  const originalText = submitBtn ? submitBtn.innerHTML : "Send Verification Code";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending Verification Code via mail.paradox147@gmail.com...";
  }
  if (feedback) feedback.style.display = "none";

  try {
    const result = await window.emailService.sendPasswordResetOtp(rawId);
    currentForgotEmail = result.email || rawId;

    const targetDisplay = document.getElementById("forgot-otp-email-target");
    if (targetDisplay) {
      targetDisplay.textContent = currentForgotEmail;
    }

    switchForgotStep("otp");
    startForgotOtpTimer(60);

    if (window.showToast) {
      window.showToast(`Verification code dispatched to ${currentForgotEmail} from mail.paradox147@gmail.com`, "info", 6000);
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message || "Unable to send verification code. Please try again.";
      feedback.style.display = "block";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

async function handleForgotOtpSubmit(event) {
  if (event) event.preventDefault();
  const otpInput = document.getElementById("forgot-otp-input");
  const feedback = document.getElementById("forgot-otp-feedback");
  const submitBtn = document.getElementById("btn-verify-forgot-otp");

  if (!otpInput) return;
  const enteredCode = otpInput.value.trim();

  if (enteredCode.length !== 6) {
    if (feedback) {
      feedback.textContent = "Please enter the complete 6-digit verification code.";
      feedback.style.display = "block";
    }
    return;
  }

  const originalText = submitBtn ? submitBtn.innerHTML : "Verify Code";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";
  }
  if (feedback) feedback.style.display = "none";

  try {
    await window.emailService.verifyPasswordResetOtp(currentForgotEmail, enteredCode);
    currentForgotOtp = enteredCode;
    switchForgotStep("newpass");
    if (window.showToast) {
      window.showToast("Code verified successfully. Please enter your new password.", "success", 4000);
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message || "Invalid or expired verification code.";
      feedback.style.display = "block";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

async function handleForgotNewpassSubmit(event) {
  if (event) event.preventDefault();
  const newPassInput = document.getElementById("forgot-new-password");
  const confirmPassInput = document.getElementById("forgot-confirm-password");
  const newPassFeedback = document.getElementById("forgot-newpass-feedback");
  const confirmPassFeedback = document.getElementById("forgot-confirmpass-feedback");
  const submitBtn = document.getElementById("btn-forgot-submit-newpass");

  if (newPassFeedback) newPassFeedback.style.display = "none";
  if (confirmPassFeedback) confirmPassFeedback.style.display = "none";

  const newPass = newPassInput ? newPassInput.value.trim() : "";
  const confirmPass = confirmPassInput ? confirmPassInput.value.trim() : "";

  if (newPass.length < 4) {
    if (newPassFeedback) {
      newPassFeedback.textContent = "Password must be at least 4 characters in length.";
      newPassFeedback.style.display = "block";
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (confirmPassFeedback) {
      confirmPassFeedback.textContent = "Passwords do not match. Please verify both fields.";
      confirmPassFeedback.style.display = "block";
    }
    return;
  }

  const originalText = submitBtn ? submitBtn.innerHTML : "Update Password";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating Password...";
  }

  try {
    await window.emailService.resetPasswordWithOtp(currentForgotEmail, currentForgotOtp, newPass);
    switchForgotStep("success");
    if (window.showToast) {
      window.showToast("Password updated successfully through mail.paradox147@gmail.com", "success", 5000);
    }
  } catch (err) {
    if (confirmPassFeedback) {
      confirmPassFeedback.textContent = err.message || "Failed to update password. Please try again.";
      confirmPassFeedback.style.display = "block";
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

async function handleForgotResendOtp() {
  const resendBtn = document.getElementById("forgot-otp-resend-btn");
  const feedback = document.getElementById("forgot-otp-feedback");
  if (resendBtn) resendBtn.disabled = true;

  try {
    await window.emailService.sendPasswordResetOtp(currentForgotEmail);
    startForgotOtpTimer(60);
    if (feedback) feedback.style.display = "none";
    if (window.showToast) {
      window.showToast(`New verification code sent to ${currentForgotEmail} from mail.paradox147@gmail.com`, "info", 5000);
    }
  } catch (err) {
    if (feedback) {
      feedback.textContent = err.message || "Failed to resend code.";
      feedback.style.display = "block";
    }
    if (resendBtn) resendBtn.disabled = false;
  }
}

function startForgotOtpTimer(seconds = 60) {
  if (forgotOtpTimerInterval) clearInterval(forgotOtpTimerInterval);

  let remaining = seconds;
  const countdownEl = document.getElementById("forgot-otp-countdown");
  const timerTextEl = document.getElementById("forgot-otp-timer-text");
  const resendBtn = document.getElementById("forgot-otp-resend-btn");

  if (timerTextEl) timerTextEl.style.display = "inline";
  if (resendBtn) {
    resendBtn.style.display = "none";
    resendBtn.disabled = false;
  }
  if (countdownEl) countdownEl.textContent = remaining;

  forgotOtpTimerInterval = setInterval(() => {
    remaining -= 1;
    if (countdownEl) countdownEl.textContent = remaining;

    if (remaining <= 0) {
      clearInterval(forgotOtpTimerInterval);
      if (timerTextEl) timerTextEl.style.display = "none";
      if (resendBtn) resendBtn.style.display = "inline-block";
    }
  }, 1000);
}

function finishForgotPasswordFlow() {
  closeForgotPasswordModal();
  if (window.switchAuthTab) {
    window.switchAuthTab("student-login");
  }

  const identifierInput = document.getElementById("auth-identifier");
  const passwordInput = document.getElementById("auth-password");
  if (identifierInput && currentForgotEmail) {
    identifierInput.value = currentForgotEmail;
  }
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.focus();
  }

  if (window.showToast) {
    window.showToast("Your password was updated. Please enter your new password to sign in.", "success", 5000);
  }
}

// Global Exports
window.openSignupOtpModal = openSignupOtpModal;
window.closeSignupOtpModal = closeSignupOtpModal;
window.handleSignupOtpSubmit = handleSignupOtpSubmit;
window.handleSignupOtpResend = handleSignupOtpResend;

window.openForgotPasswordModal = openForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;
window.switchForgotStep = switchForgotStep;
window.handleForgotEmailSubmit = handleForgotEmailSubmit;
window.handleForgotOtpSubmit = handleForgotOtpSubmit;
window.handleForgotNewpassSubmit = handleForgotNewpassSubmit;
window.handleForgotResendOtp = handleForgotResendOtp;
window.finishForgotPasswordFlow = finishForgotPasswordFlow;


/* --------------------------------------------------------------------------
   URL QUERY PARAMS & REDIRECT REASONS
   -------------------------------------------------------------------------- */
function checkUrlParamsAndRedirects() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get("tab") === "signup" || window.location.hash === "#signup") {
    if (window.switchAuthTab) window.switchAuthTab("student-signup");
  }

  // Check if user was kicked from dashboard
  const redirectReason = sessionStorage.getItem("auth_redirect_reason");
  const isDashboardRedirect = urlParams.get("redirect") === "dashboard" || Boolean(redirectReason);

  if (isDashboardRedirect) {
    showGlobalAlert(
      `<strong>Authentication Required:</strong> You must be signed in to access the Dashboard. Please sign in with your approved account, or click <strong>'Sign Up and Student Verification'</strong> to register.`,
      "warning"
    );
    sessionStorage.removeItem("auth_redirect_reason");
  }
}

/* --------------------------------------------------------------------------
   UI ERROR & ALERT HELPERS
   -------------------------------------------------------------------------- */
function showError(inputElement, message) {
  inputElement.classList.add("is-invalid");
  const parent = inputElement.closest(".form-group") || inputElement.parentElement;
  const errorContainer = parent ? parent.querySelector(".form-feedback") : null;
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = "block";
  }
}

function clearValidationErrors() {
  document.querySelectorAll(".form-input").forEach(input => input.classList.remove("is-invalid"));
  document.querySelectorAll(".form-feedback").forEach(feedback => feedback.style.display = "none");
  const alertBanner = document.getElementById("auth-alert-banner");
  if (alertBanner) alertBanner.style.display = "none";
}

function showGlobalAlert(messageHtml, type = "warning") {
  const alertBanner = document.getElementById("auth-alert-banner");
  if (!alertBanner) return;

  const bgMap = {
    warning: "#FEF3C7",
    danger: "#FEE2E2",
    success: "#D1FAE5",
    info: "#DBEAFE"
  };
  const colorMap = {
    warning: "#92400E",
    danger: "#991B1B",
    success: "#065F46",
    info: "#1E40AF"
  };
  const borderMap = {
    warning: "#FCD34D",
    danger: "#F87171",
    success: "#6EE7B7",
    info: "#93C5FD"
  };

  alertBanner.style.background = bgMap[type] || bgMap.warning;
  alertBanner.style.color = colorMap[type] || colorMap.warning;
  alertBanner.style.border = `1px solid ${borderMap[type] || borderMap.warning}`;
  alertBanner.innerHTML = messageHtml;
  alertBanner.style.display = "block";
}
