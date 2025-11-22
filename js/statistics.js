const SUPABASE_URL = "https://krrhgslhvdfyvxayefqh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtycmhnc2xodmRmeXZ4YXllZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDAyODYsImV4cCI6MjA3ODI3NjI4Nn0.jil94otneKXn3GTiDLdx1A6yi_5Ktg4DU1_iem5ULbc";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentLanguage = localStorage.getItem("language") || "en";
let currentUser = null;

// State
const state = {
  apartments: [],
  tenants: [],
  contracts: [],
  debts: [],
  payments: [],
  pdfGeneratedCount: 0,
};

// Translations (subset needed for statistics page)
const translations = {
  en: {
    appTitle: "Apartment Management",
    appSubtitle: "Manage contracts, deposits, debts and payments with ease.",
    languageLabel: "Language",
    roleLabel: "View As",
    roleAdmin: "Administrator",
    roleTenant: "Tenant",
    overallStatistics: "Overall Statistics",
    statTenants: "Tenants",
    statApartments: "Apartments",
    statContracts: "Contracts",
    statExpenses: "Expenses",
    statPayments: "Payments",
    statTotalPayments: "Total Payments Amount",
    statTotalExpenses: "Total Expenses Amount",
    statTotalUnpaid: "Total Unpaid Expenses",
    statPdfGenerated: "PDFs Generated",
    logout: "Logout",
    backToDashboard: "Back to Dashboard",
    footerNote: "Powered by Florend Ramusa. Built for property managers and tenants.",
  },
  sq: {
    appTitle: "Menaxhimi i Banesave",
    appSubtitle: "Menaxhoni kontratat, depozitat, detyrimet dhe pagesat me lehtësi.",
    languageLabel: "Gjuha",
    roleLabel: "Shiko si",
    roleAdmin: "Administrator",
    roleTenant: "Qiramarrës",
    overallStatistics: "Statistika e Përgjithshme",
    statTenants: "Qiramarrësit",
    statApartments: "Banesat",
    statContracts: "Kontratat",
    statExpenses: "Shpenzimet",
    statPayments: "Pagesat",
    statTotalPayments: "Shuma Totale e Pagesave",
    statTotalExpenses: "Shuma Totale e Shpenzimeve",
    statTotalUnpaid: "Shpenzimet e Papaguara",
    statPdfGenerated: "PDF të Krijuara",
    logout: "Dil",
    backToDashboard: "Kthehu në Panel",
    footerNote: "Krijuar nga Florend Ramusa. Ndërtuar për menaxherët e pronave dhe qiramarrësit.",
  },
};

function translate(key) {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function translateUI() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const translation = translate(key);
    if (element.tagName === "INPUT" && element.placeholder) {
      element.placeholder = translation;
    } else if (element.tagName === "A" && element.href) {
      element.textContent = translation;
    } else {
      element.textContent = translation;
    }
  });
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

async function loadApartments() {
  const { data, error } = await supabase
    .from("apartments")
    .select("id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadApartments", error);
    return;
  }

  state.apartments = data || [];
}

async function loadTenants() {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .order("full_name");

  if (error) {
    console.error("loadTenants", error);
    return;
  }

  state.tenants = data || [];
}

async function loadContracts() {
  const { data, error } = await supabase
    .from("contracts")
    .select("id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadContracts", error);
    return;
  }

  state.contracts = data || [];
}

async function loadDebts() {
  const { data, error } = await supabase
    .from("debts")
    .select("id, amount, is_paid")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadDebts", error);
    return;
  }

  state.debts = data || [];
}

async function loadPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("id, amount")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadPayments", error);
    return;
  }

  state.payments = data || [];
}

function renderStatistics() {
  // Count statistics
  const tenantsCount = state.tenants.length;
  const apartmentsCount = state.apartments.length;
  const contractsCount = state.contracts.length;
  const expensesCount = state.debts.length;
  const paymentsCount = state.payments.length;

  // Calculate amounts
  const totalExpenses = state.debts.reduce(
    (sum, debt) => sum + normalizeCurrency(debt.amount),
    0
  );
  const totalPayments = state.payments.reduce(
    (sum, payment) => sum + normalizeCurrency(payment.amount),
    0
  );
  const totalUnpaid = state.debts
    .filter((debt) => !debt.is_paid)
    .reduce((sum, debt) => sum + normalizeCurrency(debt.amount), 0);

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
  if (statTotalUnpaidValue) statTotalUnpaidValue.textContent = formatCurrency(totalUnpaid);
}

async function loadInitialData() {
  await Promise.all([
    loadApartments(),
    loadTenants(),
    loadContracts(),
    loadDebts(),
    loadPayments(),
  ]);
  renderStatistics();
}

async function init() {
  // Check authentication
  const user = await checkAuth();
  if (!user) {
    // Not authenticated, redirect to login
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  
  // Update auth UI
  const userEmail = document.getElementById("userEmail");
  if (userEmail) {
    userEmail.textContent = user.email || "";
  }

  // Set up event listeners
  const logoutButton = document.getElementById("logoutButton");
  const languagePicker = document.getElementById("languagePicker");

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
  if (languagePicker) {
    languagePicker.value = currentLanguage;
    languagePicker.addEventListener("change", (event) => {
      currentLanguage = event.target.value;
      localStorage.setItem("language", currentLanguage);
      translateUI();
    });
  }

  translateUI();
  await loadInitialData();
}

document.addEventListener("DOMContentLoaded", init);

