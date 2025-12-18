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

  tenantSetupLanguageToggle("tenantLanguageToggleBtn");
  tenantSetupThemeToggle("tenantThemeToggleBtn");

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
  
  // Mark current page in navigation
  markActiveNavButton('tenant-contracts.html');
}

function markActiveNavButton(currentPage) {
  const navLinks = document.querySelectorAll('.tenant-main-nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === 'tenant-contracts.html' && href.includes('tenant-contracts.html'))) {
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

async function tenantLoadContracts() {
  const user = (await tenantSupabase.auth.getUser())?.data?.user;
  if (!user) return;

  const tenantProfile = await tenantLoadProfileByEmail(user);
  const activeContainer = document.getElementById("tenantActiveContracts");
  const pastContainer = document.getElementById("tenantPastContracts");

  if (!tenantProfile) {
    if (activeContainer)
      activeContainer.textContent = tenantGetTranslation("tenantNoProfileLinked");
    if (pastContainer) pastContainer.textContent = "";
    return;
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

  const renderList = (items) => {
    if (!items.length) {
      return `<p>${tenantGetTranslation("tenantNoContracts")}</p>`;
    }
    return `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>${tenantGetTranslation("tenantContractApartment")}</th>
              <th>${tenantGetTranslation("tenantContractStartDate")}</th>
              <th>${tenantGetTranslation("tenantContractEndDate")}</th>
              <th>${tenantGetTranslation("tenantContractMonthlyRent")}</th>
              <th>${tenantGetTranslation("tenantContractStatus")}</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((c) => {
                const apt = apartmentsById[c.apartment_id] || {};
                const aptLabel = apt.name
                  ? `${apt.name} (${apt.address || "-"})`
                  : "-";
                const statusText = c.is_active 
                  ? tenantGetTranslation("tenantContractActive")
                  : tenantGetTranslation("tenantContractInactive");
                return `
                  <tr>
                    <td>${aptLabel}</td>
                    <td>${tenantFormatDate(c.start_date)}</td>
                    <td>${tenantFormatDate(c.end_date)}</td>
                    <td>${tenantFormatCurrency(c.monthly_rent)}</td>
                    <td>${statusText}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  if (activeContainer) {
    activeContainer.innerHTML = renderList(activeContracts);
  }
  if (pastContainer) {
    pastContainer.innerHTML = renderList(pastContracts);
  }
}

document.addEventListener("DOMContentLoaded", tenantContractsInit);


