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
      
      if (requestType === "contract") {
        // For contract requests, show the preview modal
        const { data: apartment, error } = await tenantSupabase
          .from("apartments")
          .select("*")
          .eq("id", apartmentId)
          .single();
        
        if (error || !apartment) {
          tenantNotify("error", tenantGetTranslation("tenantFailedLoadApartmentDetails") || "Failed to load apartment details.");
          return;
        }
        
        showContractPreview(apartment);
      } else {
        // For viewing requests, create directly
        await tenantCreateRequest(apartmentId, requestType);
      }
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
  let currentApartment = null;
  
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
      if (currentApartmentId && currentApartment) {
        // Show contract preview modal
        showContractPreview(currentApartment);
        // Close apartment details modal
        modal.style.display = "none";
        modal.classList.add("hidden");
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
    currentApartment = apartment;
    
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

async function tenantCreateRequest(apartmentId, requestType, contractPreferences = null) {
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

  // Build message with contract preferences if provided
  let message = requestType === "contract" 
    ? (tenantGetTranslation("tenantRequestContractMessage") || "Requesting to create a contract for this apartment.")
    : (tenantGetTranslation("tenantRequestViewingMessage") || "Requesting to view this apartment.");
  
  // If contract preferences are provided, add them to message as JSON
  if (contractPreferences && requestType === "contract") {
    message = JSON.stringify({
      base_message: message,
      preferences: contractPreferences
    });
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
      message: message
    });

  if (error) {
    console.error("Error creating request:", error);
    tenantNotify("error", tenantGetTranslation("tenantRequestError") || "Failed to create request. Please try again.");
    return;
  }

  tenantNotify("success", tenantGetTranslation("tenantRequestCreated") || "Your request has been submitted successfully!");
}

// Contract Preview Modal with Expiration Countdown
let contractPreviewCountdown = null;
let contractPreviewApartment = null;
let currentTenantProfile = null;
let currentLandlordInfo = null;

async function showContractPreview(apartment) {
  contractPreviewApartment = apartment;
  const modal = document.getElementById("contractPreviewModal");
  const body = document.getElementById("contractPreviewBody");
  const submitBtn = document.getElementById("contractPreviewSubmit");
  const cancelBtn = document.getElementById("contractPreviewCancel");
  const closeBtn = document.getElementById("contractPreviewClose");
  const countdownTimer = document.getElementById("countdownTimer");
  const countdownContainer = document.getElementById("contractCountdown");
  
  if (!modal || !body) return;
  
  // Get current user and tenant profile
  const user = await tenantCheckAuth();
  if (!user) return;
  
  // Load tenant profile
  currentTenantProfile = await tenantLoadProfileByEmail(user);
  if (!currentTenantProfile) {
    // Create basic profile from auth data
    currentTenantProfile = {
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Qiramarrësi",
      email: user.email,
      phone: user.user_metadata?.phone || null
    };
  }
  
  // Load landlord info (use maybeSingle to avoid 404 when no row or RLS blocks)
  if (apartment.landlord_id) {
    let landlordRes = await tenantSupabase
      .from("landlords")
      .select("full_name, email, phone")
      .eq("id", apartment.landlord_id)
      .maybeSingle();
    let landlord = landlordRes.data;
    if (!landlord && landlordRes.error) {
      landlordRes = await tenantSupabase
        .from("landlords")
        .select("full_name, email, phone")
        .eq("user_id", apartment.landlord_id)
        .maybeSingle();
      landlord = landlordRes.data;
    }
    currentLandlordInfo = landlord || { full_name: "[Pronari]" };
  } else {
    currentLandlordInfo = { full_name: "[Pronari]" };
  }
  
  // Generate contract preview content
  const today = new Date();
  const formattedDate = today.toLocaleDateString('sq-AL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Parse rental rules if available
  let rentalRules = {};
  if (apartment.rental_rules) {
    try {
      rentalRules = typeof apartment.rental_rules === "string" ? JSON.parse(apartment.rental_rules) : apartment.rental_rules;
    } catch (e) { /* ignore */ }
  }
  
  // Parse features
  let features = [];
  if (apartment.features) {
    try {
      features = typeof apartment.features === 'string' 
        ? (apartment.features.startsWith('[') ? JSON.parse(apartment.features) : apartment.features.split(',').map(f => f.trim()))
        : apartment.features;
    } catch (e) {
      features = [];
    }
  }
  
  const contractHTML = `
    <div class="contract-a4-document" id="contractDocument">
      <div class="contract-a4-page">
        <!-- Contract Header with Logo -->
        <div class="contract-a4-header">
          <div class="contract-a4-logo">
            <img src="logo/logo.svg" alt="Logo" class="contract-logo-img" />
            <div class="contract-logo-text">
              <span class="contract-logo-en">Apartment for you</span>
              <span class="contract-logo-sq">Banesë për Ty</span>
            </div>
          </div>
          <div class="contract-a4-title">
            <h1>KONTRATË QIRAJE</h1>
            <p class="contract-subtitle">Rental Agreement / Marrëveshje Qiraje</p>
            <p class="contract-date-line">Nr. Ref: ${Date.now()}</p>
            <p class="contract-date-line">Data: ${formattedDate}</p>
          </div>
        </div>
        
        <!-- Parties Section -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 1 - PALËT KONTRAKTUESE</h2>
          <div class="contract-parties-grid">
            <div class="contract-party">
              <h3>QIRADHËNËSI (Pronari)</h3>
              <table class="contract-info-table">
                <tr>
                  <td class="label">Emri i plotë:</td>
                  <td class="value">${currentLandlordInfo.full_name || '[Do të plotësohet]'}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${currentLandlordInfo.email || '[Do të plotësohet]'}</td>
                </tr>
                <tr>
                  <td class="label">Telefoni:</td>
                  <td class="value">${currentLandlordInfo.phone || '[Do të plotësohet]'}</td>
                </tr>
              </table>
            </div>
            <div class="contract-party">
              <h3>QIRAMARRËSI (Tenant)</h3>
              <table class="contract-info-table">
                <tr>
                  <td class="label">Emri i plotë:</td>
                  <td class="value">${currentTenantProfile.full_name || '[Emri juaj]'}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${currentTenantProfile.email || user.email}</td>
                </tr>
                <tr>
                  <td class="label">Telefoni:</td>
                  <td class="value">${currentTenantProfile.phone || '[Do të plotësohet]'}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Property Section -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 2 - OBJEKTI I QIRAJES</h2>
          <div class="contract-property-details">
            <table class="contract-property-table">
              <tr>
                <td class="label">Emri i pronës:</td>
                <td class="value"><strong>${apartment.name || 'N/A'}</strong></td>
                <td class="label">Lloji:</td>
                <td class="value">Banesë</td>
              </tr>
              <tr>
                <td class="label">Adresa:</td>
                <td class="value" colspan="3">${apartment.address || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Komuna:</td>
                <td class="value">${apartment.municipality || '-'}</td>
                <td class="label">Lagjia:</td>
                <td class="value">${apartment.neighborhood || '-'}</td>
              </tr>
              <tr>
                <td class="label">Sipërfaqja:</td>
                <td class="value">${apartment.area ? apartment.area + ' m²' : '-'}</td>
                <td class="label">Nr. dhomave:</td>
                <td class="value">${apartment.rooms || '-'}</td>
              </tr>
              <tr>
                <td class="label">Gjendja:</td>
                <td class="value">${apartment.condition || '-'}</td>
                <td class="label">Kati:</td>
                <td class="value">${apartment.floor || '-'}</td>
              </tr>
            </table>
            ${features.length > 0 ? `
              <div class="contract-features">
                <span class="label">Veçoritë: </span>
                <span class="value">${features.join(', ')}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Financial Terms Section -->
        <div class="contract-a4-section contract-highlight-section">
          <h2 class="contract-section-title">NENI 3 - KUSHTET FINANCIARE</h2>
          <div class="contract-financial-box">
            <div class="contract-rent-display">
              <span class="rent-label">QIRAJA MUJORE</span>
              <span class="rent-amount">${apartment.monthly_rent ? apartment.monthly_rent.toFixed(2) : '0.00'} EUR</span>
              <span class="rent-period">/ muaj</span>
            </div>
            <table class="contract-financial-table">
              <tr>
                <td class="label">Data e fillimit:</td>
                <td class="value" id="contractStartDateDisplay">Do të përcaktohet nga formulari</td>
              </tr>
              <tr>
                <td class="label">Data e mbarimit:</td>
                <td class="value" id="contractEndDateDisplay">Do të përcaktohet nga formulari</td>
              </tr>
              <tr>
                <td class="label">Depozita:</td>
                <td class="value" id="contractDepositDisplay">Do të përcaktohet nga formulari</td>
              </tr>
              <tr>
                <td class="label">Mënyra e pagesës:</td>
                <td class="value" id="contractPaymentMethodDisplay">Do të përcaktohet nga formulari</td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Landlord Obligations -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 4 - OBLIGIMET E QIRADHËNËSIT</h2>
          <ol class="contract-obligations-list">
            <li>Qiradhënësi është i detyruar të sigurojë banesën në gjendje të përdorshme dhe të mirëmbajtur.</li>
            <li>Qiradhënësi duhet të kryejë riparimet e nevojshme strukturore dhe të sistemeve kryesore.</li>
            <li>Qiradhënësi duhet të respektojë privatësinë e qiramarrësit dhe të njoftojë para vizitave.</li>
            <li>Qiradhënësi garanton se prona është e lirë nga çdo barrë juridike dhe ka të drejtë ta jap me qira.</li>
            <li>Qiradhënësi duhet të sigurojë dokumentacionin e nevojshëm për regjistrimin e kontratës.</li>
          </ol>
        </div>
        
        <!-- Tenant Obligations -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 5 - OBLIGIMET E QIRAMARRËSIT</h2>
          <ol class="contract-obligations-list">
            <li>Qiramarrësi është i detyruar të paguajë qiranë brenda datës <strong>5</strong> të çdo muaji.</li>
            <li>Qiramarrësi duhet të mbajë banesën në gjendje të mirë dhe të përkujdeset për mirëmbajtjen e përditshme.</li>
            <li>Qiramarrësi nuk mund të nën-qirajë banesën pa pëlqimin me shkrim të qiradhënësit.</li>
            <li>Qiramarrësi duhet të njoftojë qiradhënësin menjëherë për çdo dëmtim ose defekt.</li>
            <li>Qiramarrësi duhet të respektojë rregullat e bashkësisë së banimit dhe fqinjëve.</li>
            <li>Qiramarrësi duhet të paguajë faturat e shërbimeve komunale (ujë, rrymë, ngrohje, etj.).</li>
          </ol>
        </div>
        
        ${Object.keys(rentalRules).length > 0 ? `
        <!-- Rental Rules Section -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 6 - RREGULLAT E VEÇANTA TË QIRAJES</h2>
          <table class="contract-rules-table">
            ${rentalRules.pet_policy ? `<tr><td class="label">Politika për kafshë:</td><td class="value">${getRuleTranslation('pet_policy', rentalRules.pet_policy)}</td></tr>` : ''}
            ${rentalRules.smoking ? `<tr><td class="label">Duhani:</td><td class="value">${getRuleTranslation('smoking', rentalRules.smoking)}</td></tr>` : ''}
            ${rentalRules.notice_period ? `<tr><td class="label">Periudha e njoftimit:</td><td class="value">${getRuleTranslation('notice_period', rentalRules.notice_period)}</td></tr>` : ''}
            ${rentalRules.min_rental_period ? `<tr><td class="label">Periudha minimale:</td><td class="value">${getRuleTranslation('min_rental_period', rentalRules.min_rental_period)}</td></tr>` : ''}
            ${rentalRules.repairs_paid_by ? `<tr><td class="label">Riparimet paguhen nga:</td><td class="value">${getRuleTranslation('repairs_paid_by', rentalRules.repairs_paid_by)}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}
        
        <!-- Termination Section -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 7 - PËRFUNDIMI I KONTRATËS</h2>
          <ol class="contract-obligations-list">
            <li>Kontrata mund të përfundojë me marrëveshje të ndërsjellë të palëve.</li>
            <li>Secila palë mund të përfundojë kontratën me njoftim paraprak prej 30 ditësh.</li>
            <li>Në rast shkeljeje të rëndë të kontratës, pala e dëmtuar ka të drejtë ta përfundojë kontratën menjëherë.</li>
            <li>Pas përfundimit, qiramarrësi duhet të dorëzojë banesën në gjendjen e fillimit, përveç konsumimit normal.</li>
            <li>Depozita do të kthehet brenda 15 ditëve pas dorëzimit të banesës, pas zbritjes së detyrimeve eventuale.</li>
          </ol>
        </div>
        
        <!-- Final Provisions -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 8 - DISPOZITA PËRFUNDIMTARE</h2>
          <ol class="contract-obligations-list">
            <li>Kjo kontratë hyn në fuqi nga data e nënshkrimit nga të dyja palët.</li>
            <li>Çdo ndryshim i kësaj kontrate duhet të bëhet me shkrim dhe të nënshkruhet nga të dyja palët.</li>
            <li>Për çdo mosmarrëveshje, palët do të përpiqen të zgjidhin çështjen me marrëveshje. Në mungesë marrëveshjeje, çështja do t'i dërgohet gjykatës kompetente.</li>
            <li>Kontrata është hartuar në dy kopje origjinale, nga një për secilën palë.</li>
          </ol>
        </div>
        
        <!-- Signatures Section -->
        <div class="contract-a4-signatures">
          <div class="contract-signature-box">
            <div class="signature-title">QIRADHËNËSI</div>
            <div class="signature-line"></div>
            <div class="signature-name">${currentLandlordInfo.full_name || '[Emri i pronarit]'}</div>
            <div class="signature-date">Data: _____________</div>
          </div>
          <div class="contract-signature-box">
            <div class="signature-title">QIRAMARRËSI</div>
            <div class="signature-line"></div>
            <div class="signature-name">${currentTenantProfile.full_name || '[Emri juaj]'}</div>
            <div class="signature-date">Data: _____________</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="contract-a4-footer">
          <p>Ky dokument është gjeneruar automatikisht nga sistemi "Banesë për Ty" - Apartment Management System</p>
          <p>Kontrata do të jetë e vlefshme vetëm pasi të pranohet nga pronari dhe të nënshkruhet nga të dyja palët.</p>
        </div>
      </div>
    </div>
  `;
  
  body.innerHTML = contractHTML;
  
  // Add print button functionality
  setupContractPrintButton();
  
  // Update countdown text to show expiration time
  if (countdownContainer) {
    const countdownText = countdownContainer.querySelector('span:first-of-type');
    if (countdownText) {
      countdownText.textContent = tenantGetTranslation("contractExpirationText") || "Kjo kërkesë do të skadojë pas:";
    }
  }
  
  // Calculate expiration time (60 minutes from now)
  const expirationTime = new Date().getTime() + (60 * 60 * 1000); // 60 minutes in milliseconds
  let remainingTime = 60 * 60; // 60 minutes in seconds
  
  // Function to update countdown display
  const updateCountdown = () => {
    const now = new Date().getTime();
    const timeLeft = Math.max(0, Math.floor((expirationTime - now) / 1000));
    
    if (timeLeft <= 0) {
      // Request expired
      if (countdownTimer) {
        countdownTimer.textContent = '00:00';
      }
      if (countdownContainer) {
        countdownContainer.style.backgroundColor = '#fee2e2';
        countdownContainer.style.borderColor = '#ef4444';
        countdownContainer.style.color = '#991b1b';
      }
      clearInterval(contractPreviewCountdown);
      return;
    }
    
    remainingTime = timeLeft;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    if (countdownTimer) {
      countdownTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Change color when less than 10 minutes remaining
    if (countdownContainer && timeLeft < 600) {
      countdownContainer.style.backgroundColor = '#fef3c7';
      countdownContainer.style.borderColor = '#f59e0b';
      countdownContainer.style.color = '#92400e';
    }
  };
  
  // Initial update
  updateCountdown();
  
  // Clear any existing countdown
  if (contractPreviewCountdown) {
    clearInterval(contractPreviewCountdown);
  }
  
  // Start countdown (update every second)
  contractPreviewCountdown = setInterval(updateCountdown, 1000);
  
  // Initialize form fields
  const form = document.getElementById("contractRequestForm");
  const startDateInput = document.getElementById("contractStartDate");
  const endDateInput = document.getElementById("contractEndDate");
  const depositSelect = document.getElementById("contractDeposit");
  const customDepositField = document.getElementById("customDepositField");
  const customDepositAmount = document.getElementById("customDepositAmount");
  
  // Set today as default start date
  if (startDateInput) {
    const today = new Date();
    startDateInput.value = today.toISOString().split('T')[0];
    startDateInput.min = today.toISOString().split('T')[0];
  }
  
  // Set minimum date for end date
  if (endDateInput && startDateInput) {
    startDateInput.addEventListener('change', () => {
      endDateInput.min = startDateInput.value;
    });
  }
  
  // Deposit calculation function (defined before use)
  const updateDepositCalculation = () => {
    const depositCalculation = document.getElementById("depositCalculation");
    const calculatedDepositAmount = document.getElementById("calculatedDepositAmount");
    const monthlyRent = apartment.monthly_rent || 0;
    
    if (!depositCalculation || !calculatedDepositAmount) return;
    
    const depositType = depositSelect?.value || 'half_rent';
    let depositAmount = 0;
    
    if (depositType === 'full_rent') {
      depositAmount = monthlyRent;
    } else if (depositType === 'half_rent') {
      depositAmount = monthlyRent / 2;
    } else if (depositType === 'custom') {
      depositAmount = parseFloat(customDepositAmount?.value || 0);
    }
    
    calculatedDepositAmount.textContent = `${depositAmount.toFixed(2)} EUR`;
  };
  
  // Handle deposit selection
  if (depositSelect && customDepositField) {
    depositSelect.addEventListener('change', () => {
      if (depositSelect.value === 'custom') {
        customDepositField.style.display = 'block';
        if (customDepositAmount) {
          customDepositAmount.required = true;
          customDepositAmount.addEventListener('input', updateDepositCalculation);
        }
      } else {
        customDepositField.style.display = 'none';
        if (customDepositAmount) {
          customDepositAmount.required = false;
          customDepositAmount.value = '';
        }
      }
      updateDepositCalculation();
    });
  }
  
  // Update deposit calculation when custom amount changes
  if (customDepositAmount) {
    customDepositAmount.addEventListener('input', updateDepositCalculation);
  }
  
  // Payment calculation function
  const updatePaymentCalculation = () => {
    const paymentCalculation = document.getElementById("paymentCalculation");
    const calculatedAmount = document.getElementById("calculatedPaymentAmount");
    const calculationDetails = document.getElementById("paymentCalculationDetails");
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'from_today';
    const monthlyRent = apartment.monthly_rent || 0;
    
    if (!paymentCalculation || !calculatedAmount) return;
    
    if (paymentMethod === 'from_today' && startDateInput && startDateInput.value) {
      // Calculate pro-rated payment from start date to end of month
      const startDate = new Date(startDateInput.value);
      const year = startDate.getFullYear();
      const month = startDate.getMonth();
      
      // Get last day of the month
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const startDay = startDate.getDate();
      const daysInMonth = lastDayOfMonth;
      const daysRemaining = daysInMonth - startDay + 1; // +1 to include start day
      
      // Calculate pro-rated amount
      const dailyRate = monthlyRent / daysInMonth;
      const proRatedAmount = dailyRate * daysRemaining;
      
      calculatedAmount.textContent = `${proRatedAmount.toFixed(2)} EUR`;
      if (calculationDetails) {
        calculationDetails.textContent = `${daysRemaining} ditë nga ${daysInMonth} ditë të muajit (${dailyRate.toFixed(2)} EUR/ditë)`;
      }
      paymentCalculation.style.display = 'block';
    } else if (paymentMethod === 'full') {
      calculatedAmount.textContent = `${monthlyRent.toFixed(2)} EUR`;
      if (calculationDetails) {
        calculationDetails.textContent = tenantGetTranslation("fullMonthPayment") || "Pagesë për muajin e plotë";
      }
      paymentCalculation.style.display = 'block';
    } else {
      paymentCalculation.style.display = 'none';
    }
  };
  
  // Update payment calculation when payment method changes
  const paymentMethodInputs = document.querySelectorAll('input[name="paymentMethod"]');
  paymentMethodInputs.forEach(input => {
    input.addEventListener('change', updatePaymentCalculation);
  });
  
  // Update payment calculation when start date changes
  if (startDateInput) {
    startDateInput.addEventListener('change', updatePaymentCalculation);
  }
  
  // Initial calculations
  updatePaymentCalculation();
  updateDepositCalculation();
  
  // Update contract preview displays when form values change
  const updateContractDisplays = () => {
    const startDateDisplay = document.getElementById("contractStartDateDisplay");
    const endDateDisplay = document.getElementById("contractEndDateDisplay");
    const depositDisplay = document.getElementById("contractDepositDisplay");
    const paymentMethodDisplay = document.getElementById("contractPaymentMethodDisplay");
    
    if (startDateDisplay && startDateInput && startDateInput.value) {
      const date = new Date(startDateInput.value);
      startDateDisplay.textContent = date.toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    if (endDateDisplay && endDateInput && endDateInput.value) {
      const date = new Date(endDateInput.value);
      endDateDisplay.textContent = date.toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });
    } else if (endDateDisplay) {
      endDateDisplay.textContent = "Pa datë të caktuar";
    }
    
    if (depositDisplay && depositSelect) {
      const depositType = depositSelect.value;
      const monthlyRent = apartment.monthly_rent || 0;
      let depositAmount = 0;
      let depositText = "";
      
      if (depositType === 'full_rent') {
        depositAmount = monthlyRent;
        depositText = `${depositAmount.toFixed(2)} EUR (1 qira mujore)`;
      } else if (depositType === 'half_rent') {
        depositAmount = monthlyRent / 2;
        depositText = `${depositAmount.toFixed(2)} EUR (0.5 qira mujore)`;
      } else if (depositType === 'custom' && customDepositAmount) {
        depositAmount = parseFloat(customDepositAmount.value || 0);
        depositText = `${depositAmount.toFixed(2)} EUR (shumë e personalizuar)`;
      }
      depositDisplay.textContent = depositText;
    }
    
    if (paymentMethodDisplay) {
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'from_today';
      if (paymentMethod === 'from_today') {
        paymentMethodDisplay.textContent = "Pjesë-pjesë (nga data e fillimit deri në fund të muajit)";
      } else {
        paymentMethodDisplay.textContent = "Pagesë e plotë mujore";
      }
    }
  };
  
  // Add listeners for real-time updates
  if (startDateInput) startDateInput.addEventListener('change', updateContractDisplays);
  if (endDateInput) endDateInput.addEventListener('change', updateContractDisplays);
  if (depositSelect) depositSelect.addEventListener('change', updateContractDisplays);
  if (customDepositAmount) customDepositAmount.addEventListener('input', updateContractDisplays);
  paymentMethodInputs.forEach(input => input.addEventListener('change', updateContractDisplays));
  
  // Initial update of displays
  updateContractDisplays();
  
  // Enable submit button immediately (no need to wait)
  if (submitBtn) {
    submitBtn.disabled = false;
  }
  
  // Show modal
  modal.style.display = "flex";
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  
  // Submit button handler
  if (submitBtn) {
    const submitHandler = async () => {
      if (!contractPreviewApartment) return;
      
      // Validate form
      if (!startDateInput || !startDateInput.value) {
        tenantNotify("error", tenantGetTranslation("contractStartDateRequired") || "Data e fillimit është e detyrueshme");
        return;
      }
      
      // Collect form data
      const priceAcceptance = document.querySelector('input[name="priceAcceptance"]:checked')?.value || 'accepted';
      const startDate = startDateInput.value;
      const endDate = endDateInput?.value || null;
      const minDuration = document.getElementById("contractMinDuration")?.value || 12;
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'from_today';
      const depositType = depositSelect?.value || 'half_rent';
      const customDeposit = depositType === 'custom' ? parseFloat(customDepositAmount?.value || 0) : null;
      const notes = document.getElementById("contractNotes")?.value || '';
      
      // Calculate deposit amount
      let depositAmount = 0;
      if (depositType === 'full_rent') {
        depositAmount = apartment.monthly_rent || 0;
      } else if (depositType === 'half_rent') {
        depositAmount = (apartment.monthly_rent || 0) / 2;
      } else if (depositType === 'custom' && customDeposit) {
        depositAmount = customDeposit;
      }
      
      // Create contract preferences object
      const contractPreferences = {
        price_acceptance: priceAcceptance,
        start_date: startDate,
        end_date: endDate,
        min_duration_months: parseInt(minDuration),
        payment_method: paymentMethod,
        deposit_type: depositType,
        deposit_amount: depositAmount,
        notes: notes
      };
      
      await tenantCreateRequest(contractPreviewApartment.id, "contract", contractPreferences);
      closeContractPreview();
    };
    
    // Remove old listener and add new one
    submitBtn.replaceWith(submitBtn.cloneNode(true));
    const newSubmitBtn = document.getElementById("contractPreviewSubmit");
    newSubmitBtn.addEventListener("click", submitHandler);
  }
  
  // Cancel/Close handlers
  if (cancelBtn) {
    cancelBtn.onclick = closeContractPreview;
  }
  if (closeBtn) {
    closeBtn.onclick = closeContractPreview;
  }
  
  // Close on outside click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeContractPreview();
    }
  };
  
  // Escape key to close
  const escapeHandler = (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeContractPreview();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

function closeContractPreview() {
  const modal = document.getElementById("contractPreviewModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
  
  if (contractPreviewCountdown) {
    clearInterval(contractPreviewCountdown);
    contractPreviewCountdown = null;
  }
  
  contractPreviewApartment = null;
  currentTenantProfile = null;
  currentLandlordInfo = null;
}

// Helper function to translate rental rules values
function getRuleTranslation(ruleKey, ruleValue) {
  const translations = {
    pet_policy: {
      allowed: "Lejohen",
      not_allowed: "Nuk lejohen",
      negotiable: "Negociabile"
    },
    smoking: {
      allowed: "Lejohet",
      not_allowed: "Nuk lejohet"
    },
    notice_period: {
      "30_days": "30 ditë",
      "60_days": "60 ditë",
      "90_days": "90 ditë"
    },
    min_rental_period: {
      "1_month": "1 muaj",
      "3_months": "3 muaj",
      "6_months": "6 muaj",
      "1_year": "1 vit",
      "2_years": "2 vite"
    },
    repairs_paid_by: {
      landlord: "Pronari",
      tenant: "Qiramarrësi",
      shared: "Të ndara"
    }
  };
  
  if (translations[ruleKey] && translations[ruleKey][ruleValue]) {
    return translations[ruleKey][ruleValue];
  }
  return ruleValue;
}

// Setup print button functionality
function setupContractPrintButton() {
  // Check if print button already exists
  let printBtn = document.getElementById("contractPrintBtn");
  if (!printBtn) {
    // Create print button and add it to the actions area
    const actionsDiv = document.querySelector(".contract-preview-actions");
    if (actionsDiv) {
      printBtn = document.createElement("button");
      printBtn.type = "button";
      printBtn.id = "contractPrintBtn";
      printBtn.className = "button-secondary";
      printBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Printo Kontratën';
      printBtn.style.cssText = "margin-right: auto;";
      actionsDiv.insertBefore(printBtn, actionsDiv.firstChild);
    }
  }
  
  if (printBtn) {
    printBtn.onclick = printContract;
  }
}

// Print contract function
function printContract() {
  const contractDocument = document.getElementById("contractDocument");
  if (!contractDocument) return;
  
  // Update the contract displays before printing
  const startDateInput = document.getElementById("contractStartDate");
  const endDateInput = document.getElementById("contractEndDate");
  const depositSelect = document.getElementById("contractDeposit");
  const customDepositAmount = document.getElementById("customDepositAmount");
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    tenantNotify("error", "Lejo popup-et për të printuar kontratën.");
    return;
  }
  
  // Get current form values for the print version
  let startDateText = "Do të përcaktohet";
  let endDateText = "Pa datë të caktuar";
  let depositText = "Do të përcaktohet";
  let paymentMethodText = "Do të përcaktohet";
  
  if (startDateInput && startDateInput.value) {
    const date = new Date(startDateInput.value);
    startDateText = date.toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  if (endDateInput && endDateInput.value) {
    const date = new Date(endDateInput.value);
    endDateText = date.toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  if (depositSelect && contractPreviewApartment) {
    const depositType = depositSelect.value;
    const monthlyRent = contractPreviewApartment.monthly_rent || 0;
    let depositAmount = 0;
    
    if (depositType === 'full_rent') {
      depositAmount = monthlyRent;
      depositText = `${depositAmount.toFixed(2)} EUR (1 qira mujore)`;
    } else if (depositType === 'half_rent') {
      depositAmount = monthlyRent / 2;
      depositText = `${depositAmount.toFixed(2)} EUR (0.5 qira mujore)`;
    } else if (depositType === 'custom' && customDepositAmount) {
      depositAmount = parseFloat(customDepositAmount.value || 0);
      depositText = `${depositAmount.toFixed(2)} EUR (shumë e personalizuar)`;
    }
  }
  
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'from_today';
  if (paymentMethod === 'from_today') {
    paymentMethodText = "Pjesë-pjesë (nga data e fillimit deri në fund të muajit)";
  } else {
    paymentMethodText = "Pagesë e plotë mujore";
  }
  
  // Clone and update the contract content
  const contractClone = contractDocument.cloneNode(true);
  
  // Update the display values
  const startDisplay = contractClone.querySelector('#contractStartDateDisplay');
  const endDisplay = contractClone.querySelector('#contractEndDateDisplay');
  const depositDisplay = contractClone.querySelector('#contractDepositDisplay');
  const paymentDisplay = contractClone.querySelector('#contractPaymentMethodDisplay');
  
  if (startDisplay) startDisplay.textContent = startDateText;
  if (endDisplay) endDisplay.textContent = endDateText;
  if (depositDisplay) depositDisplay.textContent = depositText;
  if (paymentDisplay) paymentDisplay.textContent = paymentMethodText;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="sq">
    <head>
      <meta charset="UTF-8">
      <title>Kontratë Qiraje - ${contractPreviewApartment?.name || 'Banesë'}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #1a1a1a;
          background: white;
        }
        
        .contract-a4-document {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
        }
        
        .contract-a4-page {
          padding: 10mm;
        }
        
        .contract-a4-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #08a88a;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .contract-a4-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .contract-logo-img {
          width: 50px;
          height: auto;
        }
        
        .contract-logo-text {
          display: flex;
          flex-direction: column;
        }
        
        .contract-logo-en {
          font-size: 14pt;
          font-weight: bold;
          color: #08a88a;
        }
        
        .contract-logo-sq {
          font-size: 10pt;
          color: #666;
        }
        
        .contract-a4-title {
          text-align: right;
        }
        
        .contract-a4-title h1 {
          font-size: 20pt;
          color: #1a1a1a;
          margin-bottom: 5px;
          letter-spacing: 2px;
        }
        
        .contract-subtitle {
          font-size: 10pt;
          color: #666;
          font-style: italic;
        }
        
        .contract-date-line {
          font-size: 9pt;
          color: #444;
          margin-top: 5px;
        }
        
        .contract-a4-section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .contract-section-title {
          font-size: 12pt;
          font-weight: bold;
          color: #08a88a;
          border-bottom: 1px solid #08a88a;
          padding-bottom: 5px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .contract-parties-grid {
          display: flex;
          gap: 30px;
        }
        
        .contract-party {
          flex: 1;
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }
        
        .contract-party h3 {
          font-size: 10pt;
          color: #08a88a;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .contract-info-table,
        .contract-property-table,
        .contract-financial-table,
        .contract-rules-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .contract-info-table td,
        .contract-property-table td,
        .contract-financial-table td,
        .contract-rules-table td {
          padding: 4px 8px;
          font-size: 10pt;
        }
        
        .contract-info-table td.label,
        .contract-property-table td.label,
        .contract-financial-table td.label,
        .contract-rules-table td.label {
          color: #666;
          width: 35%;
          font-weight: 500;
        }
        
        .contract-info-table td.value,
        .contract-property-table td.value,
        .contract-financial-table td.value,
        .contract-rules-table td.value {
          color: #1a1a1a;
        }
        
        .contract-property-table {
          border: 1px solid #e0e0e0;
        }
        
        .contract-property-table td {
          border: 1px solid #e0e0e0;
        }
        
        .contract-features {
          margin-top: 10px;
          padding: 8px;
          background: #f0fdf4;
          border-radius: 4px;
        }
        
        .contract-features .label {
          font-weight: 600;
          color: #08a88a;
        }
        
        .contract-highlight-section {
          background: #f0fdf4;
          border: 2px solid #08a88a;
          border-radius: 8px;
          padding: 15px;
        }
        
        .contract-financial-box {
          text-align: center;
        }
        
        .contract-rent-display {
          background: #08a88a;
          color: white;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          display: inline-block;
        }
        
        .rent-label {
          display: block;
          font-size: 10pt;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.9;
        }
        
        .rent-amount {
          display: block;
          font-size: 24pt;
          font-weight: bold;
          margin: 5px 0;
        }
        
        .rent-period {
          font-size: 10pt;
          opacity: 0.9;
        }
        
        .contract-obligations-list {
          padding-left: 25px;
        }
        
        .contract-obligations-list li {
          margin-bottom: 8px;
          font-size: 10pt;
        }
        
        .contract-a4-signatures {
          display: flex;
          justify-content: space-between;
          gap: 50px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
        }
        
        .contract-signature-box {
          flex: 1;
          text-align: center;
        }
        
        .signature-title {
          font-size: 10pt;
          font-weight: bold;
          color: #08a88a;
          text-transform: uppercase;
          margin-bottom: 50px;
        }
        
        .signature-line {
          border-bottom: 1px solid #1a1a1a;
          margin-bottom: 10px;
          height: 30px;
        }
        
        .signature-name {
          font-size: 10pt;
          font-weight: 500;
        }
        
        .signature-date {
          font-size: 9pt;
          color: #666;
          margin-top: 5px;
        }
        
        .contract-a4-footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          font-size: 8pt;
          color: #888;
        }
        
        .contract-a4-footer p {
          margin: 3px 0;
        }
        
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .contract-highlight-section {
            background: #f0fdf4 !important;
            border: 2px solid #08a88a !important;
          }
          
          .contract-rent-display {
            background: #08a88a !important;
            color: white !important;
          }
          
          .contract-party {
            background: #f8f9fa !important;
          }
        }
      </style>
    </head>
    <body>
      ${contractClone.outerHTML}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

document.addEventListener("DOMContentLoaded", tenantApartmentsInit);


