// Paged loading for apartments, expenses, and payments. Loaded before app.js. Shares the same globals.

/**
 * Setup pagination for apartments table
 */
function setupApartmentsPagination() {
  if (!elements.apartmentsTableBody) return;

  // Destroy existing instance if any
  if (state.paginationInstances.apartments) {
    state.paginationInstances.apartments.destroy();
  }

  state.paginationInstances.apartments = new InfiniteScrollPagination({
    container: elements.apartmentsTableBody,
    itemsPerPage: 15,
    loadPage: async (page, limit) => {
      if (!state.currentUser) {
        return { items: [], hasMore: false };
      }

      return withRetryOnAuthLock(async () => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Try to load with all columns first
        let { data, error, count } = await supabase
          .from("apartments")
          .select(
            "id, name, address, electricity_code, heating_code, water_code, waste_code, photos, description, condition, rooms, balconies, bathrooms, area, municipality, neighborhood, monthly_rent, features, rental_status, rental_rules",
            { count: 'exact' }
          )
          .eq("landlord_id", state.currentUser.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        // Fallback to core columns if needed
        if (error && (error.code === 'PGRST204' || error.status === 400 || error.message?.includes('column'))) {
          const coreSelect = await supabase
            .from("apartments")
            .select(
              "id, name, address, electricity_code, heating_code, water_code, waste_code, photos",
              { count: 'exact' }
            )
            .eq("landlord_id", state.currentUser.id)
            .order("created_at", { ascending: false })
            .range(from, to);
          
          data = coreSelect.data;
          error = coreSelect.error;
          count = coreSelect.count;
        }

        if (error) {
          throw error;
        }

        const items = data || [];
        const hasMore = count ? (to + 1 < count) : (items.length === limit);

        // Update state.apartments to include all loaded items
        const currentIds = new Set(state.apartments.map(a => a.id));
        items.forEach(item => {
          if (!currentIds.has(item.id)) {
            state.apartments.push(item);
          }
        });

        populateApartmentSelects();

        return { items, hasMore };
      });
    },
    renderItem: (apartment) => {
      // Compute active contracts dynamically (contracts may load after apartments)
      const apartmentsWithActiveContracts = new Set(
        state.contracts
          .filter(c => c.is_active && c.apartment_id != null)
          .map(c => String(c.apartment_id))
      );
      const hasActiveContract = apartmentsWithActiveContracts.has(String(apartment.id));
      const statusClass = hasActiveContract ? "" : "view-active";
      const statusText = hasActiveContract 
        ? translate("apartmentOccupied") || "Occupied" 
        : translate("apartmentAvailable") || "Available";
      
      let photos = [];
      if (apartment.photos) {
        try {
          photos = typeof apartment.photos === 'string' 
            ? (apartment.photos.startsWith('[') ? JSON.parse(apartment.photos) : apartment.photos.split(',').map(p => p.trim()))
            : apartment.photos;
        } catch (e) {
          photos = apartment.photos.split(',').map(p => p.trim());
        }
      }
      const firstPhoto = photos.length > 0 ? photos[0] : null;

      const row = document.createElement('tr');
      row.className = statusClass;
      row.classList.add('collapsed'); // Collapsed by default on mobile
      
      // Summary cell (shown when collapsed)
      const summaryCell = document.createElement('td');
      summaryCell.className = 'mobile-summary-cell';
      const shortDate = formatDateShortYear(apartment.created_at || '');
      const statusTextShort = hasActiveContract ? translate("apartmentOccupied") || "Occupied" : translate("apartmentAvailable") || "Available";
      
      const summaryRow = document.createElement('div');
      summaryRow.className = 'summary-row';
      
      const mainInfo = document.createElement('div');
      mainInfo.className = 'summary-main-info';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'summary-name';
      nameSpan.textContent = sanitize(apartment.name);
      mainInfo.appendChild(nameSpan);
      
      const separator1 = document.createElement('span');
      separator1.textContent = '•';
      separator1.style.opacity = '0.5';
      mainInfo.appendChild(separator1);
      
      const addressSpan = document.createElement('span');
      addressSpan.className = 'summary-type';
      addressSpan.textContent = sanitize(apartment.address || '');
      mainInfo.appendChild(addressSpan);
      
      summaryRow.appendChild(mainInfo);
      
      const statusDiv = document.createElement('div');
      statusDiv.className = 'summary-status';
      const summaryStatusBadge = document.createElement('span');
      summaryStatusBadge.className = `status-badge ${hasActiveContract ? 'occupied' : 'available'}`;
      summaryStatusBadge.textContent = statusTextShort;
      statusDiv.appendChild(summaryStatusBadge);
      summaryRow.appendChild(statusDiv);
      
      summaryCell.appendChild(summaryRow);
      row.appendChild(summaryCell);
      
      // Photo cell
      const photoCell = document.createElement('td');
      photoCell.className = 'desktop-cell';
      photoCell.setAttribute('data-label', 'Photo');
      if (firstPhoto) {
        const img = document.createElement('img');
        img.src = sanitize(firstPhoto);
        img.alt = sanitize(apartment.name);
        img.className = 'apartment-photo-thumbnail';
        img.style.cssText = 'width: 60px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer;';
        img.setAttribute('data-apartment-id', apartment.id);
        img.addEventListener('error', function() { this.style.display = 'none'; });
        photoCell.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.style.color = '#999';
        span.textContent = 'No photo';
        photoCell.appendChild(span);
      }
      row.appendChild(photoCell);
      
      // Name cell
      const nameCell = document.createElement('td');
      nameCell.className = 'desktop-cell';
      nameCell.setAttribute('data-label', 'Name');
      nameCell.textContent = sanitize(apartment.name);
      row.appendChild(nameCell);
      
      // Address cell
      const addressCell = document.createElement('td');
      addressCell.className = 'desktop-cell';
      addressCell.setAttribute('data-label', 'Address');
      addressCell.textContent = sanitize(apartment.address || '');
      row.appendChild(addressCell);
      
      // Electricity Code cell
      const elecCell = document.createElement('td');
      elecCell.className = 'desktop-cell';
      elecCell.setAttribute('data-label', 'Electricity Code');
      elecCell.textContent = sanitize(apartment.electricity_code || '');
      row.appendChild(elecCell);
      
      // Heating Code cell
      const heatCell = document.createElement('td');
      heatCell.className = 'desktop-cell';
      heatCell.setAttribute('data-label', 'Heating Code');
      heatCell.textContent = sanitize(apartment.heating_code || '');
      row.appendChild(heatCell);
      
      // Water Code cell
      const waterCell = document.createElement('td');
      waterCell.className = 'desktop-cell';
      waterCell.setAttribute('data-label', 'Water Code');
      waterCell.textContent = sanitize(apartment.water_code || '');
      row.appendChild(waterCell);
      
      // Waste Code cell
      const wasteCell = document.createElement('td');
      wasteCell.className = 'desktop-cell';
      wasteCell.setAttribute('data-label', 'Waste Code');
      wasteCell.textContent = sanitize(apartment.waste_code || '');
      row.appendChild(wasteCell);
      
      // Status cell
      const statusCell = document.createElement('td');
      statusCell.className = 'desktop-cell';
      statusCell.setAttribute('data-label', 'Status');
      const desktopStatusBadge = document.createElement('span');
      desktopStatusBadge.className = `status-badge ${hasActiveContract ? 'occupied' : 'available'}`;
      desktopStatusBadge.textContent = statusText;
      statusCell.appendChild(desktopStatusBadge);
      row.appendChild(statusCell);
      
      // Actions cell
      const actionsCell = document.createElement('td');
      actionsCell.className = 'desktop-cell';
      actionsCell.setAttribute('data-label', 'Actions');
      actionsCell.setAttribute('data-collapsible', 'true');
      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'actions-group';
      
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-outline-secondary btn-sm';
      editBtn.setAttribute('data-action', 'edit-apartment');
      editBtn.setAttribute('data-id', apartment.id);
      editBtn.textContent = translate("edit") || "Edit";
      editBtn.addEventListener("click", () => editApartment(apartment.id));
      actionsGroup.appendChild(editBtn);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-outline-danger btn-sm';
      deleteBtn.setAttribute('data-action', 'delete-apartment');
      deleteBtn.setAttribute('data-id', apartment.id);
      deleteBtn.textContent = translate("delete") || "Delete";
      deleteBtn.addEventListener("click", () => handleDeleteApartment(apartment.id));
      actionsGroup.appendChild(deleteBtn);
      
      actionsCell.appendChild(actionsGroup);
      row.appendChild(actionsCell);
      
      // ID cell
      const idCell = document.createElement('td');
      idCell.className = 'desktop-cell';
      idCell.setAttribute('data-label', 'ID');
      idCell.textContent = apartment.id;
      row.appendChild(idCell);

      // Attach event listeners for photo
      const photoImg = row.querySelector('.apartment-photo-thumbnail');
      if (photoImg) {
        photoImg.addEventListener("click", () => {
          const apartmentId = photoImg.getAttribute("data-apartment-id");
          if (!apartmentId) return;
          const apt = state.apartments.find(a => equalsId(a.id, apartmentId));
          if (apt) {
            // Parse and show photos
            let aptPhotos = [];
            if (apt.photos) {
              try {
                aptPhotos = typeof apt.photos === 'string' 
                  ? (apt.photos.startsWith('[') ? JSON.parse(apt.photos) : apt.photos.split(',').map(p => p.trim()))
                  : apt.photos;
              } catch (e) {
                aptPhotos = apt.photos.split(',').map(p => p.trim());
              }
            }
            if (aptPhotos.length > 0 && window.openPhotoViewer) {
              window.openPhotoViewer(aptPhotos, 0, apt.name || "");
            }
          }
        });
      }

      return row;
    },
    skeletonTemplate: () => {
      const skeleton = document.createElement('tr');
      skeleton.className = 'pagination-skeleton';
      const td = document.createElement('td');
      td.setAttribute('colspan', '9');
      td.style.cssText = 'padding: 1rem; text-align: center;';
      const div = document.createElement('div');
      div.style.cssText = 'background: linear-gradient(90deg, transparent, rgba(203,213,225,0.3), transparent); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; height: 40px; border-radius: 4px;';
      td.appendChild(div);
      skeleton.appendChild(td);
      return skeleton;
    },
    loadMoreText: translate("loadMore") || "Load More",
    errorText: translate("errorLoadMore") || "Error loading. Click to retry.",
    onError: (error) => {
      console.error("Apartments pagination error:", error);
      notify("error", translate("errorLoad") || "Error loading apartments");
    },
    onLoadComplete: () => {
      if (!state.isInitialLoad) {
        renderAdminSummary();
      }
    }
  });
}

/**
 * Setup pagination for expenses/debts table (client-side pagination on filtered data)
 */
function setupDebtsPagination() {
  if (!elements.debtsTableBody) return;

  // Destroy existing instance if any
  if (state.paginationInstances.debts) {
    state.paginationInstances.debts.destroy();
  }

  state.paginationInstances.debts = new InfiniteScrollPagination({
    container: elements.debtsTableBody,
    itemsPerPage: 15,
    loadPage: async (page, limit) => {
      const statusFilter = elements.debtsFilterStatus?.value || "all";
      const typeFilter = elements.debtsFilterType?.value || "all";
      const today = new Date().toISOString().slice(0, 10);

      // Get filtered debts
      const debtsToFilter = getFilteredDebts();
      
      // If no debts available yet, return empty
      if (!debtsToFilter || debtsToFilter.length === 0) {
        return { items: [], hasMore: false };
      }
      
      const filtered = debtsToFilter.filter((debt) => {
        const isPaid = !!debt.is_paid;
        const isOverdue = !isPaid && debt.due_date && debt.due_date < today;

        if (!isUtilityType(debt.type)) {
          if (statusFilter === "paid" && !isPaid) return false;
          if (statusFilter === "open_overdue" && isPaid) return false;
        }
        if (typeFilter !== "all" && debt.type !== typeFilter) return false;
        return true;
      });

      // Sort based on selected option
      const sortBy = elements.debtsSortBy?.value || "date_desc";
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "date_asc":
            const dateA = a.due_date || '';
            const dateB = b.due_date || '';
            return dateA.localeCompare(dateB);
          
          case "date_desc":
            const dateADesc = a.due_date || '';
            const dateBDesc = b.due_date || '';
            return dateBDesc.localeCompare(dateADesc);
          
          case "reference_asc":
            // Extract numeric part for proper numeric sorting
            const refA = a.reference || "";
            const refB = b.reference || "";
            const numA = typeof refA === 'number' ? refA : parseInt(refA, 10);
            const numB = typeof refB === 'number' ? refB : parseInt(refB, 10);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            // Fallback to string comparison
            return String(refA).toLowerCase().localeCompare(String(refB).toLowerCase());
          
          case "reference_desc":
            // Extract numeric part for proper numeric sorting
            const refADesc = a.reference || "";
            const refBDesc = b.reference || "";
            const numADesc = typeof refADesc === 'number' ? refADesc : parseInt(refADesc, 10);
            const numBDesc = typeof refBDesc === 'number' ? refBDesc : parseInt(refBDesc, 10);
            if (!isNaN(numADesc) && !isNaN(numBDesc)) {
              return numBDesc - numADesc;
            }
            // Fallback to string comparison
            return String(refBDesc).toLowerCase().localeCompare(String(refADesc).toLowerCase());
          
          case "amount_asc":
            const amountA = normalizeCurrency(a.amount || 0);
            const amountB = normalizeCurrency(b.amount || 0);
            return amountA - amountB;
          
          case "amount_desc":
            const amountADesc = normalizeCurrency(a.amount || 0);
            const amountBDesc = normalizeCurrency(b.amount || 0);
            return amountBDesc - amountADesc;
          
          default:
            // Default to date_desc
            const dateADef = a.due_date || '';
            const dateBDef = b.due_date || '';
            return dateBDef.localeCompare(dateADef);
        }
      });

      // Paginate
      const from = (page - 1) * limit;
      const to = from + limit;
      const items = filtered.slice(from, to);
      const hasMore = to < filtered.length;

      return { items, hasMore };
    },
    renderItem: (debt) => {
      const tenant = state.tenants.find((t) => equalsId(t.id, debt.tenant_id));
      const status = getDebtStatus(debt);
      const typeLabel = getDebtTypeLabel(debt);
      const isUtility = isUtilityType(debt.type);
      const showMarkPaid = !isUtility;
      const isEditing = state.editingDebtId && equalsId(state.editingDebtId, debt.id);

      if (isEditing) {
        // Render editable row (inline edit)
        const row = document.createElement('tr');
        row.className = 'editing-row';
        const amountValue = normalizeCurrency(debt.amount).toFixed(2);
        const dueDateValue = debt.due_date || "";
        const notesValue = stripElectricityCutMarker(debt.notes || "");
        const isUtilityEdit = isUtilityType(debt.type);

        const summaryCell = document.createElement('td');
        summaryCell.className = 'mobile-summary-cell';
        summaryCell.textContent = sanitize(tenant?.full_name || "") + " • " + sanitize(typeLabel);
        row.appendChild(summaryCell);

        const tenantCell = document.createElement('td');
        tenantCell.textContent = sanitize(tenant?.full_name || translate("unknown"));
        row.appendChild(tenantCell);

        const typeCell = document.createElement('td');
        const typeSelect = document.createElement('select');
        typeSelect.className = 'inline-edit-input form-select';
        typeSelect.setAttribute('data-field', 'type');
        typeSelect.required = true;
        [{ value: "rent", label: translate("debtRent") || "Rent" }, { value: "maintenance", label: translate("debtMaintenance") || "Maintenance" }, { value: "garbage", label: translate("debtGarbage") || "Garbage" }, { value: "thermos", label: translate("debtThermos") || "Thermos" }, { value: "electricity", label: translate("debtElectricity") || "Electricity" }, { value: "water", label: translate("debtWater") || "Water" }, { value: "damage", label: translate("debtDamage") || "Damage" }, { value: "other", label: translate("debtOther") || "Other" }].forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = sanitize(opt.label);
          if (debt.type === opt.value) option.selected = true;
          typeSelect.appendChild(option);
        });
        typeCell.appendChild(typeSelect);
        row.appendChild(typeCell);

        const amountCell = document.createElement('td');
        const amountInput = document.createElement('input');
        amountInput.type = 'number';
        amountInput.className = 'inline-edit-input form-control';
        amountInput.setAttribute('data-field', 'amount');
        amountInput.value = amountValue;
        amountInput.min = '0';
        amountInput.step = '0.01';
        amountInput.required = true;
        amountCell.appendChild(amountInput);
        row.appendChild(amountCell);

        const dueDateCell = document.createElement('td');
        const dueDateInput = document.createElement('input');
        dueDateInput.type = 'date';
        dueDateInput.className = 'inline-edit-input form-control';
        dueDateInput.setAttribute('data-field', 'due_date');
        dueDateInput.value = dueDateValue;
        dueDateInput.required = true;
        dueDateCell.appendChild(dueDateInput);
        row.appendChild(dueDateCell);

        const periodCell = document.createElement('td');
        periodCell.textContent = formatPeriod(debt.due_date);
        row.appendChild(periodCell);

        const statusCell = document.createElement('td');
        if (!isUtilityEdit) {
          const statusTag = document.createElement('span');
          statusTag.className = `badge ${status.class === 'overdue' ? 'bg-danger' : status.class === 'paid' ? 'bg-success' : 'bg-warning'}`;
          statusTag.textContent = status.label;
          statusCell.appendChild(statusTag);
        }
        row.appendChild(statusCell);

        const refCell = document.createElement('td');
        refCell.textContent = sanitize(formatReferenceForDisplay(debt.reference));
        row.appendChild(refCell);

        const notesCell = document.createElement('td');
        const notesInput = document.createElement('input');
        notesInput.type = 'text';
        notesInput.className = 'inline-edit-input form-control';
        notesInput.setAttribute('data-field', 'notes');
        notesInput.value = notesValue;
        notesInput.placeholder = translate("notes") || "Notes";
        notesCell.appendChild(notesInput);
        row.appendChild(notesCell);

        const actionsCell = document.createElement('td');
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'btn-group';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-primary btn-sm';
        saveBtn.setAttribute('data-action', 'save-debt');
        saveBtn.setAttribute('data-id', debt.id);
        saveBtn.textContent = translate("save") || "Save";
        saveBtn.addEventListener("click", () => handleSaveDebt(debt.id));
        actionsGroup.appendChild(saveBtn);
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-outline-secondary btn-sm';
        cancelBtn.setAttribute('data-action', 'cancel-edit-debt');
        cancelBtn.setAttribute('data-id', debt.id);
        cancelBtn.textContent = translate("cancelEdit") || "Cancel";
        cancelBtn.addEventListener("click", () => {
          state.editingDebtId = null;
          renderDebtsTable();
        });
        actionsGroup.appendChild(cancelBtn);
        actionsCell.appendChild(actionsGroup);
        row.appendChild(actionsCell);

        return row;
      }

      const row = document.createElement('tr');
      row.classList.add('collapsed'); // Collapsed by default on mobile
      
      // Summary cell (shown when collapsed)
      const summaryCell = document.createElement('td');
      summaryCell.className = 'mobile-summary-cell';
      const tenantName = sanitize(tenant?.full_name || translate("unknown"));
      const shortDate = formatDateShortYear(debt.due_date);
      const amount = formatCurrency(debt.amount);
      const isPaid = !isUtility && debt.is_paid;
      const statusBall = isPaid ? '<span class="status-ball status-paid"></span>' : '<span class="status-ball status-unpaid"></span>';
      
      // Create structured summary
      const summaryRow = document.createElement('div');
      summaryRow.className = 'summary-row';
      
      const mainInfo = document.createElement('div');
      mainInfo.className = 'summary-main-info';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'summary-name';
      nameSpan.textContent = tenantName;
      mainInfo.appendChild(nameSpan);
      
      const separator1 = document.createElement('span');
      separator1.textContent = '•';
      separator1.style.opacity = '0.5';
      mainInfo.appendChild(separator1);
      
      const typeSpan = document.createElement('span');
      typeSpan.className = 'summary-type';
      typeSpan.textContent = sanitize(typeLabel);
      mainInfo.appendChild(typeSpan);
      
      const separator2 = document.createElement('span');
      separator2.textContent = '•';
      separator2.style.opacity = '0.5';
      mainInfo.appendChild(separator2);
      
      const dateSpan = document.createElement('span');
      dateSpan.className = 'summary-date';
      dateSpan.textContent = shortDate;
      mainInfo.appendChild(dateSpan);
      
      summaryRow.appendChild(mainInfo);
      
      const amountSpan = document.createElement('span');
      amountSpan.className = 'summary-amount';
      amountSpan.textContent = amount;
      summaryRow.appendChild(amountSpan);
      
      const statusDiv = document.createElement('div');
      statusDiv.className = 'summary-status';
      statusDiv.innerHTML = statusBall;
      summaryRow.appendChild(statusDiv);
      
      summaryCell.appendChild(summaryRow);
      row.appendChild(summaryCell);
      
      // Tenant cell
      const tenantCell = document.createElement('td');
      tenantCell.className = 'desktop-cell';
      tenantCell.textContent = tenantName;
      row.appendChild(tenantCell);
      
      // Type cell
      const typeCell = document.createElement('td');
      typeCell.className = 'desktop-cell';
      typeCell.textContent = sanitize(typeLabel);
      row.appendChild(typeCell);
      
      // Amount cell
      const amountCell = document.createElement('td');
      amountCell.className = 'desktop-cell';
      amountCell.textContent = formatCurrency(debt.amount);
      row.appendChild(amountCell);
      
      // Due date cell
      const dueDateCell = document.createElement('td');
      dueDateCell.className = 'desktop-cell';
      dueDateCell.textContent = formatDate(debt.due_date);
      row.appendChild(dueDateCell);
      
      // Period cell
      const periodCell = document.createElement('td');
      periodCell.className = 'desktop-cell';
      periodCell.textContent = formatPeriod(debt.due_date);
      row.appendChild(periodCell);
      
      // Status cell
      const statusCell = document.createElement('td');
      statusCell.className = 'desktop-cell';
      if (!isUtility) {
        const statusTag = document.createElement('span');
        statusTag.className = `badge ${status.class === 'overdue' ? 'bg-danger' : status.class === 'paid' ? 'bg-success' : 'bg-warning'}`;
        statusTag.textContent = status.label;
        statusCell.appendChild(statusTag);
      }
      row.appendChild(statusCell);
      
      // Reference cell (collapsible)
      const refCell = document.createElement('td');
      refCell.setAttribute('data-collapsible', 'true');
      refCell.textContent = sanitize(formatReferenceForDisplay(debt.reference));
      row.appendChild(refCell);
      
      // Notes cell (collapsible)
      const notesCell = document.createElement('td');
      notesCell.setAttribute('data-collapsible', 'true');
      notesCell.textContent = sanitize(stripElectricityCutMarker(debt.notes || ""));
      row.appendChild(notesCell);
      
      // Actions cell (collapsible)
      const actionsCell = document.createElement('td');
      actionsCell.setAttribute('data-collapsible', 'true');
      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'btn-group';
      
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-outline-secondary btn-sm';
      editBtn.setAttribute('data-action', 'edit-debt');
      editBtn.setAttribute('data-id', debt.id);
      editBtn.textContent = translate("edit");
      editBtn.addEventListener("click", () => startEditDebt(debt.id));
      actionsGroup.appendChild(editBtn);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-outline-danger btn-sm';
      deleteBtn.setAttribute('data-action', 'delete-debt');
      deleteBtn.setAttribute('data-id', debt.id);
      deleteBtn.textContent = translate("delete");
      deleteBtn.addEventListener("click", () => handleDeleteDebt(debt.id));
      actionsGroup.appendChild(deleteBtn);
      
      if (showMarkPaid && !debt.is_paid) {
        const markPaidBtn = document.createElement('button');
        markPaidBtn.type = 'button';
        markPaidBtn.className = 'btn btn-outline-secondary btn-sm';
        markPaidBtn.setAttribute('data-action', 'mark-paid');
        markPaidBtn.setAttribute('data-id', debt.id);
        markPaidBtn.textContent = translate("markPaidShort") || translate("markPaid");
        markPaidBtn.title = translate("markPaid");
        markPaidBtn.setAttribute("aria-label", translate("markPaid"));
        markPaidBtn.addEventListener("click", () => handleMarkDebtPaid(debt.id));
        actionsGroup.appendChild(markPaidBtn);
      }
      
      actionsCell.appendChild(actionsGroup);
      row.appendChild(actionsCell);

      return row;
    },
    skeletonTemplate: () => {
      const skeleton = document.createElement('tr');
      skeleton.className = 'pagination-skeleton';
      const td = document.createElement('td');
      td.setAttribute('colspan', '8');
      td.style.cssText = 'padding: 1rem; text-align: center;';
      const div = document.createElement('div');
      div.style.cssText = 'background: linear-gradient(90deg, transparent, rgba(203,213,225,0.3), transparent); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; height: 40px; border-radius: 4px;';
      td.appendChild(div);
      skeleton.appendChild(td);
      return skeleton;
    },
    loadMoreText: translate("loadMore") || "Load More",
    errorText: translate("errorLoadMore") || "Error loading. Click to retry.",
    onError: (error) => {
      console.error("Debts pagination error:", error);
    },
    onLoadComplete: () => {
      // Recalculate and render total payment summary
      const instance = state.paginationInstances.debts;
      if (instance) {
        const allItems = instance.getItems();
        const totalPaymentSummary = allItems.reduce((summary, debt) => {
          const debtSummary = getDebtPaymentSummary(debt.id);
          summary.totalPaid += debtSummary.totalPaid;
          summary.totalDebt += debtSummary.debtAmount;
          return summary;
        }, { totalPaid: 0, totalDebt: 0 });
        
        const totalRemaining = normalizeCurrency(totalPaymentSummary.totalDebt - totalPaymentSummary.totalPaid);
        totalPaymentSummary.totalRemaining = Math.abs(totalRemaining) < 0.001 ? null : totalRemaining;
        
        renderTotalPaymentSummary(totalPaymentSummary);
      }
    }
  });
}

/**
 * Setup pagination for payments table (client-side pagination on filtered data)
 */
function setupPaymentsPagination() {
  if (!elements.paymentsTableBody && !elements.expensesPaymentsTableBody) return;

  const containers = [elements.paymentsTableBody, elements.expensesPaymentsTableBody].filter(Boolean);
  if (containers.length === 0) return;

  // Destroy existing instance if any
  if (state.paginationInstances.payments) {
    state.paginationInstances.payments.destroy();
  }

  // Use the first available container as the main one
  const mainContainer = containers[0];

  state.paginationInstances.payments = new InfiniteScrollPagination({
    container: mainContainer,
    itemsPerPage: 15,
    loadPage: async (page, limit) => {
      const activeExpenseType = getActiveExpenseType();
      const paymentsToFilter = getFilteredPayments();
      
      const filteredPayments = activeExpenseType
        ? paymentsToFilter.filter((payment) => {
            if (payment.type === activeExpenseType) return true;
            const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
            return debt && debt.type === activeExpenseType;
          })
        : paymentsToFilter;

      // Sort by payment_date descending
      filteredPayments.sort((a, b) => {
        const dateA = a.payment_date || '';
        const dateB = b.payment_date || '';
        return dateB.localeCompare(dateA);
      });

      // Paginate
      const from = (page - 1) * limit;
      const to = from + limit;
      const items = filteredPayments.slice(from, to);
      const hasMore = to < filteredPayments.length;

      return { items, hasMore };
    },
    renderItem: (payment) => {
      const tenant = state.tenants.find((t) => equalsId(t.id, payment.tenant_id));
      const debt = state.debts.find((d) => equalsId(d.id, payment.debt_id));
      const typeLabel = debt ? getDebtTypeLabel(debt) : (payment.type ? translate(`debt${capitalize(payment.type)}`) || payment.type : "-");

      const row = document.createElement('tr');
      row.classList.add('collapsed'); // Collapsed by default on mobile
      
      // Summary cell (shown when collapsed)
      const summaryCell = document.createElement('td');
      summaryCell.className = 'mobile-summary-cell';
      const tenantName = sanitize(tenant?.full_name || translate("unknown"));
      const shortDate = formatDateShortYear(payment.payment_date);
      const amount = formatCurrency(payment.amount);
      
      const summaryRow = document.createElement('div');
      summaryRow.className = 'summary-row';
      
      const mainInfo = document.createElement('div');
      mainInfo.className = 'summary-main-info';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'summary-name';
      nameSpan.textContent = tenantName;
      mainInfo.appendChild(nameSpan);
      
      const separator1 = document.createElement('span');
      separator1.textContent = '•';
      separator1.style.opacity = '0.5';
      mainInfo.appendChild(separator1);
      
      const typeSpan = document.createElement('span');
      typeSpan.className = 'summary-type';
      typeSpan.textContent = sanitize(typeLabel);
      mainInfo.appendChild(typeSpan);
      
      const separator2 = document.createElement('span');
      separator2.textContent = '•';
      separator2.style.opacity = '0.5';
      mainInfo.appendChild(separator2);
      
      const dateSpan = document.createElement('span');
      dateSpan.className = 'summary-date';
      dateSpan.textContent = shortDate;
      mainInfo.appendChild(dateSpan);
      
      summaryRow.appendChild(mainInfo);
      
      const amountSpan = document.createElement('span');
      amountSpan.className = 'summary-amount';
      amountSpan.textContent = amount;
      summaryRow.appendChild(amountSpan);
      
      summaryCell.appendChild(summaryRow);
      row.appendChild(summaryCell);
      
      // Tenant cell
      const tenantCell = document.createElement('td');
      tenantCell.className = 'desktop-cell';
      tenantCell.textContent = tenantName;
      row.appendChild(tenantCell);
      
      // Type cell
      const typeCell = document.createElement('td');
      typeCell.className = 'desktop-cell';
      typeCell.textContent = sanitize(typeLabel);
      row.appendChild(typeCell);
      
      // Amount cell
      const amountCell = document.createElement('td');
      amountCell.className = 'desktop-cell';
      amountCell.textContent = amount;
      row.appendChild(amountCell);
      
      // Due Date cell
      const dueDateCell = document.createElement('td');
      dueDateCell.className = 'desktop-cell';
      dueDateCell.textContent = debt ? formatDate(debt.due_date) : "-";
      row.appendChild(dueDateCell);
      
      // Period cell
      const periodCell = document.createElement('td');
      periodCell.className = 'desktop-cell';
      periodCell.textContent = debt ? formatPeriod(debt.due_date) : "-";
      row.appendChild(periodCell);
      
      // Payment Date cell
      const paymentDateCell = document.createElement('td');
      paymentDateCell.className = 'desktop-cell';
      paymentDateCell.textContent = formatDate(payment.payment_date);
      row.appendChild(paymentDateCell);
      
      // Method cell
      const methodCell = document.createElement('td');
      methodCell.className = 'desktop-cell';
      methodCell.textContent = sanitize(payment.method || "");
      row.appendChild(methodCell);
      
      // Reference cell
      const refCell = document.createElement('td');
      refCell.className = 'desktop-cell';
      refCell.textContent = sanitize(formatReferenceForDisplay(payment.reference));
      row.appendChild(refCell);
      
      // Actions cell
      const actionsCell = document.createElement('td');
      actionsCell.className = 'desktop-cell';
      actionsCell.setAttribute('data-collapsible', 'true');
      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'btn-group';
      
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-outline-secondary btn-sm';
      editBtn.setAttribute('data-action', 'edit-payment');
      editBtn.setAttribute('data-id', payment.id);
      editBtn.textContent = translate("edit");
      editBtn.addEventListener("click", () => startEditPayment(payment.id));
      actionsGroup.appendChild(editBtn);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-outline-danger btn-sm';
      deleteBtn.setAttribute('data-action', 'delete-payment');
      deleteBtn.setAttribute('data-id', payment.id);
      deleteBtn.textContent = translate("delete");
      deleteBtn.addEventListener("click", () => handleDeletePayment(payment.id));
      actionsGroup.appendChild(deleteBtn);
      
      actionsCell.appendChild(actionsGroup);
      row.appendChild(actionsCell);

      return row;
    },
    skeletonTemplate: () => {
      const skeleton = document.createElement('tr');
      skeleton.className = 'pagination-skeleton';
      const td = document.createElement('td');
      td.setAttribute('colspan', '9');
      td.style.cssText = 'padding: 1rem; text-align: center;';
      const div = document.createElement('div');
      div.style.cssText = 'background: linear-gradient(90deg, transparent, rgba(203,213,225,0.3), transparent); background-size: 200% 100%; animation: skeleton-shimmer 1.5s infinite; height: 40px; border-radius: 4px;';
      td.appendChild(div);
      skeleton.appendChild(td);
      return skeleton;
    },
    loadMoreText: translate("loadMore") || "Load More",
    errorText: translate("errorLoadMore") || "Error loading. Click to retry.",
    onError: (error) => {
      console.error("Payments pagination error:", error);
    },
    onLoadComplete: () => {
      // Sync to second container if it exists (expensesPaymentsTableBody)
      if (elements.expensesPaymentsTableBody && elements.expensesPaymentsTableBody !== mainContainer) {
        // Clone all rows from main container
        const rows = Array.from(mainContainer.children);
        clear(elements.expensesPaymentsTableBody);
        rows.forEach(row => {
          // Clone the row (except sentinel and load more button should not be duplicated)
          if (!row.hasAttribute('data-pagination-sentinel') && !row.hasAttribute('data-pagination-load-more')) {
            elements.expensesPaymentsTableBody.appendChild(row.cloneNode(true));
          }
        });
      }
    }
  });
}
