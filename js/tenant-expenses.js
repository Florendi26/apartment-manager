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
  tenantSetupThemeToggle("tenantThemeToggleSwitch");
  
  // Setup mobile menu toggle
  if (typeof setupMobileMenuToggle === "function") {
    setupMobileMenuToggle();
  }
  
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

  // Setup collapsible cards
  setupCollapsibleCards();

  // Setup payment proof form
  tenantSetupPaymentProofForm();

  await tenantLoadExpensesAndPayments();
}

function tenantSetupPaymentProofForm() {
  const form = document.getElementById("tenantPaymentProofForm");
  const billSelect = document.getElementById("tenantPaymentBill");
  const amountInput = document.getElementById("tenantPaymentAmount");
  const dateInput = document.getElementById("tenantPaymentDate");
  const methodInput = document.getElementById("tenantPaymentMethod");
  const proofInput = document.getElementById("tenantPaymentProofImage");
  const proofPreview = document.getElementById("tenantPaymentProofPreview");

  if (!form || !billSelect) return;

  // Set default date to today
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  // Payment method buttons
  document.querySelectorAll(".tenant-payment-method-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tenant-payment-method-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const method = btn.dataset.method;
      if (method === "custom") {
        if (methodInput) {
          methodInput.classList.remove("hidden");
          methodInput.focus();
        }
      } else {
        if (methodInput) {
          methodInput.value = method;
          methodInput.classList.add("hidden");
        }
      }
    });
  });

  // Bill change - update amount
  billSelect.addEventListener("change", () => {
    const val = billSelect.value;
    if (!val) {
      if (amountInput) amountInput.value = "";
      return;
    }
    try {
      const [type, billId] = val.split("|");
      const expense = window._tenantUnpaidBills?.find((e) => String(e.id) === billId && e.type === type);
      if (expense && amountInput) {
        amountInput.value = tenantNormalizeCurrency(expense.amount).toFixed(2);
      }
    } catch (_) {}
  });

  // Proof image preview
  if (proofInput && proofPreview) {
    proofInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      proofPreview.classList.add("hidden");
      proofPreview.innerHTML = "";
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement("img");
        img.src = ev.target.result;
        img.alt = "Proof preview";
        img.style.maxWidth = "200px";
        img.style.maxHeight = "150px";
        img.style.borderRadius = "4px";
        proofPreview.innerHTML = "";
        proofPreview.appendChild(img);
        proofPreview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await tenantSubmitPaymentProof();
  });
}

function tenantPopulatePaymentBillSelect(expenses, payments) {
  const billSelect = document.getElementById("tenantPaymentBill");
  if (!billSelect) return;

  const unpaidBills = (expenses || []).filter((e) => {
    if (typeof e.is_paid === "boolean" && e.is_paid) return false;
    const paidForThis = (payments || []).filter(
      (p) => p.type === e.type && (String(p.bill_id) === String(e.id) || (p.contract_id === e.contract_id && !p.bill_id))
    );
    const totalPaid = paidForThis.reduce((s, p) => s + tenantNormalizeCurrency(p.amount), 0);
    const remaining = tenantNormalizeCurrency(e.amount) - totalPaid;
    return remaining > 0.01;
  });

  window._tenantUnpaidBills = unpaidBills;

  const firstOpt = billSelect.querySelector('option[value=""]');
  billSelect.innerHTML = "";
  if (firstOpt) billSelect.appendChild(firstOpt);

  unpaidBills.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = `${b.type}|${b.id}`;
    opt.textContent = `${tenantGetExpenseTypeTranslation(b.type)} - ${tenantFormatCurrency(tenantNormalizeCurrency(b.amount))} (${tenantFormatDate(b.due_date)})`;
    billSelect.appendChild(opt);
  });
}

async function tenantSubmitPaymentProof() {
  const billSelect = document.getElementById("tenantPaymentBill");
  const amountInput = document.getElementById("tenantPaymentAmount");
  const dateInput = document.getElementById("tenantPaymentDate");
  const methodInput = document.getElementById("tenantPaymentMethod");
  const proofInput = document.getElementById("tenantPaymentProofImage");

  const billValue = billSelect?.value;
  const amount = parseFloat(amountInput?.value) || 0;
  const paymentDate = dateInput?.value;
  let method = methodInput?.value?.trim();
  if (!method) {
    const activeBtn = document.querySelector(".tenant-payment-method-btn.active");
    method = activeBtn?.dataset.method === "custom" ? methodInput?.value?.trim() : activeBtn?.dataset.method;
  }

  if (!billValue || !paymentDate || !method) {
    tenantNotify("error", tenantGetTranslation("errorFieldRequired") || "Please fill all required fields.");
    return;
  }

  const file = proofInput?.files?.[0];
  if (!file || !file.type.startsWith("image/")) {
    tenantNotify("error", tenantGetTranslation("paymentProofRequired") || "Please upload a payment proof image.");
    return;
  }

  const [expenseType, billId] = billValue.split("|");
  const expense = window._tenantUnpaidBills?.find((e) => String(e.id) === billId && e.type === expenseType);
  if (!expense) {
    tenantNotify("error", tenantGetTranslation("errorLoad") || "Invalid bill selected.");
    return;
  }

  const user = (await tenantSupabase.auth.getUser())?.data?.user;
  if (!user) return;

  const tenantProfile = await tenantLoadProfileByEmail(user);
  if (!tenantProfile) {
    tenantNotify("error", tenantGetTranslation("tenantNoProfileLinked"));
    return;
  }

  const reader = new FileReader();
  const proofBase64 = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const submitBtn = document.getElementById("tenantPaymentProofSubmit");
  const originalText = submitBtn?.textContent;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = tenantGetTranslation("submitting") || "Submitting...";
  }

  const { data: inserted, error } = await tenantSupabase
    .from("payment_requests")
    .insert({
      tenant_id: tenantProfile.id,
      contract_id: expense.contract_id || null,
      bill_id: expense.id,
      expense_type: expenseType,
      amount: amount,
      payment_date: paymentDate,
      method: method,
      proof_image: proofBase64,
      status: "pending",
    })
    .select("id")
    .single();

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText || tenantGetTranslation("submitPaymentProof");
  }

  if (error) {
    tenantNotify("error", tenantGetTranslation("errorLoad") || "Failed to submit. Please try again.");
    console.error("tenantSubmitPaymentProof", error);
    return;
  }

  if (typeof sendNotification === "function" && inserted?.id) {
    sendNotification(tenantSupabase, { type: "payment-proof-submitted", id: inserted.id });
  }
  tenantNotify("success", tenantGetTranslation("paymentProofSubmitted") || "Payment proof submitted. The landlord will review it.");
  document.getElementById("tenantPaymentProofForm")?.reset();
  document.getElementById("tenantPaymentProofPreview")?.classList.add("hidden");
  document.getElementById("tenantPaymentProofPreview").innerHTML = "";
  document.querySelectorAll(".tenant-payment-method-btn").forEach((b) => b.classList.remove("active"));
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  await tenantLoadExpensesAndPayments();
}

async function tenantLoadPaymentRequests(tenantId) {
  const tbody = document.getElementById("tenantPaymentRequestsBody");
  if (!tbody || !tenantId) {
    if (tbody) {
      tbody.innerHTML = "";
    }
    return;
  }

  const { data: requests, error } = await tenantSupabase
    .from("payment_requests")
    .select("id, expense_type, amount, payment_date, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  if (error) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.setAttribute("colspan", "4");
    td.textContent = tenantGetTranslation("tenantExpensesFailedLoad") || "Failed to load.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  if (!requests || requests.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.setAttribute("colspan", "4");
    td.textContent = tenantGetTranslation("tenantPaymentProofNone") || "No payment proofs submitted yet.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const statusLabels = {
    pending: tenantGetTranslation("paymentProofStatusPending") || "Pending",
    accepted: tenantGetTranslation("paymentProofStatusAccepted") || "Accepted",
    declined: tenantGetTranslation("paymentProofStatusDeclined") || "Declined",
  };

  requests.forEach((req) => {
    const tr = document.createElement("tr");
    const typeCell = document.createElement("td");
    typeCell.textContent = tenantGetExpenseTypeTranslation(req.expense_type);
    tr.appendChild(typeCell);
    const amountCell = document.createElement("td");
    amountCell.textContent = tenantFormatCurrency(tenantNormalizeCurrency(req.amount));
    tr.appendChild(amountCell);
    const dateCell = document.createElement("td");
    dateCell.textContent = tenantFormatDate(req.payment_date);
    tr.appendChild(dateCell);
    const statusCell = document.createElement("td");
    const statusSpan = document.createElement("span");
    statusSpan.className =
      req.status === "accepted"
        ? "badge bg-success"
        : req.status === "declined"
        ? "badge bg-danger"
        : "badge bg-warning";
    statusSpan.textContent = statusLabels[req.status] || req.status;
    statusCell.appendChild(statusSpan);
    tr.appendChild(statusCell);
    tbody.appendChild(tr);
  });
}

function setupCollapsibleCards() {
  const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
  collapsibleHeaders.forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on buttons or interactive elements
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) {
        return;
      }
      
      const card = header.closest('.collapsible-card');
      if (!card) return;
      
      const content = card.querySelector('.collapsible-content');
      if (!content) return;
      
      const isCollapsed = content.classList.contains('collapsed');
      
      if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
      } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
      }
    });
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
      // Clear container using DOM methods
      while (expensesBody.firstChild) {
        expensesBody.removeChild(expensesBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = noProfileMsg;
      tr.appendChild(td);
      expensesBody.appendChild(tr);
    }
    if (paymentsBody) {
      // Clear container using DOM methods
      while (paymentsBody.firstChild) {
        paymentsBody.removeChild(paymentsBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = noProfileMsg;
      tr.appendChild(td);
      paymentsBody.appendChild(tr);
    }
    if (typeSummaryBody) {
      // Clear container using DOM methods
      while (typeSummaryBody.firstChild) {
        typeSummaryBody.removeChild(typeSummaryBody.firstChild);
      }
    }
    renderTenantSummaryCards(null, null, null, null, 0, 0);
    tenantLoadPaymentRequests(null);
    return;

  }

  const { data: contracts, error: contractsError } = await tenantSupabase
    .from("contracts")
    .select("id, is_active, apartment_id, start_date, end_date, monthly_rent")
    .eq("tenant_id", tenantProfile.id);

  if (contractsError) {
    console.error("tenant expenses contracts", contractsError);
    const failedMsg = tenantGetTranslation("tenantExpensesFailedLoad");
    if (expensesBody) {
      // Clear container using DOM methods
      while (expensesBody.firstChild) {
        expensesBody.removeChild(expensesBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = failedMsg;
      tr.appendChild(td);
      expensesBody.appendChild(tr);
    }
    if (paymentsBody) {
      // Clear container using DOM methods
      while (paymentsBody.firstChild) {
        paymentsBody.removeChild(paymentsBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = failedMsg;
      tr.appendChild(td);
      paymentsBody.appendChild(tr);
    }
    return;
  }

  if (!contracts || contracts.length === 0) {
    const noContractsMsg = tenantGetTranslation("tenantNoContractsYet");
    if (expensesBody) {
      // Clear container using DOM methods
      while (expensesBody.firstChild) {
        expensesBody.removeChild(expensesBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = noContractsMsg;
      tr.appendChild(td);
      expensesBody.appendChild(tr);
    }
    if (paymentsBody) {
      // Clear container using DOM methods
      while (paymentsBody.firstChild) {
        paymentsBody.removeChild(paymentsBody.firstChild);
      }
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = noContractsMsg;
      tr.appendChild(td);
      paymentsBody.appendChild(tr);
    }
    if (typeSummaryBody) {
      // Clear container using DOM methods
      while (typeSummaryBody.firstChild) {
        typeSummaryBody.removeChild(typeSummaryBody.firstChild);
      }
    }
    tenantUpdateSummary(0, 0);
    tenantPopulatePaymentBillSelect([], []);
    tenantLoadPaymentRequests(tenantProfile?.id);
    await renderTenantSummaryCards(user, tenantProfile, contracts, 0, 0);
    return;
  }

  // Store contracts for summary cards
  const contractIds = contracts.map((c) => c.id);
  const allExpenses = [];
  const allPayments = [];

  // Execute all queries in parallel for better performance
  const queryPromises = Object.entries(TENANT_EXPENSE_TABLES).map(async ([type, tableInfo]) => {
    // Match landlord/admin loader: utilities use bill_date instead of due_date
    const billSelect = tableInfo.hasStatus
      ? "id, amount, bill_date, due_date, is_paid, contract_id, reference"
      : "id, amount, bill_date, contract_id, reference";

    const billsPromise = tenantSupabase
      .from(tableInfo.bills)
      .select(billSelect)
      .in("contract_id", contractIds);

    const paymentsPromise = tenantSupabase
      .from(tableInfo.payments)
      .select("id, amount, payment_date, method, contract_id, bill_id")
      .in("contract_id", contractIds);

    // Execute both queries for this type in parallel
    const [billsResult, paymentsResult] = await Promise.all([billsPromise, paymentsPromise]);

    return {
      type,
      bills: billsResult.data || [],
      payments: paymentsResult.data || []
    };
  });

  // Wait for all queries to complete
  const results = await Promise.all(queryPromises);

  // Process results
  results.forEach(({ type, bills, payments }) => {
    if (bills && bills.length > 0) {
      bills.forEach((b) => {
        // Normalise to a common due_date field for sorting/display
        const dueDate = b.due_date || b.bill_date || null;
        allExpenses.push({ ...b, type, due_date: dueDate });
      });
    }

    if (payments && payments.length > 0) {
      payments.forEach((p) => {
        allPayments.push({ ...p, type });
      });
    }
  });

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

  // Populate payment proof bill select with unpaid bills
  tenantPopulatePaymentBillSelect(allExpenses, allPayments);

  // Load and render payment proof submissions (pending, accepted, declined)
  await tenantLoadPaymentRequests(tenantProfile?.id);

  // Render summary cards with all data
  await renderTenantSummaryCards(user, tenantProfile, contracts, totalExpenses, totalPayments);

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
    // Clear container using DOM methods
    while (typeSummaryBody.firstChild) {
      typeSummaryBody.removeChild(typeSummaryBody.firstChild);
    }
    
    const types = Array.from(
      new Set([...Object.keys(expensesByType), ...Object.keys(paymentsByType)])
    );
    if (!types.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = tenantGetTranslation("tenantExpensesNoData");
      tr.appendChild(td);
      typeSummaryBody.appendChild(tr);
    } else {
      types.forEach((type) => {
        const exp = expensesByType[type] || 0;
        const pay = paymentsByType[type] || 0;
        const bal = exp - pay;
        const typeLabel = tenantGetExpenseTypeTranslation(type);
        
        const tr = document.createElement('tr');
        
        const typeCell = document.createElement('td');
        typeCell.textContent = typeLabel;
        tr.appendChild(typeCell);
        
        const expCell = document.createElement('td');
        expCell.textContent = tenantFormatCurrency(exp);
        tr.appendChild(expCell);
        
        const payCell = document.createElement('td');
        payCell.textContent = tenantFormatCurrency(pay);
        tr.appendChild(payCell);
        
        const balCell = document.createElement('td');
        balCell.textContent = tenantFormatCurrency(bal);
        tr.appendChild(balCell);
        
        typeSummaryBody.appendChild(tr);
      });
    }
  }

  // Detailed expenses
  if (expensesBody) {
    // Clear container using DOM methods
    while (expensesBody.firstChild) {
      expensesBody.removeChild(expensesBody.firstChild);
    }
    
    if (!allExpenses.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = tenantGetTranslation("tenantExpensesNoExpenses");
      tr.appendChild(td);
      expensesBody.appendChild(tr);
    } else {
      const sortedExpenses = allExpenses.sort((a, b) => {
        const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
        return bTime - aTime; // Newest to oldest (descending)
      });
      
      sortedExpenses.forEach((e) => {
        const status =
          typeof e.is_paid === "boolean"
            ? e.is_paid
              ? tenantGetTranslation("tenantExpensesPaid")
              : tenantGetTranslation("tenantExpensesUnpaid")
            : "-";
        const typeLabel = tenantGetExpenseTypeTranslation(e.type);
        
        const tr = document.createElement('tr');
        
        const typeCell = document.createElement('td');
        typeCell.textContent = typeLabel;
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

  // Detailed payments
  if (paymentsBody) {
    // Clear container using DOM methods
    while (paymentsBody.firstChild) {
      paymentsBody.removeChild(paymentsBody.firstChild);
    }
    
    if (!allPayments.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = tenantGetTranslation("tenantExpensesNoPayments");
      tr.appendChild(td);
      paymentsBody.appendChild(tr);
    } else {
      const sortedPayments = allPayments.sort((a, b) => {
        const aTime = a.payment_date ? new Date(a.payment_date).getTime() : 0;
        const bTime = b.payment_date ? new Date(b.payment_date).getTime() : 0;
        return bTime - aTime; // Newest to oldest (descending)
      });
      
      sortedPayments.forEach((p) => {
        const typeLabel = tenantGetExpenseTypeTranslation(p.type);
        
        const tr = document.createElement('tr');
        
        const typeCell = document.createElement('td');
        typeCell.textContent = typeLabel;
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

async function renderTenantSummaryCards(user, tenantProfile, contracts = null, totalExpenses = 0, totalPayments = 0) {
  const tenantInfoList = document.getElementById("tenantInfoList");
  const tenantContractList = document.getElementById("tenantContractList");
  const tenantFinancialList = document.getElementById("tenantFinancialList");

  // Render Tenant Info
  if (tenantInfoList) {
    // Clear container using DOM methods
    while (tenantInfoList.firstChild) {
      tenantInfoList.removeChild(tenantInfoList.firstChild);
    }
    
    if (!tenantProfile) {
      const dd = document.createElement('dd');
      dd.textContent = tenantGetTranslation("tenantNoProfileLinked");
      tenantInfoList.appendChild(dd);
    } else {
      const entryDate = tenantProfile.entry_date || "-";
      
      function addDefinitionItem(dtText, ddText) {
        const dt = document.createElement('dt');
        dt.textContent = dtText;
        tenantInfoList.appendChild(dt);
        const dd = document.createElement('dd');
        dd.textContent = ddText;
        tenantInfoList.appendChild(dd);
      }
      
      addDefinitionItem(`${tenantGetTranslation("tenantFullName") || "Full Name"}:`, tenantProfile.full_name || "-");
      addDefinitionItem(`${tenantGetTranslation("tenantEmail") || "Email"}:`, tenantProfile.email || user?.email || "-");
      addDefinitionItem(`${tenantGetTranslation("tenantPhone") || "Phone"}:`, tenantProfile.phone || "-");
      addDefinitionItem(`${tenantGetTranslation("tenantSince") || "Entry Date"}:`, tenantFormatDate(entryDate));
    }
  }

  // Render Contract Info
  if (tenantContractList) {
    // Clear container using DOM methods
    while (tenantContractList.firstChild) {
      tenantContractList.removeChild(tenantContractList.firstChild);
    }
    
    if (!contracts || contracts.length === 0) {
      const dd = document.createElement('dd');
      dd.textContent = tenantGetTranslation("tenantNoContractsYet") || "No contracts yet";
      tenantContractList.appendChild(dd);
    } else {
      const activeContract = contracts.find((c) => c.is_active) || contracts[0];
      
      // Load apartment info (only if needed)
      let apartmentName = "-";
      if (activeContract && activeContract.apartment_id) {
        try {
          const { data: apartments } = await tenantSupabase
            .from("apartments")
            .select("id, name, address")
            .eq("id", activeContract.apartment_id)
            .limit(1)
            .single();
          
          if (apartments) {
            apartmentName = apartments.name || "-";
            if (apartments.address) {
              apartmentName += ` (${apartments.address})`;
            }
          }
        } catch (error) {
          // If single() fails, try without it
          const { data: apartments } = await tenantSupabase
            .from("apartments")
            .select("id, name, address")
            .eq("id", activeContract.apartment_id)
            .limit(1);
          
          if (apartments && apartments[0]) {
            apartmentName = apartments[0].name || "-";
            if (apartments[0].address) {
              apartmentName += ` (${apartments[0].address})`;
            }
          }
        }
      }

      if (activeContract) {
        function addDefinitionItem(dtText, ddText) {
          const dt = document.createElement('dt');
          dt.textContent = dtText;
          tenantContractList.appendChild(dt);
          const dd = document.createElement('dd');
          dd.textContent = ddText;
          tenantContractList.appendChild(dd);
        }
        
        addDefinitionItem(`${tenantGetTranslation("selectApartment") || "Apartment"}:`, apartmentName);
        addDefinitionItem(`${tenantGetTranslation("startDate") || "Start Date"}:`, tenantFormatDate(activeContract.start_date));
        addDefinitionItem(`${tenantGetTranslation("endDate") || "End Date"}:`, tenantFormatDate(activeContract.end_date));
        addDefinitionItem(`${tenantGetTranslation("monthlyRent") || "Monthly Rent"}:`, tenantFormatCurrency(activeContract.monthly_rent || 0));
        addDefinitionItem(`${tenantGetTranslation("contractActive") || "Active"}:`, activeContract.is_active ? (tenantGetTranslation("yes") || "Yes") : (tenantGetTranslation("no") || "No"));
      } else {
        const dd = document.createElement('dd');
        dd.textContent = tenantGetTranslation("tenantNoContractsYet") || "No contracts yet";
        tenantContractList.appendChild(dd);
      }
    }
  }

  // Render Financial Summary
  if (tenantFinancialList) {
    // Clear container using DOM methods
    while (tenantFinancialList.firstChild) {
      tenantFinancialList.removeChild(tenantFinancialList.firstChild);
    }
    
    const balance = totalExpenses - totalPayments;
    const totalUnpaid = Math.max(0, balance);
    const activeStatus = contracts && contracts.some((c) => c.is_active);
    
    function addDefinitionItem(dtText, ddText) {
      const dt = document.createElement('dt');
      dt.textContent = dtText;
      tenantFinancialList.appendChild(dt);
      const dd = document.createElement('dd');
      dd.textContent = ddText;
      tenantFinancialList.appendChild(dd);
    }
    
    addDefinitionItem(`${tenantGetTranslation("tenantExpensesTotalExpenses") || "Total Expenses"}:`, tenantFormatCurrency(totalExpenses));
    addDefinitionItem(`${tenantGetTranslation("tenantExpensesTotalPayments") || "Total Payments"}:`, tenantFormatCurrency(totalPayments));
    addDefinitionItem(`${tenantGetTranslation("tenantExpensesBalance") || "Total Unpaid Expenses"}:`, tenantFormatCurrency(totalUnpaid));
    addDefinitionItem(`${tenantGetTranslation("contractActive") || "Active"}:`, activeStatus ? (tenantGetTranslation("yes") || "Yes") : (tenantGetTranslation("no") || "No"));
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

// PDF Export functionality for tenant expenses - uses same module as landlord
async function exportTenantExpensesToPdf(language = "en", format = "normal") {
  if (typeof window._exportTenantToPdfInternal !== "function") {
    tenantNotify("error", tenantGetTranslation("errorAutoTableLoading") || "PDF export module not loaded. Please refresh the page.");
    return;
  }

  const user = (await tenantSupabase.auth.getUser())?.data?.user;
  if (!user) return;

  const tenantProfile = await tenantLoadProfileByEmail(user);
  if (!tenantProfile) {
    tenantNotify("error", tenantGetTranslation("tenantNoProfileLinked"));
    return;
  }

  // Load contracts
  const { data: contracts } = await tenantSupabase
    .from("contracts")
    .select("id, is_active, apartment_id, start_date, end_date, monthly_rent")
    .eq("tenant_id", tenantProfile.id);

  if (!contracts || contracts.length === 0) {
    tenantNotify("error", tenantGetTranslation("tenantNoContractsYet"));
    return;
  }

  const contractIds = contracts.map((c) => c.id);
  const allExpenses = [];
  const allPayments = [];

  // Load all expenses and payments
  for (const [type, tableInfo] of Object.entries(TENANT_EXPENSE_TABLES)) {
    const billSelect = tableInfo.hasStatus
      ? "id, amount, bill_date, due_date, is_paid, contract_id, reference"
      : "id, amount, bill_date, contract_id, reference";

    const { data: bills } = await tenantSupabase
      .from(tableInfo.bills)
      .select(billSelect)
      .in("contract_id", contractIds);

    if (bills) {
      bills.forEach((b) => {
        const dueDate = b.due_date || b.bill_date || null;
        // Convert to landlord format: add tenant_id and use actual reference from database
        allExpenses.push({ 
          ...b, 
          type, 
          due_date: dueDate,
          tenant_id: tenantProfile.id,
          reference: b.reference || null // Use actual reference field from database
        });
      });
    }

    const { data: payments } = await tenantSupabase
      .from(tableInfo.payments)
      .select("id, amount, payment_date, method, contract_id")
      .in("contract_id", contractIds);

    if (payments) {
      payments.forEach((p) => {
        // Find related debt for debt_id
        const relatedExpense = allExpenses.find(e => e.contract_id === p.contract_id && e.type === p.type);
        allPayments.push({ 
          ...p, 
          type,
          tenant_id: tenantProfile.id,
          debt_id: relatedExpense?.id || null
        });
      });
    }
  }

  // Create adapter state object matching landlord structure
  const adapterState = {
    selectedTenantId: tenantProfile.id,
    tenants: [tenantProfile],
    debts: allExpenses,
    payments: allPayments,
    apartments: [],
    contracts: contracts,
    language: language === "sq" ? "sq" : "en",
    _previousLanguage: null
  };

  // Helper functions that match landlord functions
  function translate(key) {
    return tenantGetTranslation(key) || key;
  }

  function formatCurrency(value) {
    return tenantFormatCurrency(value);
  }

  function formatDate(value) {
    return tenantFormatDate(value);
  }

  function equalsId(a, b) {
    return String(a) === String(b);
  }

  function isUtilityType(type) {
    return ["electricity", "water", "thermos"].includes(type);
  }

  function normalizeCurrency(value) {
    return tenantNormalizeCurrency(value);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatReferenceNumber(ref) {
    if (!ref) return "-";
    if (typeof ref === "string" && ref.startsWith("REF-")) return ref;
    return `REF-${String(ref).padStart(6, '0')}`;
  }

  function getPrimaryContractForTenant(tenantId) {
    if (!equalsId(tenantId, tenantProfile.id)) return null;
    return contracts.find((c) => c.is_active) || contracts[0] || null;
  }

  function setTemporaryLanguage(lang) {
    adapterState._previousLanguage = adapterState.language;
    adapterState.language = lang === "sq" ? "sq" : "en";
    // Update translations in the page
    const originalLang = window.localStorage?.getItem("language") || "en";
    if (window.localStorage) {
      window.localStorage.setItem("language", lang);
      if (typeof window.translatePage === "function") {
        window.translatePage();
      }
    }
  }

  function restoreLanguageAfterPdf() {
    if (adapterState._previousLanguage) {
      adapterState.language = adapterState._previousLanguage;
      adapterState._previousLanguage = null;
      // Restore original language
      const originalLang = window.localStorage?.getItem("language") || "en";
      if (window.localStorage) {
        window.localStorage.setItem("language", originalLang);
        if (typeof window.translatePage === "function") {
          window.translatePage();
        }
      }
    }
  }

  function incrementPdfGeneratedCount() {
    // No-op for tenant, but required by PDF export
  }

  function notify(type, message) {
    tenantNotify(type, message);
  }

  // Use the same PDF export function as landlord
  window._exportTenantToPdfInternal({
    state: adapterState,
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
}

document.addEventListener("DOMContentLoaded", tenantExpensesInit);

// Setup PDF export buttons after DOM loads
document.addEventListener("DOMContentLoaded", () => {
  const exportEnBtn = document.getElementById("exportTenantExpensesPdf");
  const exportSqBtn = document.getElementById("exportTenantExpensesPdfSq");

  if (exportEnBtn) {
    exportEnBtn.addEventListener("click", () => {
      const format = document.querySelector('input[name="tenantPdfFormat"]:checked')?.value || "normal";
      exportTenantExpensesToPdf("en", format);
    });
  }

  if (exportSqBtn) {
    exportSqBtn.addEventListener("click", () => {
      const format = document.querySelector('input[name="tenantPdfFormat"]:checked')?.value || "normal";
      exportTenantExpensesToPdf("sq", format);
    });
  }
});


