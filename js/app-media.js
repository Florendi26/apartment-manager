// Apartment photos, map, and photo viewer. Loaded before app.js. Shares the same globals.

// Photo upload state
let uploadedPhotos = [];
let isDraggingPhoto = false;
let apartmentMap = null;
let apartmentMarker = null;

function initializePhotoUpload() {
  const photoInput = document.getElementById("apartmentPhotos");
  const dropzone = document.getElementById("photoDropzone");
  const previewContainer = document.getElementById("photoPreviewContainer");
  
  if (!photoInput || !dropzone || !previewContainer) return;

  // Click to select files
  dropzone.addEventListener("click", () => photoInput.click());
  
  // File input change
  photoInput.addEventListener("change", (e) => handleFiles(e.target.files));
  
  // Drag and drop
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  });
  
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("drag-over");
  });
  
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    handleFiles(e.dataTransfer.files);
  });
  
  // Initialize photo count
  updatePhotoCount();
}

function handleFiles(files) {
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    notify("error", translate("photoUploadInvalid") || "Please select image files only.");
    return;
  }
  
  // Check current count and limit to 10 total
  const maxPhotos = 10;
  const remainingSlots = maxPhotos - uploadedPhotos.length;
  
  if (remainingSlots <= 0) {
    notify("error", translate("photoUploadMaxReached") || `Maximum ${maxPhotos} photos allowed.`);
    return;
  }
  
  // Limit the number of files to upload based on remaining slots
  const filesToProcess = imageFiles.slice(0, remainingSlots);
  
  if (filesToProcess.length < imageFiles.length) {
    notify("info", translate("photoUploadLimitExceeded") || `Only ${filesToProcess.length} photo(s) added. Maximum ${maxPhotos} photos allowed.`);
  }
  
  filesToProcess.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      uploadedPhotos.push(dataUrl);
      addPhotoPreview(dataUrl, uploadedPhotos.length - 1);
      updatePhotoCount();
    };
    reader.readAsDataURL(file);
  });
  
  // Reset file input to allow selecting the same file again
  const photoInput = document.getElementById("apartmentPhotos");
  if (photoInput) {
    photoInput.value = "";
  }
}

function addPhotoPreview(dataUrl, index) {
  const previewContainer = document.getElementById("photoPreviewContainer");
  if (!previewContainer) return;
  
  const preview = document.createElement("div");
  preview.className = "photo-preview-item";
  preview.draggable = true;
  preview.dataset.index = index;
  preview.dataset.photoUrl = dataUrl;
  
  // Create image using DOM methods
  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "Preview";
  img.className = "photo-preview-img";
  img.setAttribute('data-index', index);
  img.draggable = false;
  img.addEventListener("click", (e) => {
    if (!isDraggingPhoto) {
      e.stopPropagation();
      openPhotoReview(index);
    }
  });
  preview.appendChild(img);
  
  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "photo-preview-remove";
  removeBtn.setAttribute('data-index', index);
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    uploadedPhotos.splice(index, 1);
    preview.remove();
    updatePhotoPreviews();
    updatePhotoCount();
  });
  preview.appendChild(removeBtn);
  
  // Drag handle
  const dragHandle = document.createElement("div");
  dragHandle.className = "photo-preview-drag-handle";
  dragHandle.title = "Drag to reorder";
  dragHandle.textContent = "⋮⋮";
  preview.appendChild(dragHandle);
  
  // Drag and drop handlers for reordering
  preview.addEventListener("dragstart", (e) => {
    isDraggingPhoto = true;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", preview.outerHTML);
    preview.classList.add("dragging");
    preview.style.opacity = "0.5";
  });
  
  preview.addEventListener("dragend", (e) => {
    isDraggingPhoto = false;
    preview.classList.remove("dragging");
    preview.style.opacity = "";
    // Remove drag-over class from all items
    previewContainer.querySelectorAll(".photo-preview-item").forEach(item => {
      item.classList.remove("drag-over");
    });
  });
  
  preview.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    const afterElement = getDragAfterElement(previewContainer, e.clientX);
    const dragging = previewContainer.querySelector(".dragging");
    
    if (afterElement == null) {
      previewContainer.appendChild(dragging);
    } else {
      previewContainer.insertBefore(dragging, afterElement);
    }
    
    preview.classList.add("drag-over");
  });
  
  preview.addEventListener("dragleave", () => {
    preview.classList.remove("drag-over");
  });
  
  preview.addEventListener("drop", (e) => {
    e.preventDefault();
    preview.classList.remove("drag-over");
    
    // Reorder the uploadedPhotos array based on new DOM order
    const items = Array.from(previewContainer.querySelectorAll(".photo-preview-item"));
    
    // Get the current order of photos from the DOM using data attribute
    const newOrder = items.map(item => item.dataset.photoUrl).filter(url => url);
    
    // Verify we have the same number of photos
    if (newOrder.length === uploadedPhotos.length) {
      uploadedPhotos = newOrder;
      updatePhotoPreviews();
    }
  });
  
  previewContainer.appendChild(preview);
}

function getDragAfterElement(container, x) {
  const draggableElements = [...container.querySelectorAll(".photo-preview-item:not(.dragging)")];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Photo review modal for upload previews
let currentReviewIndex = -1;

function openPhotoReview(index) {
  if (index < 0 || index >= uploadedPhotos.length) return;
  
  currentReviewIndex = index;
  const modal = document.getElementById("photoReviewModal");
  const image = document.getElementById("photoReviewImage");
  
  if (!modal || !image) return;
  
  image.src = uploadedPhotos[index];
  image.classList.remove("zoomed");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closePhotoReview() {
  const modal = document.getElementById("photoReviewModal");
  if (!modal) return;
  
  modal.style.display = "none";
  document.body.style.overflow = "";
  currentReviewIndex = -1;
}

function initializePhotoReview() {
  const modal = document.getElementById("photoReviewModal");
  const closeBtn = document.getElementById("photoReviewClose");
  const deleteBtn = document.getElementById("photoReviewDelete");
  const keepBtn = document.getElementById("photoReviewKeep");
  const image = document.getElementById("photoReviewImage");
  
  if (!modal || !closeBtn) return;
  
  // Close button
  closeBtn.addEventListener("click", closePhotoReview);
  
  // Keep button (just close)
  if (keepBtn) {
    keepBtn.addEventListener("click", () => {
      closePhotoReview();
    });
  }
  
  // Delete button
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (currentReviewIndex >= 0 && currentReviewIndex < uploadedPhotos.length) {
        uploadedPhotos.splice(currentReviewIndex, 1);
        updatePhotoPreviews();
        updatePhotoCount();
        closePhotoReview();
      }
    });
  }
  
  // Click outside to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closePhotoReview();
  });
  
  // Zoom on image click
  if (image) {
    image.addEventListener("click", (e) => {
      e.stopPropagation();
      image.classList.toggle("zoomed");
    });
  }
  
  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (modal.style.display !== "none" && e.key === "Escape") {
      closePhotoReview();
    }
  });
}

function updatePhotoPreviews() {
  const previewContainer = document.getElementById("photoPreviewContainer");
  if (!previewContainer) return;
  
  // Clear container using DOM methods
  while (previewContainer.firstChild) {
    previewContainer.removeChild(previewContainer.firstChild);
  }
  uploadedPhotos.forEach((photo, index) => {
    addPhotoPreview(photo, index);
  });
  
  // Update photo count indicator
  updatePhotoCount();
}

// Kosovo boundary coordinates (approximate polygon)
const KOSOVO_BOUNDS = [
  [41.85, 20.0],  // Southwest
  [41.85, 21.8],  // Southeast
  [43.3, 21.8],   // Northeast
  [43.3, 20.0],   // Northwest
  [41.85, 20.0]   // Close polygon
];

function isLocationInKosovo(lat, lng) {
  // Kosovo approximate boundaries
  // Latitude: 41.85 to 43.3
  // Longitude: 20.0 to 21.8
  return lat >= 41.85 && lat <= 43.3 && lng >= 20.0 && lng <= 21.8;
}

// Track if map is initialized to prevent multiple initializations
let mapInitialized = false;

function initializeApartmentMap() {
  // Map functionality removed
  return;
  const mapContainer = document.getElementById("apartmentMap");
  const latitudeInput = document.getElementById("apartmentLatitude");
  const longitudeInput = document.getElementById("apartmentLongitude");
  const clearPinBtn = document.getElementById("clearMapPin");
  const getLocationBtn = document.getElementById("getMyLocation");
  
  if (!mapContainer) return;
  
  // If map is already initialized, just ensure it's visible and sized correctly
  if (mapInitialized && apartmentMap) {
    requestAnimationFrame(() => {
      apartmentMap.invalidateSize();
    });
    return;
  }
  
  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error("Leaflet is not loaded.");
    // Clear container using DOM methods
    while (mapContainer.firstChild) {
      mapContainer.removeChild(mapContainer.firstChild);
    }
    const errorP = document.createElement('p');
    errorP.style.cssText = 'padding: 2rem; text-align: center; color: #dc2626;';
    errorP.textContent = 'Map library not loaded. Please refresh the page.';
    mapContainer.appendChild(errorP);
    return;
  }
  
  // Use Intersection Observer to lazy-load map only when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !mapInitialized) {
        observer.disconnect();
        loadMap();
      }
    });
  }, {
    rootMargin: '50px' // Start loading slightly before it's visible
  });
  
  // Check if map container is already visible
  const isVisible = mapContainer.offsetParent !== null || 
                    window.getComputedStyle(mapContainer).display !== 'none';
  
  if (isVisible) {
    // Map is visible, load immediately
    loadMap();
  } else {
    // Map is hidden, observe for when it becomes visible
    observer.observe(mapContainer);
  }
  
  function loadMap() {
    if (mapInitialized) return;
    
    // Ensure map container has explicit dimensions
    if (!mapContainer.style.height) {
      mapContainer.style.height = '400px';
    }
    if (!mapContainer.style.width) {
      mapContainer.style.width = '100%';
    }
    
    // Show loading indicator using DOM methods
    while (mapContainer.firstChild) {
      mapContainer.removeChild(mapContainer.firstChild);
    }
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 400px; color: #666;';
    const loadingP = document.createElement('p');
    loadingP.textContent = 'Loading map...';
    loadingDiv.appendChild(loadingP);
    mapContainer.appendChild(loadingDiv);
    
    // Use requestAnimationFrame to defer initialization slightly for better UX
    requestAnimationFrame(() => {
      // Initialize map centered on Kosovo (Prishtina) with lower initial zoom for faster loading
      apartmentMap = L.map('apartmentMap', {
        maxBounds: [[41.5, 19.5], [43.5, 22.0]], // Restrict view to Kosovo area
        maxBoundsViscosity: 1.0, // Prevent panning outside bounds
        preferCanvas: false,
        zoomControl: true,
        loadingControl: false,
        fadeAnimation: true,
        zoomAnimation: true
      }).setView([42.6629, 21.1655], 6); // Even lower zoom level (6) for faster initial load
      
      // Add OpenStreetMap as default (faster loading than satellite)
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 6,
        tileSize: 256,
        updateWhenIdle: true, // Only update when panning stops
        keepBuffer: 2, // Keep fewer tiles in memory
        crossOrigin: true
      });
      
      // Add free satellite imagery with optimized settings (lazy load)
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19,
        minZoom: 6,
        tileSize: 256,
        updateWhenIdle: true,
        keepBuffer: 2,
        crossOrigin: true
      });
      
      // Add layer control to switch between satellite and street map
      const baseMaps = {
        "Satellite": satelliteLayer,
        "Street Map": osmLayer
      };
      
      // Start with OpenStreetMap (faster to load) instead of satellite
      osmLayer.addTo(apartmentMap);
      L.control.layers(baseMaps).addTo(apartmentMap);
      
      // Expose map globally for access from other modules (e.g., tenant view)
      window.apartmentMap = apartmentMap;
      
      mapInitialized = true;
      
      // Optimized size invalidation - use single requestAnimationFrame instead of multiple timeouts
      requestAnimationFrame(() => {
        if (apartmentMap) {
          apartmentMap.invalidateSize();
        }
      });
      
      // Also invalidate when the page becomes visible (handles tab switching)
      const visibilityHandler = () => {
        if (!document.hidden && apartmentMap) {
          requestAnimationFrame(() => {
            apartmentMap.invalidateSize();
          });
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      
      // Add Kosovo boundary polygon (defer to avoid blocking initial render)
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (apartmentMap) {
            const kosovoBoundary = L.polygon(KOSOVO_BOUNDS, {
              color: '#08a88a',
              fillColor: '#08a88a',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }).addTo(apartmentMap);
          }
        }, 500); // Reduced delay from 1000ms to 500ms
      });
      
      // Function to add/update marker (with Kosovo validation)
      const addMarker = (lat, lng) => {
    if (!isLocationInKosovo(lat, lng)) {
      notify("error", translate("locationOutsideKosovo") || "Location must be within Kosovo boundaries.");
      return false;
    }
    
    // Remove existing marker
    if (apartmentMarker) {
      apartmentMap.removeLayer(apartmentMarker);
    }
    
    // Add new marker
    apartmentMarker = L.marker([lat, lng], {
      draggable: true
    }).addTo(apartmentMap);
    
    // Update inputs
    if (latitudeInput) latitudeInput.value = lat;
    if (longitudeInput) longitudeInput.value = lng;
    
    // Show clear button
    if (clearPinBtn) clearPinBtn.style.display = "block";
    
    // Allow dragging marker (with validation)
    apartmentMarker.on('dragend', (e) => {
      const position = apartmentMarker.getLatLng();
      if (isLocationInKosovo(position.lat, position.lng)) {
        if (latitudeInput) latitudeInput.value = position.lat;
        if (longitudeInput) longitudeInput.value = position.lng;
      } else {
        // Revert to previous valid position
        notify("error", translate("locationOutsideKosovo") || "Location must be within Kosovo boundaries.");
        const prevLat = latitudeInput ? parseFloat(latitudeInput.value) : lat;
        const prevLng = longitudeInput ? parseFloat(longitudeInput.value) : lng;
        if (!isNaN(prevLat) && !isNaN(prevLng)) {
          apartmentMarker.setLatLng([prevLat, prevLng]);
        } else {
          apartmentMap.removeLayer(apartmentMarker);
          apartmentMarker = null;
          if (clearPinBtn) clearPinBtn.style.display = "none";
        }
      }
    });
    
    return true;
  };
  
      // Add click handler to drop pin (only within Kosovo)
      apartmentMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        addMarker(lat, lng);
      });
      
      // Get current location button
      if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
          if (!navigator.geolocation) {
            notify("error", translate("geolocationNotSupported") || "Geolocation is not supported by your browser.");
            return;
          }
          
          getLocationBtn.disabled = true;
          getLocationBtn.textContent = translate("gettingLocation") || "Getting location...";
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              if (isLocationInKosovo(lat, lng)) {
                addMarker(lat, lng);
                apartmentMap.setView([lat, lng], 15);
                notify("success", translate("locationFound") || "Location found!");
              } else {
                notify("error", translate("locationOutsideKosovo") || "Your location is outside Kosovo. Please select a location within Kosovo on the map.");
                // Center map on Kosovo anyway
                apartmentMap.setView([42.6629, 21.1655], 8);
              }
              
              getLocationBtn.disabled = false;
              getLocationBtn.textContent = translate("getMyLocation") || "Get My Location";
            },
            (error) => {
              console.error("Geolocation error:", error);
              notify("error", translate("geolocationError") || "Unable to get your location. Please select on the map.");
              getLocationBtn.disabled = false;
              getLocationBtn.textContent = translate("getMyLocation") || "Get My Location";
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });
      }
      
      // Clear pin button
      if (clearPinBtn) {
        clearPinBtn.addEventListener('click', () => {
          if (apartmentMarker) {
            apartmentMap.removeLayer(apartmentMarker);
            apartmentMarker = null;
          }
          if (latitudeInput) latitudeInput.value = "";
          if (longitudeInput) longitudeInput.value = "";
          clearPinBtn.style.display = "none";
        });
      }
      
      // Load existing coordinates if editing
      if (latitudeInput && longitudeInput && latitudeInput.value && longitudeInput.value) {
        const lat = parseFloat(latitudeInput.value);
        const lng = parseFloat(longitudeInput.value);
        if (!isNaN(lat) && !isNaN(lng)) {
          if (isLocationInKosovo(lat, lng)) {
            apartmentMarker = L.marker([lat, lng], {
              draggable: true
            }).addTo(apartmentMap);
            apartmentMap.setView([lat, lng], 15);
            if (clearPinBtn) clearPinBtn.style.display = "block";
            
            apartmentMarker.on('dragend', (e) => {
              const position = apartmentMarker.getLatLng();
              if (isLocationInKosovo(position.lat, position.lng)) {
                if (latitudeInput) latitudeInput.value = position.lat;
                if (longitudeInput) longitudeInput.value = position.lng;
              } else {
                notify("error", translate("locationOutsideKosovo") || "Location must be within Kosovo boundaries.");
                apartmentMarker.setLatLng([lat, lng]);
              }
            });
          }
        }
      }
    });
  }
}

function updatePhotoCount() {
  const dropzone = document.getElementById("photoDropzone");
  if (!dropzone) return;
  
  const maxPhotos = 10;
  const currentCount = uploadedPhotos.length;
  const hintText = dropzone.querySelector(".photo-upload-hint");
  
  if (hintText) {
    if (currentCount >= maxPhotos) {
      hintText.textContent = translate("photoUploadMaxReached") || `Maximum ${maxPhotos} photos reached.`;
      hintText.style.color = "#dc2626";
    } else {
      hintText.textContent = (translate("photoUploadHint") || `You can select multiple photos (max ${maxPhotos})`) + ` (${currentCount}/${maxPhotos})`;
      hintText.style.color = "";
    }
  }
}

function initializePhotoViewer() {
  const modal = document.getElementById("photoViewerModal");
  const closeBtn = document.getElementById("photoViewerClose");
  const prevBtn = document.getElementById("photoViewerPrev");
  const nextBtn = document.getElementById("photoViewerNext");
  const image = document.getElementById("photoViewerImage");
  const counter = document.getElementById("photoViewerCounter");
  
  if (!modal || !closeBtn) return;
  
  let currentPhotos = [];
  let currentIndex = 0;
  let currentApartmentName = "";
  let autoSwipeTimer = null;
  
  window.openPhotoViewer = function(photos, startIndex = 0, apartmentName = "") {
    if (!photos || photos.length === 0) return;
    currentPhotos = Array.isArray(photos) ? photos : [photos];
    currentIndex = Math.max(0, Math.min(startIndex, currentPhotos.length - 1));
    currentApartmentName = apartmentName || "apartment";
    clearAutoSwipeTimer();
    updatePhotoViewer();
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  };
  
  async function downloadPhoto(url, filename) {
    const safeName = (filename || "photo").replace(/[^a-zA-Z0-9-_]/g, "_");
    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = safeName + (url.includes("image/png") ? ".png" : ".jpg");
        a.click();
        return;
      }
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      const ext = (url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) || [])[1] || "jpg";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = safeName + (safeName.includes(".") ? "" : "." + ext);
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      window.open(url, "_blank");
    }
  }
  
  function downloadCurrentPhoto() {
    if (currentPhotos.length === 0) return;
    const url = currentPhotos[currentIndex];
    const baseName = currentApartmentName + "-" + (currentIndex + 1);
    downloadPhoto(url, baseName);
    notify("success", translate("photoDownloaded") || "Photo downloaded.");
  }
  
  async function downloadAllPhotos() {
    if (currentPhotos.length === 0) return;
    const baseName = currentApartmentName.replace(/[^a-zA-Z0-9-_]/g, "_");
    for (let i = 0; i < currentPhotos.length; i++) {
      await downloadPhoto(currentPhotos[i], baseName + "-" + (i + 1));
      if (i < currentPhotos.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    notify("success", translate("photosDownloaded") || "All photos downloaded.");
  }
  
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
        // Restart timer if still zoomed
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
    
    // Touch swipe to change photos (mobile)
    let touchStartX = 0;
    let touchEndX = 0;
    image.addEventListener("touchstart", (e) => {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      touchStartX = t ? t.screenX : e.screenX;
    }, { passive: true });
    image.addEventListener("touchend", (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      touchEndX = t ? t.screenX : e.screenX;
      const diff = touchStartX - touchEndX;
      const minSwipe = 50;
      if (Math.abs(diff) >= minSwipe && !image.classList.contains("zoomed")) {
        if (diff > 0) showNext();
        else showPrev();
      }
    }, { passive: true });
  }
  
  function closeViewer() {
    clearAutoSwipeTimer();
    image.classList.remove("zoomed");
    modal.classList.add("hidden");
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
  
  const downloadBtn = document.getElementById("photoViewerDownload");
  const downloadAllBtn = document.getElementById("photoViewerDownloadAll");
  if (downloadBtn) downloadBtn.addEventListener("click", downloadCurrentPhoto);
  if (downloadAllBtn) downloadAllBtn.addEventListener("click", downloadAllPhotos);
  
  closeBtn.addEventListener("click", closeViewer);
  prevBtn.addEventListener("click", showPrev);
  nextBtn.addEventListener("click", showNext);
  
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
