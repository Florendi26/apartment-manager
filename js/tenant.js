// Configuration is loaded from js/config.js
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  body.innerHTML = "<tr><td colspan='3'>Loading...</td></tr>";

  // Get all active contracts to know which apartments are taken
  const { data: activeContracts, error: contractsError } = await supabase
    .from("contracts")
    .select("apartment_id")
    .eq("is_active", true);

  if (contractsError) {
    console.error("loadAvailableApartments contracts", contractsError);
    body.innerHTML = "<tr><td colspan='3'>Failed to load apartments.</td></tr>";
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
    body.innerHTML = "<tr><td colspan='3'>Failed to load apartments.</td></tr>";
    return;
  }

  // Filter out apartments with active contracts
  const apartments = (allApartments || []).filter(
    (apt) => !takenIds.includes(apt.id)
  );

  if (apartmentsError) {
    console.error("loadAvailableApartments apartments", apartmentsError);
    body.innerHTML = "<tr><td colspan='3'>Failed to load apartments.</td></tr>";
    return;
  }

  if (!apartments || apartments.length === 0) {
    body.innerHTML = "<tr><td colspan='3'>No apartments available at the moment.</td></tr>";
    return;
  }

  body.innerHTML = apartments
    .map(
      (apt) => `
      <tr>
        <td>${apt.name || "-"}</td>
        <td>${apt.address || "-"}</td>
        <td>
          <button type="button" class="button-secondary" data-apartment-id="${apt.id}">
            Apply
          </button>
        </td>
      </tr>
    `
    )
    .join("");

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
    expensesBody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
  }
  if (paymentsBody) {
    paymentsBody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
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
      expensesBody.innerHTML = "<tr><td colspan='4'>No expenses found.</td></tr>";
    }
    if (paymentsBody) {
      paymentsBody.innerHTML = "<tr><td colspan='4'>No payments found.</td></tr>";
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
      expensesBody.innerHTML = "<tr><td colspan='4'>No expenses found.</td></tr>";
    }
    if (paymentsBody) {
      paymentsBody.innerHTML = "<tr><td colspan='4'>No payments found.</td></tr>";
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
    contractInfoEl.innerHTML = `
      <dl>
        <dt>Apartment:</dt>
        <dd>${apartmentName}</dd>
        <dt>Start Date:</dt>
        <dd>${tenantFormatDate(activeContract.start_date)}</dd>
        <dt>End Date:</dt>
        <dd>${tenantFormatDate(activeContract.end_date)}</dd>
        <dt>Monthly Rent:</dt>
        <dd>${tenantFormatCurrency(activeContract.monthly_rent)}</dd>
        <dt>Status:</dt>
        <dd>${activeContract.is_active ? "Active" : "Inactive"}</dd>
      </dl>
    `;
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
  if (allExpenses.length === 0) {
    if (expensesBody) {
      expensesBody.innerHTML = "<tr><td colspan='4'>No expenses found.</td></tr>";
    }
  } else if (expensesBody) {
    const sortedExpenses = allExpenses.sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
      return aTime - bTime;
    });
    expensesBody.innerHTML = sortedExpenses
      .map((e) => {
        const status =
          typeof e.is_paid === "boolean"
            ? e.is_paid
              ? "Paid"
              : "Unpaid"
            : "-";
        return `
          <tr>
            <td>${e.type}</td>
            <td>${tenantFormatCurrency(tenantNormalizeCurrency(e.amount))}</td>
            <td>${tenantFormatDate(e.due_date)}</td>
            <td>${status}</td>
          </tr>
        `;
      })
      .join("");
  }

  // Render payments
  if (allPayments.length === 0) {
    if (paymentsBody) {
      paymentsBody.innerHTML = "<tr><td colspan='4'>No payments found.</td></tr>";
    }
  } else if (paymentsBody) {
    const sortedPayments = allPayments.sort((a, b) => {
      const aTime = a.payment_date ? new Date(a.payment_date).getTime() : 0;
      const bTime = b.payment_date ? new Date(b.payment_date).getTime() : 0;
      return aTime - bTime;
    });
    paymentsBody.innerHTML = sortedPayments
      .map((p) => {
        return `
          <tr>
            <td>${p.type}</td>
            <td>${tenantFormatCurrency(tenantNormalizeCurrency(p.amount))}</td>
            <td>${tenantFormatDate(p.payment_date)}</td>
            <td>${p.method || "-"}</td>
          </tr>
        `;
      })
      .join("");
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


