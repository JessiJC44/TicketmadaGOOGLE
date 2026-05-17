<?php
require_once __DIR__ . '/config.php';

function handleAdmin($method, $id, $action) {
    requireAuth([ROLE_SUPERADMIN]);

    switch ($action) {
        case 'dashboard': getGlobalDashboard(); break;
        case 'organizers': listOrganizers(); break;
        case 'organizer-details': if ($id) getOrganizerDetails($id); break;
        case 'block-user': if ($id) blockUser($id); break;
        case 'unblock-user': if ($id) unblockUser($id); break;
        case 'block-ticket': if ($id) blockTicket($id); break;
        case 'unblock-ticket': if ($id) unblockTicket($id); break;
        case 'scan-links': handleScanLinks($method, $id); break;
        case 'seatmaps': handleSeatmaps($method, $id); break;
        case 'audit-log': getAdminAuditLog(); break;
        default: jsonError('Action admin non reconnue', 404);
    }
}

function getGlobalDashboard() {
    $db = getDB();
    $stats = [
        'total_revenue' => $db->query("SELECT SUM(price) FROM tickets WHERE status != 'cancelled'")->fetchColumn(),
        'total_tickets' => $db->query("SELECT COUNT(*) FROM tickets")->fetchColumn(),
        'total_users' => $db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
        'total_events' => $db->query("SELECT COUNT(*) FROM events")->fetchColumn(),
        'active_organizers' => $db->query("SELECT COUNT(*) FROM users WHERE role = 'organizer'")->fetchColumn(),
        'recent_sales' => $db->query("SELECT t.*, e.name as event_name, u.name as buyer_name FROM tickets t JOIN events e ON t.event_id = e.id JOIN users u ON t.buyer_id = u.id ORDER BY t.created_at DESC LIMIT 10")->fetchAll()
    ];
    jsonResponse($stats);
}

function listOrganizers() {
    $db = getDB();
    $orgs = $db->query("SELECT u.*, (SELECT COUNT(*) FROM events WHERE organizer_id = u.id) as event_count, (SELECT SUM(revenue) FROM events WHERE organizer_id = u.id) as total_revenue FROM users u WHERE role = 'organizer' ORDER BY created_at DESC")->fetchAll();
    jsonResponse(['organizers' => $orgs]);
}

function getOrganizerDetails($id) {
    $db = getDB();
    $user = $db->prepare("SELECT * FROM users WHERE id = ?");
    $user->execute([$id]);
    $user = $user->fetch();
    if (!$user) jsonError('Organisateur non trouvé', 404);

    $events = $db->prepare("SELECT * FROM events WHERE organizer_id = ? ORDER BY date_start DESC");
    $events->execute([$id]);
    
    jsonResponse([
        'organizer' => $user,
        'events' => $events->fetchAll()
    ]);
}

function blockUser($id) {
    $db = getDB();
    $db->prepare("UPDATE users SET is_blocked = 1, status = 'blocked' WHERE id = ?")->execute([$id]);
    logAdminAction('block_user', 'users', $id, "User blocked");
    jsonResponse(['message' => 'Utilisateur bloqué']);
}

function unblockUser($id) {
    $db = getDB();
    $db->prepare("UPDATE users SET is_blocked = 0, status = 'active' WHERE id = ?")->execute([$id]);
    logAdminAction('unblock_user', 'users', $id, "User unblocked");
    jsonResponse(['message' => 'Utilisateur débloqué']);
}

function blockTicket($id) {
    $db = getDB();
    $db->prepare("UPDATE tickets SET qr_blocked = 1, status = 'blocked' WHERE id = ? OR id_code = ?")->execute([$id, $id]);
    logAdminAction('block_ticket', 'tickets', $id, "Ticket blocked");
    jsonResponse(['message' => 'Billet bloqué']);
}

function unblockTicket($id) {
    $db = getDB();
    $db->prepare("UPDATE tickets SET qr_blocked = 0, status = 'active' WHERE id = ? OR id_code = ?")->execute([$id, $id]);
    logAdminAction('unblock_ticket', 'tickets', $id, "Ticket débloqué");
    jsonResponse(['message' => 'Billet débloqué']);
}

function handleScanLinks($method, $id) {
    $db = getDB();
    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM scan_links WHERE event_id = ?");
            $stmt->execute([$id]);
            jsonResponse(['links' => $stmt->fetchAll()]);
        }
    } elseif ($method === 'POST') {
        $body = getBody();
        $eventId = $body['event_id'] ?? null;
        if (!$eventId) jsonError('event_id requis');
        $token = bin2hex(random_bytes(16));
        $db->prepare("INSERT INTO scan_links (event_id, token, name) VALUES (?, ?, ?)")->execute([$eventId, $token, $body['name'] ?? 'Lien Scan']);
        jsonResponse(['token' => $token, 'message' => 'Lien de scan créé']);
    }
}

function handleSeatmaps($method, $id) {
    $db = getDB();
    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM seatmaps WHERE event_id = ?");
            $stmt->execute([$id]);
            jsonResponse(['seatmap' => $stmt->fetch()]);
        }
    } elseif ($method === 'POST') {
        $body = getBody();
        $eventId = $body['event_id'] ?? null;
        $data = $body['data_json'] ?? null;
        if (!$eventId || !$data) jsonError('event_id et data_json requis');
        
        $db->prepare("DELETE FROM seatmaps WHERE event_id = ?")->execute([$eventId]);
        $db->prepare("INSERT INTO seatmaps (event_id, data_json) VALUES (?, ?)")->execute([$eventId, $data]);
        jsonResponse(['message' => 'Plan de salle sauvegardé']);
    }
}

function getAdminAuditLog() {
    $db = getDB();
    $logs = $db->query("SELECT a.*, u.name as admin_name FROM admin_actions a JOIN users u ON a.admin_id = u.id ORDER BY a.created_at DESC LIMIT 100")->fetchAll();
    jsonResponse(['logs' => $logs]);
}

function logAdminAction($action, $resourceType, $resourceId, $details) {
    $user = getCurrentUser();
    $db = getDB();
    $db->prepare("INSERT INTO admin_actions (admin_id, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?)")->execute([
        $user['id'], $action, $resourceType, $resourceId, $details
    ]);
}
