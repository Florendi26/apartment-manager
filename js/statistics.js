// Configuration is loaded from js/config.js
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

// Use var to allow redeclaration if loaded multiple times (prevents SyntaxError)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentLanguage = localStorage.getItem("language") || "en";
let currentUser = null;
let showOverallStats = false; // Toggle between personal and overall statistics

// State
const state = {
  apartments: [],
  tenants: [],
  contracts: [],
  debts: [],
  payments: [],
  utilityBills: [],
  utilityPayments: [],
  // Split tables
  rentBills: [],
  rentPayments: [],
  garbageBills: [],
  garbagePayments: [],
  maintenanceBills: [],
  maintenancePayments: [],
  electricityBills: [],
  electricityPayments: [],
  waterBills: [],
  waterPayments: [],
  heatingBills: [],
  heatingPayments: [],
  pdfGeneratedCount: 0,
};

// Table mapping for split tables
const EXPENSE_TABLES = {
  rent: { bills: "rent_bills", payments: "rent_payments", hasStatus: true },
  garbage: { bills: "garbage_bills", payments: "garbage_payments", hasStatus: true },
  maintenance: { bills: "maintenance_bills", payments: "maintenance_payments", hasStatus: true },
  electricity: { bills: "electricity_bills", payments: "electricity_payments", hasStatus: false },
  water: { bills: "water_bills", payments: "water_payments", hasStatus: false },
  thermos: { bills: "heating_bills", payments: "heating_payments", hasStatus: false },
};

const EXPENSE_STATE_KEYS = {
  rent: { bills: "rentBills", payments: "rentPayments" },
  garbage: { bills: "garbageBills", payments: "garbagePayments" },
  maintenance: { bills: "maintenanceBills", payments: "maintenancePayments" },
  electricity: { bills: "electricityBills", payments: "electricityPayments" },
  water: { bills: "waterBills", payments: "waterPayments" },
  thermos: { bills: "heatingBills", payments: "heatingPayments" },
};

// Translations (loaded from central languages.js)
// Use main TRANSLATIONS for common items, STATS_TRANSLATIONS for statistics-specific
// Merge translations: prefer STATS_TRANSLATIONS for stats-specific keys, otherwise use main TRANSLATIONS
function getTranslations() {
  const mainTranslations = window.TRANSLATIONS || {};
  const statsTranslations = window.STATS_TRANSLATIONS || {};
  const merged = { en: {}, sq: {} };
  
  // Start with main translations
  if (mainTranslations.en) {
    Object.assign(merged.en, mainTranslations.en);
  }
  if (mainTranslations.sq) {
    Object.assign(merged.sq, mainTranslations.sq);
  }
  
  // Override with stats-specific translations
  if (statsTranslations.en) {
    Object.assign(merged.en, statsTranslations.en);
  }
  if (statsTranslations.sq) {
    Object.assign(merged.sq, statsTranslations.sq);
  }
  
  return merged;
}

function translate(key) {
  const merged = getTranslations();
  return merged[currentLanguage]?.[key] || merged.en[key] || key;
}

function translateUI() {
  const merged = getTranslations();
  
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (!key) return;
    
    const translation = translate(key);
    // Only update if we got a valid translation (not the key itself)
    if (translation && translation !== key) {
      if (element.tagName === "INPUT" && element.placeholder) {
        element.placeholder = translation;
      } else if (element.tagName === "A" && element.href) {
        element.textContent = translation;
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

function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return "€0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

function normalizeCurrency(value) {
  if (!value) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
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

async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = "login.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}

const EXPENSE_TYPES = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];

function resetExpenseState() {
  EXPENSE_TYPES.forEach((type) => {
    const keys = EXPENSE_STATE_KEYS[type];
    state[keys.bills] = [];
    state[keys.payments] = [];
  });
  state.debts = [];
  state.payments = [];
  state.apartments = [];
  state.tenants = [];
  state.contracts = [];
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("countRows", table, error);
    return null;
  }
  return count || 0;
}

async function resolveStatisticsScope() {
  if (showOverallStats) {
    return { overall: true, contractIds: null, apartmentCount: null, contractCount: null };
  }

  const user = await checkAuth();
  if (!user) {
    return { overall: false, contractIds: [], apartmentCount: 0, contractCount: 0 };
  }

  const apartments = window.DbScope
    ? await window.DbScope.landlordApartmentIds(supabase, user.id)
    : await supabase.from("apartments").select("id").eq("landlord_id", user.id);

  if (apartments.error) {
    console.error("resolveStatisticsScope apartments", apartments.error);
    return { overall: false, failed: true };
  }

  const apartmentIds = (apartments.data || []).map((row) => row.id);
  if (apartmentIds.length === 0) {
    return { overall: false, contractIds: [], apartmentCount: 0, contractCount: 0 };
  }

  const contracts = await supabase
    .from("contracts")
    .select("id")
    .in("apartment_id", apartmentIds);

  if (contracts.error) {
    console.error("resolveStatisticsScope contracts", contracts.error);
    return { overall: false, failed: true };
  }

  const contractIds = (contracts.data || []).map((row) => row.id);
  return {
    overall: false,
    contractIds,
    apartmentCount: apartmentIds.length,
    contractCount: contractIds.length,
  };
}

async function loadAmountRows(table, contractIds) {
  let query = supabase.from(table).select("amount");
  if (contractIds) query = query.in("contract_id", contractIds);
  const { data, error } = await query;
  if (error) {
    console.log(table + " not available:", error.message);
    return [];
  }
  return data || [];
}

function publishExpenseTotals() {
  state.debts = EXPENSE_TYPES.flatMap((type) => {
    const rows = state[EXPENSE_STATE_KEYS[type].bills] || [];
    const utility = type === "electricity" || type === "water" || type === "thermos";
    return rows.map((row) => (utility ? { amount: row.amount, type, is_paid: false } : { amount: row.amount, type }));
  });
  state.payments = EXPENSE_TYPES.flatMap((type) =>
    (state[EXPENSE_STATE_KEYS[type].payments] || []).map((row) => ({ amount: row.amount, type }))
  );
}

function renderStatistics() {
  // Count statistics
  const tenantsCount = state.tenantCount ?? state.tenants.length;
  const apartmentsCount = state.apartmentCount ?? state.apartments.length;
  const contractsCount = state.contractCount ?? state.contracts.length;
  const expensesCount = state.debts.length;
  const paymentsCount = state.payments.length;

  // Helper function to calculate category stats using split tables
  const getCategoryStats = (type) => {
    const stateKey = EXPENSE_STATE_KEYS[type];
    const bills = state[stateKey.bills] || [];
    const payments = state[stateKey.payments] || [];
    
    const expenses = bills.reduce((sum, b) => sum + normalizeCurrency(b.amount), 0);
    const paid = payments.reduce((sum, p) => sum + normalizeCurrency(p.amount), 0);
    
    return { expenses, payments: paid, balance: expenses - paid };
  };

  // Calculate stats for each category
  const rentStats = getCategoryStats('rent');
  const garbageStats = getCategoryStats('garbage');
  const maintenanceStats = getCategoryStats('maintenance');
  const electricityStats = getCategoryStats('electricity');
  const waterStats = getCategoryStats('water');
  const heatingStats = getCategoryStats('thermos');

  // Calculate total amounts
  const totalExpenses = state.debts.reduce(
    (sum, debt) => sum + normalizeCurrency(debt.amount), 0
  );

  const totalPayments = state.payments.reduce(
    (sum, payment) => sum + normalizeCurrency(payment.amount), 0
  );

  // Total unpaid (balance for all categories)
  const totalUnpaid = totalExpenses - totalPayments;

  // Get PDF count from localStorage
  let pdfGeneratedCount = 0;
  try {
    pdfGeneratedCount = parseInt(localStorage.getItem("pdfGeneratedCount") || "0", 10);
  } catch (e) {
    console.error("Error reading pdfGeneratedCount from localStorage", e);
  }

  // Update DOM
  const statTenantsValue = document.getElementById("statTenantsValue");
  const statApartmentsValue = document.getElementById("statApartmentsValue");
  const statContractsValue = document.getElementById("statContractsValue");
  const statExpensesValue = document.getElementById("statExpensesValue");
  const statPaymentsValue = document.getElementById("statPaymentsValue");
  const statPdfGeneratedValue = document.getElementById("statPdfGeneratedValue");
  const statTotalExpensesValue = document.getElementById("statTotalExpensesValue");
  const statTotalPaymentsValue = document.getElementById("statTotalPaymentsValue");
  const statTotalUnpaidValue = document.getElementById("statTotalUnpaidValue");

  if (statTenantsValue) statTenantsValue.textContent = formatNumber(tenantsCount);
  if (statApartmentsValue) statApartmentsValue.textContent = formatNumber(apartmentsCount);
  if (statContractsValue) statContractsValue.textContent = formatNumber(contractsCount);
  if (statExpensesValue) statExpensesValue.textContent = formatNumber(expensesCount);
  if (statPaymentsValue) statPaymentsValue.textContent = formatNumber(paymentsCount);
  if (statPdfGeneratedValue) statPdfGeneratedValue.textContent = formatNumber(pdfGeneratedCount);
  if (statTotalExpensesValue) statTotalExpensesValue.textContent = formatCurrency(totalExpenses);
  if (statTotalPaymentsValue) statTotalPaymentsValue.textContent = formatCurrency(totalPayments);
  
  // Update total unpaid with color
  if (statTotalUnpaidValue) {
    if (totalUnpaid < -0.01) {
      statTotalUnpaidValue.textContent = `-${formatCurrency(Math.abs(totalUnpaid))}`;
      statTotalUnpaidValue.style.color = '#166534'; // Green for credit
    } else if (totalUnpaid > 0.01) {
      statTotalUnpaidValue.textContent = formatCurrency(totalUnpaid);
      statTotalUnpaidValue.style.color = '#dc2626'; // Red for owes
    } else {
      statTotalUnpaidValue.textContent = '€0.00';
      statTotalUnpaidValue.style.color = '';
    }
  }

  // Update category DOM elements
  const updateCategoryValue = (id, value, isBalance = false) => {
    const el = document.getElementById(id);
    if (el) {
      if (isBalance) {
        if (value < -0.01) {
          el.textContent = `-${formatCurrency(Math.abs(value))}`;
          el.style.color = '#166534'; // Green for credit
        } else if (value > 0.01) {
          el.textContent = formatCurrency(value);
          el.style.color = '#dc2626'; // Red for owes
        } else {
          el.textContent = '€0.00';
          el.style.color = '';
        }
      } else {
        el.textContent = formatCurrency(value);
      }
    }
  };

  // Rent
  updateCategoryValue('statRentExpensesValue', rentStats.expenses);
  updateCategoryValue('statRentPaymentsValue', rentStats.payments);
  updateCategoryValue('statRentBalanceValue', rentStats.balance, true);
  
  // Garbage
  updateCategoryValue('statGarbageExpensesValue', garbageStats.expenses);
  updateCategoryValue('statGarbagePaymentsValue', garbageStats.payments);
  updateCategoryValue('statGarbageBalanceValue', garbageStats.balance, true);
  
  // Maintenance
  updateCategoryValue('statMaintenanceExpensesValue', maintenanceStats.expenses);
  updateCategoryValue('statMaintenancePaymentsValue', maintenanceStats.payments);
  updateCategoryValue('statMaintenanceBalanceValue', maintenanceStats.balance, true);
  
  // Electricity
  updateCategoryValue('statElectricityExpensesValue', electricityStats.expenses);
  updateCategoryValue('statElectricityPaymentsValue', electricityStats.payments);
  updateCategoryValue('statElectricityBalanceValue', electricityStats.balance, true);
  
  // Water
  updateCategoryValue('statWaterExpensesValue', waterStats.expenses);
  updateCategoryValue('statWaterPaymentsValue', waterStats.payments);
  updateCategoryValue('statWaterBalanceValue', waterStats.balance, true);
  
  // Heating
  updateCategoryValue('statHeatingExpensesValue', heatingStats.expenses);
  updateCategoryValue('statHeatingPaymentsValue', heatingStats.payments);
  updateCategoryValue('statHeatingBalanceValue', heatingStats.balance, true);
}

async function loadInitialData() {
  const scope = await resolveStatisticsScope();
  if (scope.failed) {
    renderStatistics();
    return;
  }
  const skipFinancials = !scope.overall && scope.contractIds.length === 0;
  if (skipFinancials) resetExpenseState();
  const financialLoads = skipFinancials
    ? []
    : EXPENSE_TYPES.flatMap((type) => {
        const tables = EXPENSE_TABLES[type];
        const keys = EXPENSE_STATE_KEYS[type];
        const contractIds = scope.overall ? null : scope.contractIds;
        return [
          loadAmountRows(tables.bills, contractIds).then((rows) => {
            state[keys.bills] = rows;
          }),
          loadAmountRows(tables.payments, contractIds).then((rows) => {
            state[keys.payments] = rows;
          }),
        ];
      });

  const [tenantCount, apartmentCount, contractCount] = await Promise.all([
    countRows("tenants"),
    scope.apartmentCount == null ? countRows("apartments") : Promise.resolve(scope.apartmentCount),
    scope.contractCount == null ? countRows("contracts") : Promise.resolve(scope.contractCount),
    ...financialLoads,
  ]);

  if (tenantCount != null) state.tenantCount = tenantCount;
  if (apartmentCount != null) state.apartmentCount = apartmentCount;
  if (contractCount != null) state.contractCount = contractCount;
  publishExpenseTotals();
  renderStatistics();
}


// Mobile menu toggle function for statistics.html
// Define this BEFORE init() so it's available when init runs
window.setupMobileMenuToggle = function setupMobileMenuToggleForStats() {
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
      // Create SVG using DOM methods
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      
      const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line1.setAttribute("x1", "18");
      line1.setAttribute("y1", "6");
      line1.setAttribute("x2", "6");
      line1.setAttribute("y2", "18");
      svg.appendChild(line1);
      
      const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line2.setAttribute("x1", "6");
      line2.setAttribute("y1", "6");
      line2.setAttribute("x2", "18");
      line2.setAttribute("y2", "18");
      svg.appendChild(line2);
      
      closeBtn.appendChild(svg);
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
  // Check authentication
  const user = await checkAuth();
  if (!user) {
    // Not authenticated, redirect to login
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  
  // Set up event listeners
  const logoutButton = document.getElementById("logoutButton");
  const languageToggleBtn = document.getElementById("languageToggleBtn");
  const backLink = document.getElementById("statisticsBackLink");

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
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
      // Re-setup navigation to apply translations
      const role = currentUser?.user_metadata?.role || "Property Owner / Landlord";
      setupTopNavigationForStats(role);
      updateTopNavActiveForStats();
    });
  }

  // Theme toggle switch (light / dark)
  const themeToggleSwitch = document.getElementById("themeToggleSwitch");
  if (themeToggleSwitch) {
    const applyTheme = (theme) => {
      if (theme === "dark") {
        document.body.classList.add("dark-theme");
        themeToggleSwitch.checked = true;
      } else {
        document.body.classList.remove("dark-theme");
        themeToggleSwitch.checked = false;
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

    themeToggleSwitch.addEventListener("change", () => {
      const isDark = themeToggleSwitch.checked;
      applyTheme(isDark ? "dark" : "light");
    });
  }

  translateUI();
  
  // Setup navigation based on role
  const role = currentUser?.user_metadata?.role || "Property Owner / Landlord";
  setupTopNavigationForStats(role);
  
  // Update top navigation active state
  updateTopNavActiveForStats();

  // Setup mobile menu toggle AFTER navigation is populated
  // This will re-attach listeners to the dynamically created nav buttons
  const menuToggleFn = window.setupMobileMenuToggle || setupMobileMenuToggle;
  if (typeof menuToggleFn === "function") {
    // Use setTimeout to ensure navigation buttons are in DOM
    setTimeout(() => {
      menuToggleFn();
    }, 100);
  }

  // Update back link for tenants after translation (in case translateUI overrides it)
  if (backLink) {
    if (role === "Tenant") {
      backLink.href = "tenant-apartments.html";
      backLink.textContent = "Back to Tenant Portal";
      backLink.removeAttribute("data-i18n");
    }
  }
  
  // Set up statistics toggle button
  const statisticsToggleBtn = document.getElementById("statisticsToggleBtn");
  const statisticsToggleText = document.getElementById("statisticsToggleText");
  
  if (statisticsToggleBtn && statisticsToggleText) {
    const updateToggleText = () => {
      statisticsToggleText.textContent = showOverallStats 
        ? translate("showPersonal") 
        : translate("showOverall");
    };
    
    updateToggleText();
    
    statisticsToggleBtn.addEventListener("click", async () => {
      showOverallStats = !showOverallStats;
      updateToggleText();
      
      // Update header title
      const headerTitle = document.getElementById("statisticsHeaderTitle");
      if (headerTitle) {
        headerTitle.textContent = showOverallStats 
          ? translate("overallStatistics") 
          : translate("myStatistics");
      }
      
      // Reload data with new filter
      await loadInitialData();
    });
  }
  
  await loadInitialData();
}

function setupTopNavigationForStats(role) {
  const navContainer = document.getElementById("topNavContainer");
  if (!navContainer) return;
  
  const isTenant = role === "Tenant";
  
  // Clear existing navigation using DOM methods
  while (navContainer.firstChild) {
    navContainer.removeChild(navContainer.firstChild);
  }
  
  // Statistics button (always shown, but disabled on statistics page)
  const statsBtn = document.createElement("button");
  statsBtn.className = "top-nav-btn active";
  statsBtn.id = "topNavStatistics";
  statsBtn.disabled = true;
  // Don't add onclick handler since we're already on statistics page
  const statsSpan = document.createElement("span");
  statsSpan.setAttribute("data-i18n", "floatingNavStatistics");
  statsSpan.textContent = "Statistics";
  statsBtn.appendChild(statsSpan);
  navContainer.appendChild(statsBtn);
  
  // Divider
  const divider1 = document.createElement("div");
  divider1.className = "top-nav-divider";
  navContainer.appendChild(divider1);
  
  if (isTenant) {
    // Tenant navigation: Tenant - Apartment | Tenant Contracts | Tenant Expenses
    const tenantApartmentsBtn = document.createElement("button");
    tenantApartmentsBtn.className = "top-nav-btn";
    tenantApartmentsBtn.id = "topNavTenantApartments";
    tenantApartmentsBtn.onclick = () => window.location.href = "tenant-apartments.html";
    const tenantApartmentsSpan = document.createElement("span");
    tenantApartmentsSpan.setAttribute("data-i18n", "floatingNavTenantApartments");
    tenantApartmentsSpan.textContent = "Tenant - Apartment";
    tenantApartmentsBtn.appendChild(tenantApartmentsSpan);
    navContainer.appendChild(tenantApartmentsBtn);
    
    const tenantContractsBtn = document.createElement("button");
    tenantContractsBtn.className = "top-nav-btn";
    tenantContractsBtn.id = "topNavTenantContracts";
    tenantContractsBtn.onclick = () => window.location.href = "tenant-contracts.html";
    const tenantContractsSpan = document.createElement("span");
    tenantContractsSpan.setAttribute("data-i18n", "floatingNavTenantContracts");
    tenantContractsSpan.textContent = "Tenant Contracts";
    tenantContractsBtn.appendChild(tenantContractsSpan);
    navContainer.appendChild(tenantContractsBtn);
    
    const tenantExpensesBtn = document.createElement("button");
    tenantExpensesBtn.className = "top-nav-btn";
    tenantExpensesBtn.id = "topNavTenantExpenses";
    tenantExpensesBtn.onclick = () => window.location.href = "tenant-expenses.html";
    const tenantExpensesSpan = document.createElement("span");
    tenantExpensesSpan.setAttribute("data-i18n", "floatingNavTenantExpenses");
    tenantExpensesSpan.textContent = "Tenant Expenses";
    tenantExpensesBtn.appendChild(tenantExpensesSpan);
    navContainer.appendChild(tenantExpensesBtn);
  } else {
    // Landlord navigation: Administrator | Tenant View
    const adminBtn = document.createElement("button");
    adminBtn.className = "top-nav-btn";
    adminBtn.id = "topNavAdmin";
    adminBtn.onclick = () => window.location.href = "index.html";
    const adminSpan = document.createElement("span");
    adminSpan.setAttribute("data-i18n", "floatingNavAdmin");
    adminSpan.textContent = "Administrator";
    adminBtn.appendChild(adminSpan);
    navContainer.appendChild(adminBtn);
    
    const tenantViewBtn = document.createElement("button");
    tenantViewBtn.className = "top-nav-btn";
    tenantViewBtn.id = "topNavTenant";
    tenantViewBtn.onclick = () => window.location.href = "index.html?view=tenant";
    const tenantViewSpan = document.createElement("span");
    tenantViewSpan.setAttribute("data-i18n", "floatingNavTenant");
    tenantViewSpan.textContent = "Tenant View";
    tenantViewBtn.appendChild(tenantViewSpan);
    navContainer.appendChild(tenantViewBtn);
  }
  
  // Divider before Profile
  const divider2 = document.createElement("div");
  divider2.className = "top-nav-divider";
  navContainer.appendChild(divider2);
  
  // Profile button (always shown)
  const profileBtn = document.createElement("button");
  profileBtn.className = "top-nav-btn";
  profileBtn.id = "topNavProfile";
  profileBtn.onclick = () => window.location.href = "profile.html";
  const profileSpan = document.createElement("span");
  profileSpan.setAttribute("data-i18n", "floatingNavProfile");
  profileSpan.textContent = "Profile";
  profileBtn.appendChild(profileSpan);
  navContainer.appendChild(profileBtn);
  
  // Apply translations
  translateUI();
}

function updateTopNavActiveForStats() {
  // Remove active from all buttons
  const allButtons = document.querySelectorAll("#topNavContainer .top-nav-btn");
  allButtons.forEach(btn => btn.classList.remove("active"));
  
  // Set Statistics as active
  const statisticsBtn = document.getElementById("topNavStatistics");
  if (statisticsBtn) statisticsBtn.classList.add("active");
}

document.addEventListener("DOMContentLoaded", init);




