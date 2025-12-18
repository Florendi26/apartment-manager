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
    profileDl.innerHTML = "<dd>Loading profile...</dd>";
  }
  if (accountDl) {
    accountDl.innerHTML = "<dd>Loading account...</dd>";
  }

  const tenantProfile = await tenantLoadProfileByEmail(user);

  if (!tenantProfile) {
    if (profileDl) {
      profileDl.innerHTML =
        "<dd>No tenant profile linked to your email yet.</dd>";
    }
  } else if (profileDl) {
    profileDl.innerHTML = `
      <dt>Full Name:</dt>
      <dd>${tenantProfile.full_name || "-"}</dd>
      <dt>Email:</dt>
      <dd>${tenantProfile.email || user.email || "-"}</dd>
      <dt>Phone:</dt>
      <dd>${tenantProfile.phone || "-"}</dd>
      <dt>Entry Date:</dt>
      <dd>${tenantFormatDate(tenantProfile.entry_date)}</dd>
    `;
  }

  if (accountDl) {
    const meta = user.user_metadata || {};
    accountDl.innerHTML = `
      <dt>Preferred Language:</dt>
      <dd>${meta.preferred_language || "en"}</dd>
      <dt>Preferred Currency:</dt>
      <dd>${meta.preferred_currency || "EUR"}</dd>
      <dt>Theme Mode:</dt>
      <dd>${meta.theme_mode || "light"}</dd>
      <dt>Role:</dt>
      <dd>${meta.role || "Tenant"}</dd>
      <dt>Date Joined:</dt>
      <dd>${tenantFormatDate(meta.date_joined)}</dd>
    `;
  }
}

document.addEventListener("DOMContentLoaded", tenantProfileInit);


