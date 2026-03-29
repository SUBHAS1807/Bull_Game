const API_BASE = '/api';

// Fetch & Render Events
async function fetchEvents() {
    try {
        const [res, settingsRes] = await Promise.all([
            fetch(`${API_BASE}/events`),
            fetch(`${API_BASE}/settings`).catch(() => null)
        ]);
        
        const events = await res.json();
        
        let settings = { platformFeePercent: 4, razorpayEnabled: false, razorpayKeyId: '' }; // fallback
        if (settingsRes && settingsRes.ok) {
            try {
                settings = await settingsRes.json();
            } catch(e) {}
        }
        
        window.platformFeePercent = settings.platformFeePercent || 0;
        window.razorpayEnabled = settings.razorpayEnabled || false;
        window.razorpayKeyId = settings.razorpayKeyId || '';
        window.allEventsData = events;
        renderEvents(events);
    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

function renderEvents(events) {
    const grid = document.getElementById('events-grid');
    const resultsGrid = document.getElementById('results-grid');
    
    if(grid) grid.innerHTML = '';
    if(resultsGrid) resultsGrid.innerHTML = '';
    
    // Split events based on result publish status
    const upcomingEvents = events.filter(e => !e.resultsPublished);
    const pastEvents = events.filter(e => e.resultsPublished);

    if (upcomingEvents.length === 0 && grid) {
        grid.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1;">${t('No upcoming events available.', 'कोणतेही आगामी कार्यक्रम उपलब्ध नाहीत.')}</p>`;
    }
    if (pastEvents.length === 0 && resultsGrid) {
        resultsGrid.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1;">${t('No official results published yet.', 'आत्तापर्यंत कोणतेही अधिकृत निकाल जाहीर झालेले नाहीत.')}</p>`;
    }

    // Render 1: Upcoming Events Grid
    upcomingEvents.forEach(event => {
        const baseImg = event.image || 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=600&q=80';
        const imgUrl = baseImg.startsWith('http') ? baseImg : baseImg;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${imgUrl}" class="card-img" alt="Event">
            <div class="card-body">
                <h3 class="card-title text-primary">${event.name}</h3>
                <p class="card-text"><strong>${t('Date:', 'तारीख:')}</strong> ${event.date}</p>
                <p class="card-text"><strong>${t('Location:', 'ठिकाण:')}</strong> ${event.location}</p>
                <p class="card-text"><strong>${t('Organizer:', 'आयोजक:')}</strong> ${event.organizer}</p>
                <p class="card-text" style="color: var(--primary); font-size: 1.1rem;"><strong>${t('Entry Fee:', 'प्रवेश शुल्क:')} ₹${event.price || 0}</strong></p>
                <div style="margin-top: 15px;">
                    ${!event.registrationLocked 
                        ? `<button class="btn btn-primary" onclick="openModal('${event.id}', ${event.price || 0})">${t('Register Now', 'नोंदणी करा')}</button>`
                        : `<button class="btn btn-disabled" disabled>${t('Registration Closed', 'नोंदणी बंद')}</button>`
                    }
                </div>
            </div>
        `;
        if (grid) grid.appendChild(card);
    });

    // Render 2: Past Results Grid
    pastEvents.forEach(event => {
        const baseImg = event.image || 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=600&q=80';
        const imgUrl = baseImg.startsWith('http') ? baseImg : baseImg;
        
        const card = document.createElement('div');
        card.className = 'card result-card';
        card.innerHTML = `
            <div style="position: relative;">
                <img src="${imgUrl}" class="card-img" alt="Event" style="height: 250px; filter: brightness(0.8);">
                <div style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.7); padding: 5px 12px; border-radius: 20px; border: 1px solid var(--primary); color: var(--primary); font-weight: bold; font-size: 0.9rem; backdrop-filter: blur(5px); box-shadow: 0 2px 10px rgba(0,0,0,0.5);">
                    🏁 ${t('COMPLETED', 'पूर्ण झाले')}
                </div>
            </div>
            <div class="card-body">
                <h3 class="card-title text-primary" style="margin-bottom: 8px; font-size: 1.6rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${event.name}</h3>
                <div style="display: flex; gap: 15px; margin-bottom: 15px; font-size: 0.95rem; color: var(--text-muted); align-items: center;">
                    <span>📅 ${event.date}</span>
                    <span>📍 ${event.location}</span>
                </div>
                
                <div class="result-podium">
                    <p class="champions-title">🏆 ${t('THE CHAMPIONS', 'विजेते')} 🏆</p>
                    
                    <div class="winner-row gold">
                        <div class="winner-medal">🥇</div>
                        <div style="flex-grow: 1;">
                            <div class="winner-label text-primary">${t('1st Place', 'प्रथम क्रमांक')}</div>
                            <div class="winner-name" style="color: #fdd835; font-size: 1.4rem;">${event.winners.winner}</div>
                        </div>
                    </div>
                    
                    <div class="winner-row silver">
                        <div class="winner-medal">🥈</div>
                        <div style="flex-grow: 1;">
                            <div class="winner-label" style="color: #c0c0c0;">${t('2nd Place', 'द्वितीय क्रमांक')}</div>
                            <div class="winner-name">${event.winners.runnerUp}</div>
                        </div>
                    </div>
                    
                    ${event.winners.thirdPlace && event.winners.thirdPlace !== 'N/A' ? `
                    <div class="winner-row bronze">
                        <div class="winner-medal">🥉</div>
                        <div style="flex-grow: 1;">
                            <div class="winner-label" style="color: #cd7f32;">${t('3rd Place', 'तृतीय क्रमांक')}</div>
                            <div class="winner-name">${event.winners.thirdPlace}</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        if (resultsGrid) resultsGrid.appendChild(card);
    });
}

// Modal Logic
function openModal(eventId, price) {
    document.getElementById('regEventId').value = eventId;
    
    const numPrice = parseFloat(price) || 0;
    const feeRatio = (window.platformFeePercent || 0) / 100;
    const platformFee = Math.round(numPrice * feeRatio);
    const totalAmount = numPrice + platformFee;
    
    window.currentRegTotalAmount = totalAmount;
    
    document.getElementById('regAmountLabel').innerText = t('Payment Demo', 'पेमेंट डेमो');
    document.getElementById('regBasePrice').innerText = `₹${numPrice}`;
    document.getElementById('regPlatformFee').innerText = `₹${platformFee} (${window.platformFeePercent || 0}%)`;
    document.getElementById('regTotalAmount').innerText = `₹${totalAmount}`;
    
    // Update payment mode indicator & button
    const indicator = document.getElementById('paymentModeIndicator');
    const btn = document.getElementById('btnRegSubmit');
    
    if (window.razorpayEnabled && window.razorpayKeyId) {
        document.getElementById('regAmountLabel').innerText = t('Payment Details', 'पेमेंट तपशील');
        indicator.innerHTML = `<span style="color: #10b981; font-size: 0.85rem; font-weight: 600;">✅ ${t('Secure payments via Razorpay', 'Razorpay द्वारे सुरक्षित पेमेंट')}</span>`;
        btn.innerText = t('💳 Pay & Register', '💳 पेमेंट करा आणि नोंदणी करा');
        btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    } else {
        indicator.innerHTML = `<span style="color: #f59e0b; font-size: 0.85rem;">⚠️ ${t('Demo Mode — No real payment charged', 'डेमो मोड — प्रत्यक्ष पेमेंट नाही')}</span>`;
        btn.innerText = t('Register (Demo)', 'नोंदणी करा (डेमो)');
        btn.style.background = '';
    }
    
    document.getElementById('regModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('regModal').style.display = 'none';
    document.getElementById('regForm').reset();
}

function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
}

// Registration Submit
async function handleRegistration(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('regEventId').value;
    const name = document.getElementById('regName').value;
    const mobile = document.getElementById('regMobile').value;
    const village = document.getElementById('regVillage').value;
    const bullName1 = document.getElementById('regBull1').value;
    const bullName2 = document.getElementById('regBull2').value;
    const paymentMethod = document.getElementById('regPayment').value;
    const totalAmount = window.currentRegTotalAmount || 0;
    
    const btn = document.getElementById('btnRegSubmit');
    btn.disabled = true;
    
    // Check if Razorpay is enabled
    if (window.razorpayEnabled && window.razorpayKeyId && totalAmount > 0) {
        btn.innerText = t('Creating payment...', 'पेमेंट तयार करत आहे...');
        
        try {
            // Step 1: Create order on server
            const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalAmount, eventId, participantName: name })
            });
            const orderData = await orderRes.json();
            
            if (!orderRes.ok) {
                alert(orderData.error || t('Failed to create payment order', 'पेमेंट ऑर्डर तयार करण्यात अपयश'));
                btn.disabled = false;
                btn.innerText = t('💳 Pay & Register', '💳 पेमेंट करा आणि नोंदणी करा');
                return;
            }
            
            // Step 2: Open Razorpay checkout popup
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: t('Bailgada Sharyat', 'बैलगाडा शर्यत'),
                description: t('Event Registration Fee', 'कार्यक्रम नोंदणी शुल्क'),
                order_id: orderData.orderId,
                prefill: {
                    name: name,
                    contact: mobile
                },
                theme: {
                    color: '#fdd835'
                },
                handler: async function(response) {
                    // Step 3: Payment successful — register participant with payment proof
                    btn.innerText = t('Verifying payment...', 'पेमेंट व्हेरिफाय करत आहे...');
                    try {
                        const regRes = await fetch(`${API_BASE}/register`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                eventId, name, mobile, village, bullName1, bullName2, paymentMethod,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        const regData = await regRes.json();
                        if (regRes.ok) {
                            closeModal();
                            showTicket(regData.participant);
                        } else {
                            alert(regData.error || t('Registration failed after payment. Contact admin.', 'पेमेंटनंतर नोंदणी अयशस्वी. अॅडमिनशी संपर्क करा.'));
                        }
                    } catch (err) {
                        console.error(err);
                        alert(t('Error during registration. Your payment was received. Please contact admin.', 'नोंदणी दरम्यान त्रुटी. तुमचे पेमेंट मिळाले आहे. अॅडमिनशी संपर्क करा.'));
                    } finally {
                        btn.disabled = false;
                        btn.innerText = t('💳 Pay & Register', '💳 पेमेंट करा आणि नोंदणी करा');
                    }
                },
                modal: {
                    ondismiss: function() {
                        btn.disabled = false;
                        btn.innerText = t('💳 Pay & Register', '💳 पेमेंट करा आणि नोंदणी करा');
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function(response) {
                alert(t('Payment failed: ', 'पेमेंट अयशस्वी: ') + (response.error?.description || ''));
                btn.disabled = false;
                btn.innerText = t('💳 Pay & Register', '💳 पेमेंट करा आणि नोंदणी करा');
            });
            rzp.open();
            
        } catch (err) {
            console.error(err);
            alert(t('Error creating payment. Try again.', 'पेमेंट तयार करताना त्रुटी. पुन्हा प्रयत्न करा.'));
            btn.disabled = false;
            btn.innerText = t('💳 Pay & Register', '💳 पेमेंट करा आणि नोंदणी करा');
        }
    } else {
        // DEMO MODE — no real payment
        btn.innerText = t('Registering...', 'नोंदणी करत आहे...');
        const payload = { eventId, name, mobile, village, bullName1, bullName2, paymentMethod };
        
        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            if(res.ok) {
                closeModal();
                showTicket(data.participant);
            } else {
                alert(data.error || t('Registration failed', 'नोंदणी अयशस्वी'));
            }
        } catch (err) {
            console.error(err);
            alert(t('Server Error during registration.', 'नोंदणी दरम्यान सर्व्हरमध्ये त्रुटी.'));
        } finally {
            btn.disabled = false;
            btn.innerText = t('Register (Demo)', 'नोंदणी करा (डेमो)');
        }
    }
}

// Show Ticket / Acknowledgment
function showTicket(participant) {
    const modal = document.getElementById('ticketModal');
    const view = document.getElementById('ticketView');
    
    view.innerHTML = generateTicketHTML(participant);
    modal.style.display = 'block';
}

// Search Function
async function searchTicket() {
    const query = document.getElementById('searchInput').value.trim();
    if(!query) return;
    
    const res = await fetch(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';
    
    if (data.length === 0) {
        resultsDiv.innerHTML = `<p class="text-secondary" style="text-align:center;">${t('No records found.', 'कोणतीही नोंद आढळली नाही.')}</p>`;
        return;
    }
    
    data.forEach(p => {
        const uniqueId = `tkt-${p.id}`;
        resultsDiv.innerHTML += `
            <div id="${uniqueId}" style="margin-bottom: 20px;">
                ${generateTicketHTML(p)}
            </div>
        `;
    });
}

// Ticket Design Generation
function generateTicketHTML(p) {
    let eventName = t('Unknown Event', 'अज्ञात कार्यक्रम');
    let eventDate = t('TBD', 'ठरले नाही');
    let eventLocation = '-';
    let eventOrg = '-';
    let entryFee = 0;
    let maxTracks = '-';
    
    if (window.allEventsData) {
        const ev = window.allEventsData.find(e => e.id === p.eventId);
        if (ev) {
            eventName = ev.name;
            eventDate = ev.date;
            eventLocation = ev.location;
            eventOrg = ev.organizer;
            entryFee = ev.price || 0;
            maxTracks = ev.maxTracks || '-';
        }
    }

    return `
        <div id="tkt-card-${p.id}" style="background: linear-gradient(135deg, #fdd835 0%, #f9a825 100%); color: #000; padding: 30px; border-radius: 16px; text-align: left; position: relative; box-shadow: 0 10px 20px rgba(0,0,0,0.5); border: 2px dashed #000; font-family: sans-serif; box-sizing: border-box; width: 100%;">
            <div style="border-bottom: 2px solid rgba(0,0,0,0.2); padding-bottom: 15px; margin-bottom: 20px;">
                <h3 style="font-size: 1.6rem; margin: 0 0 5px 0; text-transform: uppercase;">🎫 ${eventName}</h3>
                <p style="margin: 0; font-size: 1rem; color: #333;">📅 ${t('Date:', 'तारीख:')} <strong>${eventDate}</strong> | 📍 ${t('Location:', 'ठिकाण:')} <strong>${eventLocation}</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 0.95rem; color: #555;">${t('Organized by:', 'आयोजक:')} <strong>${eventOrg}</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 0.95rem; color: #555;">${t('Limit:', 'मर्यादा:')} <strong>${maxTracks} ${t('Tracks', 'ट्रॅक्स')}</strong> | ${t('Entry Fee:', 'प्रवेश शुल्क:')} <strong>₹${entryFee}</strong></p>
            </div>
            
            <div style="margin: 15px 0; font-size: 1.1rem; display: flex; flex-wrap: wrap; gap: 10px;">
                <div style="flex: 1 1 45%; margin-bottom: 10px;"><strong>${t('Participant:', 'नाव:')}</strong> <br>${p.name}</div>
                <div style="flex: 1 1 45%; margin-bottom: 10px;"><strong>${t('Mobile:', 'मोबाईल:')}</strong> <br>${p.mobile}</div>
                <div style="flex: 1 1 45%; margin-bottom: 10px;"><strong>${t('Village:', 'गाव:')}</strong> <br>${p.village}</div>
                <div style="flex: 1 1 45%; margin-bottom: 10px;"><strong>${t('Bulls:', 'बैल:')}</strong> <br>${p.bullName1} & ${p.bullName2}</div>
            </div>
            
            <div style="background: rgba(255,255,255,0.6); padding: 15px; border-radius: 8px; margin-top: 15px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="color:#333; font-size: 0.9rem;"><strong>${t('TICKET ID:', 'तिकीट आयडी:')}</strong></div>
                    <div style="font-size: 1.3rem; font-family: monospace; font-weight: bold; color:#000;">${p.ticketId ? p.ticketId : t('PENDING DRAW', 'ड्रॉ प्रलंबित')}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 800; font-size: 1.1rem; color: #555;">${p.roundNumber ? `${t('ROUND', 'फेरी')} ${p.roundNumber}` : t('TRACK NO', 'ट्रॅक नंबर')}</div>
                    <div style="font-size: 3rem; font-weight: 900; color: #d32f2f; margin:0; line-height:1;">${p.trackNumber ? `T${p.trackNumber}` : '?'}</div>
                </div>
            </div>
        </div>
        <button onclick="downloadTicket('${p.id}', '${p.ticketId || p.id}')" class="btn" style="background: #2196F3; color: white; width: 100%; margin-top: 15px;">⬇️ ${t('Download Ticket', 'तिकीट डाउनलोड करा')}</button>
    `;
}

// Download Ticket via html2canvas
function downloadTicket(id, fileId) {
    const element = document.getElementById(`tkt-card-${id}`);
    if(!element) return;
    
    // Use html2canvas to capture the element as an image
    html2canvas(element, { backgroundColor: null, scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Sharyat_Ticket_${fileId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error("Failed to download ticket:", err);
        alert(t("Failed to download ticket image.", "तिकीट डाउनलोड करण्यात त्रुटी."));
    });
}

// Fetch Ticker News
async function fetchTicker() {
    try {
        const res = await fetch(`${API_BASE}/ticker`);
        const data = await res.json();
        const tickerElem = document.getElementById('newsTicker');
        if (tickerElem && data.text) {
            tickerElem.innerText = data.text;
        }
    } catch (err) {
        console.error('Error fetching ticker:', err);
    }
}

// Fetch Game Highlights
async function fetchHighlights() {
    try {
        const res = await fetch(`${API_BASE}/highlights`).catch(() => null);
        if (res && res.ok) {
            const photos = await res.json();
            const grid = document.getElementById('public-gallery-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            if (photos.length === 0) {
                grid.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">${t('No highlights available.', 'कोणतेही हायलाइट्स उपलब्ध नाहीत.')}</p>`;
                return;
            }
            
            photos.forEach(h => {
                const imgUrl = h.image.startsWith('http') ? h.image : h.image;
                grid.innerHTML += `
                    <div style="position: relative; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                        <img src="${imgUrl}" style="width: 100%; height: 220px; object-fit: cover; display: block; filter: brightness(0.9); transition: 0.3s;" onmouseover="this.style.filter='brightness(1.1) scale(1.05)'" onmouseout="this.style.filter='brightness(0.9) scale(1)'">
                        <div style="position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.7); padding: 15px; color: #fff; font-size: 0.95rem; font-weight: bold; backdrop-filter: blur(5px);">
                            ${h.caption || ''}
                        </div>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// Fetch Sponsors
async function fetchSponsors() {
    try {
        const res = await fetch(`${API_BASE}/sponsors`).catch(() => null);
        if (res && res.ok) {
            const sponsors = await res.json();
            const grid = document.getElementById('public-sponsors-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            if (sponsors.length === 0) {
                grid.innerHTML = `<p class="text-secondary" style="width:100%; text-align:center;">${t('No sponsors yet.', 'अद्याप कोणतेही प्रायोजक नाहीत.')}</p>`;
                return;
            }
            
            sponsors.forEach(p => {
                const imgUrl = p.image.startsWith('http') ? p.image : p.image;
                grid.innerHTML += `
                    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; text-align: center; width: 200px; transition: transform 0.3s; cursor: pointer;" onmouseover="this.style.transform='translateY(-5px)'; this.style.borderColor='var(--primary)';" onmouseout="this.style.transform='none'; this.style.borderColor='rgba(255,255,255,0.1)';">
                        <img src="${imgUrl}" style="width: 100%; height: 120px; object-fit: contain; margin-bottom: 15px; border-radius: 8px;">
                        <h4 style="color: #fff; font-size: 1.1rem; margin: 0;">${p.name}</h4>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// Initialize
window.onload = () => {
    fetchEvents();
    fetchTicker();
    fetchHighlights();
    fetchSponsors();
};
