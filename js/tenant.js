// Configuration is loaded from js/config.js
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

// Use var to allow redeclaration if loaded multiple times (prevents SyntaxError)
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TENANT_EXPENSE_TABLES = {
  rent: { bills: "rent_bills", payments: "rent_payments", hasStatus: true },
  garbage: { bills: "garbage_bills", payments: "garbage_payments", hasStatus: true },
  maintenance: { bills: "maintenance_bills", payments: "maintenance_payments", hasStatus: true },
  electricity: { bills: "electricity_bills", payments: "electricity_payments", hasStatus: false },
  water: { bills: "water_bills", payments: "water_payments", hasStatus: false },
  thermos: { bills: "heating_bills", payments: "heating_payments", hasStatus: false },
};

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
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    window.location.href = "login.html";
    return null;
  }
  const user = data.user;
  const role = user.user_metadata?.role || "Property Owner / Landlord";
  if (role !== "Tenant") {
    // Redirect non-tenants to main dashboard
    window.location.href = "index.html";
    return null;
  }
  return user;
}

async function loadAvailableApartments() {
  const body = document.getElementById("tenantAvailableApartmentsBody");
  if (!body) return;
  
  // Clear container and show loading using DOM methods
  while (body.firstChild) {
    body.removeChild(body.firstChild);
  }
  const loadingTr = document.createElement('tr');
  const loadingTd = document.createElement('td');
  loadingTd.setAttribute('colspan', '3');
  loadingTd.textContent = "Loading...";
  loadingTr.appendChild(loadingTd);
  body.appendChild(loadingTr);

  // Get all active contracts to know which apartments are taken
  const { data: activeContracts, error: contractsError } = await supabase
    .from("contracts")
    .select("apartment_id")
    .eq("is_active", true);

  if (contractsError) {
    console.error("loadAvailableApartments contracts", contractsError);
    // Clear container and show error using DOM methods
    while (body.firstChild) {
      body.removeChild(body.firstChild);
    }
    const errorTr = document.createElement('tr');
    const errorTd = document.createElement('td');
    errorTd.setAttribute('colspan', '3');
    errorTd.textContent = "Failed to load apartments.";
    errorTr.appendChild(errorTd);
    body.appendChild(errorTr);
    return;
  }

  const takenIds = (activeContracts || []).map((c) => c.apartment_id).filter(Boolean);

  // Load all apartments and filter out taken ones in JavaScript
  const { data: allApartments, error: apartmentsError } = await supabase
    .from("apartments")
    .select("id, name, address")
    .order("created_at", { ascending: false });

  if (apartmentsError) {
    console.error("loadAvailableApartments apartments", apartmentsError);
    // Clear container and show error using DOM methods
    while (body.firstChild) {
      body.removeChild(body.firstChild);
    }
    const errorTr = document.createElement('tr');
    const errorTd = document.createElement('td');
    errorTd.setAttribute('colspan', '3');
    errorTd.textContent = "Failed to load apartments.";
    errorTr.appendChild(errorTd);
    body.appendChild(errorTr);
    return;
  }

  // Filter out apartments with active contracts
  const apartments = (allApartments || []).filter(
    (apt) => !takenIds.includes(apt.id)
  );

  if (!apartments || apartments.length === 0) {
    // Clear container and show message using DOM methods
    while (body.firstChild) {
      body.removeChild(body.firstChild);
    }
    const noAptsTr = document.createElement('tr');
    const noAptsTd = document.createElement('td');
    noAptsTd.setAttribute('colspan', '3');
    noAptsTd.textContent = "No apartments available at the moment.";
    noAptsTr.appendChild(noAptsTd);
    body.appendChild(noAptsTr);
    return;
  }

  // Clear container using DOM methods
  while (body.firstChild) {
    body.removeChild(body.firstChild);
  }
  
  // Render apartments using DOM methods
  apartments.forEach((apt) => {
    const tr = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = apt.name || "-";
    tr.appendChild(nameCell);
    
    const addressCell = document.createElement('td');
    addressCell.textContent = apt.address || "-";
    tr.appendChild(addressCell);
    
    const actionCell = document.createElement('td');
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'btn btn-outline-secondary btn-sm';
    applyBtn.setAttribute('data-apartment-id', apt.id);
    applyBtn.textContent = "Apply";
    applyBtn.addEventListener("click", () => {
      // Handle apply action
      alert(`Applying for apartment: ${apt.name || apt.id}`);
    });
    actionCell.appendChild(applyBtn);
    tr.appendChild(actionCell);
    
    body.appendChild(tr);
  });

  body.querySelectorAll("button[data-apartment-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tenantNotify("success", "Application request sent to the landlord (placeholder).");
    });
  });
}

async function loadTenantData(user) {
  const contractInfoEl = document.getElementById("tenantContractInfo");
  const expensesBody = document.getElementById("tenantExpensesBody");
  const paymentsBody = document.getElementById("tenantPaymentsBody");

  if (contractInfoEl) {
    contractInfoEl.textContent = "Loading your contract information...";
  }
  if (expensesBody) {
    // Clear container and show loading using DOM methods
    while (expensesBody.firstChild) {
      expensesBody.removeChild(expensesBody.firstChild);
    }
    const loadingTr = document.createElement('tr');
    const loadingTd = document.createElement('td');
    loadingTd.setAttribute('colspan', '4');
    loadingTd.textContent = "Loading...";
    loadingTr.appendChild(loadingTd);
    expensesBody.appendChild(loadingTr);
  }
  if (paymentsBody) {
    // Clear container and show loading using DOM methods
    while (paymentsBody.firstChild) {
      paymentsBody.removeChild(paymentsBody.firstChild);
    }
    const loadingTr = document.createElement('tr');
    const loadingTd = document.createElement('td');
    loadingTd.setAttribute('colspan', '4');
    loadingTd.textContent = "Loading...";
    loadingTr.appendChild(loadingTd);
    paymentsBody.appendChild(loadingTr);
  }

  // Find tenant by email
  const { data: tenants, error: tenantError } = await supabase
    .from("tenants")
    .select("id, full_name, email, phone, entry_date")
    .eq("email", user.email)
    .limit(1);

  if (tenantError) {
    console.error("loadTenantData tenants", tenantError);
    if (contractInfoEl) {
      contractInfoEl.textContent = "Failed to load tenant profile.";
    }
    return;
  }

  const tenant = tenants && tenants[0];
  if (!tenant) {
    if (contractInfoEl) {
      contractInfoEl.textContent =
        "No tenant profile linked to your email yet. You can apply for an apartment above.";
    }
    if (expensesBody) {
      // Clear container and show message using DOM methods
      while (expensesBody.firstChild) {
        expensesBody.removeChild(expensesBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = "No expenses found.";
      tr.appendChild(td);
      expensesBody.appendChild(tr);
    }
    if (paymentsBody) {
      // Clear container and show message using DOM methods
      while (paymentsBody.firstChild) {
        paymentsBody.removeChild(paymentsBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = "No payments found.";
      tr.appendChild(td);
      paymentsBody.appendChild(tr);
    }
    return;
  }

  // Load contracts for this tenant
  const { data: contracts, error: contractsError } = await supabase
    .from("contracts")
    .select("id, apartment_id, start_date, end_date, monthly_rent, is_active")
    .eq("tenant_id", tenant.id)
    .order("start_date", { ascending: false });

  if (contractsError) {
    console.error("loadTenantData contracts", contractsError);
    if (contractInfoEl) {
      contractInfoEl.textContent = "Failed to load contracts.";
    }
    return;
  }

  if (!contracts || contracts.length === 0) {
    if (contractInfoEl) {
      contractInfoEl.textContent =
        "You do not have any contracts yet. Once a landlord creates a contract for you, it will appear here.";
    }
    if (expensesBody) {
      // Clear container and show message using DOM methods
      while (expensesBody.firstChild) {
        expensesBody.removeChild(expensesBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = "No expenses found.";
      tr.appendChild(td);
      expensesBody.appendChild(tr);
    }
    if (paymentsBody) {
      // Clear container and show message using DOM methods
      while (paymentsBody.firstChild) {
        paymentsBody.removeChild(paymentsBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = "No payments found.";
      tr.appendChild(td);
      paymentsBody.appendChild(tr);
    }
    return;
  }

  const activeContract = contracts.find((c) => c.is_active) || contracts[0];
  const contractIds = contracts.map((c) => c.id);

  // Load apartment info
  let apartmentName = "-";
  const { data: apartments, error: apartmentError } = await supabase
    .from("apartments")
    .select("id, name, address")
    .eq("id", activeContract.apartment_id)
    .limit(1);
  if (!apartmentError && apartments && apartments[0]) {
    apartmentName = `${apartments[0].name || "-"} (${apartments[0].address || "-"})`;
  }

  if (contractInfoEl) {
    // Clear container using DOM methods
    while (contractInfoEl.firstChild) {
      contractInfoEl.removeChild(contractInfoEl.firstChild);
    }
    
    const dl = document.createElement('dl');
    
    function addDefinitionItem(dtText, ddText) {
      const dt = document.createElement('dt');
      dt.textContent = dtText;
      dl.appendChild(dt);
      const dd = document.createElement('dd');
      dd.textContent = ddText;
      dl.appendChild(dd);
    }
    
    addDefinitionItem("Apartment:", apartmentName);
    addDefinitionItem("Start Date:", tenantFormatDate(activeContract.start_date));
    addDefinitionItem("End Date:", tenantFormatDate(activeContract.end_date));
    addDefinitionItem("Monthly Rent:", tenantFormatCurrency(activeContract.monthly_rent));
    addDefinitionItem("Status:", activeContract.is_active ? "Active" : "Inactive");
    
    contractInfoEl.appendChild(dl);
  }

  // Load expenses and payments for all contracts of this tenant
  const allExpenses = [];
  const allPayments = [];

  for (const [type, tableInfo] of Object.entries(TENANT_EXPENSE_TABLES)) {
    // Match landlord/admin loader: utilities use bill_date instead of due_date
    const billSelect = tableInfo.hasStatus
      ? "id, amount, bill_date, due_date, is_paid, contract_id"
      : "id, amount, bill_date, contract_id";

    const { data: bills, error: billsError } = await supabase
      .from(tableInfo.bills)
      .select(billSelect)
      .in("contract_id", contractIds);

    if (!billsError && bills) {
      bills.forEach((b) => {
        const dueDate = b.due_date || b.bill_date || null;
        allExpenses.push({
          ...b,
          type,
          due_date: dueDate,
        });
      });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from(tableInfo.payments)
      .select("id, amount, payment_date, method, contract_id")
      .in("contract_id", contractIds);

    if (!paymentsError && payments) {
      payments.forEach((p) => {
        allPayments.push({
          ...p,
          type,
        });
      });
    }
  }

  // Render expenses
  if (expensesBody) {
    // Clear container using DOM methods
    while (expensesBody.firstChild) {
      expensesBody.removeChild(expensesBody.firstChild);
    }
    
    if (allExpenses.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = "No expenses found.";
      tr.appendChild(td);
      expensesBody.appendChild(tr);
    } else {
      const sortedExpenses = allExpenses.sort((a, b) => {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
        return aTime - bTime;
      });
      
      sortedExpenses.forEach((e) => {
        const status =
          typeof e.is_paid === "boolean"
            ? e.is_paid
              ? "Paid"
              : "Unpaid"
            : "-";
        
        const tr = document.createElement('tr');
        
        const typeCell = document.createElement('td');
        typeCell.textContent = e.type;
        tr.appendChild(typeCell);
        
        const amountCell = document.createElement('td');
        amountCell.textContent = tenantFormatCurrency(tenantNormalizeCurrency(e.amount));
        tr.appendChild(amountCell);
        
        const dateCell = document.createElement('td');
        dateCell.textContent = tenantFormatDate(e.due_date);
        tr.appendChild(dateCell);
        
        const statusCell = document.createElement('td');
        statusCell.textContent = status;
        tr.appendChild(statusCell);
        
        expensesBody.appendChild(tr);
      });
    }
  }

  // Render payments
  if (paymentsBody) {
    // Clear container using DOM methods
    while (paymentsBody.firstChild) {
      paymentsBody.removeChild(paymentsBody.firstChild);
    }
    
    if (allPayments.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = "No payments found.";
      tr.appendChild(td);
      paymentsBody.appendChild(tr);
    } else {
      const sortedPayments = allPayments.sort((a, b) => {
        const aTime = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const bTime = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        return aTime - bTime;
      });
      
      sortedPayments.forEach((p) => {
        const tr = document.createElement('tr');
        
        const typeCell = document.createElement('td');
        typeCell.textContent = p.type;
        tr.appendChild(typeCell);
        
        const amountCell = document.createElement('td');
        amountCell.textContent = tenantFormatCurrency(tenantNormalizeCurrency(p.amount));
        tr.appendChild(amountCell);
        
        const dateCell = document.createElement('td');
        dateCell.textContent = tenantFormatDate(p.payment_date);
        tr.appendChild(dateCell);
        
        const methodCell = document.createElement('td');
        methodCell.textContent = p.method || "-";
        tr.appendChild(methodCell);
        
        paymentsBody.appendChild(tr);
      });
    }
  }
}

async function handleTenantLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Tenant logout error:", error);
  } finally {
    window.location.href = "login.html";
  }
}

function setupTenantThemeToggle() {
  const btn = document.getElementById("tenantThemeToggleBtn");
  if (!btn) return;

  const applyTheme = (theme) => {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      btn.textContent = "Light";
    } else {
      document.body.classList.remove("dark-theme");
      btn.textContent = "Dark";
      theme = "light";
    }
    try {
      window.localStorage.setItem("tenantTheme", theme);
    } catch (_) {}
  };

  const storedTheme =
    (window.localStorage && window.localStorage.getItem("tenantTheme")) ||
    "light";
  applyTheme(storedTheme);

  btn.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-theme");
    applyTheme(isDark ? "light" : "dark");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await tenantCheckAuth();
  if (!user) return;

  const logoutBtn = document.getElementById("tenantLogoutButton");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleTenantLogout);
  }

  setupTenantThemeToggle();
  await loadAvailableApartments();
  await loadTenantData(user);
});


