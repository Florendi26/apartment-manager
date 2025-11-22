const SUPABASE_URL = "https://krrhgslhvdfyvxayefqh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtycmhnc2xodmRmeXZ4YXllZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDAyODYsImV4cCI6MjA3ODI3NjI4Nn0.jil94otneKXn3GTiDLdx1A6yi_5Ktg4DU1_iem5ULbc";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Import translations from app.js structure
const translations = {
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
    loginLink: "Login",
    logout: "Logout",
    loginError: "Invalid email or password.",
    signupError: "Error creating account. Please try again.",
    passwordMismatch: "Passwords do not match.",
    loginSuccess: "Login successful!",
    signupSuccess: "Account created successfully! Please login.",
    logoutSuccess: "Logged out successfully.",
    footerNote: "Powered by Florend Ramusa. Built for property managers and tenants.",
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
    loginLink: "Hyr",
    logout: "Dil",
    loginError: "Email ose fjalëkalim i pavlefshëm.",
    signupError: "Gabim në krijimin e llogarisë. Ju lutem provoni përsëri.",
    passwordMismatch: "Fjalëkalimet nuk përputhen.",
    loginSuccess: "Hyrja u realizua me sukses!",
    signupSuccess: "Llogaria u krijua me sukses! Ju lutem hyni.",
    logoutSuccess: "Dilja u realizua me sukses.",
    footerNote: "Krijuar nga Florend Ramusa. Ndërtuar për menaxherët e pronave dhe qiramarrësit.",
  },
};

let currentLanguage = localStorage.getItem("language") || "en";

function translate(key) {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function translateUI() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const translation = translate(key);
    if (element.tagName === "INPUT" && element.placeholder) {
      element.placeholder = translation;
    } else {
      element.textContent = translation;
    }
  });
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
    // Redirect to statistics page
    window.location.href = "statistics.html";
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
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

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

// Check if already authenticated and redirect
async function init() {
  const user = await checkAuth();
  if (user) {
    // Already logged in, redirect to main app
    window.location.href = "index.html";
    return;
  }

  translateUI();

  // Set up event listeners
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const showSignup = document.getElementById("showSignup");
  const showLogin = document.getElementById("showLogin");
  const languagePicker = document.getElementById("languagePicker");

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
  if (languagePicker) {
    languagePicker.value = currentLanguage;
    languagePicker.addEventListener("change", (event) => {
      currentLanguage = event.target.value;
      localStorage.setItem("language", currentLanguage);
      translateUI();
    });
  }
}

document.addEventListener("DOMContentLoaded", init);

