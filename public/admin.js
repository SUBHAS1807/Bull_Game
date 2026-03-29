const API_BASE = '/api';

// Track which section is currently active
let currentActiveSection = 'dashboard';

function showSection(section) {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const hamburger = document.getElementById('adminHamburger');

    if (section === 'login') {
        // Hide login section explicitly first, then show it
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('protected-admin-content').style.display = 'none';
        sidebar.style.display = 'none';
        if (hamburger) hamburger.style.display = 'none';
        mainContent.style.marginLeft = '0';
        
        // Hide all admin sections inside protected content
        document.querySelectorAll('#protected-admin-content .page-section').forEach(el => el.style.display = 'none');
        return;
    }

    // Protection: If no token, force login
    if (!localStorage.getItem('adminToken')) {
        showSection('login');
        return;
    }

    // Hide login, show admin
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('protected-admin-content').style.display = 'block';
    sidebar.style.display = 'block';
    
    // On mobile: show hamburger, keep sidebar off-screen; On desktop: show sidebar inline
    if (window.innerWidth <= 768) {
        if (hamburger) hamburger.style.display = 'flex';
        mainContent.style.marginLeft = '0';
    } else {
        if (hamburger) hamburger.style.display = 'none';
        sidebar.style.display = 'block';
        mainContent.style.marginLeft = '270px';
    }

    // Hide all admin sections, then show the requested one
    document.querySelectorAll('#protected-admin-content .page-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById(section);
    if (target) {
        target.style.display = 'block';
        currentActiveSection = section;
    }

    // Update active link in sidebar
    const links = document.querySelectorAll('.sidebar .admin-nav-links li a');
    links.forEach(el => el.classList.remove('active'));
    links.forEach(el => {
        if(el.getAttribute('onclick') && el.getAttribute('onclick').includes(section)) {
            el.classList.add('active');
        }
    });

    // Load data for the section
    if (section === 'events') {
        loadAllEvents();
    } else if (section === 'participants') {
        loadAllParticipantsFilter();
    } else if (section === 'ticker') {
        loadTickerNews();
    } else if (section === 'gallery') {
        loadGallery();
    } else if (section === 'sponsors') {
        loadSponsors();
    } else if (section === 'settings') {
        loadSettings();
    } else if (section === 'payment') {
        loadRazorpayConfig();
    }
}

async function loadAdminData() {
    const select = document.getElementById('adminEventSelect');
    const eventId = select.value;
    
    if(!eventId) {
        await fetchEventsForAdmin();
        return;
    }
    
    try {
        const eventsRes = await fetch(`${API_BASE}/events`);
        const events = await eventsRes.json();
        const event = events.find(e => e.id === eventId);
        
        if (event) {
            updateControlUI(event);
        }

        const partsRes = await fetch(`${API_BASE}/participants?eventId=${eventId}`);
        const participants = await partsRes.json();
        renderAdminParticipants(participants);
    } catch (err) {
        console.error(err);
    }
}

async function fetchEventsForAdmin() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        const events = await res.json();
        
        const select = document.getElementById('adminEventSelect');
        select.innerHTML = `<option value="">${t('-- Select an Event --', '-- कार्यक्रम निवडा --')}</option>`;
        events.forEach(e => {
            select.innerHTML += `<option value="${e.id}">${e.name} (${e.date})</option>`;
        });
        
        if(events.length > 0) {
            select.value = events[0].id;
            loadAdminData();
        }
    } catch (err) {
        console.error(err);
    }
}

function updateControlUI(event) {
    const btnLock = document.getElementById('btnLock');
    const btnDraw = document.getElementById('btnDraw');
    const btnResults = document.getElementById('btnResults');
    const statusText = document.getElementById('eventStatusText');

    if (event.registrationLocked) {
        btnLock.className = 'btn btn-disabled';
        btnLock.disabled = true;
        btnLock.innerText = t('Registration Locked', 'नोंदणी बंद झाली');
        
        btnDraw.disabled = false;
        btnDraw.className = 'btn';
        btnDraw.style.background = 'var(--success)';
        
        statusText.innerText = t("Status: Registration Locked. Ready for Draw.", "स्थिती: नोंदणी बंद. ड्रॉसाठी तयार.");
    } else {
        btnLock.className = 'btn btn-primary';
        btnLock.disabled = false;
        btnLock.innerText = t('🔒 Lock Registration', '🔒 नोंदणी बंद करा');
        
        btnDraw.disabled = true;
        btnDraw.className = 'btn btn-disabled';
        
        statusText.innerText = t("Status: Registration Open.", "स्थिती: नोंदणी चालू आहे.");
    }

    if(event.resultsPublished) {
        btnResults.className = 'btn btn-disabled';
        btnResults.disabled = true;
        btnResults.innerText = t('Results Published', 'निकाल जाहीर केले');
        btnDraw.disabled = true;
        btnDraw.className = 'btn btn-disabled';
        statusText.innerText = t("Status: Event Completed. Results Published.", "स्थिती: कार्यक्रम पूर्ण. निकाल जाहीर झाले.");
    }
}

function renderAdminParticipants(participants) {
    const tbody = document.getElementById('adminParticipantsTable');
    tbody.innerHTML = '';
    
    if(participants.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">${t('No participants registered yet.', 'अद्याप कोणीही नोंदणी केलेली नाही.')}</td></tr>`;
        return;
    }

    participants.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.name} <br><small style="color:var(--text-muted)">${p.village}</small></td>
                <td>${p.mobile}</td>
                <td><span class="badge" style="background:#555">${p.cartNumber}</span></td>
                <td><span class="badge badge-success">${p.paymentStatus}</span></td>
                <td style="font-family: monospace; font-weight: bold; color: var(--primary);">${p.ticketId || '-'}</td>
                <td><span class="badge" style="background:var(--secondary); font-size: 1.1rem;">${p.roundNumber ? `R${p.roundNumber}` : ''} T${p.trackNumber || '?'}</span></td>
            </tr>
        `;
    });
}

// Admin Actions
async function lockRegistration() {
    const eventId = document.getElementById('adminEventSelect').value;
    if(!eventId) return alert(t("Select an event first", "प्रथम कार्यक्रम निवडा"));
    if(!confirm(t("Are you sure? Once locked, no new registrations will be accepted.", "तुम्हाला खात्री आहे का? एकदा बंद केल्यावर नवीन नोंदणी स्वीकारली जाणार नाही."))) return;

    try {
        const res = await fetch(`${API_BASE}/admin/lock-registration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId })
        });
        const data = await res.json();
        if(res.ok) {
            alert(data.message);
            loadAdminData();
        } else {
            alert(data.error);
        }
    } catch(err) { console.error(err); }
}

async function triggerDraw() {
    const eventId = document.getElementById('adminEventSelect').value;
    if(!eventId) return alert(t("Select an event first", "प्रथम कार्यक्रम निवडा"));
    if(!confirm(t("Proceed with digital random track allocation? This cannot be undone.", "डिजिटल रँडम ट्रॅक वाटप सुरू करायचे का? हे परत घेता येणार नाही."))) return;
    
    const btn = document.getElementById('btnDraw');
    btn.innerHTML = t('🎲 Processing Shuffle...', '🎲 शफल करत आहे...');
    btn.disabled = true;

    try {
        // slight delay to simulate intense calculation for "WOW" effect
        setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE}/admin/trigger-draw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId })
                });
                const data = await res.json();
                if(res.ok) {
                    alert(data.message + '\n\n' + t('💬 Automated WhatsApp/SMS updates have been sent to all registered participants!', '💬 सर्व नोंदणीकृत सहभागींना स्वयंचलित WhatsApp/SMS अपडेट्स पाठवले आहेत!'));
                    loadAdminData();
                } else {
                    alert(data.error);
                }
            } catch(err) {
                console.error(err);
            } finally {
                btn.innerHTML = t('🎲 Trigger Random Draw', '🎲 रँडम ड्रॉ करा');
                btn.disabled = false;
            }
        }, 1500);
    } catch(err) { console.error(err); }
}

// PDF Download
function downloadParticipantsPDF() {
    const btn = document.getElementById('btnDownloadPDF');
    btn.disabled = true;
    btn.innerHTML = t('Generating PDF...', 'पीडीएफ तयार होत आहे...');

    const element = document.getElementById('printable-participants');
    const topBar = document.getElementById('participants-top-bar');
    
    // Hide dropdown/buttons temporarily so they don't appear in the PDF
    topBar.style.display = 'none';
    
    // Add temporary title to DOM
    const eventSelect = document.getElementById('filterEventSelect');
    const titleText = eventSelect.options[eventSelect.selectedIndex]?.text || "All Events";
    const headerElement = document.createElement('h2');
    headerElement.innerText = `Participants List - ${titleText}`;
    headerElement.style.color = '#000';
    headerElement.style.textAlign = 'center';
    headerElement.style.marginBottom = '20px';
    headerElement.id = 'temp-pdf-header';
    element.insertBefore(headerElement, element.firstChild);

    // Apply Excel black & white style class
    element.classList.add('pdf-excel-mode');

    // Provide options
    const opt = {
      margin:       0.3,
      filename:     `Participants_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    // Execute
    html2pdf().set(opt).from(element).save().then(() => {
        // Bring UI back to normal
        element.classList.remove('pdf-excel-mode');
        document.getElementById('temp-pdf-header').remove();
        topBar.style.display = 'flex';
        btn.disabled = false;
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span></span>
        `;
        btn.querySelector('span').innerText = t('Download PDF', 'पीडीएफ डाउनलोड करा');
    });
}

function openResultsModal() {
    document.getElementById('resultsModal').style.display = 'block';
}

function closeResultsModal() {
    document.getElementById('resultsModal').style.display = 'none';
}

async function handlePublishResults(e) {
    e.preventDefault();
    const eventId = document.getElementById('adminEventSelect').value;
    const winnerId = document.getElementById('resWinner').value;
    const runnerUpId = document.getElementById('resRunnerUp').value;
    const thirdPlaceId = document.getElementById('resThirdPlace').value;

    try {
        const res = await fetch(`${API_BASE}/admin/publish-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, winnerId, runnerUpId, thirdPlaceId })
        });
        const data = await res.json();
        if(res.ok) {
            alert(data.message);
            closeResultsModal();
            loadAdminData();
        } else {
            alert(data.error);
        }
    } catch(err) { console.error(err); }
}

async function handleCreateEvent(e) {
    e.preventDefault();
    const name = document.getElementById('newEventName').value;
    const date = document.getElementById('newEventDate').value;
    const location = document.getElementById('newEventLocation').value;
    const organizer = document.getElementById('newEventOrganizer').value;
    const maxTracks = document.getElementById('newEventTracks').value;
    const price = document.getElementById('newEventPrice').value;
    const fileInput = document.getElementById('newEventImage');

    const btn = document.getElementById('btnCreateEvent');
    btn.disabled = true;
    btn.innerText = t('Creating...', 'तयार करत आहे...');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('date', date);
    formData.append('location', location);
    formData.append('organizer', organizer);
    formData.append('maxTracks', maxTracks);
    formData.append('price', price);
    if(fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    }

    try {
        const res = await fetch(`${API_BASE}/admin/create-event`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if(res.ok) {
            alert(data.message);
            document.getElementById('newEventName').value = '';
            document.getElementById('newEventDate').value = '';
            document.getElementById('newEventLocation').value = '';
            document.getElementById('newEventOrganizer').value = '';
            document.getElementById('newEventTracks').value = '';
            document.getElementById('newEventPrice').value = '';
            document.getElementById('newEventImage').value = '';
            await fetchEventsForAdmin();
        } else {
            alert(data.error);
        }
    } catch(err) {
        console.error(err);
        alert(t('Server Error', 'सर्व्हरमध्ये त्रुटी'));
    } finally {
        btn.disabled = false;
        btn.innerText = t('Create Event', 'कार्यक्रम तयार करा');
    }
}

async function loadAllEvents() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        const events = await res.json();
        const tbody = document.getElementById('allEventsTable');
        tbody.innerHTML = '';
        if(events.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${t('No events found.', 'कोणतेही कार्यक्रम आढळले नाहीत.')}</td></tr>`;
            return;
        }
        events.forEach(e => {
            let status = t('Open', 'नोंदणी सुरू');
            let badgeClass = 'badge-success';
            if (e.resultsPublished) { status = t('Results Published', 'निकाल जाहीर'); badgeClass = 'badge-primary'; }
            else if (e.registrationLocked) { status = t('Locked / Drawn', 'लॉक / ड्रॉ झाला'); badgeClass = 'badge-warning'; }
            
            const removeBtn = e.resultsPublished 
                ? `<button class="btn" style="background:#f44336; padding:6px 14px; font-size:0.85rem; white-space:nowrap;" onclick="removeResults('${e.id}', '${e.name.replace(/'/g, "\\'")}')">🗑️ ${t('Remove Results', 'निकाल काढा')}</button>`
                : `<span style="color:var(--text-muted); font-size:0.85rem;">—</span>`;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${e.name}</strong></td>
                    <td>${e.date}</td>
                    <td>${e.location}</td>
                    <td>${e.maxTracks}</td>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
                    <td>${removeBtn}</td>
                </tr>
            `;
        });
    } catch(err) { console.error(err); }
}

async function removeResults(eventId, eventName) {
    if (!confirm(t(
        `Are you sure you want to remove results for "${eventName}"? The event will return to the registration section on the website.`,
        `"${eventName}" चे निकाल काढायचे आहेत का? कार्यक्रम वेबसाईटवर पुन्हा नोंदणी विभागात दिसेल.`
    ))) return;

    try {
        const res = await fetch(`${API_BASE}/admin/remove-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId })
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ ' + data.message);
            loadAllEvents();
            loadAdminData(); // refresh dashboard too
        } else {
            alert('❌ ' + (data.error || t('Failed to remove results', 'निकाल काढण्यात अपयश')));
        }
    } catch (err) {
        console.error(err);
        alert(t('Server Error', 'सर्व्हरमध्ये त्रुटी'));
    }
}

async function loadAllParticipantsFilter() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        const events = await res.json();
        const select = document.getElementById('filterEventSelect');
        select.innerHTML = `<option value="">${t('-- All Events --', '-- सर्व कार्यक्रम --')}</option>`;
        events.forEach(e => {
            select.innerHTML += `<option value="${e.id}">${e.name}</option>`;
        });
        loadAllParticipants();
    } catch(err) { console.error(err); }
}

async function loadAllParticipants() {
    try {
        const eventId = document.getElementById('filterEventSelect').value;
        const res = await fetch(`${API_BASE}/participants${eventId ? `?eventId=${eventId}` : ''}`);
        const parts = await res.json();
        const tbody = document.getElementById('allParticipantsTable');
        tbody.innerHTML = '';
        if(parts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${t('No participants found.', 'कोणतेही सहभागी आढळले नाहीत.')}</td></tr>`;
            return;
        }
        parts.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.name} <br><small style="color:var(--text-muted)">${p.village}</small></td>
                    <td>${p.mobile}</td>
                    <td><span class="badge" style="background:#555; white-space:nowrap;">${p.bullName1}</span><br><span class="badge" style="background:#555; margin-top:2px; white-space:nowrap;">${p.bullName2}</span></td>
                    <td><span class="badge badge-success">${p.paymentStatus}</span></td>
                    <td style="font-family: monospace; font-weight: bold; color: var(--primary);">${p.ticketId || '-'}</td>
                    <td><span class="badge" style="background:var(--secondary); font-size: 1.1rem;">${p.roundNumber ? `R${p.roundNumber}` : ''} T${p.trackNumber || '?'}</span></td>
                </tr>
            `;
        });
    } catch(err) { console.error(err); }
}

async function loadTickerNews() {
    try {
        const res = await fetch(`${API_BASE}/ticker`);
        const data = await res.json();
        if (res.ok) {
            document.getElementById('adminTickerText').value = data.text;
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleUpdateTicker(e) {
    e.preventDefault();
    const text = document.getElementById('adminTickerText').value;
    const btn = document.getElementById('btnUpdateTicker');
    btn.disabled = true;
    btn.innerText = t('Updating...', 'अपडेट करत आहे...');

    try {
        const res = await fetch(`${API_BASE}/admin/update-ticker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert(t('Server Error', 'सर्व्हरमध्ये त्रुटी'));
    } finally {
        btn.disabled = false;
        btn.innerText = t('Update Ticker News', 'बातमी अपडेट करा');
    }
}

async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('adminFeePercent').value = data.platformFeePercent;
        } else {
            console.warn("Settings API not found, maybe server not restarted. Using default.");
            document.getElementById('adminFeePercent').value = 4;
        }
    } catch (err) {
        console.error(err);
    }
}

async function handleUpdateSettings(e) {
    e.preventDefault();
    const feePercent = document.getElementById('adminFeePercent').value;
    const btn = document.getElementById('btnUpdateSettings');
    btn.disabled = true;
    btn.innerText = t('Saving...', 'सेव्ह करत आहे...');

    try {
        const res = await fetch(`${API_BASE}/admin/update-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platformFeePercent: feePercent })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert(t('Server Error', 'सर्व्हरमध्ये त्रुटी'));
    } finally {
        btn.disabled = false;
        btn.innerText = t('Save Settings', 'सेटिंग्ज सेव्ह करा');
    }
}

async function loadGallery() {
    try {
        const res = await fetch(`${API_BASE}/highlights`);
        const photos = await res.json();
        const grid = document.getElementById('adminGalleryGrid');
        grid.innerHTML = '';
        if(photos.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">${t('No photos uploaded yet.', 'अद्याप कोणतेही फोटो अपलोड केलेले नाहीत.')}</p>`;
            return;
        }
        photos.forEach(p => {
            const imgUrl = p.image.startsWith('http') ? p.image : p.image;
            grid.innerHTML += `
                <div class="card" style="padding:10px;">
                    <img src="${imgUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:6px; margin-bottom:10px;">
                    <p style="font-size:0.9rem; color:#fff; margin-bottom:10px;">${p.caption}</p>
                    <button class="btn" style="background:#f44336; width:100%; padding:5px;" onclick="deleteHighlight('${p.id}')">Delete</button>
                </div>
            `;
        });
    } catch (err) { console.error(err); }
}

async function handleAddHighlight(e) {
    e.preventDefault();
    const caption = document.getElementById('hlCaption').value;
    const file = document.getElementById('hlImage').files[0];
    const btn = document.getElementById('btnUploadHighlight');
    
    btn.disabled = true;
    btn.innerText = t('Uploading...', 'अपलोड करत आहे...');

    const fd = new FormData();
    fd.append('caption', caption);
    if(file) fd.append('image', file);

    try {
        const res = await fetch(`${API_BASE}/admin/add-highlight`, { method: 'POST', body: fd });
        
        if (res.status === 404) {
            alert("⚠️ ERROR: You MUST RESTART your server! The new backend code isn't running yet. Press Ctrl+C in your terminal, then type 'node server.js' again.");
            return;
        }
        
        const data = await res.json();
        if(res.ok) {
            alert(data.message);
            document.getElementById('hlCaption').value = '';
            document.getElementById('hlImage').value = '';
            loadGallery();
        } else alert(data.error || 'Failed to upload photo');
    } catch(e) { 
        console.error(e); 
        alert("⚠️ Please restart your node.js server! Changes have not been applied yet.");
    }
    finally {
        btn.disabled = false;
        btn.innerText = t('Upload Photo', 'फोटो अपलोड करा');
    }
}

async function deleteHighlight(id) {
    if(!confirm(t('Delete this photo?', 'हा फोटो हटवायचा आहे का?'))) return;
    try {
        const res = await fetch(`${API_BASE}/admin/delete-highlight/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if(res.ok) loadGallery();
        else alert(data.error);
    } catch(e) { console.error(e); }
}

async function loadSponsors() {
    try {
        const res = await fetch(`${API_BASE}/sponsors`);
        const sponsors = await res.json();
        const grid = document.getElementById('adminSponsorsGrid');
        grid.innerHTML = '';
        if(sponsors.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">${t('No sponsors added yet.', 'अद्याप कोणतेही प्रायोजक जोडलेले नाहीत.')}</p>`;
            return;
        }
        sponsors.forEach(p => {
            const imgUrl = p.image.startsWith('http') ? p.image : p.image;
            grid.innerHTML += `
                <div class="card" style="padding:10px; text-align:center;">
                    <img src="${imgUrl}" style="width:100%; height:120px; object-fit:contain; background:#fff; border-radius:6px; margin-bottom:10px; padding:10px;">
                    <p style="font-size:0.9rem; color:#fff; margin-bottom:10px; font-weight:bold;">${p.name}</p>
                    <button class="btn" style="background:#f44336; width:100%; padding:5px;" onclick="deleteSponsor('${p.id}')">Delete</button>
                </div>
            `;
        });
    } catch (err) { console.error(err); }
}

async function handleAddSponsor(e) {
    e.preventDefault();
    const name = document.getElementById('sponsorName').value;
    const file = document.getElementById('sponsorImage').files[0];
    const btn = document.getElementById('btnUploadSponsor');
    
    btn.disabled = true;
    btn.innerText = t('Uploading...', 'अपलोड करत आहे...');

    const fd = new FormData();
    fd.append('name', name);
    if(file) fd.append('image', file);

    try {
        const res = await fetch(`${API_BASE}/admin/add-sponsor`, { method: 'POST', body: fd });
        if (res.status === 404) return alert("⚠️ ERROR: You MUST RESTART your server!");
        const data = await res.json();
        if(res.ok) {
            alert(data.message);
            document.getElementById('sponsorName').value = '';
            document.getElementById('sponsorImage').value = '';
            loadSponsors();
        } else alert(data.error || 'Failed to add sponsor');
    } catch(e) { console.error(e); }
    finally {
        btn.disabled = false;
        btn.innerText = t('Add Sponsor', 'प्रायोजक जोडा');
    }
}

async function deleteSponsor(id) {
    if(!confirm(t('Delete this sponsor?', 'हा प्रायोजक हटवायचा आहे का?'))) return;
    try {
        const res = await fetch(`${API_BASE}/admin/delete-sponsor/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if(res.ok) loadSponsors();
        else alert(data.error);
    } catch(e) { console.error(e); }
}


async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('adminUser').value;
    const pass = document.getElementById('adminPass').value;
    const btn = document.getElementById('btnLogin');

    btn.disabled = true;
    btn.innerText = 'Checking...';

    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('adminToken', data.token);
            // Instead of reload, directly show the correct state
            showSection('dashboard');
            fetchEventsForAdmin();
            if (typeof translatePage === 'function') translatePage();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Login failed');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Login';
    }
}

function checkLogin() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        showSection('login');
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('adminToken');
    showSection('login');
}

// Redundant window.onload removed as initialization is now handled by DOMContentLoaded below

// ================= RAZORPAY ADMIN FUNCTIONS =================

async function loadRazorpayConfig() {
    try {
        const res = await fetch(`${API_BASE}/admin/razorpay-config`);
        if (res.ok) {
            const config = await res.json();
            document.getElementById('razorpayKeyId').value = config.keyId || '';
            document.getElementById('razorpayKeySecret').value = '';
            if (config.hasSecret) {
                document.getElementById('razorpayKeySecret').placeholder = config.keySecret;
            }
            document.getElementById('razorpayEnabled').checked = config.enabled;
            updateRazorpayStatusBadge(config.enabled, config.keyId);
        }
    } catch (err) {
        console.error('Failed to load Razorpay config:', err);
    }
}

function updateRazorpayStatusBadge(enabled, keyId) {
    const badge = document.getElementById('razorpayStatusBadge');
    if (!badge) return;
    
    if (enabled && keyId) {
        badge.innerHTML = `<span class="badge" style="background: linear-gradient(135deg, #059669, #10b981); padding: 10px 20px; font-size: 1rem; border-radius: 50px; box-shadow: 0 0 15px rgba(16,185,129,0.4);">
            ✅ ${t('Connected & Active', 'कनेक्टेड आणि सक्रिय')}
        </span>`;
    } else if (keyId && !enabled) {
        badge.innerHTML = `<span class="badge" style="background: #f59e0b; padding: 10px 20px; font-size: 1rem; border-radius: 50px; color: #000;">
            ⚠️ ${t('Configured but Disabled', 'कॉन्फिगर पण अक्षम')}
        </span>`;
    } else {
        badge.innerHTML = `<span class="badge" style="background: #555; padding: 10px 20px; font-size: 1rem; border-radius: 50px;">
            ⚪ ${t('Not Connected', 'कनेक्ट नाही')}
        </span>`;
    }
}

async function handleSaveRazorpay(e) {
    e.preventDefault();
    const keyId = document.getElementById('razorpayKeyId').value.trim();
    const keySecret = document.getElementById('razorpayKeySecret').value.trim();
    const enabled = document.getElementById('razorpayEnabled').checked;
    const btn = document.getElementById('btnSaveRazorpay');
    
    if (!keyId) {
        alert(t('Please enter Razorpay Key ID', 'Razorpay Key ID टाका'));
        return;
    }
    
    btn.disabled = true;
    btn.querySelector('span').innerText = t('Connecting...', 'कनेक्ट करत आहे...');
    
    try {
        // If secret field is empty, fetch the existing one so we don't overwrite
        let secretToSend = keySecret;
        if (!secretToSend) {
            // Prompt user since secret cannot be empty
            alert(t('Please enter the Key Secret. For security, it is not displayed.', 'Key Secret टाका. सुरक्षासाठी ती दाखवली जात नाही.'));
            btn.disabled = false;
            btn.querySelector('span').innerText = t('Save & Connect', 'सेव्ह करा आणि कनेक्ट करा');
            return;
        }
        
        const res = await fetch(`${API_BASE}/admin/update-razorpay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyId, keySecret: secretToSend, enabled })
        });
        const data = await res.json();
        if (res.ok) {
            alert('✅ ' + data.message);
            updateRazorpayStatusBadge(enabled, keyId);
            // Clear secret field after save
            document.getElementById('razorpayKeySecret').value = '';
            loadRazorpayConfig();
        } else {
            alert('❌ ' + (data.error || t('Failed to save configuration', 'कॉन्फिगरेशन सेव्ह करण्यात अपयश')));
        }
    } catch (err) {
        console.error(err);
        alert(t('Server Error. Make sure the server is running.', 'सर्व्हर त्रुटी. सर्व्हर चालू असल्याची खात्री करा.'));
    } finally {
        btn.disabled = false;
        btn.querySelector('span').innerText = t('Save & Connect', 'सेव्ह करा आणि कनेक्ट करा');
    }
}
// Orientation/Resize handler for Admin Panel
window.addEventListener('resize', () => {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const hamburger = document.getElementById('adminHamburger');
    
    // Skip if login screen
    if (document.getElementById('login-section').style.display === 'block') return;

    if (window.innerWidth <= 768) {
        if (hamburger) hamburger.style.display = 'flex';
        mainContent.style.marginLeft = '0';
        sidebar.style.display = 'block'; // Ensure it's ready for toggle
    } else {
        if (hamburger) hamburger.style.display = 'none';
        sidebar.style.display = 'block';
        mainContent.style.marginLeft = '270px';
        if (typeof closeAdminSidebar === 'function') closeAdminSidebar();
    }
});
// Initial Load configuration
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        showSection('dashboard');
    } else {
        showSection('login');
    }
    if (typeof translatePage === 'function') translatePage();
});
