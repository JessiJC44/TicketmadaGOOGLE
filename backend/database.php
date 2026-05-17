<?php
require_once __DIR__ . '/config.php';

function initDatabase() {
    $db = getDB();

    // Check if already initialized - REMOVED return to allow adding new tables
    //$tables = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")->fetch();
    //if ($tables) return;

    $db->exec('
        CREATE TABLE IF NOT EXISTS users (
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

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizer_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            emoji TEXT DEFAULT '🎫',
            date_start DATETIME NOT NULL,
            date_end DATETIME,
            date_end_time TEXT,
            timezone TEXT DEFAULT 'Indian/Antananarivo',
            series_id INTEGER,
            series_index INTEGER,
            publish_at DATETIME,
            is_private INTEGER DEFAULT 0,
            private_code TEXT,
            gallery_json TEXT,
            tags_json TEXT,
            seo_title TEXT,
            seo_description TEXT,
            min_per_order INTEGER DEFAULT 1,
            max_per_order INTEGER DEFAULT 10,
            age_restriction TEXT,
            terms_text TEXT,
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

        CREATE TABLE IF NOT EXISTS tickets (
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

        CREATE TABLE IF NOT EXISTS refunds (
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

        CREATE TABLE IF NOT EXISTS payouts (
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

        CREATE TABLE IF NOT EXISTS team_members (
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

        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            icon TEXT,
            text TEXT NOT NULL,
            user_id INTEGER,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- VIVENU FEATURE PARITY TABLES --

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_code TEXT UNIQUE NOT NULL,
            buyer_id INTEGER NOT NULL,
            event_id INTEGER,
            amount INTEGER NOT NULL DEFAULT 0,
            fees INTEGER NOT NULL DEFAULT 0,
            total INTEGER NOT NULL DEFAULT 0,
            currency TEXT DEFAULT 'MGA',
            payment_method TEXT DEFAULT 'mobile_money',
            payment_provider TEXT,
            payment_reference TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            items_json TEXT,
            metadata_json TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT (datetime('now')),
            completed_at DATETIME,
            FOREIGN KEY (buyer_id) REFERENCES users(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        );

        CREATE TABLE IF NOT EXISTS ticket_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL DEFAULT 0,
            quantity INTEGER NOT NULL DEFAULT 0,
            sold INTEGER NOT NULL DEFAULT 0,
            min_per_order INTEGER DEFAULT 1,
            max_per_order INTEGER DEFAULT 10,
            sale_start DATETIME,
            sale_end DATETIME,
            visibility TEXT DEFAULT 'public',
            sort_order INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (event_id) REFERENCES events(id)
        );

        CREATE TABLE IF NOT EXISTS customer_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            company TEXT,
            notes TEXT,
            tags_json TEXT DEFAULT '[]',
            segment TEXT DEFAULT 'standard',
            is_verified INTEGER DEFAULT 0,
            total_spent INTEGER DEFAULT 0,
            total_orders INTEGER DEFAULT 0,
            average_cart INTEGER DEFAULT 0,
            first_purchase_at DATETIME,
            last_purchase_at DATETIME,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS customer_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            metadata_json TEXT,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (customer_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_code TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            plan_name TEXT NOT NULL,
            plan_type TEXT NOT NULL DEFAULT 'season_pass',
            price INTEGER NOT NULL,
            currency TEXT DEFAULT 'MGA',
            billing_cycle TEXT DEFAULT 'one_time',
            events_included_json TEXT DEFAULT '[]',
            max_events INTEGER DEFAULT 0,
            events_used INTEGER DEFAULT 0,
            benefits_json TEXT DEFAULT '[]',
            status TEXT DEFAULT 'active',
            starts_at DATETIME NOT NULL,
            expires_at DATETIME,
            renewed_at DATETIME,
            cancelled_at DATETIME,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizer_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            plan_type TEXT DEFAULT 'season_pass',
            price INTEGER NOT NULL,
            billing_cycle TEXT DEFAULT 'one_time',
            max_events INTEGER DEFAULT 0,
            benefits_json TEXT DEFAULT '[]',
            event_ids_json TEXT DEFAULT '[]',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS discounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            discount_type TEXT NOT NULL DEFAULT 'fixed',
            discount_value INTEGER NOT NULL,
            currency TEXT DEFAULT 'MGA',
            min_order_amount INTEGER DEFAULT 0,
            max_discount_amount INTEGER,
            usage_limit INTEGER,
            usage_per_customer INTEGER DEFAULT 1,
            usage_count INTEGER DEFAULT 0,
            applicable_events_json TEXT DEFAULT '[]',
            applicable_ticket_types_json TEXT DEFAULT '[]',
            auto_apply INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            starts_at DATETIME,
            expires_at DATETIME,
            created_by INTEGER,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS discount_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discount_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            transaction_id INTEGER,
            amount_saved INTEGER NOT NULL,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (discount_id) REFERENCES discounts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizer_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            product_type TEXT DEFAULT 'merchandise',
            price INTEGER NOT NULL DEFAULT 0,
            currency TEXT DEFAULT 'MGA',
            stock INTEGER DEFAULT -1,
            sold INTEGER DEFAULT 0,
            image_url TEXT,
            variants_json TEXT DEFAULT '[]',
            applicable_events_json TEXT DEFAULT '[]',
            is_addon INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit_price INTEGER NOT NULL,
            total_price INTEGER NOT NULL,
            variant_json TEXT,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (transaction_id) REFERENCES transactions(id)
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_code TEXT UNIQUE NOT NULL,
            organizer_id INTEGER NOT NULL,
            type TEXT DEFAULT 'payout',
            period_start DATE,
            period_end DATE,
            gross_revenue INTEGER DEFAULT 0,
            platform_fees INTEGER DEFAULT 0,
            payment_processing_fees INTEGER DEFAULT 0,
            tax_amount INTEGER DEFAULT 0,
            net_amount INTEGER DEFAULT 0,
            currency TEXT DEFAULT 'MGA',
            status TEXT DEFAULT 'draft',
            pdf_url TEXT,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id INTEGER,
            details_json TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organizer_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            key_hash TEXT UNIQUE NOT NULL,
            key_prefix TEXT NOT NULL,
            permissions_json TEXT DEFAULT '["read"]',
            last_used_at DATETIME,
            expires_at DATETIME,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (organizer_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            device TEXT,
            ip_address TEXT,
            location TEXT,
            is_current INTEGER DEFAULT 0,
            last_active DATETIME DEFAULT (datetime('now')),
            created_at DATETIME DEFAULT (datetime('now')),
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS purchase_intents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id INTEGER,
            event_id INTEGER NOT NULL,
            items_json TEXT NOT NULL,
            total_amount INTEGER DEFAULT 0,
            step TEXT DEFAULT 'cart',
            email TEXT,
            phone TEXT,
            abandoned_at DATETIME,
            recovered_at DATETIME,
            recovery_email_sent INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now')),
            updated_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(id_code);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

        CREATE TABLE IF NOT EXISTS organizer_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            city TEXT NOT NULL,
            motivation TEXT,
            organizationName TEXT,
            organizationDescription TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT (datetime('now')),
            updated_at DATETIME
        );
    ');

    // Seed data
    require_once __DIR__ . '/seed.php';
    seedDatabase($db);
}

function migrateAllTables() {
    $db = getDB();

    $migrations = [
        // Products (Updated schema)
        "CREATE TABLE IF NOT EXISTS products_v2 (id INTEGER PRIMARY KEY AUTOINCREMENT, organizer_id INTEGER NOT NULL, event_id INTEGER, name TEXT NOT NULL, description TEXT, category TEXT DEFAULT 'merchandise', price INTEGER NOT NULL DEFAULT 0, stock INTEGER DEFAULT -1, image_url TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME, FOREIGN KEY (organizer_id) REFERENCES users(id))",
        "CREATE TABLE IF NOT EXISTS product_variants (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0, stock INTEGER DEFAULT -1, FOREIGN KEY (product_id) REFERENCES products(id))",
        
        // POS
        "CREATE TABLE IF NOT EXISTS pos_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT UNIQUE NOT NULL, event_id INTEGER NOT NULL, operator_id INTEGER NOT NULL, cash_start INTEGER DEFAULT 0, cash_end INTEGER DEFAULT 0, total_sales INTEGER DEFAULT 0, tx_count INTEGER DEFAULT 0, status TEXT DEFAULT 'open', created_at DATETIME DEFAULT (datetime('now')), closed_at DATETIME)",
        "CREATE TABLE IF NOT EXISTS pos_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER, operator_id INTEGER NOT NULL, event_id INTEGER NOT NULL, items_json TEXT, total_amount INTEGER NOT NULL DEFAULT 0, payment_method TEXT DEFAULT 'cash', created_at DATETIME DEFAULT (datetime('now')))",

        // Fulfillment
        "CREATE TABLE IF NOT EXISTS fulfillments (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, event_id INTEGER NOT NULL, buyer_id INTEGER NOT NULL, delivery_method TEXT DEFAULT 'e_ticket', delivery_address TEXT, tracking_code TEXT, status TEXT DEFAULT 'pending', delivered_at DATETIME, created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME)",

        // Dynamic Pricing
        "CREATE TABLE IF NOT EXISTS pricing_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, name TEXT NOT NULL, rule_type TEXT NOT NULL, threshold REAL, threshold_max REAL, adjustment_type TEXT DEFAULT 'percent', adjustment_value INTEGER DEFAULT 10, priority INTEGER DEFAULT 0, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT (datetime('now')))",

        // Waitlist
        "CREATE TABLE IF NOT EXISTS waitlist (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, user_id INTEGER NOT NULL, ticket_type TEXT DEFAULT 'Standard', position INTEGER NOT NULL, status TEXT DEFAULT 'waiting', notified_at DATETIME, converted_at DATETIME, created_at DATETIME DEFAULT (datetime('now')))",

        // Resale
        "CREATE TABLE IF NOT EXISTS resale_listings (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, seller_id INTEGER NOT NULL, buyer_id INTEGER, event_id INTEGER NOT NULL, original_price INTEGER NOT NULL, asking_price INTEGER NOT NULL, status TEXT DEFAULT 'active', sold_at DATETIME, created_at DATETIME DEFAULT (datetime('now')))",
        "CREATE TABLE IF NOT EXISTS ticket_transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, from_user_id INTEGER NOT NULL, to_user_id INTEGER NOT NULL, old_code TEXT, new_code TEXT, transfer_type TEXT DEFAULT 'transfer', sale_price INTEGER, created_at DATETIME DEFAULT (datetime('now')))",

        // Settings
        "CREATE TABLE IF NOT EXISTS org_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, organizer_id INTEGER UNIQUE NOT NULL, org_name TEXT, org_email TEXT, org_phone TEXT, org_address TEXT, org_logo_url TEXT, org_website TEXT, org_description TEXT, currency TEXT DEFAULT 'MGA', timezone TEXT DEFAULT 'Indian/Antananarivo', language TEXT DEFAULT 'fr', ticket_prefix TEXT DEFAULT 'TKT', commission_rate REAL DEFAULT 3.0, auto_approve_refunds INTEGER DEFAULT 0, max_tickets_per_order INTEGER DEFAULT 10, enable_resale INTEGER DEFAULT 1, enable_transfer INTEGER DEFAULT 1, enable_waitlist INTEGER DEFAULT 1, email_notifications INTEGER DEFAULT 1, webhook_url TEXT, webhook_secret TEXT, custom_css TEXT, google_analytics_id TEXT, created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME)",

        // Email Templates
        "CREATE TABLE IF NOT EXISTS email_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, organizer_id INTEGER NOT NULL, template_type TEXT NOT NULL, subject TEXT NOT NULL, body_html TEXT NOT NULL, created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME)",

        // Event multi-dates
        "CREATE TABLE IF NOT EXISTS event_dates (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, date_start DATETIME NOT NULL, date_end DATETIME, venue_override TEXT, capacity_override INTEGER, status TEXT DEFAULT 'active')",
        "CREATE TABLE IF NOT EXISTS event_series (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, organizer_id INTEGER NOT NULL, description TEXT, created_at DATETIME DEFAULT (datetime('now')))",

        // Admin Tables
        "CREATE TABLE IF NOT EXISTS scan_links (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, token TEXT UNIQUE NOT NULL, name TEXT, created_at DATETIME DEFAULT (datetime('now')), FOREIGN KEY (event_id) REFERENCES events(id))",
        "CREATE TABLE IF NOT EXISTS seatmaps (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, data_json TEXT, created_at DATETIME DEFAULT (datetime('now')), FOREIGN KEY (event_id) REFERENCES events(id))",
        "CREATE TABLE IF NOT EXISTS admin_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, admin_id INTEGER NOT NULL, action TEXT NOT NULL, resource_type TEXT, resource_id INTEGER, details TEXT, created_at DATETIME DEFAULT (datetime('now')), FOREIGN KEY (admin_id) REFERENCES users(id))"
    ];

    foreach ($migrations as $sql) {
        try { $db->exec($sql); } catch (Exception $e) { /* table exists, ignore */ }
    }

    // Column migrations
    $columnUpdates = [
        ['tickets', 'qr_payload', 'TEXT'],
        ['tickets', 'qr_blocked', 'INTEGER DEFAULT 0'],
        ['tickets', 'qr_generated_at', 'DATETIME'],
        ['users', 'is_blocked', 'INTEGER DEFAULT 0'],
        ['users', 'stripe_account_id', 'TEXT'],
        ['events', 'multi_date_json', 'TEXT'],
    ];

    foreach ($columnUpdates as $update) {
        try {
            $db->exec("ALTER TABLE {$update[0]} ADD COLUMN {$update[1]} {$update[2]}");
        } catch (Exception $e) {
            // Column likely exists
        }
    }
}

initDatabase();
migrateAllTables();
