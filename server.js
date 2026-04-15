require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Setup ---
const fs = require('fs');
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'data')
  : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'leads.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    property_type TEXT,
    area TEXT,
    budget TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT DEFAULT '',
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    area_name TEXT,
    size TEXT,
    size_unit TEXT DEFAULT 'sq.ft',
    bedrooms INTEGER,
    bathrooms INTEGER,
    price INTEGER,
    price_display TEXT,
    description TEXT,
    features TEXT DEFAULT '[]',
    images TEXT DEFAULT '[]',
    tag TEXT DEFAULT '',
    facing TEXT DEFAULT '',
    floor TEXT DEFAULT '',
    status TEXT DEFAULT 'available',
    featured INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
  CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
`);

// --- Security ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdnjs.cloudflare.com", "https://www.googletagmanager.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["https://www.google.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.googletagmanager.com"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

const uploadsDir = path.join(__dirname, 'uploads', 'properties');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Static Files ---
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: 'index.html'
}));

// --- Email Setup (optional) ---
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendNotification(lead) {
  if (!transporter || !process.env.NOTIFY_EMAIL) return;
  const intentLabel = lead.intent === 'buy' ? 'BUY Property' : 'SELL Property';
  try {
    await transporter.sendMail({
      from: `"Charanjit Properties" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `New Lead: ${lead.name} wants to ${intentLabel}`,
      html: `
        <h2>New Enquiry Received</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px;">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Intent</td><td style="padding:8px;border:1px solid #ddd;">${intentLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:8px;border:1px solid #ddd;">${lead.name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Phone</td><td style="padding:8px;border:1px solid #ddd;">${lead.phone}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${lead.email || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Property Type</td><td style="padding:8px;border:1px solid #ddd;">${lead.property_type || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Area</td><td style="padding:8px;border:1px solid #ddd;">${lead.area || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Budget</td><td style="padding:8px;border:1px solid #ddd;">${lead.budget || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Message</td><td style="padding:8px;border:1px solid #ddd;">${lead.message || '-'}</td></tr>
        </table>
        <p style="margin-top:16px;">Login to <a href="${process.env.SITE_URL || 'http://localhost:3000'}/admin">Admin Panel</a> to manage this lead.</p>
      `
    });
  } catch (err) {
    console.error('Email notification failed:', err.message);
  }
}

// --- Input Sanitization ---
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '').trim().substring(0, 500);
}

// --- API: Submit Lead ---
app.post('/api/leads', formLimiter, (req, res) => {
  try {
    const { intent, name, phone, email, propertyType, area, budget, message } = req.body;

    if (!name || !phone || !intent) {
      return res.status(400).json({ success: false, error: 'Name, phone and intent are required.' });
    }

    const phoneClean = sanitize(phone).replace(/[^\d+\s-]/g, '');
    if (phoneClean.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid phone number.' });
    }

    const lead = {
      intent: sanitize(intent),
      name: sanitize(name),
      phone: phoneClean,
      email: sanitize(email),
      property_type: sanitize(propertyType),
      area: sanitize(area),
      budget: sanitize(budget),
      message: sanitize(message),
      ip_address: req.ip
    };

    const stmt = db.prepare(`
      INSERT INTO leads (intent, name, phone, email, property_type, area, budget, message, ip_address)
      VALUES (@intent, @name, @phone, @email, @property_type, @area, @budget, @message, @ip_address)
    `);
    const result = stmt.run(lead);

    sendNotification(lead);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Lead submission error:', err);
    res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

// --- Admin Authentication Middleware ---
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}

// --- Admin API: Get Leads ---
app.get('/api/admin/leads', adminAuth, (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = '1=1';
  const params = {};

  if (status && status !== 'all') {
    where += ' AND status = @status';
    params.status = status;
  }
  if (search) {
    where += ' AND (name LIKE @search OR phone LIKE @search OR email LIKE @search)';
    params.search = `%${search}%`;
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE ${where}`).get(params).count;
  const leads = db.prepare(`SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`).all({ ...params, limit: parseInt(limit), offset });

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
      SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_count,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
      SUM(CASE WHEN intent = 'buy' THEN 1 ELSE 0 END) as buyers,
      SUM(CASE WHEN intent = 'sell' THEN 1 ELSE 0 END) as sellers
    FROM leads
  `).get();

  res.json({ leads, total, stats, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// --- Admin API: Update Lead Status ---
const updateLead = (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ['new', 'contacted', 'in-progress', 'converted', 'closed'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const updates = [];
  const params = { id: req.params.id };

  if (status) { updates.push('status = @status'); params.status = status; }
  if (notes !== undefined) { updates.push('notes = @notes'); params.notes = sanitize(notes); }
  updates.push('updated_at = CURRENT_TIMESTAMP');

  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = @id`).run(params);
  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json({ success: true, lead: updated });
};
app.patch('/api/admin/leads/:id', adminAuth, updateLead);
app.put('/api/admin/leads/:id', adminAuth, updateLead);

// --- Admin API: Delete Lead ---
app.delete('/api/admin/leads/:id', adminAuth, (req, res) => {
  const result = db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Lead not found' });
  res.json({ success: true });
});

// --- Admin API: Export CSV ---
app.get('/api/admin/export', adminAuth, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  const headers = ['ID', 'Intent', 'Name', 'Phone', 'Email', 'Property Type', 'Area', 'Budget', 'Message', 'Status', 'Notes', 'Date'];
  const csv = [
    headers.join(','),
    ...leads.map(l => [
      l.id, l.intent, `"${l.name}"`, l.phone, l.email || '', l.property_type || '',
      l.area || '', l.budget || '', `"${(l.message || '').replace(/"/g, '""')}"`,
      l.status, `"${(l.notes || '').replace(/"/g, '""')}"`, l.created_at
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=charanjit-leads.csv');
  res.send(csv);
});

// --- Public API: Get Properties (no auth needed) ---
app.get('/api/properties', (req, res) => {
  const { type, area, status = 'available', featured, limit = 50 } = req.query;
  let where = 'status = @status';
  const params = { status, limit: parseInt(limit) };

  if (type) { where += ' AND type = @type'; params.type = type; }
  if (area) { where += ' AND area_name = @area'; params.area = area; }
  if (featured === '1') { where += ' AND featured = 1'; }

  const properties = db.prepare(
    `SELECT * FROM properties WHERE ${where} ORDER BY featured DESC, sort_order ASC, created_at DESC LIMIT @limit`
  ).all(params);

  properties.forEach(p => {
    try { p.images = JSON.parse(p.images || '[]'); } catch { p.images = []; }
    try { p.features = JSON.parse(p.features || '[]'); } catch { p.features = []; }
  });

  res.json({ properties, total: properties.length });
});

// --- Admin API: Get All Properties ---
app.get('/api/admin/properties', adminAuth, (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  const params = {};

  if (status && status !== 'all') { where += ' AND status = @status'; params.status = status; }
  if (search) { where += ' AND (title LIKE @search OR location LIKE @search)'; params.search = `%${search}%`; }

  const total = db.prepare(`SELECT COUNT(*) as count FROM properties WHERE ${where}`).get(params).count;
  const properties = db.prepare(
    `SELECT * FROM properties WHERE ${where} ORDER BY sort_order ASC, created_at DESC LIMIT @limit OFFSET @offset`
  ).all({ ...params, limit: parseInt(limit), offset });

  properties.forEach(p => {
    try { p.images = JSON.parse(p.images || '[]'); } catch { p.images = []; }
    try { p.features = JSON.parse(p.features || '[]'); } catch { p.features = []; }
  });

  const stats = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
      SUM(CASE WHEN status = 'rented' THEN 1 ELSE 0 END) as rented,
      SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured
    FROM properties
  `).get();

  res.json({ properties, total, stats, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// --- Admin API: Create Property ---
app.post('/api/admin/properties', adminAuth, (req, res) => {
  try {
    const { title, type, location, area_name, size, size_unit, bedrooms, bathrooms,
            price, price_display, description, features, images, tag, facing, floor,
            status, featured, sort_order } = req.body;

    if (!title || !type || !location) {
      return res.status(400).json({ error: 'Title, type, and location are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO properties (title, type, location, area_name, size, size_unit, bedrooms, bathrooms,
        price, price_display, description, features, images, tag, facing, floor, status, featured, sort_order)
      VALUES (@title, @type, @location, @area_name, @size, @size_unit, @bedrooms, @bathrooms,
        @price, @price_display, @description, @features, @images, @tag, @facing, @floor, @status, @featured, @sort_order)
    `);

    const result = stmt.run({
      title: sanitize(title), type: sanitize(type), location: sanitize(location),
      area_name: sanitize(area_name || ''), size: sanitize(size || ''), size_unit: sanitize(size_unit || 'sq.ft'),
      bedrooms: parseInt(bedrooms) || 0, bathrooms: parseInt(bathrooms) || 0,
      price: parseInt(price) || 0, price_display: sanitize(price_display || ''),
      description: sanitize(description || ''),
      features: JSON.stringify(features || []),
      images: JSON.stringify(images || []),
      tag: sanitize(tag || ''), facing: sanitize(facing || ''), floor: sanitize(floor || ''),
      status: sanitize(status || 'available'), featured: featured ? 1 : 0,
      sort_order: parseInt(sort_order) || 0
    });

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error('Property creation error:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// --- Admin API: Update Property ---
app.put('/api/admin/properties/:id', adminAuth, (req, res) => {
  const prop = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const { title, type, location, area_name, size, size_unit, bedrooms, bathrooms,
          price, price_display, description, features, images, tag, facing, floor,
          status, featured, sort_order } = req.body;

  db.prepare(`
    UPDATE properties SET title=@title, type=@type, location=@location, area_name=@area_name,
      size=@size, size_unit=@size_unit, bedrooms=@bedrooms, bathrooms=@bathrooms,
      price=@price, price_display=@price_display, description=@description,
      features=@features, images=@images, tag=@tag, facing=@facing, floor=@floor,
      status=@status, featured=@featured, sort_order=@sort_order, updated_at=CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({
    id: req.params.id,
    title: sanitize(title || prop.title), type: sanitize(type || prop.type),
    location: sanitize(location || prop.location), area_name: sanitize(area_name ?? prop.area_name),
    size: sanitize(size ?? prop.size), size_unit: sanitize(size_unit || prop.size_unit),
    bedrooms: parseInt(bedrooms ?? prop.bedrooms) || 0, bathrooms: parseInt(bathrooms ?? prop.bathrooms) || 0,
    price: parseInt(price ?? prop.price) || 0, price_display: sanitize(price_display ?? prop.price_display),
    description: sanitize(description ?? prop.description),
    features: JSON.stringify(features || JSON.parse(prop.features || '[]')),
    images: JSON.stringify(images || JSON.parse(prop.images || '[]')),
    tag: sanitize(tag ?? prop.tag), facing: sanitize(facing ?? prop.facing), floor: sanitize(floor ?? prop.floor),
    status: sanitize(status || prop.status), featured: (featured !== undefined ? (featured ? 1 : 0) : prop.featured),
    sort_order: parseInt(sort_order ?? prop.sort_order) || 0
  });

  const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  res.json({ success: true, property: updated });
});

// --- Admin API: Delete Property ---
app.delete('/api/admin/properties/:id', adminAuth, (req, res) => {
  const result = db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Property not found' });
  res.json({ success: true });
});

// --- Admin API: Upload Property Image ---
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

app.post('/api/admin/upload', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image uploaded' });
  res.json({ success: true, url: `/uploads/properties/${req.file.filename}` });
});

// --- Admin Page ---
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n  Charanjit Properties Server Running!`);
  console.log(`  ------------------------------------`);
  console.log(`  Website:  http://localhost:${PORT}`);
  console.log(`  Admin:    http://localhost:${PORT}/admin`);
  console.log(`  Username: ${process.env.ADMIN_USERNAME}`);
  console.log(`  Password: ${process.env.ADMIN_PASSWORD}\n`);
});
