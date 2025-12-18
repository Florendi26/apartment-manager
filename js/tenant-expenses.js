const TENANT_EXPENSE_TABLES = {
  rent: { bills: "rent_bills", payments: "rent_payments", hasStatus: true },
  garbage: { bills: "garbage_bills", payments: "garbage_payments", hasStatus: true },
  maintenance: { bills: "maintenance_bills", payments: "maintenance_payments", hasStatus: true },
  electricity: { bills: "electricity_bills", payments: "electricity_payments", hasStatus: false },
  water: { bills: "water_bills", payments: "water_payments", hasStatus: false },
  thermos: { bills: "heating_bills", payments: "heating_payments", hasStatus: false },
};

function tenantGetTranslation(key) {
  const translations = window.TRANSLATIONS || {};
  const currentLang =
    (window.localStorage && window.localStorage.getItem("language")) || "en";
  const dictionary = translations[currentLang] || translations.en || {};
  return dictionary[key] || key;
}

function tenantGetExpenseTypeTranslation(type) {
  const typeMap = {
    rent: "tenantExpenseTypeRent",
    garbage: "tenantExpenseTypeGarbage",
    maintenance: "tenantExpenseTypeMaintenance",
    electricity: "tenantExpenseTypeElectricity",
    water: "tenantExpenseTypeWater",
    thermos: "tenantExpenseTypeHeating",
  };
  const key = typeMap[type] || type;
  return tenantGetTranslation(key);
}

async function tenantExpensesInit() {
  const user = await tenantCheckAuth();
  if (!user) return;

  // Update top navigation active state
  if (typeof updateTenantTopNavActive === "function") {
    updateTenantTopNavActive();
  }

  tenantSetupLanguageToggle("tenantLanguageToggleBtn");
  tenantSetupThemeToggle("tenantThemeToggleBtn");
  
  // Apply translations to top navigation
  if (typeof tenantTranslateUI === "function") {
    tenantTranslateUI();
  }

  // Listen for language changes to reload expenses with new translations
  window.addEventListener("tenantLanguageChanged", () => {
    tenantLoadExpensesAndPayments();
  });

  const logoutBtn = document.getElementById("tenantLogoutButton");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const { error } = await tenantSupabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error("Tenant logout error:", error);
      } finally {
        window.location.href = "login.html";
      }
    });
  }

  await tenantLoadExpensesAndPayments();
  
  // Mark current page in navigation
  markActiveNavButton('tenant-expenses.html');
}

function markActiveNavButton(currentPage) {
  const navLinks = document.querySelectorAll('.tenant-main-nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === 'tenant-expenses.html' && href.includes('tenant-expenses.html'))) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
      // Prevent clicking on the active link
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
    }
  });
}

async function tenantLoadExpensesAndPayments() {
  const user = (await tenantSupabase.auth.getUser())?.data?.user;
  if (!user) return;

  const tenantProfile = await tenantLoadProfileByEmail(user);
  const expensesBody = document.getElementById("tenantExpensesBody");
  const paymentsBody = document.getElementById("tenantPaymentsBody");
  const typeSummaryBody = document.getElementById("tenantTypeSummaryBody");

  if (!tenantProfile) {
    const noProfileMsg = tenantGetTranslation("tenantNoProfileLinked");
    if (expensesBody) {
      expensesBody.innerHTML = `<tr><td colspan='4'>${noProfileMsg}</td></tr>`;
    }
    if (paymentsBody) {
      paymentsBody.innerHTML = `<tr><td colspan='4'>${noProfileMsg}</td></tr>`;
    }
    if (typeSummaryBody) {
      typeSummaryBody.innerHTML = "";
    }
    return;

  }

  const { data: contracts, error: contractsError } = await tenantSupabase
    .from("contracts")
    .select("id, is_active")
    .eq("tenant_id", tenantProfile.id);

  if (contractsError) {
    console.error("tenant expenses contracts", contractsError);
    const failedMsg = tenantGetTranslation("tenantExpensesFailedLoad");
    if (expensesBody) {
      expensesBody.innerHTML = `<tr><td colspan='4'>${failedMsg}</td></tr>`;
    }
    if (paymentsBody) {
      paymentsBody.innerHTML = `<tr><td colspan='4'>${failedMsg}</td></tr>`;
    }
    return;
  }

  if (!contracts || contracts.length === 0) {
    const noContractsMsg = tenantGetTranslation("tenantNoContractsYet");
    if (expensesBody) {
      expensesBody.innerHTML = `<tr><td colspan='4'>${noContractsMsg}</td></tr>`;
    }
    if (paymentsBody) {
      paymentsBody.innerHTML = `<tr><td colspan='4'>${noContractsMsg}</td></tr>`;
    }
    if (typeSummaryBody) {
      typeSummaryBody.innerHTML = "";
    }
    tenantUpdateSummary(0, 0);
    return;
  }

  const contractIds = contracts.map((c) => c.id);
  const allExpenses = [];
  const allPayments = [];

  for (const [type, tableInfo] of Object.entries(TENANT_EXPENSE_TABLES)) {
    // Match landlord/admin loader: utilities use bill_date instead of due_date
    const billSelect = tableInfo.hasStatus
      ? "id, amount, bill_date, due_date, is_paid, contract_id"
      : "id, amount, bill_date, contract_id";

    const { data: bills } = await tenantSupabase
      .from(tableInfo.bills)
      .select(billSelect)
      .in("contract_id", contractIds);

    if (bills) {
      bills.forEach((b) => {
        // Normalise to a common due_date field for sorting/display
        const dueDate = b.due_date || b.bill_date || null;
        allExpenses.push({ ...b, type, due_date: dueDate });
      });
    }

    const { data: payments } = await tenantSupabase
      .from(tableInfo.payments)
      .select("id, amount, payment_date, method, contract_id")
      .in("contract_id", contractIds);

    if (payments) {
      payments.forEach((p) => {
        allPayments.push({ ...p, type });
      });
    }
  }

  // Totals
  const totalExpenses = allExpenses.reduce(
    (sum, e) => sum + tenantNormalizeCurrency(e.amount),
    0
  );
  const totalPayments = allPayments.reduce(
    (sum, p) => sum + tenantNormalizeCurrency(p.amount),
    0
  );

  tenantUpdateSummary(totalExpenses, totalPayments);

  // Per type summary
  const expensesByType = {};
  const paymentsByType = {};

  allExpenses.forEach((e) => {
    expensesByType[e.type] =
      (expensesByType[e.type] || 0) + tenantNormalizeCurrency(e.amount);
  });
  allPayments.forEach((p) => {
    paymentsByType[p.type] =
      (paymentsByType[p.type] || 0) + tenantNormalizeCurrency(p.amount);
  });

  if (typeSummaryBody) {
    const types = Array.from(
      new Set([...Object.keys(expensesByType), ...Object.keys(paymentsByType)])
    );
    if (!types.length) {
      typeSummaryBody.innerHTML = `<tr><td colspan='4'>${tenantGetTranslation("tenantExpensesNoData")}</td></tr>`;
    } else {
      typeSummaryBody.innerHTML = types
        .map((type) => {
          const exp = expensesByType[type] || 0;
          const pay = paymentsByType[type] || 0;
          const bal = exp - pay;
          const typeLabel = tenantGetExpenseTypeTranslation(type);
          return `
            <tr>
              <td>${typeLabel}</td>
              <td>${tenantFormatCurrency(exp)}</td>
              <td>${tenantFormatCurrency(pay)}</td>
              <td>${tenantFormatCurrency(bal)}</td>
            </tr>
          `;
        })
        .join("");
    }
  }

  // Detailed expenses
  if (expensesBody) {
    if (!allExpenses.length) {
      expensesBody.innerHTML = `<tr><td colspan='4'>${tenantGetTranslation("tenantExpensesNoExpenses")}</td></tr>`;
    } else {
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
                ? tenantGetTranslation("tenantExpensesPaid")
                : tenantGetTranslation("tenantExpensesUnpaid")
              : "-";
          const typeLabel = tenantGetExpenseTypeTranslation(e.type);
          return `
            <tr>
              <td>${typeLabel}</td>
              <td>${tenantFormatCurrency(tenantNormalizeCurrency(e.amount))}</td>
              <td>${tenantFormatDate(e.due_date)}</td>
              <td>${status}</td>
            </tr>
          `;
        })
        .join("");
    }
  }

  // Detailed payments
  if (paymentsBody) {
    if (!allPayments.length) {
      paymentsBody.innerHTML = `<tr><td colspan='4'>${tenantGetTranslation("tenantExpensesNoPayments")}</td></tr>`;
    } else {
      const sortedPayments = allPayments.sort((a, b) => {
        const aTime = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const bTime = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        return aTime - bTime;
      });
      paymentsBody.innerHTML = sortedPayments
        .map((p) => {
          const typeLabel = tenantGetExpenseTypeTranslation(p.type);
          return `
            <tr>
              <td>${typeLabel}</td>
              <td>${tenantFormatCurrency(tenantNormalizeCurrency(p.amount))}</td>
              <td>${tenantFormatDate(p.payment_date)}</td>
              <td>${p.method || "-"}</td>
            </tr>
          `;
        })
        .join("");
    }
  }
}

function tenantUpdateSummary(totalExpenses, totalPayments) {
  const totalExpensesEl = document.getElementById("tenantTotalExpenses");
  const totalPaymentsEl = document.getElementById("tenantTotalPayments");
  const balanceEl = document.getElementById("tenantBalance");

  const balance = totalExpenses - totalPayments;

  if (totalExpensesEl) {
    totalExpensesEl.textContent = tenantFormatCurrency(totalExpenses);
  }
  if (totalPaymentsEl) {
    totalPaymentsEl.textContent = tenantFormatCurrency(totalPayments);
  }
  if (balanceEl) {
    balanceEl.textContent = tenantFormatCurrency(balance);
    if (balance > 0.01) {
      balanceEl.style.color = "#dc2626";
    } else if (balance < -0.01) {
      balanceEl.style.color = "#166534";
    } else {
      balanceEl.style.color = "";
    }
  }
}

document.addEventListener("DOMContentLoaded", tenantExpensesInit);


