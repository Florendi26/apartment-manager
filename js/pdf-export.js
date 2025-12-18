/**
 * PDF Export Module
 * Handles tenant PDF generation with pagination and consistent formatting
 */

// Maximum rows per page for tables (to prevent too many rows)
// Increased to fill the page better
const MAX_ROWS_PER_PAGE = 35;

/**
 * Export tenant data to PDF with pagination support
 * @param {Object} dependencies - Required functions and state from app.js
 * @param {string} language - Language code (default: "en")
 * @param {string} format - Format type (default: "normal")
 */
window._exportTenantToPdfInternal = function(dependencies, language = "en", format = "normal") {
  const {
    state,
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
  } = dependencies;

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
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(`${tenant.full_name}`, 14, 14);

  // Reset text color for body
  doc.setTextColor(31, 41, 55);

  const debts = state.debts.filter((debt) =>
    equalsId(debt.tenant_id, tenant.id)
  );
  
  // Separate regular debts from utility debts
  const regularDebts = debts.filter(d => !isUtilityType(d.type));
  const utilityDebts = debts.filter(d => isUtilityType(d.type));
  
  const unpaidRegularDebts = regularDebts.filter((debt) => !debt.is_paid);
  const payments = state.payments.filter((payment) =>
    equalsId(payment.tenant_id, tenant.id)
  );
  const debtsById = new Map(debts.map((debt) => [String(debt.id), debt]));

  // Calculate totals - for utilities, use expenses minus payments
  const regularExpenses = regularDebts.reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0), 0
  );
  const utilityExpenses = utilityDebts.reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0), 0
  );
  const regularPayments = payments.filter(p => {
    const debt = debtsById.get(String(p.debt_id));
    return debt && !isUtilityType(debt.type);
  }).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const utilityPaymentsTotal = payments.filter(p => {
    if (isUtilityType(p.type)) return true;
    const debt = debtsById.get(String(p.debt_id));
    return debt && isUtilityType(debt.type);
  }).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  
  const totalExpenses = regularExpenses + utilityExpenses;
  const totalPaid = regularPayments + utilityPaymentsTotal;
  const unpaidRegular = unpaidRegularDebts.reduce(
    (sum, debt) => sum + (parseFloat(debt.amount) || 0), 0
  );
  const utilityBalance = utilityExpenses - utilityPaymentsTotal;
  const totalUnpaid = unpaidRegular + Math.max(0, utilityBalance);
  const primaryContract = getPrimaryContractForTenant(tenant.id);

  // Info line (Phone, Start Date, Active) - in a rounded rectangle
  const infoBoxY = 28;
  const infoBoxHeight = 12;
  const infoPageWidth = doc.internal.pageSize.getWidth();
  const infoBoxWidth = infoPageWidth - 28;
  
  // Draw rounded rectangle border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, infoBoxY, infoBoxWidth, infoBoxHeight, 2, 2, "S");
  
  const infoLineY = infoBoxY + 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const phoneLabel = translate("tenantPhone") + ": ";
  const phoneValue = tenant.phone || "-";
  const dateLabel = "  |  " + translate("tenantSince") + ": ";
  // Use contract start date as entry date in PDF; fall back to tenant.entry_date
  const pdfEntryDate =
    (primaryContract && primaryContract.start_date) || tenant.entry_date;
  const dateValue = formatDate(pdfEntryDate);
  const activeLabel = "  |  " + translate("contractActive") + ": ";
  const activeValue = primaryContract
        ? primaryContract.is_active
          ? translate("yes")
          : translate("no")
    : translate("unknown");
  
  let infoX = 18;
  doc.text(phoneLabel, infoX, infoLineY);
  infoX += doc.getTextWidth(phoneLabel);
  doc.setTextColor(30, 41, 59);
  doc.text(phoneValue, infoX, infoLineY);
  infoX += doc.getTextWidth(phoneValue);
  doc.setTextColor(100, 116, 139);
  doc.text(dateLabel, infoX, infoLineY);
  infoX += doc.getTextWidth(dateLabel);
  doc.setTextColor(30, 41, 59);
  doc.text(dateValue, infoX, infoLineY);
  infoX += doc.getTextWidth(dateValue);
  doc.setTextColor(100, 116, 139);
  doc.text(activeLabel, infoX, infoLineY);
  infoX += doc.getTextWidth(activeLabel);
  doc.setTextColor(30, 41, 59);
  doc.text(activeValue, infoX, infoLineY);

  const metricsStartY = infoBoxY + infoBoxHeight + 2;
  const cardWidth = 56;
  const cardHeight = 14;
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

  // Calculate positions: Total Expenses on left, Total Unpaid on right, Total Payments centered
  const box1X = 14;
  const box3EndX = infoPageWidth - 14;
  const box3X = box3EndX - cardWidth;
  const box2X = (box1X + box3X + cardWidth) / 2 - cardWidth / 2;
  
  const boxPositions = [box1X, box2X, box3X];

  metrics.forEach((item, index) => {
    const x = boxPositions[index];
    doc.setFillColor(8, 168, 138);
    doc.roundedRect(x, metricsStartY, cardWidth, cardHeight, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(item.label, x + cardWidth / 2, metricsStartY + 5, { align: "center" });
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(item.value, x + cardWidth / 2, metricsStartY + 11, { align: "center" });
  });

  let cursorY = metricsStartY + cardHeight + 4;

  const autoTableAvailable =
    doc.autoTable && typeof doc.autoTable === "function";

  // Create summary table of unpaid expenses by type
  const expensesByType = new Map();
  const paymentsByType = new Map();
  
  unpaidRegularDebts.forEach((debt) => {
    const type = debt.type;
    if (!expensesByType.has(type)) {
      expensesByType.set(type, 0);
    }
    expensesByType.set(type, expensesByType.get(type) + normalizeCurrency(debt.amount));
  });
  
  utilityDebts.forEach((debt) => {
    const type = debt.type;
    if (!expensesByType.has(type)) {
      expensesByType.set(type, 0);
    }
    expensesByType.set(type, expensesByType.get(type) + normalizeCurrency(debt.amount));
  });
  
  payments.forEach((p) => {
    let type = p.type;
    if (!type) {
      const debt = debtsById.get(String(p.debt_id));
      type = debt?.type;
    }
    if (type && isUtilityType(type)) {
      if (!paymentsByType.has(type)) {
        paymentsByType.set(type, 0);
      }
      paymentsByType.set(type, paymentsByType.get(type) + normalizeCurrency(p.amount));
    }
  });

  const lastPaymentDatesByType = new Map();
  payments.forEach((p) => {
    let type = p.type;
    if (!type) {
      const debt = debtsById.get(String(p.debt_id));
      type = debt?.type;
    }
    if (type && p.payment_date) {
      const paymentDate = new Date(p.payment_date);
      if (!lastPaymentDatesByType.has(type) || paymentDate > lastPaymentDatesByType.get(type)) {
        lastPaymentDatesByType.set(type, paymentDate);
      }
    }
  });

  const expenseSummary = [];
  const typeOrder = ["rent", "garbage", "maintenance", "electricity", "water", "thermos", "damage", "other"];
  
  typeOrder.forEach((type) => {
    if (expensesByType.has(type)) {
      const expenseTotal = expensesByType.get(type);
      let netAmount = expenseTotal;
      
      if (isUtilityType(type)) {
        const paidAmount = paymentsByType.get(type) || 0;
        netAmount = expenseTotal - paidAmount;
      }
      
      if (Math.abs(netAmount) > 0.01) {
        const typeLabel = translate(`debt${capitalize(type)}`) || type;
        const lastPaymentDate = lastPaymentDatesByType.get(type);
        expenseSummary.push({
          type: typeLabel,
          amount: netAmount,
          lastPaymentDate: lastPaymentDate ? formatDate(lastPaymentDate.toISOString().split('T')[0]) : "-"
        });
      }
    }
  });

  Array.from(expensesByType.keys()).forEach((type) => {
    if (!typeOrder.includes(type)) {
      const typeLabel = translate(`debt${capitalize(type)}`) || type;
      if (!expenseSummary.find(e => e.type === typeLabel)) {
        const total = expensesByType.get(type);
        if (Math.abs(total) > 0.01) {
          const lastPaymentDate = lastPaymentDatesByType.get(type);
          expenseSummary.push({
            type: typeLabel,
            amount: total,
            lastPaymentDate: lastPaymentDate ? formatDate(lastPaymentDate.toISOString().split('T')[0]) : "-"
          });
        }
      }
    }
  });

  if (expenseSummary.length > 0) {
    if (autoTableAvailable) {
      const totalAmount = expenseSummary.reduce((sum, item) => sum + item.amount, 0);
      
      const tableBody = expenseSummary.map(item => [
        item.type,
        item.lastPaymentDate,
        formatCurrency(item.amount)
      ]);
      
      tableBody.push([
        translate("totalLabel") || "Total",
        "",
        formatCurrency(totalAmount)
      ]);
      
      const tableFullWidth = infoPageWidth - 28;
      const leftMargin = 14;
      const rightMargin = 14;
      
      const totalColumnWidth = 60 + 50 + 40;
      const scaleFactor = tableFullWidth / totalColumnWidth;
      const col0Width = 60 * scaleFactor;
      const col1Width = 50 * scaleFactor;
      const col2Width = 40 * scaleFactor;
      
      doc.autoTable({
        startY: cursorY,
        head: [
          [
            { 
              content: translate("unpaidExpensesSummary") || "Unpaid Expenses Summary", 
              colSpan: 3,
              styles: { halign: 'center' }
            }
          ],
          [
            translate("expenseType") || "Expense Type",
            translate("lastPaymentDate") || "Last Payment Date",
            translate("amount") || "Amount"
          ]
        ],
        body: tableBody,
        tableWidth: tableFullWidth,
        margin: { left: leftMargin, right: rightMargin },
        styles: {
          fontSize: 9,
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [8, 168, 138],
          textColor: [255, 255, 255],
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          fontSize: 9,
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: col0Width },
          1: { halign: 'left', cellWidth: col1Width },
          2: { halign: 'left', cellWidth: col2Width }
        },
        didParseCell: function(data) {
          if (data.row.index === -2) {
            if (data.column.index === 0) {
              if (!data.cell.colSpan) {
                data.cell.colSpan = 3;
              }
              data.cell.styles.halign = 'center';
              data.cell.styles.textAlign = 'center';
              data.cell.styles.fontSize = 9;
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [8, 168, 138];
              data.cell.styles.textColor = [255, 255, 255];
            } else if (data.column.index > 0) {
              data.cell.text = [""];
              data.cell.styles.lineWidth = 0;
              data.cell.styles.fillColor = [8, 168, 138];
            }
          }
          if (data.row.index === expenseSummary.length) {
            if (data.column.index === 0) {
              data.cell.colSpan = 2;
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
              data.cell.styles.halign = 'center';
            } else if (data.column.index === 1) {
              data.cell.text = [""];
              data.cell.styles.lineWidth = 0;
            } else if (data.column.index === 2) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
              data.cell.styles.halign = 'right';
            }
          }
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

  // Render expense type tables with pagination
  const tableFullWidth = infoPageWidth - 28;
  const detailTypeOrder = ["rent", "garbage", "water", "electricity", "maintenance", "thermos"];
  
  detailTypeOrder.forEach((type) => {
    // Collect all debts and payments for this type
    const typeDebts = debts.filter(d => d.type === type);
    const typePayments = payments.filter(p => {
      if (p.type === type) return true;
      const debt = debtsById.get(String(p.debt_id));
      return debt && debt.type === type;
    });
    
    if (typeDebts.length === 0 && typePayments.length === 0) return;
    
    const typeLabel = translate(`debt${capitalize(type)}`) || type;
    const isUtility = isUtilityType(type);

    // Order rows by date ascending (useful especially for utilities)
    // For debts: use due_date (already normalized from bill_date for utilities)
    const sortedTypeDebts = [...typeDebts].sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : 0;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : 0;
      return aTime - bTime;
    });

    // For payments: order by payment_date ascending
    const sortedTypePayments = [...typePayments].sort((a, b) => {
      const aTime = a.payment_date ? new Date(a.payment_date).getTime() : 0;
      const bTime = b.payment_date ? new Date(b.payment_date).getTime() : 0;
      return aTime - bTime;
    });
    
    // Check if we need a new page - use more of the page height
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }
    
    // Check if table has minimum 3 data rows, if not and not enough space, go to next page
    const dataRowCount = Math.max(sortedTypeDebts.length, sortedTypePayments.length);
    const minRowsRequired = 3;
    const estimatedRowHeight = 4; // mm per row
    const headerHeight = 8; // mm for header
    const titleHeight = 8; // mm for title
    const totalsRowHeight = 4; // mm for totals row
    const minSpaceNeeded = titleHeight + headerHeight + (minRowsRequired * estimatedRowHeight) + totalsRowHeight + 5; // 5mm buffer
    const availableSpace = 297 - cursorY; // A4 page height is 297mm
    
    // If table has fewer than 3 rows and not enough space, go to next page
    if (dataRowCount < minRowsRequired && availableSpace < minSpaceNeeded) {
      doc.addPage();
      cursorY = 20;
    }
    
    // Type label is now shown in table headers, so no need to render it separately
    doc.setTextColor(30, 41, 59);

    if (autoTableAvailable) {
      // Use consistent format for all types - all use the same merged table format
      const finalY = renderExpenseTypeTables(
        doc,
        sortedTypeDebts,
        sortedTypePayments,
        typeLabel,
        type,
        tableFullWidth,
        infoPageWidth,
        cursorY,
        translate,
        formatDate,
        formatCurrency,
        formatReferenceNumber,
        normalizeCurrency,
        MAX_ROWS_PER_PAGE
      );
      
      // Update cursorY after rendering
      cursorY = finalY + 10;
    }
  });

  doc.save(`tenant-${tenant.id}.pdf`);
  incrementPdfGeneratedCount();
  restoreLanguageAfterPdf();
}

/**
 * Render expense and payment tables side by side with pagination
 */
function renderExpenseTypeTables(
  doc,
  typeDebts,
  typePayments,
  typeLabel,
  type,
  tableFullWidth,
  infoPageWidth,
  startY,
  translate,
  formatDate,
  formatCurrency,
  formatReferenceNumber,
  normalizeCurrency,
  maxRowsPerPage
) {
  // Match margins with "Unpaid Expenses Summary" table exactly
  // Expenses table starts at same position (14mm), Payments table ends at same position (infoPageWidth - 14mm)
  const leftMargin = 14; // Same as unpaid expenses summary
  const rightMargin = 14; // Same as unpaid expenses summary
  // Use exact same width as "Unpaid Expenses Summary" table
  const tableWidth = infoPageWidth - leftMargin - rightMargin; // Same as unpaid expenses summary (infoPageWidth - 28)
  const separatorWidth = 30; // Separator width to match visual appearance (index 4)
  const sectionWidth = (tableWidth - separatorWidth) / 2; // Equal width for both sections
  
  // Calculate column widths for expenses section
  const expensesTotalColWidth = 8 + 20 + 18 + 38;
  const expensesScaleFactor = sectionWidth / expensesTotalColWidth;
  const expCol0Width = 8 * expensesScaleFactor;
  const expCol1Width = 20 * expensesScaleFactor;
  const expCol2Width = 18 * expensesScaleFactor;
  const expCol3Width = sectionWidth - (expCol0Width + expCol1Width + expCol2Width);
  
  // Calculate column widths for payments section
  const paymentsTotalColWidth = 8 + 20 + 18 + 38;
  const paymentsScaleFactor = sectionWidth / paymentsTotalColWidth;
  const payCol0Width = 8 * paymentsScaleFactor;
  const payCol1Width = 20 * paymentsScaleFactor;
  const payCol2Width = 18 * paymentsScaleFactor;
  const payCol3Width = sectionWidth - (payCol0Width + payCol1Width + payCol2Width);
  
  // Prepare data
  const expensesData = typeDebts.map((debt, i) => [
    i + 1,
    formatDate(debt.due_date),
    formatCurrency(debt.amount),
    formatReferenceNumber(debt.reference)
  ]);
  
  const paymentsData = typePayments.map((payment, i) => [
    i + 1,
    formatDate(payment.payment_date),
    formatCurrency(payment.amount),
    payment.method || "-"
  ]);
  
  // Calculate totals
  const totalExpenses = typeDebts.reduce((sum, debt) => sum + normalizeCurrency(debt.amount), 0);
  const totalPayments = typePayments.reduce((sum, payment) => sum + normalizeCurrency(payment.amount), 0);
  const debtAmount = totalExpenses - totalPayments;
  
  // Create merged table structure: Expenses columns + Separator + Payments columns
  // Total columns: 4 (expenses) + 1 (separator) + 4 (payments) = 9 columns
  const maxRows = Math.max(expensesData.length, paymentsData.length, 1);
  
  // Build combined table body
  const combinedBody = [];
  for (let i = 0; i < maxRows; i++) {
    const expRow = expensesData[i] || ["", "", "", ""];
    const payRow = paymentsData[i] || ["", "", "", ""];
    // Combine: expenses columns + separator + payments columns
    combinedBody.push([...expRow, "", ...payRow]);
  }
  
  // Add totals row at the bottom
  // Merge cells 0-3 for "Total Expenses: €X.XX", separator (4) empty, merge cells 5-8 for "Total Payments: €X.XX"
  const totalExpensesText = `${translate("totalExpenses") || "Total Expenses"} ${formatCurrency(totalExpenses)}`;
  const totalPaymentsText = `${translate("totalPayments") || "Total Payments"} ${formatCurrency(totalPayments)}`;
  combinedBody.push([totalExpensesText, "", "", "", "", totalPaymentsText, "", "", ""]);
  
  // Add difference row - show remaining debt (Total Expenses - Total Payments) in payments section (columns 5-8)
  const differenceText = `${translate("remainingDebt") || "Remaining debt"} ${formatCurrency(debtAmount)}`;
  combinedBody.push(["", "", "", "", "", differenceText, "", "", ""]);
  
  // Create combined headers as simple array for jsPDF autoTable
  // This ensures headers are always visible, even with few data rows
  // Used for all types including electricity and maintenance
  const combinedHeaders = [
    "#",
    translate("dueDate") || "Due Date",
    translate("amount") || "Amount",
    translate("reference") || "Reference",
    "", // Separator column
    "#",
    translate("paymentDate") || "Payment Date",
    translate("amount") || "Amount",
    translate("paymentMethod") || "Method"
  ];
  
  // Table styles - more compact to fit more rows and reduce empty space
  const tableStyles = { fontSize: 6, cellPadding: 0.8, overflow: 'ellipsize', lineWidth: 0.1, lineColor: [0, 0, 0], pageBreak: 'auto' };
  const headStyles = { fillColor: [8, 168, 138], textColor: [255, 255, 255], fontSize: 6, lineWidth: 0.1, lineColor: [0, 0, 0], cellPadding: 1 };
  
  // Split into pages
  const combinedPages = chunkArray(combinedBody, maxRowsPerPage);
  // tableWidth is already calculated above
  
  let currentStartY = startY;
  
  for (let pageIndex = 0; pageIndex < combinedPages.length; pageIndex++) {
    const pageData = combinedPages[pageIndex];
    
    // Check if this page has minimum 3 data rows (excluding totals row and difference row)
    // pageData includes: data rows + totals row + difference row
    const dataRowsOnPage = pageData.length > 0 ? Math.max(0, pageData.length - 2) : 0; // Subtract 2 for totals row and difference row
    const minRowsRequired = 3;
    
    if (pageIndex > 0) {
      // For subsequent pages, check if we have minimum rows
      const availableSpace = 297 - currentStartY; // A4 page height is 297mm
      const estimatedRowHeight = 4; // mm per row
      const headerHeight = 8; // mm for header
      const totalsRowHeight = 4; // mm for totals row
      const minSpaceNeeded = headerHeight + (minRowsRequired * estimatedRowHeight) + totalsRowHeight + 5; // 5mm buffer
      
      // If fewer than 3 rows and not enough space, go to next page
      if (dataRowsOnPage < minRowsRequired && availableSpace < minSpaceNeeded) {
        doc.addPage();
        currentStartY = 20;
      } else if (currentStartY > 270) {
        // Or if we're too far down the page, go to next page
        doc.addPage();
        currentStartY = 20;
      }
    } else {
      // For first page, check if we have minimum rows and enough space
      const availableSpace = 297 - currentStartY;
      const estimatedRowHeight = 4;
      const headerHeight = 8;
      const titleHeight = 8;
      const totalsRowHeight = 4;
      const minSpaceNeeded = titleHeight + headerHeight + (minRowsRequired * estimatedRowHeight) + totalsRowHeight + 5;
      
      // If fewer than 3 rows and not enough space, go to next page
      // This ensures tables with very few rows (like empty Garbage table) go to next page
      if (dataRowsOnPage < minRowsRequired && availableSpace < minSpaceNeeded) {
        doc.addPage();
        currentStartY = 20;
      } else if (currentStartY > 270) {
        // Or if we're too far down the page, go to next page
        doc.addPage();
        currentStartY = 20;
      }
    }
      // Title row only on first page - include utility/expense type name
      // Column headers must appear on ALL pages as the second row (or first row on subsequent pages)
      // Exception: Electricity and Maintenance don't show column headers row
      const hideColumnHeaders = type === "electricity" || type === "maintenance";
      let tableHead;
      if (pageIndex === 0) {
        // First page: title row + column headers row (unless electricity/maintenance)
        if (hideColumnHeaders) {
          // Only title row for electricity and maintenance
          tableHead = [
            [
              { content: `${typeLabel} - ${translate("expensesList") || "Expenses"}`, colSpan: 4, styles: { halign: 'center' } },
              { content: "", colSpan: 1, styles: { fillColor: [255, 255, 255], lineWidth: 0 } }, // Separator
              { content: `${typeLabel} - ${translate("paymentsList") || "Payments"}`, colSpan: 4, styles: { halign: 'center' } }
            ]
          ];
        } else {
          // Title row + column headers row for other types
          tableHead = [
            [
              { content: `${typeLabel} - ${translate("expensesList") || "Expenses"}`, colSpan: 4, styles: { halign: 'center' } },
              { content: "", colSpan: 1, styles: { fillColor: [255, 255, 255], lineWidth: 0 } }, // Separator
              { content: `${typeLabel} - ${translate("paymentsList") || "Payments"}`, colSpan: 4, styles: { halign: 'center' } }
            ],
            combinedHeaders // Second row: column headers
          ];
        }
      } else {
        // Subsequent pages: column headers row only (unless electricity/maintenance)
        if (hideColumnHeaders) {
          // Show title row again on subsequent pages for electricity and maintenance
          tableHead = [
            [
              { content: `${typeLabel} - ${translate("expensesList") || "Expenses"}`, colSpan: 4, styles: { halign: 'center' } },
              { content: "", colSpan: 1, styles: { fillColor: [255, 255, 255], lineWidth: 0 } }, // Separator
              { content: `${typeLabel} - ${translate("paymentsList") || "Payments"}`, colSpan: 4, styles: { halign: 'center' } }
            ]
          ];
        } else {
          // Column headers on all subsequent pages for other types
          tableHead = [combinedHeaders];
        }
      }
      
      // Ensure combinedHeaders is always defined and is an array of 9 cells
      if (!combinedHeaders || !Array.isArray(combinedHeaders) || combinedHeaders.length !== 9) {
        console.error("combinedHeaders is invalid:", combinedHeaders);
      }
    
    doc.autoTable({
      startY: currentStartY,
      head: tableHead,
      body: pageData.length > 0 ? pageData : [["", "", "", "", "", "", "", "", ""]],
      styles: tableStyles,
      headStyles: headStyles,
      showHead: 'everyPage', // Always show headers on every page
      columnStyles: {
        // Expenses columns (0-3)
        0: { cellWidth: expCol0Width },
        1: { cellWidth: expCol1Width },
        2: { cellWidth: expCol2Width },
        3: { cellWidth: expCol3Width },
        // Separator column (4) - THIS IS THE SEPARATOR COLUMN INDEX
        4: { 
          cellWidth: separatorWidth, 
          fillColor: [255, 255, 255],
          lineWidth: { left: 0.1, right: 0.1, top: 0.1, bottom: 0.1 },
          textColor: [255, 255, 255]
        },
        // Payments columns (5-8)
        5: { cellWidth: payCol0Width },
        6: { cellWidth: payCol1Width },
        7: { cellWidth: payCol2Width },
        8: { cellWidth: payCol3Width }
      },
      didParseCell: function(data) {
        // Column headers row styling (second header row is -1, or first row on subsequent pages)
        // Handle this FIRST to ensure headers are always visible
        if (data.row.index === -1) {
          // CRITICAL: Ensure headers row is NOT merged - each cell should display its own header text
          // ALWAYS set colSpan to 1 to prevent any merging
          data.cell.colSpan = 1; // Force no merging - each header cell is separate
          
          // Get header text from combinedHeaders array
          const headerText = combinedHeaders[data.column.index];
          
          // Column headers should use headStyles (already applied via headStyles config)
          // Explicitly ensure headers are visible with proper styling
          if (data.column.index === 4) {
            // Separator column in headers row
            data.cell.text = [""];
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineWidth = { left: 0.1, right: 0.1, top: 0.1, bottom: 0.1 };
          } else {
            // CRITICAL: ALWAYS set header text explicitly - override whatever autoTable set
            // This ensures headers are always visible
            if (headerText !== undefined && headerText !== null) {
              data.cell.text = [String(headerText)];
            } else {
              // Fallback - should not happen
              data.cell.text = [""];
            }
            
            // Ensure header cells have proper styling and text is visible
            // ALWAYS force these styles to ensure headers are visible
            data.cell.styles.fillColor = [8, 168, 138]; // Teal background
            data.cell.styles.textColor = [255, 255, 255]; // White text
            data.cell.styles.fontSize = 6; // Ensure font size
            data.cell.styles.fontStyle = 'normal'; // Normal font weight for headers
            data.cell.styles.halign = 'left'; // Left align headers
          }
        }
        // Title row styling (first header row is -2)
        if (pageIndex === 0 && data.row.index === -2) {
          if (data.column.index === 0) {
            // Expenses title
            if (!data.cell.colSpan) data.cell.colSpan = 4;
            data.cell.styles.halign = 'center';
            data.cell.styles.fontSize = 9;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [8, 168, 138];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 1, right: 1 };
          } else if (data.column.index === 4) {
            // Separator in title row
            data.cell.text = [""];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.fillColor = [255, 255, 255];
          } else if (data.column.index === 5) {
            // Payments title
            if (!data.cell.colSpan) data.cell.colSpan = 4;
            data.cell.styles.halign = 'center';
            data.cell.styles.fontSize = 9;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [8, 168, 138];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 1, right: 1 };
          } else if (data.column.index > 0 && data.column.index < 4) {
            // Hidden cells in expenses title
            data.cell.text = [""];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.fillColor = [8, 168, 138];
          } else if (data.column.index > 5 && data.column.index < 9) {
            // Hidden cells in payments title
            data.cell.text = [""];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.fillColor = [8, 168, 138];
          }
        }
        // Separator column styling for data rows
        if (data.column.index === 4 && data.row.index >= 0 && data.row.index < maxRows) {
          data.cell.text = [""];
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.styles.lineWidth = { left: 0.1, right: 0.1, top:0, bottom: 0};
        }
        // Totals row styling (row index maxRows)
        if (data.row.index === maxRows) {
          if (data.column.index === 0) {
            // Merge cells 0-3 for "Total Expenses"
            data.cell.colSpan = 4;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.halign = 'left';
            data.cell.styles.lineWidth = { left: 0.1, right: 0, top: 0.1, bottom: 0.1 };
          } else if (data.column.index > 0 && data.column.index < 4) {
            // Hide merged cells 1-3
            data.cell.text = [""];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.fillColor = [240, 240, 240];
          } else if (data.column.index === 4) {
            // Separator column - same styling as other rows
            data.cell.text = [""];
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineWidth = { left: 0.1, right: 0.1, top: 0, bottom: 0 };
          } else if (data.column.index === 5) {
            // Merge cells 5-8 for "Total Payments"
            data.cell.colSpan = 4;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.halign = 'left';
          } else if (data.column.index > 5 && data.column.index < 9) {
            // Hide merged cells 6-8
            data.cell.text = [""];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
        // Difference row styling (row index maxRows + 1)
        if (data.row.index === maxRows + 1) {
          if (data.column.index >= 0 && data.column.index < 4) {
            // Empty cells for expenses section (0-3)
            data.cell.text = [""];
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineWidth = 0;
          } else if (data.column.index === 4) {
            // Separator column - no left border on bottom row
            data.cell.text = [""];
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineWidth = { left: 0, right: 0.1, top: 0, bottom: 0 };
          } else if (data.column.index === 5) {
            // Merge cells 5-8 for "Difference: €X.XX"
            data.cell.colSpan = 4;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.halign = 'left';
          } else if (data.column.index > 5 && data.column.index < 9) {
            // Hide merged cells 6-8
            data.cell.text = [""];
            data.cell.styles.lineWidth = 0;
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      },
      willDrawCell: function(data) {
        // Ensure header text is set right before drawing - this is a final check
        if (data.row.index === -1) {
          // This is the header row - ensure text is always set
          if (data.column.index !== 4) { // Not separator
            const headerText = combinedHeaders[data.column.index];
            if (headerText !== undefined && headerText !== null && headerText !== "") {
              // Force set the text right before drawing
              data.cell.text = [String(headerText)];
              // Ensure styles are applied
              data.cell.styles.fillColor = [8, 168, 138];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontSize = 6;
            }
          }
        }
      },
      tableWidth: tableWidth,
      margin: { 
        left: leftMargin, 
        right: rightMargin // Right margin of 14mm ensures payments table ends at infoPageWidth - 14mm (same as unpaid expenses summary)
      },
    });
    
    currentStartY = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentStartY;
  }
  
  return currentStartY;
}

/**
 * Split array into chunks of specified size
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks.length > 0 ? chunks : [[]];
}

