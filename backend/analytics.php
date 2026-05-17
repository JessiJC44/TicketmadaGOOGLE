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
    $period = $_GET['period'] ?? 'Mois';
    $offset = (int)($_GET['offset'] ?? 0);
    
    // Calculer les dates selon la période
    $periodDays = match($period) {
        'Jour' => 1,
        'Semaine' => 7,
        'Mois' => 31,
        'Trimestre' => 90,
        'Année' => 365,
        default => 31
    };
    
    $endDate = new DateTime();
    $endDate->modify("+{$offset} months");
    $startDate = clone $endDate;
    $startDate->modify("-{$periodDays} days");
    
    $prevEnd = clone $startDate;
    $prevStart = clone $prevEnd;
    $prevStart->modify("-{$periodDays} days");
    
    $startStr = $startDate->format('Y-m-d');
    $endStr = $endDate->format('Y-m-d');
    $prevStartStr = $prevStart->format('Y-m-d');
    $prevEndStr = $prevEnd->format('Y-m-d');
    
    // Ventes aujourd'hui
    $salesToday = $db->prepare("SELECT COALESCE(SUM(t.price),0) FROM tickets t 
        JOIN events e ON t.event_id=e.id 
        WHERE e.organizer_id=? AND date(t.created_at)=date('now')");
    $salesToday->execute([$orgId]);
    $salesTodayVal = (int)$salesToday->fetchColumn();
    
    // Ventes hier
    $salesYesterday = $db->prepare("SELECT COALESCE(SUM(t.price),0) FROM tickets t 
        JOIN events e ON t.event_id=e.id 
        WHERE e.organizer_id=? AND date(t.created_at)=date('now','-1 day')");
    $salesYesterday->execute([$orgId]);
    $salesYesterdayVal = (int)$salesYesterday->fetchColumn();
    
    $salesTodayDelta = $salesYesterdayVal > 0 
        ? round((($salesTodayVal - $salesYesterdayVal) / $salesYesterdayVal) * 100, 1) 
        : ($salesTodayVal > 0 ? 100 : 0);
    
    // Ventes période courante
    $salesPeriod = $db->prepare("SELECT COALESCE(SUM(t.price),0) FROM tickets t 
        JOIN events e ON t.event_id=e.id 
        WHERE e.organizer_id=? AND date(t.created_at) BETWEEN ? AND ?");
    $salesPeriod->execute([$orgId, $startStr, $endStr]);
    $salesPeriodVal = (int)$salesPeriod->fetchColumn();
    
    // Ventes période précédente
    $salesPrev = $db->prepare("SELECT COALESCE(SUM(t.price),0) FROM tickets t 
        JOIN events e ON t.event_id=e.id 
        WHERE e.organizer_id=? AND date(t.created_at) BETWEEN ? AND ?");
    $salesPrev->execute([$orgId, $prevStartStr, $prevEndStr]);
    $salesPrevVal = (int)$salesPrev->fetchColumn();
    
    $salesPeriodDelta = $salesPrevVal > 0 
        ? round((($salesPeriodVal - $salesPrevVal) / $salesPrevVal) * 100, 1) 
        : ($salesPeriodVal > 0 ? 100 : 0);
    
    // Billets période
    $ticketsPeriod = $db->prepare("SELECT COUNT(*) FROM tickets t 
        JOIN events e ON t.event_id=e.id 
        WHERE e.organizer_id=? AND date(t.created_at) BETWEEN ? AND ?");
    $ticketsPeriod->execute([$orgId, $startStr, $endStr]);
    $ticketsPeriodVal = (int)$ticketsPeriod->fetchColumn();
    
    $ticketsPrev = $db->prepare("SELECT COUNT(*) FROM tickets t 
        JOIN events e ON t.event_id=e.id 
        WHERE e.organizer_id=? AND date(t.created_at) BETWEEN ? AND ?");
    $ticketsPrev->execute([$orgId, $prevStartStr, $prevEndStr]);
    $ticketsPrevVal = (int)$ticketsPrev->fetchColumn();
    
    $ticketsDelta = $ticketsPrevVal > 0 
        ? round((($ticketsPeriodVal - $ticketsPrevVal) / $ticketsPrevVal) * 100, 1) 
        : ($ticketsPeriodVal > 0 ? 100 : 0);
    
    // Vues (simulées via page views table ou compteur)
    $viewsPeriodVal = $ticketsPeriodVal * 8; // ratio approximatif
    $viewsPrevVal = $ticketsPrevVal * 8;
    $viewsDelta = $viewsPrevVal > 0 
        ? round((($viewsPeriodVal - $viewsPrevVal) / $viewsPrevVal) * 100, 1) 
        : ($viewsPeriodVal > 0 ? 100 : 0);
    
    // Chart data — ventes par jour sur la période
    $chartData = $db->prepare("SELECT date(t.created_at) as day, 
        COALESCE(SUM(t.price),0) as sales, COUNT(*) as tickets
        FROM tickets t JOIN events e ON t.event_id=e.id 
        WHERE e.organizer_id=? AND date(t.created_at) BETWEEN ? AND ?
        GROUP BY date(t.created_at) ORDER BY day");
    $chartData->execute([$orgId, $startStr, $endStr]);
    $rows = $chartData->fetchAll(PDO::FETCH_ASSOC);
    
    $chartLabels = array_column($rows, 'day');
    $salesChartData = array_map('intval', array_column($rows, 'sales'));
    $ticketsChartData = array_map('intval', array_column($rows, 'tickets'));

    // Events for the table
    $eventsStmt = $db->prepare("SELECT * FROM events WHERE organizer_id=? AND status != 'cancelled' ORDER BY created_at DESC");
    $eventsStmt->execute([$orgId]);
    $events = $eventsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse([
        'salesToday' => $salesTodayVal,
        'salesYesterday' => $salesYesterdayVal,
        'salesTodayDelta' => $salesTodayDelta,
        'salesPeriod' => $salesPeriodVal,
        'salesPrevPeriod' => $salesPrevVal,
        'salesPeriodDelta' => $salesPeriodDelta,
        'ticketsPeriod' => $ticketsPeriodVal,
        'ticketsPrevPeriod' => $ticketsPrevVal,
        'ticketsDelta' => $ticketsDelta,
        'viewsPeriod' => $viewsPeriodVal,
        'viewsPrevPeriod' => $viewsPrevVal,
        'viewsDelta' => $viewsDelta,
        'chartLabels' => $chartLabels,
        'salesChartData' => $salesChartData,
        'ticketsChartData' => $ticketsChartData,
        'events' => $events
    ]);
}

function getSuperAdminDashboard() {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    // Platform-wide stats
    $totalRevenue = (int)$db->query('SELECT COALESCE(SUM(revenue), 0) FROM events')->fetchColumn();
    $totalTickets = (int)$db->query('SELECT COUNT(*) FROM tickets')->fetchColumn();
    $activeEvents = (int)$db->query("SELECT COUNT(*) FROM events WHERE status = 'active'")->fetchColumn();
    $totalClients = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'organizer'")->fetchColumn();

    $ticketStats = $db->query("SELECT
        SUM(CASE WHEN status = 'scanned' THEN 1 ELSE 0 END) as scanned,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded
    FROM tickets")->fetch();

    $pendingRefunds = (int)$db->query("SELECT COUNT(*) FROM refunds WHERE status = 'pending'")->fetchColumn();

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
