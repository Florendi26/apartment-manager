function tenantGetTranslation(key) {
  const translations = window.TRANSLATIONS || {};
  const currentLang =
    (window.localStorage && window.localStorage.getItem("language")) || "en";
  const dictionary = translations[currentLang] || translations.en || {};
  return dictionary[key] || key;
}

async function tenantContractsInit() {
  const user = await tenantCheckAuth();
  if (!user) return;

  // Update top navigation active state
  if (typeof updateTenantTopNavActive === "function") {
    updateTenantTopNavActive();
  }

  tenantSetupLanguageToggle("tenantLanguageToggleBtn");
  tenantSetupThemeToggle("tenantThemeToggleBtn");
  
  // Setup mobile menu toggle
  if (typeof setupMobileMenuToggle === "function") {
    setupMobileMenuToggle();
  }
  
  // Apply translations to top navigation
  if (typeof tenantTranslateUI === "function") {
    tenantTranslateUI();
  }

  // Listen for language changes to reload contracts with new translations
  window.addEventListener("tenantLanguageChanged", () => {
    tenantLoadContracts();
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

  await tenantLoadContracts();
}

async function tenantLoadContracts() {
  const user = (await tenantSupabase.auth.getUser())?.data?.user;
  if (!user) return;

  const tenantProfile = await tenantLoadProfileByEmail(user);
  const requestedContainer = document.getElementById("tenantRequestedContracts");
  const activeContainer = document.getElementById("tenantActiveContracts");
  const pastContainer = document.getElementById("tenantPastContracts");

  if (!tenantProfile) {
    if (requestedContainer)
      requestedContainer.textContent = tenantGetTranslation("tenantNoProfileLinked");
    if (activeContainer)
      activeContainer.textContent = tenantGetTranslation("tenantNoProfileLinked");
    if (pastContainer) pastContainer.textContent = "";
    return;
  }

  // Load contract requests (pending/accepted/rejected)
  const { data: requests, error: requestsError } = await tenantSupabase
    .from("apartment_requests")
    .select("id, apartment_id, request_type, message, status, created_at")
    .eq("tenant_id", tenantProfile.id)
    .eq("request_type", "contract")
    .order("created_at", { ascending: false });

  if (requestsError) {
    console.error("tenant contract requests", requestsError);
  }

  // Load apartment details for requests
  const requestApartmentIds = (requests || [])
    .map(r => r.apartment_id)
    .filter(Boolean);

  let requestApartmentsById = {};
  if (requestApartmentIds.length > 0) {
    const { data: requestApartments } = await tenantSupabase
      .from("apartments")
      .select("id, name, address")
      .in("id", requestApartmentIds);
    
    if (requestApartments) {
      requestApartments.forEach(a => {
        requestApartmentsById[a.id] = a;
      });
    }
  }

  // Render requested contracts
  if (requestedContainer) {
    while (requestedContainer.firstChild) {
      requestedContainer.removeChild(requestedContainer.firstChild);
    }

    if (!requests || requests.length === 0) {
      const p = document.createElement('p');
      p.textContent = tenantGetTranslation("tenantNoRequestedContracts") || "No contract requests yet.";
      requestedContainer.appendChild(p);
    } else {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      
      const table = document.createElement('table');
      
      // Create thead
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      const headers = [
        tenantGetTranslation("tenantContractApartment") || "Apartment",
        tenantGetTranslation("requestDate") || "Request Date",
        tenantGetTranslation("requestStatus") || "Status",
        tenantGetTranslation("requestMessage") || "Message"
      ];
      
      headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Create tbody
      const tbody = document.createElement('tbody');
      
      requests.forEach((r) => {
        const apt = requestApartmentsById[r.apartment_id] || {};
        const aptLabel = apt.name
          ? `${apt.name} (${apt.address || "-"})`
          : "-";
        
        const statusText = r.status === "pending"
          ? (tenantGetTranslation("requestStatusPending") || "Pending")
          : r.status === "accepted"
          ? (tenantGetTranslation("requestStatusAccepted") || "Accepted")
          : (tenantGetTranslation("requestStatusRejected") || "Rejected");
        
        const statusClass = r.status === "pending" ? "pending" : r.status === "accepted" ? "accepted" : "rejected";
        
        const tr = document.createElement('tr');
        
        const aptCell = document.createElement('td');
        aptCell.textContent = aptLabel;
        tr.appendChild(aptCell);
        
        const dateCell = document.createElement('td');
        dateCell.textContent = tenantFormatDate(r.created_at);
        tr.appendChild(dateCell);
        
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge ${statusClass === 'pending' ? 'bg-warning' : statusClass === 'accepted' ? 'bg-success' : 'bg-danger'}`;
        statusBadge.textContent = statusText;
        statusCell.appendChild(statusBadge);
        tr.appendChild(statusCell);
        
        const messageCell = document.createElement('td');
        messageCell.textContent = r.message || "-";
        tr.appendChild(messageCell);
        
        tbody.appendChild(tr);
      });
      
      table.appendChild(tbody);
      wrapper.appendChild(table);
      requestedContainer.appendChild(wrapper);
    }
  }

  const { data: contracts, error } = await tenantSupabase
    .from("contracts")
    .select("id, apartment_id, start_date, end_date, monthly_rent, is_active")
    .eq("tenant_id", tenantProfile.id)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("tenant contracts", error);
    if (activeContainer)
      activeContainer.textContent = tenantGetTranslation("tenantFailedLoadContracts");
    if (pastContainer) pastContainer.textContent = "";
    return;
  }

  if (!contracts || contracts.length === 0) {
    if (activeContainer)
      activeContainer.textContent = tenantGetTranslation("tenantNoContractsYet");
    if (pastContainer) pastContainer.textContent = "";
    return;
  }

  const apartmentIds = Array.from(
    new Set(contracts.map((c) => c.apartment_id).filter(Boolean))
  );

  let apartmentsById = {};
  if (apartmentIds.length > 0) {
    const { data: apartments, error: apartmentsError } = await tenantSupabase
      .from("apartments")
      .select("id, name, address")
      .in("id", apartmentIds);
    if (!apartmentsError && apartments) {
      apartments.forEach((a) => {
        apartmentsById[a.id] = a;
      });
    }
  }

  const activeContracts = contracts.filter((c) => c.is_active);
  const pastContracts = contracts.filter((c) => !c.is_active);

  const renderList = (container, items) => {
    if (!container) return;
    
    // Clear container using DOM methods
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    if (!items.length) {
      const p = document.createElement('p');
      p.textContent = tenantGetTranslation("tenantNoContracts");
      container.appendChild(p);
      return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    
    const table = document.createElement('table');
    
    // Create thead
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = [
      tenantGetTranslation("tenantContractApartment"),
      tenantGetTranslation("tenantContractStartDate"),
      tenantGetTranslation("tenantContractEndDate"),
      tenantGetTranslation("tenantContractMonthlyRent"),
      tenantGetTranslation("tenantContractStatus")
    ];
    
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create tbody
    const tbody = document.createElement('tbody');
    
    items.forEach((c) => {
      const apt = apartmentsById[c.apartment_id] || {};
      const aptLabel = apt.name
        ? `${apt.name} (${apt.address || "-"})`
        : "-";
      const statusText = c.is_active 
        ? tenantGetTranslation("tenantContractActive")
        : tenantGetTranslation("tenantContractInactive");
      
      const tr = document.createElement('tr');
      
      const aptCell = document.createElement('td');
      aptCell.textContent = aptLabel;
      tr.appendChild(aptCell);
      
      const startCell = document.createElement('td');
      startCell.textContent = tenantFormatDate(c.start_date);
      tr.appendChild(startCell);
      
      const endCell = document.createElement('td');
      endCell.textContent = tenantFormatDate(c.end_date);
      tr.appendChild(endCell);
      
      const rentCell = document.createElement('td');
      rentCell.textContent = tenantFormatCurrency(c.monthly_rent);
      tr.appendChild(rentCell);
      
      const statusCell = document.createElement('td');
      statusCell.textContent = statusText;
      tr.appendChild(statusCell);
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  };

  renderList(activeContainer, activeContracts);
  renderList(pastContainer, pastContracts);
}

document.addEventListener("DOMContentLoaded", tenantContractsInit);


