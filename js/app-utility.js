// Utility expense summary and inline edits. Loaded before app.js. Shares the same globals.

const isUtilityType = (t) => UTILITY_TYPES.includes(t);

function renderUtilitySummary() {
  const activeType = getActiveExpenseType();
  const isUtility = activeType && isUtilityType(activeType);
  
  if (!elements.utilitySummarySection) return;
  
  // Show/hide utility summary based on type
  if (!isUtility) {
    elements.utilitySummarySection.classList.add("hidden");
    elements.utilitySummarySection.style.display = "none";
    return;
  }
  
  elements.utilitySummarySection.classList.remove("hidden");
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

  // Update remaining debt under each utility table
  const updateRemainingDebt = (el, val) => {
    if (!el) return;
    if (Math.abs(val) < 0.01) {
      el.textContent = formatCurrency(0);
      el.className = "utility-remaining-debt-value zero";
    } else if (val > 0) {
      el.textContent = formatCurrency(val);
      el.className = "utility-remaining-debt-value positive";
    } else {
      el.textContent = `-${formatCurrency(Math.abs(val))}`;
      el.className = "utility-remaining-debt-value negative";
    }
  };
  updateRemainingDebt(elements.utilityExpensesRemainingDebt, difference);
  updateRemainingDebt(elements.utilityPaymentsRemainingDebt, difference);
  
  // Render expenses table with columns: #, Tenant, Type, Amount, Due Date, Reference, Actions
  if (elements.utilityExpensesTableBody) {
    const typeLabel = translate(`debt${capitalize(activeType)}`) || activeType;
    
    // Clear container using DOM methods
    clear(elements.utilityExpensesTableBody);
    
    if (utilityExpenses.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '8');
      td.style.cssText = 'text-align:center;color:#6b7280;';
      td.textContent = translate("noData") || "No data";
      tr.appendChild(td);
      elements.utilityExpensesTableBody.appendChild(tr);
    } else {
      utilityExpenses.forEach((expense, index) => {
        const tenant = state.tenants.find((t) => equalsId(t.id, expense.tenant_id));
        const tenantName = tenant?.full_name || translate("unknown") || "Unknown";
        const billDate = expense.bill_date || expense.due_date || "";
        const reference = formatReferenceForDisplay(expense.reference) || "-";
        const isFromUtilityTable = !!expense.bill_date;
        const dataSource = isFromUtilityTable ? "utility_bills" : "debts";
        const isEditing = state.editingUtilityBillId && equalsId(state.editingUtilityBillId, expense.id);
        
        const tr = document.createElement('tr');
        
        if (isEditing) {
          tr.className = 'editing-row';
          
          // Index cell
          const indexCell = document.createElement('td');
          indexCell.textContent = index + 1;
          tr.appendChild(indexCell);
          
          // Tenant cell
          const tenantCell = document.createElement('td');
          tenantCell.textContent = sanitize(tenantName);
          tr.appendChild(tenantCell);
          
          // Type cell
          const typeCell = document.createElement('td');
          typeCell.textContent = sanitize(typeLabel);
          tr.appendChild(typeCell);
          
          // Amount cell with input
          const amountCell = document.createElement('td');
          const amountInput = document.createElement('input');
          amountInput.type = 'number';
          amountInput.className = 'inline-edit-input form-control';
          amountInput.setAttribute('data-field', 'amount');
          amountInput.value = normalizeCurrency(expense.amount).toFixed(2);
          amountInput.min = '0';
          amountInput.step = '0.01';
          amountInput.required = true;
          amountCell.appendChild(amountInput);
          tr.appendChild(amountCell);
          
          // Date cell with input
          const dateCell = document.createElement('td');
          const dateInput = document.createElement('input');
          dateInput.type = 'date';
          dateInput.className = 'inline-edit-input form-control';
          dateInput.setAttribute('data-field', 'bill_date');
          dateInput.value = expense.bill_date || expense.due_date || "";
          dateInput.required = true;
          dateCell.appendChild(dateInput);
          tr.appendChild(dateCell);
          
          // Period cell
          const periodCell = document.createElement('td');
          periodCell.textContent = formatPeriod(expense.bill_date || expense.due_date);
          tr.appendChild(periodCell);
          
          // Reference cell
          const refCell = document.createElement('td');
          refCell.textContent = sanitize(reference);
          tr.appendChild(refCell);
          
          // Actions cell
          const actionsCell = document.createElement('td');
          const actionsGroup = document.createElement('div');
          actionsGroup.className = 'btn-group';
          
          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm';
          saveBtn.setAttribute('data-action', 'save-utility-bill');
          saveBtn.setAttribute('data-id', expense.id);
          saveBtn.setAttribute('data-source', dataSource);
          saveBtn.textContent = translate("save") || "Save";
          saveBtn.addEventListener("click", () => saveUtilityBill(expense.id, dataSource));
          actionsGroup.appendChild(saveBtn);
          
          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn btn-outline-secondary btn-sm';
          cancelBtn.setAttribute('data-action', 'cancel-edit-utility-bill');
          cancelBtn.textContent = translate("cancelEdit") || "Cancel";
          cancelBtn.addEventListener("click", () => {
            state.editingUtilityBillId = null;
            renderUtilitySummary();
          });
          actionsGroup.appendChild(cancelBtn);
          
          actionsCell.appendChild(actionsGroup);
          tr.appendChild(actionsCell);
        } else {
          // Index cell
          const indexCell = document.createElement('td');
          indexCell.textContent = index + 1;
          tr.appendChild(indexCell);
          
          // Tenant cell
          const tenantCell = document.createElement('td');
          tenantCell.textContent = sanitize(tenantName);
          tr.appendChild(tenantCell);
          
          // Type cell
          const typeCell = document.createElement('td');
          typeCell.textContent = sanitize(typeLabel);
          tr.appendChild(typeCell);
          
          // Amount cell
          const amountCell = document.createElement('td');
          amountCell.textContent = formatCurrency(expense.amount);
          tr.appendChild(amountCell);
          
          // Date cell
          const dateCell = document.createElement('td');
          dateCell.textContent = formatDate(billDate);
          tr.appendChild(dateCell);
          
          // Period cell
          const periodCell = document.createElement('td');
          periodCell.textContent = formatPeriod(billDate);
          tr.appendChild(periodCell);
          
          // Reference cell
          const refCell = document.createElement('td');
          refCell.textContent = sanitize(reference);
          tr.appendChild(refCell);
          
          // Actions cell
          const actionsCell = document.createElement('td');
          const actionsGroup = document.createElement('div');
          actionsGroup.className = 'btn-group';
          
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'btn btn-outline-secondary btn-sm';
          editBtn.setAttribute('data-action', 'edit-utility-bill');
          editBtn.setAttribute('data-id', expense.id);
          editBtn.setAttribute('data-source', dataSource);
          editBtn.textContent = translate("edit");
          editBtn.addEventListener("click", () => editUtilityBill(expense.id, dataSource));
          actionsGroup.appendChild(editBtn);
          
          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'btn btn-outline-danger btn-sm';
          deleteBtn.setAttribute('data-action', 'delete-utility-bill');
          deleteBtn.setAttribute('data-id', expense.id);
          deleteBtn.setAttribute('data-source', dataSource);
          deleteBtn.textContent = translate("delete");
          deleteBtn.addEventListener("click", () => deleteUtilityBill(expense.id, dataSource));
          actionsGroup.appendChild(deleteBtn);
          
          actionsCell.appendChild(actionsGroup);
          tr.appendChild(actionsCell);
        }
        
        elements.utilityExpensesTableBody.appendChild(tr);
      });
    }
  }
  
  // Render payments table with columns: #, Tenant, Type, Amount, Date, Actions (no reference)
  if (elements.utilityPaymentsTableBody) {
    const typeLabel = translate(`debt${capitalize(activeType)}`) || activeType;
    
    // Clear container using DOM methods
    clear(elements.utilityPaymentsTableBody);
    
    if (utilityPayments.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '6');
      td.style.cssText = 'text-align:center;color:#6b7280;';
      td.textContent = translate("noData") || "No data";
      tr.appendChild(td);
      elements.utilityPaymentsTableBody.appendChild(tr);
    } else {
      utilityPayments.forEach((payment, index) => {
        const tenant = state.tenants.find((t) => equalsId(t.id, payment.tenant_id));
        const tenantName = tenant?.full_name || translate("unknown") || "Unknown";
        const isFromUtilityTable = !!payment.type;
        const dataSource = isFromUtilityTable ? "utility_payments" : "payments";
        
        const tr = document.createElement('tr');
        
        // Index cell
        const indexCell = document.createElement('td');
        indexCell.textContent = index + 1;
        tr.appendChild(indexCell);
        
        // Tenant cell
        const tenantCell = document.createElement('td');
        tenantCell.textContent = sanitize(tenantName);
        tr.appendChild(tenantCell);
        
        // Type cell
        const typeCell = document.createElement('td');
        typeCell.textContent = sanitize(typeLabel);
        tr.appendChild(typeCell);
        
        // Amount cell
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(payment.amount);
        tr.appendChild(amountCell);
        
        // Date cell
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(payment.payment_date);
        tr.appendChild(dateCell);
        
        // Actions cell
        const actionsCell = document.createElement('td');
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'btn-group';
        
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-outline-secondary btn-sm';
        editBtn.setAttribute('data-action', 'edit-utility-payment');
        editBtn.setAttribute('data-id', payment.id);
        editBtn.setAttribute('data-source', dataSource);
        editBtn.textContent = translate("edit");
        editBtn.addEventListener("click", () => editUtilityPayment(payment.id, dataSource));
        actionsGroup.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-outline-danger btn-sm';
        deleteBtn.setAttribute('data-action', 'delete-utility-payment');
        deleteBtn.setAttribute('data-id', payment.id);
        deleteBtn.setAttribute('data-source', dataSource);
        deleteBtn.textContent = translate("delete");
        deleteBtn.addEventListener("click", () => deleteUtilityPayment(payment.id, dataSource));
        actionsGroup.appendChild(deleteBtn);
        
        actionsCell.appendChild(actionsGroup);
        tr.appendChild(actionsCell);
        
        elements.utilityPaymentsTableBody.appendChild(tr);
      });
    }
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
