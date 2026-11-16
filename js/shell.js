(function () {
  const mount = document.getElementById("app-shell");
  if (!mount) return;

  const langId = mount.dataset.lang || "languageToggleBtn";
  const menu = mount.dataset.menu === "1"
    ? '<button type="button" id="menuToggleBtn" class="menu-toggle-btn" aria-label="Toggle Menu"></button>'
    : "";

  const bar = document.createElement("div");
  bar.className = "logo-bar";
  bar.innerHTML =
    '<div class="logo-link">' +
      '<img src="logo/logo.svg" alt="" class="logo-image">' +
      '<div class="logo-text">' +
        '<span class="logo-text-en" data-i18n="logoTextEn">Apartment for you</span>' +
        '<span class="logo-text-sq" data-i18n="logoTextSq">Banesë për Ty</span>' +
      "</div>" +
    "</div>" +
    '<div class="logo-bar-controls">' +
      '<button type="button" id="' + langId + '" class="icon-button" aria-label="Toggle Language">En</button>' +
      '<label class="theme-switch" title="Toggle Theme">' +
        '<input type="checkbox" id="themeToggleSwitch" class="theme-switch-input" aria-label="Toggle Theme">' +
        '<span class="theme-switch-container"><span class="theme-switch-toggle"></span></span>' +
      "</label>" +
      menu +
    "</div>";

  mount.replaceWith(bar);
})();
