<?php
require_once __DIR__ . '/config.php';

function handleCustomers($method, $id, $action) {
    if ($method !== 'GET') jsonError('Méthode non autorisée', 405);
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    
    if ($action === 'search') { searchCustomers(); return; }
    if ($id) { getCustomerProfile($id); return; }
    listCustomers();
}

function listCustomers() {
    $db = getDB();
    $user = getCurrentUser();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(10, (int)($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;
    $search = $_GET['search'] ?? '';

    $where = "u.role = 'buyer'";
    $params = [];

    // If organizer, only show customers who bought their events
    if ($user['role'] === ROLE_ORGANIZER) {
        $where .= " AND u.id IN (SELECT DISTINCT t.buyer_id FROM tickets t JOIN events e ON t.event_id = e.id WHERE e.organizer_id = ?)";
        $params[] = $user['id'];
    }

    if ($search) {
        $where .= " AND (u.name LIKE ? OR u.email LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM users u WHERE $where");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $params[] = $limit;
    $params[] = $offset;
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
               (SELECT COUNT(*) FROM tickets WHERE buyer_id = u.id) as ticket_count,
               (SELECT COALESCE(SUM(price), 0) FROM tickets WHERE buyer_id = u.id) as total_spent,
               (SELECT MAX(created_at) FROM tickets WHERE buyer_id = u.id) as last_purchase
        FROM users u WHERE $where
        ORDER BY u.created_at DESC LIMIT ? OFFSET ?
    ");
    $stmt->execute($params);

    jsonResponse([
        'customers' => $stmt->fetchAll(),
        'total' => $total,
        'page' => $page,
        'pages' => ceil($total / $limit)
    ]);
}

function getCustomerProfile($id) {
    $db = getDB();

    $user = $db->prepare("SELECT id, name, email, phone, status, created_at FROM users WHERE id = ?");
    $user->execute([$id]);
    $customer = $user->fetch();
    if (!$customer) jsonError('Client non trouvé', 404);

    // Purchase history
    $tickets = $db->prepare("
        SELECT t.*, e.name as event_name, e.date_start, e.venue
        FROM tickets t JOIN events e ON t.event_id = e.id
        WHERE t.buyer_id = ? ORDER BY t.created_at DESC
    ");
    $tickets->execute([$id]);

    // Stats
    $stats = $db->prepare("
        SELECT COUNT(*) as total_tickets,
               COALESCE(SUM(price), 0) as total_spent,
               SUM(CASE WHEN status = 'scanned' THEN 1 ELSE 0 END) as attended,
               SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded
        FROM tickets WHERE buyer_id = ?
    ");
    $stats->execute([$id]);

    // Refund history
    $refunds = $db->prepare("
        SELECT r.*, e.name as event_name
        FROM refunds r JOIN events e ON r.event_id = e.id
        JOIN tickets t ON r.ticket_id = t.id
        WHERE t.buyer_id = ? ORDER BY r.created_at DESC
    ");
    $refunds->execute([$id]);

    jsonResponse([
        'customer' => $customer,
        'stats' => $stats->fetch(),
        'tickets' => $tickets->fetchAll(),
        'refunds' => $refunds->fetchAll()
    ]);
}

function searchCustomers() {
    $db = getDB();
    $q = $_GET['q'] ?? '';
    if (strlen($q) < 2) jsonError('Recherche trop courte');

    $stmt = $db->prepare("
        SELECT id, name, email, phone
        FROM users WHERE role = 'buyer'
        AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
        LIMIT 20
    ");
    $like = "%$q%";
    $stmt->execute([$like, $like, $like]);
    jsonResponse(['results' => $stmt->fetchAll()]);
}
