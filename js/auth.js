// Configuration is loaded from js/config.js
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

// Use var to allow redeclaration if loaded multiple times (prevents SyntaxError)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Phone number formatting function: +383-xx-xxx-xxx
function formatPhoneNumber(value) {
  // Remove all non-digit characters except the leading +
  let cleaned = value.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +383
  if (!cleaned.startsWith('+383')) {
    // If it starts with + but not +383, try to fix it
    if (cleaned.startsWith('+') && !cleaned.startsWith('+383')) {
      cleaned = '+383' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      // If no +, add +383
      cleaned = '+383' + cleaned;
    }
  }
  
  // Remove the +383 prefix for formatting
  let digits = cleaned.replace('+383', '');
  
  // Format as +383-xx-xxx-xxx
  if (digits.length === 0) {
    return '+383-';
  } else if (digits.length <= 2) {
    return '+383-' + digits;
  } else if (digits.length <= 5) {
    return '+383-' + digits.substring(0, 2) + '-' + digits.substring(2);
  } else {
    return '+383-' + digits.substring(0, 2) + '-' + digits.substring(2, 5) + '-' + digits.substring(5, 8);
  }
}

// Setup phone number formatting for an input element
function setupPhoneFormatting(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  input.addEventListener('input', (e) => {
    const cursorPosition = e.target.selectionStart;
    const oldValue = e.target.value;
    const newValue = formatPhoneNumber(e.target.value);
    
    e.target.value = newValue;
    
    // Restore cursor position (adjust for added dashes)
    const addedChars = newValue.length - oldValue.length;
    const newCursorPosition = Math.min(cursorPosition + addedChars, newValue.length);
    e.target.setSelectionRange(newCursorPosition, newCursorPosition);
  });
  
  // Format on paste
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    const formatted = formatPhoneNumber(pastedText);
    input.value = formatted;
  });
}

// Use main TRANSLATIONS object if available, otherwise fallback to local translations
const translations = window.TRANSLATIONS || {
  en: {
    appTitle: "Apartment Management",
    appSubtitle: "Manage contracts, deposits, debts and payments with ease.",
    languageLabel: "Language",
    loginTitle: "Login",
    loginSubtitle: "Enter your credentials to access the system",
    loginButton: "Login",
    signupTitle: "Sign Up",
    signupSubtitle: "Create a new account to get started",
    signupButton: "Sign Up",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    signupLink: "Sign Up",
    backToDashboard: "Back to Dashboard",
    statistics: "Statistics",
    loginLink: "Login",
    logout: "Logout",
    loginError: "Invalid email or password.",
    signupError: "Error creating account. Please try again.",
    passwordMismatch: "Passwords do not match.",
    loginSuccess: "Login successful!",
    signupSuccess: "Account created successfully! Please login.",
    logoutSuccess: "Logged out successfully.",
    footerNote: "Powered by Florend Ramusa. Built for property managers and tenants.",
    logoTextEn: "Apartment for you",
    logoTextSq: "Banesë për Ty",
    floatingNavStatistics: "Statistics",
    floatingNavProfile: "Profile",
    floatingNavTenant: "Tenant View",
    floatingNavAdmin: "Administrator",
    profileTitle: "Profile - Apartment Management",
  },
  sq: {
    appTitle: "Menaxhimi i Banesave",
    appSubtitle: "Menaxhoni kontratat, depozitat, detyrimet dhe pagesat me lehtësi.",
    languageLabel: "Gjuha",
    loginTitle: "Hyrje",
    loginSubtitle: "Shkruani kredencialet tuaja për të hyrë në sistem",
    loginButton: "Hyr",
    signupTitle: "Regjistrohu",
    signupSubtitle: "Krijoni një llogari të re për të filluar",
    signupButton: "Regjistrohu",
    email: "Email",
    password: "Fjalëkalimi",
    confirmPassword: "Konfirmo Fjalëkalimin",
    noAccount: "Nuk keni llogari?",
    haveAccount: "Keni tashmë një llogari?",
    signupLink: "Regjistrohu",
    backToDashboard: "Kthehu te Paneli",
    statistics: "Statistikat",
    loginLink: "Hyr",
    logout: "Dil",
    loginError: "Email ose fjalëkalim i pavlefshëm.",
    signupError: "Gabim në krijimin e llogarisë. Ju lutem provoni përsëri.",
    passwordMismatch: "Fjalëkalimet nuk përputhen.",
    loginSuccess: "Hyrja u realizua me sukses!",
    signupSuccess: "Llogaria u krijua me sukses! Ju lutem hyni.",
    logoutSuccess: "Dilja u realizua me sukses.",
    footerNote: "Krijuar nga Florend Ramusa. Ndërtuar për menaxherët e pronave dhe Qeramarrësit.",
    logoTextEn: "Apartment for you",
    logoTextSq: "Banesë për Ty",
    floatingNavStatistics: "Statistikat",
    floatingNavProfile: "Profili",
    floatingNavTenant: "Pamja e Qeramarrësit",
    floatingNavAdmin: "Administratori",
    profileTitle: "Profili - Menaxhimi i Banesave",
  },
};

let currentLanguage = localStorage.getItem("language") || "en";

// Update translations object if window.TRANSLATIONS is available
function updateTranslations() {
  if (window.TRANSLATIONS) {
    // Merge window.TRANSLATIONS into local translations, preferring window.TRANSLATIONS
    Object.keys(window.TRANSLATIONS).forEach(lang => {
      if (!translations[lang]) {
        translations[lang] = {};
      }
      Object.assign(translations[lang], window.TRANSLATIONS[lang]);
    });
  }
}

function translate(key) {
  updateTranslations(); // Ensure we have the latest translations
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function translateUI() {
  // Reload translations in case window.TRANSLATIONS was loaded after auth.js
  if (window.TRANSLATIONS && !translations.en.logoTextEn) {
    Object.assign(translations, window.TRANSLATIONS);
  }
  
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (!key) return;
    
    const translation = translate(key);
    // Only update if we got a valid translation (not the key itself)
    if (translation && translation !== key) {
      if (element.tagName === "INPUT" && element.placeholder) {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    }
  });
  
  // Update document title if it has data-i18n
  const titleElement = document.querySelector("title[data-i18n]");
  if (titleElement) {
    const titleKey = titleElement.getAttribute("data-i18n");
    if (titleKey) {
      const titleTranslation = translate(titleKey);
      if (titleTranslation && titleTranslation !== titleKey) {
        document.title = titleTranslation;
      }
    }
  }
}

function notify(type, message) {
  const notificationArea = document.getElementById("notificationArea");
  if (!notificationArea) return;

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.setAttribute("role", "alert");

  notificationArea.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

async function checkAuth() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return null;
    }
    return user;
  } catch (error) {
    console.error("checkAuth error:", error);
    return null;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const formData = new FormData(loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  const loginError = document.getElementById("loginError");
  if (loginError) {
    loginError.style.display = "none";
    loginError.textContent = "";
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    notify("success", translate("loginSuccess"));
    const user = data.user;
    const role = user?.user_metadata?.role || "Property Owner / Landlord";
    if (role === "Tenant") {
      window.location.href = "tenant-apartments.html";
    } else {
      // Landlords / admins go to main dashboard
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("Login error:", error);
    if (loginError) {
      loginError.textContent = translate("loginError") || error.message;
      loginError.style.display = "block";
    }
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const signupForm = document.getElementById("signupForm");
  if (!signupForm) return;

  const formData = new FormData(signupForm);
  const fullName = formData.get("full_name");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const preferredLanguage = formData.get("preferred_language") || "en";
  const preferredCurrency = formData.get("preferred_currency") || "EUR";
  const themeMode = formData.get("theme_mode") || "light";
  const signupRoleRaw = (formData.get("role") || "landlord").toString();
  const role =
    signupRoleRaw === "tenant" ? "Tenant" : "Property Owner / Landlord";

  const signupError = document.getElementById("signupError");
  if (signupError) {
    signupError.style.display = "none";
    signupError.textContent = "";
  }

  // Validate passwords match
  if (password !== confirmPassword) {
    if (signupError) {
      signupError.textContent = translate("passwordMismatch");
      signupError.style.display = "block";
    }
    return;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          preferred_language: preferredLanguage,
          preferred_currency: preferredCurrency,
          theme_mode: themeMode,
          date_joined: new Date().toISOString(),
          role,
        },
      },
    });

    if (error) throw error;

    notify("success", translate("signupSuccess"));
    // Switch to login view
    const signupCard = document.getElementById("signupCard");
    const loginCard = document.querySelector(".login-card:not(#signupCard)");
    if (signupCard) signupCard.style.display = "none";
    if (loginCard) loginCard.style.display = "block";
    if (signupForm) signupForm.reset();
  } catch (error) {
    console.error("Signup error:", error);
    if (signupError) {
      signupError.textContent = translate("signupError") || error.message;
      signupError.style.display = "block";
    }
  }
}

// Simple shared logout helper for pages that only load auth.js (e.g. profile.html)
async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    notify("success", translate("logoutSuccess"));
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    window.location.href = "login.html";
  }
}

// Mobile menu toggle function for pages that only load auth.js (e.g. profile.html)
// Also expose it globally so it can be called from profile.html
// Define this BEFORE init() so it's available when init runs
window.setupMobileMenuToggle = function setupMobileMenuToggleForAuth() {
  const menuToggleBtn = document.getElementById("menuToggleBtn");
  const topNavContainer = document.querySelector(".top-nav-container");
  
  if (menuToggleBtn && topNavContainer) {
    // Prevent duplicate setup by checking for existing data attribute
    if (menuToggleBtn.dataset.menuToggleSetup === "true") {
      // Re-attach listeners to dynamically created nav buttons
      if (window._attachNavButtonListeners) {
        window._attachNavButtonListeners();
      }
      return;
    }
    
    // Mark as set up
    menuToggleBtn.dataset.menuToggleSetup = "true";
    
    // Create backdrop overlay
    let backdrop = document.querySelector(".menu-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "menu-backdrop";
      document.body.appendChild(backdrop);
    }

    // Create close button
    let closeBtn = topNavContainer.querySelector(".menu-close-btn");
    if (!closeBtn) {
      closeBtn = document.createElement("button");
      closeBtn.className = "menu-close-btn";
      closeBtn.setAttribute("type", "button");
      closeBtn.setAttribute("title", "Close Menu");
      closeBtn.setAttribute("aria-label", "Close Menu");
      closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      topNavContainer.appendChild(closeBtn);
    }

    const openMenu = () => {
      topNavContainer.classList.add("menu-open");
      backdrop.classList.add("active");
      menuToggleBtn.classList.add("menu-open");
      document.body.classList.add("menu-open");
    };

    const closeMenu = () => {
      topNavContainer.classList.remove("menu-open");
      backdrop.classList.remove("active");
      menuToggleBtn.classList.remove("menu-open");
      document.body.classList.remove("menu-open");
    };

    // Store closeMenu function for reuse
    window._closeMobileMenu = closeMenu;

    // Hamburger button toggles menu (only attach once)
    if (!menuToggleBtn.dataset.menuToggleListener) {
      menuToggleBtn.addEventListener("click", () => {
        if (topNavContainer.classList.contains("menu-open")) {
          closeMenu();
        } else {
          openMenu();
        }
      });
      menuToggleBtn.dataset.menuToggleListener = "true";
    }

    // Close button closes menu (only attach once)
    if (!closeBtn.dataset.closeBtnListener) {
      closeBtn.addEventListener("click", closeMenu);
      closeBtn.dataset.closeBtnListener = "true";
    }

    // Backdrop click closes menu (only attach once)
    if (!backdrop.dataset.backdropListener) {
      backdrop.addEventListener("click", closeMenu);
      backdrop.dataset.backdropListener = "true";
    }

    // Helper function to attach listeners to nav buttons (can be called multiple times)
    const attachNavButtonListeners = () => {
      const navButtons = topNavContainer.querySelectorAll(".top-nav-btn");
      navButtons.forEach(btn => {
        // Only attach if not already attached
        if (!btn.dataset.navBtnListener) {
          btn.addEventListener("click", () => {
            setTimeout(closeMenu, 300);
          });
          btn.dataset.navBtnListener = "true";
        }
      });
    };
    
    // Store function globally for re-attaching after dynamic content
    window._attachNavButtonListeners = attachNavButtonListeners;
    
    // Attach listeners to existing navigation buttons
    attachNavButtonListeners();
  }
};

async function init() {
  const path = window.location.pathname || "";
  const isLoginPage =
    path.endsWith("login.html") || path.endsWith("/login") || path === "/" || path === "";

  const user = await checkAuth();

  // Only auto-redirect authenticated users from the LOGIN page.
  // Other pages (e.g. profile.html) handle their own redirect logic.
  if (isLoginPage && user) {
    window.location.href = "index.html";
    return;
  }

  translateUI();
  
  // Setup phone number formatting for signup form
  setupPhoneFormatting('signupPhone');

  // Set up event listeners
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const showSignup = document.getElementById("showSignup");
  const showLogin = document.getElementById("showLogin");
  const languageToggleBtn = document.getElementById("languageToggleBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const passwordToggles = document.querySelectorAll(".password-toggle");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }
  if (showSignup) {
    showSignup.addEventListener("click", () => {
      const signupCard = document.getElementById("signupCard");
      const loginCard = document.querySelector(".login-card:not(#signupCard)");
      if (signupCard) signupCard.style.display = "block";
      if (loginCard) loginCard.style.display = "none";
    });
  }
  if (showLogin) {
    showLogin.addEventListener("click", () => {
      const signupCard = document.getElementById("signupCard");
      const loginCard = document.querySelector(".login-card:not(#signupCard)");
      if (signupCard) signupCard.style.display = "none";
      if (loginCard) loginCard.style.display = "block";
    });
  }

  // Show / hide password buttons
  if (passwordToggles && passwordToggles.length) {
    passwordToggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        if (!targetId) return;
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.setAttribute("aria-pressed", String(!isPassword));
        btn.classList.toggle("is-visible", !isPassword);
      });
    });
  }

  // Language toggle button
  if (languageToggleBtn) {
    languageToggleBtn.textContent = currentLanguage === "en" ? "En" : "Sq";
    languageToggleBtn.addEventListener("click", () => {
      if (currentLanguage === "en") {
        currentLanguage = "sq";
        languageToggleBtn.textContent = "Sq";
      } else {
        currentLanguage = "en";
        languageToggleBtn.textContent = "En";
      }
      localStorage.setItem("language", currentLanguage);
      translateUI();
      
      // Refresh navigation if on profile page
      const currentPath = window.location.pathname;
      if (currentPath.includes("profile.html") && typeof window.setupTopNavigationForProfile === "function") {
        // Get user role and refresh navigation
        if (typeof supabase !== "undefined") {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              const role = user.user_metadata?.role || "Property Owner / Landlord";
              window.setupTopNavigationForProfile(role);
            }
          });
        }
      }
    });
  }

  // Theme toggle button (shared with index / profile)
  if (themeToggleBtn) {
    const applyTheme = (theme) => {
      if (theme === "dark") {
        document.body.classList.add("dark-theme");
        const lightIcon = themeToggleBtn.querySelector(".theme-icon-light");
        const darkIcon = themeToggleBtn.querySelector(".theme-icon-dark");
        if (lightIcon) lightIcon.style.display = "none";
        if (darkIcon) darkIcon.style.display = "block";
      } else {
        document.body.classList.remove("dark-theme");
        const lightIcon = themeToggleBtn.querySelector(".theme-icon-light");
        const darkIcon = themeToggleBtn.querySelector(".theme-icon-dark");
        if (lightIcon) lightIcon.style.display = "block";
        if (darkIcon) darkIcon.style.display = "none";
        theme = "light";
      }
      try {
        window.localStorage.setItem("theme", theme);
      } catch (_) {}
    };

    const storedTheme =
      (window.localStorage && window.localStorage.getItem("theme")) ||
      "light";
    applyTheme(storedTheme);

    themeToggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark-theme");
      applyTheme(isDark ? "light" : "dark");
    });
  }

  // Setup mobile menu toggle
  // If setupMobileMenuToggle doesn't exist from app.js, use the one defined here
  if (typeof setupMobileMenuToggle === "function") {
    setupMobileMenuToggle();
  } else if (typeof window.setupMobileMenuToggle === "function") {
    window.setupMobileMenuToggle();
  }
}

document.addEventListener("DOMContentLoaded", init);

