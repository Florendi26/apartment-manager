// Configuration is loaded from js/config.js
const TENANT_SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const TENANT_SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

const tenantSupabase = window.supabase.createClient(
  TENANT_SUPABASE_URL,
  TENANT_SUPABASE_ANON_KEY
);

function tenantFormatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return "€0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function tenantNormalizeCurrency(value) {
  if (!value) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

function tenantFormatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
  } catch {
    return "-";
  }
}

function tenantNotify(type, message) {
  const area = document.getElementById("tenantNotificationArea");
  if (!area) return;
  const div = document.createElement("div");
  div.className = `notification notification-${type}`;
  div.textContent = message;
  div.setAttribute("role", "alert");
  area.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

async function tenantCheckAuth() {
  const { data, error } = await tenantSupabase.auth.getUser();
  if (error || !data?.user) {
    window.location.href = "login.html";
    return null;
  }
  const user = data.user;
  const role = user.user_metadata?.role || "Property Owner / Landlord";
  if (role !== "Tenant") {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

async function tenantLoadProfileByEmail(user) {
  const { data, error } = await tenantSupabase
    .from("tenants")
    .select("id, full_name, email, phone, entry_date")
    .eq("email", user.email)
    .limit(1);
  if (error) {
    console.error("tenantLoadProfileByEmail", error);
    return null;
  }
  return data && data[0] ? data[0] : null;
}

function tenantSetupThemeToggle(buttonId, storageKey = "tenantTheme") {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const applyTheme = (theme) => {
    const lightIcon = btn.querySelector(".theme-icon-light");
    const darkIcon = btn.querySelector(".theme-icon-dark");
    
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      if (lightIcon) lightIcon.style.display = "none";
      if (darkIcon) darkIcon.style.display = "block";
    } else {
      document.body.classList.remove("dark-theme");
      if (lightIcon) lightIcon.style.display = "block";
      if (darkIcon) darkIcon.style.display = "none";
      theme = "light";
    }
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch (_) {}
  };

  const storedTheme =
    (window.localStorage && window.localStorage.getItem(storageKey)) ||
    "light";
  applyTheme(storedTheme);

  btn.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-theme");
    applyTheme(isDark ? "light" : "dark");
  });
}

// Mobile menu toggle function (global)
window.setupMobileMenuToggle = function setupMobileMenuToggle() {
  const menuToggleBtn = document.getElementById("menuToggleBtn");
  const topNavContainer = document.querySelector(".top-nav-container");
  
  if (menuToggleBtn && topNavContainer) {
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

    // Hamburger button toggles menu
    menuToggleBtn.addEventListener("click", () => {
      if (topNavContainer.classList.contains("menu-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close button closes menu
    closeBtn.addEventListener("click", closeMenu);

    // Backdrop click closes menu
    backdrop.addEventListener("click", closeMenu);

    // Close menu when clicking on a nav button
    const navButtons = topNavContainer.querySelectorAll(".top-nav-btn");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        setTimeout(closeMenu, 300);
      });
    });
  }
}

// Translation function for tenant pages
function tenantTranslateUI() {
  const translations = window.TRANSLATIONS || {};
  const currentLang =
    (window.localStorage && window.localStorage.getItem("language")) || "en";
  const dictionary = translations[currentLang] || translations.en || {};

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key && dictionary[key]) {
      if (element.tagName === "INPUT" && element.placeholder) {
        element.placeholder = dictionary[key];
      } else {
        element.textContent = dictionary[key];
      }
    }
  });
  
  // Update document title if it has data-i18n
  const titleElement = document.querySelector("title[data-i18n]");
  if (titleElement) {
    const titleKey = titleElement.getAttribute("data-i18n");
    if (titleKey && dictionary[titleKey]) {
      document.title = dictionary[titleKey];
    }
  }
}

// Update top navigation active state for tenant pages
function updateTenantTopNavActive() {
  const currentPath = window.location.pathname;
  const statisticsBtn = document.getElementById("topNavStatistics");
  const tenantApartmentsBtn = document.getElementById("topNavTenantApartments");
  const tenantContractsBtn = document.getElementById("topNavTenantContracts");
  const tenantExpensesBtn = document.getElementById("topNavTenantExpenses");
  const profileBtn = document.getElementById("topNavProfile");

  // Remove active class from all buttons
  [statisticsBtn, tenantApartmentsBtn, tenantContractsBtn, tenantExpensesBtn, profileBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  // Set active based on current page
  if (currentPath.includes("tenant-apartments.html") && tenantApartmentsBtn) {
    tenantApartmentsBtn.classList.add("active");
  } else if (currentPath.includes("tenant-contracts.html") && tenantContractsBtn) {
    tenantContractsBtn.classList.add("active");
  } else if (currentPath.includes("tenant-expenses.html") && tenantExpensesBtn) {
    tenantExpensesBtn.classList.add("active");
  } else if (currentPath.includes("statistics.html") && statisticsBtn) {
    statisticsBtn.classList.add("active");
    statisticsBtn.disabled = true;
    // Remove onclick handler to prevent navigation
    statisticsBtn.onclick = null;
    statisticsBtn.removeAttribute("onclick");
  } else if (currentPath.includes("profile.html") && profileBtn) {
    profileBtn.classList.add("active");
  }
  
  // Ensure Statistics button is enabled if not on statistics page
  if (statisticsBtn && !currentPath.includes("statistics.html")) {
    statisticsBtn.disabled = false;
    // Restore onclick handler if it was removed
    if (!statisticsBtn.onclick && !statisticsBtn.hasAttribute("onclick")) {
      statisticsBtn.onclick = () => window.location.href = "statistics.html";
    }
  }
}

// Simple language toggle button for tenant pages.
// This shares the same "language" key used by the main app / auth scripts.
function tenantSetupLanguageToggle(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const storedLang =
    (window.localStorage && window.localStorage.getItem("language")) || "en";

  const applyLabel = (lang) => {
    btn.textContent = lang === "sq" ? "Sq" : "En";
  };

  applyLabel(storedLang);
  
  // Apply translations on initial load
  tenantTranslateUI();

  btn.addEventListener("click", () => {
    const current =
      (window.localStorage && window.localStorage.getItem("language")) || "en";
    const next = current === "en" ? "sq" : "en";
    try {
      window.localStorage.setItem("language", next);
    } catch (_) {}
    applyLabel(next);
    // Apply translations immediately
    tenantTranslateUI();
    // Update top navigation active state (in case it needs re-rendering)
    if (typeof updateTenantTopNavActive === "function") {
      updateTenantTopNavActive();
    }
    // Also trigger a custom event for pages that need to update dynamic content
    window.dispatchEvent(new CustomEvent("tenantLanguageChanged", { detail: { language: next } }));
  });
}


