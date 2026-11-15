// Admin contract preview and print. Loaded before app.js. Shares the same globals.

let adminContractPreviewCountdown = null;
let adminContractPreviewData = null;

async function showAdminContractPreview(request, apartment, tenant, action) {
  adminContractPreviewData = { request, apartment, tenant, action };
  
  // Fetch full apartment details (include landlord_id for landlord lookup)
  let fullApartment = null;
  let aptError = null;
  let aptRes = await supabase
    .from("apartments")
    .select("id, name, address, municipality, neighborhood, area, rooms, monthly_rent, condition, floor, features, rental_rules, landlord_id")
    .eq("id", request.apartment_id)
    .single();
  fullApartment = aptRes.data;
  aptError = aptRes.error;

  // If 400 or missing columns, retry with select("*") then minimal columns
  if (aptError && (aptError.code === "PGRST204" || aptError.status === 400 || aptError.message?.includes("column"))) {
    let fallback = await supabase
      .from("apartments")
      .select("*")
      .eq("id", request.apartment_id)
      .single();
    fullApartment = fallback.data;
    aptError = fallback.error;
    if (aptError) {
      fallback = await supabase
        .from("apartments")
        .select("id, name, address, municipality, neighborhood, area, rooms, monthly_rent, landlord_id")
        .eq("id", request.apartment_id)
        .single();
      fullApartment = fallback.data;
      aptError = fallback.error;
    }
  }

  const apartmentData = fullApartment || apartment;
  
  // Get landlord profile by apartment's owner (landlord_id). Prefer id; fallback user_id if needed.
  let landlordProfile = null;
  if (apartmentData?.landlord_id) {
    let landlordRes = await supabase
      .from("landlords")
      .select("full_name, email, phone")
      .eq("id", apartmentData.landlord_id)
      .maybeSingle();
    landlordProfile = landlordRes.data;
    if (!landlordProfile && landlordRes.error) {
      landlordRes = await supabase
        .from("landlords")
        .select("full_name, email, phone")
        .eq("user_id", apartmentData.landlord_id)
        .maybeSingle();
      landlordProfile = landlordRes.data;
    }
  }
  
  const modal = document.getElementById("adminContractPreviewModal");
  const body = document.getElementById("adminContractPreviewBody");
  const acceptBtn = document.getElementById("adminContractPreviewAccept");
  const rejectBtn = document.getElementById("adminContractPreviewReject");
  const cancelBtn = document.getElementById("adminContractPreviewCancel");
  const closeBtn = document.getElementById("adminContractPreviewClose");
  const countdownTimer = document.getElementById("adminCountdownTimer");
  
  if (!modal || !body) return;
  
  // Parse contract preferences from request message
  let contractPreferences = null;
  if (request.message) {
    try {
      const parsed = JSON.parse(request.message);
      if (parsed.preferences) {
        contractPreferences = parsed.preferences;
      }
    } catch (e) {
      // Message is not JSON, no preferences
    }
  }
  
  // Parse rental rules
  let rentalRules = {};
  if (apartmentData.rental_rules) {
    try {
      rentalRules = typeof apartmentData.rental_rules === "string" ? JSON.parse(apartmentData.rental_rules) : apartmentData.rental_rules;
    } catch (e) { /* ignore */ }
  }
  
  // Parse features
  let features = [];
  if (apartmentData.features) {
    try {
      features = typeof apartmentData.features === 'string' 
        ? (apartmentData.features.startsWith('[') ? JSON.parse(apartmentData.features) : apartmentData.features.split(',').map(f => f.trim()))
        : apartmentData.features;
    } catch (e) {
      features = [];
    }
  }
  
  // Generate contract preview content
  const today = new Date();
  const formattedDate = today.toLocaleDateString('sq-AL', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format dates from preferences
  const formatPreferenceDate = (dateStr) => {
    if (!dateStr) return "Pa datë të caktuar";
    try {
      return new Date(dateStr).toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };
  
  // Format deposit text
  const getDepositText = () => {
    if (!contractPreferences) return "Do të përcaktohet";
    const depositAmount = contractPreferences.deposit_amount || 0;
    const depositType = contractPreferences.deposit_type || 'half_rent';
    if (depositType === 'full_rent') {
      return `${depositAmount.toFixed(2)} EUR (1 qira mujore)`;
    } else if (depositType === 'half_rent') {
      return `${depositAmount.toFixed(2)} EUR (0.5 qira mujore)`;
    } else {
      return `${depositAmount.toFixed(2)} EUR (shumë e personalizuar)`;
    }
  };
  
  // Format payment method text
  const getPaymentMethodText = () => {
    if (!contractPreferences) return "Do të përcaktohet";
    if (contractPreferences.payment_method === 'from_today') {
      return "Pjesë-pjesë (nga data e fillimit deri në fund të muajit)";
    }
    return "Pagesë e plotë mujore";
  };
  
  // Helper function for rule translations
  const getRuleTranslation = (ruleKey, ruleValue) => {
    const translations = {
      pet_policy: { allowed: "Lejohen", not_allowed: "Nuk lejohen", negotiable: "Negociabile" },
      smoking: { allowed: "Lejohet", not_allowed: "Nuk lejohet" },
      notice_period: { "30_days": "30 ditë", "60_days": "60 ditë", "90_days": "90 ditë" },
      min_rental_period: { "1_month": "1 muaj", "3_months": "3 muaj", "6_months": "6 muaj", "1_year": "1 vit", "2_years": "2 vite" },
      repairs_paid_by: { landlord: "Pronari", tenant: "Qiramarrësi", shared: "Të ndara" }
    };
    return translations[ruleKey]?.[ruleValue] || ruleValue;
  };
  
  const contractHTML = `
    <div class="contract-a4-document" id="adminContractDocument">
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
            <p class="contract-date-line">Nr. Ref: ${request.id}</p>
            <p class="contract-date-line">Data e kërkesës: ${formatPreferenceDate(request.created_at)}</p>
          </div>
        </div>
        
        ${contractPreferences ? `
        <!-- Tenant Preferences Alert -->
        <div class="contract-preferences-alert">
          <h3>Preferencat e Qiramarrësit</h3>
          <div class="preferences-grid">
            <div class="preference-item">
              <span class="pref-label">Çmimi:</span>
              <span class="pref-value ${contractPreferences.price_acceptance === 'negotiate' ? 'negotiate' : 'accepted'}">
                ${contractPreferences.price_acceptance === 'negotiate' ? 'Dëshiron të negocioj' : 'E pranuar'}
              </span>
            </div>
            <div class="preference-item">
              <span class="pref-label">Kohëzgjatja minimale:</span>
              <span class="pref-value">${contractPreferences.min_duration_months || 12} muaj</span>
            </div>
            ${contractPreferences.notes ? `
            <div class="preference-item notes">
              <span class="pref-label">Shënime:</span>
              <span class="pref-value">${sanitize(contractPreferences.notes)}</span>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        <!-- Parties Section -->
        <div class="contract-a4-section">
          <h2 class="contract-section-title">NENI 1 - PALËT KONTRAKTUESE</h2>
          <div class="contract-parties-grid">
            <div class="contract-party">
              <h3>QIRADHËNËSI (Pronari)</h3>
              <table class="contract-info-table">
                <tr>
                  <td class="label">Emri i plotë:</td>
                  <td class="value">${landlordProfile?.full_name || state.currentUser?.email?.split('@')[0] || '[Pronari]'}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${landlordProfile?.email || state.currentUser?.email || '[Email]'}</td>
                </tr>
                <tr>
                  <td class="label">Telefoni:</td>
                  <td class="value">${landlordProfile?.phone || '[Do të plotësohet]'}</td>
                </tr>
              </table>
            </div>
            <div class="contract-party">
              <h3>QIRAMARRËSI (Tenant)</h3>
              <table class="contract-info-table">
                <tr>
                  <td class="label">Emri i plotë:</td>
                  <td class="value">${tenant?.full_name || '[Qiramarrësi]'}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${tenant?.email || '[Email]'}</td>
                </tr>
                <tr>
                  <td class="label">Telefoni:</td>
                  <td class="value">${tenant?.phone || '[Do të plotësohet]'}</td>
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
                <td class="value"><strong>${apartmentData.name || 'N/A'}</strong></td>
                <td class="label">Lloji:</td>
                <td class="value">Banesë</td>
              </tr>
              <tr>
                <td class="label">Adresa:</td>
                <td class="value" colspan="3">${apartmentData.address || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Komuna:</td>
                <td class="value">${apartmentData.municipality || '-'}</td>
                <td class="label">Lagjia:</td>
                <td class="value">${apartmentData.neighborhood || '-'}</td>
              </tr>
              <tr>
                <td class="label">Sipërfaqja:</td>
                <td class="value">${apartmentData.area ? apartmentData.area + ' m²' : '-'}</td>
                <td class="label">Nr. dhomave:</td>
                <td class="value">${apartmentData.rooms || '-'}</td>
              </tr>
              <tr>
                <td class="label">Gjendja:</td>
                <td class="value">${apartmentData.condition || '-'}</td>
                <td class="label">Kati:</td>
                <td class="value">${apartmentData.floor || '-'}</td>
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
              <span class="rent-amount">${apartmentData.monthly_rent ? apartmentData.monthly_rent.toFixed(2) : '0.00'} EUR</span>
              <span class="rent-period">/ muaj</span>
            </div>
            <table class="contract-financial-table">
              <tr>
                <td class="label">Data e fillimit:</td>
                <td class="value">${formatPreferenceDate(contractPreferences?.start_date)}</td>
              </tr>
              <tr>
                <td class="label">Data e mbarimit:</td>
                <td class="value">${formatPreferenceDate(contractPreferences?.end_date)}</td>
              </tr>
              <tr>
                <td class="label">Depozita:</td>
                <td class="value">${getDepositText()}</td>
              </tr>
              <tr>
                <td class="label">Mënyra e pagesës:</td>
                <td class="value">${getPaymentMethodText()}</td>
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
            <div class="signature-name">${landlordProfile?.full_name || state.currentUser?.email?.split('@')[0] || '[Emri i pronarit]'}</div>
            <div class="signature-date">Data: _____________</div>
          </div>
          <div class="contract-signature-box">
            <div class="signature-title">QIRAMARRËSI</div>
            <div class="signature-line"></div>
            <div class="signature-name">${tenant?.full_name || '[Emri i qiramarrësit]'}</div>
            <div class="signature-date">Data: _____________</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="contract-a4-footer">
          <p>Ky dokument është gjeneruar automatikisht nga sistemi "Banesë për Ty" - Apartment Management System</p>
          <p>Kontrata do të jetë e vlefshme vetëm pasi të pranohet dhe të nënshkruhet nga të dyja palët.</p>
        </div>
      </div>
    </div>
  `;
  
  body.innerHTML = contractHTML;
  
  // Add print button functionality
  setupAdminContractPrintButton();
  
  // Calculate expiration time (60 minutes from request creation)
  const createdAt = new Date(request.created_at).getTime();
  const expirationTime = createdAt + (60 * 60 * 1000); // 60 minutes in milliseconds
  const countdownContainer = document.getElementById("adminContractCountdown");
  
  // Update countdown text
  if (countdownContainer) {
    const countdownText = countdownContainer.querySelector('span:first-of-type');
    if (countdownText) {
      countdownText.textContent = translate("contractExpirationText") || "Kjo kërkesë do të skadojë pas:";
    }
  }
  
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
      acceptBtn.disabled = true;
      rejectBtn.disabled = true;
      acceptBtn.textContent = translate("requestExpired") || "Kërkesa ka skaduar";
      clearInterval(adminContractPreviewCountdown);
      
      // Auto-reject expired request
      setTimeout(async () => {
        await handleRejectRequest(request.id);
        closeAdminContractPreview();
      }, 2000);
      return;
    }
    
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
  if (adminContractPreviewCountdown) {
    clearInterval(adminContractPreviewCountdown);
  }
  
  // Start countdown (update every second)
  adminContractPreviewCountdown = setInterval(updateCountdown, 1000);
  
  // Handle different action modes
  const isViewMode = action === "view";
  const isApproveMode = action === "approve";
  const isRejectMode = action === "reject";
  const isPending = request.status === "pending";
  
  // Update modal title based on mode
  const modalTitle = modal.querySelector('.contract-preview-header h2');
  if (modalTitle) {
    if (isViewMode) {
      modalTitle.textContent = translate("contractPreviewViewTitle") || "Shiko Kontratën";
    } else if (isApproveMode) {
      modalTitle.textContent = translate("contractPreviewApproveTitle") || "Prano Kontratën";
    } else if (isRejectMode) {
      modalTitle.textContent = translate("contractPreviewRejectTitle") || "Refuzo Kontratën";
    } else {
      modalTitle.textContent = translate("contractPreviewTitle") || "Contract Preview";
    }
  }
  
  // Configure buttons based on mode and request status
  if (isPending) {
    // Show/hide and style buttons based on action mode
    if (isViewMode) {
      // View mode - show both buttons but neutral styling
      acceptBtn.disabled = false;
      rejectBtn.disabled = false;
      acceptBtn.style.display = "";
      rejectBtn.style.display = "";
      acceptBtn.textContent = translate("approve") || "Prano";
      rejectBtn.textContent = translate("reject") || "Refuzo";
      acceptBtn.className = 'btn btn-primary btn-sm';
      rejectBtn.className = 'btn btn-outline-danger btn-sm';
    } else if (isApproveMode) {
      // Approve mode - highlight approve button
      acceptBtn.disabled = false;
      rejectBtn.disabled = false;
      acceptBtn.style.display = "";
      rejectBtn.style.display = "";
      acceptBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><polyline points="20 6 9 17 4 12"></polyline></svg>' + (translate("approveContract") || "Prano Kontratën");
      rejectBtn.textContent = translate("cancel") || "Anulo";
      acceptBtn.className = 'btn btn-primary';
      rejectBtn.className = 'btn btn-outline-secondary btn-sm';
    } else if (isRejectMode) {
      // Reject mode - highlight reject button
      acceptBtn.disabled = false;
      rejectBtn.disabled = false;
      acceptBtn.style.display = "";
      rejectBtn.style.display = "";
      acceptBtn.textContent = translate("cancel") || "Anulo";
      rejectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' + (translate("rejectContract") || "Refuzo Kontratën");
      acceptBtn.className = 'btn btn-outline-secondary btn-sm';
      rejectBtn.className = 'btn btn-danger';
    }
  } else {
    // Non-pending (already accepted/rejected) - hide action buttons
    acceptBtn.style.display = "none";
    rejectBtn.style.display = "none";
  }
  
  // Show modal
  modal.style.display = "flex";
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  
  // Button handlers (capture request before closeAdminContractPreview nulls adminContractPreviewData)
  const acceptHandler = async () => {
    if (!acceptBtn.disabled && adminContractPreviewData && isPending) {
      if (isRejectMode) {
        closeAdminContractPreview();
        return;
      }
      const req = adminContractPreviewData.request;
      if (!req) return;
      const requestId = req.id;
      const apartmentId = req.apartment_id;
      const tenantId = req.tenant_id;
      const requestType = req.request_type;
      closeAdminContractPreview();
      await handleAcceptRequest(requestId, apartmentId, tenantId, requestType);
    }
  };
  
  const rejectHandler = async () => {
    if (!rejectBtn.disabled && adminContractPreviewData && isPending) {
      if (isApproveMode) {
        closeAdminContractPreview();
        return;
      }
      const req = adminContractPreviewData.request;
      if (!req) return;
      const requestId = req.id;
      closeAdminContractPreview();
      await handleRejectRequest(requestId);
    }
  };
  
  // Remove old listeners and add new ones
  acceptBtn.replaceWith(acceptBtn.cloneNode(true));
  rejectBtn.replaceWith(rejectBtn.cloneNode(true));
  const newAcceptBtn = document.getElementById("adminContractPreviewAccept");
  const newRejectBtn = document.getElementById("adminContractPreviewReject");
  newAcceptBtn.addEventListener("click", acceptHandler);
  newRejectBtn.addEventListener("click", rejectHandler);
  
  // Update button text if buttons were replaced
  if (isPending) {
    if (isViewMode) {
      newAcceptBtn.textContent = translate("approve") || "Prano";
      newRejectBtn.textContent = translate("reject") || "Refuzo";
      newAcceptBtn.className = 'btn btn-primary btn-sm';
      newRejectBtn.className = 'btn btn-outline-danger btn-sm';
    } else if (isApproveMode) {
      newAcceptBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><polyline points="20 6 9 17 4 12"></polyline></svg>' + (translate("approveContract") || "Prano Kontratën");
      newRejectBtn.textContent = translate("cancel") || "Anulo";
      newAcceptBtn.className = 'btn btn-primary';
      newRejectBtn.className = 'btn btn-outline-secondary btn-sm';
    } else if (isRejectMode) {
      newAcceptBtn.textContent = translate("cancel") || "Anulo";
      newRejectBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' + (translate("rejectContract") || "Refuzo Kontratën");
      newAcceptBtn.className = 'btn btn-outline-secondary btn-sm';
      newRejectBtn.className = 'btn btn-danger';
    }
  } else {
    newAcceptBtn.style.display = "none";
    newRejectBtn.style.display = "none";
  }
  
  // Cancel/Close handlers
  if (cancelBtn) {
    cancelBtn.onclick = closeAdminContractPreview;
  }
  if (closeBtn) {
    closeBtn.onclick = closeAdminContractPreview;
  }
  
  // Close on outside click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeAdminContractPreview();
    }
  };
  
  // Escape key to close
  const escapeHandler = (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeAdminContractPreview();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

function closeAdminContractPreview() {
  const modal = document.getElementById("adminContractPreviewModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
  
  if (adminContractPreviewCountdown) {
    clearInterval(adminContractPreviewCountdown);
    adminContractPreviewCountdown = null;
  }
  
  adminContractPreviewData = null;
}

// Setup print button functionality for admin
function setupAdminContractPrintButton() {
  let printBtn = document.getElementById("adminContractPrintBtn");
  if (!printBtn) {
    const actionsDiv = document.querySelector("#adminContractPreviewModal .contract-preview-actions");
    if (actionsDiv) {
      printBtn = document.createElement("button");
      printBtn.type = "button";
      printBtn.id = "adminContractPrintBtn";
      printBtn.className = "button-secondary";
      printBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Printo Kontratën';
      printBtn.style.cssText = "margin-right: auto;";
      actionsDiv.insertBefore(printBtn, actionsDiv.firstChild);
    }
  }
  
  if (printBtn) {
    printBtn.onclick = printAdminContract;
  }
}

// Print contract function for admin
function printAdminContract() {
  const contractDocument = document.getElementById("adminContractDocument");
  if (!contractDocument) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    notify("error", "Lejo popup-et për të printuar kontratën.");
    return;
  }
  
  const contractClone = contractDocument.cloneNode(true);
  
  const apartmentName = adminContractPreviewData?.apartment?.name || 'Banesë';
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="sq">
    <head>
      <meta charset="UTF-8">
      <title>Kontratë Qiraje - ${apartmentName}</title>
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
        
        .contract-preferences-alert {
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .contract-preferences-alert h3 {
          font-size: 12pt;
          color: #92400e;
          margin-bottom: 10px;
        }
        
        .preferences-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .preference-item {
          display: flex;
          gap: 5px;
        }
        
        .preference-item .pref-label {
          font-weight: 600;
          color: #92400e;
        }
        
        .preference-item .pref-value.negotiate {
          color: #dc2626;
          font-weight: bold;
        }
        
        .preference-item .pref-value.accepted {
          color: #16a34a;
          font-weight: bold;
        }
        
        .preference-item.notes {
          width: 100%;
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
        
        .contract-property-details {
          background: #fafafa;
          border-radius: 6px;
          padding: 12px;
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
          background: #f0fdf4 !important;
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
          
          .contract-preferences-alert {
            background: #fef3c7 !important;
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
  
  printWindow.onload = function() {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
