<?php
require_once __DIR__ . '/config.php';

function handleAnalytics($method, $action, $subAction) {
    if ($method !== 'GET') jsonError('Méthode non autorisée', 405);

    switch ($action) {
        case 'dashboard':
            getOrganizerDashboard();
            break;
        case 'superadmin':
            getSuperAdminDashboard();
            break;
        default:
            jsonError('Route analytics non trouvée', 404);
    }
}

function handleActivity($method, $action, $subAction) {
    if ($method !== 'GET') jsonError('Méthode non autorisée', 405);
    getRecentActivity();
}

function getOrganizerDashboard() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $orgId = $_GET['organizer_id'] ?? $user['id'];

    // Revenue stats
    $revenue = $db->prepare('SELECT COALESCE(SUM(revenue), 0) as total_revenue FROM events WHERE organizer_id = ?');
    $revenue->execute([$orgId]);
    $totalRevenue = (int)$revenue->fetchColumn();

    // Month revenue
    $monthRev = $db->prepare('SELECT COALESCE(SUM(t.price), 0) FROM tickets t JOIN events e ON t.event_id = e.id WHERE e.organizer_id = ? AND strftime("%Y-%m", t.created_at) = strftime("%Y-%m", "now")');
    $monthRev->execute([$orgId]);
    $monthRevenue = (int)$monthRev->fetchColumn();

    // Ticket stats
    $ticketStats = $db->prepare("SELECT
        COUNT(*) as total,
        SUM(CASE WHEN t.status = 'scanned' THEN 1 ELSE 0 END) as scanned,
        SUM(CASE WHEN t.status = 'active' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN t.status = 'refunded' THEN 1 ELSE 0 END) as refunded
    FROM tickets t JOIN events e ON t.event_id = e.id WHERE e.organizer_id = ?");
    $ticketStats->execute([$orgId]);
    $ts = $ticketStats->fetch();

    $scanRate = $ts['total'] > 0 ? round(($ts['scanned'] / $ts['total']) * 100) : 0;

    // Payout stats
    $payoutStats = $db->prepare("SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN net ELSE 0 END), 0) as paid_out,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN net ELSE 0 END), 0) as pending_balance
    FROM payouts WHERE organizer_id = ?");
    $payoutStats->execute([$orgId]);
    $ps = $payoutStats->fetch();

    $availableBalance = $totalRevenue - (int)$ps['paid_out'] - (int)$ps['pending_balance'];

    // My events
    $events = $db->prepare('SELECT * FROM events WHERE organizer_id = ? AND status != "cancelled" ORDER BY date_start ASC');
    $events->execute([$orgId]);

    // My tickets
    $tickets = $db->prepare('SELECT t.*, e.name as event_name, u.name as buyer_name FROM tickets t JOIN events e ON t.event_id = e.id LEFT JOIN users u ON t.buyer_id = u.id WHERE e.organizer_id = ? ORDER BY t.created_at DESC LIMIT 20');
    $tickets->execute([$orgId]);

    // My payouts
    $payouts = $db->prepare('SELECT * FROM payouts WHERE organizer_id = ? ORDER BY created_at DESC LIMIT 10');
    $payouts->execute([$orgId]);

    jsonResponse([
        'myRevenue' => $totalRevenue,
        'monthRevenue' => $monthRevenue,
        'myTicketsSold' => (int)$ts['total'],
        'scannedTickets' => (int)$ts['scanned'],
        'pendingTickets' => (int)$ts['pending'],
        'refundedTickets' => (int)$ts['refunded'],
        'scanRate' => $scanRate,
        'totalRevenue' => $totalRevenue,
        'paidOut' => (int)$ps['paid_out'],
        'availableBalance' => max(0, $availableBalance),
        'pendingBalance' => (int)$ps['pending_balance'],
        'myEvents' => $events->fetchAll(),
        'myTickets' => $tickets->fetchAll(),
        'myPayouts' => $payouts->fetchAll(),
    ]);
}

function getSuperAdminDashboard() {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    // Platform-wide stats
    $totalRevenue = (int)$db->query('SELECT COALESCE(SUM(revenue), 0) FROM events')->fetchColumn();
    $totalTickets = (int)$db->query('SELECT COUNT(*) FROM tickets')->fetchColumn();
    $activeEvents = (int)$db->query('SELECT COUNT(*) FROM events WHERE status = "active"')->fetchColumn();
    $totalClients = (int)$db->query('SELECT COUNT(*) FROM users WHERE role = "organizer"')->fetchColumn();

    $ticketStats = $db->query("SELECT
        SUM(CASE WHEN status = 'scanned' THEN 1 ELSE 0 END) as scanned,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded
    FROM tickets")->fetch();

    $pendingRefunds = (int)$db->query('SELECT COUNT(*) FROM refunds WHERE status = "pending"')->fetchColumn();

    $payoutStats = $db->query("SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN net ELSE 0 END), 0) as total_payouts,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN net ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(commission), 0) as commission_total,
        COUNT(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 END) as payout_count
    FROM payouts")->fetch();

    $avgTicketPrice = $totalTickets > 0 ? (int)$db->query('SELECT AVG(price) FROM tickets')->fetchColumn() : 0;
    $scanRate = $totalTickets > 0 ? round(((int)$ticketStats['scanned'] / $totalTickets) * 100) : 0;

    // Top events
    $topEvents = $db->query('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.status != "cancelled" ORDER BY e.revenue DESC LIMIT 5')->fetchAll();

    jsonResponse([
        'totalRevenue' => $totalRevenue,
        'totalTickets' => $totalTickets,
        'activeEvents' => $activeEvents,
        'totalClients' => $totalClients,
        'scannedTickets' => (int)($ticketStats['scanned'] ?? 0),
        'pendingTickets' => (int)($ticketStats['pending'] ?? 0),
        'refundedTickets' => (int)($ticketStats['refunded'] ?? 0),
        'pendingRefunds' => $pendingRefunds,
        'totalPayouts' => (int)($payoutStats['total_payouts'] ?? 0),
        'pendingPayoutsAmount' => (int)($payoutStats['pending_amount'] ?? 0),
        'commissionTotal' => (int)($payoutStats['commission_total'] ?? 0),
        'payoutCount' => (int)($payoutStats['payout_count'] ?? 0),
        'conversionRate' => 12.5, // Would need page view tracking for real value
        'avgTicketPrice' => $avgTicketPrice,
        'avgScanRate' => $scanRate,
        'topEvents' => $topEvents,
    ]);
}

function getRecentActivity() {
    $db = getDB();
    $limit = (int)($_GET['limit'] ?? 10);
    $type = $_GET['type'] ?? null;

    $where = '1=1';
    $params = [];
    if ($type) {
        $where = 'type = ?';
        $params[] = $type;
    }
    $params[] = $limit;

    $stmt = $db->prepare("SELECT * FROM activity_log WHERE $where ORDER BY created_at DESC LIMIT ?");
    $stmt->execute($params);

    $activities = $stmt->fetchAll();

    // Add relative time
    foreach ($activities as &$a) {
        $diff = time() - strtotime($a['created_at']);
        if ($diff < 60) $a['time'] = 'Il y a ' . $diff . ' sec';
        elseif ($diff < 3600) $a['time'] = 'Il y a ' . floor($diff / 60) . ' min';
        elseif ($diff < 86400) $a['time'] = 'Il y a ' . floor($diff / 3600) . 'h';
        else $a['time'] = 'Il y a ' . floor($diff / 86400) . 'j';
    }

    jsonResponse(['activities' => $activities]);
}
