// TicketMada Node.js API Server
// Uses better-sqlite3 for database, native http for server
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(PROJECT_ROOT, 'data', 'ticketmada.db');
const COMMISSION_RATE = 0.03;
const TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sedrayiokoraz@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

async function sendOrganizerApplicationEmail(applicationId, formData, user) {
    const eventTypes = JSON.parse(formData.event_types || '[]').join(', ');
    const socialMedia = formData.social_facebook || formData.social_instagram || formData.social_tiktok || 'Non renseigné';
    const reviewUrl = `${APP_URL}/Admin/ticketmada-superadmin.html?page=applications&id=${applicationId}`;
    
    const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFF8F0; border: 3px solid #1a1a1a; box-shadow: 6px 6px 0 #1a1a1a;">
        <div style="background: #FF6B4A; padding: 24px; border-bottom: 3px solid #1a1a1a;">
            <h1 style="color: white; font-size: 22px; margin: 0;">🎫 TicketMada</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 6px 0 0;">Nouvelle demande d'organisateur</p>
        </div>
        <div style="padding: 24px;">
            <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 20px;">
                Bonjour Sedra,<br><br>
                <strong>${formData.full_name}</strong> souhaite devenir organisateur sur TicketMada.
            </p>
            <div style="background: white; border: 2px solid #1a1a1a; padding: 16px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 12px; font-size: 14px; color: #FF6B4A; text-transform: uppercase; letter-spacing: 1px;">👤 Informations personnelles</h3>
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 4px 0; color: #666; width: 140px;">Nom complet</td><td style="padding: 4px 0; font-weight: 600;">${formData.full_name}</td></tr>
                    <tr><td style="padding: 4px 0; color: #666;">Email</td><td style="padding: 4px 0;">${user.email}</td></tr>
                    <tr><td style="padding: 4px 0; color: #666;">Téléphone</td><td style="padding: 4px 0;">${formData.phone}</td></tr>
                    <tr><td style="padding: 4px 0; color: #666;">Ville</td><td style="padding: 4px 0;">${formData.city}</td></tr>
                </table>
            </div>
            <div style="background: white; border: 2px solid #1a1a1a; padding: 16px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 12px; font-size: 14px; color: #FF6B4A; text-transform: uppercase; letter-spacing: 1px;">🏢 Organisation</h3>
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 4px 0; color: #666; width: 140px;">Type</td><td style="padding: 4px 0; font-weight: 600;">${formData.organization_type}</td></tr>
                    ${formData.organization_name ? `<tr><td style="padding: 4px 0; color: #666;">Nom</td><td style="padding: 4px 0;">${formData.organization_name}</td></tr>` : ''}
                    ${formData.website ? `<tr><td style="padding: 4px 0; color: #666;">Site web</td><td style="padding: 4px 0;">${formData.website}</td></tr>` : ''}
                    <tr><td style="padding: 4px 0; color: #666;">Réseaux sociaux</td><td style="padding: 4px 0;">${socialMedia}</td></tr>
                </table>
            </div>
            <div style="background: white; border: 2px solid #1a1a1a; padding: 16px; margin-bottom: 16px; border-left: 10px solid #2e7d32;">
                <h3 style="margin: 0 0 12px; font-size: 14px; color: #2e7d32; text-transform: uppercase; letter-spacing: 1px;">🎫 Événements prévus</h3>
                <p style="font-size: 14px; margin: 0 0 10px;"><strong>Types:</strong> ${eventTypes}</p>
                ${formData.first_event_name ? `<p style="font-size: 14px; margin: 0;"><strong>Prochain:</strong> ${formData.first_event_name} (${formData.first_event_date || '?'})</p>` : ''}
            </div>
            <div style="background: white; border: 2px solid #1a1a1a; padding: 16px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px; font-size: 14px; color: #FF6B4A; text-transform: uppercase; letter-spacing: 1px;">💬 Motivation</h3>
                <p style="font-size: 14px; line-height: 1.6; font-style: italic;">"${formData.motivation}"</p>
            </div>
            <div style="text-align: center;">
                <a href="${reviewUrl}" style="display: inline-block; background: #FF6B4A; color: white; padding: 14px 32px; text-decoration: none; font-weight: 700; border: 3px solid #1a1a1a; box-shadow: 4px 4px 0 #1a1a1a;">
                    👀 Voir la demande complète
                </a>
            </div>
        </div>
    </div>`;
    
    try {
        await emailTransporter.sendMail({
            from: '"TicketMada" <sedrayiokoraz@gmail.com>',
            to: 'sedrayiokoraz@gmail.com',
            subject: `🎫 [TicketMada] Nouvelle demande organisateur — ${formData.full_name}`,
            html: htmlContent
        });
    } catch (err) { console.error('❌ Email error:', err.message); }
}

async function sendApprovalEmail(application) {
    const dashboardUrl = `${APP_URL}/Admin/ticketmada-dashboard.html`;
    const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFF8F0; border: 3px solid #1a1a1a;">
        <div style="background: #00D9A5; padding: 24px; border-bottom: 3px solid #1a1a1a;">
            <h1 style="color: white; font-size: 22px; margin: 0;">🎫 TicketMada</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 6px 0 0;">Demande approuvée !</p>
        </div>
        <div style="padding: 24px;">
            <h2 style="color: #2e7d32; margin-bottom: 16px;">✅ Félicitations ${application.full_name} !</h2>
            <p style="font-size: 15px; line-height: 1.7; color: #333;">
                Votre demande pour devenir organisateur sur TicketMada a été <strong>approuvée</strong> !
            </p>
            <div style="text-align: center; margin-top: 24px;">
                <a href="${dashboardUrl}" style="display: inline-block; background: #FF6B4A; color: white; padding: 14px 32px; text-decoration: none; font-weight: 700; border: 3px solid #1a1a1a; box-shadow: 4px 4px 0 #1a1a1a;">
                    🎪 Accéder à mon dashboard
                </a>
            </div>
        </div>
    </div>`;
    
    try {
        await emailTransporter.sendMail({
            from: '"TicketMada" <sedrayiokoraz@gmail.com>',
            to: application.email,
            subject: `✅ [TicketMada] Votre demande d'organisateur a été approuvée !`,
            html: htmlContent
        });
    } catch (err) { console.error('❌ Email error:', err.message); }
}

async function sendRejectionEmail(application, reason) {
    const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFF8F0; border: 3px solid #1a1a1a;">
        <div style="background: #FF6B4A; padding: 24px; border-bottom: 3px solid #1a1a1a;">
            <h1 style="color: white; font-size: 22px; margin: 0;">🎫 TicketMada</h1>
        </div>
        <div style="padding: 24px;">
            <p style="font-size: 15px; line-height: 1.7; color: #333;">Bonjour ${application.full_name},</p>
            <p style="font-size: 15px; line-height: 1.7; color: #333;">Après examen de votre demande, nous ne sommes pas en mesure de l'approuver pour le moment.</p>
            ${reason ? `<div style="background: #fff3e0; border: 2px solid #ff9800; padding: 16px; margin: 20px 0;"><p style="margin: 0; font-size: 14px; color: #333;">Raison : ${reason}</p></div>` : ''}
            <p style="font-size: 15px; line-height: 1.7; color: #333;">Vous pouvez soumettre une nouvelle demande plus tard.</p>
        </div>
    </div>`;
    
    try {
        await emailTransporter.sendMail({
            from: '"TicketMada" <sedrayiokoraz@gmail.com>',
            to: application.email,
            subject: `[TicketMada] Mise à jour de votre demande d'organisateur`,
            html: htmlContent
        });
    } catch (err) { console.error('❌ Email error:', err.message); }
}

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
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            icon TEXT,
            text TEXT,
            user_id INTEGER,
            actor_id INTEGER,
            actor_name TEXT,
            target_type TEXT,
            target_id INTEGER,
            target_name TEXT,
            description TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (actor_id) REFERENCES users(id)
        );
        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE scan_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE NOT NULL,
            event_id INTEGER NOT NULL,
            organizer_id INTEGER NOT NULL,
            label TEXT DEFAULT 'Lien de scan',
            is_active INTEGER DEFAULT 1,
            expires_at DATETIME,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        );
        CREATE TABLE scan_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_link_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            device_fingerprint TEXT NOT NULL,
            device_name TEXT DEFAULT 'Appareil inconnu',
            browser TEXT,
            os TEXT,
            device_model TEXT,
            ip_address TEXT,
            is_blocked INTEGER DEFAULT 0,
            block_reason TEXT,
            blocked_at DATETIME,
            scan_count INTEGER DEFAULT 0,
            last_activity DATETIME DEFAULT (datetime('now')),
            first_connected DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (scan_link_id) REFERENCES scan_links(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        );
        CREATE TABLE scan_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER,
            event_id INTEGER NOT NULL,
            ticket_code TEXT,
            status TEXT NOT NULL,
            reject_reason TEXT,
            buyer_name TEXT,
            zone TEXT,
            seat TEXT,
            price REAL,
            scanned_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (device_id) REFERENCES scan_devices(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        );
        CREATE TABLE IF NOT EXISTS scan_access_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            request_token TEXT UNIQUE NOT NULL,
            device_info TEXT,
            status TEXT DEFAULT 'pending', 
            approved_by INTEGER,
            updated_at DATETIME DEFAULT (datetime('now')),
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
        );
        -- Note: activity_logs table already defined above in this fix
        CREATE TABLE IF NOT EXISTS organizer_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            city TEXT NOT NULL,
            organization_name TEXT,
            organization_type TEXT NOT NULL,
            organization_description TEXT,
            website TEXT,
            social_media TEXT,
            event_types TEXT NOT NULL,
            first_event_name TEXT,
            first_event_date TEXT,
            first_event_venue TEXT,
            first_event_capacity INTEGER,
            expected_events_per_year INTEGER,
            preferred_payment TEXT NOT NULL,
            mobile_money_number TEXT,
            bank_name TEXT,
            id_document_type TEXT,
            id_document_number TEXT,
            motivation TEXT,
            how_found_us TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            reject_reason TEXT,
            reviewed_by INTEGER,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT (datetime('now')),
            ip_address TEXT,
            user_agent TEXT,
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

    db.prepare('INSERT INTO activity_logs (type, icon, text, user_id, created_at) VALUES (?,?,?,?,?)').run(1, 'sale', 'mdi-ticket', '<strong>+25 billets</strong> Dama Live 2026', null, '2026-03-03 10:55:00');
    db.prepare('INSERT INTO activity_logs (type, icon, text, user_id, created_at) VALUES (?,?,?,?,?)').run(2, 'user', 'mdi-account-plus', 'Nouveau client: <strong>Event Pro</strong>', null, '2026-03-03 10:37:00');
    db.prepare('INSERT INTO activity_logs (type, icon, text, user_id, created_at) VALUES (?,?,?,?,?)').run(3, 'refund', 'mdi-cash-refund', 'Remboursement <strong>Rabe Faly</strong>', null, '2026-03-03 09:00:00');
    db.prepare('INSERT INTO activity_logs (type, icon, text, user_id, created_at) VALUES (?,?,?,?,?)').run(4, 'event', 'mdi-calendar-plus', 'Événement: <strong>Beach Party</strong>', null, '2026-03-03 08:00:00');
}

// ============ HELPERS ============
function logActivity(type, actorId, actorName, targetType, targetId, targetName, description, metadata = null) {
    db.prepare(`
        INSERT INTO activity_logs (type, actor_id, actor_name, target_type, target_id, target_name, description, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, actorId, actorName, targetType, targetId, targetName, description, metadata ? JSON.stringify(metadata) : null);
}

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

async function handleOrganizerApplications(req, res, parts) {
    const id = parts[2] && !isNaN(parts[2]) ? parseInt(parts[2]) : null;
    const action = parts[3];

    if (req.method === 'POST' && parts[1] === 'organizer-applications') {
        const user = requireAuth(req);
        if (!user) return sendError(res, 'Vous devez être connecté', 401);
        const existing = db.prepare('SELECT id FROM organizer_applications WHERE user_id = ? AND status = ?').get(user.id, 'pending');
        if (existing) return sendError(res, 'Vous avez déjà une demande en cours');
        if (user.role === 'organizer') return sendError(res, 'Vous êtes déjà organisateur');
        
        const body = await parseBody(req);
        if (!body.full_name || !body.phone || !body.city || !body.organization_type || !body.event_types || !body.id_document_number || !body.motivation) {
            return sendError(res, 'Champs requis manquants');
        }
        
        const result = db.prepare(`
            INSERT INTO organizer_applications (
                user_id, full_name, email, phone, city,
                organization_name, organization_type, organization_description, website, social_media,
                event_types, first_event_name, first_event_date, first_event_venue, first_event_capacity, expected_events_per_year,
                preferred_payment, mobile_money_number, bank_name,
                id_document_type, id_document_number,
                motivation, how_found_us, ip_address, user_agent
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
            user.id, body.full_name, user.email, body.phone, body.city,
            body.organization_name || null, body.organization_type, body.organization_description || null, body.website || null,
            JSON.stringify({ facebook: body.social_facebook, instagram: body.social_instagram, tiktok: body.social_tiktok }),
            JSON.stringify(body.event_types), body.first_event_name || null, body.first_event_date || null, body.first_event_venue || null, body.first_event_capacity || null, body.expected_events_per_year || null,
            body.preferred_payment, body.mobile_money_number || null, body.bank_name || null,
            body.id_document_type || 'cin', body.id_document_number,
            body.motivation, body.how_found_us || null,
            req.socket.remoteAddress, req.headers['user-agent']
        );
        
        await sendOrganizerApplicationEmail(result.lastInsertRowid, body, user);
        logActivity('organizer_application_submitted', user.id, user.name, 'organizer_application', result.lastInsertRowid, body.organization_name || body.full_name, `Nouvelle demande d'organisateur de ${body.full_name}`);
        return sendJSON(res, { success: true, application_id: result.lastInsertRowid }, 201);
    }

    if (req.method === 'GET' && parts[1] === 'organizer-applications' && !id) {
        const user = requireAuth(req, ['superadmin']);
        if (!user) return sendError(res, 'Accès réservé au SuperAdmin', 403);
        const apps = db.prepare('SELECT * FROM organizer_applications ORDER BY created_at DESC').all();
        return sendJSON(res, apps);
    }

    if (req.method === 'GET' && id && parts[1] === 'organizer-applications') {
        const user = requireAuth(req, ['superadmin']);
        if (!user) return sendError(res, 'Accès réservé au SuperAdmin', 403);
        const app = db.prepare('SELECT * FROM organizer_applications WHERE id = ?').get(id);
        if (!app) return sendError(res, 'Demande non trouvée', 404);
        return sendJSON(res, app);
    }

    if (req.method === 'PUT' && id && action === 'approve') {
        const user = requireAuth(req, ['superadmin']);
        if (!user) return sendError(res, 'Accès réservé au SuperAdmin', 403);
        const app = db.prepare('SELECT * FROM organizer_applications WHERE id = ?').get(id);
        if (!app || app.status !== 'pending') return sendError(res, 'Demande invalide');
        db.prepare(`UPDATE organizer_applications SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`).run(user.id, id);
        db.prepare(`UPDATE users SET role = 'organizer', plan = 'starter' WHERE id = ?`).run(app.user_id);
        await sendApprovalEmail(app);
        logActivity('organizer_application_approved', user.id, user.name, 'organizer_application', id, app.full_name, `Demande d'organisateur approuvée pour ${app.full_name}`);
        return sendJSON(res, { success: true });
    }

    if (req.method === 'PUT' && id && action === 'reject') {
        const user = requireAuth(req, ['superadmin']);
        if (!user) return sendError(res, 'Accès réservé au SuperAdmin', 403);
        const app = db.prepare('SELECT * FROM organizer_applications WHERE id = ?').get(id);
        if (!app || app.status !== 'pending') return sendError(res, 'Demande invalide');
        const body = await parseBody(req);
        db.prepare(`UPDATE organizer_applications SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`).run(body.reason, user.id, id);
        await sendRejectionEmail(app, body.reason);
        logActivity('organizer_application_rejected', user.id, user.name, 'organizer_application', id, app.full_name, `Demande d'organisateur rejetée pour ${app.full_name}`);
        return sendJSON(res, { success: true });
    }

    if (parts[1] === 'my-application' && req.method === 'GET') {
        const user = requireAuth(req);
        if (!user) return sendError(res, 'Non authentifié', 401);
        const app = db.prepare('SELECT * FROM organizer_applications WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id);
        return sendJSON(res, app || {});
    }

    sendError(res, 'Route application non trouvée', 404);
}

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
        const result = db.prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?,?,?,?,?,?)').run(body.name, body.email, hash, 'buyer', initials, 'active');
        const token = generateToken();
        const expires = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString().replace('T', ' ').split('.')[0];
        db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)').run(result.lastInsertRowid, token, expires);
        const user = db.prepare('SELECT id, name, email, role, plan, avatar_initials, phone, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
        logActivity('user_registered', user.id, user.name, 'user', user.id, user.name, `Nouvel utilisateur inscrit: ${user.name}`);
        return sendJSON(res, { user, token }, 201);
    }

    if (action === 'login' && req.method === 'POST') {
        const body = await parseBody(req);
        if (!body.email || !body.password) return sendError(res, 'Email et mot de passe requis');
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email);
        if (!user || !verifyPassword(body.password, user.password_hash)) return sendError(res, 'Email ou mot de passe incorrect', 401);
        db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
        logActivity('user_login', user.id, user.name, 'user', user.id, user.name, `${user.name} s'est connecté`);
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
            logActivity('user_registered', user.id, user.name, 'user', user.id, user.name, `Nouvel utilisateur inscrit (${provider}): ${user.name}`);
        } else {
            db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
            logActivity('user_login', user.id, user.name, 'user', user.id, user.name, `${user.name} s'est connecté (${provider})`);
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

    if (action === 'url' && req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        const provider = url.searchParams.get('provider');
        const redirectUri = `${APP_URL}/api/auth/callback/${provider}`;

        if (provider === 'google') {
            const params = new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'openid email profile',
                access_type: 'offline',
                prompt: 'select_account'
            });
            return sendJSON(res, { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
        }
        return sendError(res, 'Provider non supporté');
    }

    sendError(res, 'Route auth non trouvée', 404);
}

// OAUTH CALLBACK
async function handleOAuthCallback(req, res, parts) {
    const provider = parts[3];
    const url = new URL(req.url, 'http://localhost');
    const code = url.searchParams.get('code');

    if (!code) {
        return res.end('Authentication failed: no code');
    }

    let email, name;
    
    // Only attempt real exchange if secrets are configured
    if (provider === 'google' && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        try {
            const redirectUri = `${APP_URL}/api/auth/callback/google`;
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                })
            });
            const tokens = await tokenRes.json();
            if (tokens.id_token) {
                // Decode JWT (simplified for this environment)
                const payloadStr = Buffer.from(tokens.id_token.split('.')[1], 'base64').toString();
                const payload = JSON.parse(payloadStr);
                email = payload.email;
                name = payload.name;
            }
        } catch (e) {
            console.error('Google OAuth exchange error', e);
        }
    }

    // Fallback/Sim if keys missing OR exchange failed (to not block dev but prioritize real logic)
    if (!email) {
        email = `user_${provider}_${Date.now()}@ticketmada.local`;
        name = `Utilisateur ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
    }

    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        const hash = hashPassword(generateToken());
        const initials = (name[0] + (name.split(' ').pop()?.[0] || name[1] || '')).toUpperCase();
        const r = db.prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?,?,?,?,?,?)').run(name, email, hash, 'buyer', initials, 'active');
        user = db.prepare('SELECT id, name, email, role, plan, avatar_initials, phone, status, created_at FROM users WHERE id = ?').get(r.lastInsertRowid);
    }

    const token = generateToken();
    const expires = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString().replace('T', ' ').split('.')[0];
    db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?,?)').run(user.id, token, expires);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <html>
        <body>
            <script>
                if (window.opener) {
                    window.opener.postMessage({ 
                        type: 'TICKETMADA_AUTH_SUCCESS', 
                        token: '${token}', 
                        user: ${JSON.stringify(user)} 
                    }, '*');
                    window.close();
                } else {
                    localStorage.setItem('ticketmada_token', '${token}');
                    localStorage.setItem('ticketmada_user', '${JSON.stringify(user).replace(/'/g, "\\'")}');
                    window.location.href = '/';
                }
            </script>
            <p>Authentification réussie. Vous pouvez fermer cette fenêtre.</p>
        </body>
        </html>
    `);
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
        db.prepare('INSERT INTO activity_logs (type, icon, text, user_id) VALUES (?,?,?,?)').run('event', 'mdi-calendar-plus', `Événement: <strong>${body.name}</strong>`, user.id);
        logActivity('event_created', user.id, user.name, 'event', r.lastInsertRowid, body.name, `Nouvel événement créé: ${body.name}`);
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
            db.prepare('INSERT INTO activity_logs (type, icon, text, user_id) VALUES (?,?,?,?)').run('sale', 'mdi-ticket', `<strong>+${qty} billet${qty > 1 ? 's' : ''}</strong> ${event.name}`, user.id);
            logActivity('ticket_purchased', user.id, user.name, 'ticket', tickets[0].id_code, event.name, `${user.name} a acheté ${qty} billet(s) pour ${event.name}`);
        });
        insert();
        return sendJSON(res, { tickets, total: body.price * qty }, 201);
    }

    if (action === 'scan' && req.method === 'PUT' && id) {
        const auth = req.headers['authorization'] || '';
        const token = auth.replace('Bearer ', '');
        let user = getUser(token);
        let device = null;
        
        // Allow scanner page auth via X-Scan-Token
        const scanTokenHeader = req.headers['x-scan-token'];
        const deviceIdHeader = req.headers['x-device-id'];
        
        if (!user && scanTokenHeader) {
            const scanLink = db.prepare('SELECT * FROM scan_links WHERE token = ? AND is_active = 1').get(scanTokenHeader);
            if (scanLink) {
                // Verified via scan link. We need to check if device is registered.
                device = db.prepare('SELECT * FROM scan_devices WHERE scan_link_id = ? AND id = ?').get(scanLink.id, deviceIdHeader);
                if (device && device.is_blocked) return sendError(res, 'Appareil bloqué', 403);
            }
        }
        
        if (!user && !device) return sendError(res, 'Non autorisé', 403);

        const ticket = db.prepare('SELECT t.*, e.name as event_name, u.name as buyer_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id LEFT JOIN users u ON t.buyer_id = u.id WHERE t.id = ? OR t.id_code = ?').get(id, String(id));
        if (!ticket) {
            if (device) {
                db.prepare('INSERT INTO scan_logs (device_id, event_id, status, reject_reason, ticket_code) VALUES (?,?,?,?,?)').run(device.id, device.event_id, 'invalid', 'Billet non trouvé', String(id));
            }
            return sendError(res, 'Billet non trouvé', 404);
        }
        
        if (device && ticket.event_id !== device.event_id) {
            db.prepare('INSERT INTO scan_logs (device_id, event_id, status, reject_reason, ticket_code) VALUES (?,?,?,?,?)').run(device.id, device.event_id, 'invalid', 'Mauvais événement', ticket.id_code);
            return sendError(res, 'Ce billet appartient à un autre événement', 403);
        }

        if (ticket.status === 'scanned') {
            const firstScan = db.prepare('SELECT sl.*, sd.device_name FROM scan_logs sl LEFT JOIN scan_devices sd ON sl.device_id = sd.id WHERE sl.ticket_code = ? AND sl.status = "valid" ORDER BY sl.scanned_at ASC').get(ticket.id_code);
            if (device) {
                db.prepare('INSERT INTO scan_logs (device_id, event_id, status, reject_reason, ticket_code, buyer_name) VALUES (?,?,?,?,?,?)').run(device.id, ticket.event_id, 'already_scanned', 'Déjà scanné', ticket.id_code, ticket.buyer_name);
            }
            return sendJSON(res, { 
                status: 'already_scanned', 
                ticket_code: ticket.id_code, 
                buyer_name: ticket.buyer_name,
                first_scanned_at: ticket.scanned_at,
                scanned_by: firstScan ? firstScan.device_name : 'Staff'
            }, 400);
        }

        if (ticket.status !== 'active') return sendError(res, 'Billet non valide');
        
        db.prepare(`UPDATE tickets SET status = 'scanned', scanned_at = datetime('now') WHERE id = ?`).run(ticket.id);
        
        if (device) {
            db.prepare('INSERT INTO scan_logs (device_id, event_id, status, ticket_code, buyer_name, zone, price) VALUES (?,?,?,?,?,?,?)').run(device.id, ticket.event_id, 'valid', ticket.id_code, ticket.buyer_name, ticket.type, ticket.price);
            db.prepare('UPDATE scan_devices SET scan_count = scan_count + 1, last_activity = datetime("now") WHERE id = ?').run(device.id);
        }
        
        return sendJSON(res, { 
            status: 'valid',
            message: 'Billet scanné', 
            ticket_code: ticket.id_code,
            buyer_name: ticket.buyer_name,
            zone: ticket.type,
            price: ticket.price,
            event_name: ticket.event_name
        });
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
        db.prepare('INSERT INTO activity_logs (type, icon, text, user_id) VALUES (?,?,?,?)').run('user', 'mdi-account-plus', `Nouveau client: <strong>${body.name}</strong>`, user.id);
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

// SCANNER
async function handleScanner(req, res, parts) {
    const action = parts[1];

    if (action === 'scan-access-requests') {
        if (req.method === 'POST') {
            const body = await parseBody(req);
            const scanToken = body.scan_token;
            const deviceInfo = body.device_info || body.deviceInfo || {};
            
            // Validate scan token
            const scanLink = db.prepare('SELECT sl.*, e.name as event_name FROM scan_links sl JOIN events e ON sl.event_id = e.id WHERE sl.token = ? AND sl.is_active = 1').get(scanToken);
            if (!scanLink) return sendError(res, 'Lien invalide ou expiré', 404);
            
            const requestToken = 'ar_' + crypto.randomBytes(12).toString('hex');
            db.prepare('INSERT INTO scan_access_requests (event_id, request_token, device_info, status) VALUES (?, ?, ?, ?)').run(
                scanLink.event_id, requestToken, JSON.stringify(deviceInfo), 'pending'
            );
            
            return sendJSON(res, { 
                success: true,
                requestToken: requestToken,
                event: { id: scanLink.event_id, name: scanLink.event_name }
            }, 201);
        }
        
        // GET /api/scan-access-requests/pending (Organizer polling)
        if (req.method === 'GET' && parts[2] === 'pending') {
            const user = requireAuth(req, ['organizer', 'admin']);
            if (!user) return sendError(res, 'Non autorisé', 403);
            const pending = db.prepare('SELECT sar.*, e.name as event_name FROM scan_access_requests sar JOIN events e ON sar.event_id = e.id WHERE sar.status = "pending" AND e.organizer_id = ?').all(user.id);
            return sendJSON(res, pending.map(r => ({ ...r, deviceInfo: JSON.parse(r.device_info) })));
        }

        // POST /api/scan-access-requests/:id/approve (Organizer approving)
        if (req.method === 'POST' && parts[3] === 'approve') {
            const user = requireAuth(req, ['organizer', 'admin']);
            if (!user) return sendError(res, 'Non autorisé', 403);
            const requestId = parts[2];
            db.prepare('UPDATE scan_access_requests SET status = "approved", approved_by = ?, updated_at = datetime("now") WHERE id = ?').run(user.id, requestId);
            return sendJSON(res, { success: true });
        }

        // GET /api/scan-access-requests/:token/status (Staff polling)
        if (req.method === 'GET' && parts[3] === 'status') {
            const token = parts[2];
            const request = db.prepare('SELECT * FROM scan_access_requests WHERE request_token = ?').get(token);
            if (!request) return sendError(res, 'Requête non trouvée', 404);
            
            let scanLink = null;
            if (request.status === 'approved') {
                const link = db.prepare('SELECT token FROM scan_links WHERE event_id = ? AND is_active = 1 LIMIT 1').get(request.event_id);
                if (link) scanLink = `${APP_URL}/User/ticketmada-scanner.html?token=${link.token}`;
            }
            
            return sendJSON(res, { status: request.status, scanLink });
        }
    }

    // GET /api/scan-links/:token/validate
    if (parts[3] === 'validate' && req.method === 'GET') {
        const token = parts[2];
        const scanLink = db.prepare('SELECT sl.*, e.name as event_name, e.date_start, e.venue FROM scan_links sl JOIN events e ON sl.event_id = e.id WHERE sl.token = ? AND sl.is_active = 1').get(token);
        if (!scanLink) return sendError(res, 'Lien invalide ou expiré', 404);
        
        // Register device if not exists
        const fingerprint = req.headers['x-device-fingerprint'] || 'unknown';
        const deviceInfo = JSON.parse(req.headers['x-device-info'] || '{}');
        
        let device = db.prepare('SELECT * FROM scan_devices WHERE scan_link_id = ? AND device_fingerprint = ?').get(scanLink.id, fingerprint);
        if (!device) {
            const r = db.prepare('INSERT INTO scan_devices (scan_link_id, event_id, device_fingerprint, device_name, browser, os, device_model, ip_address) VALUES (?,?,?,?,?,?,?,?)').run(
                scanLink.id, scanLink.event_id, fingerprint, deviceInfo.deviceName || 'Appareil ' + Math.random().toString(36).substr(2,4).toUpperCase(),
                deviceInfo.browser, deviceInfo.os, deviceInfo.deviceModel, req.socket.remoteAddress
            );
            device = db.prepare('SELECT * FROM scan_devices WHERE id = ?').get(r.lastInsertRowid);
        } else {
            db.prepare('UPDATE scan_devices SET last_activity = datetime("now"), ip_address = ? WHERE id = ?').run(req.socket.remoteAddress, device.id);
        }

        if (device.is_blocked) return sendJSON(res, { valid: false, blocked: true, error: 'Votre appareil a été bloqué par l\'organisateur' });

        return sendJSON(res, {
            valid: true,
            event: { id: scanLink.event_id, name: scanLink.event_name, date: scanLink.date_start, venue: scanLink.venue },
            device_id: device.id,
            device_name: device.device_name
        });
    }

    // AUTH REQUIRED BELOW
    const user = requireAuth(req, ['organizer', 'admin', 'superadmin']);
    if (!user) return sendError(res, 'Non autorisé', 403);

    if (parts[1] === 'scan-links') {
        if (req.method === 'GET') {
            const links = db.prepare('SELECT sl.*, e.name as event_name, (SELECT COUNT(*) FROM scan_devices WHERE scan_link_id = sl.id) as devicesCount, (SELECT COUNT(*) FROM scan_logs WHERE event_id = sl.event_id) as totalScans FROM scan_links sl JOIN events e ON sl.event_id = e.id WHERE sl.organizer_id = ?').all(user.id);
            return sendJSON(res, links);
        }
        if (req.method === 'POST') {
            const body = await parseBody(req);
            const token = 'sL_' + crypto.randomBytes(16).toString('hex');
            const r = db.prepare('INSERT INTO scan_links (token, event_id, organizer_id, label, expires_at) VALUES (?,?,?,?,?)').run(token, body.event_id, user.id, body.label || 'Lien de scan', body.expires_at || null);
            const link = db.prepare('SELECT * FROM scan_links WHERE id = ?').get(r.lastInsertRowid);
            return sendJSON(res, { ...link, link: `${APP_URL}/User/ticketmada-scanner.html?token=${token}` }, 201);
        }
        if (req.method === 'DELETE' && parts[2]) {
            db.prepare('UPDATE scan_links SET is_active = 0 WHERE token = ? AND organizer_id = ?').run(parts[2], user.id);
            return sendJSON(res, { message: 'Lien révoqué' });
        }
    }

    if (parts[1] === 'scan-devices') {
        if (req.method === 'GET') {
            const devices = db.prepare('SELECT sd.*, e.name as event_name FROM scan_devices sd JOIN events e ON sd.event_id = e.id WHERE e.organizer_id = ?').all(user.id);
            return sendJSON(res, devices);
        }
        if (parts[2] && parts[3] === 'rename' && req.method === 'PUT') {
            const body = await parseBody(req);
            db.prepare('UPDATE scan_devices SET device_name = ? WHERE id = ?').run(body.name, parts[2]);
            return sendJSON(res, { message: 'Appareil renommé' });
        }
        if (parts[2] && parts[3] === 'block' && req.method === 'PUT') {
            const body = await parseBody(req);
            db.prepare('UPDATE scan_devices SET is_blocked = 1, block_reason = ?, blocked_at = datetime("now") WHERE id = ?').run(body.reason || 'Bloqué manuellement', parts[2]);
            return sendJSON(res, { message: 'Appareil bloqué' });
        }
        if (parts[2] && parts[3] === 'unblock' && req.method === 'PUT') {
            db.prepare('UPDATE scan_devices SET is_blocked = 0, block_reason = NULL, blocked_at = NULL WHERE id = ?').run(parts[2]);
            return sendJSON(res, { message: 'Appareil débloqué' });
        }
    }

    if (parts[1] === 'scan-logs' && req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        const eventId = url.searchParams.get('event_id');
        let where = 'e.organizer_id = ?', params = [user.id];
        if (eventId) { where += ' AND sl.event_id = ?'; params.push(eventId); }
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const logs = db.prepare(`SELECT sl.*, sd.device_name, e.name as event_name FROM scan_logs sl LEFT JOIN scan_devices sd ON sl.device_id = sd.id JOIN events e ON sl.event_id = e.id WHERE ${where} ORDER BY sl.scanned_at DESC LIMIT ?`).all(...params, limit);
        return sendJSON(res, logs);
    }

    sendError(res, 'Route non trouvée', 404);
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
    const activities = db.prepare(`SELECT * FROM activity_logs WHERE ${where} ORDER BY created_at DESC LIMIT ?`).all(...params);
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
            if (parts[1] === 'auth' && parts[2] === 'callback') {
                return await handleOAuthCallback(req, res, parts);
            }
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
                case 'organizer-applications':
                case 'my-application': return await handleOrganizerApplications(req, res, parts);
                case 'superadmin': return await handleSuperAdmin(req, res, parts);
                case 'scan-access-requests':
                case 'scan-links':
                case 'scan-devices':
                case 'scan-logs': return await handleScanner(req, res, parts);
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

// SUPERADMIN
async function handleSuperAdmin(req, res, parts) {
    const user = requireAuth(req, ['superadmin']);
    if (!user) {
        return sendError(res, 'Accès réservé au SuperAdmin', 403);
    }

    const resource = parts[2];
    const id = parts[3] ? parseInt(parts[3]) : null;
    const action = parts[4];

    if (resource === 'dashboard' && req.method === 'GET') {
        const stats = {
            totalRevenue: db.prepare("SELECT COALESCE(SUM(price), 0) as total FROM tickets WHERE status IN ('active', 'scanned')").get()?.total || 0,
            totalTicketsSold: db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status IN ('active', 'scanned')").get()?.count || 0,
            activeEvents: db.prepare("SELECT COUNT(*) as count FROM events WHERE status = 'active'").get()?.count || 0,
            totalUsers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'buyer' AND status != 'deleted'").get()?.count || 0,
            activeOrganizers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'organizer' AND status = 'active'").get()?.count || 0,
            pendingApplications: db.prepare("SELECT COUNT(*) as count FROM organizer_applications WHERE status = 'pending'").get()?.count || 0,
            totalEvents: db.prepare('SELECT COUNT(*) as count FROM events').get()?.count || 0,
            blockedUsers: db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'blocked'").get()?.count || 0,
            
            // Monthly revenue for chart (last 12 months)
            monthlyRevenue: db.prepare(`
                SELECT strftime('%Y-%m', created_at) as month, 
                       COALESCE(SUM(price), 0) as revenue
                FROM tickets 
                WHERE status IN ('active', 'scanned')
                AND created_at >= datetime('now', '-12 months')
                GROUP BY month 
                ORDER BY month
            `).all(),
            
            // Category distribution
            categoryDistribution: db.prepare(`
                SELECT e.category, COUNT(t.id) as ticket_count
                FROM tickets t 
                JOIN events e ON t.event_id = e.id
                WHERE t.status IN ('active', 'scanned')
                GROUP BY e.category
            `).all(),
            
            // Top 5 events this month
            topEvents: db.prepare(`
                SELECT e.name, e.id, COUNT(t.id) as tickets_sold, 
                       COALESCE(SUM(t.price), 0) as revenue
                FROM events e 
                LEFT JOIN tickets t ON t.event_id = e.id AND t.status IN ('active', 'scanned')
                AND t.created_at >= datetime('now', 'start of month')
                GROUP BY e.id 
                ORDER BY tickets_sold DESC 
                LIMIT 5
            `).all(),
            
            // Recent activity (last 20)
            recentActivity: db.prepare(`
                SELECT * FROM activity_logs 
                ORDER BY created_at DESC 
                LIMIT 20
            `).all()
        };
        
        stats.totalCommission = Math.round(stats.totalRevenue * 0.03);
        stats.avgFillRate = 72;
        
        return sendJSON(res, stats);
    }

    if (resource === 'organizers' && req.method === 'GET') {
        const orgs = db.prepare(`
            SELECT u.*, 
                   (SELECT COUNT(*) FROM events WHERE organizer_id = u.id) as events_count,
                   (SELECT COALESCE(SUM(price), 0) FROM tickets WHERE event_id IN (SELECT id FROM events WHERE organizer_id = u.id) AND status IN ('active', 'scanned')) as total_revenue
            FROM users u 
            WHERE u.role = 'organizer' AND u.status != 'deleted'
            ORDER BY u.created_at DESC
        `).all();
        orgs.forEach(o => {
            o.total_commission = Math.round(o.total_revenue * 0.03);
        });
        return sendJSON(res, orgs);
    }

    if (resource === 'users' && req.method === 'GET') {
        const users = db.prepare(`
            SELECT u.*, 
                   (SELECT COUNT(*) FROM tickets WHERE buyer_id = u.id) as purchaseCount,
                   (SELECT COALESCE(SUM(price), 0) FROM tickets WHERE buyer_id = u.id AND status IN ('active', 'scanned')) as totalSpent,
                   (SELECT MAX(created_at) FROM tickets WHERE buyer_id = u.id) as lastPurchase
            FROM users u 
            WHERE u.role = 'buyer' AND u.status != 'deleted'
            ORDER BY u.created_at DESC
        `).all();
        return sendJSON(res, users);
    }

    if (resource === 'events' && req.method === 'GET') {
        const events = db.prepare(`
            SELECT e.*, u.name as organizer_name,
                   (SELECT COUNT(*) FROM tickets WHERE event_id = e.id AND status IN ('active', 'scanned')) as ticketsSold,
                   (SELECT COALESCE(SUM(price), 0) FROM tickets WHERE event_id = e.id AND status IN ('active', 'scanned')) as totalRevenue
            FROM events e
            JOIN users u ON e.organizer_id = u.id
            ORDER BY e.created_at DESC
        `).all();
        return sendJSON(res, events);
    }

    if (resource === 'logs' && req.method === 'GET') {
        const logs = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100').all();
        return sendJSON(res, logs);
    }

    // Actions
    if (req.method === 'PUT') {
        if (resource === 'organizers' && id && action === 'suspend') {
            const body = await parseBody(req);
            db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(id);
            logActivity('organizer_suspended', user.id, user.name, 'organizer', id, '', `Organisateur suspendu: ${body.reason || ''}`);
            return sendJSON(res, { success: true });
        }
        if (resource === 'organizers' && id && action === 'reactivate') {
            db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(id);
            logActivity('organizer_reactivated', user.id, user.name, 'organizer', id, '', 'Organisateur réactivé');
            return sendJSON(res, { success: true });
        }
        if (resource === 'users' && id && action === 'block') {
            const body = await parseBody(req);
            db.prepare("UPDATE users SET status = 'blocked' WHERE id = ?").run(id);
            logActivity('user_blocked', user.id, user.name, 'user', id, '', `Utilisateur bloqué: ${body.reason || ''}`);
            return sendJSON(res, { success: true });
        }
        if (resource === 'users' && id && action === 'unblock') {
            db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(id);
            logActivity('user_unblocked', user.id, user.name, 'user', id, '', 'Utilisateur débloqué');
            return sendJSON(res, { success: true });
        }
        if (resource === 'events' && id && action === 'suspend') {
            const body = await parseBody(req);
            db.prepare("UPDATE events SET status = 'suspended' WHERE id = ?").run(id);
            logActivity('event_suspended', user.id, user.name, 'event', id, '', `Événement suspendu: ${body.reason || ''}`);
            return sendJSON(res, { success: true });
        }
        if (resource === 'events' && id && action === 'reactivate') {
            db.prepare("UPDATE events SET status = 'active' WHERE id = ?").run(id);
            logActivity('event_reactivated', user.id, user.name, 'event', id, '', 'Événement réactivé');
            return sendJSON(res, { success: true });
        }
    }

    if (req.method === 'DELETE') {
        if (resource === 'organizers' && id) {
            db.prepare("UPDATE events SET status = 'cancelled' WHERE organizer_id = ?").run(id);
            db.prepare("UPDATE users SET status = 'deleted' WHERE id = ?").run(id);
            logActivity('organizer_deleted', user.id, user.name, 'organizer', id, '', 'Organisateur supprimé');
            return sendJSON(res, { success: true });
        }
        if (resource === 'users' && id) {
            db.prepare("UPDATE tickets SET status = 'cancelled' WHERE buyer_id = ?").run(id);
            db.prepare("UPDATE users SET status = 'deleted' WHERE id = ?").run(id);
            logActivity('user_deleted', user.id, user.name, 'user', id, '', 'Utilisateur supprimé');
            return sendJSON(res, { success: true });
        }
        if (resource === 'events' && id) {
            db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(id);
            db.prepare("UPDATE tickets SET status = 'cancelled' WHERE event_id = ?").run(id);
            logActivity('event_deleted', user.id, user.name, 'event', id, '', 'Événement supprimé');
            return sendJSON(res, { success: true });
        }
    }

    return sendError(res, 'Route superadmin non trouvée', 404);
}

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
    console.log(`   Scanner:    http://localhost:${PORT}/User/ticketmada-scanner.html`);
    console.log(`   SuperAdmin: http://localhost:${PORT}/Admin/ticketmada-superadmin.html`);
    console.log(`\n   Default login: superadmin@ticketmada.mg / password123`);
    console.log(`   Organizer:    contact@donia.mg / password123\n`);
});

process.on('SIGINT', () => { db.close(); process.exit(); });
process.on('SIGTERM', () => { db.close(); process.exit(); });
