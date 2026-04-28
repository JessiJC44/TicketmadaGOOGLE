<?php
function seedDatabase($db) {
    $hash = password_hash('password123', PASSWORD_DEFAULT);

    // === USERS ===
    $users = [
        // Buyers
        [1, 'Rabe Jean', 'rabe@example.mg', $hash, 'buyer', null, 'RJ', null, 'active', '2025-06-15'],
        [2, 'Marie Rakoto', 'marie@example.mg', $hash, 'buyer', null, 'MR', null, 'active', '2025-08-20'],
        [3, 'Solo Andry', 'solo@example.mg', $hash, 'buyer', null, 'SA', null, 'active', '2025-09-10'],
        [4, 'Faly Nina', 'faly@example.mg', $hash, 'buyer', null, 'FN', null, 'active', '2025-11-05'],
        // Organizers
        [5, 'Festival Donia', 'contact@donia.mg', $hash, 'organizer', 'pro', 'FD', '+261 34 00 000 01', 'active', '2024-01-15'],
        [6, 'Live Nation MG', 'info@livenation.mg', $hash, 'organizer', 'enterprise', 'LN', '+261 34 00 000 02', 'active', '2023-06-03'],
        [7, 'Palais des Sports', 'admin@palais.mg', $hash, 'organizer', 'pro', 'PS', '+261 34 00 000 03', 'active', '2023-09-22'],
        [8, 'Madajazzcar', 'hello@madajazz.mg', $hash, 'organizer', 'starter', 'MJ', '+261 34 00 000 04', 'pending', '2024-03-01'],
        [9, 'CNaPS Sport', 'events@cnaps.mg', $hash, 'organizer', 'pro', 'CS', '+261 34 00 000 05', 'active', '2023-11-10'],
        // Team members (sub-users for Festival Donia)
        [10, 'Jean Rakoto', 'jean@donia.mg', $hash, 'organizer', null, 'JR', null, 'active', '2024-02-01'],
        [11, 'Marie Razafy', 'marie@donia.mg', $hash, 'organizer', null, 'MR', null, 'active', '2024-03-15'],
        [12, 'Solo Andria', 'solo@donia.mg', $hash, 'organizer', null, 'SA', null, 'active', '2024-04-01'],
        // Admin
        [13, 'Admin TM', 'admin@ticketmada.mg', $hash, 'admin', null, 'AT', null, 'active', '2023-01-01'],
        // SuperAdmin
        [14, 'Super Admin', 'superadmin@ticketmada.mg', $hash, 'superadmin', null, 'SA', null, 'active', '2023-01-01'],
    ];

    $stmt = $db->prepare('INSERT INTO users (id, name, email, password_hash, role, plan, avatar_initials, phone, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    foreach ($users as $u) {
        $stmt->execute($u);
    }

    // === EVENTS ===
    $events = [
        [1, 6, 'Dama Live - Tournée Nationale 2026', 'concerts', 'Le plus grand concert de l\'année', '🎤', '2026-04-15', null, 'Antananarivo', 15000, 12500, 625000000, 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', 'popular', 'active'],
        [2, 5, 'Festival Donia 2026', 'festivals', 'Le festival incontournable de Nosy Be', '🎉', '2026-05-20', '2026-05-22', 'Nosy Be', 10000, 8500, 1020000000, 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400', 'festival', 'active'],
        [3, 9, 'CNaPS vs Fosa Juniors', 'sports', 'Match de la saison', '⚽', '2026-03-28', null, 'Mahamasina', 8000, 5200, 78000000, 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400', 'popular', 'completed'],
        [4, 6, 'Erick Manana Unplugged', 'concerts', 'Concert acoustique exceptionnel', '🎸', '2026-04-05', null, 'IFM Analakely', 800, 650, 22750000, 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', 'soon', 'active'],
        [5, 8, 'Madajazzcar 2026', 'festivals', 'Festival de jazz international', '🎷', '2026-10-10', '2026-10-15', 'Antananarivo', 5000, 0, 0, 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', 'soon', 'pending'],
        [6, 9, 'Course de Côte - Diego', 'sports', 'Compétition automobile', '🏎️', '2026-06-12', null, 'Diego Suarez', 3000, 1200, 30000000, 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400', null, 'active'],
        [7, 6, 'Jaojoby en Concert', 'concerts', 'Le roi du salegy en live', '🎵', '2026-05-18', null, 'Toamasina', 5000, 3800, 152000000, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', 'vip', 'active'],
        [8, 5, 'Beach Festival Anakao', 'festivals', 'Festival sur la plage', '🏖️', '2026-07-01', '2026-07-03', 'Anakao', 2000, 500, 75000000, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', 'festival', 'active'],
        // Extra events for dashboard
        [9, 5, 'Donia Beach Party', 'concerts', 'After party sur la plage', '🏖️', '2026-05-23', null, 'Ambatoloaka', 1000, 800, 40000000, null, null, 'active'],
        [10, 5, 'Donia Sunset Session', 'concerts', 'Session acoustique au coucher du soleil', '🌅', '2026-05-19', null, 'Hell-Ville', 500, 0, 0, null, null, 'pending'],
    ];

    $stmt = $db->prepare('INSERT INTO events (id, organizer_id, name, category, description, emoji, date_start, date_end, venue, capacity, tickets_sold, revenue, image_url, badge, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    foreach ($events as $e) {
        $stmt->execute($e);
    }

    // === TICKETS ===
    $tickets = [
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

    $stmt = $db->prepare('INSERT INTO tickets (id, id_code, event_id, buyer_id, type, price, status, scanned_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    foreach ($tickets as $t) {
        $stmt->execute($t);
    }

    // === REFUNDS ===
    $refunds = [
        [1, 'REF-001', 8, 1, 'Rabe Faly', 150000, 'Impossibilité de se déplacer', 'pending', '2026-03-02'],
        [2, 'REF-002', 9, 2, 'Nina Ralay', 80000, 'Erreur de date', 'pending', '2026-03-01'],
    ];

    $stmt = $db->prepare('INSERT INTO refunds (id, id_code, ticket_id, event_id, client_name, amount, reason, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    foreach ($refunds as $r) {
        $stmt->execute($r);
    }

    // === PAYOUTS ===
    $payouts = [
        [1, 'PAY-001', 6, 50000000, 1500000, 48500000, 'Virement', 'completed', '2026-02-28', '2026-02-28'],
        [2, 'PAY-002', 5, 30000000, 900000, 29100000, 'Mobile Money', 'pending', '2026-03-01', null],
        [3, 'PAY-045', 5, 30000000, 900000, 29100000, 'Virement BNI', 'completed', '2026-02-25', '2026-02-25'],
        [4, 'PAY-038', 5, 25000000, 750000, 24250000, 'Mobile Money', 'completed', '2026-02-15', '2026-02-15'],
        [5, 'PAY-031', 5, 35000000, 1050000, 33950000, 'Virement BNI', 'completed', '2026-02-01', '2026-02-01'],
    ];

    $stmt = $db->prepare('INSERT INTO payouts (id, id_code, organizer_id, amount, commission, net, method, status, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
    foreach ($payouts as $p) {
        $stmt->execute($p);
    }

    // === TEAM MEMBERS ===
    $team = [
        [1, 5, 10, 'admin', 'Admin', 'Tous', '2026-03-03'],
        [2, 5, 11, 'guichetier', 'Guichetier', 'Festival Donia', '2026-03-03'],
        [3, 5, 12, 'analyste', 'Analyste', 'Tous', '2026-03-02'],
    ];

    $stmt = $db->prepare('INSERT INTO team_members (id, organizer_id, user_id, role, role_label, events_access, last_access) VALUES (?,?,?,?,?,?,?)');
    foreach ($team as $t) {
        $stmt->execute($t);
    }

    // === ACTIVITY LOG ===
    $activities = [
        [1, 'sale', 'mdi-ticket', '<strong>+25 billets</strong> Dama Live 2026', null, '2026-03-03 10:55:00'],
        [2, 'user', 'mdi-account-plus', 'Nouveau client: <strong>Event Pro</strong>', null, '2026-03-03 10:37:00'],
        [3, 'refund', 'mdi-cash-refund', 'Remboursement <strong>Rabe Faly</strong>', null, '2026-03-03 09:00:00'],
        [4, 'event', 'mdi-calendar-plus', 'Événement: <strong>Beach Party</strong>', null, '2026-03-03 08:00:00'],
    ];

    $stmt = $db->prepare('INSERT INTO activity_log (id, type, icon, text, user_id, created_at) VALUES (?,?,?,?,?,?)');
    foreach ($activities as $a) {
        $stmt->execute($a);
    }
}
