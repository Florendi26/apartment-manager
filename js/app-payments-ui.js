// Payment debt picker and amount summary. Loaded before app.js. Shares the same globals.

function populateDebtSelects() {
  if (!elements.paymentDebt) return;
  const currentValue = elements.paymentDebt.value;
  const typeFilterValue = elements.debtsFilterType
    ? elements.debtsFilterType.value
    : "all";
  const debts = getFilteredDebts();
  const payments = getFilteredPayments();
  const unpaidDebts = debts.filter((debt) => !debt.is_paid);

  // Clear select using DOM methods
  while (elements.paymentDebt.firstChild) {
    elements.paymentDebt.removeChild(elements.paymentDebt.firstChild);
  }
  
  // Add placeholder option
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = translate("selectDebt");
  elements.paymentDebt.appendChild(placeholderOption);

  // Add direct payment option for utility types (allows payment without expense)
  if (typeFilterValue && isUtilityType(typeFilterValue)) {
    const typeLabel = translate(`debt${capitalize(typeFilterValue)}`) || sanitize(typeFilterValue);
    const directOption = document.createElement('option');
    directOption.value = `direct:${typeFilterValue}`;
    directOption.setAttribute('data-type', typeFilterValue);
    directOption.setAttribute('data-direct', 'true');
    directOption.textContent = `${typeLabel} — ${translate("directPayment") || "Direct Payment"}`;
    elements.paymentDebt.appendChild(directOption);
  }

  // For utilities, group by tenant and show difference (expenses - payments)
  UTILITY_PAYMENT_TYPES.forEach((type) => {
    if (
      typeFilterValue &&
      typeFilterValue !== "all" &&
      typeFilterValue !== type
    ) {
      return;
    }
    // Get all debts of this type (not just unpaid)
    const allDebtsOfType = debts.filter((debt) => debt.type === type);
    if (!allDebtsOfType.length) return;
    
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
    for (const payment of payments) {
      if (payment.type !== type) continue;
      const tenantId = payment.tenant_id;
      if (byTenant[tenantId]) {
        byTenant[tenantId].totalPayments += normalizeCurrency(payment.amount);
      }
    }
    
    const typeLabel = translate(`debt${capitalize(type)}`) || sanitize(type);
    
    Object.entries(byTenant)
      .filter(([_, data]) => {
        // Only show if there's a positive difference (owes money)
        const difference = data.totalExpenses - data.totalPayments;
        return difference > 0.01;
      })
      .forEach(([tenantId, data]) => {
        const tenant = state.tenants.find((t) => equalsId(t.id, tenantId));
        const tenantName = tenant?.full_name || translate("unknown");
        const debtIds = data.debts.map(d => d.id).join(",");
        const difference = data.totalExpenses - data.totalPayments;
        const utilityOption = document.createElement('option');
        utilityOption.value = `utility:${type}:${tenantId}`;
        utilityOption.setAttribute('data-type', type);
        utilityOption.setAttribute('data-total', difference.toFixed(2));
        utilityOption.setAttribute('data-tenant', tenantId);
        utilityOption.setAttribute('data-debt-ids', debtIds);
        utilityOption.textContent = `${sanitize(tenantName)} - ${typeLabel} - ${translate("difference") || "Difference"}: ${formatCurrency(difference)}`;
        elements.paymentDebt.appendChild(utilityOption);
      });
  });

  // Filter out utility types from individual debt list (they are shown grouped by tenant)
  const filteredDebts = unpaidDebts.filter((debt) => {
    // Exclude utility types - they are shown grouped
    if (isUtilityType(debt.type)) return false;
    if (!typeFilterValue || typeFilterValue === "all") return true;
    return debt.type === typeFilterValue;
  });

  // Add individual debt options
  filteredDebts.forEach((debt) => {
    const amount = normalizeCurrency(debt.amount);
    const dueDate = debt.due_date || "";
    const debtOption = document.createElement('option');
    debtOption.value = debt.id;
    debtOption.setAttribute('data-type', debt.type);
    debtOption.setAttribute('data-amount', amount.toFixed(2));
    debtOption.setAttribute('data-due', dueDate);
    debtOption.textContent = formatDebtOption(debt);
    elements.paymentDebt.appendChild(debtOption);
  });

  let appliedPreviousSelection = false;
  if (currentValue) {
    const hasPreviousSelection = Array.from(elements.paymentDebt.options).some(
      (option) => option.value === currentValue
    );
    if (hasPreviousSelection) {
      elements.paymentDebt.value = currentValue;
      appliedPreviousSelection = true;
    } else {
      const debt = debts.find((d) => equalsId(d.id, currentValue));
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
