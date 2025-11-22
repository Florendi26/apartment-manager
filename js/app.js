const SUPABASE_URL = "https://krrhgslhvdfyvxayefqh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtycmhnc2xodmRmeXZ4YXllZnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDAyODYsImV4cCI6MjA3ODI3NjI4Nn0.jil94otneKXn3GTiDLdx1A6yi_5Ktg4DU1_iem5ULbc";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const translations = {
  en: {
    appTitle: "Apartment Management",
    appSubtitle:
      "Manage contracts, deposits, debts and payments with ease.",
    navApartments: "Apartments",
    navTenants: "Tenants",
    navContracts: "Contracts",
    navPayments: "Payments",
    navExpensesGroup: "Expenses",
    navExpensesAll: "All",
    navExpensesRent: "Rent",
    navExpensesGarbage: "Garbage",
    navExpensesMaintenance: "Maintenance",
    navExpensesElectricity: "Electricity",
    navExpensesWater: "Water",
    navExpensesHeating: "Heating",
    languageLabel: "Language",
    roleLabel: "View As",
    roleAdmin: "Administrator",
    roleTenant: "Tenant",
    tenantsTitle: "Tenants",
    tenantsSubtitle: "Add new tenants and manage their details.",
    tenantFullName: "Full Name",
    tenantPhone: "Phone",
    contractDeposit: "Contract Deposit",
    addTenant: "Add Tenant",
    apartmentsTitle: "Apartments",
    apartmentName: "Name",
    apartmentAddress: "Address",
    apartmentElectricityCode: "Electricity Code",
    apartmentHeatingCode: "Heating Code",
    apartmentWaterCode: "Water Code",
    apartmentWasteCode: "Waste Code",
    addApartment: "Add Apartment",
    refresh: "Refresh",
    contractsTitle: "Contracts",
    selectApartment: "Apartment",
    selectTenant: "Tenant",
    selectContract: "Contract",
    startDate: "Start Date",
    endDate: "End Date",
    monthlyRent: "Monthly Rent",
    monthlyGarbage: "Monthly Garbage",
    monthlyMaintenance: "Monthly Maintenance",
    contractActive: "Active",
    contractDeactivate: "Deactivate",
    contractActivate: "Activate",
    contractDeactivateBlocked:
      "Cannot deactivate contract while unpaid expenses remain.",
    successContractDeactivate: "Contract marked as inactive.",
    successContractActivate: "Contract reactivated.",
    errorInactiveContract:
      "This contract is inactive. Activate it before creating new expenses.",
    addContract: "Add Contract",
    debtsPaymentsTitle: "Debts & Payments",
    debtsPaymentsSubtitle: "Track rent, utilities, damages and more.",
    createDebt: "Create Expense",
    expenseFormToggleExpense: "Create Expense",
    expenseFormTogglePayment: "Record Payment",
    debtType: "Type",
    amount: "Amount",
    dueDate: "Due Date",
    notes: "Notes",
    createDebtButton: "Create Debt",
    updateDebtButton: "Update Expense",
    recordPayment: "Record Payment",
    selectDebt: "Debt",
    paymentDate: "Payment Date",
    paymentMethod: "Method",
    paymentReference: "Reference",
    recordPaymentButton: "Record Payment",
    updatePaymentButton: "Update Payment",
    save: "Save",
    cancelEdit: "Cancel",
    totalLabel: "Total",
    billSingular: "bill",
    billPlural: "bills",
    unpaidExpensesSummary: "Unpaid Expenses Summary",
    expenseType: "Expense Type",
    paymentGroupInsufficient: "Enter an amount that covers at least one bill.",
    paymentGroupRemainingPrefix: "Remaining unpaid amount for",
    paymentGroupNoDebts: "No unpaid bills found for this type.",
    paymentGroupUnusedAmountPrefix: "Unused amount not applied",
    enteredAmountLabel: "Entered",
    electricityCutLabel: "Electricity cut / disconnection",
    electricityCutNotePrefix: "Electricity is cut on",
    toggleExpenseSummary: "Tenant Summary",
    togglePaymentSummary: "Tenant Summary",
    summaryTenant: "Tenant",
    summaryExpensesCount: "Open Expenses",
    summaryExpensesAmount: "Open Amount",
    summaryPaymentsCount: "Payments",
    summaryPaymentsAmount: "Payments Amount",
    summaryNoData: "No data available.",
    paymentSummary: "Payment Summary",
    paymentSummaryPaid: "Paid",
    paymentSummaryDebt: "Expenses",
    paymentSummaryRemaining: "Remaining",
    openExpensesHeading: "Open & Overdue Expenses",
    pdfOptionsHeading: "Export Tenant PDF",
    pdfOptionEnglish: "Download in English",
    pdfOptionAlbanian: "Download in Albanian",
    pdfFormatNormal: "Normal",
    pdfFormatDetailed: "Detailed",
    filterStatus: "Status",
    filterType: "Type",
    statusAll: "All",
    statusOpenOverdue: "Open & Overdue",
    statusPaid: "Paid",
    statusOverdue: "Overdue",
    typeAll: "All",
    debtRent: "Rent",
    debtMaintenance: "Maintenance",
    debtGarbage: "Garbage",
    debtThermos: "Heating",
    debtElectricity: "Electricity",
    debtElectricityCut: "Electricity cut / disconnection",
    debtWater: "Water",
    debtDamage: "Damage",
    debtOther: "Other",
    expensesHeadingAll: "All Expenses",
    expensesHeadingRent: "Rent Expenses",
    expensesHeadingGarbage: "Garbage Expenses",
    expensesHeadingMaintenance: "Maintenance Expenses",
    expensesHeadingElectricity: "Electricity Expenses",
    expensesHeadingWater: "Water Expenses",
    expensesHeadingHeating: "Heating Expenses",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    markPaid: "Mark Paid",
    exportPdf: "Export Debts to PDF",
    paymentsHistory: "Payments History",
    loadTenant: "Load Tenant",
    tenantInfo: "Tenant Info",
    contractInfo: "Contract Info",
    financialSummary: "Financial Summary",
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
    tenantDebts: "Unpaid Expenses",
    tenantPayments: "Payments",
    exportTenantPdf: "Export to PDF",
    status: "Status",
    footerNote: "Powered by Florend Ramusa. Built for property managers and tenants.",
    tenantSince: "Entry Date",
    totalDebt: "Total Expenses",
    totalPaid: "Total Payments",
    totalUnpaid: "Total Unpaid Expenses",
    yes: "Yes",
    no: "No",
    paid: "Paid",
    open: "Open",
    overdue: "Overdue",
    unknown: "Unknown",
    confirmationMarkPaid: "Are you sure you want to mark this debt as paid?",
    confirmationDeleteDebt: "Are you sure you want to delete this expense?",
    confirmationDeletePayment: "Are you sure you want to delete this payment?",
    successAddApartment: "Apartment created successfully.",
    successAddTenant: "Tenant created successfully.",
    successAddContract: "Contract created successfully.",
    successAddDebt: "Debt created successfully.",
    successAddPayment: "Payment recorded successfully.",
    successUpdateDebt: "Expense updated successfully.",
    successUpdatePayment: "Payment updated successfully.",
    successDeleteDebt: "Expense deleted successfully.",
    successDeletePayment: "Payment deleted successfully.",
    successMarkPaid: "Debt marked as paid.",
    errorLoad: "Something went wrong. Please try again.",
    errorFieldRequired: "Please fill all required fields.",
    errorAmountMismatch: "The amount you typed does not match. Deletion cancelled.",
    noTenantSelected: "Select a tenant to view details.",
    noDebtsFound: "No debts found.",
    noPaymentsFound: "No payments found.",
    errorAutoTableLoading:
      "PDF table plugin is loading. Please try again in a moment.",
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
    statistics: "Statistics",
    backToDashboard: "Back to Dashboard",
  },
  sq: {
    appTitle: "Menaxhimi i Banesave",
    appSubtitle:
      "Menaxhoni kontratat, depozitat, detyrimet dhe pagesat me lehtësi.",
    navApartments: "Banesat",
    navTenants: "Qiramarrësit",
    navContracts: "Kontratat",
    navPayments: "Pagesat",
    navExpensesGroup: "Shpenzimet",
    navExpensesAll: "Të Gjitha",
    navExpensesRent: "Qira",
    navExpensesGarbage: "Mbeturina",
    navExpensesMaintenance: "Mirëmbajtje",
    navExpensesElectricity: "Rrymë",
    navExpensesWater: "Ujë",
    navExpensesHeating: "Ngrohje",
    languageLabel: "Gjuha",
    roleLabel: "Shiko si",
    roleAdmin: "Administrator",
    roleTenant: "Qiramarrës",
    adminDashboard: "Paneli i Administratorit",
    tenantsTitle: "Qiramarrësit",
    tenantsSubtitle: "Shtoni qiramarrës të rinj dhe menaxhoni të dhënat e tyre.",
    tenantFullName: "Emri i Plotë",
    tenantPhone: "Telefon",
    contractDeposit: "Depozitë Kontrate",
    addTenant: "Shto Qiramarrës",
    apartmentsTitle: "Banesat",
    apartmentName: "Emri",
    apartmentAddress: "Adresa",
    apartmentElectricityCode: "Kodi i Rrymës",
    apartmentHeatingCode: "Kodi i Ngrohjes",
    apartmentWaterCode: "Kodi i Ujit",
    apartmentWasteCode: "Kodi i Mbeturinave",
    addApartment: "Shto Banesë",
    refresh: "Rifresko",
    contractsTitle: "Kontratat",
    selectApartment: "Banesa",
    selectTenant: "Qiramarrësi",
    selectContract: "Kontrata",
    startDate: "Data e Fillimit",
    endDate: "Data e Mbarimit",
    monthlyRent: "Qiraja Mujore",
    monthlyGarbage: "Mbeturinat Mujore",
    monthlyMaintenance: "Mirëmbajtja Mujore",
    contractActive: "Aktive",
    contractDeactivate: "Çaktivizo",
    contractActivate: "Aktivizo",
    contractDeactivateBlocked:
      "Kontrata nuk mund të çaktivizohet derisa të shlyhen të gjitha shpenzimet.",
    successContractDeactivate: "Kontrata u çaktivizua.",
    successContractActivate: "Kontrata u riaktivizua.",
    errorInactiveContract:
      "Kjo kontratë është joaktive. Aktivizojeni para se të krijoni shpenzime të reja.",
    addContract: "Shto Kontratë",
    debtsPaymentsTitle: "Detyrimet & Pagesat",
    debtsPaymentsSubtitle: "Ndiq qiratë, shërbimet, dëmtimet dhe më shumë.",
    createDebt: "Krijo Shpenzim",
    expenseFormToggleExpense: "Krijo Shpenzim",
    expenseFormTogglePayment: "Regjistro Pagesë",
    debtType: "Lloji",
    amount: "Shuma",
    dueDate: "Afati",
    notes: "Shënime",
    createDebtButton: "Krijo Detyrim",
    updateDebtButton: "Përditëso Shpenzimin",
    recordPayment: "Regjistro Pagesë",
    selectDebt: "Detyrimi",
    paymentDate: "Data e Pagesës",
    paymentMethod: "Metoda",
    paymentReference: "Referenca",
    recordPaymentButton: "Regjistro Pagesë",
    updatePaymentButton: "Përditëso Pagesën",
    save: "Ruaj",
    cancelEdit: "Anulo",
    totalLabel: "Totali",
    billSingular: "faturë",
    billPlural: "fatura",
    unpaidExpensesSummary: "Përmbledhje e Shpenzimeve të Papaguara",
    expenseType: "Lloji i Shpenzimit",
    paymentGroupInsufficient:
      "Shkruani një shumë që mbulon të paktën një faturë.",
    paymentGroupRemainingPrefix: "Shuma e papaguar e mbetur për",
    paymentGroupNoDebts: "Nuk u gjetën fatura të papaguara për këtë lloj.",
    paymentGroupUnusedAmountPrefix: "Shuma e papërdorur nuk u aplikua",
    enteredAmountLabel: "Shkruar",
    electricityCutLabel: "Ndërprerja e rrymës",
    electricityCutNotePrefix: "Rryma është ndërprerë më",
    toggleExpenseSummary: "Përmbledhje e Qiramarrësve",
    togglePaymentSummary: "Përmbledhje e Qiramarrësve",
    summaryTenant: "Qiramarrësi",
    summaryExpensesCount: "Detyrimet e Hapura",
    summaryExpensesAmount: "Shuma e Hapur",
    summaryPaymentsCount: "Nr. Pagesave",
    summaryPaymentsAmount: "Shuma e Pagesave",
    summaryNoData: "Asnjë e dhënë.",
    openExpensesHeading: "Shpenzime të Hapura & Vonesë",
    pdfOptionsHeading: "Eksporto PDF për Qiramarrësin",
    pdfOptionEnglish: "Shkarko në Anglisht",
    pdfOptionAlbanian: "Shkarko në Shqip",
    pdfFormatNormal: "Normal",
    pdfFormatDetailed: "Të Detajuara",
    filterStatus: "Statusi",
    filterType: "Lloji",
    statusAll: "Të Gjitha",
    statusOpenOverdue: "Të Hapura & Vonesë",
    statusPaid: "Të Paguara",
    statusOverdue: "Vonesë",
    typeAll: "Të Gjitha",
    debtRent: "Qira",
    debtMaintenance: "Mirëmbajtje",
    debtGarbage: "Mbeturina",
    debtThermos: "Ngrohje",
    debtElectricity: "Rrymë",
    debtElectricityCut: "Ndërprerja e rrymës",
    debtWater: "Ujë",
    debtDamage: "Dëmtim",
    debtOther: "Tjetër",
    expensesHeadingAll: "Shpenzimet Totale",
    expensesHeadingRent: "Shpenzimet e Qirasë",
    expensesHeadingGarbage: "Shpenzimet e Mbeturinave",
    expensesHeadingMaintenance: "Shpenzimet e Mirëmbajtjes",
    expensesHeadingElectricity: "Shpenzimet e Energjisë Elektrike",
    expensesHeadingWater: "Shpenzimet e Ujit",
    expensesHeadingHeating: "Shpenzimet e Ngrohjes",
    actions: "Veprimet",
    edit: "Ndrysho",
    delete: "Fshi",
    markPaid: "Shëno të Paguar",
    exportPdf: "Eksporto Detyrimet në PDF",
    paymentsHistory: "Historia e Pagesave",
    tenantDashboard: "Paneli i Qiramarrësit",
    loadTenant: "Ngarko Qiramarrësin",
    tenantInfo: "Të Dhënat e Qiramarrësit",
    contractInfo: "Të Dhënat e Kontratës",
    financialSummary: "Përmbledhje Financiare",
    overallStatistics: "Statistikat e Përgjithshme",
    statTenants: "Qiramarrësit",
    statApartments: "Banesat",
    statContracts: "Kontratat",
    statExpenses: "Shpenzimet",
    statPayments: "Pagesat",
    statTotalPayments: "Shuma e Pagesave",
    statTotalExpenses: "Shuma e Shpenzimeve",
    statTotalUnpaid: "Shuma e Papaguar",
    statPdfGenerated: "PDF të Gjeneruara",
    tenantDebts: "Shpenzime të Papaguara",
    tenantPayments: "Pagesat",
    exportTenantPdf: "Eksporto në PDF",
    status: "Statusi",
    footerNote: "Mundësohet nga Florend Ramusa. Ndërtuar për administratorë dhe qiramarrës.",
    tenantSince: "Data e Hyrjes",
    totalDebt: "Shpenzime Totale",
    totalPaid: "Pagesat Totale",
    totalUnpaid: "Shpenzime të Papaguara",
    yes: "Po",
    no: "Jo",
    paid: "Paguar",
    open: "Hapur",
    overdue: "Vonesë",
    unknown: "Panjor",
    confirmationMarkPaid: "A jeni i sigurt që doni ta shënoni këtë detyrim si të paguar?",
    confirmationDeleteDebt: "A jeni i sigurt që doni ta fshini këtë shpenzim?",
    confirmationDeletePayment: "A jeni i sigurt që doni ta fshini këtë pagesë?",
    successAddApartment: "Banesa u krijua me sukses.",
    successAddTenant: "Qiramarrësi u shtua me sukses.",
    successAddContract: "Kontrata u krijua me sukses.",
    successAddDebt: "Detyrimi u krijua me sukses.",
    successAddPayment: "Pagesa u regjistrua me sukses.",
    successUpdateDebt: "Shpenzimi u përditësua me sukses.",
    successUpdatePayment: "Pagesa u përditësua me sukses.",
    successDeleteDebt: "Shpenzimi u fshi me sukses.",
    successDeletePayment: "Pagesa u fshi me sukses.",
    successMarkPaid: "Detyrimi u shënua si i paguar.",
    errorLoad: "Diçka shkoi keq. Ju lutem provoni përsëri.",
    errorFieldRequired: "Plotësoni të gjitha fushat e detyrueshme.",
    errorAmountMismatch: "Shuma që keni shkruar nuk përputhet. Fshirja u anulua.",
    noTenantSelected: "Zgjidhni një qiramarrës për të parë detajet.",
    noDebtsFound: "Asnjë detyrim i gjetur.",
    noPaymentsFound: "Asnjë pagesë e gjetur.",
    paymentSummary: "Përmbledhje Pagesash",
    paymentSummaryPaid: "E Paguar",
    paymentSummaryDebt: "Shpenzimet",
    paymentSummaryRemaining: "E Mbetur",
    errorAutoTableLoading:
      "Shtojca e tabelave për PDF po ngarkohet. Ju lutem provoni sërish pas pak.",
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
    statistics: "Statistika",
    backToDashboard: "Kthehu në Panel",
  },
};

const EXPENSE_TYPE_MAP = {
  all: "all",
  rent: "rent",
  garbage: "garbage",
  maintenance: "maintenance",
  electricity: "electricity",
  water: "water",
  heating: "thermos",
};

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

const ELECTRICITY_RECONNECTION_FEE = 17.7;
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
  pdfGeneratedCount: persistedPdfGeneratedCount,
  editingDebtId: null,
  editingPaymentId: null,
  markPaidDebtId: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  attachEventListeners();
  translateUI();
  
  // Setup date inputs with year limits (2020-2030)
  setupDateInputs();
  
  // Check authentication status on load
  await checkAuth();
  
  // If not authenticated, redirect to login
  if (!state.currentUser) {
    window.location.href = "login.html";
    return;
  }
  
  // If authenticated, load data and show admin view
  showAdminView();
  setAdminPage(state.adminPage, state.expensesCategory);
  loadInitialData();
});

function setupDateInputs() {
  // Initialize custom date pickers with day, month, year dropdowns
  const yearStart = 2020;
  const yearEnd = 2030;
  
  // Setup year dropdowns
  const yearSelects = document.querySelectorAll('.date-year');
  yearSelects.forEach(select => {
    const existingOptions = select.querySelectorAll('option').length;
    if (existingOptions <= 1) { // Only placeholder option exists
      for (let year = yearStart; year <= yearEnd; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        select.appendChild(option);
      }
    }
  });
  
  // Setup day dropdowns
  const daySelects = document.querySelectorAll('.date-day');
  daySelects.forEach(select => {
    const existingOptions = select.querySelectorAll('option').length;
    if (existingOptions <= 1) { // Only placeholder option exists
      for (let day = 1; day <= 31; day++) {
        const option = document.createElement('option');
        option.value = String(day).padStart(2, '0');
        option.textContent = day;
        select.appendChild(option);
      }
    }
  });
  
  // Add change listeners to update hidden input values
  setupDatePickerListeners();
}

function setupDatePickerListeners() {
  // Map of date picker IDs to their component selectors
  const datePickers = [
    { prefix: 'debtDueDate', hidden: 'debtDueDate' },
    { prefix: 'paymentDate', hidden: 'paymentDate' },
    { prefix: 'contractStartDate', hidden: 'contractStartDate' },
    { prefix: 'contractEndDate', hidden: 'contractEndDate' },
    { prefix: 'markPaidDate', hidden: 'markPaidDate' }
  ];
  
  datePickers.forEach(picker => {
    const daySelect = document.getElementById(`${picker.prefix}Day`);
    const monthSelect = document.getElementById(`${picker.prefix}Month`);
    const yearSelect = document.getElementById(`${picker.prefix}Year`);
    const hiddenInput = document.getElementById(picker.hidden);
    
    if (!daySelect || !monthSelect || !yearSelect || !hiddenInput) return;
    
    const updateHiddenInput = () => {
      const day = daySelect.value;
      const month = monthSelect.value;
      const year = yearSelect.value;
      
      // Adjust days based on selected month/year
      updateDaysInMonth(daySelect, month, year);
      
      if (day && month && year) {
        // Validate date (check if day is valid for the month)
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        if (parseInt(day) > daysInMonth) {
          daySelect.value = String(daysInMonth).padStart(2, '0');
        }
        
        hiddenInput.value = `${year}-${month}-${daySelect.value}`;
      } else {
        hiddenInput.value = '';
      }
    };
    
    daySelect.addEventListener('change', updateHiddenInput);
    monthSelect.addEventListener('change', () => {
      updateDaysInMonth(daySelect, monthSelect.value, yearSelect.value);
      updateHiddenInput();
    });
    yearSelect.addEventListener('change', () => {
      updateDaysInMonth(daySelect, monthSelect.value, yearSelect.value);
      updateHiddenInput();
    });
  });
}

function updateDaysInMonth(daySelect, month, year) {
  if (!month || !year) {
    // Reset to 31 days if month/year not selected
    const currentDay = daySelect.value;
    daySelect.innerHTML = '<option value="">Day</option>';
    for (let day = 1; day <= 31; day++) {
      const option = document.createElement('option');
      option.value = String(day).padStart(2, '0');
      option.textContent = day;
      if (option.value === currentDay) option.selected = true;
      daySelect.appendChild(option);
    }
    return;
  }
  
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const currentDay = daySelect.value;
  const currentDayNum = parseInt(currentDay);
  
  daySelect.innerHTML = '<option value="">Day</option>';
  for (let day = 1; day <= daysInMonth; day++) {
    const option = document.createElement('option');
    option.value = String(day).padStart(2, '0');
    option.textContent = day;
    if (day === currentDayNum || (!currentDay && day === 1)) {
      option.selected = true;
    }
    daySelect.appendChild(option);
  }
  
  // If current day is greater than days in month, select last day
  if (currentDayNum > daysInMonth) {
    daySelect.value = String(daysInMonth).padStart(2, '0');
  }
}

// Helper function to set date picker value from ISO date string
function setDatePickerValue(prefix, isoDate) {
  const daySelect = document.getElementById(`${prefix}Day`);
  const monthSelect = document.getElementById(`${prefix}Month`);
  const yearSelect = document.getElementById(`${prefix}Year`);
  const hiddenInput = document.getElementById(prefix);
  
  if (!daySelect || !monthSelect || !yearSelect || !hiddenInput) return;
  
  if (!isoDate) {
    daySelect.value = '';
    monthSelect.value = '';
    yearSelect.value = '';
    hiddenInput.value = '';
    return;
  }
  
  try {
    const date = new Date(isoDate + 'T00:00:00');
    if (isNaN(date.getTime())) return;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Update days based on month/year
    updateDaysInMonth(daySelect, month, year);
    
    daySelect.value = day;
    monthSelect.value = month;
    yearSelect.value = year;
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
    userEmail: document.getElementById("userEmail"),
    rolePicker: document.getElementById("rolePicker"),
    languagePicker: document.getElementById("languagePicker"),
    adminView: document.getElementById("adminView"),
    tenantView: document.getElementById("tenantView"),
    adminNav: document.getElementById("adminNav"),
    notificationArea: document.getElementById("notificationArea"),
    confirmationModal: document.getElementById("confirmationModal"),
    confirmationAnimationContainer: document.getElementById("confirmationAnimationContainer"),
    markPaidModal: document.getElementById("markPaidModal"),
    markPaidAmount: document.getElementById("markPaidAmount"),
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
    apartmentsTableBody: document.getElementById("apartmentsTableBody"),
    refreshApartments: document.getElementById("refreshApartments"),
    tenantForm: document.getElementById("tenantForm"),
    tenantsTableBody: document.getElementById("tenantsTableBody"),
    refreshTenants: document.getElementById("refreshTenants"),
    contractForm: document.getElementById("contractForm"),
    contractApartment: document.getElementById("contractApartment"),
    contractTenant: document.getElementById("contractTenant"),
    contractGarbage: document.getElementById("contractGarbage"),
    contractMaintenance: document.getElementById("contractMaintenance"),
    contractActive: document.getElementById("contractActive"),
    contractsTableBody: document.getElementById("contractsTableBody"),
    refreshContracts: document.getElementById("refreshContracts"),
    debtForm: document.getElementById("debtForm"),
    debtType: document.getElementById("debtType"),
    debtAmount: document.getElementById("debtAmount"),
    debtDueDate: document.getElementById("debtDueDate"),
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
    paymentMethod: document.getElementById("paymentMethod"),
    paymentDebtSummary: document.getElementById("paymentDebtSummary"),
    debtsTableBody: document.getElementById("debtsTableBody"),
    debtsFilterStatus: document.getElementById("debtsFilterStatus"),
    debtsFilterType: document.getElementById("debtsFilterType"),
    exportDebtsPdf: document.getElementById("exportDebtsPdf"),
    expensesHeading: document.getElementById("expensesHeading"),
    expensesSubheading: document.getElementById("expensesSubheading"),
    paymentsTableBody: document.getElementById("paymentsTableBody"),
    refreshDebts: document.getElementById("refreshDebts"),
    refreshPayments: document.getElementById("refreshPayments"),
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

  if (elements.rolePicker) {
    elements.rolePicker.addEventListener("change", (event) => {
      state.role = event.target.value;
      toggleViews();
    });
  }

  if (elements.languagePicker) {
    elements.languagePicker.addEventListener("change", (event) => {
      state.language = event.target.value;
      translateUI();
    });
  }

  if (elements.adminNav) {
    elements.adminNav.addEventListener("click", handleAdminNavClick);
  }

  elements.apartmentForm.addEventListener("submit", onCreateApartment);
  elements.refreshApartments.addEventListener("click", loadApartments);

  elements.tenantForm.addEventListener("submit", onCreateTenant);
  elements.refreshTenants.addEventListener("click", loadTenants);

  elements.contractForm.addEventListener("submit", onCreateContract);
  elements.refreshContracts.addEventListener("click", loadContracts);

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
  elements.refreshDebts.addEventListener("click", () => {
    loadDebts();
    loadPayments();
  });
  if (elements.refreshPayments) {
    elements.refreshPayments.addEventListener("click", loadPayments);
  }

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
    elements.exportTenantPdf.addEventListener("click", () => {
      const format = document.querySelector('input[name="pdfFormat"]:checked')?.value || "normal";
      exportTenantToPdf("en", format);
    });
  }
  if (elements.exportTenantPdfSq) {
    elements.exportTenantPdfSq.addEventListener("click", () => {
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
    elements.adminView.classList.add("active");
    elements.tenantView.classList.remove("active");
    if (elements.adminNav) {
      elements.adminNav.style.display = "";
    }
    setAdminPage(state.adminPage, state.expensesCategory);
  } else {
    elements.tenantView.classList.add("active");
    elements.adminView.classList.remove("active");
    if (elements.adminNav) {
      elements.adminNav.style.display = "none";
    }
  }
}

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
}

function applyExpensesCategory(category = "all") {
  const normalized = EXPENSE_TYPE_MAP[category] ? category : "all";
  state.expensesCategory = normalized;
  if (elements.debtsFilterType) {
    elements.debtsFilterType.value = EXPENSE_TYPE_MAP[normalized] || "all";
  }
  updateExpensesHeading();
  updateExpenseFormTypeLock();
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
  const dictionary = translations[state.language] || translations.en;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((node) => (node.textContent = dictionary[node.dataset.i18n]));
  document.title = dictionary.appTitle;
  renderApartmentsTable();
  renderTenantsTable();
  renderContractsTable();
  renderDebtsTable();
  renderPaymentsTable();
  populateApartmentSelects();
  populateTenantSelects();
  populateContractSelects();
  populateDebtSelects();
  populateTenantSelector();
  if (state.selectedTenantId) {
    loadTenantView();
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
  ]);
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
  const { data, error } = await supabase
    .from("apartments")
    .select(
      "id, name, address, electricity_code, heating_code, water_code, waste_code"
    )
    .order("created_at", { ascending: false });

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("loadApartments", error);
    return;
  }

  state.apartments = data || [];
  renderApartmentsTable();
  populateApartmentSelects();
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadTenants() {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, full_name, phone, entry_date")
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
  refreshTenantSummaries();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadContracts() {
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id, apartment_id, tenant_id, start_date, end_date, monthly_rent, monthly_garbage, monthly_maintenance, deposit_amount, is_active"
    )
    .order("start_date", { ascending: false });

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("loadContracts", error);
    return;
  }

  state.contracts = data || [];
  renderContractsTable();
  populateContractSelects();
  handleDebtContractChange();
  state.contractsLoaded = true;
  maybeEnsureRecurringDebts();
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadDebts() {
  const { data, error } = await supabase
    .from("debts")
    .select(
      "id, tenant_id, contract_id, type, amount, due_date, is_paid, notes, paid_at, reference"
    )
    .order("due_date", { ascending: false });

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("loadDebts", error);
    return;
  }

  state.debts = data || [];
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
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

async function loadPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, debt_id, tenant_id, contract_id, amount, payment_date, method, reference"
    )
    .order("payment_date", { ascending: false });

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("loadPayments", error);
    return;
  }

  state.payments = data || [];
  renderPaymentsTable();

  if (state.selectedTenantId) {
    renderTenantPayments();
  }
  refreshTenantSummaries();
  updateExpenseSummaryUI();
  updatePaymentSummaryUI();
  renderOpenExpensesTable();
  // Only update summary if not in initial load (initial load uses animated version)
  if (!state.isInitialLoad) {
    renderAdminSummary();
  }
}

function renderApartmentsTable() {
  elements.apartmentsTableBody.innerHTML = state.apartments
    .map(
      (apartment) => `
      <tr>
        <td>${sanitize(apartment.name)}</td>
        <td>${sanitize(apartment.address || "")}</td>
        <td>${sanitize(apartment.electricity_code || "")}</td>
        <td>${sanitize(apartment.heating_code || "")}</td>
        <td>${sanitize(apartment.water_code || "")}</td>
        <td>${sanitize(apartment.waste_code || "")}</td>
        <td>${apartment.id}</td>
      </tr>
    `
    )
    .join("");
}

function renderTenantsTable() {
  elements.tenantsTableBody.innerHTML = state.tenants
    .map(
      (tenant) => `
      <tr>
        <td>${sanitize(tenant.full_name)}</td>
        <td>${sanitize(tenant.phone || "")}</td>
        <td>${tenant.id}</td>
      </tr>
    `
    )
    .join("");
}

function renderContractsTable() {
  const rows = state.contracts.map((contract) => {
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
        <td>${sanitize(apartment?.name || translate("unknown"))}</td>
        <td>${sanitize(tenant?.full_name || translate("unknown"))}</td>
        <td>${formatDate(contract.start_date)}</td>
        <td>${formatDate(contract.end_date)}</td>
        <td>${formatCurrency(contract.monthly_rent)}</td>
        <td>${formatCurrency(contract.monthly_garbage)}</td>
        <td>${formatCurrency(contract.monthly_maintenance)}</td>
        <td>${formatCurrency(contract.deposit_amount)}</td>
        <td>${contract.is_active ? translate("yes") : translate("no")}</td>
        <td>
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
  });

  elements.contractsTableBody.innerHTML = rows.join("");

  elements.contractsTableBody
    .querySelectorAll("button[data-action='deactivate-contract']")
    .forEach((button) =>
      button.addEventListener("click", () =>
        handleContractStatusChange(button.dataset.id, false)
      )
    );

  elements.contractsTableBody
    .querySelectorAll("button[data-action='activate-contract']")
    .forEach((button) =>
      button.addEventListener("click", () =>
        handleContractStatusChange(button.dataset.id, true)
      )
    );
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
  const remaining = Math.max(0, debtAmount - totalPaid);

  return {
    totalPaid,
    debtAmount,
    remaining: remaining < 0.001 ? null : remaining, // null means fully paid
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
    } else {
      totalRemainingEl.textContent = formatCurrency(summary.totalRemaining);
      totalRemainingEl.classList.remove("payment-summary-paid");
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

  const filtered = state.debts.filter((debt) => {
    const isPaid = !!debt.is_paid;
    const isOverdue = !isPaid && debt.due_date && debt.due_date < today;

    if (statusFilter === "paid" && !isPaid) return false;
    if (statusFilter === "open_overdue" && isPaid) return false;
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
  
  const totalRemaining = Math.max(0, totalPaymentSummary.totalDebt - totalPaymentSummary.totalPaid);
  totalPaymentSummary.totalRemaining = totalRemaining < 0.001 ? null : totalRemaining;

  // Render total payment summary
  renderTotalPaymentSummary(totalPaymentSummary);

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
            <td><span class="tag ${status.class}">${status.label}</span></td>
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
      return `
        <tr>
          <td>${sanitize(tenant?.full_name || translate("unknown"))}</td>
          <td>${sanitize(typeLabel)}</td>
          <td>${formatCurrency(debt.amount)}</td>
          <td>${formatDate(debt.due_date)}</td>
          <td><span class="tag ${status.class}">${status.label}</span></td>
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
              <button type="button" data-action="mark-paid" data-id="${debt.id}" ${
        debt.is_paid ? "disabled" : ""
      }>
                ${translate("markPaid")}
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPaymentsTable() {
  // Get the active expense type filter
  const activeExpenseType = getActiveExpenseType();
  
  // Filter payments based on expense type if a filter is active
  const filteredPayments = activeExpenseType
    ? state.payments.filter((payment) => {
        const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
        return debt && debt.type === activeExpenseType;
      })
    : state.payments;
  
  const rows = filteredPayments
    .map((payment) => {
      const tenant = state.tenants.find((t) =>
        equalsId(t.id, payment.tenant_id)
      );
      const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
      const typeLabel = debt ? getDebtTypeLabel(debt) : "-";
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
  const openRows = (state.debts || [])
    .filter((debt) => !debt.is_paid)
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

  const utilityOptions = UTILITY_PAYMENT_TYPES.map((type) => {
    if (
      typeFilterValue &&
      typeFilterValue !== "all" &&
      typeFilterValue !== type
    ) {
      return "";
    }
    const debtsOfType = unpaidDebts.filter((debt) => debt.type === type);
    if (!debtsOfType.length) return "";
    const total = debtsOfType.reduce(
      (sum, debt) => sum + normalizeCurrency(debt.amount),
      0
    );
    if (total <= 0) return "";
    const count = debtsOfType.length;
    const typeLabel =
      translate(`debt${capitalize(type)}`) || sanitize(type);
    const billWord =
      count === 1 ? translate("billSingular") : translate("billPlural");
    return `
      <option value="group:${type}" data-type="${type}" data-total="${total.toFixed(
      2
    )}" data-count="${count}">
        ${typeLabel} — ${count} ${billWord} — ${formatCurrency(total)}
      </option>
    `;
  }).join("");

  const filteredDebts = unpaidDebts.filter((debt) => {
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
  elements.paymentDebt.innerHTML = placeholder + utilityOptions + debtOptions;

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

    if (shouldAutofillAmount && elements.paymentAmount) {
      elements.paymentAmount.value = total.toFixed(2);
    }

    const typeLabel =
      translate(`debt${capitalize(groupType)}`) || sanitize(groupType);
    const billWord =
      count === 1 ? translate("billSingular") : translate("billPlural");
    const parts = [
      `${typeLabel} — ${count} ${billWord}`,
      `${translate("totalLabel")}: ${formatCurrency(total)}`,
    ];
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
  if (shouldAutofillAmount && elements.paymentAmount) {
    elements.paymentAmount.value = amount.toFixed(2);
  }
  const typeLabel = getDebtTypeLabel(debt);
  const parts = [`${typeLabel} — ${formatCurrency(amount)}`];
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
  
  // Reset custom date picker
  setDatePickerValue('debtDueDate', '');
  
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
  const associatedPayments = state.payments.filter((p) => equalsId(p.debt_id, debtId));
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

  // Delete payments if requested
  if (deletePayments && hasPayments) {
    const { error: paymentsError } = await supabase
      .from("payments")
      .delete()
      .eq("debt_id", debtId);
    if (paymentsError) {
      notify("error", translate("errorLoad"));
      console.error("handleDeleteDebt.deletePayments", paymentsError);
      return;
    }
  }

  // Delete the debt
  const { error } = await supabase.from("debts").delete().eq("id", debtId);
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

  // Store the debt_id before deletion for later check
  const debtId = payment.debt_id;

  // Delete the payment from Supabase
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) {
    notify("error", translate("errorLoad"));
    console.error("handleDeletePayment", error);
    return;
  }

  // Reload payments to get the current state after deletion
  await loadPayments();

  // Recalculate total payments and update debt status if needed
  if (debtId) {
    const debt = state.debts.find((d) => equalsId(d.id, debtId));
    if (debt) {
      const remainingPayments = state.payments.filter((p) =>
        equalsId(p.debt_id, debtId)
      );
      
      // Calculate total payments for this debt
      const totalPaid = remainingPayments.reduce(
        (sum, payment) => sum + normalizeCurrency(payment.amount),
        0
      );
      const debtAmount = normalizeCurrency(debt.amount);

      // Mark debt as paid only if total payments >= debt amount, otherwise unpaid
      if (totalPaid >= debtAmount - 0.001) {
        const { error: debtUpdateError } = await supabase
          .from("debts")
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq("id", debtId);
        if (debtUpdateError) {
          console.error("handleDeletePayment.markDebtPaid", debtUpdateError);
        }
      } else {
        const { error: debtUpdateError } = await supabase
          .from("debts")
          .update({ is_paid: false, paid_at: null })
          .eq("id", debtId);
        if (debtUpdateError) {
          console.error("handleDeletePayment.markDebtUnpaid", debtUpdateError);
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

  // Update the payment in Supabase
  const payload = {
    amount: paymentAmount,
    payment_date: paymentDate,
    method,
    reference,
    // Preserve the original relationships
    debt_id: payment.debt_id,
    tenant_id: payment.tenant_id,
    contract_id: payment.contract_id,
  };

  const { error } = await supabase
    .from("payments")
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
  // This will create rent and garbage expenses on the 5th of each month
  if (!state.contractsLoaded || !state.debtsLoaded) return;
  
  try {
    await ensureMonthlyRecurringDebts();
  } catch (error) {
    console.error("ensureMonthlyRecurringDebts", error);
  }
}

async function ensureMonthlyRecurringDebts() {
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth();
  
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

    // Only create rent and garbage expenses on the 5th of each month
    const expenseTypes = [
      { key: "rent", amount: contract.monthly_rent },
      { key: "garbage", amount: contract.monthly_garbage },
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

  // Generate reference numbers for all expenses before inserting
  for (let i = 0; i < payloads.length; i++) {
    payloads[i].reference = await generateNextReferenceNumber();
  }

  const { error } = await supabase.from("debts").insert(payloads);
  if (error) {
    throw error;
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
    translateUI();
  }
}

async function onCreateApartment(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    name: formData.get("name")?.trim(),
    address: formData.get("address")?.trim() || null,
    electricity_code: formData.get("electricity_code")?.trim() || null,
    heating_code: formData.get("heating_code")?.trim() || null,
    water_code: formData.get("water_code")?.trim() || null,
    waste_code: formData.get("waste_code")?.trim() || null,
  };

  if (!payload.name) {
    notify("error", translate("errorFieldRequired"));
    return;
  }

  const { error } = await supabase.from("apartments").insert(payload);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("onCreateApartment", error);
    return;
  }

  event.target.reset();
  notify("success", translate("successAddApartment"));
  loadApartments();
}

async function onCreateTenant(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    full_name: formData.get("full_name")?.trim(),
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
  const basePayload = {
    contract_id: formData.get("contract_id"),
    tenant_id: formData.get("tenant_id"),
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

  if (isEditing) {
    const { error } = await supabase
      .from("debts")
      .update(payload)
      .eq("id", state.editingDebtId);

    if (error) {
      notify("error", translate("errorLoad"));
      console.error("onUpdateDebt", error);
      return;
    }

    resetDebtForm();
    notify("success", translate("successUpdateDebt"), "edit");
  } else {
    // Generate automatic reference number for new expense (store as integer)
    const nextRefNumber = await generateNextReferenceNumber();
    const reference = nextRefNumber; // Store as integer, format for display only

    const { error } = await supabase
      .from("debts")
      .insert({ ...payload, is_paid: false, reference });

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

  // Prepare the payload
  const payload = {
    type: debtType,
    amount: amount,
    due_date: dueDate,
    notes: notes,
    // Preserve the original relationships
    contract_id: debt.contract_id,
    tenant_id: debt.tenant_id,
  };

  // Update the debt in Supabase
  const { error } = await supabase
    .from("debts")
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
    
    const payload = {
      debt_id: selectedValue || null,
      tenant_id: debt?.tenant_id || existingPayment?.tenant_id || null,
      contract_id: debt?.contract_id || existingPayment?.contract_id || null,
      amount: paymentAmount,
      payment_date: paymentDate,
      method,
      reference: paymentReference,
    };

    const { error } = await supabase
      .from("payments")
      .update(payload)
      .eq("id", state.editingPaymentId);

    if (error) {
      notify("error", translate("errorLoad"));
      console.error("onUpdatePayment", error);
      return;
    }

    // Reload payments to calculate total payments for this debt after update
    await loadPayments();
    
    if (debt) {
      // Calculate total payments for this debt
      const debtPayments = (state.payments || []).filter(
        (p) => equalsId(p.debt_id, debt.id)
      );
      const totalPaid = debtPayments.reduce(
        (sum, payment) => sum + normalizeCurrency(payment.amount),
        0
      );
      const debtAmount = normalizeCurrency(debt.amount);

      // Mark debt as paid only if total payments >= debt amount
      if (totalPaid >= debtAmount - 0.001) {
        const { error: debtUpdateError } = await supabase
          .from("debts")
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq("id", debt.id);
        if (debtUpdateError) {
          console.error("onUpdatePayment.markDebtPaid", debtUpdateError);
        }
      } else {
        // If total payments are less than debt amount, mark as unpaid
        const { error: debtUpdateError } = await supabase
          .from("debts")
          .update({ is_paid: false, paid_at: null })
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

  if (!debt) {
    notify("error", translate("errorLoad"));
    return;
  }

  const debtAmount = normalizeCurrency(debt.amount);
  const isFullyPaid = paymentAmount >= debtAmount - 0.001;

  // Always use debt's reference (connected to expense)
  const paymentReference = debt.reference || null;

  const payload = {
    debt_id: selectedValue,
    tenant_id: debt.tenant_id || null,
    contract_id: debt.contract_id || null,
    amount: paymentAmount,
    payment_date: paymentDate,
    method,
    reference: paymentReference,
  };

  const { error } = await supabase.from("payments").insert(payload);

  if (error) {
    notify("error", translate("errorLoad"));
    console.error("onCreatePayment", error);
    return;
  }

  // Reload payments to calculate total payments for this debt
  await loadPayments();
  
  // Calculate total payments for this debt
  const debtPayments = (state.payments || []).filter(
    (p) => equalsId(p.debt_id, selectedValue)
  );
  const totalPaid = debtPayments.reduce(
    (sum, payment) => sum + normalizeCurrency(payment.amount),
    0
  );

  // Mark debt as paid only if total payments >= debt amount
  if (totalPaid >= debtAmount - 0.001) {
    const { error: debtUpdateError } = await supabase
      .from("debts")
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq("id", selectedValue);
    if (debtUpdateError) {
      console.error("autoMarkDebtPaid", debtUpdateError);
    }
  }

  resetPaymentForm();
  notify("success", translate("successAddPayment"), "save");
  await loadDebts();
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

  const { error } = await supabase.from("payments").insert(paymentsPayload);
  if (error) {
    notify("error", translate("errorLoad"));
    console.error("processGroupedUtilityPayment.insert", error);
    return;
  }

  // Reload payments to calculate total payments for all affected debts
  await loadPayments();

  // Calculate total payments for each affected debt and mark as paid if fully paid
  const affectedDebtIds = [...new Set(paymentsPayload.map(p => p.debt_id))];
  for (const debtId of affectedDebtIds) {
    const debt = state.debts.find((d) => equalsId(d.id, debtId));
    if (!debt) continue;

    const debtPayments = (state.payments || []).filter(
      (p) => equalsId(p.debt_id, debtId)
    );
    const totalPaid = debtPayments.reduce(
      (sum, payment) => sum + normalizeCurrency(payment.amount),
      0
    );
    const debtAmount = normalizeCurrency(debt.amount);

    // Mark debt as paid only if total payments >= debt amount
    if (totalPaid >= debtAmount - 0.001) {
      const { error: debtUpdateError } = await supabase
        .from("debts")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", debtId);
      if (debtUpdateError) {
        console.error("processGroupedUtilityPayment.markDebtPaid", debtUpdateError);
      }
    }
  }

  resetPaymentForm();
  notify("success", translate("successAddPayment"));
  await loadPayments();
  await loadDebts();

  // Calculate outstanding total including partially paid debts
  const remainingDebts = debtsOfType.filter(
    (debt) => !fullyPaidDebtIds.includes(debt.id)
  );
  let outstandingTotal = 0;
  for (const debt of remainingDebts) {
    const partialDebt = partiallyPaidDebts.find((p) => p.id === debt.id);
    if (partialDebt) {
      outstandingTotal += partialDebt.newAmount;
    } else {
      outstandingTotal += normalizeCurrency(debt.amount);
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

  // Set today's date
  if (elements.markPaidDate) {
    const today = new Date().toISOString().split('T')[0];
    elements.markPaidDate.value = today;
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

  // Get contract and tenant info from debt
  const contract = state.contracts.find((c) => equalsId(c.id, debt.contract_id));
  const tenantId = contract?.tenant_id || debt.tenant_id || null;

  // Create payment
  const paymentPayload = {
    debt_id: debtId,
    tenant_id: tenantId,
    contract_id: debt.contract_id || null,
    amount: amount,
    payment_date: paymentDate,
    method: method,
    reference: debt.reference || null,
  };

  const { error: paymentError } = await supabase
    .from("payments")
    .insert(paymentPayload);

  if (paymentError) {
    notify("error", translate("errorLoad"));
    console.error("submitMarkPaidPayment", paymentError);
    return;
  }

  // Mark debt as fully paid
  const { error: debtError } = await supabase
    .from("debts")
    .update({ 
      is_paid: true, 
      paid_at: new Date().toISOString() 
    })
    .eq("id", debtId);

  if (debtError) {
    console.error("submitMarkPaidPayment.debtUpdate", debtError);
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
  return new Intl.NumberFormat(state.language === "sq" ? "sq-AL" : "en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(amount));
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

async function generateNextReferenceNumber() {
  try {
    // Query all debts to find the highest reference number
    const { data, error } = await supabase
      .from("debts")
      .select("reference")
      .not("reference", "is", null)
      .order("reference", { ascending: false })
      .limit(1);

    if (error) {
      console.error("generateNextReferenceNumber", error);
      // If error, return a default starting number
      return 1;
    }

    // Reference is now stored as integer, so we can use it directly
    if (!data || data.length === 0 || !data[0].reference) {
      return 1; // Start from 1 if no references exist
    }

    // Get the maximum reference number and increment
    const maxNumber = typeof data[0].reference === 'number' 
      ? data[0].reference 
      : parseInt(data[0].reference, 10) || 0;
    
    return maxNumber + 1;
  } catch (error) {
    console.error("generateNextReferenceNumber", error);
    return 1;
  }
}

function formatReferenceNumber(number) {
  // Format number for display with "#" prefix
  return typeof number === 'number' ? `#${number}` : `#${number || ''}`;
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
    if (elements.contractsTableBody) elements.contractsTableBody.innerHTML = "";
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
  updateAuthUI();
}

function updateAuthUI() {
  if (state.currentUser) {
    if (elements.authControls) elements.authControls.style.display = "flex";
    const statisticsLink = document.getElementById("statisticsLink");
    if (statisticsLink) statisticsLink.style.display = "flex";
    if (elements.userEmail) {
      elements.userEmail.textContent = state.currentUser.email || "";
    }
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
  elements.tenantInfoList.innerHTML = `
    <dt>${translate("tenantFullName")}:</dt>
    <dd>${sanitize(tenant.full_name)}</dd>
    <dt>${translate("tenantPhone")}:</dt>
    <dd>${sanitize(tenant.phone || "-")}</dd>
    <dt>${translate("tenantSince")}:</dt>
    <dd>${formatDate(tenant.entry_date)}</dd>
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
  const targetDebts = state.debts.filter(
    (debt) => equalsId(debt.tenant_id, tenantId) && !debt.is_paid
  );
  if (!targetDebts.length) {
    elements.tenantDebtsTableBody.innerHTML = `<tr><td colspan="4">${translate(
      "noDebtsFound"
    )}</td></tr>`;
    return;
  }
  elements.tenantDebtsTableBody.innerHTML = targetDebts
    .map((debt) => {
      const status = getDebtStatus(debt);
      return `
        <tr>
          <td>${sanitize(getDebtTypeLabel(debt))}</td>
          <td>${formatCurrency(debt.amount)}</td>
          <td>${formatDate(debt.due_date)}</td>
          <td><span class="tag ${status.class}">${status.label}</span></td>
        </tr>
      `;
    })
    .join("");
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

  const totalDebt = debts.reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0),
    0
  );
  const totalPaid = payments.reduce(
    (sum, payment) => sum + (parseFloat(payment.amount) || 0),
    0
  );
  const totalUnpaid = debts
    .filter((debt) => !debt.is_paid)
    .reduce((sum, debt) => sum + (parseFloat(debt.amount) || 0), 0);
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
  const startY = 20;
  doc.setFontSize(16);
  doc.text(translate("debtsPaymentsTitle"), 14, 15);
  doc.setFontSize(11);

  const headers = [
    translate("selectTenant"),
    translate("debtType"),
    translate("amount"),
    translate("dueDate"),
    translate("status"),
    translate("notes"),
  ];

  const rows = state.debts.map((debt) => {
    const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
    const status = getDebtStatus(debt);
    return [
      sanitize(tenant?.full_name || translate("unknown")),
      getDebtTypeLabel(debt),
      formatCurrency(debt.amount),
      formatDate(debt.due_date),
      status.label,
      sanitize(stripElectricityCutMarker(debt.notes || "")),
    ];
  });

  doc.autoTable({
    startY,
    head: [headers],
    body: rows,
    styles: { fontSize: 9 },
    theme: "grid",
    headStyles: {
      fillColor: [8, 168, 138], // #08a88a
      textColor: [255, 255, 255],
    },
  });

  doc.save("debts-report.pdf");
  incrementPdfGeneratedCount();
}

function exportTenantToPdf(language = "en", format = "normal") {
  if (!state.selectedTenantId) {
    notify("error", translate("noTenantSelected"));
    return;
  }
  const tenant = state.tenants.find((t) =>
    equalsId(t.id, state.selectedTenantId)
  );
  if (!tenant) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  setTemporaryLanguage(language);

  // Header
  doc.setFillColor(8, 168, 138); // #08a88a
  doc.rect(0, 0, 210, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(`${tenant.full_name}`, 14, 18);
  doc.setFontSize(11);
  doc.text(translate("tenantDashboard"), 14, 26);

  // Reset text color for body
  doc.setTextColor(31, 41, 55);

  const debts = state.debts.filter((debt) =>
    equalsId(debt.tenant_id, tenant.id)
  );
  const unpaidDebts = debts.filter((debt) => !debt.is_paid);
  const payments = state.payments.filter((payment) =>
    equalsId(payment.tenant_id, tenant.id)
  );
  const debtsById = new Map(debts.map((debt) => [String(debt.id), debt]));

  const totalUnpaid = unpaidDebts.reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0),
    0
  );
  const totalPaid = payments.reduce(
    (sum, payment) => sum + (parseFloat(payment.amount) || 0),
    0
  );
  const primaryContract = getPrimaryContractForTenant(tenant.id);

  // Summary cards
  const summaryStartY = 46;
  const cardWidth = 60;
  const cardHeight = 24;
  const summaries = [
    {
      label: translate("tenantPhone"),
      value: tenant.phone || "-",
    },
    {
      label: translate("tenantSince"),
      value: formatDate(tenant.entry_date),
    },
    {
      label: translate("contractActive"),
      value: primaryContract
        ? primaryContract.is_active
          ? translate("yes")
          : translate("no")
        : translate("unknown"),
    },
  ];

  summaries.forEach((item, index) => {
    const x = 14 + index * (cardWidth + 6);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, summaryStartY, cardWidth, cardHeight, 3, 3, "F");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 4, summaryStartY + 8);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(item.value, x + 4, summaryStartY + 17);
  });

  const metricsStartY = summaryStartY + cardHeight + 16;
  const metrics = [
    {
      label: translate("totalDebt"),
      value: formatCurrency(totalUnpaid + totalPaid),
    },
    {
      label: translate("totalPaid"),
      value: formatCurrency(totalPaid),
    },
    {
      label: translate("totalUnpaid"),
      value: formatCurrency(totalUnpaid),
    },
  ];

  metrics.forEach((item, index) => {
    const x = 14 + index * (cardWidth + 6);
    doc.setFillColor(8, 168, 138); // #08a88a
    doc.roundedRect(x, metricsStartY, cardWidth, cardHeight, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(item.label, x + 4, metricsStartY + 8);
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(item.value, x + 4, metricsStartY + 17);
  });

  let cursorY = metricsStartY + cardHeight + 16;

  const autoTableAvailable =
    doc.autoTable && typeof doc.autoTable === "function";

  // Create summary table of unpaid expenses by type
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text(translate("unpaidExpensesSummary") || "Unpaid Expenses Summary", 14, cursorY);
  cursorY += 6;

  // Group unpaid debts by type
  const unpaidByType = new Map();
  unpaidDebts.forEach((debt) => {
    const type = debt.type;
    if (!unpaidByType.has(type)) {
      unpaidByType.set(type, []);
    }
    unpaidByType.get(type).push(debt);
  });

  // Calculate totals by type
  const expenseSummary = [];
  const typeOrder = ["rent", "garbage", "maintenance", "electricity", "water", "thermos", "damage", "other"];
  
  typeOrder.forEach((type) => {
    if (unpaidByType.has(type)) {
      const debtsOfType = unpaidByType.get(type);
      const total = debtsOfType.reduce((sum, debt) => sum + normalizeCurrency(debt.amount), 0);
      if (total > 0) {
        const typeLabel = translate(`debt${capitalize(type)}`) || type;
        expenseSummary.push({
          type: typeLabel,
          amount: total
        });
      }
    }
  });

  // Add any other types not in the order
  Array.from(unpaidByType.keys()).forEach((type) => {
    if (!typeOrder.includes(type) && !expenseSummary.find(e => e.type === (translate(`debt${capitalize(type)}`) || type))) {
      const debtsOfType = unpaidByType.get(type);
      const total = debtsOfType.reduce((sum, debt) => sum + normalizeCurrency(debt.amount), 0);
      if (total > 0) {
        const typeLabel = translate(`debt${capitalize(type)}`) || type;
        expenseSummary.push({
          type: typeLabel,
          amount: total
        });
      }
    }
  });

  if (expenseSummary.length > 0) {
    if (autoTableAvailable) {
      doc.autoTable({
        startY: cursorY,
        head: [[translate("expenseType") || "Expense Type", translate("amount") || "Amount"]],
        body: expenseSummary.map(item => [
          item.type,
          formatCurrency(item.amount)
        ]),
        styles: {
          fontSize: 11,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [8, 168, 138], // #08a88a
          textColor: [255, 255, 255],
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right' }
        }
      });
      cursorY = doc.lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(11);
      expenseSummary.forEach((item, index) => {
        const lineY = cursorY + index * 7;
        doc.text(
          `${item.type}: ${formatCurrency(item.amount)}`,
          14,
          lineY
        );
      });
      cursorY += expenseSummary.length * 7 + 12;
    }
  }

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(translate("tenantDebts"), 14, cursorY);
  cursorY += 4;

  if (unpaidDebts.length) {
    if (autoTableAvailable) {
      doc.autoTable({
        startY: cursorY,
        head: [
          [
            translate("debtType"),
            translate("amount"),
            translate("dueDate"),
            translate("status"),
          ],
        ],
          body: unpaidDebts.map((debt) => {
          const status = getDebtStatus(debt);
          return [
              getDebtTypeLabel(debt),
            formatCurrency(debt.amount),
            formatDate(debt.due_date),
            status.label,
          ];
        }),
        styles: {
          fontSize: 10,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [8, 168, 138], // #08a88a
          textColor: [255, 255, 255],
        },
      });
      cursorY = doc.lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(10);
      unpaidDebts.forEach((debt, index) => {
        const status = getDebtStatus(debt);
        const lineY = cursorY + index * 6;
        doc.text(
          `${getDebtTypeLabel(debt)} — ${formatCurrency(debt.amount)} — ${formatDate(
            debt.due_date
          )} — ${status.label}`,
          14,
          lineY
        );
      });
      cursorY += unpaidDebts.length * 6 + 12;
    }
  } else {
    doc.setFontSize(10);
    doc.text(translate("summaryNoData"), 14, cursorY + 6);
    cursorY += 18;
  }

  // Only show payments section in detailed format
  if (format === "detailed") {
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(translate("tenantPayments"), 14, cursorY);
    cursorY += 4;

    if (payments.length) {
    const paymentTypeOrder = [
      "rent",
      "garbage",
      "maintenance",
      "electricity",
      "water",
      "thermos",
    ];
    const paymentsByType = new Map();

    payments.forEach((payment) => {
      const debt = payment.debt_id
        ? debtsById.get(String(payment.debt_id)) || null
        : null;
      const typeKey = debt?.type || "__unknown__";
      if (!paymentsByType.has(typeKey)) {
        paymentsByType.set(typeKey, []);
      }
      paymentsByType.get(typeKey).push({ payment, debt });
    });

    const additionalTypes = Array.from(paymentsByType.keys()).filter(
      (type) =>
        !paymentTypeOrder.includes(type) && type !== "__unknown__"
    );
    if (paymentsByType.has("__unknown__")) {
      additionalTypes.push("__unknown__");
    }
    const orderedTypes = paymentTypeOrder
      .filter((type) => paymentsByType.has(type))
      .concat(additionalTypes);

    let hasRenderedPaymentTable = false;

    orderedTypes.forEach((typeKey) => {
      const entries = paymentsByType.get(typeKey);
      if (!entries || !entries.length) return;
      hasRenderedPaymentTable = true;

      const sectionLabel =
        typeKey === "__unknown__"
          ? translate("unknown")
          : translate(`debt${capitalize(typeKey)}`) || typeKey;

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(sectionLabel, 14, cursorY);
      cursorY += 4;

      if (autoTableAvailable) {
        doc.autoTable({
          startY: cursorY,
          head: [
            [
              translate("paymentDate"),
              translate("dueDate"),
              translate("amount"),
              translate("paymentMethod"),
              translate("paymentReference"),
            ],
          ],
          body: entries.map(({ payment, debt }) => [
            formatDate(payment.payment_date),
            formatDate(debt?.due_date),
            formatCurrency(payment.amount),
            payment.method || "-",
            formatReferenceForDisplay(payment.reference),
          ]),
          styles: {
            fontSize: 10,
            cellPadding: 2.5,
          },
          headStyles: {
            fillColor: [8, 168, 138], // #08a88a
            textColor: [255, 255, 255],
          },
        });
        cursorY = doc.lastAutoTable.finalY + 8;
      } else {
        doc.setFontSize(10);
        entries.forEach(({ payment, debt }, index) => {
          const lineY = cursorY + 6 + index * 6;
          doc.text(
            `${formatDate(payment.payment_date)} — ${formatDate(
              debt?.due_date
            )} — ${formatCurrency(payment.amount)} — ${payment.method || "-"} (${
              formatReferenceForDisplay(payment.reference)
            })`,
            14,
            lineY
          );
        });
        cursorY += entries.length * 6 + 8;
      }
    });

    if (!hasRenderedPaymentTable) {
      doc.setFontSize(10);
      doc.text(translate("summaryNoData"), 14, cursorY + 6);
    }
    } else {
      doc.setFontSize(10);
      doc.text(translate("summaryNoData"), 14, cursorY + 6);
    }
  }

  doc.save(`tenant-${tenant.id}.pdf`);
  incrementPdfGeneratedCount();
  restoreLanguageAfterPdf();
}

// Polyfill for autoTable if the plugin is not included by default in jspdf bundle
if (!window.jspdf.jsPDF.API.autoTable) {
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js";
  script.onload = () => console.info("jsPDF AutoTable plugin loaded.");
  document.head.appendChild(script);
}

