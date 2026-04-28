<?php
require_once __DIR__ . '/config.php';

function handleTickets($method, $id, $action) {
    if ($action === 'purchase' && $method === 'POST') {
        purchaseTicket();
        return;
    }
    if ($action === 'scan' && $method === 'PUT' && $id) {
        scanTicket($id);
        return;
    }
    if ($action === 'stats' || ($id === 'stats' && !$action)) {
        getTicketStats();
        return;
    }

    switch ($method) {
        case 'GET':
            $id ? getTicket($id) : listTickets();
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listTickets() {
    $db = getDB();
    $where = ['1=1'];
    $params = [];

    if (!empty($_GET['event_id'])) {
        $where[] = 't.event_id = ?';
        $params[] = $_GET['event_id'];
    }
    if (!empty($_GET['buyer_id'])) {
        $where[] = 't.buyer_id = ?';
        $params[] = $_GET['buyer_id'];
    }
    if (!empty($_GET['status'])) {
        $where[] = 't.status = ?';
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['organizer_id'])) {
        $where[] = 'e.organizer_id = ?';
        $params[] = $_GET['organizer_id'];
    }

    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);

    $sql = 'SELECT t.*, e.name as event_name, u.name as buyer_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id LEFT JOIN users u ON t.buyer_id = u.id WHERE ' . implode(' AND ', $where) . ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['tickets' => $stmt->fetchAll()]);
}

function getTicket($id) {
    $db = getDB();
    $stmt = $db->prepare('SELECT t.*, e.name as event_name, u.name as buyer_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id LEFT JOIN users u ON t.buyer_id = u.id WHERE t.id = ? OR t.id_code = ?');
    $stmt->execute([$id, $id]);
    $ticket = $stmt->fetch();
    if (!$ticket) jsonError('Billet non trouvé', 404);
    jsonResponse(['ticket' => $ticket]);
}

function purchaseTicket() {
    $user = requireAuth();
    $body = getBody();

    $eventId = $body['event_id'] ?? null;
    $type = $body['type'] ?? 'Standard';
    $price = (int)($body['price'] ?? 0);
    $quantity = (int)($body['quantity'] ?? 1);

    if (!$eventId || !$price) jsonError('event_id et price requis');

    $db = getDB();

    // Check event exists and is active
    $event = $db->prepare('SELECT * FROM events WHERE id = ? AND status = "active"');
    $event->execute([$eventId]);
    $event = $event->fetch();
    if (!$event) jsonError('Événement non trouvé ou non disponible');

    // Check capacity
    if ($event['tickets_sold'] + $quantity > $event['capacity']) {
        jsonError('Plus assez de places disponibles');
    }

    $tickets = [];
    $db->beginTransaction();

    try {
        for ($i = 0; $i < $quantity; $i++) {
            $code = generateTicketCode();
            // Ensure unique code
            $checkStmt = $db->prepare('SELECT id FROM tickets WHERE id_code = ?');
            while ($checkStmt->execute([$code]) && $checkStmt->fetch()) {
                $code = generateTicketCode();
            }

            $stmt = $db->prepare('INSERT INTO tickets (id_code, event_id, buyer_id, type, price, status) VALUES (?, ?, ?, ?, ?, "active")');
            $stmt->execute([$code, $eventId, $user['id'], $type, $price]);
            $tickets[] = ['id' => $db->lastInsertId(), 'id_code' => $code, 'type' => $type, 'price' => $price];
        }

        // Update event stats
        $totalPrice = $price * $quantity;
        $db->prepare('UPDATE events SET tickets_sold = tickets_sold + ?, revenue = revenue + ? WHERE id = ?')->execute([$quantity, $totalPrice, $eventId]);

        // Log activity
        $db->prepare('INSERT INTO activity_log (type, icon, text, user_id) VALUES ("sale", "mdi-ticket", ?, ?)')->execute([
            '<strong>+' . $quantity . ' billet' . ($quantity > 1 ? 's' : '') . '</strong> ' . $event['name'],
            $user['id']
        ]);

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Erreur lors de l\'achat: ' . $e->getMessage(), 500);
    }

    jsonResponse(['tickets' => $tickets, 'total' => $totalPrice], 201);
}

function scanTicket($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $stmt = $db->prepare('SELECT t.*, e.organizer_id FROM tickets t LEFT JOIN events e ON t.event_id = e.id WHERE t.id = ? OR t.id_code = ?');
    $stmt->execute([$id, $id]);
    $ticket = $stmt->fetch();

    if (!$ticket) jsonError('Billet non trouvé', 404);
    if ($ticket['status'] === 'scanned') jsonError('Billet déjà scanné');
    if ($ticket['status'] !== 'active') jsonError('Billet non valide (statut: ' . $ticket['status'] . ')');

    $db->prepare('UPDATE tickets SET status = "scanned", scanned_at = datetime("now") WHERE id = ?')->execute([$ticket['id']]);

    jsonResponse(['message' => 'Billet scanné avec succès', 'ticket_code' => $ticket['id_code']]);
}

function getTicketStats() {
    $db = getDB();
    $where = '1=1';
    $params = [];

    if (!empty($_GET['organizer_id'])) {
        $where = 'e.organizer_id = ?';
        $params[] = $_GET['organizer_id'];
    }
    if (!empty($_GET['event_id'])) {
        $where = 't.event_id = ?';
        $params[] = $_GET['event_id'];
    }

    $sql = "SELECT
        COUNT(*) as total,
        SUM(CASE WHEN t.status = 'scanned' THEN 1 ELSE 0 END) as scanned,
        SUM(CASE WHEN t.status = 'active' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN t.status = 'refunded' THEN 1 ELSE 0 END) as refunded,
        SUM(t.price) as total_revenue
    FROM tickets t LEFT JOIN events e ON t.event_id = e.id WHERE $where";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $stats = $stmt->fetch();

    $stats['scan_rate'] = $stats['total'] > 0 ? round(($stats['scanned'] / $stats['total']) * 100) : 0;

    jsonResponse(['stats' => $stats]);
}
