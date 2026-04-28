// TicketMada Node.js API Server
// Uses better-sqlite3 for database, native http for server
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(PROJECT_ROOT, 'data', 'ticketmada.db');
const COMMISSION_RATE = 0.03;
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Ensure data directory exists
if (!fs.existsSync(path.join(PROJECT_ROOT, 'data'))) {
    fs.mkdirSync(path.join(PROJECT_ROOT, 'data'), { recursive: true });
}

let Database;
try {
    Database = require('better-sqlite3');
} catch (e) {
    console.error('better-sqlite3 not installed. Run: npm install better-sqlite3');
    process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============ DATABASE SETUP ============
function initDB() {
    const hasUsers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (hasUsers) return;

    db.exec(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'buyer',
            plan TEXT DEFAULT NULL,
            avatar_initials TEXT,
            phone TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT (datetime('now')),
            last_login DATETIME
        );
        CREATE TABLE events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizer_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            emoji TEXT DEFAULT '🎫',
            date_start DATETIME NOT NULL,
            date_end DATETIME,
            venue TEXT NOT NULL,
            capacity INTEGER NOT NULL DEFAULT 0,
            tickets_sold INTEGER NOT NULL DEFAULT 0,
            revenue INTEGER NOT NULL DEFAULT 0,
            image_url TEXT,
            badge TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        );
        CREATE TABLE tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_code TEXT UNIQUE NOT NULL,
            event_id INTEGER NOT NULL,
            buyer_id INTEGER NOT NULL,
            type TEXT NOT NULL DEFAULT 'Standard',
            price INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            scanned_at DATETIME,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (buyer_id) REFERENCES users(id)
        );
        CREATE TABLE refunds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_code TEXT UNIQUE,
            ticket_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            client_name TEXT NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            reason TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT (datetime('now')),
            updated_at DATETIME,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        );
        CREATE TABLE payouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_code TEXT UNIQUE,
            organizer_id INTEGER NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            commission INTEGER NOT NULL DEFAULT 0,
            net INTEGER NOT NULL DEFAULT 0,
            method TEXT NOT NULL DEFAULT 'Virement',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT (datetime('now')),
            paid_at DATETIME,
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        );
        CREATE TABLE team_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizer_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL DEFAULT 'guichetier',
            role_label TEXT,
            events_access TEXT DEFAULT 'Tous',
            last_access DATETIME,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            icon TEXT,
            text TEXT NOT NULL,
            user_id INTEGER,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);

    seedDB();
    console.log('Database initialized and seeded.');
}

function hashPassword(pw) {
    return bcrypt.hashSync(pw, 10);
}

function verifyPassword(pw, hash) {
    return bcrypt.compareSync(pw, hash);
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function seedDB() {
    const hash = hashPassword('password123');
    const insertUser = db.prepare('INSERT INTO users (id, name, email, password_hash, role, plan, avatar_initials, phone, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    const users = [
        [1, 'Rabe Jean', 'rabe@example.mg', hash, 'buyer', null, 'RJ', null, 'active', '2025-06-15'],
        [2, 'Marie Rakoto', 'marie@example.mg', hash, 'buyer', null, 'MR', null, 'active', '2025-08-20'],
        [3, 'Solo Andry', 'solo@example.mg', hash, 'buyer', null, 'SA', null, 'active', '2025-09-10'],
        [4, 'Faly Nina', 'faly@example.mg', hash, 'buyer', null, 'FN', null, 'active', '2025-11-05'],
        [5, 'Festival Donia', 'contact@donia.mg', hash, 'organizer', 'pro', 'FD', '+261 34 00 000 01', 'active', '2024-01-15'],
        [6, 'Live Nation MG', 'info@livenation.mg', hash, 'organizer', 'enterprise', 'LN', '+261 34 00 000 02', 'active', '2023-06-03'],
        [7, 'Palais des Sports', 'admin@palais.mg', hash, 'organizer', 'pro', 'PS', '+261 34 00 000 03', 'active', '2023-09-22'],
        [8, 'Madajazzcar', 'hello@madajazz.mg', hash, 'organizer', 'starter', 'MJ', '+261 34 00 000 04', 'pending', '2024-03-01'],
        [9, 'CNaPS Sport', 'events@cnaps.mg', hash, 'organizer', 'pro', 'CS', '+261 34 00 000 05', 'active', '2023-11-10'],
        [10, 'Jean Rakoto', 'jean@donia.mg', hash, 'organizer', null, 'JR', null, 'active', '2024-02-01'],
        [11, 'Marie Razafy', 'marie@donia.mg', hash, 'organizer', null, 'MR', null, 'active', '2024-03-15'],
        [12, 'Solo Andria', 'solo@donia.mg', hash, 'organizer', null, 'SA', null, 'active', '2024-04-01'],
        [13, 'Admin TM', 'admin@ticketmada.mg', hash, 'admin', null, 'AT', null, 'active', '2023-01-01'],
        [14, 'Super Admin', 'superadmin@ticketmada.mg', hash, 'superadmin', null, 'SA', null, 'active', '2023-01-01'],
    ];
    const insertMany = db.transaction((items) => { for (const u of items) insertUser.run(...u); });
    insertMany(users);

    const insertEvent = db.prepare('INSERT INTO events (id, organizer_id, name, category, description, emoji, date_start, date_end, venue, capacity, tickets_sold, revenue, image_url, badge, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    const events = [
        [1, 6, 'Dama Live - Tournée Nationale 2026', 'concerts', 'Le plus grand concert de l\'année', '🎤', '2026-04-15', null, 'Antananarivo', 15000, 12500, 625000000, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', 'popular', 'active'],
        [2, 5, 'Festival Donia 2026', 'festivals', 'Le festival incontournable de Nosy Be', '🎉', '2026-05-20', '2026-05-22', 'Nosy Be', 10000, 8500, 1020000000, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400', 'festival', 'active'],
        [3, 9, 'CNaPS vs Fosa Juniors', 'sports', 'Match de la saison', '⚽', '2026-03-28', null, 'Mahamasina', 8000, 5200, 78000000, 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400', 'popular', 'completed'],
        [4, 6, 'Erick Manana Unplugged', 'concerts', 'Concert acoustique exceptionnel', '🎸', '2026-04-05', null, 'IFM Analakely', 800, 650, 22750000, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', 'soon', 'active'],
        [5, 8, 'Madajazzcar 2026', 'festivals', 'Festival de jazz international', '🎷', '2026-10-10', '2026-10-15', 'Antananarivo', 5000, 0, 0, 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 'soon', 'pending'],
        [6, 9, 'Course de Côte - Diego', 'sports', 'Compétition automobile', '🏎️', '2026-06-12', null, 'Diego Suarez', 3000, 1200, 30000000, 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400', null, 'active'],
        [7, 6, 'Jaojoby en Concert', 'concerts', 'Le roi du salegy en live', '🎵', '2026-05-18', null, 'Toamasina', 5000, 3800, 152000000, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'vip', 'active'],
        [8, 5, 'Beach Festival Anakao', 'festivals', 'Festival sur la plage', '🏖️', '2026-07-01', '2026-07-03', 'Anakao', 2000, 500, 75000000, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', 'festival', 'active'],
        [9, 5, 'Donia Beach Party', 'concerts', 'After party sur la plage', '🏖️', '2026-05-23', null, 'Ambatoloaka', 1000, 800, 40000000, null, null, 'active'],
        [10, 5, 'Donia Sunset Session', 'concerts', 'Session acoustique au coucher du soleil', '🌅', '2026-05-19', null, 'Hell-Ville', 500, 0, 0, null, null, 'pending'],
    ];
    const insertManyE = db.transaction((items) => { for (const e of items) insertEvent.run(...e); });
    insertManyE(events);

    const insertTicket = db.prepare('INSERT INTO tickets (id, id_code, event_id, buyer_id, type, price, status, scanned_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    const tickets = [
        [1, 'TKT-008501', 2, 1, 'VIP', 200000, 'active', null, '2026-03-03'],
        [2, 'TKT-008500', 2, 2, 'Standard', 80000, 'scanned', '2026-03-02 14:30:00', '2026-03-02'],
        [3, 'TKT-008499', 9, 3, 'Standard', 50000, 'active', null, '2026-03-02'],
        [4, 'TKT-008498', 2, 4, 'VIP', 200000, 'active', null, '2026-02-28'],
        [5, 'TKT-001234', 1, 1, 'VIP', 150000, 'active', null, '2026-03-01'],
        [6, 'TKT-001235', 2, 2, 'Standard', 80000, 'scanned', '2026-02-28 16:45:00', '2026-02-28'],
        [7, 'TKT-001236', 3, 3, 'Tribune', 15000, 'refunded', null, '2026-02-27'],
        [8, 'TKT-001240', 1, 4, 'VIP', 150000, 'active', null, '2026-03-01'],
        [9, 'TKT-001245', 2, 2, 'Standard', 80000, 'active', null, '2026-02-28'],
    ];
    const insertManyT = db.transaction((items) => { for (const t of items) insertTicket.run(...t); });
    insertManyT(tickets);

    db.prepare('INSERT INTO refunds (id, id_code, ticket_id, event_id, client_name, amount, reason, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(1, 'REF-001', 8, 1, 'Rabe Faly', 150000, 'Impossibilité de se déplacer', 'pending', '2026-03-02');
    db.prepare('INSERT INTO refunds (id, id_code, ticket_id, event_id, client_name, amount, reason, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(2, 'REF-002', 9, 2, 'Nina Ralay', 80000, 'Erreur de date', 'pending', '2026-03-01');

    db.prepare('INSERT INTO payouts (id, id_code, organizer_id, amount, commission, net, method, status, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(1, 'PAY-001', 6, 50000000, 1500000, 48500000, 'Virement', 'completed', '2026-02-28', '2026-02-28');
    db.prepare('INSERT INTO payouts (id, id_code, organizer_id, amount, commission, net, method, status, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(2, 'PAY-002', 5, 30000000, 900000, 29100000, 'Mobile Money', 'pending', '2026-03-01', null);
    db.prepare('INSERT INTO payouts (id, id_code, organizer_id, amount, commission, net, method, status, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(3, 'PAY-045', 5, 30000000, 900000, 29100000, 'Virement BNI', 'completed', '2026-02-25', '2026-02-25');
    db.prepare('INSERT INTO payouts (id, id_code, organizer_id, amount, commission, net, method, status, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(4, 'PAY-038', 5, 25000000, 750000, 24250000, 'Mobile Money', 'completed', '2026-02-15', '2026-02-15');
    db.prepare('INSERT INTO payouts (id, id_code, organizer_id, amount, commission, net, method, status, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(5, 'PAY-031', 5, 35000000, 1050000, 33950000, 'Virement BNI', 'completed', '2026-02-01', '2026-02-01');

    db.prepare('INSERT INTO team_members (id, organizer_id, user_id, role, role_label, events_access, last_access) VALUES (?,?,?,?,?,?,?)').run(1, 5, 10, 'admin', 'Admin', 'Tous', '2026-03-03');
    db.prepare('INSERT INTO team_members (id, organizer_id, user_id, role, role_label, events_access, last_access) VALUES (?,?,?,?,?,?,?)').run(2, 5, 11, 'guichetier', 'Guichetier', 'Festival Donia', '2026-03-03');
    db.prepare('INSERT INTO team_members (id, organizer_id, user_id, role, role_label, events_access, last_access) VALUES (?,?,?,?,?,?,?)').run(3, 5, 12, 'analyste', 'Analyste', 'Tous', '2026-03-02');

    db.prepare('INSERT INTO activity_log (id, type, icon, text, user_id, created_at) VALUES (?,?,?,?,?,?)').run(1, 'sale', 'mdi-ticket', '<strong>+25 billets</strong> Dama Live 2026', null, '2026-03-03 10:55:00');
    db.prepare('INSERT INTO activity_log (id, type, icon, text, user_id, created_at) VALUES (?,?,?,?,?,?)').run(2, 'user', 'mdi-account-plus', 'Nouveau client: <strong>Event Pro</strong>', null, '2026-03-03 10:37:00');
    db.prepare('INSERT INTO activity_log (id, type, icon, text, user_id, created_at) VALUES (?,?,?,?,?,?)').run(3, 'refund', 'mdi-cash-refund', 'Remboursement <strong>Rabe Faly</strong>', null, '2026-03-03 09:00:00');
    db.prepare('INSERT INTO activity_log (id, type, icon, text, user_id, created_at) VALUES (?,?,?,?,?,?)').run(4, 'event', 'mdi-calendar-plus', 'Événement: <strong>Beach Party</strong>', null, '2026-03-03 08:00:00');
}

// ============ HELPERS ============
function getUser(token) {
    if (!token) return null;
    const session = db.prepare(`SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')`).get(token);
    if (!session) return null;
    const user = db.prepare('SELECT id, name, email, role, plan, avatar_initials, phone, status, created_at, last_login FROM users WHERE id = ?').get(session.user_id);
    return user;
}

function requireAuth(req, roles) {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    const user = getUser(token);
    if (!user) return null;
    if (roles && !roles.includes(user.role)) return null;
    return user;
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); } catch { resolve({}); }
        });
    });
}

function sendJSON(res, data, code = 200) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
}

function sendError(res, msg, code = 400) {
    sendJSON(res, { error: msg }, code);
}

// ============ ROUTE HANDLERS ============

// AUTH
async function handleAuth(req, res, parts) {
    const action = parts[2];

    if (action === 'register' && req.method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.email || !body.password) return sendError(res, 'Nom, email et mot de passe requis');
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email);
        if (existing) return sendError(res, 'Cet email est déjà utilisé');
        const hash = hashPassword(body.password);
        const initials = (body.name[0] + (body.name.split(' ').pop()?.[0] || body.name[1] || '')).toUpperCase();
        const result = db.prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?,?,?,?,?,?)').run(body.name, body.email, hash, body.role || 'buyer', initials, 'active');
        const token = generateToken();
        const expires = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString().replace('T', ' ').split('.')[0];
        db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)').run(result.lastInsertRowid, token, expires);
        const user = db.prepare('SELECT id, name, email, role, plan, avatar_initials, phone, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
        return sendJSON(res, { user, token }, 201);
    }

    if (action === 'login' && req.method === 'POST') {
        const body = await parseBody(req);
        if (!body.email || !body.password) return sendError(res, 'Email et mot de passe requis');
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email);
        if (!user || !verifyPassword(body.password, user.password_hash)) return sendError(res, 'Email ou mot de passe incorrect', 401);
        db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
        const token = generateToken();
        const expires = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString().replace('T', ' ').split('.')[0];
        db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)').run(user.id, token, expires);
        delete user.password_hash;
        return sendJSON(res, { user, token });
    }

    if (action === 'oauth' && req.method === 'POST') {
        const body = await parseBody(req);
        const provider = body.provider || 'google';
        let email = body.email || `user_${provider}_${Date.now()}@ticketmada.local`;
        let name = body.name || `Utilisateur ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            const hash = hashPassword(generateToken());
            const initials = (name[0] + (name.split(' ').pop()?.[0] || name[1] || '')).toUpperCase();
            const r = db.prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?,?,?,?,?,?)').run(name, email, hash, 'buyer', initials, 'active');
            user = db.prepare('SELECT id, name, email, role, plan, avatar_initials, phone, status, created_at FROM users WHERE id = ?').get(r.lastInsertRowid);
        } else {
            db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
            delete user.password_hash;
        }
        const token = generateToken();
        const expires = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString().replace('T', ' ').split('.')[0];
        db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)').run(user.id, token, expires);
        return sendJSON(res, { user, token });
    }

    if (action === 'me' && req.method === 'GET') {
        const user = requireAuth(req);
        if (!user) return sendError(res, 'Non authentifié', 401);
        return sendJSON(res, { user });
    }

    if (action === 'logout' && req.method === 'POST') {
        const auth = req.headers['authorization'] || '';
        const token = auth.replace('Bearer ', '');
        if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        return sendJSON(res, { message: 'Déconnecté' });
    }

    sendError(res, 'Route auth non trouvée', 404);
}

// EVENTS
async function handleEvents(req, res, parts) {
    const id = parts[2] && !isNaN(parts[2]) ? parseInt(parts[2]) : null;
    const action = id ? parts[3] : parts[2];

    // Search / autocomplete endpoint
    if (action === 'search' && req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        const q = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '10');
        if (!q || q.length < 2) return sendError(res, 'Query too short (min 2 chars)');
        const pattern = '%' + q + '%';
        const events = db.prepare("SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE (e.name LIKE ? OR e.venue LIKE ? OR e.category LIKE ? OR e.description LIKE ?) AND e.status IN ('active','pending') ORDER BY e.tickets_sold DESC LIMIT ?").all(pattern, pattern, pattern, pattern, limit);
        const categories = db.prepare("SELECT category as name, COUNT(*) as count FROM events WHERE (category LIKE ? OR name LIKE ?) AND status IN ('active','pending') GROUP BY category").all(pattern, pattern);
        const icons = { concerts: '🎵', festivals: '🎪', sports: '⚽', theatre: '🎭' };
        categories.forEach(c => c.icon = icons[c.name] || '🎫');
        return sendJSON(res, { events, categories, query: q });
    }

    if (action === 'featured' && req.method === 'GET') {
        const limit = parseInt(new URL(req.url, 'http://localhost').searchParams.get('limit') || '8');
        const events = db.prepare("SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.status IN ('active','pending') ORDER BY e.tickets_sold DESC LIMIT ?").all(limit);
        return sendJSON(res, { events });
    }

    if (action === 'categories' && req.method === 'GET') {
        const cats = db.prepare("SELECT category, COUNT(*) as count FROM events WHERE status IN ('active','pending') GROUP BY category ORDER BY count DESC").all();
        const icons = { concerts: '🎵', festivals: '🎪', sports: '⚽', theatre: '🎭' };
        cats.forEach(c => c.icon = icons[c.category] || '🎫');
        return sendJSON(res, { categories: cats });
    }

    // Seat/zone availability for an event
    if (action === 'seats' && req.method === 'GET' && id) {
        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
        if (!event) return sendError(res, 'Événement non trouvé', 404);
        const sold = db.prepare("SELECT type, COUNT(*) as count FROM tickets WHERE event_id = ? AND status IN ('active','scanned') GROUP BY type").all(id);
        const soldMap = {};
        sold.forEach(s => { soldMap[s.type.toLowerCase()] = s.count; });
        const capacity = event.capacity || 1000;
        const zoneDistribution = { vip: 0.08, premium: 0.20, standard: 0.35, eco: 0.30, pit: 0.07 };
        const zonePrices = { vip: 150000, premium: 80000, standard: 40000, eco: 20000, pit: 60000 };
        const zones = Object.entries(zoneDistribution).map(([zoneId, pct]) => {
            const total = Math.round(capacity * pct);
            const soldCount = soldMap[zoneId] || 0;
            return { id: zoneId, name: zoneId.charAt(0).toUpperCase() + zoneId.slice(1), total, sold: Math.min(soldCount, total), available: Math.max(0, total - soldCount), price: zonePrices[zoneId] || 40000 };
        });
        return sendJSON(res, { event_id: parseInt(id), capacity, zones });
    }

    if (req.method === 'GET' && id) {
        const event = db.prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.id = ?').get(id);
        if (!event) return sendError(res, 'Événement non trouvé', 404);
        return sendJSON(res, { event });
    }

    if (req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        let where = ['1=1'], params = [];
        if (url.searchParams.get('category') && url.searchParams.get('category') !== 'all') { where.push('e.category = ?'); params.push(url.searchParams.get('category')); }
        if (url.searchParams.get('status')) { where.push('e.status = ?'); params.push(url.searchParams.get('status')); }
        if (url.searchParams.get('search')) { where.push('(e.name LIKE ? OR e.venue LIKE ?)'); params.push(`%${url.searchParams.get('search')}%`, `%${url.searchParams.get('search')}%`); }
        if (url.searchParams.get('organizer_id')) { where.push('e.organizer_id = ?'); params.push(parseInt(url.searchParams.get('organizer_id'))); }
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const events = db.prepare(`SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE ${where.join(' AND ')} ORDER BY e.date_start ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
        const total = db.prepare(`SELECT COUNT(*) as c FROM events e WHERE ${where.join(' AND ')}`).get(...params).c;
        return sendJSON(res, { events, total });
    }

    if (req.method === 'POST') {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const body = await parseBody(req);
        if (!body.name || !body.category || !body.date_start || !body.venue || !body.capacity) return sendError(res, 'Champs requis manquants');
        const r = db.prepare('INSERT INTO events (organizer_id, name, category, description, emoji, date_start, date_end, venue, capacity, image_url, badge, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(user.id, body.name, body.category, body.description||'', body.emoji||'🎫', body.date_start, body.date_end||null, body.venue, body.capacity, body.image_url||null, body.badge||null, body.status||'pending');
        db.prepare('INSERT INTO activity_log (type, icon, text, user_id) VALUES (?,?,?,?)').run('event', 'mdi-calendar-plus', `Événement: <strong>${body.name}</strong>`, user.id);
        const event = db.prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.id = ?').get(r.lastInsertRowid);
        return sendJSON(res, { event }, 201);
    }

    if (req.method === 'PUT' && id) {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const body = await parseBody(req);
        const allowed = ['name', 'category', 'description', 'emoji', 'date_start', 'date_end', 'venue', 'capacity', 'image_url', 'badge', 'status'];
        const sets = [], vals = [];
        for (const f of allowed) { if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); } }
        if (!sets.length) return sendError(res, 'Aucun champ à mettre à jour');
        vals.push(id);
        db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
        const event = db.prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.id = ?').get(id);
        return sendJSON(res, { event });
    }

    if (req.method === 'DELETE' && id) {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(id);
        return sendJSON(res, { message: 'Événement supprimé' });
    }

    sendError(res, 'Route non trouvée', 404);
}

// TICKETS
async function handleTickets(req, res, parts) {
    const id = parts[2] && !isNaN(parts[2]) ? parseInt(parts[2]) : null;
    const action = id ? parts[3] : parts[2];

    if ((action === 'purchase' || (!action && req.method === 'POST')) && req.method === 'POST') {
        const user = requireAuth(req);
        if (!user) return sendError(res, 'Non authentifié', 401);
        const body = await parseBody(req);
        if (!body.event_id || !body.price) return sendError(res, 'event_id et price requis');
        const event = db.prepare("SELECT * FROM events WHERE id = ? AND status = 'active'").get(body.event_id);
        if (!event) return sendError(res, 'Événement non disponible');
        const qty = body.quantity || 1;
        if (event.tickets_sold + qty > event.capacity) return sendError(res, 'Plus assez de places');
        const tickets = [];
        const insert = db.transaction(() => {
            for (let i = 0; i < qty; i++) {
                let code;
                do {
                    code = 'TKT-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0');
                } while (db.prepare('SELECT id FROM tickets WHERE id_code = ?').get(code));
                db.prepare('INSERT INTO tickets (id_code, event_id, buyer_id, type, price, status) VALUES (?,?,?,?,?,?)').run(code, body.event_id, user.id, body.type || 'Standard', body.price, 'active');
                tickets.push({ id_code: code, type: body.type || 'Standard', price: body.price });
            }
            db.prepare('UPDATE events SET tickets_sold = tickets_sold + ?, revenue = revenue + ? WHERE id = ?').run(qty, body.price * qty, body.event_id);
            db.prepare('INSERT INTO activity_log (type, icon, text, user_id) VALUES (?,?,?,?)').run('sale', 'mdi-ticket', `<strong>+${qty} billet${qty > 1 ? 's' : ''}</strong> ${event.name}`, user.id);
        });
        insert();
        return sendJSON(res, { tickets, total: body.price * qty }, 201);
    }

    if (action === 'scan' && req.method === 'PUT' && id) {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? OR id_code = ?').get(id, String(id));
        if (!ticket) return sendError(res, 'Billet non trouvé', 404);
        if (ticket.status === 'scanned') return sendError(res, 'Déjà scanné');
        if (ticket.status !== 'active') return sendError(res, 'Billet non valide');
        db.prepare(`UPDATE tickets SET status = 'scanned', scanned_at = datetime('now') WHERE id = ?`).run(ticket.id);
        return sendJSON(res, { message: 'Billet scanné', ticket_code: ticket.id_code });
    }

    if ((action === 'stats' || parts[2] === 'stats') && req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        let where = '1=1', params = [];
        if (url.searchParams.get('organizer_id')) { where = 'e.organizer_id = ?'; params.push(parseInt(url.searchParams.get('organizer_id'))); }
        const stats = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN t.status='scanned' THEN 1 ELSE 0 END) as scanned, SUM(CASE WHEN t.status='active' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN t.status='refunded' THEN 1 ELSE 0 END) as refunded, COALESCE(SUM(t.price),0) as total_revenue FROM tickets t LEFT JOIN events e ON t.event_id = e.id WHERE ${where}`).get(...params);
        stats.scan_rate = stats.total > 0 ? Math.round((stats.scanned / stats.total) * 100) : 0;
        return sendJSON(res, { stats });
    }

    if (req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        let where = ['1=1'], params = [];
        if (url.searchParams.get('event_id')) { where.push('t.event_id = ?'); params.push(parseInt(url.searchParams.get('event_id'))); }
        if (url.searchParams.get('buyer_id')) { where.push('t.buyer_id = ?'); params.push(parseInt(url.searchParams.get('buyer_id'))); }
        if (url.searchParams.get('status')) { where.push('t.status = ?'); params.push(url.searchParams.get('status')); }
        if (url.searchParams.get('organizer_id')) { where.push('e.organizer_id = ?'); params.push(parseInt(url.searchParams.get('organizer_id'))); }
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const tickets = db.prepare(`SELECT t.*, e.name as event_name, u.name as buyer_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id LEFT JOIN users u ON t.buyer_id = u.id WHERE ${where.join(' AND ')} ORDER BY t.created_at DESC LIMIT ?`).all(...params, limit);
        return sendJSON(res, { tickets });
    }

    sendError(res, 'Route non trouvée', 404);
}

// REFUNDS
async function handleRefunds(req, res, parts) {
    const id = parts[2] && !isNaN(parts[2]) ? parseInt(parts[2]) : null;
    const action = id ? parts[3] : null;

    if (action === 'approve' && req.method === 'PUT') {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const refund = db.prepare('SELECT * FROM refunds WHERE id = ?').get(id);
        if (!refund) return sendError(res, 'Non trouvé', 404);
        if (refund.status !== 'pending') return sendError(res, 'Déjà traité');
        db.prepare(`UPDATE refunds SET status = 'approved', updated_at = datetime('now') WHERE id = ?`).run(id);
        db.prepare(`UPDATE tickets SET status = 'refunded' WHERE id = ?`).run(refund.ticket_id);
        db.prepare('UPDATE events SET tickets_sold = MAX(0, tickets_sold-1), revenue = MAX(0, revenue-?) WHERE id = ?').run(refund.amount, refund.event_id);
        return sendJSON(res, { message: 'Remboursement approuvé' });
    }

    if (action === 'reject' && req.method === 'PUT') {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        db.prepare(`UPDATE refunds SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`).run(id);
        return sendJSON(res, { message: 'Remboursement refusé' });
    }

    if (req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        let where = ['1=1'], params = [];
        if (url.searchParams.get('status')) { where.push('r.status = ?'); params.push(url.searchParams.get('status')); }
        const refunds = db.prepare(`SELECT r.*, e.name as event_name, t.id_code as ticket_code FROM refunds r LEFT JOIN events e ON r.event_id = e.id LEFT JOIN tickets t ON r.ticket_id = t.id WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC`).all(...params);
        const pending = db.prepare("SELECT COUNT(*) as c FROM refunds WHERE status = 'pending'").get().c;
        return sendJSON(res, { refunds, pending_count: pending });
    }

    if (req.method === 'POST') {
        const user = requireAuth(req);
        if (!user) return sendError(res, 'Non authentifié', 401);
        const body = await parseBody(req);
        if (!body.ticket_id) return sendError(res, 'ticket_id requis');
        const ticket = db.prepare('SELECT t.*, e.name as event_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id WHERE t.id = ?').get(body.ticket_id);
        if (!ticket) return sendError(res, 'Billet non trouvé', 404);
        const code = 'REF-' + String(Math.floor(Math.random() * 999999)).padStart(6, '0');
        db.prepare('INSERT INTO refunds (id_code, ticket_id, event_id, client_name, amount, reason, status) VALUES (?,?,?,?,?,?,?)').run(code, body.ticket_id, ticket.event_id, user.name, ticket.price, body.reason || '', 'pending');
        return sendJSON(res, { refund: { id_code: code, status: 'pending' } }, 201);
    }

    sendError(res, 'Route non trouvée', 404);
}

// PAYOUTS
async function handlePayouts(req, res, parts) {
    const id = parts[2] && !isNaN(parts[2]) ? parseInt(parts[2]) : null;
    const action = id ? parts[3] : parts[2];

    if ((action === 'stats' || parts[2] === 'stats') && req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        let where = '1=1', params = [];
        if (url.searchParams.get('organizer_id')) { where = 'organizer_id = ?'; params.push(parseInt(url.searchParams.get('organizer_id'))); }
        const stats = db.prepare(`SELECT COALESCE(SUM(CASE WHEN status='completed' THEN net ELSE 0 END),0) as total_paid, COALESCE(SUM(CASE WHEN status='pending' THEN net ELSE 0 END),0) as pending_amount, COALESCE(SUM(commission),0) as total_commission, COUNT(CASE WHEN strftime('%Y-%m',created_at)=strftime('%Y-%m','now') THEN 1 END) as this_month_count FROM payouts WHERE ${where}`).get(...params);
        return sendJSON(res, { stats });
    }

    if (req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        let where = ['1=1'], params = [];
        if (url.searchParams.get('organizer_id')) { where.push('p.organizer_id = ?'); params.push(parseInt(url.searchParams.get('organizer_id'))); }
        if (url.searchParams.get('status')) { where.push('p.status = ?'); params.push(url.searchParams.get('status')); }
        const payouts = db.prepare(`SELECT p.*, u.name as organizer_name FROM payouts p LEFT JOIN users u ON p.organizer_id = u.id WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC`).all(...params);
        return sendJSON(res, { payouts });
    }

    if (req.method === 'POST') {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const body = await parseBody(req);
        const amount = parseInt(body.amount || 0);
        if (!amount) return sendError(res, 'Montant requis');
        const commission = Math.round(amount * COMMISSION_RATE);
        const net = amount - commission;
        const code = 'PAY-' + String(Math.floor(Math.random() * 999999)).padStart(6, '0');
        db.prepare('INSERT INTO payouts (id_code, organizer_id, amount, commission, net, method, status) VALUES (?,?,?,?,?,?,?)').run(code, body.organizer_id || user.id, amount, commission, net, body.method || 'Virement', 'pending');
        return sendJSON(res, { payout: { id_code: code, amount, commission, net, status: 'pending' } }, 201);
    }

    sendError(res, 'Route non trouvée', 404);
}

// CLIENTS
async function handleClients(req, res, parts) {
    const id = parts[2] && !isNaN(parts[2]) ? parseInt(parts[2]) : null;

    if (req.method === 'GET' && !id) {
        const user = requireAuth(req, ['admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const url = new URL(req.url, 'http://localhost');
        let where = ["u.role = 'organizer'"], params = [];
        if (url.searchParams.get('status')) { where.push('u.status = ?'); params.push(url.searchParams.get('status')); }
        if (url.searchParams.get('plan')) { where.push('u.plan = ?'); params.push(url.searchParams.get('plan')); }
        if (url.searchParams.get('search')) { where.push('(u.name LIKE ? OR u.email LIKE ?)'); params.push(`%${url.searchParams.get('search')}%`, `%${url.searchParams.get('search')}%`); }
        const clients = db.prepare(`SELECT u.id, u.name, u.email, u.avatar_initials, u.plan, u.phone, u.status, u.created_at, (SELECT COUNT(*) FROM events WHERE organizer_id=u.id AND status!='cancelled') as events_count, (SELECT COALESCE(SUM(revenue),0) FROM events WHERE organizer_id=u.id) as total_revenue FROM users u WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC`).all(...params);
        return sendJSON(res, { clients });
    }

    if (req.method === 'POST') {
        const user = requireAuth(req, ['admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const body = await parseBody(req);
        if (!body.name || !body.email) return sendError(res, 'Nom et email requis');
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email);
        if (existing) return sendError(res, 'Email déjà utilisé');
        const hash = hashPassword('password123');
        const initials = (body.name[0] + (body.name.split(' ').pop()?.[0] || '')).toUpperCase();
        const r = db.prepare('INSERT INTO users (name, email, password_hash, role, plan, avatar_initials, phone, status) VALUES (?,?,?,?,?,?,?,?)').run(body.name, body.email, hash, 'organizer', body.plan || 'starter', initials, body.phone || '', body.status || 'active');
        db.prepare('INSERT INTO activity_log (type, icon, text, user_id) VALUES (?,?,?,?)').run('user', 'mdi-account-plus', `Nouveau client: <strong>${body.name}</strong>`, user.id);
        return sendJSON(res, { client: { id: r.lastInsertRowid, name: body.name, email: body.email, plan: body.plan || 'starter' } }, 201);
    }

    if (req.method === 'PUT' && id) {
        const user = requireAuth(req, ['admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const body = await parseBody(req);
        const allowed = ['name', 'email', 'phone', 'plan', 'status'];
        const sets = [], vals = [];
        for (const f of allowed) { if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); } }
        if (!sets.length) return sendError(res, 'Aucun champ');
        vals.push(id);
        db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ? AND role = 'organizer'`).run(...vals);
        return sendJSON(res, { message: 'Client mis à jour' });
    }

    if (req.method === 'DELETE' && id) {
        const user = requireAuth(req, ['admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        db.prepare("UPDATE users SET status = 'suspended' WHERE id = ? AND role = 'organizer'").run(id);
        return sendJSON(res, { message: 'Client suspendu' });
    }

    sendError(res, 'Route non trouvée', 404);
}

// TEAM
async function handleTeam(req, res, parts) {
    const id = parts[2] && !isNaN(parts[2]) ? parseInt(parts[2]) : null;

    if (req.method === 'GET') {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const url = new URL(req.url, 'http://localhost');
        const orgId = url.searchParams.get('organizer_id') || user.id;
        const team = db.prepare('SELECT tm.*, u.name, u.email, u.avatar_initials FROM team_members tm LEFT JOIN users u ON tm.user_id = u.id WHERE tm.organizer_id = ? ORDER BY tm.created_at DESC').all(orgId);
        return sendJSON(res, { team });
    }

    if (req.method === 'POST') {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const body = await parseBody(req);
        if (!body.name || !body.email) return sendError(res, 'Nom et email requis');
        let memberUser = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email);
        if (!memberUser) {
            const hash = hashPassword('password123');
            const initials = (body.name[0] + (body.name.split(' ').pop()?.[0] || '')).toUpperCase();
            const r = db.prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?,?,?,?,?,?)').run(body.name, body.email, hash, 'organizer', initials, 'active');
            memberUser = { id: r.lastInsertRowid };
        }
        db.prepare(`INSERT INTO team_members (organizer_id, user_id, role, role_label, events_access, last_access) VALUES (?,?,?,?,?,datetime('now'))`).run(user.id, memberUser.id, body.role || 'guichetier', body.role_label || ucfirst(body.role || 'guichetier'), body.events_access || 'Tous');
        return sendJSON(res, { message: 'Membre ajouté' }, 201);
    }

    if (req.method === 'PUT' && id) {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const body = await parseBody(req);
        const allowed = ['role', 'role_label', 'events_access'];
        const sets = [], vals = [];
        for (const f of allowed) { if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); } }
        if (sets.length) { vals.push(id); db.prepare(`UPDATE team_members SET ${sets.join(', ')} WHERE id = ?`).run(...vals); }
        return sendJSON(res, { message: 'Membre mis à jour' });
    }

    if (req.method === 'DELETE' && id) {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        db.prepare('DELETE FROM team_members WHERE id = ? AND organizer_id = ?').run(id, user.id);
        return sendJSON(res, { message: 'Membre retiré' });
    }

    sendError(res, 'Route non trouvée', 404);
}

function ucfirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ANALYTICS
async function handleAnalytics(req, res, parts) {
    const action = parts[2];

    if (action === 'dashboard' && req.method === 'GET') {
        const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);
        const url = new URL(req.url, 'http://localhost');
        const orgId = parseInt(url.searchParams.get('organizer_id') || user.id);

        const totalRevenue = db.prepare('SELECT COALESCE(SUM(revenue),0) as v FROM events WHERE organizer_id=?').get(orgId).v;
        const ts = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN t.status='scanned' THEN 1 ELSE 0 END) as scanned, SUM(CASE WHEN t.status='active' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN t.status='refunded' THEN 1 ELSE 0 END) as refunded FROM tickets t JOIN events e ON t.event_id=e.id WHERE e.organizer_id=?").get(orgId);
        const ps = db.prepare("SELECT COALESCE(SUM(CASE WHEN status='completed' THEN net ELSE 0 END),0) as paid_out, COALESCE(SUM(CASE WHEN status='pending' THEN net ELSE 0 END),0) as pending_balance FROM payouts WHERE organizer_id=?").get(orgId);
        const monthRev = db.prepare("SELECT COALESCE(SUM(t.price),0) as v FROM tickets t JOIN events e ON t.event_id=e.id WHERE e.organizer_id=? AND strftime('%Y-%m',t.created_at)=strftime('%Y-%m','now')").get(orgId).v;
        const events = db.prepare("SELECT * FROM events WHERE organizer_id=? AND status!='cancelled' ORDER BY date_start ASC").all(orgId);
        const tickets = db.prepare('SELECT t.*, e.name as event_name, u.name as buyer_name FROM tickets t JOIN events e ON t.event_id=e.id LEFT JOIN users u ON t.buyer_id=u.id WHERE e.organizer_id=? ORDER BY t.created_at DESC LIMIT 20').all(orgId);
        const payouts = db.prepare('SELECT * FROM payouts WHERE organizer_id=? ORDER BY created_at DESC LIMIT 10').all(orgId);

        return sendJSON(res, {
            myRevenue: totalRevenue, monthRevenue: monthRev,
            myTicketsSold: ts.total || 0, scannedTickets: ts.scanned || 0, pendingTickets: ts.pending || 0, refundedTickets: ts.refunded || 0,
            scanRate: ts.total > 0 ? Math.round((ts.scanned / ts.total) * 100) : 0,
            totalRevenue, paidOut: ps.paid_out,
            availableBalance: Math.max(0, totalRevenue - ps.paid_out - ps.pending_balance),
            pendingBalance: ps.pending_balance,
            myEvents: events, myTickets: tickets, myPayouts: payouts,
        });
    }

    if (action === 'superadmin' && req.method === 'GET') {
        const user = requireAuth(req, ['admin', 'superadmin']);
        if (!user) return sendError(res, 'Non autorisé', 403);

        const totalRevenue = db.prepare('SELECT COALESCE(SUM(revenue),0) as v FROM events').get().v;
        const totalTickets = db.prepare('SELECT COUNT(*) as c FROM tickets').get().c;
        const activeEvents = db.prepare("SELECT COUNT(*) as c FROM events WHERE status='active'").get().c;
        const totalClients = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='organizer'").get().c;
        const ts = db.prepare("SELECT SUM(CASE WHEN status='scanned' THEN 1 ELSE 0 END) as scanned, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END) as refunded FROM tickets").get();
        const pendingRefunds = db.prepare("SELECT COUNT(*) as c FROM refunds WHERE status='pending'").get().c;
        const ps = db.prepare("SELECT COALESCE(SUM(CASE WHEN status='completed' THEN net ELSE 0 END),0) as total_payouts, COALESCE(SUM(CASE WHEN status='pending' THEN net ELSE 0 END),0) as pending_amount, COALESCE(SUM(commission),0) as commission_total, COUNT(CASE WHEN strftime('%Y-%m',created_at)=strftime('%Y-%m','now') THEN 1 END) as payout_count FROM payouts").get();
        const avgPrice = totalTickets > 0 ? Math.round(db.prepare('SELECT AVG(price) as v FROM tickets').get().v) : 0;
        const scanRate = totalTickets > 0 ? Math.round(((ts.scanned || 0) / totalTickets) * 100) : 0;
        const topEvents = db.prepare("SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id=u.id WHERE e.status!='cancelled' ORDER BY e.revenue DESC LIMIT 5").all();

        return sendJSON(res, {
            totalRevenue, totalTickets, activeEvents, totalClients,
            scannedTickets: ts.scanned || 0, pendingTickets: ts.pending || 0, refundedTickets: ts.refunded || 0,
            pendingRefunds,
            totalPayouts: ps.total_payouts, pendingPayoutsAmount: ps.pending_amount,
            commissionTotal: ps.commission_total, payoutCount: ps.payout_count,
            conversionRate: 12.5, avgTicketPrice: avgPrice, avgScanRate: scanRate,
            topEvents,
        });
    }

    sendError(res, 'Route analytics non trouvée', 404);
}

// ACTIVITY
async function handleActivity(req, res, parts) {
    if (req.method !== 'GET') return sendError(res, 'Méthode non autorisée', 405);
    const url = new URL(req.url, 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const type = url.searchParams.get('type');
    let where = '1=1', params = [];
    if (type) { where = 'type = ?'; params.push(type); }
    params.push(limit);
    const activities = db.prepare(`SELECT * FROM activity_log WHERE ${where} ORDER BY created_at DESC LIMIT ?`).all(...params);
    activities.forEach(a => {
        const diff = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 1000);
        if (diff < 60) a.time = `Il y a ${diff} sec`;
        else if (diff < 3600) a.time = `Il y a ${Math.floor(diff / 60)} min`;
        else if (diff < 86400) a.time = `Il y a ${Math.floor(diff / 3600)}h`;
        else a.time = `Il y a ${Math.floor(diff / 86400)}j`;
    });
    return sendJSON(res, { activities });
}

// ============ STATIC FILES ============
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath === '') urlPath = '/User/ticketmada-landing.html';
    
    // Potential search paths
    const searchPaths = [
        path.join(PROJECT_ROOT, urlPath),
        path.join(PROJECT_ROOT, 'User', urlPath),
        path.join(PROJECT_ROOT, 'Admin', urlPath)
    ];

    for (const filePath of searchPaths) {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
            return true;
        }
    }
    return false;
}

// ============ SERVER ============
initDB();

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const parts = pathname.split('/').filter(Boolean);

    // API routes
    if (parts[0] === 'api') {
        try {
            switch (parts[1]) {
                case 'auth': return await handleAuth(req, res, parts);
                case 'events': return await handleEvents(req, res, parts);
                case 'tickets': return await handleTickets(req, res, parts);
                case 'refunds': return await handleRefunds(req, res, parts);
                case 'payouts': return await handlePayouts(req, res, parts);
                case 'clients': return await handleClients(req, res, parts);
                case 'team': return await handleTeam(req, res, parts);
                case 'analytics': return await handleAnalytics(req, res, parts);
                case 'activity': return await handleActivity(req, res, parts);
                default: return sendError(res, 'Route non trouvée', 404);
            }
        } catch (err) {
            console.error('Error:', err);
            return sendError(res, 'Erreur serveur: ' + err.message, 500);
        }
    }

    // Static files
    if (!serveStatic(req, res)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    // Get local IP for LAN access
    const nets = require('os').networkInterfaces();
    let localIP = 'localhost';
    for (const iface of Object.values(nets)) {
        for (const net of iface) {
            if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
        }
    }
    console.log(`\n🎫 TicketMada Server running at http://localhost:${PORT}`);
    console.log(`   📱 LAN access: http://${localIP}:${PORT}`);
    console.log(`   Landing:    http://localhost:${PORT}/User/ticketmada-landing.html`);
    console.log(`   Organizer:  http://localhost:${PORT}/User/ticketmada-organisateur.html`);
    console.log(`   Ticketing:  http://localhost:${PORT}/User/ticketmada-ticketing.html`);
    console.log(`   Dashboard:  http://localhost:${PORT}/Admin/ticketmada-dashboard.html`);
    console.log(`   SuperAdmin: http://localhost:${PORT}/Admin/ticketmada-superadmin.html`);
    console.log(`\n   Default login: superadmin@ticketmada.mg / password123`);
    console.log(`   Organizer:    contact@donia.mg / password123\n`);
});

process.on('SIGINT', () => { db.close(); process.exit(); });
process.on('SIGTERM', () => { db.close(); process.exit(); });
