const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// PERSISTENCE MODULE
const DATA_FILE = path.join(__dirname, 'data.json');

const loadData = () => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading data file, using defaults');
      return null;
    }
  }
  return null;
};

const saveData = () => {
  const data = {
    events,
    participants,
    highlights,
    sponsors,
    currentTickerNews,
    platformFeePercent,
    razorpayConfig
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Initial Data Load
const savedData = loadData();

let currentTickerNews = savedData?.currentTickerNews || "🔥 Live: Sharyat Pro Season 2 Tickets Available Now! 🏆 Register today to secure your track number.";
let platformFeePercent = savedData?.platformFeePercent || 4;
let razorpayConfig = savedData?.razorpayConfig || {
  keyId: '',
  keySecret: '',
  enabled: false
};
let events = savedData?.events || [
  {
    id: "evt-001",
    name: "Maharashtra Kesari Sharyat 2026",
    date: "2026-04-10",
    location: "Khed, Pune",
    organizer: "Shivba Pratishthan",
    maxTracks: 12,
    price: 500,
    registrationLocked: false,
    resultsPublished: false,
    winners: null // { winner: id, runnerUp: id }
  },
  {
    id: "evt-002",
    name: "Bailgada Mahotsav Satara",
    date: "2026-05-01",
    location: "Khandala, Satara",
    organizer: "Ajinkya Mandal",
    maxTracks: 10,
    price: 300,
    registrationLocked: false,
    resultsPublished: false,
    winners: null
  }
];
let highlights = savedData?.highlights || [];
let sponsors = savedData?.sponsors || [];
let participants = savedData?.participants || [];

if (!savedData) saveData(); // Initial save if file didn't exist

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `event-${Date.now()}${ext}`)
  }
});
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('Only JPG/PNG/WEBP formats are allowed!'), false);
        }
    }
});

// ================= SMS / WHATSAPP MOCK INTEGRATION =================
const sendTicketMessage = (participant, event, isUpdate = false) => {
    const text = isUpdate 
        ? `*[TICKET UPDATE] Sharyat Pro*\nHello ${participant.name},\nYour Track Number for *${event.name}* has been assigned!\n\n🎫 Ticket ID: ${participant.ticketId}\n🛣️ Track No: T${participant.trackNumber}\n🏁 Round: R${participant.roundNumber}\n\nBest of luck for the race!`
        : `*[REGISTRATION SUCCESSFUL] Sharyat Pro*\nHello ${participant.name},\nYou have successfully registered for *${event.name}*.\n\n🎫 Ticket ID: ${participant.ticketId}\n✅ Status: ${participant.paymentStatus}\nWe will notify you once tracks are drawn.`;

    console.log(`\n==============================================`);
    console.log(`[MOCK WhatsApp API] Sending to: +91 ${participant.mobile}`);
    console.log(`----------------------------------------------`);
    console.log(text);
    console.log(`==============================================\n`);
};

// ================= API ENDPOINTS =================

// Get all events
app.get('/api/events', (req, res) => {
  res.json(events);
});

// Register a participant
app.post('/api/register', (req, res) => {
  const { name, mobile, village, bullName1, bullName2, eventId, paymentMethod, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  
  if (!name || !mobile || !village || !bullName1 || !bullName2 || !eventId) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const event = events.find(e => e.id === eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.registrationLocked) return res.status(400).json({ error: 'Registration is locked for this event' });

  // Payment Verification
  let isPaid = false;
  let paymentId = null;
  
  if (razorpayConfig.enabled && razorpay_payment_id && razorpay_order_id && razorpay_signature) {
    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    
    if (generatedSignature === razorpay_signature) {
      isPaid = true;
      paymentId = razorpay_payment_id;
      console.log(`[Razorpay] Registration payment verified: ${razorpay_payment_id}`);
    } else {
      return res.status(400).json({ error: 'Payment verification failed. Please try again.' });
    }
  } else if (!razorpayConfig.enabled) {
    // Razorpay not configured — use demo/mock mode
    isPaid = true;
    console.log('[Payment] Demo mode — auto-marked as PAID');
  } else {
    return res.status(400).json({ error: 'Payment is required. Please complete the payment.' });
  }
  
  const newParticipant = {
    id: uuidv4(),
    name,
    mobile,
    village,
    bullName1,
    bullName2,
    eventId,
    paymentStatus: isPaid ? 'PAID' : 'PENDING',
    paymentId: paymentId,
    registrationDate: new Date().toISOString(),
    trackNumber: null, // Assigned later during draw
    ticketId: isPaid ? `TKT-${Math.floor(100000 + Math.random() * 900000)}` : null
  };
  
  participants.push(newParticipant);
  
  // Fire SMS/WhatsApp notification
  sendTicketMessage(newParticipant, event, false);

  saveData(); // Save to file
  res.json({ message: 'Registration successful', participant: newParticipant });
});

// Get participants
app.get('/api/participants', (req, res) => {
  const { eventId } = req.query;
  if (eventId) {
    return res.json(participants.filter(p => p.eventId === eventId));
  }
  res.json(participants);
});

// Get specific ticket/result
app.get('/api/search', (req, res) => {
  const { query } = req.query; // Ticket ID or Name or Mobile
  if(!query) return res.json([]);
  const qStr = query.toLowerCase();
  const results = participants.filter(p => 
    (p.ticketId && p.ticketId.toLowerCase() === qStr) || 
    p.name.toLowerCase().includes(qStr) || 
    p.mobile === qStr ||
    p.bullName1.toLowerCase().includes(qStr) ||
    p.bullName2.toLowerCase().includes(qStr)
  );
  res.json(results);
});

// Get Ticker News
app.get('/api/ticker', (req, res) => {
  res.json({ text: currentTickerNews });
});

// Get Settings
app.get('/api/settings', (req, res) => {
  res.json({ 
    platformFeePercent,
    razorpayEnabled: razorpayConfig.enabled,
    razorpayKeyId: razorpayConfig.keyId // only send key ID to frontend, never secret
  });
});

// Get Highlights
app.get('/api/highlights', (req, res) => {
  res.json(highlights);
});

// Get Sponsors
app.get('/api/sponsors', (req, res) => {
  res.json(sponsors);
});

// ---- ADMIN ENDPOINTS ----

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  // This is a simple proof of concept. In production, use hashed passwords and formal sessions/JWT.
  if (username === 'admin' && password === 'admin@123') {
    res.json({ message: 'Login successful', token: 'mock-admin-token' });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Update Ticker News
app.post('/api/admin/update-ticker', (req, res) => {
  const { text } = req.body;
  if(!text) return res.status(400).json({ error: 'Ticker text required' });
  currentTickerNews = text;
  saveData();
  res.json({ message: 'Ticker updated successfully', text });
});

// Update Settings
app.post('/api/admin/update-settings', (req, res) => {
  const { platformFeePercent: newFee } = req.body;
  if(newFee !== undefined) {
    platformFeePercent = parseFloat(newFee);
  }
  saveData();
  res.json({ message: 'Settings updated successfully', platformFeePercent });
});

// Save Razorpay Config
app.post('/api/admin/update-razorpay', (req, res) => {
  const { keyId, keySecret, enabled } = req.body;
  if (!keyId || !keySecret) {
    return res.status(400).json({ error: 'Both Key ID and Key Secret are required' });
  }
  razorpayConfig.keyId = keyId.trim();
  razorpayConfig.keySecret = keySecret.trim();
  razorpayConfig.enabled = enabled !== false;
  console.log(`[Razorpay] Config updated. Enabled: ${razorpayConfig.enabled}, Key ID: ${razorpayConfig.keyId.substring(0, 10)}...`);
  saveData();
  res.json({ message: 'Razorpay configuration saved successfully', enabled: razorpayConfig.enabled });
});

// Get Razorpay Config (admin only — includes masked secret)
app.get('/api/admin/razorpay-config', (req, res) => {
  res.json({
    keyId: razorpayConfig.keyId,
    keySecret: razorpayConfig.keySecret ? '••••••••' + razorpayConfig.keySecret.slice(-4) : '',
    enabled: razorpayConfig.enabled,
    hasSecret: !!razorpayConfig.keySecret
  });
});

// Create Razorpay Order
app.post('/api/payment/create-order', (req, res) => {
  const { amount, eventId, participantName } = req.body;
  
  if (!razorpayConfig.enabled || !razorpayConfig.keyId || !razorpayConfig.keySecret) {
    return res.status(400).json({ error: 'Payment gateway is not configured. Please contact admin.' });
  }
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  
  const orderData = JSON.stringify({
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: {
      eventId: eventId,
      participantName: participantName
    }
  });
  
  const auth = Buffer.from(`${razorpayConfig.keyId}:${razorpayConfig.keySecret}`).toString('base64');
  
  const options = {
    hostname: 'api.razorpay.com',
    port: 443,
    path: '/v1/orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(orderData),
      'Authorization': `Basic ${auth}`
    }
  };
  
  const apiReq = https.request(options, (apiRes) => {
    let body = '';
    apiRes.on('data', (chunk) => { body += chunk; });
    apiRes.on('end', () => {
      try {
        const order = JSON.parse(body);
        if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
          console.log(`[Razorpay] Order created: ${order.id} for ₹${amount}`);
          res.json({ 
            orderId: order.id, 
            amount: order.amount, 
            currency: order.currency,
            keyId: razorpayConfig.keyId 
          });
        } else {
          console.error('[Razorpay] Order creation failed:', body);
          res.status(400).json({ error: order.error?.description || 'Failed to create payment order. Check your Razorpay credentials.' });
        }
      } catch (e) {
        console.error('[Razorpay] Parse error:', e);
        res.status(500).json({ error: 'Payment gateway error' });
      }
    });
  });
  
  apiReq.on('error', (e) => {
    console.error('[Razorpay] Network error:', e);
    res.status(500).json({ error: 'Could not connect to payment gateway' });
  });
  
  apiReq.write(orderData);
  apiReq.end();
});

// Verify Razorpay Payment
app.post('/api/payment/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification data', verified: false });
  }
  
  // Verify signature using HMAC SHA256
  const generatedSignature = crypto
    .createHmac('sha256', razorpayConfig.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  
  if (generatedSignature === razorpay_signature) {
    console.log(`[Razorpay] Payment verified! Payment ID: ${razorpay_payment_id}`);
    res.json({ verified: true, paymentId: razorpay_payment_id });
  } else {
    console.error('[Razorpay] Signature mismatch! Possible tampering.');
    res.status(400).json({ verified: false, error: 'Payment verification failed' });
  }
});

// Add Highlight
app.post('/api/admin/add-highlight', (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    
    const { caption } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    const newHighlight = {
      id: `hlt-${Date.now()}`,
      image: `/uploads/${req.file.filename}`,
      caption: caption || ''
    };
    highlights.unshift(newHighlight);
    saveData();
    res.json({ message: 'Highlight added successfully', highlight: newHighlight });
  });
});

// Delete Highlight
app.delete('/api/admin/delete-highlight/:id', (req, res) => {
  highlights = highlights.filter(h => h.id !== req.params.id);
  saveData();
  res.json({ message: 'Highlight deleted successfully' });
});

// Add Sponsor
app.post('/api/admin/add-sponsor', (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    
    const { name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Sponsor logo is required' });

    const newSponsor = {
      id: `spn-${Date.now()}`,
      image: `/uploads/${req.file.filename}`,
      name: name || 'Sponsor'
    };
    sponsors.push(newSponsor);
    saveData();
    res.json({ message: 'Sponsor added successfully', sponsor: newSponsor });
  });
});

// Delete Sponsor
app.delete('/api/admin/delete-sponsor/:id', (req, res) => {
  sponsors = sponsors.filter(s => s.id !== req.params.id);
  saveData();
  res.json({ message: 'Sponsor deleted successfully' });
});

// Create Event
app.post('/api/admin/create-event', (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { name, date, location, organizer, maxTracks, price } = req.body;
    if (!name || !date || !location || !maxTracks) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=800&q=80';

    const newEvent = {
      id: `evt-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      date,
      location,
      organizer: organizer || 'Organizing Committee',
      maxTracks: parseInt(maxTracks, 10),
      price: price ? parseInt(price, 10) : 0,
      image: imagePath,
      registrationLocked: false,
      resultsPublished: false,
      winners: null
    };
    
    // Add to beginning of events array
    events.unshift(newEvent);
    saveData();
    res.json({ message: 'Event created successfully', event: newEvent });
  });
});

// Lock Registration
app.post('/api/admin/lock-registration', (req, res) => {
  const { eventId } = req.body;
  const event = events.find(e => e.id === eventId);
  if (event) {
    event.registrationLocked = true;
    saveData();
    res.json({ message: 'Registration locked successfully', event });
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

// Trigger Random Draw (Shuffle Algorithm)
app.post('/api/admin/trigger-draw', (req, res) => {
  const { eventId } = req.body;
  const event = events.find(e => e.id === eventId);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.registrationLocked) return res.status(400).json({ error: 'Lock registration before draw' });
  
  let eventParticipants = participants.filter(p => p.eventId === eventId && p.paymentStatus === 'PAID');
  
  if (eventParticipants.length === 0) return res.status(400).json({ error: 'No paid participants to draw' });

  // Shuffle participants (Fisher-Yates)
  for (let i = eventParticipants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eventParticipants[i], eventParticipants[j]] = [eventParticipants[j], eventParticipants[i]];
  }

  // Assign Tracks (Cyclic if more participants than maxTracks)
  let currentTrack = 1;
  let currentRound = 1;
  eventParticipants.forEach((p) => {
    // Find the original reference in array to update
    let dbP = participants.find(orig => orig.id === p.id);
    dbP.trackNumber = currentTrack;
    dbP.roundNumber = currentRound;
    
    currentTrack++;
    if (currentTrack > event.maxTracks) {
        currentTrack = 1;
        currentRound++;
    }
  });

  // Fire SMS/WhatsApp notifications for all allocated participants
  eventParticipants.forEach((p) => {
    let dbP = participants.find(orig => orig.id === p.id);
    sendTicketMessage(dbP, event, true);
  });

  saveData();
  res.json({ message: 'Draw completed successfully' });
});

// Publish Results
app.post('/api/admin/publish-results', (req, res) => {
  const { eventId, winnerId, runnerUpId, thirdPlaceId } = req.body;
  const event = events.find(e => e.id === eventId);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });
  
  event.resultsPublished = true;
  event.winners = { winner: winnerId, runnerUp: runnerUpId, thirdPlace: thirdPlaceId || 'N/A' };
  saveData();
  res.json({ message: 'Results published successfully', event });
});

// Remove / Unpublish Results
app.post('/api/admin/remove-results', (req, res) => {
  const { eventId } = req.body;
  const event = events.find(e => e.id === eventId);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.resultsPublished) return res.status(400).json({ error: 'No results published for this event' });
  
  event.resultsPublished = false;
  event.winners = null;
  console.log(`[Admin] Results removed for event: ${event.name}`);
  saveData();
  res.json({ message: 'Results removed successfully', event });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
