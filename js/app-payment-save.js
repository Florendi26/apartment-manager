// Saving payments, including utility and grouped payments. Loaded before app.js.

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
