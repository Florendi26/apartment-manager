// Configuration is loaded from js/config.js
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

// Use var to allow redeclaration if loaded multiple times (prevents SyntaxError)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Retry helper for Supabase auth lock contention (AbortError / Lock broken)
function isAuthLockError(err) {
  return err?.name === "AbortError" || err?.message?.includes?.("Lock broken") || err?.message?.includes?.("steal");
}
async function withRetryOnAuthLock(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt < maxRetries && isAuthLockError(e)) {
        await new Promise(r => setTimeout(r, 400 + attempt * 400));
      } else {
        throw e;
      }
    }
  }
}

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
  paginationInstances: {}, // Store pagination instances for each table
  paymentRequestsData: null, // { requests, tenantsMap } for filtering
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

// DOM Helper Functions
const clear = (el) => { if (el) el.innerHTML = ''; };
const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'class') e.className = v;
    else if (k.startsWith('data-')) e.setAttribute(k, v);
    else if (k === 'style' && typeof v === 'string') e.style.cssText = v;
    else if (k in e && typeof v !== 'object') e[k] = v;
    else if (v != null) e.setAttribute(k, v);
  });
  children.forEach(c => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return e;
};

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
      const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line2.setAttribute("x1", "6");
      line2.setAttribute("y1", "6");
      line2.setAttribute("x2", "18");
      line2.setAttribute("y2", "18");
      svg.appendChild(line1);
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
}

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  attachEventListeners();
  translateUI();
  setupPageUsability();
  
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
  
  // Brief delay to let Supabase auth lock settle after session recovery
  await new Promise(r => setTimeout(r, 150));
  
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
    apartmentRentalStatus: document.getElementById("apartmentRentalStatus"),
    apartmentCondition: document.getElementById("apartmentCondition"),
    apartmentRooms: document.getElementById("apartmentRooms"),
    apartmentBalconies: document.getElementById("apartmentBalconies"),
    apartmentBathrooms: document.getElementById("apartmentBathrooms"),
    apartmentArea: document.getElementById("apartmentArea"),
    apartmentMunicipality: document.getElementById("apartmentMunicipality"),
    apartmentNeighborhood: document.getElementById("apartmentNeighborhood"),
    apartmentNeighborhoodField: document.getElementById("apartmentNeighborhoodField"),
    apartmentMonthlyRent: document.getElementById("apartmentMonthlyRent"),
    apartmentDescription: document.getElementById("apartmentDescription"),
    apartmentSubmitBtn: document.getElementById("apartmentSubmitBtn"),
    apartmentCancelBtn: document.getElementById("apartmentCancelBtn"),
    toggleApartmentFormBtn: document.getElementById("toggleApartmentFormBtn"),
    apartmentsTableBody: document.getElementById("apartmentsTableBody"),
    tenantForm: document.getElementById("tenantForm"),
    tenantsTableBody: document.getElementById("tenantsTableBody"),
    contractForm: document.getElementById("contractForm"),
    toggleContractFormBtn: document.getElementById("toggleContractFormBtn"),
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
    toggleExpenseFormBtn: document.getElementById("toggleExpenseFormBtn"),
    togglePaymentFormBtn: document.getElementById("togglePaymentFormBtn"),
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
    debtsSortBy: document.getElementById("debtsSortBy"),
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
    utilityExpensesRemainingDebt: document.getElementById("utilityExpensesRemainingDebt"),
    utilityPaymentsRemainingDebt: document.getElementById("utilityPaymentsRemainingDebt"),
    globalTenantFilter: document.getElementById("globalTenantFilter"),
    clearTenantFilter: document.getElementById("clearTenantFilter"),
    globalContractFilter: document.getElementById("globalContractFilter"),
    clearContractFilter: document.getElementById("clearContractFilter"),
    paymentProofFilterType: document.getElementById("paymentProofFilterType"),
  });
  if (elements.debtFormCancelEdit) {
    elements.debtFormCancelEdit.addEventListener("click", () => {
      resetDebtForm();
      // Hide form after canceling
      if (elements.debtForm) {
        elements.debtForm.style.display = "none";
      }
      if (elements.toggleExpenseFormBtn) {
        elements.toggleExpenseFormBtn.textContent = translate("expenseFormToggleExpense") || "Create Expense";
      }
    });
  }
  if (elements.paymentFormCancelEdit) {
    elements.paymentFormCancelEdit.addEventListener("click", () => {
      resetPaymentForm();
      // Hide form after canceling
      if (elements.paymentForm) {
        elements.paymentForm.style.display = "none";
      }
      if (elements.togglePaymentFormBtn) {
        elements.togglePaymentFormBtn.textContent = translate("expenseFormTogglePayment") || "Record Payment";
      }
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
  // Removed expenseFormModeButtons - using separate toggle buttons now
  elements.expenseModeSections = Array.from(
    document.querySelectorAll("[data-expense-mode]")
  );
  // Initialize expense form mode (defaults to "expense")
  // This controls which sections (tables, toolbars) are visible
  updateExpenseFormModeUI();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  renderAdminSummary();
}

function attachEventListeners() {
  // Setup collapsible table rows for mobile
  setupCollapsibleTableRows();

  // Authentication event listeners
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", handleLogin);
  }
  if (elements.signupForm) {
    elements.signupForm.addEventListener("submit", handleSignup);
  }
  if (elements.showSignup) {
    elements.showSignup.addEventListener("click", (e) => {
      e.preventDefault();
      if (elements.signupCard) {
        elements.signupCard.classList.remove("hidden");
        elements.signupCard.style.display = "block";
      }
      const loginCard = document.querySelector(".login-card:not(#signupCard)");
      if (loginCard) {
        loginCard.classList.add("hidden");
        loginCard.style.display = "none";
      }
    });
  }
  if (elements.showLogin) {
    elements.showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      if (elements.signupCard) {
        elements.signupCard.classList.add("hidden");
        elements.signupCard.style.display = "none";
      }
      const loginCard = document.querySelector(".login-card:not(#signupCard)");
      if (loginCard) {
        loginCard.classList.remove("hidden");
        loginCard.style.display = "block";
      }
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

  // Theme toggle switch (light / dark)
  const themeToggleSwitch = document.getElementById("themeToggleSwitch");
  function applyTheme(theme) {
    const body = document.body;
    if (!body) return;
    if (theme === "dark") {
      body.classList.add("dark-theme");
      if (themeToggleSwitch) {
        themeToggleSwitch.checked = true;
      }
    } else {
      body.classList.remove("dark-theme");
      if (themeToggleSwitch) {
        themeToggleSwitch.checked = false;
      }
      theme = "light";
    }
    try {
      window.localStorage.setItem("theme", theme);
    } catch (_) {}
  }

  const storedTheme = (window.localStorage && window.localStorage.getItem("theme")) || "light";
  applyTheme(storedTheme);

  if (themeToggleSwitch) {
    themeToggleSwitch.addEventListener("change", () => {
      const isDark = themeToggleSwitch.checked;
      applyTheme(isDark ? "dark" : "light");
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


  // Top Navigation Container
  setupTopNavContainer();
  // Ensure top nav is translated after setup
  translateUI();

  if (elements.adminNav) {
    elements.adminNav.addEventListener("click", handleAdminNavClick);
  }
  
  // Handle sidebar expense filter buttons using event delegation
  document.addEventListener("click", (event) => {
    const sidebarBtn = event.target.closest('.expense-sidebar-btn');
    if (sidebarBtn) {
      handleAdminNavClick(event);
    }
  });
  
  // Global contract filter
  if (elements.globalContractFilter) {
    elements.globalContractFilter.addEventListener("change", handleGlobalContractFilterChange);
  }
  if (elements.clearContractFilter) {
    elements.clearContractFilter.addEventListener("click", clearGlobalContractFilter);
  }

  // Payment proofs filters
  if (elements.paymentProofFilterType) {
    elements.paymentProofFilterType.addEventListener("change", renderPaymentRequestsFiltered);
  }
  elements.apartmentForm.addEventListener("submit", onCreateApartment);
  
  // Feature buttons click handlers
  setupFeatureButtons();
  
  // Rental rules section: show only when renting (available or rented)
  function toggleRentalRulesSection() {
    const sel = document.getElementById("apartmentRentalStatus");
    const section = document.getElementById("apartmentRentalRulesSection");
    if (!sel || !section) return;
    const v = (sel.value || "").toLowerCase();
    const isRenting = v === "available" || v === "rented";
    if (isRenting) section.classList.remove("hidden");
    else section.classList.add("hidden");
  }
  window.toggleRentalRulesSection = toggleRentalRulesSection;
  if (elements.apartmentRentalStatus) {
    elements.apartmentRentalStatus.addEventListener("change", toggleRentalRulesSection);
  }
  toggleRentalRulesSection();
  
  // Show/hide neighborhood field when Prishtina is selected
  function toggleNeighborhoodField() {
    if (!elements.apartmentMunicipality || !elements.apartmentNeighborhoodField) return;
    const isPrishtina = elements.apartmentMunicipality.value === "Prishtina";
    if (isPrishtina) {
      elements.apartmentNeighborhoodField.style.display = "block";
    } else {
      elements.apartmentNeighborhoodField.style.display = "none";
      // Clear neighborhood value when Prishtina is not selected
      if (elements.apartmentNeighborhood) {
        elements.apartmentNeighborhood.value = "";
      }
    }
  }
  window.toggleNeighborhoodField = toggleNeighborhoodField;
  if (elements.apartmentMunicipality) {
    elements.apartmentMunicipality.addEventListener("change", toggleNeighborhoodField);
    // Initialize on page load
    toggleNeighborhoodField();
  }
  
  // Toggle apartment form button
  if (elements.toggleApartmentFormBtn) {
    elements.toggleApartmentFormBtn.addEventListener("click", () => {
      const form = elements.apartmentForm;
      const isVisible = !form.classList.contains("hidden");
      
      if (isVisible) {
        // Hide form
        form.classList.add("hidden");
        elements.toggleApartmentFormBtn.textContent = translate("addApartment") || "Add Apartment";
        // Reset form if not in edit mode
        if (!elements.apartmentId?.value) {
          cancelEditApartment();
        }
      } else {
        // Show form
        form.classList.remove("hidden");
        elements.toggleApartmentFormBtn.textContent = translate("cancel") || "Cancel";
        // Scroll to form
        form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }
  
  // Cancel edit button
  if (elements.apartmentCancelBtn) {
    elements.apartmentCancelBtn.addEventListener("click", () => {
      cancelEditApartment();
      // Hide form after canceling
      if (elements.apartmentForm) {
        elements.apartmentForm.classList.add("hidden");
      }
      if (elements.toggleApartmentFormBtn) {
        elements.toggleApartmentFormBtn.textContent = translate("addApartment") || "Add Apartment";
      }
    });
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

  // Toggle contract form button
  if (elements.toggleContractFormBtn) {
    elements.toggleContractFormBtn.addEventListener("click", () => {
      const form = elements.contractForm;
      const isVisible = !form.classList.contains("hidden");
      
      if (isVisible) {
        // Hide form
        form.classList.add("hidden");
        elements.toggleContractFormBtn.textContent = translate("addContract") || "Add Contract";
        // Reset form
        form.reset();
        if (elements.contractActive) {
          elements.contractActive.checked = true;
        }
      } else {
        // Show form (remove .hidden which uses !important)
        form.classList.remove("hidden");
        form.style.display = "grid";
        elements.toggleContractFormBtn.textContent = translate("cancel") || "Cancel";
        // Scroll to form
        form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

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
  // Toggle expense form button
  if (elements.toggleExpenseFormBtn) {
    elements.toggleExpenseFormBtn.addEventListener("click", () => {
      const form = elements.debtForm;
      const isVisible = form.style.display !== "none";
      
      if (isVisible) {
        // Hide form
        form.style.display = "none";
        elements.toggleExpenseFormBtn.textContent = translate("expenseFormToggleExpense") || "Create Expense";
        // Reset form if not in edit mode
        if (!state.editingDebtId) {
          resetDebtForm();
        }
      } else {
        // Show form
        form.style.display = "grid";
        elements.toggleExpenseFormBtn.textContent = translate("cancel") || "Cancel";
        // Update expense form mode for table/toolbar visibility
        setExpenseFormMode("expense");
        // Hide payment form if open
        if (elements.paymentForm) {
          elements.paymentForm.style.display = "none";
          if (elements.togglePaymentFormBtn) {
            elements.togglePaymentFormBtn.textContent = translate("expenseFormTogglePayment") || "Record Payment";
          }
        }
        // Scroll to form
        form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }
  
  // Toggle payment form button
  if (elements.togglePaymentFormBtn) {
    elements.togglePaymentFormBtn.addEventListener("click", () => {
      const form = elements.paymentForm;
      const isVisible = form.style.display !== "none";
      
      if (isVisible) {
        // Hide form
        form.style.display = "none";
        elements.togglePaymentFormBtn.textContent = translate("expenseFormTogglePayment") || "Record Payment";
        // Reset form if not in edit mode
        if (!state.editingPaymentId) {
          resetPaymentForm();
        }
      } else {
        // Show form
        form.style.display = "grid";
        elements.togglePaymentFormBtn.textContent = translate("cancel") || "Cancel";
        // Update expense form mode for table/toolbar visibility
        setExpenseFormMode("payment");
        // Hide expense form if open
        if (elements.debtForm) {
          elements.debtForm.style.display = "none";
          if (elements.toggleExpenseFormBtn) {
            elements.toggleExpenseFormBtn.textContent = translate("expenseFormToggleExpense") || "Create Expense";
          }
        }
        // Scroll to form
        form.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
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
  if (elements.debtsSortBy) {
    elements.debtsSortBy.addEventListener("change", renderDebtsTable);
  }
  elements.exportDebtsPdf.addEventListener("click", exportDebtsToPdf);
  
  // Mark Paid Modal event listeners
  if (elements.markPaidCancel) {
    elements.markPaidCancel.addEventListener("click", () => {
      if (elements.markPaidModal) {
        elements.markPaidModal.classList.add("hidden");
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

function setupCollapsibleTableRows() {
  // Use event delegation for dynamically created table rows
  document.addEventListener('click', (e) => {
    const row = e.target.closest('table tbody tr');
    if (!row) return;
    
    // Don't toggle if clicking on buttons or interactive elements
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input') || e.target.closest('a')) {
      return;
    }
    
    // Only on mobile (when table rows are displayed as blocks/cards)
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    // Toggle collapsed class
    row.classList.toggle('collapsed');
  });
}

function handleAdminNavClick(event) {
  const button = event.target.closest("button[data-page]");
  if (!button) return;
  const page = button.dataset.page;
  if (!page) return;
  event.preventDefault();
  if (page === "expenses") {
    // If clicked from sidebar, use the expense type from the button
    // If clicked from main nav (just "Expenses"), default to "all"
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
  renderPaymentRequestsFiltered();
  refreshTenantSummaries();
  populateDebtSelects();
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
  renderPaymentRequestsFiltered();
  refreshTenantSummaries();
  populateDebtSelects();
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
  clear(elements.globalContractFilter);
  
  // Create default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.setAttribute('data-i18n', 'allContracts');
  defaultOption.textContent = translate("allContracts") || "All Contracts";
  elements.globalContractFilter.appendChild(defaultOption);
  
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
  if (page === "expenses" || page === "payment-proofs") {
    loadPaymentRequests(); // Refresh payment requests when viewing expenses or dedicated payment proofs page
    // Ensure pagination loads when expenses page is shown
    setTimeout(() => {
      if (state.paginationInstances.debts) {
        const currentItems = state.paginationInstances.debts.getItems();
        // If no items loaded yet, force load
        if (currentItems.length === 0 && !state.paginationInstances.debts.isLoading()) {
          // Reset and load
          if (state.paginationInstances.debts.state) {
            state.paginationInstances.debts.state.currentPage = 0;
            state.paginationInstances.debts.state.allItems = [];
            state.paginationInstances.debts.state.hasMore = true;
            state.paginationInstances.debts.loadNextPage();
          }
        }
      } else if (state.debtsLoaded && elements.debtsTableBody) {
        // Pagination not set up yet, set it up now
        setupDebtsPagination();
      }
    }, 100);
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
    // Ensure pagination loads when switching expense categories
    if (state.paginationInstances.debts) {
      // Reset will trigger loading with new filters
      state.paginationInstances.debts.reset();
    }
  }
}

function updateAdminNavActive(page, expenseCategory = state.expensesCategory) {
  if (!elements.adminNav) return;
  const hasMapping = !!EXPENSE_TYPE_MAP[expenseCategory];
  
  // Update nav buttons (excluding expense category buttons which are now in sidebar)
  elements.adminNav
    .querySelectorAll("button[data-page]")
    .forEach((button) => {
      const buttonPage = button.dataset.page;
      const buttonExpense = button.dataset.expenseType || null;
      
      // For expenses page, just check if the page matches (don't check expense type)
      // Expense type filtering is now handled by sidebar buttons
      // For payments and other pages, check if page matches
      if (buttonPage === page) {
        button.classList.add("active");
        button.setAttribute("aria-current", "page");
      } else {
        button.classList.remove("active");
        button.removeAttribute("aria-current");
      }
    });
  
  // Update sidebar buttons (only for expense types, not payments)
  document.querySelectorAll('.expense-sidebar-btn').forEach((button) => {
    const buttonPage = button.dataset.page;
    const buttonExpense = button.dataset.expenseType || null;
    const isExpenses = buttonPage === "expenses" && page === "expenses";
    let isActive = false;
    
    if (isExpenses) {
      if (buttonExpense === "all" && expenseCategory === "all") {
        isActive = true;
      } else if (hasMapping && buttonExpense === expenseCategory) {
        isActive = true;
      }
    }
    
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
  
  // Only reset forms if switching modes (not when forms are already hidden/shown by toggle buttons)
  // This prevents conflicts with the new separate toggle button system
  if (mode === "expense" && state.editingPaymentId && state.expenseFormMode === "payment") {
    resetPaymentForm();
  }
  if (mode === "payment" && state.editingDebtId && state.expenseFormMode === "expense") {
    resetDebtForm();
  }
  
  state.expenseFormMode = mode;
  updateExpenseFormModeUI();
}

function updateExpenseFormModeUI() {
  // Handle expense mode sections visibility (tables, toolbars, etc.)
  if (Array.isArray(elements.expenseModeSections)) {
    elements.expenseModeSections.forEach((node) => {
      const mode = node.dataset.expenseMode;
      // Show sections based on current expense form mode
      // If form mode is "expense", show expense sections
      // If form mode is "payment", show payment sections
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
  const debts = getFilteredDebts();
  const payments = getFilteredPayments();

  // When contract filter is active, only include tenants from that contract
  let tenantsToShow = state.tenants || [];
  if (state.globalContractFilter) {
    const contract = state.contracts.find((c) => equalsId(c.id, state.globalContractFilter));
    if (contract) {
      tenantsToShow = state.tenants.filter((t) => equalsId(t.id, contract.tenant_id));
    }
  }

  return tenantsToShow
    .map((tenant) => {
      const tenantName = tenant.full_name || translate("unknown");
      const openDebts = debts
        .filter(
          (debt) => equalsId(debt.tenant_id, tenant.id) && !debt.is_paid
        )
        .filter((debt) => {
          if (activeExpenseType) {
            return debt.type === activeExpenseType;
          }
          return true;
        });
      const tenantPayments = (payments || [])
        .filter((p) => equalsId(p.tenant_id, tenant.id))
        .filter((payment) => {
          if (activeExpenseType) {
            if (payment.type === activeExpenseType) return true;
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

      // Last expense date: most recent due_date for this tenant (and type when filtered)
      const tenantDebtsFiltered = activeExpenseType
        ? debts.filter((d) => equalsId(d.tenant_id, tenant.id) && d.type === activeExpenseType)
        : debts.filter((d) => equalsId(d.tenant_id, tenant.id));
      const dates = tenantDebtsFiltered
        .map((d) => d.due_date || d.bill_date)
        .filter(Boolean);
      const lastExpenseDate = dates.length ? dates.sort().pop() : null;

      if (!expensesCount && !paymentsCount && !lastExpenseDate) {
        return null;
      }
      return {
        tenantId: tenant.id,
        tenantName,
        expensesCount,
        expensesAmount,
        paymentsCount,
        paymentsAmount,
        lastExpenseDate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
}

function renderTenantSummaryBody(target, summary) {
  if (!target) return;
  
  clear(target);
  
  if (!summary.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '6');
    td.textContent = sanitize(translate("summaryNoData"));
    tr.appendChild(td);
    target.appendChild(tr);
    return;
  }
  
  summary.forEach((row) => {
    const tr = document.createElement('tr');
    
    const tenantCell = document.createElement('td');
    tenantCell.textContent = sanitize(row.tenantName);
    tr.appendChild(tenantCell);
    
    const lastExpenseCell = document.createElement('td');
    lastExpenseCell.textContent = row.lastExpenseDate ? formatDate(row.lastExpenseDate) : "-";
    tr.appendChild(lastExpenseCell);
    
    const expensesCountCell = document.createElement('td');
    expensesCountCell.textContent = row.expensesCount;
    tr.appendChild(expensesCountCell);
    
    const expensesAmountCell = document.createElement('td');
    expensesAmountCell.textContent = formatCurrency(row.expensesAmount);
    tr.appendChild(expensesAmountCell);
    
    const paymentsCountCell = document.createElement('td');
    paymentsCountCell.textContent = row.paymentsCount;
    tr.appendChild(paymentsCountCell);
    
    const paymentsAmountCell = document.createElement('td');
    paymentsAmountCell.textContent = formatCurrency(row.paymentsAmount);
    tr.appendChild(paymentsAmountCell);
    
    target.appendChild(tr);
  });
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
  const tableSearch = document.getElementById("tableSearch");
  if (tableSearch && dictionary.searchThisPage) {
    tableSearch.placeholder = dictionary.searchThisPage;
    tableSearch.setAttribute("aria-label", dictionary.searchThisPage);
  }
  
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

let loadInitialDataInProgress = false;
async function loadInitialData() {
  if (loadInitialDataInProgress) return;
  loadInitialDataInProgress = true;
  try {
    await loadInitialDataCore();
  } finally {
    loadInitialDataInProgress = false;
  }
}

async function loadInitialDataCore() {
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
    loadRequests(),
    loadPaymentRequests(),
  ]);
  
  // Ensure apartments table is rendered after all data is loaded
  // This handles the case where apartments finished loading before contracts
  if (state.apartments && state.apartments.length >= 0 && state.contractsLoaded) {
    renderApartmentsTable();
  }
  
  populateTenantSelector();
  
  if (!hasSeenAnimation) {
    // Show pages immediately for better UX (don't wait for animation)
    showAllAdminPages();
    
    // Render statistics with animation in background (doesn't block UI)
    renderAdminSummaryWithAnimation();
    
    // Mark that animation has been shown in this session
    sessionStorage.setItem('statisticsAnimationShown', 'true');
    
    // Clear the flag
    state.isInitialLoad = false;
  } else {
    // Animation already shown, just render normally and show pages immediately
    state.isInitialLoad = false;
    renderAdminSummary();
    showAllAdminPages();
  }
}

function hideAllAdminPages() {
  // Don't hide pages anymore - show them immediately for better UX
  // Just ensure the correct page is active
  setAdminPage(state.adminPage || 'apartments', state.expensesCategory);
  
  // Keep admin nav visible
  // if (elements.adminNav) {
  //   elements.adminNav.style.display = 'none';
  // }
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
      // Setup pagination even if no user (will show empty)
      setupApartmentsPagination();
      if (state.paginationInstances.apartments) {
        state.paginationInstances.apartments.reset();
      }
    }
    populateApartmentSelects();
    return;
  }

  // Use pagination instead of loading all at once
  setupApartmentsPagination();
  
  // Reset pagination to load from the beginning
  if (state.paginationInstances.apartments) {
    state.paginationInstances.apartments.reset();
  }
  
  populateApartmentSelects();
}

async function loadTenants() {
  const { data, error } = await withRetryOnAuthLock(() =>
    supabase
      .from("tenants")
      .select("id, full_name, email, phone, entry_date")
      .order("full_name")
  );

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
  
  await withRetryOnAuthLock(async () => {
  // First, get all apartment IDs for this landlord
  const apartmentQuery = window.DbScope
    ? window.DbScope.landlordApartmentIds(supabase, state.currentUser.id)
    : supabase.from("apartments").select("id").eq("landlord_id", state.currentUser.id);
  const { data: landlordApartments, error: apartmentError } = await apartmentQuery;
  
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
  
  // Sync apartment rental_status based on active contracts
  await syncApartmentRentalStatus();
  
  renderContractsTable();
  populateContractSelects();
  populateGlobalContractFilter();
  updateFormContractLock();
  handleDebtContractChange();
  maybeEnsureRecurringDebts();
  
  if (state.paginationInstances.apartments) renderApartmentsTable();
  
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
  });
}

/**
 * Sync apartment rental_status based on active contracts
 * If apartment has active contract, set rental_status to "rented"
 * If no active contract, set rental_status to "available" (unless manually set to "not_renting")
 */
async function syncApartmentRentalStatus() {
  if (!state.currentUser || !state.contracts || state.contracts.length === 0) return;
  
  // Get all landlord apartment IDs
  const { data: landlordApartments, error: apartmentError } = await supabase
    .from("apartments")
    .select("id, rental_status")
    .eq("landlord_id", state.currentUser.id);
  
  if (apartmentError || !landlordApartments) return;
  
  // Create a set of apartment IDs with active contracts
  const apartmentsWithActiveContracts = new Set(
    state.contracts
      .filter(c => c.is_active && c.apartment_id)
      .map(c => String(c.apartment_id))
  );
  
  // Update apartments with active contracts to "rented"
  const apartmentsToRent = landlordApartments.filter(
    apt => apartmentsWithActiveContracts.has(String(apt.id)) && apt.rental_status !== "rented"
  );
  
  if (apartmentsToRent.length > 0) {
    const idsToUpdate = apartmentsToRent.map(a => a.id);
    const { error: updateError } = await supabase
      .from("apartments")
      .update({ rental_status: "rented" })
      .in("id", idsToUpdate);
    
    if (updateError) {
      console.warn("Failed to sync apartment rental_status to rented:", updateError);
    }
  }
  
  // Update apartments without active contracts to "available" (only if currently "rented")
  const apartmentsToMakeAvailable = landlordApartments.filter(
    apt => !apartmentsWithActiveContracts.has(String(apt.id)) && apt.rental_status === "rented"
  );
  
  if (apartmentsToMakeAvailable.length > 0) {
    const idsToUpdate = apartmentsToMakeAvailable.map(a => a.id);
    const { error: updateError } = await supabase
      .from("apartments")
      .update({ rental_status: "available" })
      .in("id", idsToUpdate);
    
    if (updateError) {
      console.warn("Failed to sync apartment rental_status to available:", updateError);
    }
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
  
  // Setup pagination after loading
  setupDebtsPagination();
  
  // If pagination was set up, it will handle rendering
  // Otherwise use fallback rendering
  if (!state.paginationInstances.debts) {
    renderDebtsTable();
  }
  
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

async function getLandlordContractIds() {
  if (!state.currentUser) return { data: [], error: null };
  if (window.DbScope) {
    return window.DbScope.landlordContractIds(supabase, state.currentUser.id);
  }
  const apartments = await supabase
    .from("apartments")
    .select("id")
    .eq("landlord_id", state.currentUser.id);
  if (apartments.error || !apartments.data?.length) {
    return { data: [], error: apartments.error || null };
  }
  return supabase
    .from("contracts")
    .select("id")
    .in("apartment_id", apartments.data.map((row) => row.id));
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
  
  await withRetryOnAuthLock(async () => {
  const { data: landlordContracts, error: contractError } = await getLandlordContractIds();
  
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

  // Setup pagination after loading
  setupPaymentsPagination();
  
  // Also render using old method if pagination not set up
  if (!state.paginationInstances.payments) {
    renderPaymentsTable();
  }

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
  
  await withRetryOnAuthLock(async () => {
  const { data: landlordContracts, error: contractError } = await getLandlordContractIds();
  
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
  });
}


async function loadRequests() {
  if (!state.currentUser || !elements.requestsTableBody) return;

  // Get all apartment IDs for this landlord
  const apartmentQuery = window.DbScope
    ? window.DbScope.landlordApartmentIds(supabase, state.currentUser.id)
    : supabase.from("apartments").select("id").eq("landlord_id", state.currentUser.id);
  const { data: landlordApartments, error: apartmentError } = await apartmentQuery;

  if (apartmentError || !landlordApartments || landlordApartments.length === 0) {
    if (elements.requestsTableBody) {
      clear(elements.requestsTableBody);
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '7');
      td.textContent = 'No requests';
      tr.appendChild(td);
      elements.requestsTableBody.appendChild(tr);
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

  // Check and auto-reject expired contract requests (60 minutes)
  if (requests && requests.length > 0) {
    const now = new Date().getTime();
    const expiredRequests = requests.filter(request => {
      if (request.status !== "pending" || request.request_type !== "contract") {
        return false;
      }
      const createdAt = new Date(request.created_at).getTime();
      const expirationTime = createdAt + (60 * 60 * 1000); // 60 minutes
      return now > expirationTime;
    });

    // Auto-reject expired requests
    if (expiredRequests.length > 0) {
      const expiredIds = expiredRequests.map(r => r.id);
      await supabase
        .from("apartment_requests")
        .update({ status: "rejected" })
        .in("id", expiredIds);
      
      // Remove expired requests from the list
      requests.forEach((request, index) => {
        if (expiredIds.includes(request.id)) {
          requests[index].status = "rejected";
        }
      });
    }
  }

  if (error) {
    console.error("loadRequests", error);
    if (elements.requestsTableBody) {
      clear(elements.requestsTableBody);
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '7');
      td.textContent = 'Error loading requests';
      tr.appendChild(td);
      elements.requestsTableBody.appendChild(tr);
    }
    return;
  }

  if (!requests || requests.length === 0) {
    if (elements.requestsTableBody) {
      clear(elements.requestsTableBody);
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '7');
      td.textContent = 'No requests';
      tr.appendChild(td);
      elements.requestsTableBody.appendChild(tr);
    }
    return;
  }

  // Get apartment and tenant details
  const apartmentIdsInRequests = [...new Set(requests.map(r => r.apartment_id))];
  const tenantIdsInRequests = [...new Set(requests.map(r => r.tenant_id))];

  const { data: apartments } = await supabase
    .from("apartments")
    .select("id, name, landlord_id")
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
    // Clear container using DOM methods
    while (elements.requestsTableBody.firstChild) {
      elements.requestsTableBody.removeChild(elements.requestsTableBody.firstChild);
    }
    
    requests.forEach(request => {
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

      const tr = document.createElement('tr');
      
      // Apartment cell
      const apartmentCell = document.createElement('td');
      apartmentCell.setAttribute('data-label', 'Apartment');
      apartmentCell.textContent = sanitize(apartment?.name || translate("unknown"));
      tr.appendChild(apartmentCell);
      
      // Tenant cell
      const tenantCell = document.createElement('td');
      tenantCell.setAttribute('data-label', 'Tenant');
      tenantCell.textContent = sanitize(tenant?.full_name || translate("unknown"));
      tr.appendChild(tenantCell);
      
      // Type cell
      const typeCell = document.createElement('td');
      typeCell.setAttribute('data-label', 'Type');
      typeCell.textContent = requestTypeText;
      tr.appendChild(typeCell);
      
      // Message cell
      const messageCell = document.createElement('td');
      messageCell.setAttribute('data-label', 'Message');
      messageCell.textContent = sanitize(request.message || "-");
      tr.appendChild(messageCell);
      
      // Date cell
      const dateCell = document.createElement('td');
      dateCell.setAttribute('data-label', 'Date');
      dateCell.textContent = formatDate(request.created_at);
      tr.appendChild(dateCell);
      
      // Status cell
      const statusCell = document.createElement('td');
      statusCell.setAttribute('data-label', 'Status');
      const statusBadge = document.createElement('span');
      statusBadge.className = `badge ${statusClass === 'pending' ? 'bg-warning' : statusClass === 'accepted' ? 'bg-success' : 'bg-danger'}`;
      statusBadge.textContent = statusText;
      statusCell.appendChild(statusBadge);
      tr.appendChild(statusCell);
      
      // Actions cell
      const actionsCell = document.createElement('td');
      actionsCell.setAttribute('data-label', 'Actions');
      if (request.status === "pending") {
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'btn-group request-actions-group';
        
        // View button - for contract requests, show the contract preview in view mode
        if (request.request_type === "contract") {
          const viewBtn = document.createElement('button');
          viewBtn.type = 'button';
          viewBtn.className = 'btn btn-outline-secondary btn-sm';
          viewBtn.setAttribute('data-action', 'view-request');
          viewBtn.setAttribute('data-id', request.id);
          viewBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' + (translate("view") || "View");
          viewBtn.addEventListener("click", () => {
            showAdminContractPreview(request, apartment, tenant, "view");
          });
          actionsGroup.appendChild(viewBtn);
        }
        
        // Approve button
        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'btn btn-primary btn-sm';
        acceptBtn.setAttribute('data-action', 'accept-request');
        acceptBtn.setAttribute('data-id', request.id);
        acceptBtn.setAttribute('data-apartment-id', request.apartment_id);
        acceptBtn.setAttribute('data-tenant-id', request.tenant_id);
        acceptBtn.setAttribute('data-request-type', request.request_type);
        acceptBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>' + (translate("approve") || "Approve");
        acceptBtn.addEventListener("click", () => {
          if (request.request_type === "contract") {
            showAdminContractPreview(request, apartment, tenant, "approve");
          } else {
            handleAcceptRequest(request.id, request.apartment_id, request.tenant_id, request.request_type);
          }
        });
        actionsGroup.appendChild(acceptBtn);
        
        // Reject button
        const rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'btn btn-outline-danger btn-sm';
        rejectBtn.setAttribute('data-action', 'reject-request');
        rejectBtn.setAttribute('data-id', request.id);
        rejectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' + (translate("reject") || "Reject");
        rejectBtn.addEventListener("click", () => {
          if (request.request_type === "contract") {
            showAdminContractPreview(request, apartment, tenant, "reject");
          } else {
            handleRejectRequest(request.id);
          }
        });
        actionsGroup.appendChild(rejectBtn);
        
        actionsCell.appendChild(actionsGroup);
      } else {
        // Show view button for non-pending requests too (to see the contract details)
        if (request.request_type === "contract") {
          const viewBtn = document.createElement('button');
          viewBtn.type = 'button';
          viewBtn.className = 'btn btn-outline-secondary btn-sm';
          viewBtn.setAttribute('data-action', 'view-request');
          viewBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 3px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' + (translate("view") || "View");
          viewBtn.addEventListener("click", () => {
            showAdminContractPreview(request, apartment, tenant, "view");
          });
          actionsCell.appendChild(viewBtn);
        }
      }
      tr.appendChild(actionsCell);
      
      elements.requestsTableBody.appendChild(tr);
    });
  }
}

async function loadPaymentRequests() {
  const container = document.getElementById("paymentRequestsBody");
  const historyContainer = document.getElementById("paymentRequestsHistoryBody");
  if (!container) return;

  if (!state.currentUser) {
    container.innerHTML = '<p class="text-muted">' + (translate("paymentRequestsNone") || "No payment requests.") + '</p>';
    if (historyContainer) historyContainer.innerHTML = "";
    return;
  }

  const { data: landlordContracts, error: contractErr } = await getLandlordContractIds();

  if (contractErr || !landlordContracts || landlordContracts.length === 0) {
    container.innerHTML = '<p class="text-muted">' + (translate("paymentRequestsNone") || "No payment requests.") + '</p>';
    if (historyContainer) historyContainer.innerHTML = "";
    return;
  }

  const contractIds = landlordContracts.map((c) => c.id);

  const { data: allRequests, error } = await supabase
    .from("payment_requests")
    .select("id, tenant_id, contract_id, bill_id, expense_type, amount, payment_date, method, proof_image, status, created_at")
    .in("contract_id", contractIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadPaymentRequests", error);
    container.innerHTML = '<p class="text-danger">' + (translate("errorLoad") || "Error loading.") + '</p>';
    if (historyContainer) historyContainer.innerHTML = "";
    return;
  }

  const requests = allRequests || [];
  const tenantIds = [...new Set(requests.map((r) => r.tenant_id))];
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, full_name, email")
    .in("id", tenantIds);

  const tenantsMap = {};
  tenants?.forEach((t) => { tenantsMap[t.id] = t; });

  state.paymentRequestsData = { requests, tenantsMap };

  renderPaymentRequestsFiltered();
}

function renderPaymentRequestsFiltered() {
  const container = document.getElementById("paymentRequestsBody");
  const historyContainer = document.getElementById("paymentRequestsHistoryBody");
  if (!container || !state.paymentRequestsData) return;

  const { requests, tenantsMap } = state.paymentRequestsData;
  const typeFilter = elements.paymentProofFilterType?.value || "all";

  const filterReq = (r) => {
    if (state.globalContractFilter && !equalsId(r.contract_id, state.globalContractFilter)) return false;
    if (typeFilter !== "all") {
      const reqType = (r.expense_type || "").toLowerCase();
      const filterType = typeFilter.toLowerCase();
      if (reqType !== filterType) return false;
    }
    return true;
  };

  const pending = requests.filter((r) => r.status === "pending" && filterReq(r));
  const decided = requests.filter((r) => (r.status === "accepted" || r.status === "declined") && filterReq(r));

  container.innerHTML = "";
  if (pending.length === 0) {
    container.innerHTML = '<p class="text-muted">' + (translate("paymentRequestsNone") || "No pending payment requests.") + '</p>';
  } else {
    pending.forEach((req) => {
      const tenant = tenantsMap[req.tenant_id];
      const typeLabel = getDebtTypeLabel({ type: req.expense_type }) || req.expense_type;
      const card = document.createElement("div");
      card.className = "payment-request-card";
      card.innerHTML = `
        <div class="payment-request-info">
          <strong>${sanitize(tenant?.full_name || translate("unknown"))}</strong>
          <span>${sanitize(typeLabel)} – ${formatCurrency(req.amount)}</span>
          <span>${formatDate(req.payment_date)} | ${sanitize(req.method || "-")}</span>
        </div>
        <div class="payment-request-proof">
          ${safeMediaUrl(req.proof_image) ? `<img src="${safeMediaUrl(req.proof_image)}" alt="Proof" class="payment-proof-thumb" />` : ""}
        </div>
        <div class="payment-request-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="accept-payment-request" data-id="${req.id}">${translate("accept") || "Accept"}</button>
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="decline-payment-request" data-id="${req.id}">${translate("reject") || "Decline"}</button>
        </div>
      `;
      card.querySelector('[data-action="accept-payment-request"]').addEventListener("click", () => handleAcceptPaymentRequest(req.id));
      card.querySelector('[data-action="decline-payment-request"]').addEventListener("click", () => handleDeclinePaymentRequest(req.id));
      attachPaymentProofThumbViewer(card, req, tenant?.full_name);
      container.appendChild(card);
    });
  }

  if (historyContainer) {
    historyContainer.innerHTML = "";
    if (decided.length === 0) {
      historyContainer.innerHTML = '<p class="text-muted">' + (translate("paymentRequestsHistoryNone") || "No payment proofs decided yet.") + '</p>';
    } else {
      decided.forEach((req) => {
        const tenant = tenantsMap[req.tenant_id];
        const typeLabel = getDebtTypeLabel({ type: req.expense_type }) || req.expense_type;
        const statusLabel = req.status === "accepted" ? (translate("paymentProofStatusAccepted") || "Accepted") : (translate("paymentProofStatusDeclined") || "Declined");
        const statusClass = req.status === "accepted" ? "badge bg-success" : "badge bg-danger";
        const card = document.createElement("div");
        card.className = "payment-request-card payment-request-card-history";
        card.innerHTML = `
          <div class="payment-request-info">
            <strong>${sanitize(tenant?.full_name || translate("unknown"))}</strong>
            <span>${sanitize(typeLabel)} – ${formatCurrency(req.amount)}</span>
            <span>${formatDate(req.payment_date)} | ${sanitize(req.method || "-")}</span>
            <span class="${statusClass}">${statusLabel}</span>
          </div>
          <div class="payment-request-proof">
            ${safeMediaUrl(req.proof_image) ? `<img src="${safeMediaUrl(req.proof_image)}" alt="Proof" class="payment-proof-thumb" />` : ""}
          </div>
        `;
        attachPaymentProofThumbViewer(card, req, tenant?.full_name);
        historyContainer.appendChild(card);
      });
    }
  }
}

function attachPaymentProofThumbViewer(card, req, tenantName) {
  const thumb = card.querySelector(".payment-proof-thumb");
  const proofUrl = safeMediaUrl(req.proof_image);
  if (!thumb || !proofUrl || typeof window.openPhotoViewer !== "function") return;
  const label = (translate("paymentProof") || "payment-proof") + "-" + String(tenantName || "tenant").replace(/[^a-zA-Z0-9-_]/g, "_");
  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.openPhotoViewer([proofUrl], 0, label);
  };
  thumb.addEventListener("click", open);
  thumb.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") open(e);
  });
  thumb.setAttribute("role", "button");
  thumb.setAttribute("tabindex", "0");
  thumb.setAttribute("title", translate("viewProof") || "View full size");
}

async function handleAcceptPaymentRequest(requestId) {
  const { data: req, error: fetchErr } = await supabase
    .from("payment_requests")
    .select("id, tenant_id, contract_id, bill_id, expense_type, amount, payment_date, method")
    .eq("id", requestId)
    .eq("status", "pending")
    .single();

  if (fetchErr || !req) {
    notify("error", translate("errorLoad") || "Request not found or already processed.");
    await loadPaymentRequests();
    return;
  }

  const tableInfo = EXPENSE_TABLES[req.expense_type];
  if (!tableInfo) {
    notify("error", translate("errorLoad") || "Invalid expense type.");
    return;
  }

  const { error: insertErr } = await supabase.from(tableInfo.payments).insert({
    tenant_id: req.tenant_id,
    contract_id: req.contract_id,
    bill_id: req.bill_id,
    amount: req.amount,
    payment_date: req.payment_date,
    method: req.method || "Payment proof",
  });

  if (insertErr) {
    notify("error", translate("errorLoad") || "Failed to record payment.");
    console.error("handleAcceptPaymentRequest", insertErr);
    return;
  }

  const { error: updateErr } = await supabase
    .from("payment_requests")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (updateErr) {
    console.error("handleAcceptPaymentRequest update", updateErr);
  }

  if (tableInfo.hasStatus && req.bill_id) {
    const debt = state.debts.find((d) => equalsId(d.id, req.bill_id));
    if (debt) {
      const debtPayments = (state.payments || []).filter((p) => equalsId(p.bill_id, req.bill_id) || equalsId(p.debt_id, req.bill_id));
      const totalPaid = debtPayments.reduce((s, p) => s + normalizeCurrency(p.amount), 0) + normalizeCurrency(req.amount);
      const debtAmount = normalizeCurrency(debt.amount);
      if (totalPaid >= debtAmount - 0.001) {
        await supabase.from(tableInfo.bills).update({ is_paid: true }).eq("id", req.bill_id);
      }
    }
  }

  notify("success", translate("paymentRequestAccepted") || "Payment accepted and recorded.");
  if (typeof sendNotification === "function") {
    sendNotification(supabase, { type: "payment-proof-accepted", id: requestId });
  }
  await loadPayments();
  await loadDebts();
  await loadPaymentRequests();
}

async function handleDeclinePaymentRequest(requestId) {
  if (!confirm(translate("confirmDeclinePaymentRequest") || "Are you sure you want to decline this payment proof?")) {
    return;
  }

  const { error } = await supabase
    .from("payment_requests")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    notify("error", translate("errorLoad") || "Failed to decline.");
    console.error("handleDeclinePaymentRequest", error);
    return;
  }

  notify("success", translate("paymentRequestDeclined") || "Payment proof declined.");
  if (typeof sendNotification === "function") {
    sendNotification(supabase, { type: "payment-proof-declined", id: requestId });
  }
  await loadPaymentRequests();
}

// Admin Contract Preview Modal with Countdown

async function handleAcceptRequest(requestId, apartmentId, tenantId, requestType) {
  if (!confirm(translate("confirmAcceptRequest") || "Are you sure you want to accept this request?")) {
    return;
  }

  // Get the request to read the contract preferences from the message
  const { data: requestData, error: requestError } = await supabase
    .from("apartment_requests")
    .select("message")
    .eq("id", requestId)
    .single();

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

  // If it's a contract request, automatically create a contract
  if (requestType === "contract") {
    // Get apartment details to use monthly_rent if available
    const { data: apartment, error: aptError } = await supabase
      .from("apartments")
      .select("id, monthly_rent")
      .eq("id", apartmentId)
      .single();

    if (aptError) {
      console.error("Failed to load apartment details:", aptError);
      notify("error", "Failed to load apartment details. Please try again.");
      await loadRequests();
      return;
    }

    // Parse contract preferences from request message
    let contractPreferences = null;
    if (requestData?.message) {
      try {
        const parsed = JSON.parse(requestData.message);
        if (parsed.preferences) {
          contractPreferences = parsed.preferences;
        }
      } catch (e) {
        // Message is not JSON, use defaults
      }
    }

    // Set default start date to today if not specified in preferences
    const today = new Date();
    const startDate = contractPreferences?.start_date || today.toISOString().split('T')[0];
    const endDate = contractPreferences?.end_date || null;
    const depositAmount = contractPreferences?.deposit_amount || 0;

    // Create contract with preferences or default values
    const contractPayload = {
      apartment_id: apartmentId,
      tenant_id: tenantId,
      start_date: startDate,
      end_date: endDate,
      monthly_rent: apartment?.monthly_rent || 0,
      monthly_garbage: 0,
      monthly_maintenance: 0,
      deposit_amount: depositAmount,
      is_active: true,
    };

    console.log("Creating contract with payload:", contractPayload);
    const { error: contractError } = await supabase
      .from("contracts")
      .insert(contractPayload);

    if (contractError) {
      console.error("Failed to create contract:", contractError);
      notify("error", `Failed to create contract: ${contractError.message || "Unknown error"}`);
      // Still reload requests to show the accepted status
      await loadRequests();
      return;
    }

    // Update apartment rental_status to "rented" since contract is active
    const { error: apartmentStatusError } = await supabase
      .from("apartments")
      .update({ rental_status: "rented" })
      .eq("id", apartmentId);
    
    if (apartmentStatusError) {
      console.warn("Failed to update apartment rental_status:", apartmentStatusError);
    }

    notify("success", translate("requestAcceptedContractCreated") || "Request accepted and contract created successfully!");
    
    // Reload contracts to show the new contract
    await loadContracts();
    await loadApartments();
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

  if (typeof sendNotification === "function") {
    sendNotification(supabase, { type: status === "accepted" ? "request-accepted" : "request-rejected", id: requestId });
  }
}

function renderApartmentsTable() {
  // If pagination is set up, don't use the old render method
  if (state.paginationInstances.apartments) {
    // Just refresh the pagination to update contract status
    const instance = state.paginationInstances.apartments;
    if (instance && instance.state) {
      // Re-render existing items with updated contract status
      const items = instance.getItems();
      if (items.length > 0) {
        // Clear and re-render with updated status
        const container = elements.apartmentsTableBody;
        // Clear container using DOM methods
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        items.forEach(item => {
          const row = instance.callbacks.renderItem(item);
          container.appendChild(row);
        });
        // Re-add sentinel
        if (instance.elements.sentinel) {
          container.appendChild(instance.elements.sentinel);
        }
        if (instance.elements.loadMoreButton) {
          container.appendChild(instance.elements.loadMoreButton);
        }
      }
    }
    return;
  }

}

function renderTenantsTable() {
  // Clear container using DOM methods
  clear(elements.tenantsTableBody);
  
  // Create rows using DOM methods
  state.tenants.forEach((tenant) => {
    const tr = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.setAttribute('data-label', 'Full Name');
    nameCell.textContent = sanitize(tenant.full_name);
    tr.appendChild(nameCell);
    
    const emailCell = document.createElement('td');
    emailCell.setAttribute('data-label', 'Email');
    emailCell.textContent = sanitize(tenant.email || "");
    tr.appendChild(emailCell);
    
    const phoneCell = document.createElement('td');
    phoneCell.setAttribute('data-label', 'Phone');
    phoneCell.textContent = sanitize(tenant.phone || "");
    tr.appendChild(phoneCell);
    
    const idCell = document.createElement('td');
    idCell.setAttribute('data-label', 'ID');
    idCell.textContent = tenant.id;
    tr.appendChild(idCell);
    
    elements.tenantsTableBody.appendChild(tr);
  });
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
    
    // Create row using DOM methods
    const tr = document.createElement('tr');
    
    // Apartment cell
    const apartmentCell = document.createElement('td');
    apartmentCell.setAttribute('data-label', 'Apartment');
    apartmentCell.textContent = sanitize(apartment?.name || translate("unknown"));
    tr.appendChild(apartmentCell);
    
    // Tenant cell
    const tenantCell = document.createElement('td');
    tenantCell.setAttribute('data-label', 'Tenant');
    tenantCell.textContent = sanitize(tenant?.full_name || translate("unknown"));
    tr.appendChild(tenantCell);
    
    // Start Date cell
    const startDateCell = document.createElement('td');
    startDateCell.setAttribute('data-label', 'Start Date');
    startDateCell.textContent = formatDate(contract.start_date);
    tr.appendChild(startDateCell);
    
    // End Date cell
    const endDateCell = document.createElement('td');
    endDateCell.setAttribute('data-label', 'End Date');
    endDateCell.textContent = formatDate(contract.end_date);
    tr.appendChild(endDateCell);
    
    // Period cell (MM/YYYY from start to end)
    const periodCell = document.createElement('td');
    periodCell.setAttribute('data-label', 'Period');
    const startPeriod = formatPeriod(contract.start_date);
    const endPeriod = formatPeriod(contract.end_date);
    if (startPeriod === "-" && endPeriod === "-") {
      periodCell.textContent = "-";
    } else if (endPeriod === "-" || startPeriod === endPeriod) {
      periodCell.textContent = startPeriod;
    } else {
      periodCell.textContent = `${startPeriod} - ${endPeriod}`;
    }
    tr.appendChild(periodCell);
    
    // Monthly Rent cell
    const rentCell = document.createElement('td');
    rentCell.setAttribute('data-label', 'Monthly Rent');
    rentCell.textContent = formatCurrency(contract.monthly_rent);
    tr.appendChild(rentCell);
    
    // Monthly Garbage cell
    const garbageCell = document.createElement('td');
    garbageCell.setAttribute('data-label', 'Monthly Garbage');
    garbageCell.textContent = formatCurrency(contract.monthly_garbage);
    tr.appendChild(garbageCell);
    
    // Monthly Maintenance cell
    const maintenanceCell = document.createElement('td');
    maintenanceCell.setAttribute('data-label', 'Monthly Maintenance');
    maintenanceCell.textContent = formatCurrency(contract.monthly_maintenance);
    tr.appendChild(maintenanceCell);
    
    // Deposit cell
    const depositCell = document.createElement('td');
    depositCell.setAttribute('data-label', 'Deposit');
    depositCell.textContent = formatCurrency(contract.deposit_amount);
    tr.appendChild(depositCell);
    
    // Active cell
    const activeCell = document.createElement('td');
    activeCell.setAttribute('data-label', 'Active');
    activeCell.textContent = contract.is_active ? translate("yes") : translate("no");
    tr.appendChild(activeCell);
    
    // Actions cell
    const actionsCell = document.createElement('td');
    actionsCell.setAttribute('data-label', 'Actions');
    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'actions-group';
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'btn btn-outline-primary btn-sm';
    actionBtn.setAttribute('data-action', `${actionType}-contract`);
    actionBtn.setAttribute('data-id', contract.id);
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener("click", () =>
      handleContractStatusChange(contract.id, !isActive)
    );
    actionsGroup.appendChild(actionBtn);
    actionsCell.appendChild(actionsGroup);
    tr.appendChild(actionsCell);
    
    return tr;
  };

  // Render active contracts
  if (elements.contractsActiveTableBody) {
    // Clear container using DOM methods
    clear(elements.contractsActiveTableBody);
    
    activeContracts.forEach(contract => {
      const row = buildRow(contract);
      elements.contractsActiveTableBody.appendChild(row);
    });
  }

  // Render inactive contracts
  if (elements.contractsInactiveTableBody) {
    // Clear container using DOM methods
    clear(elements.contractsInactiveTableBody);
    
    inactiveContracts.forEach(contract => {
      const row = buildRow(contract);
      elements.contractsInactiveTableBody.appendChild(row);
    });
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
    // Always ask for end date when deactivating
    showDeactivateContractModal(contractId);
    return;
  }

  await performContractDeactivation(contractId, shouldActivate);
}

async function performContractDeactivation(contractId, shouldActivate, endDate = null) {
  const contract = state.contracts.find((c) => equalsId(c.id, contractId));
  if (!contract) return;

  const updateData = { is_active: shouldActivate };
  if (endDate) {
    updateData.end_date = endDate;
  }

  const { error } = await supabase
    .from("contracts")
    .update(updateData)
    .eq("id", contractId);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleContractStatusChange", error);
    return;
  }

  // Update apartment rental_status based on contract status
  if (contract.apartment_id) {
    const newRentalStatus = shouldActivate ? "rented" : "available";
    const { error: apartmentError } = await supabase
      .from("apartments")
      .update({ rental_status: newRentalStatus })
      .eq("id", contract.apartment_id);
    
    if (apartmentError) {
      console.warn("Failed to update apartment rental_status:", apartmentError);
    }
  }

  notify(
    "success",
    translate(shouldActivate ? "successContractActivate" : "successContractDeactivate")
  );
  await loadContracts();
  await loadApartments();
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
  const pager = state.paginationInstances.debts;
  if (pager) {
    if (state.editingDebtId) pager.refresh();
    else pager.reset();
  }
  renderUtilitySummary();
}


function renderPaymentsTable() {
  const pager = state.paginationInstances.payments;
  if (!pager) return;
  if (state.editingPaymentId) pager.refresh();
  else pager.reset();
}

function renderOpenExpensesTable() {
  if (!elements.openExpensesTableBody) return;
  
  // Clear container using DOM methods
  clear(elements.openExpensesTableBody);
  
  const filteredDebts = getFilteredDebts();
  // Exclude utility types from open expenses (they don't have is_paid status)
  const openDebts = (filteredDebts || []).filter((debt) => !debt.is_paid && !isUtilityType(debt.type));
  
  if (openDebts.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '6');
    td.textContent = sanitize(translate("summaryNoData"));
    tr.appendChild(td);
    elements.openExpensesTableBody.appendChild(tr);
  } else {
    openDebts.forEach((debt) => {
      const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
      const status = getDebtStatus(debt);
      const typeLabel = getDebtTypeLabel(debt);
      
      const tr = document.createElement('tr');
      
      // Tenant cell
      const tenantCell = document.createElement('td');
      tenantCell.textContent = sanitize(tenant?.full_name || translate("unknown"));
      tr.appendChild(tenantCell);
      
      // Type cell
      const typeCell = document.createElement('td');
      typeCell.textContent = sanitize(typeLabel);
      tr.appendChild(typeCell);
      
      // Amount cell
      const amountCell = document.createElement('td');
      amountCell.textContent = formatCurrency(debt.amount);
      tr.appendChild(amountCell);
      
      // Due date cell
      const dueDateCell = document.createElement('td');
      dueDateCell.textContent = formatDate(debt.due_date);
      tr.appendChild(dueDateCell);
      
      // Period cell
      const periodCell = document.createElement('td');
      periodCell.textContent = formatPeriod(debt.due_date);
      tr.appendChild(periodCell);
      
      // Status cell
      const statusCell = document.createElement('td');
      const statusTag = document.createElement('span');
      statusTag.className = `badge ${status.class === 'overdue' ? 'bg-danger' : 'bg-warning'}`;
      statusTag.textContent = status.label;
      statusCell.appendChild(statusTag);
      tr.appendChild(statusCell);
      
      elements.openExpensesTableBody.appendChild(tr);
    });
  }
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
  // Clear select using DOM methods
  while (elements.contractApartment.firstChild) {
    elements.contractApartment.removeChild(elements.contractApartment.firstChild);
  }
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = translate("selectApartment");
  elements.contractApartment.appendChild(defaultOption);
  
  // Add apartment options
  state.apartments.forEach(apartment => {
    const option = document.createElement('option');
    option.value = apartment.id;
    option.textContent = sanitize(apartment.name);
    elements.contractApartment.appendChild(option);
  });
  
  if (currentValue) {
    elements.contractApartment.value = currentValue;
  }
}

function populateTenantSelects() {
  [
    elements.contractTenant,
    elements.debtTenant,
    elements.tenantSelect,
  ].forEach((select) => {
    if (!select) return;
    const currentValue = select.value;
    
    // Clear select using DOM methods
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
    
    // Add default option
    const placeholder = translate("selectTenant");
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);
    
    // Add tenant options
    state.tenants.forEach(tenant => {
      const option = document.createElement('option');
      option.value = tenant.id;
      option.textContent = sanitize(tenant.full_name);
      select.appendChild(option);
    });
    
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function populateContractSelects() {
  const currentValue = elements.debtContract.value;
  // Clear select using DOM methods
  while (elements.debtContract.firstChild) {
    elements.debtContract.removeChild(elements.debtContract.firstChild);
  }
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = translate("selectContract");
  elements.debtContract.appendChild(defaultOption);
  
  // Add contract options
  state.contracts
    .filter((contract) => contract && contract.is_active)
    .forEach((contract) => {
      const tenant = state.tenants.find((t) => equalsId(t.id, contract.tenant_id));
      const apartment = state.apartments.find(
        (a) => equalsId(a.id, contract.apartment_id)
      );
      const option = document.createElement('option');
      option.value = contract.id;
      option.textContent = `${sanitize(apartment?.name || translate("unknown"))} — ${sanitize(
        tenant?.full_name || translate("unknown")
      )}`;
      elements.debtContract.appendChild(option);
    });
  
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
  state.editingDebtId = debt.id;
  
  // Show expense form (remove .hidden which uses !important)
  if (elements.debtForm) {
    elements.debtForm.classList.remove("hidden");
    elements.debtForm.style.display = "grid";
  }
  if (elements.toggleExpenseFormBtn) {
    elements.toggleExpenseFormBtn.textContent = translate("cancel") || "Cancel";
  }
  
  // Hide payment form
  if (elements.paymentForm) {
    elements.paymentForm.style.display = "none";
  }
  if (elements.togglePaymentFormBtn) {
    elements.togglePaymentFormBtn.textContent = translate("expenseFormTogglePayment") || "Record Payment";
  }
  
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
  
  // Hide form
  if (elements.debtForm) {
    elements.debtForm.style.display = "none";
  }
  if (elements.toggleExpenseFormBtn) {
    elements.toggleExpenseFormBtn.textContent = translate("expenseFormToggleExpense") || "Create Expense";
  }
}

function startEditPayment(paymentId) {
  const payment = state.payments.find((p) => equalsId(p.id, paymentId));
  if (!payment) return;
  state.editingPaymentId = payment.id;
  
  // Show payment form (remove .hidden which uses !important)
  if (elements.paymentForm) {
    elements.paymentForm.classList.remove("hidden");
    elements.paymentForm.style.display = "grid";
  }
  if (elements.togglePaymentFormBtn) {
    elements.togglePaymentFormBtn.textContent = translate("cancel") || "Cancel";
  }
  
  // Hide expense form
  if (elements.debtForm) {
    elements.debtForm.style.display = "none";
  }
  if (elements.toggleExpenseFormBtn) {
    elements.toggleExpenseFormBtn.textContent = translate("expenseFormToggleExpense") || "Create Expense";
  }
  
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
  
  // Hide form
  if (elements.paymentForm) {
    elements.paymentForm.style.display = "none";
  }
  if (elements.togglePaymentFormBtn) {
    elements.togglePaymentFormBtn.textContent = translate("expenseFormTogglePayment") || "Record Payment";
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
  // Clear select using DOM methods
  while (elements.tenantSelect.firstChild) {
    elements.tenantSelect.removeChild(elements.tenantSelect.firstChild);
  }
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = translate("selectTenant");
  elements.tenantSelect.appendChild(defaultOption);
  
  // Add tenant options
  state.tenants.forEach(tenant => {
    const option = document.createElement('option');
    option.value = tenant.id;
    option.textContent = sanitize(tenant.full_name);
    if (previouslySelected && equalsId(tenant.id, previouslySelected)) {
      option.selected = true;
    }
    elements.tenantSelect.appendChild(option);
  });
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


async function editApartment(apartmentId) {
  // First try to get from state (might have limited fields)
  let apartment = state.apartments.find(a => equalsId(a.id, apartmentId));
  
  // Fetch full apartment data from database to ensure we have all fields
  try {
    // Try to get all columns explicitly first
    let { data: fullApartment, error } = await supabase
      .from("apartments")
      .select("id, name, address, electricity_code, heating_code, water_code, waste_code, photos, description, condition, rooms, balconies, bathrooms, area, municipality, neighborhood, monthly_rent, features, rental_status, rental_rules")
      .eq("id", apartmentId)
      .single();
    
    // If that fails due to missing columns, try with select("*") which will get whatever exists
    if (error && (error.code === 'PGRST204' || error.status === 400 || error.message?.includes('column'))) {
      const fallbackQuery = await supabase
        .from("apartments")
        .select("*")
        .eq("id", apartmentId)
        .single();
      fullApartment = fallbackQuery.data;
      error = fallbackQuery.error;
    }
    
    if (!error && fullApartment) {
      apartment = fullApartment;
    } else if (!apartment) {
      // If we couldn't fetch and don't have it in state, show error
      notify("error", translate("errorLoad"));
      console.error("editApartment fetch error:", error);
      return;
    }
  } catch (err) {
    console.warn("Could not fetch full apartment data, using cached data:", err);
    // Continue with apartment from state if fetch fails
    if (!apartment) {
      notify("error", translate("errorLoad"));
      return;
    }
  }
  
  // Show form
  if (elements.apartmentForm) {
    elements.apartmentForm.classList.remove("hidden");
  }
  if (elements.toggleApartmentFormBtn) {
    elements.toggleApartmentFormBtn.textContent = translate("cancel") || "Cancel";
  }
  
  // Populate form fields
  if (elements.apartmentId) elements.apartmentId.value = apartment.id;
  if (elements.apartmentName) elements.apartmentName.value = apartment.name || "";
  if (elements.apartmentAddress) elements.apartmentAddress.value = apartment.address || "";
  if (elements.apartmentElectricityCode) elements.apartmentElectricityCode.value = apartment.electricity_code || "";
  if (elements.apartmentHeatingCode) elements.apartmentHeatingCode.value = apartment.heating_code || "";
  if (elements.apartmentWaterCode) elements.apartmentWaterCode.value = apartment.water_code || "";
  if (elements.apartmentWasteCode) elements.apartmentWasteCode.value = apartment.waste_code || "";
  if (elements.apartmentRentalStatus) elements.apartmentRentalStatus.value = apartment.rental_status || "available";
  
  // Populate rental rules section (visible only when renting)
  const rentalKeys = ["heating_cooling", "appliances", "pet_policy", "smoking", "min_rental_period", "contract_type", "notice_period", "repairs_paid_by", "subletting_rules", "is_owner_direct"];
  let rentalRules = {};
  if (apartment.rental_rules) {
    try {
      rentalRules = typeof apartment.rental_rules === "string" ? JSON.parse(apartment.rental_rules) : apartment.rental_rules;
    } catch (e) { /* ignore */ }
  }
  rentalKeys.forEach((key) => {
    const el = elements.apartmentForm?.querySelector(`[name="rental_rules_${key}"]`);
    if (el && rentalRules[key] != null) el.value = rentalRules[key];
  });
  if (typeof window.toggleRentalRulesSection === "function") window.toggleRentalRulesSection();
  
  // Populate new fields if they exist (will be empty if columns don't exist in DB yet)
  if (elements.apartmentCondition) elements.apartmentCondition.value = apartment.condition || "";
  if (elements.apartmentRooms) elements.apartmentRooms.value = apartment.rooms || "";
  if (elements.apartmentBalconies) elements.apartmentBalconies.value = apartment.balconies || "";
  if (elements.apartmentBathrooms) elements.apartmentBathrooms.value = apartment.bathrooms || "";
  if (elements.apartmentArea) elements.apartmentArea.value = apartment.area || "";
  if (elements.apartmentMunicipality) elements.apartmentMunicipality.value = apartment.municipality || "";
  if (elements.apartmentNeighborhood) elements.apartmentNeighborhood.value = apartment.neighborhood || "";
  if (elements.apartmentMonthlyRent) elements.apartmentMonthlyRent.value = apartment.monthly_rent || "";
  if (elements.apartmentDescription) elements.apartmentDescription.value = apartment.description || "";
  
  // Toggle neighborhood field visibility based on municipality
  if (typeof window.toggleNeighborhoodField === "function") {
    window.toggleNeighborhoodField();
  } else if (elements.apartmentMunicipality && elements.apartmentNeighborhoodField) {
    const isPrishtina = elements.apartmentMunicipality.value === "Prishtina";
    elements.apartmentNeighborhoodField.style.display = isPrishtina ? "block" : "none";
  }
  
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
  if (previewContainer) {
    while (previewContainer.firstChild) {
      previewContainer.removeChild(previewContainer.firstChild);
    }
  }
  
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
  if (typeof window.toggleRentalRulesSection === "function") window.toggleRentalRulesSection();
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
    rental_status: formData.get("rental_status") || "available",
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
    neighborhood: formData.get("neighborhood")?.trim() || null,
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
  
  // Rental rules (only when available or rented; clear when not_renting)
  const rentalStatus = (formData.get("rental_status") || "available").toLowerCase();
  if (rentalStatus === "available" || rentalStatus === "rented") {
    const rentalKeys = ["heating_cooling", "appliances", "pet_policy", "smoking", "min_rental_period", "contract_type", "notice_period", "repairs_paid_by", "subletting_rules", "is_owner_direct"];
    const rentalRules = {};
    rentalKeys.forEach((key) => {
      const el = event.target.querySelector(`[name="rental_rules_${key}"]`);
      const val = el ? (el.value || "").trim() : "";
      if (val) rentalRules[key] = val;
    });
    payload.rental_rules = Object.keys(rentalRules).length > 0 ? JSON.stringify(rentalRules) : null;
  } else {
    payload.rental_rules = null;
  }
  
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
          rental_status: updatePayload.rental_status || "available",
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
    // Hide form after successful submission
    if (elements.apartmentForm) {
      elements.apartmentForm.classList.add("hidden");
    }
    if (elements.toggleApartmentFormBtn) {
      elements.toggleApartmentFormBtn.textContent = translate("addApartment") || "Add Apartment";
    }
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
let pendingDeactivateContractId = null;

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

function showDeactivateContractModal(contractId) {
  const contract = state.contracts.find((c) => equalsId(c.id, contractId));
  if (!contract) return;

  pendingDeactivateContractId = contractId;

  const modal = document.getElementById("deactivateContractModal");
  const endDateInput = document.getElementById("deactivateContractEndDateInput");
  const confirmBtn = document.getElementById("deactivateContractConfirm");
  const cancelBtn = document.getElementById("deactivateContractCancel");

  if (!modal || !endDateInput || !confirmBtn || !cancelBtn) return;

  // Set min date to contract start date
  if (contract.start_date) {
    endDateInput.min = contract.start_date;
  }
  // Pre-fill with existing end date if set, otherwise default to today
  const today = new Date().toISOString().slice(0, 10);
  const hasEndDate = contract.end_date && String(contract.end_date).trim() !== "";
  endDateInput.value = hasEndDate ? String(contract.end_date).slice(0, 10) : today;
  endDateInput.required = true;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => endDateInput.focus(), 100);

  const handleConfirm = async () => {
    const endDate = endDateInput.value?.trim();
    if (!endDate) {
      notify("error", translate("deactivateContractEndDateRequired") || "Please enter an end date.");
      return;
    }
    closeDeactivateContractModal();
    await performContractDeactivation(contractId, false, endDate);
  };

  const handleCancel = () => {
    closeDeactivateContractModal();
  };

  const handleBackdrop = (e) => {
    if (e.target === modal) closeDeactivateContractModal();
  };

  const handleEscape = (e) => {
    if (e.key === "Escape") closeDeactivateContractModal();
  };

  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  const newConfirmBtn = document.getElementById("deactivateContractConfirm");
  const newCancelBtn = document.getElementById("deactivateContractCancel");

  newConfirmBtn.addEventListener("click", handleConfirm);
  newCancelBtn.addEventListener("click", handleCancel);
  modal.addEventListener("click", handleBackdrop);
  document.addEventListener("keydown", handleEscape);
}

function closeDeactivateContractModal() {
  const modal = document.getElementById("deactivateContractModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
  pendingDeactivateContractId = null;
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

  // Update apartment rental_status to "rented" if contract is active
  if (payload.is_active && payload.apartment_id) {
    const { error: apartmentError } = await supabase
      .from("apartments")
      .update({ rental_status: "rented" })
      .eq("id", payload.apartment_id);
    
    if (apartmentError) {
      console.warn("Failed to update apartment rental_status:", apartmentError);
    }
  }

  event.target.reset();
  elements.contractActive.checked = true;
  notify("success", translate("successAddContract"));
  
  // Hide form after successful submission
  if (elements.contractForm) {
    elements.contractForm.classList.add("hidden");
  }
  if (elements.toggleContractFormBtn) {
    elements.toggleContractFormBtn.textContent = translate("addContract") || "Add Contract";
  }
  
  loadContracts();
  await loadApartments();
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

  // Show modal (remove .hidden - it uses !important and overrides inline display)
  if (elements.markPaidModal) {
    elements.markPaidModal.classList.remove("hidden");
    elements.markPaidModal.style.display = "flex";
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
    elements.markPaidModal.classList.add("hidden");
    elements.markPaidModal.style.display = "none";
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

const equalsId = (a, b) => (a != null && b != null) && String(a) === String(b);
const sanitize = (v) => v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeMediaUrl = (value) => {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!/^(https?:|data:image\/)/i.test(url)) return "";
  return url.replace(/"/g, "%22");
};

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

const normalizeCurrency = (v) => { const n = Number.parseFloat(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

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

function formatDateShortYear(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Last 2 digits
    return `${day}.${month}.${year}`;
  } catch {
    return "-";
  }
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

function formatPeriod(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "-";
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${year}`;
  } catch {
    return "-";
  }
}

const capitalize = (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : "";

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
    // Defer to avoid auth lock contention with init (Supabase session recovery)
    setTimeout(() => loadInitialData(), 300);
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
    if (elements.signupCard) {
      elements.signupCard.classList.add("hidden");
      elements.signupCard.style.display = "none";
    }
    const loginCard = document.querySelector(".login-card:not(#signupCard)");
    if (loginCard) {
      loginCard.classList.remove("hidden");
      loginCard.style.display = "block";
    }
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
    // Clear all table bodies using DOM methods
    if (elements.debtsTableBody) {
      clear(elements.debtsTableBody);
    }
    if (elements.paymentsTableBody) clear(elements.paymentsTableBody);
    if (elements.apartmentsTableBody) clear(elements.apartmentsTableBody);
    if (elements.tenantsTableBody) clear(elements.tenantsTableBody);
    if (elements.contractsActiveTableBody) clear(elements.contractsActiveTableBody);
    if (elements.contractsInactiveTableBody) clear(elements.contractsInactiveTableBody);
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
  
  // Clear container using DOM methods
  while (elements.confirmationAnimationContainer.firstChild) {
    elements.confirmationAnimationContainer.removeChild(elements.confirmationAnimationContainer.firstChild);
  }
  
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
          // Clear confirmation animation container
          while (elements.confirmationAnimationContainer.firstChild) {
            elements.confirmationAnimationContainer.removeChild(elements.confirmationAnimationContainer.firstChild);
          }
        }
      }, 300);
    }
  }
  
  // Handle image load error
  img.onerror = () => {
    console.error('Failed to load GIF:', gifFile);
    // Fallback to icon
    const icon = animationType === "edit" ? "✎" : "✓";
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'color: #08a88a; font-size: 6rem; font-weight: bold; line-height: 1; animation: scaleIn 0.3s ease-out;';
    iconDiv.textContent = icon;
    elements.confirmationAnimationContainer.appendChild(iconDiv);
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
  node.setAttribute("role", type === "error" ? "alert" : "status");
  const text = document.createElement("span");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "notification-close";
  close.setAttribute("aria-label", translate("dismissNotice") || "Dismiss");
  close.textContent = "×";
  close.addEventListener("click", () => node.remove());
  node.append(text, close);
  while (elements.notificationArea.children.length >= 3) {
    elements.notificationArea.firstChild.remove();
  }
  elements.notificationArea.appendChild(node);
  setTimeout(() => node.remove(), 5000);
}

function setupPageUsability() {
  const tableSearch = document.getElementById("tableSearch");
  const adminView = document.getElementById("adminView");
  const applyTableSearch = () => {
    if (!tableSearch || !adminView) return;
    const query = tableSearch.value.trim().toLowerCase();
    const page = adminView.querySelector(".admin-page.active");
    if (!page) return;
    page.querySelectorAll("tbody tr").forEach((row) => {
      row.hidden = Boolean(query) && !row.textContent.toLowerCase().includes(query);
    });
  };
  if (tableSearch) tableSearch.addEventListener("input", applyTableSearch);
  if (adminView && window.MutationObserver) {
    new MutationObserver(applyTableSearch).observe(adminView, { childList: true, subtree: true });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = document.querySelector(
      ".delete-confirmation-modal:not(.hidden), .mark-paid-modal:not(.hidden), .photo-viewer-modal:not(.hidden)"
    );
    if (!open) return;
    const closer = open.querySelector(
      "#deleteApartmentCancel, #deactivateContractCancel, #markPaidCancel, #photoViewerClose, #photoReviewClose"
    );
    if (closer) closer.click();
  });

  ["deleteApartmentModal", "deactivateContractModal", "markPaidModal"].forEach((id) => {
    const dialog = document.getElementById(id);
    if (!dialog || !window.MutationObserver) return;
    new MutationObserver(() => {
      if (dialog.classList.contains("hidden")) return;
      const field = dialog.querySelector("input:not([readonly]), button");
      if (field) field.focus();
    }).observe(dialog, { attributes: true, attributeFilter: ["class"] });
  });
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

  clear(elements.tenantInfoList);
  
  // Create definition list items using DOM methods
  function addDefinitionItem(dtText, ddText) {
    const dt = document.createElement('dt');
    dt.textContent = dtText;
    elements.tenantInfoList.appendChild(dt);
    
    const dd = document.createElement('dd');
    dd.textContent = ddText;
    elements.tenantInfoList.appendChild(dd);
  }
  
  addDefinitionItem(`${translate("tenantFullName")}:`, sanitize(tenant.full_name));
  addDefinitionItem(`${translate("tenantEmail")}:`, sanitize(tenant.email || "-"));
  addDefinitionItem(`${translate("tenantPhone")}:`, sanitize(tenant.phone || "-"));
  addDefinitionItem(`${translate("tenantSince")}:`, formatDate(entryDate));
}

function renderTenantContract(tenantId) {
  clear(elements.tenantContractList);
  
  const contract = getPrimaryContractForTenant(tenantId);
  if (!contract) {
    const dt = document.createElement('dt');
    dt.textContent = `${translate("status")}:`;
    elements.tenantContractList.appendChild(dt);
    const dd = document.createElement('dd');
    dd.textContent = translate("unknown");
    elements.tenantContractList.appendChild(dd);
    return;
  }

  const apartment = state.apartments.find(
    (apartment) => equalsId(apartment.id, contract.apartment_id)
  );

  // Helper function to add definition items
  function addDefinitionItem(dtText, ddText) {
    const dt = document.createElement('dt');
    dt.textContent = dtText;
    elements.tenantContractList.appendChild(dt);
    const dd = document.createElement('dd');
    dd.textContent = ddText;
    elements.tenantContractList.appendChild(dd);
  }

  addDefinitionItem(`${translate("selectApartment")}:`, sanitize(apartment?.name || translate("unknown")));
  addDefinitionItem(`${translate("startDate")}:`, formatDate(contract.start_date));
  addDefinitionItem(`${translate("endDate")}:`, formatDate(contract.end_date));
  addDefinitionItem(`${translate("monthlyRent")}:`, formatCurrency(contract.monthly_rent));
  addDefinitionItem(`${translate("contractActive")}:`, contract.is_active ? translate("yes") : translate("no"));
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
  
  clear(elements.tenantDebtsTableBody);
  
  if (regularDebts.length === 0 && Object.keys(utilityBalances).length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '6');
    td.textContent = translate("noDebtsFound");
    tr.appendChild(td);
    elements.tenantDebtsTableBody.appendChild(tr);
    return;
  }
  
  // Add regular debts with status
  regularDebts.forEach((debt) => {
    const status = getDebtStatus(debt);
    const tr = document.createElement('tr');
    
    const typeCell = document.createElement('td');
    typeCell.textContent = sanitize(getDebtTypeLabel(debt));
    tr.appendChild(typeCell);
    
    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(debt.amount);
    tr.appendChild(amountCell);
    
    const dueDateCell = document.createElement('td');
    dueDateCell.textContent = formatDate(debt.due_date);
    tr.appendChild(dueDateCell);
    
    const periodCell = document.createElement('td');
    periodCell.textContent = formatPeriod(debt.due_date);
    tr.appendChild(periodCell);
    
    const statusCell = document.createElement('td');
    const statusTag = document.createElement('span');
    statusTag.className = `badge ${status.class === 'overdue' ? 'bg-danger' : status.class === 'paid' ? 'bg-success' : 'bg-warning'}`;
    statusTag.textContent = status.label;
    statusCell.appendChild(statusTag);
    tr.appendChild(statusCell);
    
    const refCell = document.createElement('td');
    refCell.textContent = formatReferenceNumber(debt.reference);
    tr.appendChild(refCell);
    
    elements.tenantDebtsTableBody.appendChild(tr);
  });
  
  // Add utility balances as summary rows
  Object.entries(utilityBalances).forEach(([type, balance]) => {
    const typeLabel = translate(`debt${capitalize(type)}`) || type;
    const balanceLabel = balance > 0 ? translate("owes") || "Owes" : translate("credit") || "Credit";
    const tr = document.createElement('tr');
    
    const typeCell = document.createElement('td');
    typeCell.textContent = sanitize(typeLabel);
    tr.appendChild(typeCell);
    
    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(Math.abs(balance));
    tr.appendChild(amountCell);
    
    const dueDateCell = document.createElement('td');
    dueDateCell.textContent = '-';
    tr.appendChild(dueDateCell);
    
    const periodCell = document.createElement('td');
    periodCell.textContent = '-';
    tr.appendChild(periodCell);
    
    const statusCell = document.createElement('td');
    const statusTag = document.createElement('span');
    statusTag.className = `badge ${balance > 0 ? 'bg-danger' : 'bg-success'}`;
    statusTag.textContent = balanceLabel;
    statusCell.appendChild(statusTag);
    tr.appendChild(statusCell);
    
    const refCell = document.createElement('td');
    refCell.textContent = '-';
    tr.appendChild(refCell);
    
    elements.tenantDebtsTableBody.appendChild(tr);
  });
}

function renderTenantPayments() {
  const tenantId = state.selectedTenantId;
  const targetPayments = state.payments.filter(
    (payment) => equalsId(payment.tenant_id, tenantId)
  );
  
  clear(elements.tenantPaymentsTableBody);
  
  if (!targetPayments.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '5');
    td.textContent = translate("noPaymentsFound");
    tr.appendChild(td);
    elements.tenantPaymentsTableBody.appendChild(tr);
    return;
  }

  targetPayments.forEach((payment) => {
    const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
    const debtLabel = debt ? getDebtTypeLabel(debt) : "-";
    
    const tr = document.createElement('tr');
    
    // Amount cell
    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(payment.amount);
    tr.appendChild(amountCell);
    
    // Type cell
    const typeCell = document.createElement('td');
    typeCell.textContent = sanitize(debtLabel);
    tr.appendChild(typeCell);
    
    // Date cell
    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(payment.payment_date);
    tr.appendChild(dateCell);
    
    // Method cell
    const methodCell = document.createElement('td');
    methodCell.textContent = sanitize(payment.method || "-");
    tr.appendChild(methodCell);
    
    // Reference cell
    const refCell = document.createElement('td');
    refCell.textContent = sanitize(formatReferenceForDisplay(payment.reference));
    tr.appendChild(refCell);
    
    elements.tenantPaymentsTableBody.appendChild(tr);
  });
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

  clear(elements.tenantFinancialList);
  
  // Helper function to add definition items
  function addDefinitionItem(dtText, ddText) {
    const dt = document.createElement('dt');
    dt.textContent = dtText;
    elements.tenantFinancialList.appendChild(dt);
    const dd = document.createElement('dd');
    dd.textContent = ddText;
    elements.tenantFinancialList.appendChild(dd);
  }
  
  addDefinitionItem(`${translate("totalDebt")}:`, formatCurrency(totalDebt));
  addDefinitionItem(`${translate("totalPaid")}:`, formatCurrency(totalPaid));
  addDefinitionItem(`${translate("totalUnpaid")}:`, formatCurrency(totalUnpaid));
  addDefinitionItem(`${translate("contractActive")}:`, 
    primaryContract
      ? primaryContract.is_active
        ? translate("yes")
        : translate("no")
      : translate("unknown")
  );
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
    translate("period"),
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
      formatPeriod(debt.due_date),
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
      formatPeriod,
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