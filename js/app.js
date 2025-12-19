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

// Shared translations are defined globally in js/languages.js
const translations = window.TRANSLATIONS || {};

const EXPENSE_TYPE_MAP = {
  all: "all",
  rent: "rent",
  garbage: "garbage",
  maintenance: "maintenance",
  electricity: "electricity",
  water: "water",
  heating: "thermos",
};

// Utility types that show summary view instead of mark-paid
const UTILITY_TYPES = ["electricity", "water", "thermos"];

const EXPENSE_HEADING_KEYS = {
  all: "expensesHeadingAll",
  rent: "expensesHeadingRent",
  garbage: "expensesHeadingGarbage",
  maintenance: "expensesHeadingMaintenance",
  electricity: "expensesHeadingElectricity",
  water: "expensesHeadingWater",
  heating: "expensesHeadingHeating",
};

const UTILITY_PAYMENT_TYPES = ["electricity", "water", "thermos"];

const ELECTRICITY_RECONNECTION_FEE = window.APP_CONFIG?.ELECTRICITY_RECONNECTION_FEE || 17.7;
const ELECTRICITY_CUT_MARKER = "__electricityCut__";

let persistedPdfGeneratedCount = 0;
try {
  const storedPdfCount = window.localStorage.getItem("pdfGeneratedCount");
  const parsedPdfCount = Number.parseInt(storedPdfCount || "0", 10);
  if (!Number.isNaN(parsedPdfCount) && parsedPdfCount >= 0) {
    persistedPdfGeneratedCount = parsedPdfCount;
  }
} catch {
  persistedPdfGeneratedCount = 0;
}

const state = {
  language: "en",
  role: "admin",
  tenants: [],
  apartments: [],
  contracts: [],
  debts: [],
  payments: [],
  utilityBills: [],
  utilityPayments: [],
  // Split tables data
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
  selectedTenantId: null,
  adminPage: "expenses",
  expensesCategory: "rent",
  isInitialLoad: false,
  expenseFormMode: "expense",
  showExpenseSummary: false,
  showPaymentSummary: false,
  contractsLoaded: false,
  debtsLoaded: false,
  recurringDebtsEnsured: false,
  ensuringRecurringDebts: false,
  pdfGeneratedCount: persistedPdfGeneratedCount,
  editingDebtId: null,
  editingPaymentId: null,
  editingUtilityBillId: null,
  editingUtilityPaymentId: null,
  markPaidDebtId: null,
  globalTenantFilter: null, // Global tenant filter for all views
  globalContractFilter: null, // Global contract filter for all views
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

const elements = {};

// Mobile menu toggle function (standalone version for index.html)
function setupMobileMenuToggle() {
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
}

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  attachEventListeners();
  translateUI();
  
  // Setup mobile menu toggle
  setupMobileMenuToggle();
  
  // Setup date inputs with year limits (2020-2030)
  setupDateInputs();
  
  // Setup phone number formatting
  setupPhoneFormatting('tenantPhone');
  
  // Check authentication status on load
  await checkAuth();
  
  // If not authenticated, redirect to login
  if (!state.currentUser) {
    window.location.href = "login.html";
    return;
  }
  
  // Check for view parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("view") === "tenant") {
    state.role = "tenant";
  } else if (state.currentUser) {
    // Ensure role is set correctly based on user metadata
    const userRole = state.currentUser.user_metadata?.role || "Property Owner / Landlord";
    if (userRole === "Tenant") {
      state.role = "tenant";
    } else {
      state.role = "admin";
    }
  }

  // If authenticated, load data and show appropriate view
  // Use toggleViews to properly initialize the view (it handles both admin and tenant)
  toggleViews();
  loadInitialData();
});

function setupDateInputs() {
  // Add input listeners to update hidden input values
  setupDatePickerListeners();
}

function setDefaultDateToToday() {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  
  // Set debt due date
  if (elements.debtDueDay) elements.debtDueDay.value = day;
  if (elements.debtDueMonth) elements.debtDueMonth.value = month;
  if (elements.debtDueYear) elements.debtDueYear.value = year;
  if (elements.debtDueDate) elements.debtDueDate.value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Set payment date
  if (elements.paymentDay) elements.paymentDay.value = day;
  if (elements.paymentMonth) elements.paymentMonth.value = month;
  if (elements.paymentYear) elements.paymentYear.value = year;
  if (elements.paymentDate) elements.paymentDate.value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function setupDatePickerListeners() {
  // Map of date picker IDs to their component inputs
  const datePickers = [
    { day: 'debtDueDay', month: 'debtDueMonth', year: 'debtDueYear', hidden: 'debtDueDate' },
    { day: 'paymentDay', month: 'paymentMonth', year: 'paymentYear', hidden: 'paymentDate' },
    { day: 'markPaidDay', month: 'markPaidMonth', year: 'markPaidYear', hidden: 'markPaidDate' },
  ];
  
  datePickers.forEach(picker => {
    const dayInput = document.getElementById(picker.day);
    const monthInput = document.getElementById(picker.month);
    const yearInput = document.getElementById(picker.year);
    const hiddenInput = document.getElementById(picker.hidden);
    
    if (!dayInput || !monthInput || !yearInput || !hiddenInput) return;
    
    const updateHiddenInput = () => {
      const day = parseInt(dayInput.value) || 0;
      const month = parseInt(monthInput.value) || 0;
      const year = parseInt(yearInput.value) || 0;
      
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
        // Validate date (check if day is valid for the month)
        const daysInMonth = new Date(year, month, 0).getDate();
        const validDay = Math.min(day, daysInMonth);
        
        hiddenInput.value = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
      } else {
        hiddenInput.value = '';
      }
    };
    
    dayInput.addEventListener('input', updateHiddenInput);
    monthInput.addEventListener('input', updateHiddenInput);
    yearInput.addEventListener('input', updateHiddenInput);
  });
}

// Helper function to set date picker value from ISO date string
function setDatePickerValue(prefix, isoDate) {
  const dayInput = document.getElementById(`${prefix}Day`);
  const monthInput = document.getElementById(`${prefix}Month`);
  const yearInput = document.getElementById(`${prefix}Year`);
  const hiddenInput = document.getElementById(prefix);
  
  if (!dayInput || !monthInput || !yearInput || !hiddenInput) return;
  
  if (!isoDate) {
    dayInput.value = '';
    monthInput.value = '';
    yearInput.value = '';
    hiddenInput.value = '';
    return;
  }
  
  try {
    const date = new Date(isoDate + 'T00:00:00');
    if (isNaN(date.getTime())) return;
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    dayInput.value = day;
    monthInput.value = month;
    yearInput.value = year;
    hiddenInput.value = isoDate.split('T')[0]; // Ensure YYYY-MM-DD format
  } catch (e) {
    console.error('Error setting date picker value:', e);
  }
}

// Helper function to get date picker value as ISO date string
function getDatePickerValue(prefix) {
  const hiddenInput = document.getElementById(prefix);
  return hiddenInput ? hiddenInput.value : '';
}

function cacheElements() {
  Object.assign(elements, {
    loginView: document.getElementById("loginView"),
    loginForm: document.getElementById("loginForm"),
    signupForm: document.getElementById("signupForm"),
    signupCard: document.getElementById("signupCard"),
    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    signupEmail: document.getElementById("signupEmail"),
    signupPassword: document.getElementById("signupPassword"),
    signupConfirmPassword: document.getElementById("signupConfirmPassword"),
    loginError: document.getElementById("loginError"),
    signupError: document.getElementById("signupError"),
    showSignup: document.getElementById("showSignup"),
    showLogin: document.getElementById("showLogin"),
    logoutButton: document.getElementById("logoutButton"),
    authControls: document.getElementById("authControls"),
    languageToggleBtn: document.getElementById("languageToggleBtn"),
    adminView: document.getElementById("adminView"),
    tenantView: document.getElementById("tenantView"),
    adminNav: document.getElementById("adminNav"),
    notificationArea: document.getElementById("notificationArea"),
    confirmationModal: document.getElementById("confirmationModal"),
    confirmationAnimationContainer: document.getElementById("confirmationAnimationContainer"),
    markPaidModal: document.getElementById("markPaidModal"),
    markPaidAmount: document.getElementById("markPaidAmount"),
    markPaidDay: document.getElementById("markPaidDay"),
    markPaidMonth: document.getElementById("markPaidMonth"),
    markPaidYear: document.getElementById("markPaidYear"),
    markPaidDate: document.getElementById("markPaidDate"),
    markPaidMethod: document.getElementById("markPaidMethod"),
    markPaidCancel: document.getElementById("markPaidCancel"),
    markPaidSubmit: document.getElementById("markPaidSubmit"),
    adminSummary: document.getElementById("adminSummary"),
    statTenantsValue: document.getElementById("statTenantsValue"),
    statApartmentsValue: document.getElementById("statApartmentsValue"),
    statContractsValue: document.getElementById("statContractsValue"),
    statExpensesValue: document.getElementById("statExpensesValue"),
    statPaymentsValue: document.getElementById("statPaymentsValue"),
    statTotalPaymentsValue: document.getElementById("statTotalPaymentsValue"),
    statTotalExpensesValue: document.getElementById("statTotalExpensesValue"),
    statTotalUnpaidValue: document.getElementById("statTotalUnpaidValue"),
    statPdfGeneratedValue: document.getElementById("statPdfGeneratedValue"),
    apartmentForm: document.getElementById("apartmentForm"),
    apartmentId: document.getElementById("apartmentId"),
    apartmentName: document.getElementById("apartmentName"),
    apartmentAddress: document.getElementById("apartmentAddress"),
    apartmentElectricityCode: document.getElementById("apartmentElectricityCode"),
    apartmentHeatingCode: document.getElementById("apartmentHeatingCode"),
    apartmentWaterCode: document.getElementById("apartmentWaterCode"),
    apartmentWasteCode: document.getElementById("apartmentWasteCode"),
    apartmentCondition: document.getElementById("apartmentCondition"),
    apartmentRooms: document.getElementById("apartmentRooms"),
    apartmentBalconies: document.getElementById("apartmentBalconies"),
    apartmentBathrooms: document.getElementById("apartmentBathrooms"),
    apartmentArea: document.getElementById("apartmentArea"),
    apartmentMunicipality: document.getElementById("apartmentMunicipality"),
    apartmentMonthlyRent: document.getElementById("apartmentMonthlyRent"),
    apartmentDescription: document.getElementById("apartmentDescription"),
    apartmentSubmitBtn: document.getElementById("apartmentSubmitBtn"),
    apartmentCancelBtn: document.getElementById("apartmentCancelBtn"),
    apartmentsTableBody: document.getElementById("apartmentsTableBody"),
    tenantForm: document.getElementById("tenantForm"),
    tenantsTableBody: document.getElementById("tenantsTableBody"),
    contractForm: document.getElementById("contractForm"),
    contractApartment: document.getElementById("contractApartment"),
    contractTenant: document.getElementById("contractTenant"),
    contractGarbage: document.getElementById("contractGarbage"),
    contractMaintenance: document.getElementById("contractMaintenance"),
    contractActive: document.getElementById("contractActive"),
    contractsActiveTableBody: document.getElementById("contractsActiveTableBody"),
    contractsInactiveTableBody: document.getElementById("contractsInactiveTableBody"),
    debtForm: document.getElementById("debtForm"),
    debtType: document.getElementById("debtType"),
    debtAmount: document.getElementById("debtAmount"),
    debtDueDate: document.getElementById("debtDueDate"),
    debtDueDay: document.getElementById("debtDueDay"),
    debtDueMonth: document.getElementById("debtDueMonth"),
    debtDueYear: document.getElementById("debtDueYear"),
    debtNotes: document.getElementById("debtNotes"),
    paymentForm: document.getElementById("paymentForm"),
    debtFormSubmit: document.getElementById("debtFormSubmit"),
    debtFormCancelEdit: document.getElementById("debtFormCancelEdit"),
    paymentFormSubmit: document.getElementById("paymentFormSubmit"),
    paymentFormCancelEdit: document.getElementById("paymentFormCancelEdit"),
    debtContract: document.getElementById("debtContract"),
    debtTenant: document.getElementById("debtTenant"),
    debtElectricityCutWrapper: document.getElementById(
      "debtElectricityCutWrapper"
    ),
    debtElectricityCut: document.getElementById("debtElectricityCut"),
    expenseFormToggle: document.getElementById("expenseFormToggle"),
    paymentDebt: document.getElementById("paymentDebt"),
    paymentAmount: document.getElementById("paymentAmount"),
    paymentDate: document.getElementById("paymentDate"),
    paymentDay: document.getElementById("paymentDay"),
    paymentMonth: document.getElementById("paymentMonth"),
    paymentYear: document.getElementById("paymentYear"),
    paymentMethod: document.getElementById("paymentMethod"),
    paymentDebtSummary: document.getElementById("paymentDebtSummary"),
    debtsTableBody: document.getElementById("debtsTableBody"),
    debtsFilterStatus: document.getElementById("debtsFilterStatus"),
    debtsFilterType: document.getElementById("debtsFilterType"),
    exportDebtsPdf: document.getElementById("exportDebtsPdf"),
    expensesHeading: document.getElementById("expensesHeading"),
    expensesSubheading: document.getElementById("expensesSubheading"),
    paymentsTableBody: document.getElementById("paymentsTableBody"),
    requestsTableBody: document.getElementById("requestsTableBody"),
    tenantSelector: document.getElementById("tenantSelector"),
    tenantSelect: document.getElementById("tenantSelect"),
    tenantInfoList: document.getElementById("tenantInfoList"),
    tenantContractList: document.getElementById("tenantContractList"),
    tenantFinancialList: document.getElementById("tenantFinancialList"),
    tenantDebtsTableBody: document.getElementById("tenantDebtsTableBody"),
    tenantPaymentsTableBody:
      document.getElementById("tenantPaymentsTableBody"),
    exportTenantPdf: document.getElementById("exportTenantPdf"),
    exportTenantPdfSq: document.getElementById("exportTenantPdfSq"),
    toggleExpenseSummary: document.getElementById("toggleExpenseSummary"),
    togglePaymentSummary: document.getElementById("togglePaymentSummary"),
    expenseSummaryPanel: document.getElementById("expenseSummaryPanel"),
    expenseSummaryBody: document.getElementById("expenseSummaryBody"),
    paymentSummaryPanel: document.getElementById("paymentSummaryPanel"),
    paymentSummaryBody: document.getElementById("paymentSummaryBody"),
    expensesPaymentsTableBody: document.getElementById(
      "expensesPaymentsTableBody"
    ),
    openExpensesTableBody: document.getElementById("openExpensesTableBody"),
    utilitySummarySection: document.getElementById("utilitySummarySection"),
    utilityTotalExpenses: document.getElementById("utilityTotalExpenses"),
    utilityTotalPayments: document.getElementById("utilityTotalPayments"),
    utilityDifference: document.getElementById("utilityDifference"),
    utilityExpensesTableBody: document.getElementById("utilityExpensesTableBody"),
    utilityPaymentsTableBody: document.getElementById("utilityPaymentsTableBody"),
    globalTenantFilter: document.getElementById("globalTenantFilter"),
    clearTenantFilter: document.getElementById("clearTenantFilter"),
    globalContractFilter: document.getElementById("globalContractFilter"),
    clearContractFilter: document.getElementById("clearContractFilter"),
  });
  if (elements.debtFormCancelEdit) {
    elements.debtFormCancelEdit.addEventListener("click", () => {
      resetDebtForm();
    });
  }
  if (elements.paymentFormCancelEdit) {
    elements.paymentFormCancelEdit.addEventListener("click", () => {
      resetPaymentForm();
    });
  }
  if (elements.debtsTableBody) {
    elements.debtsTableBody.addEventListener("click", handleDebtsTableClick);
  }
  if (elements.paymentsTableBody) {
    elements.paymentsTableBody.addEventListener("click", handlePaymentsTableClick);
  }
  if (elements.expensesPaymentsTableBody) {
    elements.expensesPaymentsTableBody.addEventListener(
      "click",
      handlePaymentsTableClick
    );
  }
  if (elements.utilityExpensesTableBody) {
    elements.utilityExpensesTableBody.addEventListener("click", handleUtilityBillsTableClick);
  }
  if (elements.utilityPaymentsTableBody) {
    elements.utilityPaymentsTableBody.addEventListener("click", handleUtilityPaymentsTableClick);
  }
  elements.expenseFormModeButtons = Array.from(
    document.querySelectorAll("[data-expense-form-mode]")
  );
  elements.expenseModeSections = Array.from(
    document.querySelectorAll("[data-expense-mode]")
  );
  updateExpenseFormModeUI();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  renderAdminSummary();
}

function attachEventListeners() {
  // Authentication event listeners
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", handleLogin);
  }
  if (elements.signupForm) {
    elements.signupForm.addEventListener("submit", handleSignup);
  }
  if (elements.showSignup) {
    elements.showSignup.addEventListener("click", () => {
      if (elements.signupCard) elements.signupCard.style.display = "block";
      const loginCard = document.querySelector(".login-card:not(#signupCard)");
      if (loginCard) loginCard.style.display = "none";
    });
  }
  if (elements.showLogin) {
    elements.showLogin.addEventListener("click", () => {
      if (elements.signupCard) elements.signupCard.style.display = "none";
      const loginCard = document.querySelector(".login-card:not(#signupCard)");
      if (loginCard) loginCard.style.display = "block";
    });
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", handleLogout);
  }

  // Role toggle button (bottom only)
  const roleToggleBtnBottom = document.getElementById("roleToggleBtnBottom");
  
  if (roleToggleBtnBottom) {
    roleToggleBtnBottom.addEventListener("click", () => {
      if (state.role === "admin") {
        state.role = "tenant";
        roleToggleBtnBottom.textContent = translate("roleTenant");
      } else {
        state.role = "admin";
        roleToggleBtnBottom.textContent = translate("roleAdmin");
      }
      toggleViews();
    });
  }

  // Theme toggle button (light / dark)
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  function applyTheme(theme) {
    const body = document.body;
    if (!body) return;
    if (theme === "dark") {
      body.classList.add("dark-theme");
      if (themeToggleBtn) {
        const lightIcon = themeToggleBtn.querySelector(".theme-icon-light");
        const darkIcon = themeToggleBtn.querySelector(".theme-icon-dark");
        if (lightIcon) lightIcon.style.display = "none";
        if (darkIcon) darkIcon.style.display = "block";
      }
    } else {
      body.classList.remove("dark-theme");
      if (themeToggleBtn) {
        const lightIcon = themeToggleBtn.querySelector(".theme-icon-light");
        const darkIcon = themeToggleBtn.querySelector(".theme-icon-dark");
        if (lightIcon) lightIcon.style.display = "block";
        if (darkIcon) darkIcon.style.display = "none";
      }
      theme = "light";
    }
    try {
      window.localStorage.setItem("theme", theme);
    } catch (_) {}
  }

  const storedTheme = (window.localStorage && window.localStorage.getItem("theme")) || "light";
  applyTheme(storedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark-theme");
      applyTheme(isDark ? "light" : "dark");
    });
  }

  // Language toggle button
  const languageToggleBtn = document.getElementById("languageToggleBtn");
  
  if (languageToggleBtn) {
    languageToggleBtn.addEventListener("click", () => {
      if (state.language === "en") {
        state.language = "sq";
        languageToggleBtn.textContent = "Sq";
      } else {
        state.language = "en";
        languageToggleBtn.textContent = "En";
      }
      translateUI();
    });
  }

  // Reset app button
  const resetAppBtn = document.getElementById("resetAppBtn");
  if (resetAppBtn) {
    resetAppBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset the app? This will clear all local storage and reload the page.")) {
        try {
          // Clear all localStorage
          localStorage.clear();
          // Reload the page
          window.location.reload();
        } catch (error) {
          console.error("Error resetting app:", error);
          // Fallback: just reload
          window.location.reload();
        }
      }
    });
  }

  // Top Navigation Container
  setupTopNavContainer();
  // Ensure top nav is translated after setup
  translateUI();

  if (elements.adminNav) {
    elements.adminNav.addEventListener("click", handleAdminNavClick);
  }
  
  // Global contract filter
  if (elements.globalContractFilter) {
    elements.globalContractFilter.addEventListener("change", handleGlobalContractFilterChange);
  }
  if (elements.clearContractFilter) {
    elements.clearContractFilter.addEventListener("click", clearGlobalContractFilter);
  }

  elements.apartmentForm.addEventListener("submit", onCreateApartment);
  
  // Feature buttons click handlers
  setupFeatureButtons();
  
  // Cancel edit button
  if (elements.apartmentCancelBtn) {
    elements.apartmentCancelBtn.addEventListener("click", cancelEditApartment);
  }
  
  // Initialize photo upload functionality
  initializePhotoUpload();
  
  // Initialize photo viewer modal
  initializePhotoViewer();
  
  // Initialize photo review modal
  initializePhotoReview();
  
  // Initialize apartment map
  // Map initialization removed

  elements.tenantForm.addEventListener("submit", onCreateTenant);

  elements.contractForm.addEventListener("submit", onCreateContract);

  elements.debtForm.addEventListener("submit", onCreateDebt);
  if (elements.debtContract) {
    elements.debtContract.addEventListener("change", handleDebtContractChange);
  }
  if (elements.debtType) {
    elements.debtType.addEventListener("change", handleDebtTypeChange);
  }
  if (elements.debtElectricityCut) {
    elements.debtElectricityCut.addEventListener(
      "change",
      handleElectricityCutChange
    );
  }
  if (elements.expenseFormToggle) {
    elements.expenseFormToggle.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expense-form-mode]");
      if (!button) return;
      setExpenseFormMode(button.dataset.expenseFormMode);
    });
  }
  if (elements.paymentDebt) {
    elements.paymentDebt.addEventListener("change", handlePaymentDebtChange);
  }
  if (elements.paymentAmount) {
    elements.paymentAmount.addEventListener("input", handlePaymentAmountInput);
  }
  if (elements.toggleExpenseSummary) {
    elements.toggleExpenseSummary.addEventListener("click", () => {
      refreshTenantSummaries();
      state.showExpenseSummary = !state.showExpenseSummary;
      updateExpenseSummaryUI();
    });
  }
  if (elements.togglePaymentSummary) {
    elements.togglePaymentSummary.addEventListener("click", () => {
      refreshTenantSummaries();
      state.showPaymentSummary = !state.showPaymentSummary;
      updatePaymentSummaryUI();
    });
  }
  elements.paymentForm.addEventListener("submit", onCreatePayment);

  elements.debtsFilterStatus.addEventListener("change", renderDebtsTable);
  elements.debtsFilterType.addEventListener("change", onDebtsTypeFilterChange);
  elements.exportDebtsPdf.addEventListener("click", exportDebtsToPdf);
  
  // Mark Paid Modal event listeners
  if (elements.markPaidCancel) {
    elements.markPaidCancel.addEventListener("click", () => {
      if (elements.markPaidModal) {
        elements.markPaidModal.style.display = "none";
      }
      state.markPaidDebtId = null;
    });
  }
  
  if (elements.markPaidSubmit) {
    elements.markPaidSubmit.addEventListener("click", submitMarkPaidPayment);
  }
  
  // Payment method button listeners for both modals and payment form
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("payment-method-btn")) {
      // Find the container (modal or form) this button belongs to
      const isPaymentForm = e.target.classList.contains("payment-form-method-btn");
      const isMarkPaidModal = e.target.closest(".mark-paid-modal");
      
      // Get relevant elements based on context
      let methodInput;
      let buttons;
      
      if (isMarkPaidModal) {
        methodInput = elements.markPaidMethod;
        buttons = elements.markPaidModal?.querySelectorAll(".payment-method-btn");
      } else if (isPaymentForm) {
        methodInput = elements.paymentMethod;
        buttons = document.querySelectorAll(".payment-form-method-btn");
      }
      
      if (buttons) {
        buttons.forEach(btn => btn.classList.remove("active"));
        e.target.classList.add("active");
        
        if (e.target.dataset.method === "custom") {
          if (methodInput) {
            methodInput.style.display = "block";
            methodInput.focus();
            methodInput.value = ""; // Clear value for custom input
          }
        } else {
          // Set the button value to the input field (for form submission)
          if (methodInput) {
            methodInput.value = e.target.dataset.method;
            methodInput.style.display = "none";
          }
        }
      }
    }
  });

  elements.tenantSelector.addEventListener("submit", (event) => {
    event.preventDefault();
    state.selectedTenantId = elements.tenantSelect.value || null;
    if (!state.selectedTenantId) {
      notify("error", translate("noTenantSelected"));
      return;
    }
    loadTenantView();
  });

  if (elements.exportTenantPdf) {
    elements.exportTenantPdf.addEventListener("click", (e) => {
      e.preventDefault();
      const format = document.querySelector('input[name="pdfFormat"]:checked')?.value || "normal";
      exportTenantToPdf("en", format);
    });
  }
  if (elements.exportTenantPdfSq) {
    elements.exportTenantPdfSq.addEventListener("click", (e) => {
      e.preventDefault();
      const format = document.querySelector('input[name="pdfFormat"]:checked')?.value || "normal";
      exportTenantToPdf("sq", format);
    });
  }
}

function handleAdminNavClick(event) {
  const button = event.target.closest("button[data-page]");
  if (!button) return;
  const page = button.dataset.page;
  if (!page) return;
  event.preventDefault();
  if (page === "expenses") {
    const expenseType = button.dataset.expenseType || "all";
    setAdminPage("expenses", expenseType);
  } else {
    setAdminPage(page);
  }
}

function handleGlobalContractFilterChange() {
  const value = elements.globalContractFilter?.value || "";
  state.globalContractFilter = value || null;
  
  // Update UI to show filter is active
  const filterContainer = document.querySelector('.global-tenant-filter');
  if (filterContainer) {
    filterContainer.classList.toggle('has-filter', !!value);
  }
  
  // Lock/unlock form fields based on filter
  updateFormContractLock();
  
  // Refresh all views
  renderDebtsTable();
  renderPaymentsTable();
  renderOpenExpensesTable();
  renderUtilitySummary();
}

function clearGlobalContractFilter() {
  if (elements.globalContractFilter) {
    elements.globalContractFilter.value = "";
  }
  state.globalContractFilter = null;
  
  const filterContainer = document.querySelector('.global-tenant-filter');
  if (filterContainer) {
    filterContainer.classList.remove('has-filter');
  }
  
  // Unlock form fields
  updateFormContractLock();
  
  // Refresh all views
  renderDebtsTable();
  renderPaymentsTable();
  renderOpenExpensesTable();
  renderUtilitySummary();
}

function updateFormContractLock() {
  const hasFilter = !!state.globalContractFilter;
  
  // First unlock to allow setting values
  if (elements.debtContract) {
    elements.debtContract.disabled = false;
  }
  if (elements.debtTenant) {
    elements.debtTenant.disabled = false;
  }
  
  if (hasFilter) {
    // Set contract/tenant in expense form
    if (elements.debtContract) {
      elements.debtContract.value = state.globalContractFilter;
    }
    
    // Get tenant from contract
    const contract = state.contracts.find(c => equalsId(c.id, state.globalContractFilter));
    if (contract && elements.debtTenant) {
      elements.debtTenant.value = contract.tenant_id;
    }
    
    // Set amount based on expense type
    if (contract && elements.debtAmount) {
      const expenseType = getActiveExpenseType();
      let amount = 0;
      if (expenseType === 'rent') {
        amount = contract.monthly_rent || 0;
      } else if (expenseType === 'garbage') {
        amount = contract.monthly_garbage || 0;
      } else if (expenseType === 'maintenance') {
        amount = contract.monthly_maintenance || 0;
      }
      if (amount > 0) {
        elements.debtAmount.value = amount;
      }
    }
    
    // Now lock the fields
    if (elements.debtContract) {
      elements.debtContract.disabled = true;
    }
    if (elements.debtTenant) {
      elements.debtTenant.disabled = true;
    }
  }
}

function populateGlobalContractFilter() {
  if (!elements.globalContractFilter) return;
  
  const currentValue = state.globalContractFilter || "";
  elements.globalContractFilter.innerHTML = `<option value="" data-i18n="allContracts">${translate("allContracts") || "All Contracts"}</option>`;
  
  // Only show active contracts
  state.contracts.filter(c => c.is_active).forEach(contract => {
    const tenant = state.tenants.find(t => equalsId(t.id, contract.tenant_id));
    const apartment = state.apartments.find(a => equalsId(a.id, contract.apartment_id));
    const label = `${tenant?.full_name || "?"} - ${apartment?.name || "?"}`;
    const option = document.createElement("option");
    option.value = contract.id;
    option.textContent = label;
    if (contract.id === currentValue) option.selected = true;
    elements.globalContractFilter.appendChild(option);
  });
}

function getFilteredDebts() {
  if (!state.globalContractFilter) return state.debts;
  return state.debts.filter(d => equalsId(d.contract_id, state.globalContractFilter));
}

function getFilteredPayments() {
  if (!state.globalContractFilter) return state.payments;
  return state.payments.filter(p => equalsId(p.contract_id, state.globalContractFilter));
}

function onDebtsTypeFilterChange() {
  renderDebtsTable();
  const selectedValue = elements.debtsFilterType.value;
  const mappedCategory = getExpenseCategoryFromTypeValue(selectedValue);
  if (selectedValue === "all") {
    state.expensesCategory = "all";
  } else if (mappedCategory) {
    state.expensesCategory = mappedCategory;
  } else {
    state.expensesCategory = "custom";
  }
  updateExpensesHeading();
  updateExpenseFormTypeLock();
  populateDebtSelects();
  if (state.adminPage === "expenses") {
    updateAdminNavActive("expenses", state.expensesCategory);
  }
}

function toggleViews() {
  if (state.role === "admin") {
    // Ensure admin view is visible
    if (elements.adminView) {
      elements.adminView.classList.add("active");
      elements.adminView.style.display = "";
    }
    if (elements.tenantView) {
      elements.tenantView.classList.remove("active");
      elements.tenantView.style.display = "none";
    }
    if (elements.adminNav) {
      elements.adminNav.style.display = "";
    }
    // Ensure main is visible
    const main = document.querySelector("main");
    if (main) {
      main.classList.remove("hidden");
      main.style.display = "";
    }
    setAdminPage(state.adminPage, state.expensesCategory);
  } else {
    if (elements.tenantView) {
      elements.tenantView.classList.add("active");
      elements.tenantView.style.display = "";
    }
    if (elements.adminView) {
      elements.adminView.classList.remove("active");
      elements.adminView.style.display = "none";
    }
    if (elements.adminNav) {
      elements.adminNav.style.display = "none";
    }
  }
  // Update top nav active state when view changes
  updateTopNavActive();
}

// Top Navigation Container
function setupTopNavContainer() {
  updateTopNavActive();
}

function updateTopNavActive() {
  const currentPath = window.location.pathname;
  let activeView = "admin";
  
  if (currentPath.includes("statistics.html")) {
    activeView = "statistics";
  } else if (currentPath.includes("profile.html")) {
    activeView = "profile";
  } else if (state.role === "tenant") {
    activeView = "tenant";
  } else {
    activeView = "admin";
  }

  // Update button active states
  const statisticsBtn = document.getElementById("topNavStatistics");
  const adminBtn = document.getElementById("topNavAdmin");
  const tenantBtn = document.getElementById("topNavTenant");
  const profileBtn = document.getElementById("topNavProfile");

  [statisticsBtn, adminBtn, tenantBtn, profileBtn].forEach(btn => {
    if (btn) btn.classList.remove("active");
  });

  if (activeView === "statistics" && statisticsBtn) {
    statisticsBtn.classList.add("active");
    statisticsBtn.disabled = true;
    // Remove onclick handler to prevent navigation
    statisticsBtn.onclick = null;
    statisticsBtn.removeAttribute("onclick");
  } else if (statisticsBtn) {
    statisticsBtn.disabled = false;
    // Restore onclick handler if it was removed
    if (!statisticsBtn.onclick) {
      statisticsBtn.onclick = () => window.location.href = "statistics.html";
    }
  }
  
  if (activeView === "admin" && adminBtn) {
    adminBtn.classList.add("active");
  } else if (activeView === "tenant" && tenantBtn) {
    tenantBtn.classList.add("active");
  } else if (activeView === "profile" && profileBtn) {
    profileBtn.classList.add("active");
  }
}

// Global functions for onclick handlers
window.switchToAdminView = function() {
  if (state.role !== "admin") {
    state.role = "admin";
    toggleViews();
    updateTopNavActive();
  }
};

window.switchToTenantView = function() {
  if (state.role !== "tenant") {
    state.role = "tenant";
    toggleViews();
    updateTopNavActive();
  }
};

function setAdminPage(page, expenseCategory = state.expensesCategory) {
  state.adminPage = page;
  const sections = document.querySelectorAll("#adminView .admin-page");
  sections.forEach((section) => {
    const isActive = section.dataset.page === page;
    section.classList.toggle("active", isActive);
    // Ensure display is set correctly (remove inline display:none if active)
    if (isActive && section.style.display === 'none') {
      section.style.display = '';
    }
  });
  updateAdminNavActive(page, expenseCategory);
  if (page === "expenses") {
    applyExpensesCategory(expenseCategory);
  }
  
  // Show/hide global contract filter based on page
  const filterContainer = document.querySelector('.global-tenant-filter');
  if (filterContainer) {
    // Hide filter on: apartments, tenants, contracts, requests
    // Show filter on: expenses, payments, and other pages
    const pagesWithoutFilter = ['apartments', 'tenants', 'contracts', 'requests'];
    if (pagesWithoutFilter.includes(page)) {
      filterContainer.style.display = 'none';
      filterContainer.setAttribute('data-hidden', 'true');
      // Clear the filter when switching to pages that don't need it
      if (state.globalContractFilter) {
        clearGlobalContractFilter();
      }
    } else {
      filterContainer.style.display = '';
      filterContainer.removeAttribute('data-hidden');
    }
  }
  
  // Initialize map when apartments page is shown (lazy loading)
  if (page === "apartments" && !mapInitialized) {
    // Small delay to ensure page is visible before initializing map
    requestAnimationFrame(() => {
      // Map initialization removed
    });
  }
}

function applyExpensesCategory(category = "all") {
  const normalized = EXPENSE_TYPE_MAP[category] ? category : "all";
  state.expensesCategory = normalized;
  if (elements.debtsFilterType) {
    elements.debtsFilterType.value = EXPENSE_TYPE_MAP[normalized] || "all";
  }
  updateExpensesHeading();
  updateExpenseFormTypeLock();
  updateFormContractLock(); // Update amount based on new expense type
  renderDebtsTable();
  renderPaymentsTable(); // Refresh payments table with new filter
  populateDebtSelects();
  refreshTenantSummaries(); // Refresh tenant summary with new filter
  if (state.adminPage === "expenses") {
    updateAdminNavActive("expenses", normalized);
  }
}

function updateAdminNavActive(page, expenseCategory = state.expensesCategory) {
  if (!elements.adminNav) return;
  const hasMapping = !!EXPENSE_TYPE_MAP[expenseCategory];
  elements.adminNav
    .querySelectorAll("button[data-page]")
    .forEach((button) => {
      const buttonPage = button.dataset.page;
      const buttonExpense = button.dataset.expenseType || null;
      const isExpenses = buttonPage === "expenses" && page === "expenses";
      const isActive =
        (buttonPage === page && page !== "expenses") ||
        (isExpenses &&
          hasMapping &&
          buttonExpense === expenseCategory);
      button.classList.toggle("active", isActive);
    });
}

function updateExpensesHeading() {
  if (!elements.expensesHeading) return;
  if (
    state.expensesCategory === "custom" &&
    elements.debtsFilterType &&
    elements.debtsFilterType.selectedOptions.length
  ) {
    elements.expensesHeading.textContent =
      elements.debtsFilterType.selectedOptions[0].textContent;
    if (elements.expensesSubheading) {
      elements.expensesSubheading.textContent = translate(
        "debtsPaymentsSubtitle"
      );
    }
    return;
  }
  const key =
    EXPENSE_HEADING_KEYS[state.expensesCategory] || EXPENSE_HEADING_KEYS.all;
  elements.expensesHeading.textContent = translate(key);
  if (elements.expensesSubheading) {
    elements.expensesSubheading.textContent = translate("debtsPaymentsSubtitle");
  }
}

function updateExpenseFormTypeLock() {
  if (!elements.debtType) return;
  const lockedType = getActiveExpenseType();
  if (!lockedType) {
    elements.debtType.disabled = false;
    if (elements.debtsFilterType) {
      const currentFilterValue = elements.debtsFilterType.value;
      if (currentFilterValue && currentFilterValue !== "all") {
        elements.debtType.value = currentFilterValue;
      }
    }
    handleDebtTypeChange();
    return;
  }
  elements.debtType.value = lockedType;
  elements.debtType.disabled = true;
  handleDebtTypeChange();
}

function setExpenseFormMode(mode) {
  if (mode !== "expense" && mode !== "payment") return;
  if (mode === "expense" && state.editingPaymentId) {
    resetPaymentForm();
  }
  if (mode === "payment" && state.editingDebtId) {
    resetDebtForm();
  }
  state.expenseFormMode = mode;
  updateExpenseFormModeUI();
}

function updateExpenseFormModeUI() {
  if (Array.isArray(elements.expenseFormModeButtons)) {
    elements.expenseFormModeButtons.forEach((button) => {
      const mode = button.dataset.expenseFormMode;
      button.classList.toggle("active", mode === state.expenseFormMode);
    });
  }
  if (elements.debtForm) {
    elements.debtForm.classList.toggle(
      "hidden",
      state.expenseFormMode !== "expense"
    );
  }
  if (elements.paymentForm) {
    elements.paymentForm.classList.toggle(
      "hidden",
      state.expenseFormMode !== "payment"
    );
  }
  if (Array.isArray(elements.expenseModeSections)) {
    elements.expenseModeSections.forEach((node) => {
      const mode = node.dataset.expenseMode;
      node.classList.toggle("hidden", mode !== state.expenseFormMode);
    });
  }
}

function updateExpenseSummaryUI() {
  if (elements.expenseSummaryPanel) {
    elements.expenseSummaryPanel.classList.toggle(
      "hidden",
      !state.showExpenseSummary
    );
  }
  if (elements.toggleExpenseSummary) {
    elements.toggleExpenseSummary.classList.toggle(
      "active",
      state.showExpenseSummary
    );
    elements.toggleExpenseSummary.setAttribute(
      "aria-expanded",
      String(state.showExpenseSummary)
    );
  }
}

function updatePaymentSummaryUI() {
  if (elements.paymentSummaryPanel) {
    elements.paymentSummaryPanel.classList.toggle(
      "hidden",
      !state.showPaymentSummary
    );
  }
  if (elements.togglePaymentSummary) {
    elements.togglePaymentSummary.classList.toggle(
      "active",
      state.showPaymentSummary
    );
    elements.togglePaymentSummary.setAttribute(
      "aria-expanded",
      String(state.showPaymentSummary)
    );
  }
}

function refreshTenantSummaries() {
  const summary = buildTenantSummaryData();
  renderTenantSummaryBody(elements.expenseSummaryBody, summary);
  renderTenantSummaryBody(elements.paymentSummaryBody, summary);
}

function buildTenantSummaryData() {
  // Get the active expense type filter
  const activeExpenseType = getActiveExpenseType();
  
  return (state.tenants || [])
    .map((tenant) => {
      const tenantName = tenant.full_name || translate("unknown");
      const openDebts = (state.debts || [])
        .filter(
          (debt) => equalsId(debt.tenant_id, tenant.id) && !debt.is_paid
        )
        .filter((debt) => {
          // Filter by expense type if a filter is active
          if (activeExpenseType) {
            return debt.type === activeExpenseType;
          }
          return true;
        });
      const tenantPayments = (state.payments || [])
        .filter((payment) => equalsId(payment.tenant_id, tenant.id))
        .filter((payment) => {
          // Filter by expense type if a filter is active
          if (activeExpenseType) {
            // Check payment's own type first
            if (payment.type === activeExpenseType) return true;
            // Fall back to checking linked debt
            const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
            return debt && debt.type === activeExpenseType;
          }
          return true;
        });
      const expensesCount = openDebts.length;
      const expensesAmount = openDebts.reduce(
        (sum, debt) => sum + (parseFloat(debt.amount) || 0),
        0
      );
      const paymentsCount = tenantPayments.length;
      const paymentsAmount = tenantPayments.reduce(
        (sum, payment) => sum + (parseFloat(payment.amount) || 0),
        0
      );
      if (!expensesCount && !paymentsCount) {
        return null;
      }
      return {
        tenantId: tenant.id,
        tenantName,
        expensesCount,
        expensesAmount,
        paymentsCount,
        paymentsAmount,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
}

function renderTenantSummaryBody(target, summary) {
  if (!target) return;
  if (!summary.length) {
    target.innerHTML = `
      <tr>
        <td colspan="5">${sanitize(translate("summaryNoData"))}</td>
      </tr>
    `;
    return;
  }
  target.innerHTML = summary
    .map(
      (row) => `
        <tr>
          <td>${sanitize(row.tenantName)}</td>
          <td>${row.expensesCount}</td>
          <td>${formatCurrency(row.expensesAmount)}</td>
          <td>${row.paymentsCount}</td>
          <td>${formatCurrency(row.paymentsAmount)}</td>
        </tr>
      `
    )
    .join("");
}

function getActiveExpenseType() {
  const value = EXPENSE_TYPE_MAP[state.expensesCategory];
  if (!value || value === "all") {
    return null;
  }
  return value;
}

function getExpenseCategoryFromTypeValue(value) {
  if (value === "all") return "all";
  return (
    Object.keys(EXPENSE_TYPE_MAP).find(
      (key) => key !== "all" && EXPENSE_TYPE_MAP[key] === value
    ) || null
  );
}

function translateUI() {
  const dictionary = translations[state.language] || translations.en || {};
  const currentLang = state.language || "en";
  
  document
    .querySelectorAll("[data-i18n]")
    .forEach((node) => {
      const key = node.dataset.i18n;
      if (key && dictionary[key]) {
        if (node.tagName === "OPTION") {
          // For option elements, check if there's a language-specific attribute
          const langKey = currentLang === "sq" ? "data-i18n-sq" : "data-i18n-en";
          const langText = node.getAttribute(langKey);
          if (langText) {
            node.textContent = langText;
          } else {
            node.textContent = dictionary[key] || node.textContent;
          }
        } else {
          // Only update if we have a valid translation
          const translation = dictionary[key];
          if (translation && translation !== key) {
            node.textContent = translation;
          }
        }
      }
    });
  document.title = dictionary.appTitle;
  
  // Update features select options
  const featuresSelect = document.getElementById("apartmentFeatures");
  if (featuresSelect) {
    Array.from(featuresSelect.options).forEach(option => {
      const langKey = currentLang === "sq" ? "data-i18n-sq" : "data-i18n-en";
      const langText = option.getAttribute(langKey);
      if (langText) {
        option.textContent = langText;
      }
    });
  }
  
  // Update feature buttons text
  const featuresButtons = document.querySelectorAll('.feature-button');
  featuresButtons.forEach(button => {
    const langKey = currentLang === "sq" ? "data-i18n-sq" : "data-i18n-en";
    const langText = button.getAttribute(langKey);
    if (langText) {
      button.textContent = langText;
    }
  });
  
  // Update municipality options
  const municipalitySelect = document.getElementById("apartmentMunicipality");
  if (municipalitySelect) {
    Array.from(municipalitySelect.options).forEach(option => {
      const key = option.getAttribute("data-i18n");
      if (key && dictionary[key]) {
        option.textContent = dictionary[key];
      }
    });
  }
  
  // Only render apartments table if contracts are loaded (for accurate status)
  if (state.contractsLoaded) {
    renderApartmentsTable();
  }
  renderTenantsTable();
  renderContractsTable();
  renderDebtsTable();
  renderPaymentsTable();
  populateApartmentSelects();
  populateTenantSelects();
  populateContractSelects();
  populateDebtSelects();
  
  // Update top nav active state
  updateTopNavActive();
  populateTenantSelector();
  populateGlobalContractFilter();
  // Always re-render tenant view if tenant is selected, regardless of which view is active
  // This ensures translations work when language is changed while viewing tenant data
  if (state.selectedTenantId) {
    // Re-render all tenant view content with new language
    // This will use translate() which reads from state.language (already updated above)
    // The translate() function will automatically use the new language
    loadTenantView();
  }
  // Re-translate any data-i18n elements in tenant view after re-rendering
  // Do this after loadTenantView to ensure all elements exist
  // This handles static HTML elements that have data-i18n attributes
  if (elements.tenantView) {
    elements.tenantView
      .querySelectorAll("[data-i18n]")
      .forEach((node) => {
        const key = node.dataset.i18n;
        if (key && dictionary[key]) {
          node.textContent = dictionary[key];
        }
      });
    // Also translate option elements in selects within tenant view
    elements.tenantView
      .querySelectorAll("select option[data-i18n]")
      .forEach((node) => {
        const key = node.dataset.i18n;
        if (key && dictionary[key]) {
          node.textContent = dictionary[key];
        }
      });
  }
  updateExpensesHeading();
  updateExpenseFormTypeLock();
  updateAdminNavActive(state.adminPage, state.expensesCategory);
  updateExpenseFormModeUI();
  refreshTenantSummaries();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  handleDebtTypeChange();
  renderAdminSummary();
}

function translate(key) {
  return (
    (translations[state.language] && translations[state.language][key]) ||
    translations.en[key] ||
    key
  );
}

// Setup feature buttons functionality
function setupFeatureButtons() {
  const featuresButtonsContainer = document.getElementById("apartmentFeaturesButtons");
  const featuresSelect = document.getElementById("apartmentFeatures");
  
  if (!featuresButtonsContainer || !featuresSelect) return;
  
  // Add click handlers to all feature buttons
  featuresButtonsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("feature-button")) {
      const button = e.target;
      const featureValue = button.getAttribute("data-feature");
      
      // Toggle button selected state
      button.classList.toggle("selected");
      
      // Sync with hidden select
      const option = Array.from(featuresSelect.options).find(opt => opt.value === featureValue);
      if (option) {
        option.selected = button.classList.contains("selected");
      }
    }
  });
}

// Sync feature buttons state to hidden select (useful before form submission)
function syncFeatureButtonsToSelect() {
  const featuresButtonsContainer = document.getElementById("apartmentFeaturesButtons");
  const featuresSelect = document.getElementById("apartmentFeatures");
  
  if (!featuresButtonsContainer || !featuresSelect) return;
  
  // First, deselect all options
  Array.from(featuresSelect.options).forEach(option => {
    option.selected = false;
  });
  
  // Then, select options based on button states
  const selectedButtons = featuresButtonsContainer.querySelectorAll('.feature-button.selected');
  selectedButtons.forEach(button => {
    const featureValue = button.getAttribute("data-feature");
    const option = Array.from(featuresSelect.options).find(opt => opt.value === featureValue);
    if (option) {
      option.selected = true;
    }
  });
}

async function loadInitialData() {
  // Check if statistics animation has already been shown in this session
  const hasSeenAnimation = sessionStorage.getItem('statisticsAnimationShown') === 'true';
  
  if (!hasSeenAnimation) {
    // Hide all admin pages initially, show only statistics
    hideAllAdminPages();
    
    // Set flag to prevent renderAdminSummary calls during initial load
    state.isInitialLoad = true;
  }
  
  await Promise.all([
    loadApartments(),
    loadTenants(),
    loadContracts(),
    loadDebts(),
    loadPayments(),
    loadUtilityBills(),
    loadUtilityPayments(),
    loadRequests(),
  ]);
  
  // Ensure apartments table is rendered after all data is loaded
  // This handles the case where apartments finished loading before contracts
  if (state.apartments && state.apartments.length >= 0 && state.contractsLoaded) {
    renderApartmentsTable();
  }
  
  populateTenantSelector();
  
  if (!hasSeenAnimation) {
    // Render statistics with animation (this replaces all the individual renderAdminSummary calls)
    await renderAdminSummaryWithAnimation();
    
    // Mark that animation has been shown in this session
    sessionStorage.setItem('statisticsAnimationShown', 'true');
    
    // Clear the flag
    state.isInitialLoad = false;
    
    // After animation completes, show the rest of the pages
    setTimeout(() => {
      showAllAdminPages();
    }, 2500); // Wait for animation to complete (2000ms animation + 500ms buffer)
  } else {
    // Animation already shown, just render normally and show pages immediately
    state.isInitialLoad = false;
    renderAdminSummary();
    showAllAdminPages();
  }
}

function hideAllAdminPages() {
  // Hide all admin pages except statistics
  const adminPages = document.querySelectorAll('.admin-page');
  adminPages.forEach(page => {
    page.style.display = 'none';
  });
  
  // Hide admin nav initially
  if (elements.adminNav) {
    elements.adminNav.style.display = 'none';
  }
}

function showAllAdminPages() {
  // Show admin nav
  if (elements.adminNav) {
    elements.adminNav.style.display = '';
  }
  
  // Show the active page
  setAdminPage(state.adminPage, state.expensesCategory);
}

function animateCounter(element, start, end, duration = 2000, formatter = null) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const range = end - start;
    
    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + range * easeOutQuart);
      
      if (formatter) {
        element.textContent = formatter(current);
      } else {
        element.textContent = formatNumber(current);
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        // Ensure final value is set
        if (formatter) {
          element.textContent = formatter(end);
        } else {
          element.textContent = formatNumber(end);
        }
        resolve();
      }
    };
    
    requestAnimationFrame(updateCounter);
  });
}

function animateCurrencyCounter(element, start, end, duration = 2000) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const range = end - start;
    
    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = start + range * easeOutQuart;
      
      element.textContent = formatCurrency(current);
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        // Ensure final value is set
        element.textContent = formatCurrency(end);
        resolve();
      }
    };
    
    requestAnimationFrame(updateCounter);
  });
}

async function loadApartments() {
  if (!state.currentUser) {
    state.apartments = [];
    // Only render if contracts are loaded (or if no contracts exist)
    if (state.contractsLoaded || state.contracts.length === 0) {
      renderApartmentsTable();
    }
    populateApartmentSelects();
    return;
  }
  
  const { data, error } = await supabase
    .from("apartments")
    .select(
      "id, name, address, electricity_code, heating_code, water_code, waste_code, photos"
    )
    .eq("landlord_id", state.currentUser.id) // Filter by current user
    .order("created_at", { ascending: false });

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("loadApartments", error);
    return;
  }

  state.apartments = data || [];
  // Don't render yet - wait for contracts to load first for accurate status
  populateApartmentSelects();
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
  
  // Render apartments table if contracts are already loaded
  if (state.contractsLoaded) {
    renderApartmentsTable();
  }
}

async function loadTenants() {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, full_name, email, phone, entry_date")
    .order("full_name");

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("loadTenants", error);
    return;
  }

  state.tenants = data || [];
  renderTenantsTable();
  populateTenantSelects();
  populateTenantSelector();
  populateGlobalContractFilter();
  refreshTenantSummaries();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadContracts() {
  if (!state.currentUser) {
    state.contracts = [];
    renderContractsTable();
    populateContractSelects();
    populateGlobalContractFilter();
    return;
  }
  
  // First, get all apartment IDs for this landlord
  const { data: landlordApartments, error: apartmentError } = await supabase
    .from("apartments")
    .select("id")
    .eq("landlord_id", state.currentUser.id);
  
  if (apartmentError || !landlordApartments || landlordApartments.length === 0) {
    // No apartments for this landlord, clear contracts
    state.contracts = [];
    renderContractsTable();
    populateContractSelects();
    populateGlobalContractFilter();
    return;
  }
  
  const apartmentIds = landlordApartments.map(a => a.id);
  
  // Filter contracts by apartment IDs
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id, apartment_id, tenant_id, start_date, end_date, monthly_rent, monthly_garbage, monthly_maintenance, deposit_amount, is_active"
    )
    .in("apartment_id", apartmentIds)
    .order("start_date", { ascending: false });

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("loadContracts", error);
    return;
  }

  state.contracts = data || [];
  state.contractsLoaded = true;
  renderContractsTable();
  populateContractSelects();
  populateGlobalContractFilter();
  updateFormContractLock();
  handleDebtContractChange();
  maybeEnsureRecurringDebts();
  
  // Now render apartments table with accurate contract status
  if (state.apartments && state.apartments.length > 0) {
    renderApartmentsTable();
  }
  
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadDebts() {
  // Load from all split bill tables
  await loadAllBills();
  
  // Combine all bills into state.debts for backward compatibility
  state.debts = [
    ...state.rentBills.map(b => ({ ...b, type: "rent", due_date: b.bill_date || b.due_date })),
    ...state.garbageBills.map(b => ({ ...b, type: "garbage", due_date: b.bill_date || b.due_date })),
    ...state.maintenanceBills.map(b => ({ ...b, type: "maintenance", due_date: b.bill_date || b.due_date })),
    ...state.electricityBills.map(b => ({ ...b, type: "electricity", due_date: b.bill_date, is_paid: false })),
    ...state.waterBills.map(b => ({ ...b, type: "water", due_date: b.bill_date, is_paid: false })),
    ...state.heatingBills.map(b => ({ ...b, type: "thermos", due_date: b.bill_date, is_paid: false })),
  ];
  
  renderDebtsTable();
  populateDebtSelects();

  if (state.selectedTenantId) {
    renderTenantDebts();
  }
  refreshTenantSummaries();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  renderOpenExpensesTable();
  state.debtsLoaded = true;
  maybeEnsureRecurringDebts();
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadAllBills() {
  if (!state.currentUser) {
    // Clear all bills if no user
    const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
    for (const type of types) {
      const stateKey = EXPENSE_STATE_KEYS[type];
      state[stateKey.bills] = [];
    }
    return;
  }
  
  // First, get all apartment IDs for this landlord
  const { data: landlordApartments, error: apartmentError } = await supabase
    .from("apartments")
    .select("id")
    .eq("landlord_id", state.currentUser.id);
  
  if (apartmentError || !landlordApartments || landlordApartments.length === 0) {
    // No apartments for this landlord, clear all bills
    const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
    for (const type of types) {
      const stateKey = EXPENSE_STATE_KEYS[type];
      state[stateKey.bills] = [];
    }
    return;
  }
  
  const apartmentIds = landlordApartments.map(a => a.id);
  
  // Then get all contract IDs for those apartments
  const { data: landlordContracts, error: contractError } = await supabase
    .from("contracts")
    .select("id")
    .in("apartment_id", apartmentIds);
  
  if (contractError || !landlordContracts || landlordContracts.length === 0) {
    // No contracts for this landlord, clear all bills
    const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
    for (const type of types) {
      const stateKey = EXPENSE_STATE_KEYS[type];
      state[stateKey.bills] = [];
    }
    return;
  }
  
  const contractIds = landlordContracts.map(c => c.id);
  
  const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
  
  // Execute all queries in parallel for better performance
  const queryPromises = types.map(async (type) => {
    const tableInfo = EXPENSE_TABLES[type];
    const stateKey = EXPENSE_STATE_KEYS[type];
    
    const selectFields = tableInfo.hasStatus
      ? "id, tenant_id, contract_id, amount, bill_date, due_date, is_paid, notes, reference"
      : "id, tenant_id, contract_id, amount, bill_date, notes, reference";
    
    const { data, error } = await supabase
      .from(tableInfo.bills)
      .select(selectFields)
      .in("contract_id", contractIds)
      .order("bill_date", { ascending: false });

    if (error) {
      console.error(`Error loading ${type} bills:`, error);
      return { type, stateKey, data: [] };
    } else {
      return { type, stateKey, data: data || [] };
    }
  });
  
  // Wait for all queries to complete
  const results = await Promise.all(queryPromises);
  
  // Update state with results
  results.forEach(({ stateKey, data }) => {
    state[stateKey.bills] = data;
  });
}

async function loadPayments() {
  // Load from all split payment tables
  await loadAllPayments();
  
  // Combine all payments into state.payments for backward compatibility
  state.payments = [
    ...state.rentPayments.map(p => ({ ...p, type: "rent" })),
    ...state.garbagePayments.map(p => ({ ...p, type: "garbage" })),
    ...state.maintenancePayments.map(p => ({ ...p, type: "maintenance" })),
    ...state.electricityPayments.map(p => ({ ...p, type: "electricity" })),
    ...state.waterPayments.map(p => ({ ...p, type: "water" })),
    ...state.heatingPayments.map(p => ({ ...p, type: "thermos" })),
  ];

  renderPaymentsTable();

  if (state.selectedTenantId) {
    renderTenantPayments();
  }
  refreshTenantSummaries();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  renderOpenExpensesTable();
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadAllPayments() {
  if (!state.currentUser) {
    // Clear all payments if no user
    const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
    for (const type of types) {
      const stateKey = EXPENSE_STATE_KEYS[type];
      state[stateKey.payments] = [];
    }
    return;
  }
  
  // First, get all apartment IDs for this landlord
  const { data: landlordApartments, error: apartmentError } = await supabase
    .from("apartments")
    .select("id")
    .eq("landlord_id", state.currentUser.id);
  
  if (apartmentError || !landlordApartments || landlordApartments.length === 0) {
    // No apartments for this landlord, clear all payments
    const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
    for (const type of types) {
      const stateKey = EXPENSE_STATE_KEYS[type];
      state[stateKey.payments] = [];
    }
    return;
  }
  
  const apartmentIds = landlordApartments.map(a => a.id);
  
  // Then get all contract IDs for those apartments
  const { data: landlordContracts, error: contractError } = await supabase
    .from("contracts")
    .select("id")
    .in("apartment_id", apartmentIds);
  
  if (contractError || !landlordContracts || landlordContracts.length === 0) {
    // No contracts for this landlord, clear all payments
    const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
    for (const type of types) {
      const stateKey = EXPENSE_STATE_KEYS[type];
      state[stateKey.payments] = [];
    }
    return;
  }
  
  const contractIds = landlordContracts.map(c => c.id);
  
  const types = ["rent", "garbage", "maintenance", "electricity", "water", "thermos"];
  
  // Execute all queries in parallel for better performance
  const queryPromises = types.map(async (type) => {
    const tableInfo = EXPENSE_TABLES[type];
    const stateKey = EXPENSE_STATE_KEYS[type];
    
    const { data, error } = await supabase
      .from(tableInfo.payments)
      .select("id, tenant_id, contract_id, bill_id, amount, payment_date, method")
      .in("contract_id", contractIds)
      .order("payment_date", { ascending: false });
    
    if (error) {
      console.error(`Error loading ${type} payments:`, error);
      return { stateKey, data: [] };
    } else {
      // Map bill_id to debt_id for compatibility with render functions
      return { stateKey, data: (data || []).map(p => ({ ...p, debt_id: p.bill_id })) };
    }
  });
  
  // Wait for all queries to complete
  const results = await Promise.all(queryPromises);
  
  // Update state with results
  results.forEach(({ stateKey, data }) => {
    state[stateKey.payments] = data;
  });
}

// Legacy functions - now handled by loadDebts() and loadPayments()
async function loadUtilityBills() {
  // Now handled by loadDebts() which loads from all split tables
}

async function loadUtilityPayments() {
  // Now handled by loadPayments() which loads from all split tables
}

async function loadRequests() {
  if (!state.currentUser || !elements.requestsTableBody) return;

  // Get all apartment IDs for this landlord
  const { data: landlordApartments, error: apartmentError } = await supabase
    .from("apartments")
    .select("id")
    .eq("landlord_id", state.currentUser.id);

  if (apartmentError || !landlordApartments || landlordApartments.length === 0) {
    if (elements.requestsTableBody) {
      elements.requestsTableBody.innerHTML = "<tr><td colspan='7'>No requests</td></tr>";
    }
    return;
  }

  const apartmentIds = landlordApartments.map(a => a.id);

  // Load requests for landlord's apartments
  const { data: requests, error } = await supabase
    .from("apartment_requests")
    .select("id, apartment_id, tenant_id, request_type, message, status, created_at")
    .in("apartment_id", apartmentIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadRequests", error);
    if (elements.requestsTableBody) {
      elements.requestsTableBody.innerHTML = "<tr><td colspan='7'>Error loading requests</td></tr>";
    }
    return;
  }

  if (!requests || requests.length === 0) {
    if (elements.requestsTableBody) {
      elements.requestsTableBody.innerHTML = "<tr><td colspan='7'>No requests</td></tr>";
    }
    return;
  }

  // Get apartment and tenant details
  const apartmentIdsInRequests = [...new Set(requests.map(r => r.apartment_id))];
  const tenantIdsInRequests = [...new Set(requests.map(r => r.tenant_id))];

  const { data: apartments } = await supabase
    .from("apartments")
    .select("id, name")
    .in("id", apartmentIdsInRequests);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, full_name, email, phone")
    .in("id", tenantIdsInRequests);

  const apartmentsMap = {};
  apartments?.forEach(apt => { apartmentsMap[apt.id] = apt; });
  const tenantsMap = {};
  tenants?.forEach(tenant => { tenantsMap[tenant.id] = tenant; });

  // Render requests table
  if (elements.requestsTableBody) {
    elements.requestsTableBody.innerHTML = requests
      .map(request => {
        const apartment = apartmentsMap[request.apartment_id];
        const tenant = tenantsMap[request.tenant_id];
        const requestTypeText = request.request_type === "contract" 
          ? (translate("requestTypeContract") || "Contract Request")
          : (translate("requestTypeViewing") || "Viewing Request");
        const statusText = request.status === "pending"
          ? (translate("requestStatusPending") || "Pending")
          : request.status === "accepted"
          ? (translate("requestStatusAccepted") || "Accepted")
          : (translate("requestStatusRejected") || "Rejected");
        const statusClass = request.status === "pending" ? "pending" : request.status === "accepted" ? "accepted" : "rejected";

        return `
          <tr>
            <td data-label="Apartment">${sanitize(apartment?.name || translate("unknown"))}</td>
            <td data-label="Tenant">${sanitize(tenant?.full_name || translate("unknown"))}</td>
            <td data-label="Type">${requestTypeText}</td>
            <td data-label="Message">${sanitize(request.message || "-")}</td>
            <td data-label="Date">${formatDate(request.created_at)}</td>
            <td data-label="Status"><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td data-label="Actions">
              ${request.status === "pending" ? `
                <button type="button" class="button-primary button-small" data-action="accept-request" data-id="${request.id}" data-apartment-id="${request.apartment_id}" data-tenant-id="${request.tenant_id}" data-request-type="${request.request_type}">
                  ${translate("accept") || "Accept"}
                </button>
                <button type="button" class="button-secondary button-small" data-action="reject-request" data-id="${request.id}">
                  ${translate("reject") || "Reject"}
                </button>
              ` : ""}
            </td>
          </tr>
        `;
      })
      .join("");

    // Add event listeners for accept/reject buttons
    elements.requestsTableBody.querySelectorAll("[data-action='accept-request']").forEach(btn => {
      btn.addEventListener("click", () => handleAcceptRequest(btn.dataset.id, btn.dataset.apartmentId, btn.dataset.tenantId, btn.dataset.requestType));
    });
    elements.requestsTableBody.querySelectorAll("[data-action='reject-request']").forEach(btn => {
      btn.addEventListener("click", () => handleRejectRequest(btn.dataset.id));
    });
  }
}

async function handleAcceptRequest(requestId, apartmentId, tenantId, requestType) {
  if (!confirm(translate("confirmAcceptRequest") || "Are you sure you want to accept this request?")) {
    return;
  }

  // Update request status
  const { error: updateError } = await supabase
    .from("apartment_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);

  if (updateError) {
    notify("error", translate("errorLoad"));
    console.error("handleAcceptRequest", updateError);
    return;
  }

  // If it's a contract request, optionally create a contract
  if (requestType === "contract") {
    notify("info", translate("requestAcceptedCreateContract") || "Request accepted. You can now create a contract for this tenant.");
  } else {
    notify("success", translate("requestAccepted") || "Request accepted successfully!");
  }

  // Send notification (placeholder - you'll need to implement SMS/email)
  await sendRequestNotification(requestId, "accepted");

  await loadRequests();
}

async function handleRejectRequest(requestId) {
  if (!confirm(translate("confirmRejectRequest") || "Are you sure you want to reject this request?")) {
    return;
  }

  const { error } = await supabase
    .from("apartment_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleRejectRequest", error);
    return;
  }

  // Send notification (placeholder - you'll need to implement SMS/email)
  await sendRequestNotification(requestId, "rejected");

  notify("success", translate("requestRejected") || "Request rejected.");
  await loadRequests();
}

async function sendRequestNotification(requestId, status) {
  // Get request details
  const { data: request } = await supabase
    .from("apartment_requests")
    .select("tenant_id, apartment_id, request_type")
    .eq("id", requestId)
    .single();

  if (!request) return;

  // Get tenant details
  const { data: tenant } = await supabase
    .from("tenants")
    .select("email, phone")
    .eq("id", request.tenant_id)
    .single();

  if (!tenant) return;

  // Get apartment details
  const { data: apartment } = await supabase
    .from("apartments")
    .select("name")
    .eq("id", request.apartment_id)
    .single();

  // TODO: Implement actual SMS/Email sending
  // For now, just log it
  console.log(`Notification: Request ${status} for apartment ${apartment?.name || request.apartment_id}`);
  console.log(`Tenant: ${tenant.email}, Phone: ${tenant.phone || "N/A"}`);
  
  // You can integrate with services like:
  // - Twilio for SMS
  // - SendGrid, Mailgun, or Supabase Edge Functions for Email
  // - Or use Supabase's built-in email functionality
}

function renderApartmentsTable() {
  // Pre-compute a Set of apartment IDs with active contracts for O(1) lookup
  // Convert to strings to match equalsId behavior
  const apartmentsWithActiveContracts = new Set(
    state.contracts
      .filter(c => c.is_active && c.apartment_id != null)
      .map(c => String(c.apartment_id))
  );
  
  elements.apartmentsTableBody.innerHTML = state.apartments
    .map(
      (apartment) => {
        // Check if apartment has an active contract using Set lookup (O(1))
        // Convert to string to match Set keys
        const hasActiveContract = apartmentsWithActiveContracts.has(String(apartment.id));
        const statusClass = hasActiveContract ? "" : "view-active";
        const statusText = hasActiveContract 
          ? translate("apartmentOccupied") || "Occupied" 
          : translate("apartmentAvailable") || "Available";
        
        // Parse photos (comma-separated URLs or JSON array)
        let photos = [];
        if (apartment.photos) {
          try {
            photos = typeof apartment.photos === 'string' 
              ? (apartment.photos.startsWith('[') ? JSON.parse(apartment.photos) : apartment.photos.split(',').map(p => p.trim()))
              : apartment.photos;
          } catch (e) {
            photos = apartment.photos.split(',').map(p => p.trim());
          }
        }
        const firstPhoto = photos.length > 0 ? photos[0] : null;
        
        return `
      <tr class="${statusClass}">
        <td data-label="Photo">
          ${firstPhoto 
            ? `<img src="${sanitize(firstPhoto)}" alt="${sanitize(apartment.name)}" class="apartment-photo-thumbnail" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer;" onerror="this.style.display='none'" data-apartment-id="${apartment.id}">`
            : '<span style="color: #999;">No photo</span>'
          }
        </td>
        <td data-label="Name">${sanitize(apartment.name)}</td>
        <td data-label="Address">${sanitize(apartment.address || "")}</td>
        <td data-label="Electricity Code">${sanitize(apartment.electricity_code || "")}</td>
        <td data-label="Heating Code">${sanitize(apartment.heating_code || "")}</td>
        <td data-label="Water Code">${sanitize(apartment.water_code || "")}</td>
        <td data-label="Waste Code">${sanitize(apartment.waste_code || "")}</td>
        <td data-label="Status"><span class="status-badge ${hasActiveContract ? 'occupied' : 'available'}">${statusText}</span></td>
        <td data-label="Actions">
          <div class="actions-group">
            <button type="button" class="button-secondary button-small" data-action="edit-apartment" data-id="${apartment.id}">
              ${translate("edit") || "Edit"}
            </button>
            <button type="button" class="button-danger button-small" data-action="delete-apartment" data-id="${apartment.id}">
              ${translate("delete") || "Delete"}
            </button>
          </div>
        </td>
        <td data-label="ID">${apartment.id}</td>
      </tr>
    `;
      }
    )
    .join("");
  
  // Add event listeners for edit and delete buttons
  elements.apartmentsTableBody.querySelectorAll("[data-action='edit-apartment']").forEach(btn => {
    btn.addEventListener("click", () => editApartment(btn.dataset.id));
  });
  elements.apartmentsTableBody.querySelectorAll("[data-action='delete-apartment']").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteApartment(btn.dataset.id));
  });
  
  // Add event listeners for photo thumbnails
  elements.apartmentsTableBody.querySelectorAll(".apartment-photo-thumbnail").forEach(img => {
    img.addEventListener("click", () => {
      const apartmentId = img.getAttribute("data-apartment-id");
      if (!apartmentId) return;
      
      // Get photos from apartment data in state
      const apartment = state.apartments.find(a => equalsId(a.id, apartmentId));
      if (!apartment) return;
      
      // Parse photos from apartment
      let photos = [];
      if (apartment.photos) {
        try {
          photos = typeof apartment.photos === 'string' 
            ? (apartment.photos.startsWith('[') ? JSON.parse(apartment.photos) : apartment.photos.split(',').map(p => p.trim()))
            : apartment.photos;
        } catch (e) {
          console.error("Error parsing apartment photos:", e);
          // Try comma-separated fallback
          photos = apartment.photos.split(',').map(p => p.trim()).filter(p => p.length > 0);
        }
      }
      
      if (photos.length > 0 && window.openPhotoViewer) {
        window.openPhotoViewer(photos, 0);
      }
    });
  });
}

function renderTenantsTable() {
  elements.tenantsTableBody.innerHTML = state.tenants
    .map(
      (tenant) => `
      <tr>
        <td data-label="Full Name">${sanitize(tenant.full_name)}</td>
        <td data-label="Email">${sanitize(tenant.email || "")}</td>
        <td data-label="Phone">${sanitize(tenant.phone || "")}</td>
        <td data-label="ID">${tenant.id}</td>
      </tr>
    `
    )
    .join("");
}

function renderContractsTable() {
  const activeContracts = state.contracts.filter((c) => !!c.is_active);
  const inactiveContracts = state.contracts.filter((c) => !c.is_active);

  const buildRow = (contract) => {
    const apartment = state.apartments.find((a) =>
      equalsId(a.id, contract.apartment_id)
    );
    const tenant = state.tenants.find((t) => equalsId(t.id, contract.tenant_id));
    const isActive = !!contract.is_active;
    const actionLabel = isActive
      ? translate("contractDeactivate")
      : translate("contractActivate");
    const actionType = isActive ? "deactivate" : "activate";
    return `
      <tr>
        <td data-label="Apartment">${sanitize(apartment?.name || translate("unknown"))}</td>
        <td data-label="Tenant">${sanitize(tenant?.full_name || translate("unknown"))}</td>
        <td data-label="Start Date">${formatDate(contract.start_date)}</td>
        <td data-label="End Date">${formatDate(contract.end_date)}</td>
        <td data-label="Monthly Rent">${formatCurrency(contract.monthly_rent)}</td>
        <td data-label="Monthly Garbage">${formatCurrency(contract.monthly_garbage)}</td>
        <td data-label="Monthly Maintenance">${formatCurrency(contract.monthly_maintenance)}</td>
        <td data-label="Deposit">${formatCurrency(contract.deposit_amount)}</td>
        <td data-label="Active">${contract.is_active ? translate("yes") : translate("no")}</td>
        <td data-label="Actions">
          <div class="actions-group">
            <button
              type="button"
              data-action="${actionType}-contract"
              data-id="${contract.id}"
            >
              ${actionLabel}
            </button>
          </div>
        </td>
      </tr>
    `;
  };

  const activeRows = activeContracts.map(buildRow);
  const inactiveRows = inactiveContracts.map(buildRow);

  if (elements.contractsActiveTableBody) {
    elements.contractsActiveTableBody.innerHTML = activeRows.join("");

    elements.contractsActiveTableBody
      .querySelectorAll("button[data-action='deactivate-contract']")
      .forEach((button) =>
        button.addEventListener("click", () =>
          handleContractStatusChange(button.dataset.id, false)
        )
      );

    elements.contractsActiveTableBody
      .querySelectorAll("button[data-action='activate-contract']")
      .forEach((button) =>
        button.addEventListener("click", () =>
          handleContractStatusChange(button.dataset.id, true)
        )
      );
  }

  if (elements.contractsInactiveTableBody) {
    elements.contractsInactiveTableBody.innerHTML = inactiveRows.join("");

    elements.contractsInactiveTableBody
      .querySelectorAll("button[data-action='deactivate-contract']")
      .forEach((button) =>
        button.addEventListener("click", () =>
          handleContractStatusChange(button.dataset.id, false)
        )
      );

    elements.contractsInactiveTableBody
      .querySelectorAll("button[data-action='activate-contract']")
      .forEach((button) =>
        button.addEventListener("click", () =>
          handleContractStatusChange(button.dataset.id, true)
        )
      );
  }
}

async function handleContractStatusChange(contractId, shouldActivate) {
  if (!contractId) return;
  const contract = state.contracts.find((c) => equalsId(c.id, contractId));
  if (!contract) return;

  if (!shouldActivate) {
    const hasUnpaidExpenses = (state.debts || []).some(
      (debt) => equalsId(debt.contract_id, contractId) && !debt.is_paid
    );
    if (hasUnpaidExpenses) {
      notify("error", translate("contractDeactivateBlocked"));
      return;
    }
  }

  const { error } = await supabase
    .from("contracts")
    .update({ is_active: shouldActivate })
    .eq("id", contractId);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleContractStatusChange", error);
    return;
  }

  notify(
    "success",
    translate(shouldActivate ? "successContractActivate" : "successContractDeactivate")
  );
  await loadContracts();
}

function getDebtPaymentSummary(debtId) {
  const debt = state.debts.find((d) => equalsId(d.id, debtId));
  if (!debt) return { totalPaid: 0, debtAmount: 0, remaining: 0 };

  const debtPayments = (state.payments || []).filter(
    (p) => equalsId(p.debt_id, debtId)
  );
  const totalPaid = debtPayments.reduce(
    (sum, payment) => sum + normalizeCurrency(payment.amount),
    0
  );
  const debtAmount = normalizeCurrency(debt.amount);
  const remaining = normalizeCurrency(debtAmount - totalPaid);

  return {
    totalPaid,
    debtAmount,
    remaining: Math.abs(remaining) < 0.001 ? null : remaining, // null means exactly paid, negative means overpaid
  };
}

function renderTotalPaymentSummary(summary) {
  const summaryElement = document.getElementById("totalPaymentSummary");
  if (!summaryElement) return;

  const totalPaidEl = document.getElementById("totalPaidAmount");
  const totalDebtEl = document.getElementById("totalDebtAmount");
  const totalRemainingEl = document.getElementById("totalRemainingAmount");

  if (totalPaidEl) {
    totalPaidEl.textContent = formatCurrency(summary.totalPaid);
  }
  if (totalDebtEl) {
    totalDebtEl.textContent = formatCurrency(summary.totalDebt);
  }
  if (totalRemainingEl) {
    if (summary.totalRemaining === null) {
      totalRemainingEl.textContent = "-";
      totalRemainingEl.classList.add("payment-summary-paid");
      totalRemainingEl.classList.remove("payment-summary-credit");
    } else if (summary.totalRemaining < 0) {
      // Overpaid - show as credit
      totalRemainingEl.textContent = `-${formatCurrency(Math.abs(summary.totalRemaining))}`;
      totalRemainingEl.classList.add("payment-summary-credit");
      totalRemainingEl.classList.remove("payment-summary-paid");
    } else {
      totalRemainingEl.textContent = formatCurrency(summary.totalRemaining);
      totalRemainingEl.classList.remove("payment-summary-paid");
      totalRemainingEl.classList.remove("payment-summary-credit");
    }
  }

  // Show the summary panel only if there are filtered debts
  const hasFilteredDebts = summary.totalDebt > 0;
  summaryElement.style.display = hasFilteredDebts ? "block" : "none";
}

function renderDebtsTable() {
  const statusFilter = elements.debtsFilterStatus.value;
  const typeFilter = elements.debtsFilterType.value;
  const today = new Date().toISOString().slice(0, 10);

  // Apply global tenant filter first
  const debtsToFilter = getFilteredDebts();
  
  const filtered = debtsToFilter.filter((debt) => {
    const isPaid = !!debt.is_paid;
    const isOverdue = !isPaid && debt.due_date && debt.due_date < today;

    // Skip status filter for utility types (electricity, water, heating)
    if (!isUtilityType(debt.type)) {
    if (statusFilter === "paid" && !isPaid) return false;
    if (statusFilter === "open_overdue" && isPaid) return false;
    }
    if (typeFilter !== "all" && debt.type !== typeFilter) return false;
    return true;
  });

  // Calculate total payment summary for all filtered debts
  const totalPaymentSummary = filtered.reduce((summary, debt) => {
    const debtSummary = getDebtPaymentSummary(debt.id);
    summary.totalPaid += debtSummary.totalPaid;
    summary.totalDebt += debtSummary.debtAmount;
    return summary;
  }, { totalPaid: 0, totalDebt: 0 });
  
  const totalRemaining = normalizeCurrency(totalPaymentSummary.totalDebt - totalPaymentSummary.totalPaid);
  totalPaymentSummary.totalRemaining = Math.abs(totalRemaining) < 0.001 ? null : totalRemaining;

  // Render total payment summary
  renderTotalPaymentSummary(totalPaymentSummary);

  // Hide/show status header based on utility type filter
  const activeType = getActiveExpenseType();
  const isUtilityView = activeType && isUtilityType(activeType);
  const statusHeader = document.querySelector('#debtsTableBody')?.closest('table')?.querySelector('th[data-i18n="status"]');
  if (statusHeader) {
    statusHeader.style.display = isUtilityView ? 'none' : '';
  }

  elements.debtsTableBody.innerHTML = filtered
    .map((debt) => {
      const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
      const status = getDebtStatus(debt);
      const typeLabel = getDebtTypeLabel(debt);
      const isEditing = state.editingDebtId && equalsId(state.editingDebtId, debt.id);

      if (isEditing) {
        // Render editable row
        const amountValue = normalizeCurrency(debt.amount).toFixed(2);
        const dueDateValue = debt.due_date || "";
        const notesValue = stripElectricityCutMarker(debt.notes || "").replace(/"/g, "&quot;");
        const isUtilityEdit = isUtilityType(debt.type);
        
        // Build type options
        const typeOptions = [
          { value: "rent", label: translate("debtRent") || "Rent" },
          { value: "maintenance", label: translate("debtMaintenance") || "Maintenance" },
          { value: "garbage", label: translate("debtGarbage") || "Garbage" },
          { value: "thermos", label: translate("debtThermos") || "Thermos" },
          { value: "electricity", label: translate("debtElectricity") || "Electricity" },
          { value: "water", label: translate("debtWater") || "Water" },
          { value: "damage", label: translate("debtDamage") || "Damage" },
          { value: "other", label: translate("debtOther") || "Other" },
        ].map(opt => 
          `<option value="${opt.value}" ${debt.type === opt.value ? "selected" : ""}>${sanitize(opt.label)}</option>`
        ).join("");

        return `
          <tr class="editing-row">
            <td>${sanitize(tenant?.full_name || translate("unknown"))}</td>
            <td>
              <select class="inline-edit-input" data-field="type" required>
                ${typeOptions}
              </select>
            </td>
            <td>
              <input 
                type="number" 
                class="inline-edit-input" 
                data-field="amount" 
                value="${amountValue}" 
                min="0" 
                step="0.01" 
                required
              />
            </td>
            <td>
              <input 
                type="date" 
                class="inline-edit-input" 
                data-field="due_date" 
                value="${dueDateValue}" 
                required
              />
            </td>
            ${isUtilityEdit ? "" : `<td><span class="tag ${status.class}">${status.label}</span></td>`}
            <td>${sanitize(formatReferenceForDisplay(debt.reference))}</td>
            <td>
              <input 
                type="text" 
                class="inline-edit-input" 
                data-field="notes" 
                value="${notesValue}" 
                placeholder="${translate("notes") || "Notes"}"
              />
            </td>
            <td>
              <div class="actions-group">
                <button type="button" class="button-primary" data-action="save-debt" data-id="${debt.id}">
                  ${translate("save") || "Save"}
                </button>
                <button type="button" class="button-muted" data-action="cancel-edit-debt" data-id="${debt.id}">
                  ${translate("cancelEdit") || "Cancel"}
                </button>
              </div>
            </td>
          </tr>
        `;
      }

      // Render normal row
      const showMarkPaid = !isUtilityType(debt.type);
      const isUtility = isUtilityType(debt.type);
      return `
        <tr>
          <td>${sanitize(tenant?.full_name || translate("unknown"))}</td>
          <td>${sanitize(typeLabel)}</td>
          <td>${formatCurrency(debt.amount)}</td>
          <td>${formatDate(debt.due_date)}</td>
          ${isUtility ? "" : `<td><span class="tag ${status.class}">${status.label}</span></td>`}
          <td>${sanitize(formatReferenceForDisplay(debt.reference))}</td>
          <td>${sanitize(stripElectricityCutMarker(debt.notes || ""))}</td>
          <td>
            <div class="actions-group">
              <button type="button" class="button-secondary" data-action="edit-debt" data-id="${debt.id}">
                ${translate("edit")}
              </button>
              <button type="button" class="button-danger" data-action="delete-debt" data-id="${debt.id}">
                ${translate("delete")}
              </button>
              ${showMarkPaid ? `<button type="button" class="button-primary" data-action="mark-paid" data-id="${debt.id}" ${
        debt.is_paid ? "disabled" : ""
      }>
                ${translate("markPaid")}
              </button>` : ""}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
  
  // Render utility summary if viewing a utility type
  renderUtilitySummary();
}

function isUtilityType(type) {
  return UTILITY_TYPES.includes(type);
}

function renderUtilitySummary() {
  const activeType = getActiveExpenseType();
  const isUtility = activeType && isUtilityType(activeType);
  
  if (!elements.utilitySummarySection) return;
  
  // Show/hide utility summary based on type
  if (!isUtility) {
    elements.utilitySummarySection.style.display = "none";
    return;
  }
  
  elements.utilitySummarySection.style.display = "block";
  
  // Apply global tenant filter
  const filteredDebts = getFilteredDebts();
  const filteredPayments = getFilteredPayments();
  
  // Get utility bills from new table, fallback to debts table
  const utilityBillsFromNewTable = state.utilityBills.filter((b) => {
    if (b.type !== activeType) return false;
    if (state.globalContractFilter && !equalsId(b.contract_id, state.globalContractFilter)) return false;
    return true;
  });
  const utilityBillsFromDebts = filteredDebts.filter((d) => d.type === activeType);
  const utilityExpenses = utilityBillsFromNewTable.length > 0 
    ? utilityBillsFromNewTable.sort((a, b) => (a.bill_date || "").localeCompare(b.bill_date || ""))
    : utilityBillsFromDebts.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
  
  // Get utility payments - filter from state.payments which has type set
  const utilityPayments = filteredPayments.filter((p) => {
    // Check payment's own type first
    if (p.type === activeType) return true;
    // Fall back to checking linked debt
    const debt = state.debts.find((d) => equalsId(d.id, p.debt_id));
    return debt && debt.type === activeType;
  }).sort((a, b) => (a.payment_date || "").localeCompare(b.payment_date || ""));
  
  // Calculate totals
  const totalExpenses = utilityExpenses.reduce(
    (sum, d) => sum + normalizeCurrency(d.amount),
    0
  );
  const totalPayments = utilityPayments.reduce(
    (sum, p) => sum + normalizeCurrency(p.amount),
    0
  );
  const difference = normalizeCurrency(totalExpenses - totalPayments);
  
  // Update totals display
  if (elements.utilityTotalExpenses) {
    elements.utilityTotalExpenses.textContent = formatCurrency(totalExpenses);
  }
  if (elements.utilityTotalPayments) {
    elements.utilityTotalPayments.textContent = formatCurrency(totalPayments);
  }
  if (elements.utilityDifference) {
    if (Math.abs(difference) < 0.01) {
      elements.utilityDifference.textContent = "€0.00";
      elements.utilityDifference.className = "utility-summary-value zero";
    } else if (difference > 0) {
      // Owes money
      elements.utilityDifference.textContent = formatCurrency(difference);
      elements.utilityDifference.className = "utility-summary-value positive";
    } else {
      // Overpaid (credit)
      elements.utilityDifference.textContent = `-${formatCurrency(Math.abs(difference))}`;
      elements.utilityDifference.className = "utility-summary-value negative";
    }
  }
  
  // Render expenses table with columns: #, Tenant, Type, Amount, Due Date, Reference, Actions
  if (elements.utilityExpensesTableBody) {
    const typeLabel = translate(`debt${capitalize(activeType)}`) || activeType;
    elements.utilityExpensesTableBody.innerHTML = utilityExpenses
      .map((expense, index) => {
        const tenant = state.tenants.find((t) => equalsId(t.id, expense.tenant_id));
        const tenantName = tenant?.full_name || translate("unknown") || "Unknown";
        const billDate = expense.bill_date || expense.due_date || "";
        const reference = formatReferenceForDisplay(expense.reference) || "-";
        const isFromUtilityTable = !!expense.bill_date;
        const dataSource = isFromUtilityTable ? "utility_bills" : "debts";
        const isEditing = state.editingUtilityBillId && equalsId(state.editingUtilityBillId, expense.id);
        
        if (isEditing) {
          // Render editable row
          const amountValue = normalizeCurrency(expense.amount).toFixed(2);
          const dateValue = expense.bill_date || expense.due_date || "";
          return `
          <tr class="editing-row">
            <td>${index + 1}</td>
            <td>${sanitize(tenantName)}</td>
            <td>${sanitize(typeLabel)}</td>
            <td>
              <input type="number" class="inline-edit-input" data-field="amount" value="${amountValue}" min="0" step="0.01" required />
            </td>
            <td>
              <input type="date" class="inline-edit-input" data-field="bill_date" value="${dateValue}" required />
            </td>
            <td>${sanitize(reference)}</td>
            <td>
              <div class="actions-group">
                <button type="button" class="button-primary" data-action="save-utility-bill" data-id="${expense.id}" data-source="${dataSource}">
                  ${translate("save") || "Save"}
                </button>
                <button type="button" class="button-muted" data-action="cancel-edit-utility-bill">
                  ${translate("cancelEdit") || "Cancel"}
                </button>
              </div>
            </td>
          </tr>
        `;
        }
        
        return `
        <tr>
          <td>${index + 1}</td>
          <td>${sanitize(tenantName)}</td>
          <td>${sanitize(typeLabel)}</td>
          <td>${formatCurrency(expense.amount)}</td>
          <td>${formatDate(billDate)}</td>
          <td>${sanitize(reference)}</td>
          <td>
            <div class="actions-group">
              <button type="button" class="button-secondary" data-action="edit-utility-bill" data-id="${expense.id}" data-source="${dataSource}">
                ${translate("edit")}
              </button>
              <button type="button" class="button-danger" data-action="delete-utility-bill" data-id="${expense.id}" data-source="${dataSource}">
                ${translate("delete")}
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("") || `<tr><td colspan="7" style="text-align:center;color:#6b7280;">${translate("noData") || "No data"}</td></tr>`;
  }
  
  // Render payments table with columns: #, Tenant, Type, Amount, Date, Actions (no reference)
  if (elements.utilityPaymentsTableBody) {
    const typeLabel = translate(`debt${capitalize(activeType)}`) || activeType;
    elements.utilityPaymentsTableBody.innerHTML = utilityPayments
      .map((payment, index) => {
        const tenant = state.tenants.find((t) => equalsId(t.id, payment.tenant_id));
        const tenantName = tenant?.full_name || translate("unknown") || "Unknown";
        const isFromUtilityTable = !!payment.type;
        const dataSource = isFromUtilityTable ? "utility_payments" : "payments";
        return `
        <tr>
          <td>${index + 1}</td>
          <td>${sanitize(tenantName)}</td>
          <td>${sanitize(typeLabel)}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${formatDate(payment.payment_date)}</td>
          <td>
            <div class="actions-group">
              <button type="button" class="button-secondary" data-action="edit-utility-payment" data-id="${payment.id}" data-source="${dataSource}">
                ${translate("edit")}
              </button>
              <button type="button" class="button-danger" data-action="delete-utility-payment" data-id="${payment.id}" data-source="${dataSource}">
                ${translate("delete")}
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("") || `<tr><td colspan="6" style="text-align:center;color:#6b7280;">${translate("noData") || "No data"}</td></tr>`;
  }
}

// Handle clicks on utility bills table (expenses)
function handleUtilityBillsTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  
  const action = button.dataset.action;
  const id = button.dataset.id;
  const source = button.dataset.source;
  
  if (action === "delete-utility-bill") {
    deleteUtilityBill(id, source);
  } else if (action === "edit-utility-bill") {
    editUtilityBill(id, source);
  } else if (action === "save-utility-bill") {
    saveUtilityBill(id, source);
  } else if (action === "cancel-edit-utility-bill") {
    cancelEditUtilityBill();
  }
}

// Handle clicks on utility payments table
function handleUtilityPaymentsTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  
  const action = button.dataset.action;
  const id = button.dataset.id;
  const source = button.dataset.source;
  
  if (action === "delete-utility-payment") {
    deleteUtilityPayment(id, source);
  } else if (action === "edit-utility-payment") {
    editUtilityPayment(id, source);
  }
}

async function deleteUtilityBill(id, source) {
  if (!confirm(translate("confirmDelete") || "Are you sure you want to delete this item?")) {
    return;
  }
  
  let tableName;
  if (source === "utility_bills") {
    // Find the expense in state.debts to get its type
    const expense = state.debts.find(d => equalsId(d.id, id));
    if (!expense || !expense.type) {
      notify("error", translate("errorLoad"));
      console.error("deleteUtilityBill: Could not find expense or type", id);
      return;
    }
    const tableInfo = EXPENSE_TABLES[expense.type];
    if (!tableInfo) {
      notify("error", translate("errorLoad"));
      console.error("deleteUtilityBill: Unknown expense type", expense.type);
      return;
    }
    tableName = tableInfo.bills;
  } else {
    tableName = "debts";
  }
  
  const { error } = await supabase.from(tableName).delete().eq("id", id);
  
  if (error) {
    console.error("deleteUtilityBill", error);
    notify("error", translate("errorLoad"));
    return;
  }
  
  notify("success", translate("successDeleteDebt"), "delete");
  if (source === "utility_bills") {
    await loadDebts();
  } else {
    await loadDebts();
  }
}

async function deleteUtilityPayment(id, source) {
  if (!confirm(translate("confirmDelete") || "Are you sure you want to delete this item?")) {
    return;
  }
  
  let tableName;
  if (source === "utility_payments") {
    // Find the payment in state.payments to get its type
    const payment = state.payments.find(p => equalsId(p.id, id));
    if (!payment || !payment.type) {
      notify("error", translate("errorLoad"));
      console.error("deleteUtilityPayment: Could not find payment or type", id);
      return;
    }
    const tableInfo = EXPENSE_TABLES[payment.type];
    if (!tableInfo) {
      notify("error", translate("errorLoad"));
      console.error("deleteUtilityPayment: Unknown payment type", payment.type);
      return;
    }
    tableName = tableInfo.payments;
  } else {
    tableName = "payments";
  }
  
  const { error } = await supabase.from(tableName).delete().eq("id", id);
  
  if (error) {
    console.error("deleteUtilityPayment", error);
    notify("error", translate("errorLoad"));
    return;
  }
  
  notify("success", translate("successDeletePayment"), "delete");
  if (source === "utility_payments") {
    await loadPayments();
  } else {
    await loadPayments();
  }
}

function editUtilityBill(id, source) {
  if (source === "debts") {
    state.editingDebtId = id;
    renderDebtsTable();
  } else {
    state.editingUtilityBillId = id;
    renderUtilitySummary();
  }
}

function cancelEditUtilityBill() {
  state.editingUtilityBillId = null;
  renderUtilitySummary();
}

async function saveUtilityBill(id, billType) {
  // Find the editing row
  const row = elements.utilityExpensesTableBody?.querySelector('tr.editing-row');
  if (!row) return;
  
  const amountInput = row.querySelector('input[data-field="amount"]');
  const dateInput = row.querySelector('input[data-field="bill_date"]');
  
  if (!amountInput || !dateInput) return;
  
  const amount = normalizeCurrency(amountInput.value);
  const billDate = dateInput.value;
  
  if (!billDate || amount < 0) {
    notify("error", translate("errorFieldRequired"));
    return;
  }
  
  // Get the correct table for this bill type
  const tableInfo = EXPENSE_TABLES[billType];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    return;
  }
  
  const { error } = await supabase
    .from(tableInfo.bills)
    .update({ amount, bill_date: billDate })
    .eq("id", id);
  
  if (error) {
    console.error("saveUtilityBill", error);
    notify("error", translate("errorLoad"));
    return;
  }
  
  state.editingUtilityBillId = null;
  notify("success", translate("successUpdateDebt"), "edit");
  await loadDebts();
}

function editUtilityPayment(id, source) {
  // For now, redirect to the main payment editing
  if (source === "payments") {
    state.editingPaymentId = id;
    renderPaymentsTable();
  } else {
    // TODO: Implement utility_payments inline editing
    notify("info", "Edit utility payment - coming soon");
  }
}

function renderPaymentsTable() {
  // Get the active expense type filter
  const activeExpenseType = getActiveExpenseType();
  
  // Apply global tenant filter first
  const paymentsToFilter = getFilteredPayments();
  
  // Filter payments based on expense type if a filter is active
  const filteredPayments = activeExpenseType
    ? paymentsToFilter.filter((payment) => {
        // Check payment's own type first (set when loading from split tables)
        if (payment.type === activeExpenseType) return true;
        // Fall back to checking the linked debt
        const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
        return debt && debt.type === activeExpenseType;
      })
    : paymentsToFilter;
  
  const rows = filteredPayments
    .map((payment) => {
      const tenant = state.tenants.find((t) =>
        equalsId(t.id, payment.tenant_id)
      );
      const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
      // Use payment's own type if no linked debt
      const typeLabel = debt ? getDebtTypeLabel(debt) : (payment.type ? translate(`debt${capitalize(payment.type)}`) || payment.type : "-");
      const isEditing = state.editingPaymentId && equalsId(state.editingPaymentId, payment.id);
      
      if (isEditing) {
        // Render editable row
        const paymentDateValue = payment.payment_date || "";
        const amountValue = normalizeCurrency(payment.amount).toFixed(2);
        // Escape HTML for text inputs but keep values clean
        const methodValue = (payment.method || "").replace(/"/g, "&quot;");
        // Use debt's reference if available, otherwise use payment's reference
        const referenceValue = formatReferenceForDisplay(debt && debt.reference ? debt.reference : payment.reference || "").replace(/"/g, "&quot;");
        const methodPlaceholder = (translate("paymentMethod") || "Method").replace(/"/g, "&quot;");
        const referencePlaceholder = (translate("paymentReference") || "Reference").replace(/"/g, "&quot;");
        
        return `
          <tr class="editing-row">
            <td>${sanitize(tenant?.full_name || translate("unknown"))}</td>
            <td>${sanitize(typeLabel)}</td>
            <td>
              <input 
                type="number" 
                class="inline-edit-input" 
                data-field="amount" 
                value="${amountValue}" 
                min="0" 
                step="0.01" 
                required
              />
            </td>
            <td>${debt ? formatDate(debt.due_date) : "-"}</td>
            <td>
              <input 
                type="date" 
                class="inline-edit-input" 
                data-field="payment_date" 
                value="${paymentDateValue}" 
                required
              />
            </td>
            <td>
              <input 
                type="text" 
                class="inline-edit-input" 
                data-field="method" 
                value="${methodValue}" 
                placeholder="${methodPlaceholder}"
              />
            </td>
            <td>
              ${debt && debt.reference 
                ? `<span class="reference-display">${sanitize(formatReferenceForDisplay(debt.reference))}</span>
                   <input 
                     type="hidden" 
                     data-field="reference" 
                     value="${debt.reference}"
                   />`
                : `<input 
                     type="text" 
                     class="inline-edit-input" 
                     data-field="reference" 
                     value="${referenceValue}" 
                     placeholder="${referencePlaceholder}"
                   />`
              }
            </td>
            <td>
              <div class="actions-group">
                <button type="button" class="button-primary" data-action="save-payment" data-id="${payment.id}">
                  ${translate("save") || "Save"}
                </button>
                <button type="button" class="button-muted" data-action="cancel-edit-payment" data-id="${payment.id}">
                  ${translate("cancelEdit") || "Cancel"}
                </button>
              </div>
            </td>
          </tr>
        `;
      }
      
      // Render normal row
      return `
        <tr>
          <td>${sanitize(tenant?.full_name || translate("unknown"))}</td>
          <td>${sanitize(typeLabel)}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${debt ? formatDate(debt.due_date) : "-"}</td>
          <td>${formatDate(payment.payment_date)}</td>
          <td>${sanitize(payment.method || "")}</td>
          <td>${sanitize(formatReferenceForDisplay(payment.reference))}</td>
          <td>
            <div class="actions-group">
              <button type="button" class="button-secondary" data-action="edit-payment" data-id="${payment.id}">
                ${translate("edit")}
              </button>
              <button type="button" class="button-danger" data-action="delete-payment" data-id="${payment.id}">
                ${translate("delete")}
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
  if (elements.paymentsTableBody) {
    elements.paymentsTableBody.innerHTML = rows;
  }
  if (elements.expensesPaymentsTableBody) {
    elements.expensesPaymentsTableBody.innerHTML = rows;
  }
}

function renderOpenExpensesTable() {
  if (!elements.openExpensesTableBody) return;
  const filteredDebts = getFilteredDebts();
  // Exclude utility types from open expenses (they don't have is_paid status)
  const openRows = (filteredDebts || [])
    .filter((debt) => !debt.is_paid && !isUtilityType(debt.type))
    .map((debt) => {
      const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
      const status = getDebtStatus(debt);
      const typeLabel = getDebtTypeLabel(debt);
      return `
        <tr>
          <td>${sanitize(tenant?.full_name || translate("unknown"))}</td>
          <td>${sanitize(typeLabel)}</td>
          <td>${formatCurrency(debt.amount)}</td>
          <td>${formatDate(debt.due_date)}</td>
          <td><span class="tag ${status.class}">${status.label}</span></td>
        </tr>
      `;
    })
    .join("");

  elements.openExpensesTableBody.innerHTML = openRows || `
    <tr>
      <td colspan="5">${sanitize(translate("summaryNoData"))}</td>
    </tr>
  `;
}

async function renderAdminSummaryWithAnimation() {
  if (!elements.adminSummary) return;

  const totalExpensesAmount = (state.debts || []).reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0),
    0
  );

  const totalUnpaidAmount = (state.debts || []).reduce((sum, debt) => {
    if (debt && !debt.is_paid) {
      return sum + (parseFloat(debt.amount) || 0);
    }
    return sum;
  }, 0);

  const totalPaymentsAmount = (state.payments || []).reduce(
    (sum, payment) => sum + (parseFloat(payment.amount) || 0),
    0
  );

  // Animate all counters simultaneously with slight delays for visual effect
  const animations = [];

  if (elements.statTenantsValue) {
    animations.push(animateCounter(elements.statTenantsValue, 0, state.tenants.length || 0, 2000));
  }
  
  if (elements.statApartmentsValue) {
    setTimeout(() => {
      animations.push(animateCounter(elements.statApartmentsValue, 0, state.apartments.length || 0, 2000));
    }, 100);
  }
  
  if (elements.statContractsValue) {
    setTimeout(() => {
      animations.push(animateCounter(elements.statContractsValue, 0, state.contracts.length || 0, 2000));
    }, 200);
  }
  
  if (elements.statExpensesValue) {
    setTimeout(() => {
      animations.push(animateCounter(elements.statExpensesValue, 0, state.debts.length || 0, 2000));
    }, 300);
  }
  
  if (elements.statPaymentsValue) {
    setTimeout(() => {
      animations.push(animateCounter(elements.statPaymentsValue, 0, state.payments.length || 0, 2000));
    }, 400);
  }
  
  if (elements.statPdfGeneratedValue) {
    setTimeout(() => {
      animations.push(animateCounter(elements.statPdfGeneratedValue, 0, state.pdfGeneratedCount || 0, 2000));
    }, 500);
  }
  
  if (elements.statTotalExpensesValue) {
    setTimeout(() => {
      animations.push(animateCurrencyCounter(elements.statTotalExpensesValue, 0, totalExpensesAmount, 2000));
    }, 600);
  }
  
  if (elements.statTotalPaymentsValue) {
    setTimeout(() => {
      animations.push(animateCurrencyCounter(elements.statTotalPaymentsValue, 0, totalPaymentsAmount, 2000));
    }, 700);
  }
  
  if (elements.statTotalUnpaidValue) {
    setTimeout(() => {
      animations.push(animateCurrencyCounter(elements.statTotalUnpaidValue, 0, totalUnpaidAmount, 2000));
    }, 800);
  }

  // Wait for all animations to complete
  await Promise.all(animations);
}

function renderAdminSummary() {
  if (!elements.adminSummary) return;

  const totalExpensesAmount = (state.debts || []).reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0),
    0
  );

  const totalUnpaidAmount = (state.debts || []).reduce((sum, debt) => {
    if (debt && !debt.is_paid) {
      return sum + (parseFloat(debt.amount) || 0);
    }
    return sum;
  }, 0);

  const totalPaymentsAmount = (state.payments || []).reduce(
    (sum, payment) => sum + (parseFloat(payment.amount) || 0),
    0
  );

  if (elements.statTenantsValue) {
    elements.statTenantsValue.textContent = formatNumber(state.tenants.length || 0);
  }
  if (elements.statApartmentsValue) {
    elements.statApartmentsValue.textContent = formatNumber(state.apartments.length || 0);
  }
  if (elements.statContractsValue) {
    elements.statContractsValue.textContent = formatNumber(state.contracts.length || 0);
  }
  if (elements.statExpensesValue) {
    elements.statExpensesValue.textContent = formatNumber(state.debts.length || 0);
  }
  if (elements.statPaymentsValue) {
    elements.statPaymentsValue.textContent = formatNumber(state.payments.length || 0);
  }
  if (elements.statPdfGeneratedValue) {
    elements.statPdfGeneratedValue.textContent = formatNumber(
      state.pdfGeneratedCount || 0
    );
  }
  if (elements.statTotalExpensesValue) {
    elements.statTotalExpensesValue.textContent = formatCurrency(totalExpensesAmount);
  }
  if (elements.statTotalPaymentsValue) {
    elements.statTotalPaymentsValue.textContent = formatCurrency(totalPaymentsAmount);
  }
  if (elements.statTotalUnpaidValue) {
    elements.statTotalUnpaidValue.textContent = formatCurrency(totalUnpaidAmount);
  }
}

function populateApartmentSelects() {
  const currentValue = elements.contractApartment.value;
  const options = state.apartments
    .map(
      (apartment) =>
        `<option value="${apartment.id}">${sanitize(apartment.name)}</option>`
    )
    .join("");
  elements.contractApartment.innerHTML =
    `<option value="">${translate("selectApartment")}</option>` + options;
  if (currentValue) {
    elements.contractApartment.value = currentValue;
  }
}

function populateTenantSelects() {
  const options = state.tenants
    .map(
      (tenant) =>
        `<option value="${tenant.id}">${sanitize(tenant.full_name)}</option>`
    )
    .join("");

  [
    elements.contractTenant,
    elements.debtTenant,
    elements.tenantSelect,
  ].forEach((select) => {
    if (!select) return;
    const currentValue = select.value;
    const placeholder = translate("selectTenant");
    select.innerHTML = `<option value="">${placeholder}</option>${options}`;
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function populateContractSelects() {
  const currentValue = elements.debtContract.value;
  const options = state.contracts
    .filter((contract) => contract && contract.is_active)
    .map((contract) => {
      const tenant = state.tenants.find((t) => equalsId(t.id, contract.tenant_id));
      const apartment = state.apartments.find(
        (a) => equalsId(a.id, contract.apartment_id)
      );
      return `<option value="${contract.id}">
        ${sanitize(apartment?.name || translate("unknown"))} — ${sanitize(
        tenant?.full_name || translate("unknown")
      )}
      </option>`;
    })
    .join("");

  elements.debtContract.innerHTML =
    `<option value="">${translate("selectContract")}</option>` + options;
  const hasPrevious = currentValue
    ? elements.debtContract.querySelector(`option[value="${currentValue}"]`)
    : null;
  if (currentValue && hasPrevious) {
    elements.debtContract.value = currentValue;
  } else if (currentValue) {
    const contract = state.contracts.find((c) => equalsId(c.id, currentValue));
    if (contract) {
      const tenant = state.tenants.find((t) => equalsId(t.id, contract.tenant_id));
      const apartment = state.apartments.find((a) =>
        equalsId(a.id, contract.apartment_id)
      );
      const option = document.createElement("option");
      option.value = contract.id;
      const apartmentName = apartment?.name || translate("unknown");
      const tenantName = tenant?.full_name || translate("unknown");
      option.textContent = `${apartmentName} — ${tenantName}`;
      option.dataset.tempEdit = "true";
      elements.debtContract.appendChild(option);
      elements.debtContract.value = currentValue;
    } else {
      elements.debtContract.value = "";
    }
  } else {
    elements.debtContract.value = "";
  }
  handleDebtContractChange();
}

function populateDebtSelects() {
  if (!elements.paymentDebt) return;
  const currentValue = elements.paymentDebt.value;
  const typeFilterValue = elements.debtsFilterType
    ? elements.debtsFilterType.value
    : "all";
  const unpaidDebts = state.debts.filter((debt) => !debt.is_paid);

  // Add direct payment option for utility types (allows payment without expense)
  let directPaymentOptions = "";
  if (typeFilterValue && isUtilityType(typeFilterValue)) {
    const typeLabel = translate(`debt${capitalize(typeFilterValue)}`) || sanitize(typeFilterValue);
    directPaymentOptions = `
      <option value="direct:${typeFilterValue}" data-type="${typeFilterValue}" data-direct="true">
        ${typeLabel} — ${translate("directPayment") || "Direct Payment"}
      </option>
    `;
  }

  // For utilities, group by tenant and show difference (expenses - payments)
  const utilityOptions = UTILITY_PAYMENT_TYPES.flatMap((type) => {
    if (
      typeFilterValue &&
      typeFilterValue !== "all" &&
      typeFilterValue !== type
    ) {
      return [];
    }
    // Get all debts of this type (not just unpaid)
    const allDebtsOfType = state.debts.filter((debt) => debt.type === type);
    if (!allDebtsOfType.length) return [];
    
    // Group by tenant
    const byTenant = {};
    for (const debt of allDebtsOfType) {
      const tenantId = debt.tenant_id;
      if (!byTenant[tenantId]) {
        byTenant[tenantId] = { debts: [], totalExpenses: 0, totalPayments: 0 };
      }
      byTenant[tenantId].debts.push(debt);
      byTenant[tenantId].totalExpenses += normalizeCurrency(debt.amount);
    }
    
    // Add payments for each tenant
    for (const payment of state.payments) {
      if (payment.type !== type) continue;
      const tenantId = payment.tenant_id;
      if (byTenant[tenantId]) {
        byTenant[tenantId].totalPayments += normalizeCurrency(payment.amount);
      }
    }
    
    const typeLabel = translate(`debt${capitalize(type)}`) || sanitize(type);
    
    return Object.entries(byTenant)
      .filter(([_, data]) => {
        // Only show if there's a positive difference (owes money)
        const difference = data.totalExpenses - data.totalPayments;
        return difference > 0.01;
      })
      .map(([tenantId, data]) => {
        const tenant = state.tenants.find((t) => equalsId(t.id, tenantId));
        const tenantName = tenant?.full_name || translate("unknown");
        const debtIds = data.debts.map(d => d.id).join(",");
        const difference = data.totalExpenses - data.totalPayments;
    return `
          <option value="utility:${type}:${tenantId}" data-type="${type}" data-total="${difference.toFixed(2)}" data-tenant="${tenantId}" data-debt-ids="${debtIds}">
            ${sanitize(tenantName)} - ${typeLabel} - ${translate("difference") || "Difference"}: ${formatCurrency(difference)}
      </option>
    `;
      });
  }).join("");

  // Filter out utility types from individual debt list (they are shown grouped by tenant)
  const filteredDebts = unpaidDebts.filter((debt) => {
    // Exclude utility types - they are shown grouped
    if (isUtilityType(debt.type)) return false;
    if (!typeFilterValue || typeFilterValue === "all") return true;
    return debt.type === typeFilterValue;
  });

  const debtOptions = filteredDebts
    .map((debt) => {
      const amount = normalizeCurrency(debt.amount);
      const dueDate = debt.due_date || "";
      return `
        <option value="${debt.id}" data-type="${debt.type}" data-amount="${amount.toFixed(
        2
      )}" data-due="${dueDate}">
          ${formatDebtOption(debt)}
        </option>
      `;
    })
    .join("");

  const placeholder = `<option value="">${translate("selectDebt")}</option>`;
  elements.paymentDebt.innerHTML = placeholder + directPaymentOptions + utilityOptions + debtOptions;

  let appliedPreviousSelection = false;
  if (currentValue) {
    const hasPreviousSelection = Array.from(elements.paymentDebt.options).some(
      (option) => option.value === currentValue
    );
    if (hasPreviousSelection) {
      elements.paymentDebt.value = currentValue;
      appliedPreviousSelection = true;
    } else {
      const debt = state.debts.find((d) => equalsId(d.id, currentValue));
      if (debt) {
        const option = document.createElement("option");
        option.value = currentValue;
        option.textContent = getDebtOptionLabel(debt);
        option.dataset.tempEdit = "true";
        elements.paymentDebt.appendChild(option);
        elements.paymentDebt.value = currentValue;
        appliedPreviousSelection = true;
      }
    }
  }
  if (!appliedPreviousSelection) {
    elements.paymentDebt.value = "";
  }
  updatePaymentDebtSummary(false);
}

function handlePaymentDebtChange() {
  updatePaymentDebtSummary(true);
}

function handlePaymentAmountInput() {
  updatePaymentDebtSummary(false);
}

function updatePaymentDebtSummary(shouldAutofillAmount = false) {
  if (!elements.paymentDebtSummary) return;
  if (!elements.paymentDebt) {
    elements.paymentDebtSummary.textContent = "";
    return;
  }

  const selectedOption = elements.paymentDebt.selectedOptions
    ? elements.paymentDebt.selectedOptions[0]
    : null;

  if (!selectedOption || !selectedOption.value) {
    elements.paymentDebtSummary.textContent = "";
    if (shouldAutofillAmount && elements.paymentAmount) {
      elements.paymentAmount.value = "";
    }
    return;
  }

  const optionValue = selectedOption.value;
  
  // Handle direct payment option (no expense required)
  if (isDirectPaymentValue(optionValue)) {
    const utilityType = selectedOption.dataset.type || getDirectPaymentType(optionValue);
    const typeLabel = translate(`debt${capitalize(utilityType)}`) || sanitize(utilityType);
    elements.paymentDebtSummary.textContent = `${typeLabel} — ${translate("directPayment") || "Direct Payment"}`;
    // Don't autofill amount for direct payments - user enters any amount
    return;
  }
  
  // Handle utility grouped payment (by tenant)
  if (isUtilityGroupedValue(optionValue)) {
    const utilityType = selectedOption.dataset.type || getUtilityGroupedType(optionValue);
    const tenantId = selectedOption.dataset.tenant || getUtilityGroupedTenantId(optionValue);
    const difference = normalizeCurrency(selectedOption.dataset.total || "0");
    
    const tenant = state.tenants.find((t) => equalsId(t.id, tenantId));
    const tenantName = tenant?.full_name || translate("unknown");
    const typeLabel = translate(`debt${capitalize(utilityType)}`) || sanitize(utilityType);
    
    if (shouldAutofillAmount && elements.paymentAmount) {
      elements.paymentAmount.value = difference.toFixed(2);
    }
    
    elements.paymentDebtSummary.textContent = `${sanitize(tenantName)} - ${typeLabel} - ${translate("difference") || "Difference"}: ${formatCurrency(difference)}`;
    return;
  }
  
  if (isGroupedDebtValue(optionValue)) {
    const groupType =
      selectedOption.dataset.type || getGroupedDebtType(optionValue);
    if (!groupType) {
      elements.paymentDebtSummary.textContent = "";
      return;
    }
    const debtsOfType = state.debts.filter(
      (debt) => !debt.is_paid && debt.type === groupType
    );
    const count =
      Number.parseInt(selectedOption.dataset.count || "", 10) ||
      debtsOfType.length;
    const totalFromOption = selectedOption.dataset.total;
    const total =
      totalFromOption !== undefined
        ? normalizeCurrency(totalFromOption)
        : debtsOfType.reduce(
            (sum, debt) => sum + normalizeCurrency(debt.amount),
            0
          );

    // Calculate total remaining for grouped debts
    let totalRemaining = 0;
    let totalPaid = 0;
    for (const debt of debtsOfType) {
      const summary = getDebtPaymentSummary(debt.id);
      totalPaid += summary.totalPaid;
      if (summary.remaining !== null && summary.remaining > 0.001) {
        totalRemaining += summary.remaining;
      }
    }

    if (shouldAutofillAmount && elements.paymentAmount) {
      // Use remaining amount if available, otherwise use full total
      elements.paymentAmount.value = totalRemaining > 0.001 ? totalRemaining.toFixed(2) : total.toFixed(2);
    }

    const typeLabel =
      translate(`debt${capitalize(groupType)}`) || sanitize(groupType);
    const billWord =
      count === 1 ? translate("billSingular") : translate("billPlural");
    const parts = [
      `${typeLabel} — ${count} ${billWord}`,
      `${translate("paymentSummaryDebt")}: ${formatCurrency(total)}`,
    ];
    
    if (totalPaid > 0) {
      parts.push(`${translate("paymentSummaryPaid")}: ${formatCurrency(totalPaid)}`);
    }
    
    if (totalRemaining > 0.001) {
      parts.push(`${translate("paymentSummaryRemaining")}: ${formatCurrency(totalRemaining)}`);
    } else {
      parts.push(`${translate("paymentSummaryRemaining")}: -`);
    }
    
    if (elements.paymentAmount && elements.paymentAmount.value) {
      const enteredAmount = normalizeCurrency(elements.paymentAmount.value);
      if (enteredAmount > 0) {
        parts.push(
          `${translate("enteredAmountLabel")}: ${formatCurrency(enteredAmount)}`
        );
      }
    }
    elements.paymentDebtSummary.textContent = parts.join(" | ");
    return;
  }

  const debt = state.debts.find((d) => equalsId(d.id, optionValue));
  if (!debt) {
    elements.paymentDebtSummary.textContent = "";
    if (shouldAutofillAmount && elements.paymentAmount) {
      elements.paymentAmount.value = "";
    }
    return;
  }
  const amount = normalizeCurrency(debt.amount);
  
  // Calculate remaining amount
  const summary = getDebtPaymentSummary(debt.id);
  const remaining = summary.remaining;
  
  if (shouldAutofillAmount && elements.paymentAmount) {
    // Use remaining amount if available, otherwise use full debt amount
    elements.paymentAmount.value = remaining !== null ? remaining.toFixed(2) : amount.toFixed(2);
  }
  
  const typeLabel = getDebtTypeLabel(debt);
  const parts = [
    `${typeLabel} — ${translate("paymentSummaryDebt")}: ${formatCurrency(amount)}`
  ];
  
  if (summary.totalPaid > 0) {
    parts.push(`${translate("paymentSummaryPaid")}: ${formatCurrency(summary.totalPaid)}`);
  }
  
  if (remaining !== null && remaining > 0.001) {
    parts.push(`${translate("paymentSummaryRemaining")}: ${formatCurrency(remaining)}`);
  } else if (remaining !== null && remaining < -0.001) {
    // Overpaid - show negative balance (credit)
    parts.push(`${translate("paymentSummaryRemaining")}: -${formatCurrency(Math.abs(remaining))}`);
  } else {
    parts.push(`${translate("paymentSummaryRemaining")}: -`);
  }
  
  if (debt.due_date) {
    parts.push(`${translate("dueDate")}: ${formatDate(debt.due_date)}`);
  }
  
  elements.paymentDebtSummary.textContent = parts.join(" | ");
}

function isGroupedDebtValue(value) {
  return typeof value === "string" && value.startsWith("group:");
}

function getGroupedDebtType(value) {
  if (!isGroupedDebtValue(value)) return null;
  const [, type] = value.split(":");
  return type || null;
}

function isDirectPaymentValue(value) {
  return typeof value === "string" && value.startsWith("direct:");
}

function getDirectPaymentType(value) {
  if (!isDirectPaymentValue(value)) return null;
  const [, type] = value.split(":");
  return type || null;
}

function isUtilityGroupedValue(value) {
  return typeof value === "string" && value.startsWith("utility:");
}

function getUtilityGroupedType(value) {
  if (!isUtilityGroupedValue(value)) return null;
  const parts = value.split(":");
  return parts[1] || null;
}

function getUtilityGroupedTenantId(value) {
  if (!isUtilityGroupedValue(value)) return null;
  const parts = value.split(":");
  return parts[2] || null;
}

function handleDebtsTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (!id) return;
  switch (action) {
    case "mark-paid":
      handleMarkDebtPaid(id);
      break;
    case "edit-debt":
      startEditDebt(id);
      break;
    case "save-debt":
      handleSaveDebt(id);
      break;
    case "cancel-edit-debt":
      cancelEditDebt();
      break;
    case "delete-debt":
      handleDeleteDebt(id);
      break;
    default:
      break;
  }
}

function handlePaymentsTableClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (!id) return;
  switch (action) {
    case "edit-payment":
      startEditPayment(id);
      break;
    case "save-payment":
      handleSavePayment(id);
      break;
    case "cancel-edit-payment":
      cancelEditPayment();
      break;
    case "delete-payment":
      handleDeletePayment(id);
      break;
    default:
      break;
  }
}

function startEditDebt(debtId) {
  const debt = state.debts.find((d) => equalsId(d.id, debtId));
  if (!debt) return;
  setExpenseFormMode("expense");
  state.editingDebtId = debt.id;
  // Re-render the table to show editable fields
  renderDebtsTable();
}

function resetDebtForm() {
  if (!elements.debtForm) return;
  elements.debtForm.reset();
  state.editingDebtId = null;
  
  // Reset custom date picker (leave empty)
  setDatePickerValue('debtDueDate', '');
  setDatePickerValue('paymentDate', '');
  
  if (elements.debtFormSubmit) {
    elements.debtFormSubmit.dataset.i18n = "createDebtButton";
    elements.debtFormSubmit.textContent = translate("createDebtButton");
  }
  if (elements.debtFormCancelEdit) {
    elements.debtFormCancelEdit.classList.add("hidden");
  }
  if (elements.debtContract) {
    elements.debtContract
      .querySelectorAll("option[data-temp-edit='true']")
      .forEach((option) => option.remove());
  }
  if (elements.debtElectricityCut) {
    elements.debtElectricityCut.checked = false;
  }
  if (elements.debtAmount && elements.debtAmount.dataset) {
    elements.debtAmount.dataset.electricBase = "";
  }
  updateExpenseFormTypeLock();
  
  // Reapply global contract filter lock
  updateFormContractLock();
}

function startEditPayment(paymentId) {
  const payment = state.payments.find((p) => equalsId(p.id, paymentId));
  if (!payment) return;
  setExpenseFormMode("payment");
  state.editingPaymentId = payment.id;
  // Re-render the table to show editable fields
  renderPaymentsTable();
}

function resetPaymentForm() {
  if (!elements.paymentForm) return;
  elements.paymentForm.reset();
  state.editingPaymentId = null;
  
  // Reset payment method buttons
  const methodButtons = document.querySelectorAll(".payment-form-method-btn");
  methodButtons.forEach(btn => btn.classList.remove("active"));
  
  // Hide and reset custom input
  if (elements.paymentMethod) {
    elements.paymentMethod.style.display = "none";
    elements.paymentMethod.value = "";
  }
  
  if (elements.paymentDebt) {
    elements.paymentDebt.disabled = false;
    elements.paymentDebt
      .querySelectorAll("option[data-temp-edit='true']")
      .forEach((option) => option.remove());
  }
  if (elements.paymentFormSubmit) {
    elements.paymentFormSubmit.dataset.i18n = "recordPaymentButton";
    elements.paymentFormSubmit.textContent = translate("recordPaymentButton");
  }
  if (elements.paymentFormCancelEdit) {
    elements.paymentFormCancelEdit.classList.add("hidden");
  }
  updatePaymentDebtSummary(false);
}

async function handleDeleteDebt(debtId) {
  if (!debtId) return;
  
  const debt = state.debts.find((d) => equalsId(d.id, debtId));
  if (!debt) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Check if debt has associated payments
  const associatedPayments = state.payments.filter((p) => equalsId(p.bill_id, debtId) || equalsId(p.debt_id, debtId));
  const hasPayments = associatedPayments.length > 0;

  // First confirmation: ask if they want to delete
  const baseMessage = translate("confirmationDeleteDebt") || "Are you sure you want to delete this expense?";
  let deletePayments = false;
  
  if (hasPayments) {
    const paymentMessage = `${baseMessage}\n\nThis expense has ${associatedPayments.length} payment(s) associated with it. Do you want to delete the payments as well?`;
    const deletePaymentsConfirm = window.confirm(paymentMessage);
    if (!deletePaymentsConfirm) {
      // User cancelled the first confirmation
      return;
    }
    deletePayments = true;
  } else {
    const confirmation = window.confirm(baseMessage);
    if (!confirmation) return;
  }

  // Second confirmation: require typing the expense amount
  const debtAmount = formatCurrency(debt.amount);
  const amountPrompt = translate("confirmDeleteAmount") || `To confirm deletion, please type the expense amount exactly as shown:\n\n${debtAmount}\n\nType the amount to confirm:`;
  const typedAmount = window.prompt(amountPrompt, "");
  
  if (typedAmount === null) {
    // User cancelled
    return;
  }
  
  if (!typedAmount || typedAmount.trim() === "") {
    notify("error", translate("errorAmountMismatch") || "The amount you typed does not match. Deletion cancelled.");
    return;
  }

  // Normalize both amounts for comparison (accept both formatted and plain numbers)
  const normalizedDebtAmount = normalizeCurrency(debt.amount);
  const normalizedTypedAmount = normalizeCurrency(typedAmount.trim());
  
  if (Math.abs(normalizedDebtAmount - normalizedTypedAmount) > 0.01) {
    notify("error", translate("errorAmountMismatch") || "The amount you typed does not match. Deletion cancelled.");
    return;
  }

  // Get the correct table for this expense type
  const tableInfo = EXPENSE_TABLES[debt.type];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown expense type:", debt.type);
    return;
  }

  // Delete payments if requested
  if (deletePayments && hasPayments) {
    const { error: paymentsError } = await supabase
      .from(tableInfo.payments)
      .delete()
      .eq("bill_id", debtId);
    if (paymentsError) {
      notify("error", translate("errorLoad"));
      console.error("handleDeleteDebt.deletePayments", paymentsError);
      return;
    }
  }

  // Delete the bill from the correct table
  const { error } = await supabase.from(tableInfo.bills).delete().eq("id", debtId);
  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleDeleteDebt", error);
    return;
  }

  if (state.editingDebtId && equalsId(state.editingDebtId, debtId)) {
    resetDebtForm();
  }

  notify("success", translate("successDeleteDebt"));
  await loadDebts();
  await loadPayments();
}

async function handleDeletePayment(paymentId) {
  if (!paymentId) return;
  const payment = state.payments.find((p) => equalsId(p.id, paymentId));
  if (!payment) {
    notify("error", translate("errorLoad"));
    return;
  }

  const confirmation = window.confirm(translate("confirmationDeletePayment"));
  if (!confirmation) return;

  // Store the bill_id before deletion for later check
  const billId = payment.bill_id || payment.debt_id;
  const paymentType = payment.type;

  // Get the correct table for this payment type
  const tableInfo = EXPENSE_TABLES[paymentType];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown payment type:", paymentType);
    return;
  }

  // Delete the payment from the correct table
  const { error } = await supabase.from(tableInfo.payments).delete().eq("id", paymentId);
  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleDeletePayment", error);
    return;
  }

  // Reload payments to get the current state after deletion
  await loadPayments();

  // Recalculate total payments and update bill status if needed (only for types with status)
  if (billId && tableInfo.hasStatus) {
    const bill = state.debts.find((d) => equalsId(d.id, billId));
    if (bill) {
      const remainingPayments = state.payments.filter((p) =>
        equalsId(p.bill_id, billId)
      );
      
      // Calculate total payments for this bill
      const totalPaid = remainingPayments.reduce(
        (sum, payment) => sum + normalizeCurrency(payment.amount),
        0
      );
      const billAmount = normalizeCurrency(bill.amount);

      // Mark bill as paid only if total payments >= bill amount, otherwise unpaid
      if (totalPaid >= billAmount - 0.001) {
        const { error: billUpdateError } = await supabase
          .from(tableInfo.bills)
          .update({ is_paid: true })
          .eq("id", billId);
        if (billUpdateError) {
          console.error("handleDeletePayment.markBillPaid", billUpdateError);
        }
      } else {
        const { error: billUpdateError } = await supabase
          .from(tableInfo.bills)
          .update({ is_paid: false })
          .eq("id", billId);
        if (billUpdateError) {
          console.error("handleDeletePayment.markBillUnpaid", billUpdateError);
        }
      }
    }
  }

  // Reload debts to reflect the updated payment status
  await loadDebts();

  if (state.editingPaymentId && equalsId(state.editingPaymentId, paymentId)) {
    resetPaymentForm();
  }

  notify("success", translate("successDeletePayment"));
}

async function handleSavePayment(paymentId) {
  if (!paymentId || !state.editingPaymentId || !equalsId(state.editingPaymentId, paymentId)) {
    return;
  }

  // Find the row that's being edited
  const row = document.querySelector(`tr.editing-row button[data-action="save-payment"][data-id="${paymentId}"]`)?.closest("tr");
  if (!row) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Get the edited values from the input fields
  const amountInput = row.querySelector('input[data-field="amount"]');
  const paymentDateInput = row.querySelector('input[data-field="payment_date"]');
  const methodInput = row.querySelector('input[data-field="method"]');
  const referenceInput = row.querySelector('input[data-field="reference"]');

  if (!amountInput || !paymentDateInput) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const paymentAmount = normalizeCurrency(amountInput.value);
  const paymentDate = paymentDateInput.value.trim();
  const method = methodInput?.value.trim() || null;
  
  if (!paymentDate || paymentAmount <= 0) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  // Get the original payment to preserve debt_id, tenant_id, and contract_id
  const payment = state.payments.find((p) => equalsId(p.id, paymentId));
  if (!payment) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Get reference from hidden input (if debt has reference) or from visible input
  let reference = null;
  if (referenceInput) {
    if (referenceInput.type === "hidden") {
      // Debt has reference, use it
      reference = referenceInput.value.trim() || null;
    } else {
      // User can edit reference
      reference = referenceInput.value.trim() || null;
    }
  }
  
  // If payment is linked to a debt with a reference, prefer the debt's reference
  if (payment.debt_id) {
    const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
    if (debt && debt.reference) {
      reference = debt.reference;
    }
  }

  // Get the correct table for this payment type
  const paymentType = payment.type;
  const tableInfo = EXPENSE_TABLES[paymentType];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown payment type:", paymentType);
    return;
  }

  // Update the payment in the correct table
  const payload = {
    amount: paymentAmount,
    payment_date: paymentDate,
    method,
    // Preserve the original relationships
    bill_id: payment.bill_id || payment.debt_id,
    tenant_id: payment.tenant_id,
    contract_id: payment.contract_id,
  };

  const { error } = await supabase
    .from(tableInfo.payments)
    .update(payload)
    .eq("id", paymentId);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleSavePayment", error);
    return;
  }

  // This function is ONLY called when editing a payment, so it's always an edit operation
  const animationType = "edit";
  
  // Cancel edit mode and reload data
  cancelEditPayment();
  
  notify("success", translate("successUpdatePayment") || translate("successAddPayment"), animationType);
  await loadPayments();
  await loadDebts();
}

function cancelEditPayment() {
  state.editingPaymentId = null;
  renderPaymentsTable();
}

function handleDebtContractChange() {
  syncDebtTenantWithContract();
  autofillDebtAmount();
}

function handleDebtTypeChange() {
  updateElectricityFeeVisibility();
  autofillDebtAmount();
}

function handleElectricityCutChange() {
  adjustElectricityAmount();
}

function syncDebtTenantWithContract() {
  if (!elements.debtContract || !elements.debtTenant) return;
  const contractId = elements.debtContract.value;
  if (!contractId) {
    elements.debtTenant.value = "";
    return;
  }
  const contract = getContractById(contractId);
  if (contract && !equalsId(elements.debtTenant.value, contract.tenant_id)) {
    elements.debtTenant.value = contract.tenant_id || "";
  }
}

function getContractById(contractId) {
  if (!contractId) return null;
  return (
    state.contracts.find((contract) => equalsId(contract.id, contractId)) || null
  );
}

function getTenantContracts(tenantId) {
  if (!tenantId) return [];
  return state.contracts.filter((contract) => equalsId(contract.tenant_id, tenantId));
}

function getPrimaryContractForTenant(tenantId) {
  const contracts = getTenantContracts(tenantId);
  if (!contracts.length) return null;
  const activeContract = contracts.find((contract) => contract.is_active);
  if (activeContract) return activeContract;
  return contracts
    .slice()
    .sort((a, b) => {
      const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
      return bDate - aDate;
    })[0];
}

function getContractMonthlyAmount(contract, debtType) {
  if (!contract) return null;
  switch (debtType) {
    case "rent":
      return parseFloat(contract.monthly_rent) || 0;
    case "garbage":
      return parseFloat(contract.monthly_garbage) || 0;
    case "maintenance":
      return parseFloat(contract.monthly_maintenance) || 0;
    default:
      return null;
  }
}

function updateElectricityFeeVisibility() {
  if (
    !elements.debtElectricityCutWrapper ||
    !elements.debtElectricityCut ||
    !elements.debtType ||
    !elements.debtAmount
  ) {
    return;
  }
  const shouldShow = elements.debtType.value === "electricity";
  elements.debtElectricityCutWrapper.style.display = shouldShow ? "" : "none";
  if (!shouldShow) {
    elements.debtElectricityCut.checked = false;
    elements.debtAmount.dataset.electricBase = "";
  }
}

function autofillDebtAmount() {
  if (!elements.debtAmount || !elements.debtType) return;
  const debtType = elements.debtType.value;

  if (debtType === "rent" || debtType === "garbage" || debtType === "maintenance") {
    if (!elements.debtContract) return;
    const contract = getContractById(elements.debtContract.value);
    if (!contract) return;
    const baseAmount = getContractMonthlyAmount(contract, debtType);
    if (baseAmount === null) return;
    const numericBase = Number(baseAmount);
    const normalizedBase = Number.isFinite(numericBase) ? numericBase : 0;
    elements.debtAmount.value = normalizedBase.toFixed(2);
    if (elements.debtAmount.dataset) {
      elements.debtAmount.dataset.electricBase = "";
    }
    return;
  }

  if (debtType === "electricity") {
    if (elements.debtAmount.dataset && !elements.debtAmount.dataset.electricBase) {
      const currentValue = parseFloat(elements.debtAmount.value) || 0;
      elements.debtAmount.dataset.electricBase = currentValue.toFixed(2);
    }
    adjustElectricityAmount();
    return;
  }

  if (elements.debtAmount.dataset) {
    elements.debtAmount.dataset.electricBase = "";
  }
}

function adjustElectricityAmount() {
  if (
    !elements.debtAmount ||
    !elements.debtType ||
    elements.debtType.value !== "electricity"
  ) {
    return;
  }
  const checkbox = elements.debtElectricityCut;
  if (!elements.debtAmount.dataset) return;
  let base = parseFloat(elements.debtAmount.dataset.electricBase);
  if (!Number.isFinite(base)) {
    base = parseFloat(elements.debtAmount.value) || 0;
    elements.debtAmount.dataset.electricBase = base.toFixed(2);
  }
  if (!checkbox || !checkbox.checked) {
    elements.debtAmount.value = base.toFixed(2);
    elements.debtAmount.dataset.electricBase = base.toFixed(2);
    return;
  }
  const total = base + ELECTRICITY_RECONNECTION_FEE;
  elements.debtAmount.value = total.toFixed(2);
  elements.debtAmount.dataset.electricBase = base.toFixed(2);
}

async function maybeEnsureRecurringDebts() {
  // Always check for recurring debts when contracts and debts are loaded
  // This will create rent, garbage, and maintenance expenses on the 5th of each month
  if (!state.contractsLoaded || !state.debtsLoaded) return;
  
  // Prevent multiple simultaneous calls
  if (state.ensuringRecurringDebts) return;
  state.ensuringRecurringDebts = true;
  
  try {
    await ensureMonthlyRecurringDebts();
  } catch (error) {
    console.error("ensureMonthlyRecurringDebts", error);
  } finally {
    state.ensuringRecurringDebts = false;
  }
}

async function ensureMonthlyRecurringDebts() {
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth();
  
  // Define current month range in UTC (for safe duplicate checks against DB)
  const monthStart = new Date(Date.UTC(currentYear, currentMonth, 1));
  const nextMonthStart = new Date(Date.UTC(currentYear, currentMonth + 1, 1));
  const monthStartString = formatDateForSql(monthStart);
  const nextMonthStartString = formatDateForSql(nextMonthStart);
  
  // Create expenses with due date on the 5th of the current month
  const fifthOfMonth = new Date(Date.UTC(currentYear, currentMonth, 5));
  const dueDateString = formatDateForSql(fifthOfMonth);

  const payloads = [];

  (state.contracts || []).forEach((contract) => {
    if (!contract || !contract.is_active) return;
    const startDate = contract.start_date ? new Date(contract.start_date) : null;
    const endDate = contract.end_date ? new Date(contract.end_date) : null;

    // Check if contract is active (today is between start and end date)
    if (startDate && today < startDate) return;
    if (endDate && today > endDate) return;

    // Only create rent, garbage, and maintenance expenses on the 5th of each month
    const expenseTypes = [
      { key: "rent", amount: contract.monthly_rent },
      { key: "garbage", amount: contract.monthly_garbage },
      { key: "maintenance", amount: contract.monthly_maintenance },
    ];

    expenseTypes.forEach(({ key, amount }) => {
      if (!amount || Number(amount) <= 0) return;
      
      // Check if expense for this month already exists
      const exists = (state.debts || []).some((debt) => {
        if (!equalsId(debt.contract_id, contract.id)) return false;
        if (debt.type !== key) return false;
        if (!debt.due_date) return false;
        const debtDate = new Date(debt.due_date);
        return (
          debtDate.getUTCFullYear() === currentYear &&
          debtDate.getUTCMonth() === currentMonth
        );
      });

      if (exists) return;

      payloads.push({
        contract_id: contract.id,
        tenant_id: contract.tenant_id,
        type: key,
        amount: Number(amount) || 0,
        due_date: dueDateString,
        is_paid: false,
        notes: null,
      });
    });
  });

  if (!payloads.length) return;

  // Group payloads by type and insert into correct tables
  const payloadsByType = {};
  for (const payload of payloads) {
    if (!payloadsByType[payload.type]) {
      payloadsByType[payload.type] = [];
    }
    payloadsByType[payload.type].push(payload);
  }

  // Get starting reference number once, then increment for each expense
  let nextRefNum = await getNextReferenceNumberValue();

  // Check for existing bills in parallel for all types
  const existingBillsPromises = Object.entries(payloadsByType).map(async ([type, typePayloads]) => {
    const tableInfo = EXPENSE_TABLES[type];
    if (!tableInfo) return { type, filteredPayloads: [] };

    const uniqueContractIds = [
      ...new Set(typePayloads.map((p) => p.contract_id).filter(Boolean)),
    ];

    if (uniqueContractIds.length === 0) {
      return { type, filteredPayloads: typePayloads };
    }

    const { data: existingRows, error: existingError } = await supabase
      .from(tableInfo.bills)
      .select("id, contract_id, due_date, bill_date")
      .in("contract_id", uniqueContractIds)
      .gte("due_date", monthStartString)
      .lt("due_date", nextMonthStartString);

    if (existingError || !Array.isArray(existingRows)) {
      return { type, filteredPayloads: typePayloads };
    }

    const existingByContract = new Set(
      existingRows.map((row) => String(row.contract_id))
    );

    const filteredPayloads = typePayloads.filter(
      (p) => !existingByContract.has(String(p.contract_id))
    );

    return { type, filteredPayloads };
  });

  const existingBillsResults = await Promise.all(existingBillsPromises);

  // Insert into each split table
  for (const { type, filteredPayloads } of existingBillsResults) {
    if (!filteredPayloads.length) continue;

    const tableInfo = EXPENSE_TABLES[type];
    if (!tableInfo) continue;

    // Transform payload for split table with sequential reference numbers
    const splitPayloads = filteredPayloads.map(p => {
      const ref = 'REF-' + String(nextRefNum).padStart(6, '0');
      nextRefNum++;
      return {
        contract_id: p.contract_id,
        tenant_id: p.tenant_id,
        amount: p.amount,
        bill_date: p.due_date,
        due_date: p.due_date,
        is_paid: p.is_paid,
        notes: p.notes,
        reference: ref,
      };
    });

    const { error } = await supabase.from(tableInfo.bills).insert(splitPayloads);
    if (error) {
      throw error;
    }
  }
  
  await loadDebts();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function clampDueDateToDayFive(startOfMonth) {
  const fifth = new Date(Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth(), 5));
  return fifth;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function isAfter(reference, target) {
  if (!reference || !target) return false;
  return reference >= target;
}

function formatDateForSql(date) {
  if (!date) return null;
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function populateTenantSelector() {
  if (!elements.tenantSelect) return;
  const previouslySelected = elements.tenantSelect.value;
  const options = state.tenants
    .map(
      (tenant) =>
        `<option value="${tenant.id}" ${
          equalsId(tenant.id, previouslySelected) ? "selected" : ""
        }>${sanitize(tenant.full_name)}</option>`
    )
    .join("");
  elements.tenantSelect.innerHTML =
    `<option value="">${translate("selectTenant")}</option>` + options;
}

function setTemporaryLanguage(language) {
  state._previousLanguage = state.language;
  state.language = language === "sq" ? "sq" : "en";
}

function restoreLanguageAfterPdf() {
  if (state._previousLanguage) {
    state.language = state._previousLanguage;
    delete state._previousLanguage;
    // Only update text translations, don't trigger view changes
    const dictionary = translations[state.language] || translations.en;
    document
      .querySelectorAll("[data-i18n]")
      .forEach((node) => (node.textContent = dictionary[node.dataset.i18n]));
    document.title = dictionary.appTitle;
  }
}

// Photo upload state
let uploadedPhotos = [];
let isDraggingPhoto = false;
let apartmentMap = null;
let apartmentMarker = null;

function initializePhotoUpload() {
  const photoInput = document.getElementById("apartmentPhotos");
  const dropzone = document.getElementById("photoDropzone");
  const previewContainer = document.getElementById("photoPreviewContainer");
  
  if (!photoInput || !dropzone || !previewContainer) return;

  // Click to select files
  dropzone.addEventListener("click", () => photoInput.click());
  
  // File input change
  photoInput.addEventListener("change", (e) => handleFiles(e.target.files));
  
  // Drag and drop
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  });
  
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("drag-over");
  });
  
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    handleFiles(e.dataTransfer.files);
  });
  
  // Initialize photo count
  updatePhotoCount();
}

function handleFiles(files) {
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    notify("error", translate("photoUploadInvalid") || "Please select image files only.");
    return;
  }
  
  // Check current count and limit to 10 total
  const maxPhotos = 10;
  const remainingSlots = maxPhotos - uploadedPhotos.length;
  
  if (remainingSlots <= 0) {
    notify("error", translate("photoUploadMaxReached") || `Maximum ${maxPhotos} photos allowed.`);
    return;
  }
  
  // Limit the number of files to upload based on remaining slots
  const filesToProcess = imageFiles.slice(0, remainingSlots);
  
  if (filesToProcess.length < imageFiles.length) {
    notify("info", translate("photoUploadLimitExceeded") || `Only ${filesToProcess.length} photo(s) added. Maximum ${maxPhotos} photos allowed.`);
  }
  
  filesToProcess.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      uploadedPhotos.push(dataUrl);
      addPhotoPreview(dataUrl, uploadedPhotos.length - 1);
      updatePhotoCount();
    };
    reader.readAsDataURL(file);
  });
  
  // Reset file input to allow selecting the same file again
  const photoInput = document.getElementById("apartmentPhotos");
  if (photoInput) {
    photoInput.value = "";
  }
}

function addPhotoPreview(dataUrl, index) {
  const previewContainer = document.getElementById("photoPreviewContainer");
  if (!previewContainer) return;
  
  const preview = document.createElement("div");
  preview.className = "photo-preview-item";
  preview.draggable = true;
  preview.dataset.index = index;
  preview.dataset.photoUrl = dataUrl;
  preview.innerHTML = `
    <img src="${dataUrl}" alt="Preview" class="photo-preview-img" data-index="${index}" draggable="false" />
    <button type="button" class="photo-preview-remove" data-index="${index}">&times;</button>
    <div class="photo-preview-drag-handle" title="Drag to reorder">⋮⋮</div>
  `;
  
  // Click on image to review/zoom (but not when dragging)
  preview.querySelector(".photo-preview-img").addEventListener("click", (e) => {
    if (!isDraggingPhoto) {
      e.stopPropagation();
      openPhotoReview(index);
    }
  });
  
  // Remove button
  preview.querySelector(".photo-preview-remove").addEventListener("click", (e) => {
    e.stopPropagation();
    uploadedPhotos.splice(index, 1);
    preview.remove();
    updatePhotoPreviews();
    updatePhotoCount();
  });
  
  // Drag and drop handlers for reordering
  preview.addEventListener("dragstart", (e) => {
    isDraggingPhoto = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", preview.outerHTML);
    preview.classList.add("dragging");
    preview.style.opacity = "0.5";
  });
  
  preview.addEventListener("dragend", (e) => {
    isDraggingPhoto = false;
    preview.classList.remove("dragging");
    preview.style.opacity = "";
    // Remove drag-over class from all items
    previewContainer.querySelectorAll(".photo-preview-item").forEach(item => {
      item.classList.remove("drag-over");
    });
  });
  
  preview.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    const afterElement = getDragAfterElement(previewContainer, e.clientX);
    const dragging = previewContainer.querySelector(".dragging");
    
    if (afterElement == null) {
      previewContainer.appendChild(dragging);
    } else {
      previewContainer.insertBefore(dragging, afterElement);
    }
    
    preview.classList.add("drag-over");
  });
  
  preview.addEventListener("dragleave", () => {
    preview.classList.remove("drag-over");
  });
  
  preview.addEventListener("drop", (e) => {
    e.preventDefault();
    preview.classList.remove("drag-over");
    
    // Reorder the uploadedPhotos array based on new DOM order
    const items = Array.from(previewContainer.querySelectorAll(".photo-preview-item"));
    
    // Get the current order of photos from the DOM using data attribute
    const newOrder = items.map(item => item.dataset.photoUrl).filter(url => url);
    
    // Verify we have the same number of photos
    if (newOrder.length === uploadedPhotos.length) {
      uploadedPhotos = newOrder;
      updatePhotoPreviews();
    }
  });
  
  previewContainer.appendChild(preview);
}

function getDragAfterElement(container, x) {
  const draggableElements = [...container.querySelectorAll(".photo-preview-item:not(.dragging)")];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Photo review modal for upload previews
let currentReviewIndex = -1;

function openPhotoReview(index) {
  if (index < 0 || index >= uploadedPhotos.length) return;
  
  currentReviewIndex = index;
  const modal = document.getElementById("photoReviewModal");
  const image = document.getElementById("photoReviewImage");
  
  if (!modal || !image) return;
  
  image.src = uploadedPhotos[index];
  image.classList.remove("zoomed");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closePhotoReview() {
  const modal = document.getElementById("photoReviewModal");
  if (!modal) return;
  
  modal.style.display = "none";
  document.body.style.overflow = "";
  currentReviewIndex = -1;
}

function initializePhotoReview() {
  const modal = document.getElementById("photoReviewModal");
  const closeBtn = document.getElementById("photoReviewClose");
  const deleteBtn = document.getElementById("photoReviewDelete");
  const keepBtn = document.getElementById("photoReviewKeep");
  const image = document.getElementById("photoReviewImage");
  
  if (!modal || !closeBtn) return;
  
  // Close button
  closeBtn.addEventListener("click", closePhotoReview);
  
  // Keep button (just close)
  if (keepBtn) {
    keepBtn.addEventListener("click", () => {
      closePhotoReview();
    });
  }
  
  // Delete button
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (currentReviewIndex >= 0 && currentReviewIndex < uploadedPhotos.length) {
        uploadedPhotos.splice(currentReviewIndex, 1);
        updatePhotoPreviews();
        updatePhotoCount();
        closePhotoReview();
      }
    });
  }
  
  // Click outside to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closePhotoReview();
  });
  
  // Zoom on image click
  if (image) {
    image.addEventListener("click", (e) => {
      e.stopPropagation();
      image.classList.toggle("zoomed");
    });
  }
  
  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (modal.style.display !== "none" && e.key === "Escape") {
      closePhotoReview();
    }
  });
}

function updatePhotoPreviews() {
  const previewContainer = document.getElementById("photoPreviewContainer");
  if (!previewContainer) return;
  
  previewContainer.innerHTML = "";
  uploadedPhotos.forEach((photo, index) => {
    addPhotoPreview(photo, index);
  });
  
  // Update photo count indicator
  updatePhotoCount();
}

// Kosovo boundary coordinates (approximate polygon)
const KOSOVO_BOUNDS = [
  [41.85, 20.0],  // Southwest
  [41.85, 21.8],  // Southeast
  [43.3, 21.8],   // Northeast
  [43.3, 20.0],   // Northwest
  [41.85, 20.0]   // Close polygon
];

function isLocationInKosovo(lat, lng) {
  // Kosovo approximate boundaries
  // Latitude: 41.85 to 43.3
  // Longitude: 20.0 to 21.8
  return lat >= 41.85 && lat <= 43.3 && lng >= 20.0 && lng <= 21.8;
}

// Track if map is initialized to prevent multiple initializations
let mapInitialized = false;

function initializeApartmentMap() {
  // Map functionality removed
  return;
  const mapContainer = document.getElementById("apartmentMap");
  const latitudeInput = document.getElementById("apartmentLatitude");
  const longitudeInput = document.getElementById("apartmentLongitude");
  const clearPinBtn = document.getElementById("clearMapPin");
  const getLocationBtn = document.getElementById("getMyLocation");
  
  if (!mapContainer) return;
  
  // If map is already initialized, just ensure it's visible and sized correctly
  if (mapInitialized && apartmentMap) {
    requestAnimationFrame(() => {
      apartmentMap.invalidateSize();
    });
    return;
  }
  
  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error("Leaflet is not loaded.");
    mapContainer.innerHTML = '<p style="padding: 2rem; text-align: center; color: #dc2626;">Map library not loaded. Please refresh the page.</p>';
    return;
  }
  
  // Use Intersection Observer to lazy-load map only when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !mapInitialized) {
        observer.disconnect();
        loadMap();
      }
    });
  }, {
    rootMargin: '50px' // Start loading slightly before it's visible
  });
  
  // Check if map container is already visible
  const isVisible = mapContainer.offsetParent !== null || 
                    window.getComputedStyle(mapContainer).display !== 'none';
  
  if (isVisible) {
    // Map is visible, load immediately
    loadMap();
  } else {
    // Map is hidden, observe for when it becomes visible
    observer.observe(mapContainer);
  }
  
  function loadMap() {
    if (mapInitialized) return;
    
    // Ensure map container has explicit dimensions
    if (!mapContainer.style.height) {
      mapContainer.style.height = '400px';
    }
    if (!mapContainer.style.width) {
      mapContainer.style.width = '100%';
    }
    
    // Show loading indicator
    mapContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 400px; color: #666;"><p>Loading map...</p></div>';
    
    // Use requestAnimationFrame to defer initialization slightly for better UX
    requestAnimationFrame(() => {
      // Initialize map centered on Kosovo (Prishtina) with lower initial zoom for faster loading
      apartmentMap = L.map('apartmentMap', {
        maxBounds: [[41.5, 19.5], [43.5, 22.0]], // Restrict view to Kosovo area
        maxBoundsViscosity: 1.0, // Prevent panning outside bounds
        preferCanvas: false,
        zoomControl: true,
        loadingControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      }).setView([42.6629, 21.1655], 6); // Even lower zoom level (6) for faster initial load
      
      // Add OpenStreetMap as default (faster loading than satellite)
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 6,
        tileSize: 256,
        updateWhenIdle: true, // Only update when panning stops
        keepBuffer: 2, // Keep fewer tiles in memory
        crossOrigin: true
      });
      
      // Add free satellite imagery with optimized settings (lazy load)
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19,
        minZoom: 6,
        tileSize: 256,
        updateWhenIdle: true,
        keepBuffer: 2,
        crossOrigin: true
      });
      
      // Add layer control to switch between satellite and street map
      const baseMaps = {
        "Satellite": satelliteLayer,
        "Street Map": osmLayer
      };
      
      // Start with OpenStreetMap (faster to load) instead of satellite
      osmLayer.addTo(apartmentMap);
      L.control.layers(baseMaps).addTo(apartmentMap);
      
      mapInitialized = true;
      
      // Optimized size invalidation - use single requestAnimationFrame instead of multiple timeouts
      requestAnimationFrame(() => {
        if (apartmentMap) {
          apartmentMap.invalidateSize();
        }
      });
      
      // Also invalidate when the page becomes visible (handles tab switching)
      const visibilityHandler = () => {
        if (!document.hidden && apartmentMap) {
          requestAnimationFrame(() => {
            apartmentMap.invalidateSize();
          });
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      
      // Add Kosovo boundary polygon (defer to avoid blocking initial render)
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (apartmentMap) {
            const kosovoBoundary = L.polygon(KOSOVO_BOUNDS, {
              color: '#08a88a',
              fillColor: '#08a88a',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }).addTo(apartmentMap);
          }
        }, 500); // Reduced delay from 1000ms to 500ms
      });
      
      // Function to add/update marker (with Kosovo validation)
      const addMarker = (lat, lng) => {
    if (!isLocationInKosovo(lat, lng)) {
      notify("error", translate("locationOutsideKosovo") || "Location must be within Kosovo boundaries.");
      return false;
    }
    
    // Remove existing marker
    if (apartmentMarker) {
      apartmentMap.removeLayer(apartmentMarker);
    }
    
    // Add new marker
    apartmentMarker = L.marker([lat, lng], {
      draggable: true
    }).addTo(apartmentMap);
    
    // Update inputs
    if (latitudeInput) latitudeInput.value = lat;
    if (longitudeInput) longitudeInput.value = lng;
    
    // Show clear button
    if (clearPinBtn) clearPinBtn.style.display = "block";
    
    // Allow dragging marker (with validation)
    apartmentMarker.on('dragend', (e) => {
      const position = apartmentMarker.getLatLng();
      if (isLocationInKosovo(position.lat, position.lng)) {
        if (latitudeInput) latitudeInput.value = position.lat;
        if (longitudeInput) longitudeInput.value = position.lng;
      } else {
        // Revert to previous valid position
        notify("error", translate("locationOutsideKosovo") || "Location must be within Kosovo boundaries.");
        const prevLat = latitudeInput ? parseFloat(latitudeInput.value) : lat;
        const prevLng = longitudeInput ? parseFloat(longitudeInput.value) : lng;
        if (!isNaN(prevLat) && !isNaN(prevLng)) {
          apartmentMarker.setLatLng([prevLat, prevLng]);
        } else {
          apartmentMap.removeLayer(apartmentMarker);
          apartmentMarker = null;
          if (clearPinBtn) clearPinBtn.style.display = "none";
        }
      }
    });
    
    return true;
  };
  
      // Add click handler to drop pin (only within Kosovo)
      apartmentMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        addMarker(lat, lng);
      });
      
      // Get current location button
      if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
          if (!navigator.geolocation) {
            notify("error", translate("geolocationNotSupported") || "Geolocation is not supported by your browser.");
            return;
          }
          
          getLocationBtn.disabled = true;
          getLocationBtn.textContent = translate("gettingLocation") || "Getting location...";
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              if (isLocationInKosovo(lat, lng)) {
                addMarker(lat, lng);
                apartmentMap.setView([lat, lng], 15);
                notify("success", translate("locationFound") || "Location found!");
              } else {
                notify("error", translate("locationOutsideKosovo") || "Your location is outside Kosovo. Please select a location within Kosovo on the map.");
                // Center map on Kosovo anyway
                apartmentMap.setView([42.6629, 21.1655], 8);
              }
              
              getLocationBtn.disabled = false;
              getLocationBtn.textContent = translate("getMyLocation") || "Get My Location";
            },
            (error) => {
              console.error("Geolocation error:", error);
              notify("error", translate("geolocationError") || "Unable to get your location. Please select on the map.");
              getLocationBtn.disabled = false;
              getLocationBtn.textContent = translate("getMyLocation") || "Get My Location";
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });
      }
      
      // Clear pin button
      if (clearPinBtn) {
        clearPinBtn.addEventListener('click', () => {
          if (apartmentMarker) {
            apartmentMap.removeLayer(apartmentMarker);
            apartmentMarker = null;
          }
          if (latitudeInput) latitudeInput.value = "";
          if (longitudeInput) longitudeInput.value = "";
          clearPinBtn.style.display = "none";
        });
      }
      
      // Load existing coordinates if editing
      if (latitudeInput && longitudeInput && latitudeInput.value && longitudeInput.value) {
        const lat = parseFloat(latitudeInput.value);
        const lng = parseFloat(longitudeInput.value);
        if (!isNaN(lat) && !isNaN(lng)) {
          if (isLocationInKosovo(lat, lng)) {
            apartmentMarker = L.marker([lat, lng], {
              draggable: true
            }).addTo(apartmentMap);
            apartmentMap.setView([lat, lng], 15);
            if (clearPinBtn) clearPinBtn.style.display = "block";
            
            apartmentMarker.on('dragend', (e) => {
              const position = apartmentMarker.getLatLng();
              if (isLocationInKosovo(position.lat, position.lng)) {
                if (latitudeInput) latitudeInput.value = position.lat;
                if (longitudeInput) longitudeInput.value = position.lng;
              } else {
                notify("error", translate("locationOutsideKosovo") || "Location must be within Kosovo boundaries.");
                apartmentMarker.setLatLng([lat, lng]);
              }
            });
          }
        }
      }
    });
  }
}

function updatePhotoCount() {
  const dropzone = document.getElementById("photoDropzone");
  if (!dropzone) return;
  
  const maxPhotos = 10;
  const currentCount = uploadedPhotos.length;
  const hintText = dropzone.querySelector(".photo-upload-hint");
  
  if (hintText) {
    if (currentCount >= maxPhotos) {
      hintText.textContent = translate("photoUploadMaxReached") || `Maximum ${maxPhotos} photos reached.`;
      hintText.style.color = "#dc2626";
    } else {
      hintText.textContent = (translate("photoUploadHint") || `You can select multiple photos (max ${maxPhotos})`) + ` (${currentCount}/${maxPhotos})`;
      hintText.style.color = "";
    }
  }
}

function initializePhotoViewer() {
  const modal = document.getElementById("photoViewerModal");
  const closeBtn = document.getElementById("photoViewerClose");
  const prevBtn = document.getElementById("photoViewerPrev");
  const nextBtn = document.getElementById("photoViewerNext");
  const image = document.getElementById("photoViewerImage");
  const counter = document.getElementById("photoViewerCounter");
  
  if (!modal || !closeBtn) return;
  
  let currentPhotos = [];
  let currentIndex = 0;
  let autoSwipeTimer = null;
  
  window.openPhotoViewer = function(photos, startIndex = 0) {
    if (!photos || photos.length === 0) return;
    currentPhotos = Array.isArray(photos) ? photos : [photos];
    currentIndex = Math.max(0, Math.min(startIndex, currentPhotos.length - 1));
    clearAutoSwipeTimer();
    updatePhotoViewer();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  };
  
  function updatePhotoViewer() {
    if (currentPhotos.length === 0) return;
    
    // Add fade transition
    image.style.opacity = "0";
    setTimeout(() => {
      image.src = currentPhotos[currentIndex];
      image.style.opacity = "1";
    }, 150);
    
    counter.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
    prevBtn.style.display = currentPhotos.length > 1 ? "block" : "none";
    nextBtn.style.display = currentPhotos.length > 1 ? "block" : "none";
    
    // Update thumbnails
    updateThumbnails();
    
    // Reset zoom state when changing photos
    image.classList.remove("zoomed");
    clearAutoSwipeTimer();
  }
  
  function clearAutoSwipeTimer() {
    if (autoSwipeTimer) {
      clearTimeout(autoSwipeTimer);
      autoSwipeTimer = null;
    }
  }
  
  function startAutoSwipeTimer() {
    clearAutoSwipeTimer();
    
    // Only auto-swipe if there's more than one photo
    if (currentPhotos.length <= 1) return;
    
    autoSwipeTimer = setTimeout(() => {
      if (image.classList.contains("zoomed")) {
        showNext();
        // Restart timer for next photo if still zoomed
        if (image.classList.contains("zoomed")) {
          startAutoSwipeTimer();
        }
      }
    }, 3000);
  }
  
  function updateThumbnails() {
    const thumbnailsContainer = document.getElementById("photoViewerThumbnails");
    if (!thumbnailsContainer) return;
    
    if (currentPhotos.length <= 1) {
      thumbnailsContainer.innerHTML = "";
      return;
    }
    
    thumbnailsContainer.innerHTML = currentPhotos
      .map((photo, index) => `
        <div class="photo-thumbnail-item ${index === currentIndex ? 'active' : ''}" data-index="${index}">
          <img src="${photo}" alt="Thumbnail ${index + 1}" />
        </div>
      `)
      .join("");
    
    // Add click handlers for thumbnails
    thumbnailsContainer.querySelectorAll(".photo-thumbnail-item").forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        clearAutoSwipeTimer();
        currentIndex = index;
        updatePhotoViewer();
        // Restart timer if still zoomed
        if (image.classList.contains("zoomed")) {
          startAutoSwipeTimer();
        }
      });
    });
  }
  
  // Add zoom functionality on image click
  if (image) {
    image.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasZoomed = image.classList.contains("zoomed");
      image.classList.toggle("zoomed");
      const isNowZoomed = image.classList.contains("zoomed");
      
      if (isNowZoomed && !wasZoomed) {
        // Just zoomed - start auto-swipe timer
        startAutoSwipeTimer();
      } else if (!isNowZoomed && wasZoomed) {
        // Just unzoomed - clear timer
        clearAutoSwipeTimer();
      }
    });
  }
  
  function closeViewer() {
    clearAutoSwipeTimer();
    image.classList.remove("zoomed");
    modal.style.display = "none";
    document.body.style.overflow = "";
    currentPhotos = [];
    currentIndex = 0;
  }
  
  function showNext() {
    clearAutoSwipeTimer();
    currentIndex = (currentIndex + 1) % currentPhotos.length;
    updatePhotoViewer();
    // Restart timer if still zoomed
    if (image.classList.contains("zoomed")) {
      startAutoSwipeTimer();
    }
  }
  
  function showPrev() {
    clearAutoSwipeTimer();
    currentIndex = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length;
    updatePhotoViewer();
    // Restart timer if still zoomed
    if (image.classList.contains("zoomed")) {
      startAutoSwipeTimer();
    }
  }
  
  closeBtn.addEventListener("click", closeViewer);
  prevBtn.addEventListener("click", showPrev);
  nextBtn.addEventListener("click", showNext);
  
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeViewer();
  });
  
  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "none") return;
    if (e.key === "Escape") {
      closeViewer();
      return;
    }
    if (e.key === "ArrowLeft") {
      showPrev();
      return;
    }
    if (e.key === "ArrowRight") {
      showNext();
      return;
    }
  });
}

function editApartment(apartmentId) {
  const apartment = state.apartments.find(a => equalsId(a.id, apartmentId));
  if (!apartment) {
    notify("error", translate("errorLoad"));
    return;
  }
  
  // Populate form fields
  if (elements.apartmentId) elements.apartmentId.value = apartment.id;
  if (elements.apartmentName) elements.apartmentName.value = apartment.name || "";
  if (elements.apartmentAddress) elements.apartmentAddress.value = apartment.address || "";
  if (elements.apartmentElectricityCode) elements.apartmentElectricityCode.value = apartment.electricity_code || "";
  if (elements.apartmentHeatingCode) elements.apartmentHeatingCode.value = apartment.heating_code || "";
  if (elements.apartmentWaterCode) elements.apartmentWaterCode.value = apartment.water_code || "";
  if (elements.apartmentWasteCode) elements.apartmentWasteCode.value = apartment.waste_code || "";
  
  // Populate new fields if they exist (will be empty if columns don't exist in DB yet)
  if (elements.apartmentCondition) elements.apartmentCondition.value = apartment.condition || "";
  if (elements.apartmentRooms) elements.apartmentRooms.value = apartment.rooms || "";
  if (elements.apartmentBalconies) elements.apartmentBalconies.value = apartment.balconies || "";
  if (elements.apartmentBathrooms) elements.apartmentBathrooms.value = apartment.bathrooms || "";
  if (elements.apartmentArea) elements.apartmentArea.value = apartment.area || "";
  if (elements.apartmentMunicipality) elements.apartmentMunicipality.value = apartment.municipality || "";
  if (elements.apartmentMonthlyRent) elements.apartmentMonthlyRent.value = apartment.monthly_rent || "";
  if (elements.apartmentDescription) elements.apartmentDescription.value = apartment.description || "";
  
  // Populate features select
  const featuresSelect = elements.apartmentForm.querySelector('select[name="features"]');
  const featuresButtonsContainer = document.getElementById("apartmentFeaturesButtons");
  
  if (featuresSelect) {
    Array.from(featuresSelect.options).forEach(option => {
      option.selected = false;
    });
    
    // Reset all feature buttons
    if (featuresButtonsContainer) {
      featuresButtonsContainer.querySelectorAll('.feature-button').forEach(button => {
        button.classList.remove('selected');
      });
    }
    
    if (apartment.features) {
      try {
        const features = typeof apartment.features === 'string' 
          ? (apartment.features.startsWith('[') ? JSON.parse(apartment.features) : apartment.features.split(',').map(f => f.trim()))
          : apartment.features;
        
        if (Array.isArray(features)) {
          features.forEach(feature => {
            const option = Array.from(featuresSelect.options).find(opt => opt.value === feature);
            if (option) {
              option.selected = true;
            }
            
            // Also update the corresponding button
            if (featuresButtonsContainer) {
              const button = featuresButtonsContainer.querySelector(`.feature-button[data-feature="${feature}"]`);
              if (button) {
                button.classList.add('selected');
              }
            }
          });
        }
      } catch (e) {
        console.error("Error parsing features:", e);
      }
    }
  }
  
  // Also populate checkboxes for backward compatibility
  const featuresCheckboxes = elements.apartmentForm.querySelectorAll('input[name="features"]');
  featuresCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  if (apartment.features) {
    try {
      const features = typeof apartment.features === 'string' 
        ? (apartment.features.startsWith('[') ? JSON.parse(apartment.features) : apartment.features.split(',').map(f => f.trim()))
        : apartment.features;
      
      if (Array.isArray(features)) {
        features.forEach(feature => {
          const checkbox = Array.from(featuresCheckboxes).find(cb => cb.value === feature);
          if (checkbox) checkbox.checked = true;
        });
      }
    } catch (e) {
      console.error("Error parsing features:", e);
    }
  }
  
  // Load map coordinates if they exist
  const latitudeInput = document.getElementById("apartmentLatitude");
  const longitudeInput = document.getElementById("apartmentLongitude");
  const clearPinBtn = document.getElementById("clearMapPin");
  
  // Ensure map is initialized when editing
  if (!mapInitialized) {
    // Map initialization removed
  }
  
  if (apartment.latitude && apartment.longitude) {
    if (latitudeInput) latitudeInput.value = apartment.latitude;
    if (longitudeInput) longitudeInput.value = apartment.longitude;
    
    // Update map after it's initialized (use setTimeout to ensure map is ready)
    const updateMapMarker = () => {
      if (apartmentMap) {
        const lat = parseFloat(apartment.latitude);
        const lng = parseFloat(apartment.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          if (apartmentMarker) {
            apartmentMap.removeLayer(apartmentMarker);
          }
          apartmentMarker = L.marker([lat, lng], {
            draggable: true
          }).addTo(apartmentMap);
          apartmentMap.setView([lat, lng], 15);
          if (clearPinBtn) clearPinBtn.style.display = "block";
          
          apartmentMarker.on('dragend', (e) => {
            const position = apartmentMarker.getLatLng();
            if (latitudeInput) latitudeInput.value = position.lat;
            if (longitudeInput) longitudeInput.value = position.lng;
          });
        }
      } else {
        // Map not ready yet, try again after a short delay
        setTimeout(updateMapMarker, 100);
      }
    };
    
    // Wait a bit for map to initialize if it was just created
    setTimeout(updateMapMarker, 200);
  }
  
  // Load existing photos
  uploadedPhotos = [];
  let existingPhotos = [];
  if (apartment.photos) {
    try {
      existingPhotos = typeof apartment.photos === 'string' 
        ? (apartment.photos.startsWith('[') ? JSON.parse(apartment.photos) : apartment.photos.split(',').map(p => p.trim()))
        : apartment.photos;
    } catch (e) {
      existingPhotos = apartment.photos.split(',').map(p => p.trim());
    }
  }
  
  // Keep all existing photos for display when editing
  uploadedPhotos = existingPhotos;
  
  // Limit to 10 photos when editing
  const maxPhotos = 10;
  if (uploadedPhotos.length > maxPhotos) {
    uploadedPhotos = uploadedPhotos.slice(0, maxPhotos);
    notify("info", translate("photoUploadLimitExceeded") || `Limited to ${maxPhotos} photos.`);
  }
  
  // Update photo previews
  updatePhotoPreviews();
  updatePhotoCount();
  
  // Update form button and show cancel
  if (elements.apartmentSubmitBtn) {
    elements.apartmentSubmitBtn.textContent = translate("updateApartment") || "Update Apartment";
  }
  if (elements.apartmentCancelBtn) {
    elements.apartmentCancelBtn.classList.remove("hidden");
  }
  
  // Scroll to form
  elements.apartmentForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEditApartment() {
  elements.apartmentForm.reset();
  if (elements.apartmentId) elements.apartmentId.value = "";
  uploadedPhotos = [];
  const previewContainer = document.getElementById("photoPreviewContainer");
  if (previewContainer) previewContainer.innerHTML = "";
  
  // Reset feature buttons
  const featuresButtonsContainer = document.getElementById("apartmentFeaturesButtons");
  if (featuresButtonsContainer) {
    featuresButtonsContainer.querySelectorAll('.feature-button').forEach(button => {
      button.classList.remove('selected');
    });
  }
  
  // Clear map
  if (apartmentMarker) {
    apartmentMap.removeLayer(apartmentMarker);
    apartmentMarker = null;
  }
  const latitudeInput = document.getElementById("apartmentLatitude");
  const longitudeInput = document.getElementById("apartmentLongitude");
  const clearPinBtn = document.getElementById("clearMapPin");
  if (latitudeInput) latitudeInput.value = "";
  if (longitudeInput) longitudeInput.value = "";
  if (clearPinBtn) clearPinBtn.style.display = "none";
  if (apartmentMap) {
    apartmentMap.setView([42.6629, 21.1655], 8);
  }
  
  if (elements.apartmentSubmitBtn) {
    elements.apartmentSubmitBtn.textContent = translate("addApartment") || "Add Apartment";
  }
  if (elements.apartmentCancelBtn) {
    elements.apartmentCancelBtn.classList.add("hidden");
  }
}

async function onCreateApartment(event) {
  event.preventDefault();
  
  if (!state.currentUser) {
    notify("error", "You must be logged in to create apartments.");
    return;
  }
  
  // Sync feature buttons with hidden select before form submission
  syncFeatureButtonsToSelect();
  
  const formData = new FormData(event.target);
  const apartmentId = formData.get("apartment_id");
  
  // Use all photos from uploadedPhotos array (includes existing URLs and new data URLs)
  let allPhotos = [...uploadedPhotos];
  
  // Filter out any invalid/empty photos
  allPhotos = allPhotos.filter(photo => photo && typeof photo === 'string' && photo.trim().length > 0);
  
  // Enforce 10 photo limit
  const maxPhotos = 10;
  if (allPhotos.length > maxPhotos) {
    allPhotos = allPhotos.slice(0, maxPhotos);
    notify("info", translate("photoUploadLimitExceeded") || `Limited to ${maxPhotos} photos.`);
  }
  
  let photos = null;
  if (allPhotos.length > 0) {
    photos = JSON.stringify(allPhotos);
  }
  
  // Get selected features from buttons first, then fallback to select
  let features = [];
  const featuresButtonsContainer = document.getElementById("apartmentFeaturesButtons");
  if (featuresButtonsContainer) {
    const selectedButtons = featuresButtonsContainer.querySelectorAll('.feature-button.selected');
    features = Array.from(selectedButtons).map(btn => btn.getAttribute("data-feature"));
  }
  
  // Fallback to select if buttons didn't work
  if (features.length === 0) {
    const featuresSelect = event.target.querySelector('select[name="features"]');
    if (featuresSelect) {
      features = Array.from(featuresSelect.selectedOptions).map(opt => opt.value);
    }
  }
  
  // Also check checkboxes for backward compatibility
  if (features.length === 0) {
    const featuresCheckboxes = event.target.querySelectorAll('input[name="features"]:checked');
    if (featuresCheckboxes.length > 0) {
      features = Array.from(featuresCheckboxes).map(cb => cb.value);
    }
  }
  
  // Ensure features is always an array, even if empty
  const featuresValue = features.length > 0 ? JSON.stringify(features) : null;
  
  // Build payload with core fields that definitely exist in database
  // Based on loadApartments: id, name, address, electricity_code, heating_code, water_code, waste_code, photos
  const payload = {
    name: formData.get("name")?.trim() || null,
    address: formData.get("address")?.trim() || null,
    electricity_code: formData.get("electricity_code")?.trim() || null,
    heating_code: formData.get("heating_code")?.trim() || null,
    water_code: formData.get("water_code")?.trim() || null,
    waste_code: formData.get("waste_code")?.trim() || null,
    photos: photos,
  };
  
  // Only include features if it has a value (will be excluded if column doesn't exist)
  if (featuresValue) {
    payload.features = featuresValue;
  }
  
  // Only include optional fields if they have values
  // Note: Some of these fields may not exist in the database schema
  // They will be excluded if they cause errors
  const optionalFields = {
    description: formData.get("description")?.trim(),
    condition: formData.get("condition")?.trim(),
    rooms: formData.get("rooms")?.trim(),
    balconies: formData.get("balconies")?.trim() || null,
    bathrooms: formData.get("bathrooms")?.trim() || null,
    area: formData.get("area") ? parseFloat(formData.get("area")) : null,
    municipality: formData.get("municipality")?.trim(),
    monthly_rent: formData.get("monthly_rent") ? parseFloat(formData.get("monthly_rent")) : null,
  };
  
  // Only add optional fields if they have actual values (not null/empty)
  Object.keys(optionalFields).forEach(key => {
    const value = optionalFields[key];
    if (value !== null && value !== undefined && value !== '') {
      // For numeric fields, also check if it's a valid number
      if (key === 'area' || key === 'monthly_rent') {
        if (!isNaN(value) && value > 0) {
          payload[key] = value;
        }
      } else {
        payload[key] = value;
      }
    }
  });
  
  // Remove undefined values from payload
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  if (!payload.name) {
    notify("error", translate("errorFieldRequired") || "Name is required");
    return;
  }

  // Show loading state
  const submitBtn = elements.apartmentSubmitBtn;
  const originalText = submitBtn ? submitBtn.textContent : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = apartmentId 
      ? (translate("updating") || "Updating...") 
      : (translate("adding") || "Adding...");
  }

  try {
    // Update or insert
    let error;
    if (apartmentId) {
      // Update existing apartment - don't include landlord_id in updates
      const updatePayload = { ...payload };
      delete updatePayload.landlord_id;
      
      // Try update with all fields first
      ({ error } = await supabase
        .from("apartments")
        .update(updatePayload)
        .eq("id", apartmentId));
      
      // If error is about missing columns, retry with only fields that definitely exist
      if (error && error.code === 'PGRST204') {
        console.warn("Some columns don't exist, retrying with core fields only");
        // Only include fields that are confirmed to exist in the database
        // Based on loadApartments select: id, name, address, electricity_code, heating_code, water_code, waste_code, photos
        const corePayload = {
          name: updatePayload.name,
          address: updatePayload.address,
          electricity_code: updatePayload.electricity_code,
          heating_code: updatePayload.heating_code,
          water_code: updatePayload.water_code,
          waste_code: updatePayload.waste_code,
          photos: updatePayload.photos,
        };
        
        // Don't include features, description, or other optional fields that might not exist
        
        ({ error } = await supabase
          .from("apartments")
          .update(corePayload)
          .eq("id", apartmentId));
      }
      
      if (!error) {
        notify("success", translate("successUpdateApartment") || "Apartment updated successfully!");
      }
    } else {
      // Insert new apartment
      payload.landlord_id = state.currentUser.id;
      ({ error } = await supabase.from("apartments").insert(payload));
      
      if (!error) {
        notify("success", translate("successAddApartment") || "Apartment added successfully!");
      }
    }

    if (error) {
      const errorMessage = error.message || JSON.stringify(error);
      notify("error", translate("errorLoad") || "An error occurred");
      console.error("onCreateApartment error:", error);
      console.error("Error details:", errorMessage);
      console.error("Payload sent:", payload);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
      return;
    }

    cancelEditApartment();
    await loadApartments();
    // Ensure apartments table is rendered after loading
    if (state.contractsLoaded) {
      renderApartmentsTable();
    }
  } catch (err) {
    console.error("onCreateApartment exception:", err);
    notify("error", translate("errorLoad") || "An error occurred");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

let pendingDeleteApartmentId = null;
let pendingDeleteApartmentName = null;

function openDeleteApartmentModal(apartmentId) {
  const apartment = state.apartments.find(a => equalsId(a.id, apartmentId));
  if (!apartment) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Check for active contracts
  const hasActiveContracts = state.contracts.some(
    (c) => equalsId(c.apartment_id, apartmentId) && c.is_active
  );

  if (hasActiveContracts) {
    notify("error", translate("errorDeleteApartmentWithContract"));
    return;
  }
  
  // Check if apartment has any contracts (active or inactive)
  const hasAnyContracts = state.contracts.some(
    (c) => equalsId(c.apartment_id, apartmentId)
  );
  
  pendingDeleteApartmentId = apartmentId;
  pendingDeleteApartmentName = apartment.name;
  
  const modal = document.getElementById("deleteApartmentModal");
  const message = document.getElementById("deleteApartmentMessage");
  const input = document.getElementById("deleteApartmentNameInput");
  const hint = document.getElementById("deleteApartmentHint");
  const confirmBtn = document.getElementById("deleteApartmentConfirm");
  const cancelBtn = document.getElementById("deleteApartmentCancel");
  
  if (!modal || !message || !input || !confirmBtn || !cancelBtn) return;
  
  // Build message
  let messageText = translate("confirmDeleteApartment") || `Are you sure you want to delete "${apartment.name}"?`;
  
  if (hasAnyContracts) {
    const contractCount = state.contracts.filter(c => equalsId(c.apartment_id, apartmentId)).length;
    messageText += `\n\n${translate("warningDeleteApartmentWithContracts") || "Warning: This apartment has contracts. Deleting it may affect related data."}\n\nThis apartment has ${contractCount} contract(s) associated with it. Deleting the apartment will also delete all associated contracts, expenses, and payments. This action cannot be undone.`;
  } else {
    messageText += "\n\nThis action cannot be undone.";
  }
  
  message.textContent = messageText;
  const hintText = (translate("typeApartmentNameHint") || "Type \"{name}\" to confirm").replace("{name}", apartment.name);
  hint.textContent = hintText;
  input.value = "";
  input.placeholder = apartment.name;
  confirmBtn.disabled = true;
  
  // Show modal
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  
  // Focus input
  setTimeout(() => input.focus(), 100);
  
  // Handle input changes
  const checkInput = () => {
    const inputValue = input.value.trim();
    confirmBtn.disabled = inputValue !== apartment.name;
  };
  
  // Remove old listeners and add new ones
  input.removeEventListener("input", checkInput);
  input.addEventListener("input", checkInput);
  
  // Handle Enter key
  const handleEnter = (e) => {
    if (e.key === "Enter" && !confirmBtn.disabled) {
      confirmBtn.click();
    }
  };
  input.removeEventListener("keydown", handleEnter);
  input.addEventListener("keydown", handleEnter);
  
  // Handle confirm button
  const handleConfirm = async () => {
    if (confirmBtn.disabled) return;
    await performDeleteApartment();
  };
  confirmBtn.removeEventListener("click", handleConfirm);
  confirmBtn.addEventListener("click", handleConfirm);
  
  // Handle cancel button
  const handleCancel = () => {
    closeDeleteApartmentModal();
  };
  cancelBtn.removeEventListener("click", handleCancel);
  cancelBtn.addEventListener("click", handleCancel);
  
  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === modal) {
      closeDeleteApartmentModal();
    }
  };
  modal.removeEventListener("click", handleBackdrop);
  modal.addEventListener("click", handleBackdrop);
  
  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      closeDeleteApartmentModal();
    }
  };
  document.removeEventListener("keydown", handleEscape);
  document.addEventListener("keydown", handleEscape);
}

function closeDeleteApartmentModal() {
  const modal = document.getElementById("deleteApartmentModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
  pendingDeleteApartmentId = null;
  pendingDeleteApartmentName = null;
}

async function performDeleteApartment() {
  if (!pendingDeleteApartmentId) return;
  
  const apartmentId = pendingDeleteApartmentId;
  closeDeleteApartmentModal();
  
  // Delete the apartment
  const { error } = await supabase
    .from("apartments")
    .delete()
    .eq("id", apartmentId);
  
  if (error) {
    notify("error", translate("errorLoad"));
    console.error("performDeleteApartment", error);
    return;
  }
  
  notify("success", translate("successDeleteApartment") || "Apartment deleted successfully!");
  await loadApartments();
  // Ensure apartments table is rendered after loading
  if (state.contractsLoaded) {
    renderApartmentsTable();
  }
}

async function handleDeleteApartment(apartmentId) {
  if (!apartmentId) return;
  openDeleteApartmentModal(apartmentId);
}

async function onCreateTenant(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    full_name: formData.get("full_name")?.trim(),
    email: formData.get("email")?.trim() || null,
    phone: formData.get("phone")?.trim() || null,
  };

  if (!payload.full_name) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const { error } = await supabase.from("tenants").insert(payload);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("onCreateTenant", error);
    return;
  }

  event.target.reset();
  notify("success", translate("successAddTenant"));
  loadTenants();
}

async function onCreateContract(event) {
  event.preventDefault();
  const formData = new FormData(event.target);

  const payload = {
    apartment_id: formData.get("apartment_id"),
    tenant_id: formData.get("tenant_id"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date") || null,
    monthly_rent: parseFloat(formData.get("monthly_rent")) || 0,
    monthly_garbage: parseFloat(formData.get("monthly_garbage")) || 0,
    monthly_maintenance: parseFloat(formData.get("monthly_maintenance")) || 0,
    deposit_amount: parseFloat(formData.get("deposit_amount")) || 0,
    is_active: formData.get("is_active") === "on",
  };

  if (!payload.apartment_id || !payload.tenant_id || !payload.start_date) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const { error } = await supabase.from("contracts").insert(payload);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("onCreateContract", error);
    return;
  }

  event.target.reset();
  elements.contractActive.checked = true;
  notify("success", translate("successAddContract"));
  loadContracts();
}

async function onCreateDebt(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  let debtTypeValue = formData.get("type");
  const lockedType = getActiveExpenseType();
  if (!debtTypeValue && lockedType) {
    debtTypeValue = lockedType;
  }
  
  // Use global filter values if set (since disabled fields don't submit)
  let contractId = formData.get("contract_id");
  let tenantId = formData.get("tenant_id");
  
  if (state.globalContractFilter) {
    contractId = state.globalContractFilter;
    const contract = state.contracts.find(c => equalsId(c.id, state.globalContractFilter));
    if (contract) {
      tenantId = contract.tenant_id;
    }
  }
  
  const basePayload = {
    contract_id: contractId,
    tenant_id: tenantId,
    type: debtTypeValue,
    amount: normalizeCurrency(formData.get("amount")),
    due_date: formData.get("due_date"),
    notes: null,
  };

  const customNotesRaw = formData.get("notes")?.trim() || "";
  const customNotesClean = stripElectricityCutMarker(customNotesRaw);
  const isElectricityCutSelected =
    debtTypeValue === "electricity" &&
    !!elements.debtElectricityCut &&
    elements.debtElectricityCut.checked;
  let finalNotes = customNotesClean;
  if (isElectricityCutSelected) {
    const cutNoteText = buildElectricityCutNoteText(basePayload.due_date);
    const remainingNotes = removeElectricityCutNotePrefix(
      customNotesClean,
      cutNoteText
    );
    const noteParts = [];
    if (cutNoteText) {
      noteParts.push(cutNoteText);
    }
    if (remainingNotes) {
      noteParts.push(remainingNotes);
    }
    if (noteParts.length) {
      finalNotes = `${ELECTRICITY_CUT_MARKER}${noteParts.join(" — ")}`;
    } else {
      finalNotes = ELECTRICITY_CUT_MARKER;
    }
  }
  const payload = {
    ...basePayload,
    notes: finalNotes || null,
  };

  if (
    !basePayload.contract_id ||
    !basePayload.tenant_id ||
    !basePayload.type ||
    !basePayload.due_date
  ) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const isEditing = !!state.editingDebtId;
  const existingDebt = isEditing
    ? state.debts.find((debt) => equalsId(debt.id, state.editingDebtId))
    : null;
  const contract = getContractById(basePayload.contract_id);
  if (!contract) {
    notify("error", translate("errorInactiveContract"));
    return;
  }
  if (
    !contract.is_active &&
    (!isEditing || !existingDebt || !equalsId(existingDebt.contract_id, contract.id))
  ) {
    notify("error", translate("errorInactiveContract"));
    return;
  }

  // Get the correct table for this expense type
  const tableInfo = EXPENSE_TABLES[debtTypeValue];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown expense type:", debtTypeValue);
    return;
  }
  
  const isUtility = isUtilityType(debtTypeValue);

  if (isEditing) {
    const billPayload = tableInfo.hasStatus
      ? {
          tenant_id: basePayload.tenant_id,
          contract_id: basePayload.contract_id,
          amount: basePayload.amount,
          bill_date: basePayload.due_date,
          due_date: basePayload.due_date,
          notes: finalNotes || null,
        }
      : {
          tenant_id: basePayload.tenant_id,
          contract_id: basePayload.contract_id,
          amount: basePayload.amount,
          bill_date: basePayload.due_date,
          notes: finalNotes || null,
        };
    
    const { error } = await supabase
      .from(tableInfo.bills)
      .update(billPayload)
      .eq("id", state.editingDebtId);

    if (error) {
      notify("error", translate("errorLoad"));
      console.error("onUpdateDebt", error);
      return;
    }

    resetDebtForm();
    notify("success", translate("successUpdateDebt"), "edit");
  } else {
    // Generate reference number for new expense
    const reference = await generateNextReferenceNumber();
    
    const billPayload = tableInfo.hasStatus
      ? {
          tenant_id: basePayload.tenant_id,
          contract_id: basePayload.contract_id,
          amount: basePayload.amount,
          bill_date: basePayload.due_date,
          due_date: basePayload.due_date,
          notes: finalNotes || null,
          is_paid: false,
          reference: reference,
        }
      : {
          tenant_id: basePayload.tenant_id,
          contract_id: basePayload.contract_id,
          amount: basePayload.amount,
          bill_date: basePayload.due_date,
          notes: finalNotes || null,
          reference: reference,
        };

    const { error } = await supabase
      .from(tableInfo.bills)
      .insert(billPayload);

    if (error) {
      notify("error", translate("errorLoad"));
      console.error("onCreateDebt", error);
      return;
    }

    resetDebtForm();
    notify("success", translate("successAddDebt"), "save");
  }

  await loadDebts();
}

async function handleSaveDebt(debtId) {
  if (!debtId || !state.editingDebtId || !equalsId(state.editingDebtId, debtId)) {
    return;
  }

  // Find the row that's being edited
  const row = document.querySelector(`tr.editing-row button[data-action="save-debt"][data-id="${debtId}"]`)?.closest("tr");
  if (!row) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Get the edited values from the input fields
  const typeSelect = row.querySelector('select[data-field="type"]');
  const amountInput = row.querySelector('input[data-field="amount"]');
  const dueDateInput = row.querySelector('input[data-field="due_date"]');
  const notesInput = row.querySelector('input[data-field="notes"]');

  if (!typeSelect || !amountInput || !dueDateInput) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const debtType = typeSelect.value;
  const amount = normalizeCurrency(amountInput.value);
  const dueDate = dueDateInput.value.trim();
  const notes = notesInput?.value.trim() || null;

  if (!debtType || !dueDate || amount <= 0) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  // Get the original debt to preserve contract_id and tenant_id
  const debt = state.debts.find((d) => equalsId(d.id, debtId));
  if (!debt) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Get the correct table for this debt type
  const tableInfo = EXPENSE_TABLES[debt.type];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown debt type:", debt.type);
    return;
  }

  // Prepare the payload
  const payload = tableInfo.hasStatus
    ? {
    amount: amount,
        bill_date: dueDate,
    due_date: dueDate,
    notes: notes,
        contract_id: debt.contract_id,
        tenant_id: debt.tenant_id,
      }
    : {
        amount: amount,
        bill_date: dueDate,
        notes: notes,
    contract_id: debt.contract_id,
    tenant_id: debt.tenant_id,
  };

  // Update the bill in the correct table
  const { error } = await supabase
    .from(tableInfo.bills)
    .update(payload)
    .eq("id", debtId);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleSaveDebt", error);
    return;
  }

  // Cancel edit mode and reload data
  cancelEditDebt();
  notify("success", translate("successUpdateDebt"), "edit");
  await loadDebts();
}

function cancelEditDebt() {
  state.editingDebtId = null;
  renderDebtsTable();
}

async function onCreatePayment(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const selectedValue = formData.get("debt_id");
  if (!selectedValue) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const amountValue = formData.get("amount");
  const paymentAmount = normalizeCurrency(amountValue);
  const paymentDate = formData.get("payment_date");
  
  // Get payment method from buttons or input field
  let method = null;
  const activeButton = document.querySelector('.payment-form-method-btn.active');
  if (activeButton) {
    const methodValue = activeButton.dataset.method;
    if (methodValue === 'custom') {
      // Custom button selected, use input value
      method = elements.paymentMethod?.value.trim() || null;
    } else {
      method = methodValue;
    }
  } else {
    // No button selected, check input field
    method = formData.get("method")?.trim() || null;
  }
  
  if (!paymentDate || paymentAmount <= 0) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const isEditing = !!state.editingPaymentId;
  const existingPayment = isEditing
    ? state.payments.find((payment) =>
        equalsId(payment.id, state.editingPaymentId)
      )
    : null;
  const debt = state.debts.find((d) => equalsId(d.id, selectedValue));

  if (isEditing) {
    // Always use debt's reference
    const paymentReference = debt?.reference || null;
    
    // Get the correct table for this payment type
    const paymentType = existingPayment?.type || debt?.type;
    const tableInfo = EXPENSE_TABLES[paymentType];
    if (!tableInfo) {
      notify("error", translate("errorLoad"));
      console.error("Unknown payment type:", paymentType);
      return;
    }
    
    const payload = {
      bill_id: selectedValue || null,
      tenant_id: debt?.tenant_id || existingPayment?.tenant_id || null,
      contract_id: debt?.contract_id || existingPayment?.contract_id || null,
      amount: paymentAmount,
      payment_date: paymentDate,
      method,
    };

    const { error } = await supabase
      .from(tableInfo.payments)
      .update(payload)
      .eq("id", state.editingPaymentId);

    if (error) {
      notify("error", translate("errorLoad"));
      console.error("onUpdatePayment", error);
      return;
    }

    // Reload payments to calculate total payments for this debt after update
    await loadPayments();
    
    if (debt && tableInfo.hasStatus) {
      // Calculate total payments for this debt
      const debtPayments = (state.payments || []).filter(
        (p) => equalsId(p.bill_id, debt.id)
      );
      const totalPaid = debtPayments.reduce(
        (sum, payment) => sum + normalizeCurrency(payment.amount),
        0
      );
      const debtAmount = normalizeCurrency(debt.amount);

      // Mark debt as paid only if total payments >= debt amount
      if (totalPaid >= debtAmount - 0.001) {
        const { error: debtUpdateError } = await supabase
          .from(tableInfo.bills)
          .update({ is_paid: true })
          .eq("id", debt.id);
        if (debtUpdateError) {
          console.error("onUpdatePayment.markDebtPaid", debtUpdateError);
        }
      } else {
        // If total payments are less than debt amount, mark as unpaid
        const { error: debtUpdateError } = await supabase
          .from(tableInfo.bills)
          .update({ is_paid: false })
          .eq("id", debt.id);
        if (debtUpdateError) {
          console.error("onUpdatePayment.markDebtUnpaid", debtUpdateError);
        }
      }
    }

    resetPaymentForm();
    notify("success", translate("successUpdatePayment"), "edit");
    await loadDebts();
    return;
  }

  // Handle utility grouped payment (by tenant)
  if (isUtilityGroupedValue(selectedValue)) {
    await processUtilityTenantPayment({
      utilityType: getUtilityGroupedType(selectedValue),
      tenantId: getUtilityGroupedTenantId(selectedValue),
      amount: paymentAmount,
      paymentDate,
      method,
    });
    return;
  }

  if (isGroupedDebtValue(selectedValue)) {
    await processGroupedUtilityPayment({
      groupType: getGroupedDebtType(selectedValue),
      amount: paymentAmount,
      paymentDate,
      method,
      reference: null, // Reference will come from individual debts
    });
    return;
  }

  // Handle direct payment for utility types (no expense required)
  if (isDirectPaymentValue(selectedValue)) {
    await processDirectUtilityPayment({
      utilityType: getDirectPaymentType(selectedValue),
      amount: paymentAmount,
      paymentDate,
      method,
    });
    return;
  }

  if (!debt) {
    notify("error", translate("errorLoad"));
    return;
  }

  const debtAmount = normalizeCurrency(debt.amount);
  
  // Calculate existing payments for this debt to get remaining amount
  const existingPayments = (state.payments || []).filter(
    (p) => equalsId(p.debt_id, selectedValue)
  );
  const totalPaidForDebt = existingPayments.reduce(
    (sum, payment) => sum + normalizeCurrency(payment.amount),
    0
  );
  const remainingDebtAmount = Math.max(0, normalizeCurrency(debtAmount - totalPaidForDebt));

  // Always use debt's reference (connected to expense)
  const paymentReference = debt.reference || null;

  // Prepare payments array - will contain at least one payment for the selected debt
  const paymentsPayload = [];
  
  // Record the full payment amount on the selected debt (allows overpayment/negative balance)
  paymentsPayload.push({
    debt_id: selectedValue,
    tenant_id: debt.tenant_id || null,
    contract_id: debt.contract_id || null,
    amount: paymentAmount,
    payment_date: paymentDate,
    method,
    reference: paymentReference,
  });

  // Calculate excess for potential distribution to other debts (optional, keeping for future use)
  let excessAmount = 0; // No longer distributing excess - full amount goes to selected debt

  // If there's excess amount, distribute it to other unpaid debts of the same tenant
  if (excessAmount > 0.001 && debt.tenant_id) {
    // Find other unpaid debts for the same tenant (excluding the selected debt)
    const otherUnpaidDebts = state.debts
      .filter((d) => 
        equalsId(d.tenant_id, debt.tenant_id) && 
        !equalsId(d.id, selectedValue) && 
        !d.is_paid
      )
      .sort(sortDebtsByDueDateAsc);

    // Distribute excess to other debts
    for (const otherDebt of otherUnpaidDebts) {
      if (excessAmount <= 0.001) break;

      const otherDebtAmount = normalizeCurrency(otherDebt.amount);
      const otherDebtPayments = (state.payments || []).filter(
        (p) => equalsId(p.debt_id, otherDebt.id)
      );
      const otherDebtTotalPaid = otherDebtPayments.reduce(
        (sum, payment) => sum + normalizeCurrency(payment.amount),
        0
      );
      const otherDebtRemaining = Math.max(0, normalizeCurrency(otherDebtAmount - otherDebtTotalPaid));

      if (otherDebtRemaining > 0.001) {
        const amountToApply = Math.min(excessAmount, otherDebtRemaining);
        paymentsPayload.push({
          debt_id: otherDebt.id,
          tenant_id: otherDebt.tenant_id || null,
          contract_id: otherDebt.contract_id || null,
          amount: amountToApply,
          payment_date: paymentDate,
          method,
          reference: otherDebt.reference || null,
        });
        excessAmount = normalizeCurrency(excessAmount - amountToApply);
      }
    }
  }

  if (paymentsPayload.length === 0) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Get the correct payment table for this expense type
  const debtType = debt.type;
  const tableInfo = EXPENSE_TABLES[debtType];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown expense type:", debtType);
    return;
  }

  // Transform payments for the split table (bill_id instead of debt_id)
  const splitPaymentsPayload = paymentsPayload.map(p => ({
    bill_id: p.debt_id,
    tenant_id: p.tenant_id,
    contract_id: p.contract_id,
    amount: p.amount,
    payment_date: p.payment_date,
    method: p.method,
  }));

  // Insert payments into the correct split table
  const { error } = await supabase.from(tableInfo.payments).insert(splitPaymentsPayload);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("onCreatePayment", error);
    return;
  }

  // Reload payments to calculate total payments for all affected debts
  await loadPayments();
  
  // Mark all affected bills as paid if they are fully paid (only for types with status)
  if (tableInfo.hasStatus) {
    const affectedBillIds = [...new Set(paymentsPayload.map(p => p.debt_id))];
  
    for (const billId of affectedBillIds) {
      const affectedBill = state.debts.find((d) => equalsId(d.id, billId));
      if (!affectedBill) continue;

      const affectedBillPayments = (state.payments || []).filter(
        (p) => equalsId(p.bill_id, billId) || equalsId(p.debt_id, billId)
    );
      const affectedBillTotalPaid = affectedBillPayments.reduce(
      (sum, payment) => sum + normalizeCurrency(payment.amount),
      0
    );
      const affectedBillAmount = normalizeCurrency(affectedBill.amount);

      // Mark bill as paid if total payments >= bill amount
      if (affectedBillTotalPaid >= affectedBillAmount - 0.001) {
        const { error: billUpdateError } = await supabase
          .from(tableInfo.bills)
          .update({ is_paid: true })
          .eq("id", billId);
        if (billUpdateError) {
          console.error("autoMarkBillPaid", billUpdateError);
        }
      }
    }
  }

  resetPaymentForm();
  notify("success", translate("successAddPayment"), "save");
  await loadDebts();
}

// Process utility payment grouped by tenant (shows total, pays toward bills)
async function processUtilityTenantPayment({ utilityType, tenantId, amount, paymentDate, method }) {
  if (!utilityType || !tenantId) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  // Get the correct payment table for this type
  const tableInfo = EXPENSE_TABLES[utilityType];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown expense type:", utilityType);
    return;
  }

  // Get contract from tenant
  let contractId = state.globalContractFilter || null;
  if (!contractId) {
    const contract = state.contracts.find(c => equalsId(c.tenant_id, tenantId) && c.is_active);
    if (contract) {
      contractId = contract.id;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  
  // Insert into the correct payment table
  const { error } = await supabase.from(tableInfo.payments).insert({
    tenant_id: tenantId,
    contract_id: contractId,
    bill_id: null, // Payment applies to total, not specific bill
    amount: amount,
    payment_date: paymentDate || today,
    method,
  });

  if (!error) {
    resetPaymentForm();
    notify("success", translate("successAddPayment"), "save");
    await loadPayments();
    await loadDebts();
  } else {
    notify("error", translate("errorLoad"));
    console.error("processUtilityTenantPayment", error);
  }
}

// Process direct utility payment (without requiring an expense)
async function processDirectUtilityPayment({ utilityType, amount, paymentDate, method }) {
  if (!utilityType) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  // Get the correct payment table for this type
  const tableInfo = EXPENSE_TABLES[utilityType];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown expense type:", utilityType);
    return;
  }

  // Try to get tenant from global filter, existing bills/debts, or from the expense form
  let tenantId = null;
  let contractId = state.globalContractFilter || elements.debtContract?.value || null;
  
  // Get tenant from contract if we have one
  if (contractId) {
    const contract = state.contracts.find(c => equalsId(c.id, contractId));
    if (contract) {
      tenantId = contract.tenant_id;
    }
  }
  
  // Fall back to form value
  if (!tenantId) {
    tenantId = elements.debtTenant?.value || null;
  }
  
  // If no tenant selected in form, try to get from existing bills
  if (!tenantId) {
    const stateKey = EXPENSE_STATE_KEYS[utilityType];
    const existingBill = state[stateKey.bills]?.find(b => b.tenant_id);
    if (existingBill) {
      tenantId = existingBill.tenant_id;
      contractId = existingBill.contract_id || null;
    }
  }
  
  // If still no tenant, try to get from any active contract
  if (!tenantId && state.contracts.length > 0) {
    const activeContract = state.contracts.find(c => c.is_active);
    if (activeContract) {
      tenantId = activeContract.tenant_id;
      contractId = activeContract.id;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  
  // Insert into the correct payment table
  const { error } = await supabase.from(tableInfo.payments).insert({
    tenant_id: tenantId,
    contract_id: contractId || null,
    bill_id: null, // Direct payment - no bill linked
    amount: amount,
    payment_date: paymentDate || today,
    method,
  });

  if (!error) {
    // Success
    resetPaymentForm();
    notify("success", translate("successAddPayment"), "save");
    await loadPayments();
    await loadDebts();
    return;
  }

  // Error inserting payment
  console.error("Error inserting payment:", error);
  notify("error", translate("errorLoad"));
  return;
}


async function processGroupedUtilityPayment({ groupType, amount, paymentDate, method }) {
  if (!groupType) {
    notify("error", translate("paymentGroupNoDebts"));
    return;
  }

  const debtsOfType = state.debts
    .filter((debt) => !debt.is_paid && debt.type === groupType)
    .sort(sortDebtsByDueDateAsc);

  if (!debtsOfType.length) {
    notify("error", translate("paymentGroupNoDebts"));
    return;
  }

  let remainingAmount = amount;
  const paymentsPayload = [];

  for (const debt of debtsOfType) {
    const debtAmount = normalizeCurrency(debt.amount);
    if (debtAmount <= 0) continue;
    if (remainingAmount <= 0.001) break;

    // Always use debt's reference (connected to expense)
    const paymentReference = debt.reference || null;

    // Calculate existing payments for this debt
    const existingPayments = (state.payments || []).filter(
      (p) => equalsId(p.debt_id, debt.id)
    );
    const totalPaid = existingPayments.reduce(
      (sum, payment) => sum + normalizeCurrency(payment.amount),
      0
    );
    const remainingDebtAmount = normalizeCurrency(debtAmount - totalPaid);

    if (remainingAmount >= remainingDebtAmount - 0.001) {
      // Fully pay this debt (enough to cover remaining amount)
      paymentsPayload.push({
        debt_id: debt.id,
        tenant_id: debt.tenant_id || null,
        contract_id: debt.contract_id || null,
        amount: remainingDebtAmount,
        payment_date: paymentDate,
        method,
        reference: paymentReference,
      });
      remainingAmount = normalizeCurrency(remainingAmount - remainingDebtAmount);
    } else {
      // Partially pay this debt
      const paymentAmount = remainingAmount;
      paymentsPayload.push({
        debt_id: debt.id,
        tenant_id: debt.tenant_id || null,
        contract_id: debt.contract_id || null,
        amount: paymentAmount,
        payment_date: paymentDate,
        method,
        reference: paymentReference,
      });
      remainingAmount = 0;
      break;
    }
  }

  if (!paymentsPayload.length) {
    notify("error", translate("paymentGroupInsufficient"));
    return;
  }

  // Get the correct payment table for this type
  const tableInfo = EXPENSE_TABLES[groupType];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown expense type:", groupType);
    return;
  }

  // Transform payments for the split table (bill_id instead of debt_id)
  const splitPaymentsPayload = paymentsPayload.map(p => ({
    bill_id: p.debt_id,
    tenant_id: p.tenant_id,
    contract_id: p.contract_id,
    amount: p.amount,
    payment_date: p.payment_date,
    method: p.method,
  }));

  const { error } = await supabase.from(tableInfo.payments).insert(splitPaymentsPayload);
  if (error) {
    notify("error", translate("errorLoad"));
    console.error("processGroupedUtilityPayment.insert", error);
    return;
  }

  // Reload payments to calculate total payments for all affected bills
  await loadPayments();

  // Calculate total payments for each affected bill and mark as paid if fully paid (only for types with status)
  if (tableInfo.hasStatus) {
    const affectedBillIds = [...new Set(paymentsPayload.map(p => p.debt_id))];
    for (const billId of affectedBillIds) {
      const bill = state.debts.find((d) => equalsId(d.id, billId));
      if (!bill) continue;

      const billPayments = (state.payments || []).filter(
        (p) => equalsId(p.bill_id, billId)
    );
      const totalPaid = billPayments.reduce(
      (sum, payment) => sum + normalizeCurrency(payment.amount),
      0
    );
      const billAmount = normalizeCurrency(bill.amount);

      // Mark bill as paid only if total payments >= bill amount
      if (totalPaid >= billAmount - 0.001) {
        const { error: billUpdateError } = await supabase
          .from(tableInfo.bills)
          .update({ is_paid: true })
          .eq("id", billId);
        if (billUpdateError) {
          console.error("processGroupedUtilityPayment.markBillPaid", billUpdateError);
        }
      }
    }
  }

  resetPaymentForm();
  notify("success", translate("successAddPayment"));
  await loadPayments();
  await loadDebts();

  // Calculate outstanding total
  let outstandingTotal = 0;
  for (const debt of debtsOfType) {
    const debtPayments = (state.payments || []).filter(
      (p) => equalsId(p.bill_id, debt.id)
    );
    const totalPaid = debtPayments.reduce(
      (sum, payment) => sum + normalizeCurrency(payment.amount),
      0
    );
    const remaining = normalizeCurrency(debt.amount) - totalPaid;
    if (remaining > 0.001) {
      outstandingTotal += remaining;
    }
  }
  if (outstandingTotal > 0.009) {
    const typeLabel =
      translate(`debt${capitalize(groupType)}`) || sanitize(groupType);
    notify(
      "info",
      `${translate("paymentGroupRemainingPrefix")} ${typeLabel}: ${formatCurrency(
        outstandingTotal
      )}`
    );
  }
  if (remainingAmount > 0.009) {
    notify(
      "info",
      `${translate("paymentGroupUnusedAmountPrefix")}: ${formatCurrency(
        remainingAmount
      )}`
    );
  }
  updatePaymentDebtSummary(true);
}

function handleMarkDebtPaid(debtId) {
  // Find the debt
  const debt = state.debts.find((d) => equalsId(d.id, debtId));
  if (!debt) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Store the debt ID in state for the modal
  state.markPaidDebtId = debtId;

  // Set the amount (read-only)
  if (elements.markPaidAmount) {
    elements.markPaidAmount.value = parseFloat(debt.amount) || 0;
  }

  // Set today's date by default
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  
  if (elements.markPaidDay) elements.markPaidDay.value = day;
  if (elements.markPaidMonth) elements.markPaidMonth.value = month;
  if (elements.markPaidYear) elements.markPaidYear.value = year;
  if (elements.markPaidDate) {
    elements.markPaidDate.value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Reset payment method
  if (elements.markPaidMethod) {
    elements.markPaidMethod.value = '';
    elements.markPaidMethod.style.display = 'none';
  }

  // Reset all payment method buttons
  const methodButtons = document.querySelectorAll('.payment-method-btn');
  methodButtons.forEach(btn => btn.classList.remove('active'));

  // Show modal
  if (elements.markPaidModal) {
    elements.markPaidModal.style.display = 'flex';
  }
}

async function submitMarkPaidPayment() {
  const debtId = state.markPaidDebtId;
  if (!debtId) return;

  const debt = state.debts.find((d) => equalsId(d.id, debtId));
  if (!debt) {
    notify("error", translate("errorLoad"));
    return;
  }

  // Get values from form
  const amount = parseFloat(elements.markPaidAmount?.value) || 0;
  const paymentDate = elements.markPaidDate?.value || new Date().toISOString().split('T')[0];
  let method = elements.markPaidMethod?.value.trim() || null;

  // If method is empty, check which button is active
  if (!method) {
    const activeButton = document.querySelector('.payment-method-btn.active');
    if (activeButton) {
      const methodValue = activeButton.dataset.method;
      if (methodValue === 'custom') {
        if (!elements.markPaidMethod?.value.trim()) {
          notify("error", translate("errorFieldRequired") || "Please enter a payment method");
          return;
        }
        method = elements.markPaidMethod.value.trim();
      } else {
        method = methodValue;
      }
    }
  }

  if (!method) {
    notify("error", translate("errorFieldRequired") || "Please select a payment method");
    return;
  }

  // Get the correct table for this debt type
  const tableInfo = EXPENSE_TABLES[debt.type];
  if (!tableInfo) {
    notify("error", translate("errorLoad"));
    console.error("Unknown debt type:", debt.type);
    return;
  }

  // Get contract and tenant info from debt
  const contract = state.contracts.find((c) => equalsId(c.id, debt.contract_id));
  const tenantId = contract?.tenant_id || debt.tenant_id || null;

  // Create payment in the correct table
  const paymentPayload = {
    bill_id: debtId,
    tenant_id: tenantId,
    contract_id: debt.contract_id || null,
    amount: amount,
    payment_date: paymentDate,
    method: method,
  };

  const { error: paymentError } = await supabase
    .from(tableInfo.payments)
    .insert(paymentPayload);

  if (paymentError) {
    notify("error", translate("errorLoad"));
    console.error("submitMarkPaidPayment", paymentError);
    return;
  }

  // Mark bill as fully paid (only for types with status)
  if (tableInfo.hasStatus) {
  const { error: debtError } = await supabase
      .from(tableInfo.bills)
      .update({ is_paid: true })
    .eq("id", debtId);

  if (debtError) {
    console.error("submitMarkPaidPayment.debtUpdate", debtError);
    }
  }

  // Close modal
  if (elements.markPaidModal) {
    elements.markPaidModal.style.display = 'none';
  }

  // Clear state
  state.markPaidDebtId = null;

  // Show success and reload
  notify("success", translate("successMarkPaid"), "edit");
  if (state.editingDebtId && equalsId(state.editingDebtId, debtId)) {
    resetDebtForm();
  }
  await loadDebts();
  await loadPayments();
}

function formatDebtOption(debt) {
  const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
  const status = getDebtStatus(debt);
  const typeLabel = getDebtTypeLabel(debt);
  return `${sanitize(tenant?.full_name || translate("unknown"))} — ${sanitize(
    typeLabel
  )} — ${formatCurrency(debt.amount)} — ${formatDate(debt.due_date)} (${
    status.label
  })`;
}

function getDebtOptionLabel(debt) {
  if (!debt) return translate("unknown");
  const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
  const typeLabel = getDebtTypeLabel(debt);
  return `${tenant?.full_name || translate("unknown")} — ${typeLabel} — ${formatCurrency(
    debt.amount
  )} — ${formatDate(debt.due_date)}`;
}

function isElectricityCutDebt(debt) {
  if (!debt || !debt.notes) return false;
  const noteText = String(debt.notes);
  return noteText.startsWith(ELECTRICITY_CUT_MARKER);
}

function stripElectricityCutMarker(value) {
  if (!value) return "";
  const text = String(value);
  if (text.startsWith(ELECTRICITY_CUT_MARKER)) {
    return text.slice(ELECTRICITY_CUT_MARKER.length).trim();
  }
  return text.trim();
}

function getNoteDisplayDate(value) {
  if (!value) return "";
  const formatted = formatDate(value);
  if (formatted && formatted !== "-") {
    return formatted;
  }
  return value;
}

function buildElectricityCutNoteText(dueDate) {
  const prefix = translate("electricityCutNotePrefix") || "";
  if (!prefix) return "";
  const dateText = getNoteDisplayDate(dueDate);
  return dateText ? `${prefix} ${dateText}` : prefix;
}

function removeElectricityCutNotePrefix(notes, cutNoteText) {
  if (!notes) return "";
  const trimmed = notes.trim();
  if (cutNoteText && trimmed.startsWith(cutNoteText)) {
    const remainder = trimmed.slice(cutNoteText.length);
    return remainder.replace(/^[\s—–-]+/, "").trim();
  }
  const prefix = translate("electricityCutNotePrefix") || "";
  if (prefix && trimmed.startsWith(prefix)) {
    let remainder = trimmed.slice(prefix.length);
    const separatorIndex = remainder.indexOf("—");
    if (separatorIndex >= 0) {
      remainder = remainder.slice(separatorIndex + 1);
    } else {
      remainder = "";
    }
    return remainder.replace(/^[\s—–-]+/, "").trim();
  }
  return trimmed;
}

function getDebtTypeLabel(debt) {
  if (!debt) return translate("unknown") || "";
  if (debt.type === "electricity" && isElectricityCutDebt(debt)) {
    return (
      translate("debtElectricityCut") ||
      translate("debtElectricity") ||
      debt.type
    );
  }
  return (
    translate(`debt${capitalize(debt.type)}`) ||
    debt.type ||
    translate("unknown")
  );
}

function getDebtStatus(debt) {
  if (debt.is_paid) {
    return { label: translate("paid"), class: "paid" };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (debt.due_date && debt.due_date < today) {
    return { label: translate("overdue"), class: "overdue" };
  }
  return { label: translate("open"), class: "open" };
}

function sortDebtsByDueDateAsc(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
  if (aTime !== bTime) {
    return aTime - bTime;
  }
  return normalizeCurrency(a.amount) - normalizeCurrency(b.amount);
}

function equalsId(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  return String(a) === String(b);
}

function sanitize(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatNumber(value) {
  const number =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseFloat(value) || 0;
  try {
    return new Intl.NumberFormat(
      state.language === "sq" ? "sq-AL" : "en-US"
    ).format(number);
  } catch {
    return String(number);
  }
}

function normalizeCurrency(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

function incrementPdfGeneratedCount() {
  state.pdfGeneratedCount = (state.pdfGeneratedCount || 0) + 1;
  try {
    window.localStorage.setItem(
      "pdfGeneratedCount",
      String(state.pdfGeneratedCount)
    );
  } catch {
    // Ignore storage errors (e.g., quota exceeded or disabled storage)
  }
  renderAdminSummary();
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "-";
  }
  const formatted = new Intl.NumberFormat(state.language === "sq" ? "sq-AL" : "en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
  return `${formatted}€`;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value; // Return original value if date is invalid
    }
    
    // Format as DD.MM.YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch {
    return value;
  }
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function getNextReferenceNumberValue() {
  try {
    // Query all split bill tables to find the highest reference number
    const tables = Object.values(EXPENSE_TABLES).map(t => t.bills);
    const queries = tables.map(table => 
      supabase
        .from(table)
      .select("reference")
      .not("reference", "is", null)
      .order("reference", { ascending: false })
        .limit(1)
    );

    const results = await Promise.all(queries);

    let maxRef = 0;
    for (const result of results) {
      if (!result.error && result.data && result.data.length > 0) {
        const ref = result.data[0].reference;
        // Parse REF-000001 format or plain number
        let refNum = 0;
        if (typeof ref === 'string' && ref.startsWith('REF-')) {
          refNum = parseInt(ref.replace('REF-', ''), 10) || 0;
        } else {
          refNum = typeof ref === 'number' ? ref : parseInt(ref, 10) || 0;
        }
        if (refNum > maxRef) maxRef = refNum;
      }
    }

    return maxRef + 1;
  } catch (error) {
    console.error("getNextReferenceNumberValue", error);
    return 1;
  }
}

async function generateNextReferenceNumber() {
  const nextNum = await getNextReferenceNumberValue();
  return 'REF-' + String(nextNum).padStart(6, '0');
}

function formatReferenceNumber(ref) {
  // Display reference as-is (REF-000001 format)
  if (!ref) return '';
  return String(ref);
}

// Authentication Functions
async function checkAuth() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // Not authenticated
      state.currentUser = null;
      return false;
    }
    if (user) {
      state.currentUser = user;
      updateAuthUI();
      return true;
    }
    state.currentUser = null;
    return false;
  } catch (error) {
    console.error("checkAuth error:", error);
    state.currentUser = null;
    return false;
  }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    state.currentUser = session.user;
    showAdminView();
    updateAuthUI();
    loadInitialData();
  } else if (event === 'SIGNED_OUT') {
    state.currentUser = null;
    showLoginView();
    updateAuthUI();
  }
});

async function handleLogin(event) {
  event.preventDefault();
  if (!elements.loginForm) return;

  const formData = new FormData(elements.loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  if (elements.loginError) {
    elements.loginError.style.display = "none";
    elements.loginError.textContent = "";
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    state.currentUser = data.user;
    notify("success", translate("loginSuccess"));
    showAdminView();
    loadInitialData();
    if (elements.loginForm) elements.loginForm.reset();
  } catch (error) {
    console.error("Login error:", error);
    if (elements.loginError) {
      elements.loginError.textContent = translate("loginError") || error.message;
      elements.loginError.style.display = "block";
    }
  }
}

async function handleSignup(event) {
  event.preventDefault();
  if (!elements.signupForm) return;

  const formData = new FormData(elements.signupForm);
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (elements.signupError) {
    elements.signupError.style.display = "none";
    elements.signupError.textContent = "";
  }

  // Validate passwords match
  if (password !== confirmPassword) {
    if (elements.signupError) {
      elements.signupError.textContent = translate("passwordMismatch");
      elements.signupError.style.display = "block";
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
    if (elements.signupCard) elements.signupCard.style.display = "none";
    const loginCard = document.querySelector(".login-card:not(#signupCard)");
    if (loginCard) loginCard.style.display = "block";
    if (elements.signupForm) elements.signupForm.reset();
  } catch (error) {
    console.error("Signup error:", error);
    if (elements.signupError) {
      elements.signupError.textContent = translate("signupError") || error.message;
      elements.signupError.style.display = "block";
    }
  }
}

async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    state.currentUser = null;
    notify("success", translate("logoutSuccess"));
    showLoginView();
    // Clear all data
    state.apartments = [];
    state.tenants = [];
    state.contracts = [];
    state.debts = [];
    state.payments = [];
    if (elements.debtsTableBody) elements.debtsTableBody.innerHTML = "";
    if (elements.paymentsTableBody) elements.paymentsTableBody.innerHTML = "";
    if (elements.apartmentsTableBody) elements.apartmentsTableBody.innerHTML = "";
    if (elements.tenantsTableBody) elements.tenantsTableBody.innerHTML = "";
    if (elements.contractsActiveTableBody) elements.contractsActiveTableBody.innerHTML = "";
    if (elements.contractsInactiveTableBody) elements.contractsInactiveTableBody.innerHTML = "";
  } catch (error) {
    console.error("Logout error:", error);
    notify("error", translate("errorLoad"));
  }
}

function showLoginView() {
  // Redirect to login.html if not authenticated
  window.location.href = "login.html";
}

function showAdminView() {
  if (elements.loginView) elements.loginView.classList.remove("active");
  if (elements.adminView) elements.adminView.classList.add("active");
  if (elements.tenantView) elements.tenantView.classList.remove("active");
  document.querySelector("main")?.classList.remove("hidden");
  // Ensure role is set to admin and views are properly toggled
  if (state.role !== "admin") {
    state.role = "admin";
  }
  toggleViews();
  updateAuthUI();
}

function updateAuthUI() {
  if (state.currentUser) {
    if (elements.authControls) elements.authControls.style.display = "flex";
    const statisticsLink = document.getElementById("statisticsLink");
    if (statisticsLink) statisticsLink.style.display = "flex";
  } else {
    if (elements.authControls) elements.authControls.style.display = "none";
    const statisticsLink = document.getElementById("statisticsLink");
    if (statisticsLink) statisticsLink.style.display = "none";
  }
}

function formatReferenceForDisplay(reference) {
  // Format reference for display - handles both integer and legacy text formats
  if (reference === null || reference === undefined) return "-";
  if (typeof reference === 'number') return `#${reference}`;
  if (typeof reference === 'string') {
    // Handle legacy text format or already formatted
    if (reference.startsWith('#')) return reference;
    const num = parseInt(reference, 10);
    return isNaN(num) ? reference : `#${num}`;
  }
  return String(reference);
}

function showConfirmationAnimation(animationType) {
  if (!elements.confirmationModal || !elements.confirmationAnimationContainer) return;
  
  // Clear container
  elements.confirmationAnimationContainer.innerHTML = '';
  
  // Show modal
  elements.confirmationModal.style.display = 'flex';
  elements.confirmationModal.classList.remove('hiding');
  
  // Determine GIF file
  const gifFile = animationType === "edit" 
    ? "assets/Developer.gif"
    : "assets/Folder.gif";
  
  // Create image element for GIF
  const img = document.createElement('img');
  img.src = gifFile;
  img.style.width = '300px';
  img.style.height = '300px';
  img.style.objectFit = 'contain';
  img.style.display = 'block';
  img.alt = animationType === "edit" ? "Edit confirmation" : "Save confirmation";
  
  // Helper function to hide modal
  function hideConfirmationModal() {
    if (elements.confirmationModal) {
      elements.confirmationModal.classList.add('hiding');
      setTimeout(() => {
        if (elements.confirmationModal) {
          elements.confirmationModal.style.display = 'none';
          elements.confirmationModal.classList.remove('hiding');
          elements.confirmationAnimationContainer.innerHTML = '';
        }
      }, 300);
    }
  }
  
  // Handle image load error
  img.onerror = () => {
    console.error('Failed to load GIF:', gifFile);
    // Fallback to icon
    const icon = animationType === "edit" ? "✎" : "✓";
    elements.confirmationAnimationContainer.innerHTML = `<div style="color: #08a88a; font-size: 6rem; font-weight: bold; line-height: 1; animation: scaleIn 0.3s ease-out;">${icon}</div>`;
    // Hide after fallback
    setTimeout(() => {
      hideConfirmationModal();
    }, 2500);
  };
  
  // When GIF loads, wait for it to complete then hide
  // Most confirmation GIFs are 2-3 seconds and play once
  img.onload = () => {
    // Hide modal after GIF has time to play (2.5 seconds should cover most GIFs)
    setTimeout(() => {
      hideConfirmationModal();
    }, 2500);
  };
  
  // Append image to container
  elements.confirmationAnimationContainer.appendChild(img);
}

function notify(type, message, animationType = null) {
  // Show center-screen animation for success messages
  if (type === "success") {
    // Determine animation type if not provided
    if (!animationType) {
      // Check if this is an edit/update message
      const isEdit = message.includes("update") || message.includes("përditësua") || message.includes("u përditësua");
      animationType = isEdit ? "edit" : "save";
    }
    
    // Show center-screen animation
    showConfirmationAnimation(animationType);
  }
  
  // Still show regular notification for message text
  if (!elements.notificationArea) return;
  const node = document.createElement("div");
  node.className = `notification ${type}`;
  node.textContent = message;
  elements.notificationArea.appendChild(node);
  setTimeout(() => node.remove(), 5000);
}

async function loadTenantView() {
  const tenantId = state.selectedTenantId;
  const tenant = state.tenants.find((t) => equalsId(t.id, tenantId));
  if (!tenant) {
    notify("error", translate("noTenantSelected"));
    return;
  }
  renderTenantInfo(tenant);
  renderTenantContract(tenantId);
  renderTenantDebts();
  renderTenantPayments();
  renderTenantFinancialSummary(tenantId);
}

function renderTenantInfo(tenant) {
  // Prefer contract start date as "entry" date; fall back to tenant.entry_date
  const primaryContract = getPrimaryContractForTenant(tenant.id);
  const entryDate =
    (primaryContract && primaryContract.start_date) || tenant.entry_date;

  elements.tenantInfoList.innerHTML = `
    <dt>${translate("tenantFullName")}:</dt>
    <dd>${sanitize(tenant.full_name)}</dd>
    <dt>${translate("tenantEmail")}:</dt>
    <dd>${sanitize(tenant.email || "-")}</dd>
    <dt>${translate("tenantPhone")}:</dt>
    <dd>${sanitize(tenant.phone || "-")}</dd>
    <dt>${translate("tenantSince")}:</dt>
    <dd>${formatDate(entryDate)}</dd>
  `;
}

function renderTenantContract(tenantId) {
  const contract = getPrimaryContractForTenant(tenantId);
  if (!contract) {
    elements.tenantContractList.innerHTML = `<dt>${translate("status")}:</dt><dd>${translate("unknown")}</dd>`;
    return;
  }

  const apartment = state.apartments.find(
    (apartment) => equalsId(apartment.id, contract.apartment_id)
  );

  elements.tenantContractList.innerHTML = `
    <dt>${translate("selectApartment")}:</dt>
    <dd>${sanitize(apartment?.name || translate("unknown"))}</dd>
    <dt>${translate("startDate")}:</dt>
    <dd>${formatDate(contract.start_date)}</dd>
    <dt>${translate("endDate")}:</dt>
    <dd>${formatDate(contract.end_date)}</dd>
    <dt>${translate("monthlyRent")}:</dt>
    <dd>${formatCurrency(contract.monthly_rent)}</dd>
    <dt>${translate("contractActive")}:</dt>
    <dd>${contract.is_active ? translate("yes") : translate("no")}</dd>
  `;
}

function renderTenantDebts() {
  const tenantId = state.selectedTenantId;
  const allDebts = state.debts.filter(
    (debt) => equalsId(debt.tenant_id, tenantId)
  );
  const tenantPayments = state.payments.filter(
    (p) => equalsId(p.tenant_id, tenantId)
  );
  
  // Separate regular debts (unpaid) from utility debts
  const regularDebts = allDebts.filter(d => !isUtilityType(d.type) && !d.is_paid);
  const utilityDebts = allDebts.filter(d => isUtilityType(d.type));
  
  // Calculate utility balances by type
  const utilityBalances = {};
  UTILITY_TYPES.forEach(type => {
    const expenses = utilityDebts.filter(d => d.type === type)
      .reduce((sum, d) => sum + normalizeCurrency(d.amount), 0);
    const payments = tenantPayments.filter(p => p.type === type || 
      (state.debts.find(d => equalsId(d.id, p.debt_id))?.type === type))
      .reduce((sum, p) => sum + normalizeCurrency(p.amount), 0);
    const balance = expenses - payments;
    if (Math.abs(balance) > 0.01) {
      utilityBalances[type] = balance;
    }
  });
  
  const rows = [];
  
  // Add regular debts with status
  regularDebts.forEach((debt) => {
      const status = getDebtStatus(debt);
    rows.push(`
        <tr>
          <td>${sanitize(getDebtTypeLabel(debt))}</td>
          <td>${formatCurrency(debt.amount)}</td>
          <td>${formatDate(debt.due_date)}</td>
          <td><span class="tag ${status.class}">${status.label}</span></td>
        <td>${formatReferenceNumber(debt.reference)}</td>
        </tr>
    `);
  });
  
  // Add utility balances as summary rows
  Object.entries(utilityBalances).forEach(([type, balance]) => {
    const typeLabel = translate(`debt${capitalize(type)}`) || type;
    const balanceLabel = balance > 0 ? translate("owes") || "Owes" : translate("credit") || "Credit";
    rows.push(`
      <tr>
        <td>${sanitize(typeLabel)}</td>
        <td>${formatCurrency(Math.abs(balance))}</td>
        <td>-</td>
        <td><span class="tag ${balance > 0 ? 'tag-overdue' : 'tag-paid'}">${balanceLabel}</span></td>
        <td>-</td>
      </tr>
    `);
  });
  
  if (!rows.length) {
    elements.tenantDebtsTableBody.innerHTML = `<tr><td colspan="5">${translate(
      "noDebtsFound"
    )}</td></tr>`;
    return;
  }
  
  elements.tenantDebtsTableBody.innerHTML = rows.join("");
}

function renderTenantPayments() {
  const tenantId = state.selectedTenantId;
  const targetPayments = state.payments.filter(
    (payment) => equalsId(payment.tenant_id, tenantId)
  );
  if (!targetPayments.length) {
    elements.tenantPaymentsTableBody.innerHTML = `<tr><td colspan="5">${translate(
      "noPaymentsFound"
    )}</td></tr>`;
    return;
  }

  elements.tenantPaymentsTableBody.innerHTML = targetPayments
    .map((payment) => {
      const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
      const debtLabel = debt ? getDebtTypeLabel(debt) : "-";
      return `
        <tr>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${sanitize(debtLabel)}</td>
          <td>${formatDate(payment.payment_date)}</td>
          <td>${sanitize(payment.method || "-")}</td>
          <td>${sanitize(formatReferenceForDisplay(payment.reference))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderTenantFinancialSummary(tenantId) {
  const tenant = state.tenants.find((t) => equalsId(t.id, tenantId));
  const debts = state.debts.filter((debt) => equalsId(debt.tenant_id, tenantId));
  const payments = state.payments.filter(
    (payment) => equalsId(payment.tenant_id, tenantId)
  );

  // Separate regular and utility debts
  const regularDebts = debts.filter(d => !isUtilityType(d.type));
  const utilityDebts = debts.filter(d => isUtilityType(d.type));
  
  const regularPayments = payments.filter(p => {
    if (isUtilityType(p.type)) return false;
    const debt = state.debts.find(d => equalsId(d.id, p.debt_id));
    return !debt || !isUtilityType(debt.type);
  });
  const utilityPayments = payments.filter(p => {
    if (isUtilityType(p.type)) return true;
    const debt = state.debts.find(d => equalsId(d.id, p.debt_id));
    return debt && isUtilityType(debt.type);
  });

  const totalRegularDebt = regularDebts.reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0), 0
  );
  const totalUtilityDebt = utilityDebts.reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0), 0
  );
  const totalRegularPaid = regularPayments.reduce(
    (sum, payment) => sum + (parseFloat(payment.amount) || 0), 0
  );
  const totalUtilityPaid = utilityPayments.reduce(
    (sum, payment) => sum + (parseFloat(payment.amount) || 0), 0
  );
  
  const totalDebt = totalRegularDebt + totalUtilityDebt;
  const totalPaid = totalRegularPaid + totalUtilityPaid;
  
  // Unpaid regular + utility balance
  const unpaidRegular = regularDebts
    .filter((debt) => !debt.is_paid)
    .reduce((sum, debt) => sum + (parseFloat(debt.amount) || 0), 0);
  const utilityBalance = totalUtilityDebt - totalUtilityPaid;
  const totalUnpaid = unpaidRegular + Math.max(0, utilityBalance);
  
  const primaryContract = getPrimaryContractForTenant(tenantId);

  elements.tenantFinancialList.innerHTML = `
    <dt>${translate("totalDebt")}:</dt>
    <dd>${formatCurrency(totalDebt)}</dd>
    <dt>${translate("totalPaid")}:</dt>
    <dd>${formatCurrency(totalPaid)}</dd>
    <dt>${translate("totalUnpaid")}:</dt>
    <dd>${formatCurrency(totalUnpaid)}</dd>
    <dt>${translate("contractActive")}:</dt>
    <dd>${
      primaryContract
        ? primaryContract.is_active
          ? translate("yes")
          : translate("no")
        : translate("unknown")
    }</dd>
  `;
}

function exportDebtsToPdf() {
  if (
    !window.jspdf ||
    !window.jspdf.jsPDF ||
    !window.jspdf.jsPDF.API ||
    !window.jspdf.jsPDF.API.autoTable
  ) {
    notify("error", translate("errorAutoTableLoading"));
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  let currentY = 20;
  
  // Get currently selected expense category
  const selectedCategory = state.expensesCategory || "all";
  const categoryLabel = selectedCategory === "all" 
    ? translate("debtsPaymentsTitle") 
    : translate(`debt${capitalize(selectedCategory)}`) || selectedCategory;
  
  doc.setFontSize(16);
  doc.text(categoryLabel, 14, 15);
  doc.setFontSize(11);

  const headers = [
    translate("selectTenant"),
    translate("debtType"),
    translate("amount"),
    translate("dueDate"),
    translate("status"),
    translate("reference") || "Reference",
  ];

  // Filter expenses by selected category and global tenant filter
  let filteredDebts = getFilteredDebts();
  if (selectedCategory !== "all") {
    filteredDebts = filteredDebts.filter(debt => debt.type === selectedCategory);
  }

  // All expenses from split tables (combined in state.debts)
  const allExpenses = filteredDebts.map((debt) => {
    const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
    const isUtility = isUtilityType(debt.type);
    const status = isUtility ? { label: "-" } : getDebtStatus(debt);
    return [
      sanitize(tenant?.full_name || translate("unknown")),
      getDebtTypeLabel(debt),
      formatCurrency(debt.amount),
      formatDate(debt.due_date),
      status.label,
      formatReferenceNumber(debt.reference),
    ];
  });

  doc.autoTable({
    startY: currentY,
    head: [headers],
    body: allExpenses,
    styles: { fontSize: 9 },
    theme: "grid",
    headStyles: {
      fillColor: [8, 168, 138], // #08a88a
      textColor: [255, 255, 255],
    },
  });

  // Include contract info in filename if filtered
  let filename = selectedCategory === "all" ? "debts-report" : `${selectedCategory}-report`;
  if (state.globalContractFilter) {
    const contract = state.contracts.find(c => equalsId(c.id, state.globalContractFilter));
    if (contract) {
      const tenant = state.tenants.find(t => equalsId(t.id, contract.tenant_id));
      if (tenant) {
        filename += `-${tenant.full_name.replace(/\s+/g, '-')}`;
      }
    }
  }
  doc.save(`${filename}.pdf`);
  incrementPdfGeneratedCount();
}

// Wrapper function that passes dependencies to the PDF export module
function exportTenantToPdf(language = "en", format = "normal") {
  if (typeof window._exportTenantToPdfInternal === "function") {
    // Use the exported function from pdf-export.js
    window._exportTenantToPdfInternal({
      state,
      translate,
      formatCurrency,
      formatDate,
      equalsId,
      isUtilityType,
      normalizeCurrency,
      capitalize,
      formatReferenceNumber,
      getPrimaryContractForTenant,
      setTemporaryLanguage,
      restoreLanguageAfterPdf,
      incrementPdfGeneratedCount,
      notify
    }, language, format);
    } else {
    // Fallback if pdf-export.js hasn't loaded yet
    console.error("PDF export module not loaded");
    notify("error", "PDF export module not loaded. Please refresh the page.");
  }
}

// Polyfill for autoTable if the plugin is not included by default in jspdf bundle
if (!window.jspdf.jsPDF.API.autoTable) {
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";
  script.crossOrigin = "anonymous";
  script.onload = () => console.info("jsPDF AutoTable plugin loaded.");
  document.head.appendChild(script);
}

