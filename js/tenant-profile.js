async function tenantProfileInit() {
  const user = await tenantCheckAuth();
  if (!user) return;

  tenantSetupThemeToggle("tenantThemeToggleBtn");

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

  await tenantLoadProfilePage(user);
}

async function tenantLoadProfilePage(user) {
  const profileDl = document.getElementById("tenantProfileDetails");
  const accountDl = document.getElementById("tenantAccountDetails");

  if (profileDl) {
    // Clear container using DOM methods
    while (profileDl.firstChild) {
      profileDl.removeChild(profileDl.firstChild);
    }
    const loadingDd = document.createElement('dd');
    loadingDd.textContent = "Loading profile...";
    profileDl.appendChild(loadingDd);
  }
  if (accountDl) {
    // Clear container using DOM methods
    while (accountDl.firstChild) {
      accountDl.removeChild(accountDl.firstChild);
    }
    const loadingDd = document.createElement('dd');
    loadingDd.textContent = "Loading account...";
    accountDl.appendChild(loadingDd);
  }

  const tenantProfile = await tenantLoadProfileByEmail(user);

  if (!tenantProfile) {
    if (profileDl) {
      // Clear container using DOM methods
      while (profileDl.firstChild) {
        profileDl.removeChild(profileDl.firstChild);
      }
      const dd = document.createElement('dd');
      dd.textContent = "No tenant profile linked to your email yet.";
      profileDl.appendChild(dd);
    }
  } else if (profileDl) {
    // Clear container using DOM methods
    while (profileDl.firstChild) {
      profileDl.removeChild(profileDl.firstChild);
    }
    
    function addDefinitionItem(dtText, ddText) {
      const dt = document.createElement('dt');
      dt.textContent = dtText;
      profileDl.appendChild(dt);
      const dd = document.createElement('dd');
      dd.textContent = ddText;
      profileDl.appendChild(dd);
    }
    
    addDefinitionItem("Full Name:", tenantProfile.full_name || "-");
    addDefinitionItem("Email:", tenantProfile.email || user.email || "-");
    addDefinitionItem("Phone:", tenantProfile.phone || "-");
    addDefinitionItem("Entry Date:", tenantFormatDate(tenantProfile.entry_date));
  }

  if (accountDl) {
    // Clear container using DOM methods
    while (accountDl.firstChild) {
      accountDl.removeChild(accountDl.firstChild);
    }
    
    const meta = user.user_metadata || {};
    
    function addDefinitionItem(dtText, ddText) {
      const dt = document.createElement('dt');
      dt.textContent = dtText;
      accountDl.appendChild(dt);
      const dd = document.createElement('dd');
      dd.textContent = ddText;
      accountDl.appendChild(dd);
    }
    
    addDefinitionItem("Preferred Language:", meta.preferred_language || "en");
    addDefinitionItem("Preferred Currency:", meta.preferred_currency || "EUR");
    addDefinitionItem("Theme Mode:", meta.theme_mode || "light");
    addDefinitionItem("Role:", meta.role || "Tenant");
    addDefinitionItem("Date Joined:", tenantFormatDate(meta.date_joined));
  }
}

document.addEventListener("DOMContentLoaded", tenantProfileInit);


