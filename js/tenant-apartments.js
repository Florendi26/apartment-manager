const TENANT_APARTMENTS_PAGE_SIZE = 15;
let tenantApartmentsAll = [];
let tenantApartmentsRenderedCount = 0;
let tenantApartmentsScrollAttached = false;

async function tenantApartmentsInit() {
  const user = await tenantCheckAuth();
  if (!user) return;

  // Mark current page in navigation immediately (doesn't need async)
  markActiveNavButton('tenant-apartments.html');

  // Initialize photo viewer (doesn't need async)
  initializeTenantPhotoViewer();

  tenantSetupLanguageToggle("tenantLanguageToggleBtn");
  tenantSetupThemeToggle("tenantThemeToggleBtn");

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

function markActiveNavButton(currentPage) {
  const navLinks = document.querySelectorAll('.tenant-main-nav a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === 'tenant-apartments.html' && href.includes('tenant-apartments.html'))) {
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
    
    if (currentPhotos.length <= 1) {
      thumbnailsContainer.innerHTML = "";
      return;
    }
    
    thumbnailsContainer.innerHTML = currentPhotos
      .map((photo, index) => `
        <div class="photo-thumbnail-item ${index === currentIndex ? 'active' : ''}" data-index="${index}">
          <img src="${photo}" alt="Thumbnail ${index + 1}" />
        </div>
      `)
      .join("");
    
    // Add click handlers for thumbnails
    thumbnailsContainer.querySelectorAll(".photo-thumbnail-item").forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        clearAutoSwipeTimer();
        currentIndex = index;
        updatePhotoViewer();
        // Restart timer if still zoomed
        if (image.classList.contains("zoomed")) {
          startAutoSwipeTimer();
        }
      });
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
  grid.innerHTML = `<p>${tenantGetTranslation("tenantLoadingApartments")}</p>`;

  // Load contracts and apartments in parallel for better performance
  const [contractsResult, apartmentsResult] = await Promise.all([
    tenantSupabase
    .from("contracts")
    .select("apartment_id")
      .eq("is_active", true),
    tenantSupabase
      .from("apartments")
      .select("id, name, address, photos")
      .order("created_at", { ascending: false })
  ]);

  if (contractsResult.error) {
    console.error("tenant apartments contracts", contractsResult.error);
    grid.innerHTML = `<p>${tenantGetTranslation("tenantFailedLoadApartments")}</p>`;
    return;
  }

  if (apartmentsResult.error) {
    console.error("tenant apartments", apartmentsResult.error);
    grid.innerHTML = `<p>${tenantGetTranslation("tenantFailedLoadApartments")}</p>`;
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
    grid.innerHTML = `<p>${tenantGetTranslation("tenantNoApartmentsAvailable")}</p>`;
    return;
  }

  const requestContractText = tenantGetTranslation("tenantRequestContract") || "Request Contract";
  const requestViewingText = tenantGetTranslation("tenantRequestViewing") || "Request Viewing";
  
  // Store apartments for lazy rendering
  tenantApartmentsAll = apartments;
  tenantApartmentsRenderedCount = 0;
  grid.innerHTML = "";
  
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
        <div class="card apartment-card" data-apartment-id="${apt.id}" data-apartment-data='${apartmentData}' style="cursor: pointer;">
          <div class="apartment-image-wrapper">
            <img src="${allPhotos[0]}" alt="${apt.name || "Apartment"}" class="apartment-image" data-photos='${photoData}' data-apartment-id="${apt.id}" loading="lazy" onerror="this.onerror=null; this.src='${placeholderImg}'" style="opacity: 1;" />
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
    document.body.style.overflow = "";
    currentApartmentId = null;
  });
  
  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
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
        document.body.style.overflow = "";
      }
    });
  }
  
  if (requestViewingBtn) {
    requestViewingBtn.addEventListener("click", async () => {
      if (currentApartmentId) {
        await tenantCreateRequest(currentApartmentId, "viewing");
        modal.style.display = "none";
        document.body.style.overflow = "";
      }
    });
  }
  
  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display !== "none") {
      modal.style.display = "none";
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
    
    // Set photos with click handlers
    const photosContainer = document.getElementById("apartmentDetailsPhotos");
    photosContainer.innerHTML = photos.map((photo, index) => `
      <img src="${photo}" alt="Apartment Photo ${index + 1}" class="apartment-detail-photo" data-photo-index="${index}" loading="lazy" onerror="this.src='${placeholderImg}'" />
    `).join("");
    
    // Add click handlers to photos to open photo viewer
    photosContainer.querySelectorAll(".apartment-detail-photo").forEach((img, index) => {
      img.addEventListener("click", () => {
        if (window.openPhotoViewer) {
          window.openPhotoViewer(photos, index);
        }
      });
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
        
        if (Array.isArray(features) && features.length > 0) {
          featuresContainer.innerHTML = features.map(feature => 
            `<span class="feature-badge">${feature}</span>`
          ).join("");
        } else {
          featuresContainer.innerHTML = `<span class="feature-badge">${tenantGetTranslation("apartmentDetailsNoFeatures")}</span>`;
        }
      } catch (e) {
        featuresContainer.innerHTML = `<span class="feature-badge">${tenantGetTranslation("apartmentDetailsNoFeatures")}</span>`;
      }
    } else {
      featuresContainer.innerHTML = `<span class="feature-badge">${tenantGetTranslation("apartmentDetailsNoFeatures")}</span>`;
    }
    
    // Set description
    document.getElementById("apartmentDetailsDescriptionValue").textContent = apartment.description || tenantGetTranslation("apartmentDetailsNoDescription");
    
    // Show modal
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  };
}

async function tenantCreateRequest(apartmentId, requestType) {
  const user = await tenantCheckAuth();
  if (!user) return;

  // Get tenant profile
  const tenantProfile = await tenantLoadProfileByEmail(user);
  if (!tenantProfile) {
    tenantNotify("error", tenantGetTranslation("tenantNoProfileLinked") || "Please complete your profile first.");
    return;
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


