const TENANT_APARTMENTS_PAGE_SIZE = 15;
let tenantApartmentsAll = [];
let tenantApartmentsRenderedCount = 0;
let tenantApartmentsScrollAttached = false;

async function tenantApartmentsInit() {
  const user = await tenantCheckAuth();
  if (!user) return;

  // Update top navigation active state
  if (typeof updateTenantTopNavActive === "function") {
    updateTenantTopNavActive();
  }

  // Initialize photo viewer (doesn't need async)
  initializeTenantPhotoViewer();

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

  // Listen for language changes to reload apartments with new translations
  window.addEventListener("tenantLanguageChanged", () => {
    tenantLoadAvailableApartmentsWithPictures();
    // Update modal translations if it's open
    const modal = document.getElementById("apartmentDetailsModal");
    if (modal && modal.style.display !== "none") {
      tenantTranslateUI();
    }
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

  // Load apartments (this is the slow async operation)
  await tenantLoadAvailableApartmentsWithPictures();
}

function initializeTenantPhotoViewer() {
  const modal = document.getElementById("photoViewerModal");
  const closeBtn = document.getElementById("photoViewerClose");
  const prevBtn = document.getElementById("photoViewerPrev");
  const nextBtn = document.getElementById("photoViewerNext");
  const image = document.getElementById("photoViewerImage");
  const counter = document.getElementById("photoViewerCounter");
  
  if (!modal || !closeBtn || !image) return;
  
  let currentPhotos = [];
  let currentIndex = 0;
  let autoSwipeTimer = null;
  
  window.openPhotoViewer = function(photos, startIndex = 0) {
    if (!photos || photos.length === 0) return;
    currentPhotos = Array.isArray(photos) ? photos : [photos];
    currentIndex = Math.max(0, Math.min(startIndex, currentPhotos.length - 1));
    clearAutoSwipeTimer();
    updatePhotoViewer();
    // Remove hidden class and show modal
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  };
  
  function updatePhotoViewer() {
    if (currentPhotos.length === 0) return;
    
    // Add fade transition
    image.style.opacity = "0";
    setTimeout(() => {
      image.src = currentPhotos[currentIndex];
      image.style.opacity = "1";
    }, 150);
    
    counter.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
    prevBtn.style.display = currentPhotos.length > 1 ? "block" : "none";
    nextBtn.style.display = currentPhotos.length > 1 ? "block" : "none";
    
    // Update thumbnails
    updateThumbnails();
    
    // Reset zoom state when changing photos
    image.classList.remove("zoomed");
    clearAutoSwipeTimer();
  }
  
  function clearAutoSwipeTimer() {
    if (autoSwipeTimer) {
      clearTimeout(autoSwipeTimer);
      autoSwipeTimer = null;
    }
  }
  
  function startAutoSwipeTimer() {
    clearAutoSwipeTimer();
    
    // Only auto-swipe if there's more than one photo
    if (currentPhotos.length <= 1) return;
    
    autoSwipeTimer = setTimeout(() => {
      if (image.classList.contains("zoomed")) {
        showNext();
        // Restart timer for next photo if still zoomed
        if (image.classList.contains("zoomed")) {
          startAutoSwipeTimer();
        }
      }
    }, 3000);
  }
  
  function updateThumbnails() {
    const thumbnailsContainer = document.getElementById("photoViewerThumbnails");
    if (!thumbnailsContainer) return;
    
    // Clear container using DOM methods
    while (thumbnailsContainer.firstChild) {
      thumbnailsContainer.removeChild(thumbnailsContainer.firstChild);
    }
    
    if (currentPhotos.length <= 1) {
      return;
    }
    
    // Create thumbnails using DOM methods
    currentPhotos.forEach((photo, index) => {
      const thumbnailDiv = document.createElement('div');
      thumbnailDiv.className = `photo-thumbnail-item ${index === currentIndex ? 'active' : ''}`;
      thumbnailDiv.setAttribute('data-index', index);
      
      const thumbnailImg = document.createElement('img');
      thumbnailImg.src = photo;
      thumbnailImg.alt = `Thumbnail ${index + 1}`;
      thumbnailDiv.appendChild(thumbnailImg);
      
      thumbnailDiv.addEventListener("click", () => {
        clearAutoSwipeTimer();
        currentIndex = index;
        updatePhotoViewer();
        if (image.classList.contains("zoomed")) {
          startAutoSwipeTimer();
        }
      });
      
      thumbnailsContainer.appendChild(thumbnailDiv);
    });
  }
  
  // Add zoom functionality on image click
  if (image) {
    image.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasZoomed = image.classList.contains("zoomed");
      image.classList.toggle("zoomed");
      const isNowZoomed = image.classList.contains("zoomed");
      
      if (isNowZoomed && !wasZoomed) {
        // Just zoomed - start auto-swipe timer
        startAutoSwipeTimer();
      } else if (!isNowZoomed && wasZoomed) {
        // Just unzoomed - clear timer
        clearAutoSwipeTimer();
      }
    });
  }
  
  function closeViewer() {
    clearAutoSwipeTimer();
    image.classList.remove("zoomed");
    modal.style.display = "none";
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    currentPhotos = [];
    currentIndex = 0;
  }
  
  function showNext() {
    clearAutoSwipeTimer();
    currentIndex = (currentIndex + 1) % currentPhotos.length;
    updatePhotoViewer();
    // Restart timer if still zoomed
    if (image.classList.contains("zoomed")) {
      startAutoSwipeTimer();
    }
  }
  
  function showPrev() {
    clearAutoSwipeTimer();
    currentIndex = (currentIndex - 1 + currentPhotos.length) % currentPhotos.length;
    updatePhotoViewer();
    // Restart timer if still zoomed
    if (image.classList.contains("zoomed")) {
      startAutoSwipeTimer();
    }
  }
  
  if (closeBtn) closeBtn.addEventListener("click", closeViewer);
  if (prevBtn) prevBtn.addEventListener("click", showPrev);
  if (nextBtn) nextBtn.addEventListener("click", showNext);
  
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeViewer();
  });
  
  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "none") return;
    if (e.key === "Escape") {
      closeViewer();
      return;
    }
    if (e.key === "ArrowLeft") {
      showPrev();
      return;
    }
    if (e.key === "ArrowRight") {
      showNext();
      return;
    }
  });
}

function tenantGetTranslation(key) {
  const translations = window.TRANSLATIONS || {};
  const currentLang =
    (window.localStorage && window.localStorage.getItem("language")) || "en";
  const dictionary = translations[currentLang] || translations.en || {};
  return dictionary[key] || key;
}

function getPlaceholderImage() {
  // Create a simple SVG placeholder as data URI
  const svg = `
    <svg width="400" height="240" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="240" fill="#e5e7eb"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#6b7280" text-anchor="middle" dy=".3em">Apartment Photo</text>
    </svg>
  `.trim().replace(/\s+/g, ' ');
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

async function tenantLoadAvailableApartmentsWithPictures() {
  const grid = document.getElementById("tenantApartmentsGrid");
  if (!grid) return;
  
  // Clear container and show loading using DOM methods
  while (grid.firstChild) {
    grid.removeChild(grid.firstChild);
  }
  const loadingP = document.createElement('p');
  loadingP.textContent = tenantGetTranslation("tenantLoadingApartments");
  grid.appendChild(loadingP);

  // Load contracts and apartments in parallel for better performance
  const [contractsResult, apartmentsResult] = await Promise.all([
    tenantSupabase
    .from("contracts")
    .select("apartment_id")
      .eq("is_active", true),
    tenantSupabase
      .from("apartments")
      .select("id, name, address, photos")
      .eq("rental_status", "available")
      .order("created_at", { ascending: false })
  ]);

  if (contractsResult.error) {
    console.error("tenant apartments contracts", contractsResult.error);
    // Clear container and show error using DOM methods
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }
    const errorP = document.createElement('p');
    errorP.textContent = tenantGetTranslation("tenantFailedLoadApartments");
    grid.appendChild(errorP);
    return;
  }

  if (apartmentsResult.error) {
    console.error("tenant apartments", apartmentsResult.error);
    // Clear container and show error using DOM methods
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }
    const errorP = document.createElement('p');
    errorP.textContent = tenantGetTranslation("tenantFailedLoadApartments");
    grid.appendChild(errorP);
    return;
  }

  const takenIds = (contractsResult.data || [])
    .map((c) => c.apartment_id)
    .filter(Boolean);

  const allApartments = apartmentsResult.data || [];

  // Filter out apartments with active contracts
  const apartments = allApartments.filter(
    (apt) => !takenIds.includes(apt.id)
  );

  if (!apartments || apartments.length === 0) {
    // Clear container and show message using DOM methods
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }
    const noAptsP = document.createElement('p');
    noAptsP.textContent = tenantGetTranslation("tenantNoApartmentsAvailable");
    grid.appendChild(noAptsP);
    return;
  }

  const requestContractText = tenantGetTranslation("tenantRequestContract") || "Request Contract";
  const requestViewingText = tenantGetTranslation("tenantRequestViewing") || "Request Viewing";
  
  // Store apartments for lazy rendering
  tenantApartmentsAll = apartments;
  tenantApartmentsRenderedCount = 0;
  
  // Clear container using DOM methods
  while (grid.firstChild) {
    grid.removeChild(grid.firstChild);
  }
  
  // Render initial batch
  renderMoreTenantApartments(requestContractText, requestViewingText);
  
  // Attach infinite scroll to load more on scroll
  attachTenantApartmentsScroll(requestContractText, requestViewingText);
  
  // Initialize apartment details modal (once)
  initializeApartmentDetailsModal();
}

function renderMoreTenantApartments(requestContractText, requestViewingText) {
  const grid = document.getElementById("tenantApartmentsGrid");
  if (!grid || !tenantApartmentsAll || tenantApartmentsAll.length === 0) return;
  
  const start = tenantApartmentsRenderedCount;
  if (start >= tenantApartmentsAll.length) return;
  
  const end = Math.min(
    tenantApartmentsAll.length,
    tenantApartmentsRenderedCount + TENANT_APARTMENTS_PAGE_SIZE
  );
  const slice = tenantApartmentsAll.slice(start, end);
  
  const html = slice
    .map((apt) => {
      // Parse photos
      let photos = [];
      if (apt.photos) {
        try {
          photos = typeof apt.photos === "string"
            ? (apt.photos.startsWith("[") ? JSON.parse(apt.photos) : apt.photos.split(",").map((p) => p.trim()))
            : apt.photos;
        } catch (e) {
          photos = apt.photos.split(",").map((p) => p.trim());
        }
      }
      const placeholderImg = getPlaceholderImage();
      const allPhotos = photos.length > 0 ? photos : [placeholderImg];
      const address = apt.address || "-";
      const photoData = JSON.stringify(allPhotos).replace(/'/g, "&#39;");
      const apartmentData = JSON.stringify(apt).replace(/'/g, "&#39;");
      return `
        <div class="card apartment-card cursor-pointer" data-apartment-id="${apt.id}" data-apartment-data='${apartmentData}'>
          <div class="apartment-image-wrapper">
            <img src="${allPhotos[0]}" alt="${apt.name || "Apartment"}" class="apartment-image" data-photos='${photoData}' data-apartment-id="${apt.id}" loading="lazy" onerror="this.onerror=null; this.src='${placeholderImg}'" />
          </div>
          <div class="apartment-content">
            <h3>${apt.name || "Apartment"}</h3>
            <p class="form-help">${address}</p>
            <div class="apartment-actions">
              <button
                type="button"
                class="button-primary"
                data-apartment-id="${apt.id}"
                data-request-type="contract"
                onclick="event.stopPropagation();"
              >
                ${requestContractText}
              </button>
              <button
                type="button"
                class="button-secondary"
                data-apartment-id="${apt.id}"
                data-request-type="viewing"
                onclick="event.stopPropagation();"
              >
                ${requestViewingText}
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
  
  grid.insertAdjacentHTML("beforeend", html);
  tenantApartmentsRenderedCount = end;
  
  // Wire up handlers for newly added elements
  setupTenantApartmentCardHandlers();
  
  // Initialize image carousel for apartments with multiple photos
  initializeApartmentImageCarousels();
}

function attachTenantApartmentsScroll(requestContractText, requestViewingText) {
  if (tenantApartmentsScrollAttached) return;
  tenantApartmentsScrollAttached = true;
  
  window.addEventListener("scroll", () => {
    const grid = document.getElementById("tenantApartmentsGrid");
    if (!grid) return;
    
    const nearBottom =
      grid.getBoundingClientRect().bottom - window.innerHeight < 400;
    
    if (
      nearBottom &&
      tenantApartmentsRenderedCount < tenantApartmentsAll.length
    ) {
      renderMoreTenantApartments(requestContractText, requestViewingText);
    }
  });
}

function setupTenantApartmentCardHandlers() {
  const grid = document.getElementById("tenantApartmentsGrid");
  if (!grid) return;
  
  // Card click -> open details
  grid.querySelectorAll(".apartment-card").forEach((card) => {
    if (card.dataset.initialized === "true") return;
    card.dataset.initialized = "true";
    
    card.addEventListener("click", async (e) => {
      // Don't open modal if clicking on buttons
      if (e.target.closest("button")) return;
      
      const apartmentId =
        card.getAttribute("data-apartment-id") ||
        card.querySelector("[data-apartment-id]")?.getAttribute("data-apartment-id");
      
      if (apartmentId) {
        // Fetch full apartment details
        const { data: apartment, error } = await tenantSupabase
          .from("apartments")
          .select("*")
          .eq("id", apartmentId)
          .single();
        
        if (error) {
          console.error("Error fetching apartment details:", error);
          tenantNotify(
            "error",
            tenantGetTranslation("tenantFailedLoadApartmentDetails") ||
              "Failed to load apartment details."
          );
          return;
        }
        
        if (apartment) {
          showApartmentDetails(apartment);
          
          // Zoom map to apartment location if coordinates exist
          if (apartment.latitude && apartment.longitude) {
            const lat = parseFloat(apartment.latitude);
            const lng = parseFloat(apartment.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              // Check for global map variable (exposed from app.js)
              if (typeof window !== 'undefined' && window.apartmentMap) {
                try {
                  // Use flyTo for smooth animation
                  window.apartmentMap.flyTo([lat, lng], 15, {
                    animate: true,
                    duration: 1.0
                  });
                } catch (e) {
                  // Fallback to setView if flyTo fails
                  try {
                    window.apartmentMap.setView([lat, lng], 15);
                  } catch (e2) {
                    console.error("Error zooming map:", e2);
                  }
                }
              }
            }
          }
        }
      } else {
        // Fallback to stored data if no ID found
        const apartmentData = card.getAttribute("data-apartment-data");
        if (apartmentData) {
          try {
            const apt = JSON.parse(
              apartmentData.replace(/&#39;/g, "'")
            );
            showApartmentDetails(apt);
          } catch (e) {
            console.error("Error parsing apartment data:", e);
          }
        }
      }
    });
  });
  
  // Buttons -> create requests
  grid.querySelectorAll("button[data-apartment-id]").forEach((btn) => {
    if (btn.dataset.initialized === "true") return;
    btn.dataset.initialized = "true";
    
    btn.addEventListener("click", async () => {
      const apartmentId = btn.getAttribute("data-apartment-id");
      const requestType = btn.getAttribute("data-request-type");
      await tenantCreateRequest(apartmentId, requestType);
    });
  });
}

function initializeApartmentImageCarousels() {
  // Clean up any existing carousels first
  const existingImages = document.querySelectorAll(".apartment-image[data-photos]");
  existingImages.forEach((img) => {
    if (img._stopCarousel) {
      img._stopCarousel();
    }
  });
  
  const images = document.querySelectorAll(".apartment-image[data-photos]");
  
  images.forEach((img) => {
    try {
      const photos = JSON.parse(img.getAttribute("data-photos"));
      if (!photos || photos.length <= 1) return;
      
      let currentIndex = 0;
      let carouselInterval = null;
      
      const startCarousel = () => {
        if (carouselInterval) clearInterval(carouselInterval);
        
        carouselInterval = setInterval(() => {
          currentIndex = (currentIndex + 1) % photos.length;
          img.style.opacity = "0";
          
          setTimeout(() => {
            if (photos[currentIndex]) {
              img.src = photos[currentIndex];
              img.style.opacity = "1";
            } else {
              // If image fails, skip to next
              img.style.opacity = "1";
            }
          }, 150); // Half of transition time for smooth fade
        }, 1000); // Change image every 1 second
      };
      
      const stopCarousel = () => {
        if (carouselInterval) {
          clearInterval(carouselInterval);
          carouselInterval = null;
        }
      };
      
      // Start the carousel
      startCarousel();
      
      // Store functions on the image element
      img._startCarousel = startCarousel;
      img._stopCarousel = stopCarousel;
      
      // Pause on hover
      const wrapper = img.closest(".apartment-image-wrapper");
      if (wrapper) {
        wrapper.addEventListener("mouseenter", stopCarousel);
        wrapper.addEventListener("mouseleave", startCarousel);
      }
    } catch (e) {
      console.error("Error initializing carousel:", e);
    }
  });
}

function initializeApartmentDetailsModal() {
  const modal = document.getElementById("apartmentDetailsModal");
  const closeBtn = document.getElementById("apartmentDetailsClose");
  const requestContractBtn = document.getElementById("apartmentDetailsRequestContract");
  const requestViewingBtn = document.getElementById("apartmentDetailsRequestViewing");
  
  if (!modal || !closeBtn) return;
  
  let currentApartmentId = null;
  
  // Close modal
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    currentApartmentId = null;
  });
  
  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      modal.classList.add("hidden");
      document.body.style.overflow = "";
      currentApartmentId = null;
    }
  });
  
  // Request buttons
  if (requestContractBtn) {
    requestContractBtn.addEventListener("click", async () => {
      if (currentApartmentId) {
        await tenantCreateRequest(currentApartmentId, "contract");
        modal.style.display = "none";
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    });
  }
  
  if (requestViewingBtn) {
    requestViewingBtn.addEventListener("click", async () => {
      if (currentApartmentId) {
        await tenantCreateRequest(currentApartmentId, "viewing");
        modal.style.display = "none";
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    });
  }
  
  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display !== "none") {
      modal.style.display = "none";
      modal.classList.add("hidden");
      document.body.style.overflow = "";
      currentApartmentId = null;
    }
  });
  
  window.showApartmentDetails = function(apartment) {
    currentApartmentId = apartment.id;
    
    // Update translations first
    if (typeof tenantTranslateUI === 'function') {
      tenantTranslateUI();
    }
    
    // Parse photos
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
    
    const placeholderImg = getPlaceholderImage();
    if (photos.length === 0) photos = [placeholderImg];
    
    // Set title
    document.getElementById("apartmentDetailsTitle").textContent = apartment.name || "Apartment";
    
    // Set photos with click handlers using DOM methods
    const photosContainer = document.getElementById("apartmentDetailsPhotos");
    // Clear container using DOM methods
    while (photosContainer.firstChild) {
      photosContainer.removeChild(photosContainer.firstChild);
    }
    
    photos.forEach((photo, index) => {
      const img = document.createElement('img');
      img.src = photo;
      img.alt = `Apartment Photo ${index + 1}`;
      img.className = 'apartment-detail-photo';
      img.setAttribute('data-photo-index', index);
      img.loading = 'lazy';
      img.addEventListener('error', function() { this.src = placeholderImg; });
      img.addEventListener("click", () => {
        if (window.openPhotoViewer) {
          window.openPhotoViewer(photos, index);
        }
      });
      photosContainer.appendChild(img);
    });
    
    // Update translations first
    tenantTranslateUI();
    
    // Set property information
    document.getElementById("apartmentDetailsCategoryValue").textContent = "Apartment";
    document.getElementById("apartmentDetailsConditionValue").textContent = apartment.condition || tenantGetTranslation("apartmentDetailsNotSpecified");
    document.getElementById("apartmentDetailsRoomsValue").textContent = apartment.rooms || "-";
    document.getElementById("apartmentDetailsAreaValue").textContent = apartment.area ? `${apartment.area} m²` : "-";
    document.getElementById("apartmentDetailsAddressValue").textContent = apartment.address || "-";
    document.getElementById("apartmentDetailsMunicipalityValue").textContent = apartment.municipality || "-";
    document.getElementById("apartmentDetailsRentValue").textContent = apartment.monthly_rent ? `€${apartment.monthly_rent} / month` : "-";
    
    // Set features
    const featuresContainer = document.getElementById("apartmentDetailsFeaturesContainer");
    if (apartment.features) {
      try {
        const features = typeof apartment.features === 'string' 
          ? (apartment.features.startsWith('[') ? JSON.parse(apartment.features) : apartment.features.split(',').map(f => f.trim()))
          : apartment.features;
        
        // Clear container using DOM methods
        while (featuresContainer.firstChild) {
          featuresContainer.removeChild(featuresContainer.firstChild);
        }
        
        if (Array.isArray(features) && features.length > 0) {
          features.forEach(feature => {
            const badge = document.createElement('span');
            badge.className = 'feature-badge';
            badge.textContent = feature;
            featuresContainer.appendChild(badge);
          });
        } else {
          const badge = document.createElement('span');
          badge.className = 'feature-badge';
          badge.textContent = tenantGetTranslation("apartmentDetailsNoFeatures");
          featuresContainer.appendChild(badge);
        }
      } catch (e) {
        // Clear container using DOM methods
        while (featuresContainer.firstChild) {
          featuresContainer.removeChild(featuresContainer.firstChild);
        }
        const badge = document.createElement('span');
        badge.className = 'feature-badge';
        badge.textContent = tenantGetTranslation("apartmentDetailsNoFeatures");
        featuresContainer.appendChild(badge);
      }
    } else {
      // Clear container using DOM methods
      while (featuresContainer.firstChild) {
        featuresContainer.removeChild(featuresContainer.firstChild);
      }
      const badge = document.createElement('span');
      badge.className = 'feature-badge';
      badge.textContent = tenantGetTranslation("apartmentDetailsNoFeatures");
      featuresContainer.appendChild(badge);
    }
    
    // Set description
    document.getElementById("apartmentDetailsDescriptionValue").textContent = apartment.description || tenantGetTranslation("apartmentDetailsNoDescription");
    
    // Rental rules (when renting and landlord has filled them)
    const rentalRulesSection = document.getElementById("apartmentDetailsRentalRulesSection");
    const rentalRulesContainer = document.getElementById("apartmentDetailsRentalRulesContainer");
    if (rentalRulesSection && rentalRulesContainer) {
      let rules = {};
      if (apartment.rental_rules) {
        try {
          rules = typeof apartment.rental_rules === "string" ? JSON.parse(apartment.rental_rules) : apartment.rental_rules;
        } catch (e) { /* ignore */ }
      }
      const labelKeys = {
        heating_cooling: "rentalHeatingCooling",
        appliances: "rentalAppliances",
        pet_policy: "rentalPetPolicy",
        smoking: "rentalSmoking",
        min_rental_period: "rentalMinPeriod",
        contract_type: "rentalContractType",
        notice_period: "rentalNoticePeriod",
        repairs_paid_by: "rentalRepairsPaidBy",
        subletting_rules: "rentalSubletting",
        is_owner_direct: "rentalOwnerDirect"
      };
      const valueToKey = {
        heating_cooling: { ac: "rentalOptAc", radiator: "rentalOptRadiator", ac_radiator: "rentalOptAcRadiator", central_heating: "rentalOptCentralHeating", none: "rentalOptNone" },
        appliances: { full: "rentalOptFull", fridge_stove: "rentalOptFridgeStove", none: "rentalOptNone" },
        pet_policy: { allowed: "rentalOptAllowed", not_allowed: "rentalOptNotAllowed", negotiable: "rentalOptNegotiable" },
        smoking: { allowed: "rentalOptAllowed", not_allowed: "rentalOptNotAllowed" },
        min_rental_period: { "1_month": "rentalOpt1Month", "3_months": "rentalOpt3Months", "6_months": "rentalOpt6Months", "1_year": "rentalOpt1Year", "2_years": "rentalOpt2Years" },
        notice_period: { "30_days": "rentalOpt30Days", "60_days": "rentalOpt60Days", "90_days": "rentalOpt90Days" },
        contract_type: { written: "rentalOptWritten", notarized: "rentalOptNotarized", registered: "rentalOptRegistered" },
        repairs_paid_by: { landlord: "rentalOptLandlord", tenant: "rentalOptTenant", shared: "rentalOptShared" },
        subletting_rules: { not_allowed: "rentalOptNotAllowed", allowed_with_permission: "rentalOptAllowedWithPermission", allowed: "rentalOptAllowed" },
        is_owner_direct: { owner: "rentalOptOwner", agency: "rentalOptAgency" }
      };
      const groups = [
        { titleKey: "rentalRulesFeatures", keys: ["heating_cooling", "appliances", "pet_policy", "smoking", "min_rental_period"] },
        { titleKey: "rentalRulesLegal", keys: ["contract_type", "notice_period", "repairs_paid_by", "subletting_rules"], hintKey: "rentalRulesLegalHint" },
        { titleKey: "rentalRulesLandlord", keys: ["is_owner_direct"] }
      ];
      const hasAny = Object.keys(rules).some((k) => rules[k] != null && String(rules[k]).trim() !== "");
      if (hasAny) {
        while (rentalRulesContainer.firstChild) rentalRulesContainer.removeChild(rentalRulesContainer.firstChild);
        groups.forEach((g) => {
          const filled = g.keys.filter((k) => rules[k] != null && String(rules[k]).trim() !== "");
          if (filled.length === 0) return;
          const block = document.createElement("div");
          block.className = "rental-rules-block";
          const h4 = document.createElement("h4");
          h4.className = "rental-rules-block-title";
          h4.textContent = tenantGetTranslation(g.titleKey);
          block.appendChild(h4);
          if (g.hintKey) {
            const hintText = tenantGetTranslation(g.hintKey);
            if (hintText && hintText.trim() !== "") {
              const hint = document.createElement("p");
              hint.className = "rental-rules-hint";
              hint.textContent = hintText;
              block.appendChild(hint);
            }
          }
          const dl = document.createElement("dl");
          dl.className = "apartment-details-list";
          filled.forEach((k) => {
            const dt = document.createElement("dt");
            dt.textContent = tenantGetTranslation(labelKeys[k] || k) + ":";
            const dd = document.createElement("dd");
            let val = rules[k];
            const map = valueToKey[k];
            if (map && map[val]) val = tenantGetTranslation(map[val]);
            dd.textContent = (val != null && String(val).trim() !== "") ? val : "-";
            dl.appendChild(dt);
            dl.appendChild(dd);
          });
          block.appendChild(dl);
          rentalRulesContainer.appendChild(block);
        });
        rentalRulesSection.classList.remove("hidden");
      } else {
        rentalRulesSection.classList.add("hidden");
      }
    }
    
    // Show modal - remove hidden class and set display
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    
    // Scroll modal into view immediately to ensure it's visible
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Scroll to pictures section within the modal content immediately
    const modalContent = modal.querySelector('.apartment-details-content');
    if (photosContainer && modalContent) {
      // Wait for modal to render, then scroll to pictures
      requestAnimationFrame(() => {
        const photosTop = photosContainer.offsetTop;
        modalContent.scrollTo({ top: Math.max(0, photosTop - 20), behavior: 'smooth' });
      });
    }
  };
}

async function tenantCreateRequest(apartmentId, requestType) {
  const user = await tenantCheckAuth();
  if (!user) return;

  // Get tenant profile
  let tenantProfile = await tenantLoadProfileByEmail(user);
  
  // If tenant profile exists but doesn't have user_id, update it
  if (tenantProfile && !tenantProfile.user_id) {
    const { error: updateError } = await tenantSupabase
      .from("tenants")
      .update({ user_id: user.id })
      .eq("id", tenantProfile.id);
    
    if (!updateError) {
      tenantProfile.user_id = user.id;
    }
  }
  
  // If no tenant profile exists, create one automatically using auth user data
  if (!tenantProfile) {
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Tenant";
    const phone = user.user_metadata?.phone || null;
    
    const { data: newProfile, error: createError } = await tenantSupabase
      .from("tenants")
      .insert({
        full_name: fullName,
        email: user.email,
        phone: phone,
        user_id: user.id, // Link to auth user for RLS policies
        entry_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();
    
    if (createError) {
      console.error("Error creating tenant profile:", createError);
      tenantNotify("error", tenantGetTranslation("tenantRequestError") || "Failed to create tenant profile. Please try again.");
      return;
    }
    
    tenantProfile = newProfile;
    tenantNotify("success", "Tenant profile created successfully!");
  }

  // Get apartment details
  const { data: apartment, error: aptError } = await tenantSupabase
    .from("apartments")
    .select("id, name, landlord_id")
    .eq("id", apartmentId)
    .single();

  if (aptError || !apartment) {
    tenantNotify("error", tenantGetTranslation("tenantFailedLoadApartments") || "Failed to load apartment details.");
    return;
  }

  // Check if request already exists
  const { data: existingRequest } = await tenantSupabase
    .from("apartment_requests")
    .select("id, status")
    .eq("apartment_id", apartmentId)
    .eq("tenant_id", tenantProfile.id)
    .eq("request_type", requestType)
    .in("status", ["pending", "accepted"])
    .limit(1);

  if (existingRequest && existingRequest.length > 0) {
    const status = existingRequest[0].status === "accepted" ? "accepted" : "pending";
    tenantNotify("info", tenantGetTranslation(`tenantRequestAlready${status.charAt(0).toUpperCase() + status.slice(1)}`) || `You already have a ${status} request for this apartment.`);
    return;
  }

  // Create request
  const { error } = await tenantSupabase
    .from("apartment_requests")
    .insert({
      apartment_id: apartmentId,
      tenant_id: tenantProfile.id,
      landlord_id: apartment.landlord_id,
      request_type: requestType,
      status: "pending",
      message: requestType === "contract" 
        ? (tenantGetTranslation("tenantRequestContractMessage") || "Requesting to create a contract for this apartment.")
        : (tenantGetTranslation("tenantRequestViewingMessage") || "Requesting to view this apartment.")
    });

  if (error) {
    console.error("Error creating request:", error);
    tenantNotify("error", tenantGetTranslation("tenantRequestError") || "Failed to create request. Please try again.");
    return;
  }

  tenantNotify("success", tenantGetTranslation("tenantRequestCreated") || "Your request has been submitted successfully!");
}

document.addEventListener("DOMContentLoaded", tenantApartmentsInit);


