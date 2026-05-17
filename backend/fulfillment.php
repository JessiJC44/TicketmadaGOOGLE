<?php
require_once __DIR__ . '/config.php';

function handleFulfillment($method, $id, $action) {
    switch (true) {
        case $method === 'GET' && !$id: listFulfillments(); break;
        case $method === 'GET' && $id: getFulfillment($id); break;
        case $method === 'POST': createFulfillment(); break;
        case $method === 'PUT' && $id && $action === 'status': updateFulfillmentStatus($id); break;
        case $method === 'GET' && $action === 'methods': getFulfillmentMethods(); break;
        default: jsonError('Route non trouvée', 404);
    }
}

function listFulfillments() {
    $db = getDB();
    $where = ['1=1'];
    $params = [];

    if (!empty($_GET['event_id'])) { $where[] = 'f.event_id = ?'; $params[] = $_GET['event_id']; }
    if (!empty($_GET['status'])) { $where[] = 'f.status = ?'; $params[] = $_GET['status']; }
    if (!empty($_GET['method'])) { $where[] = 'f.delivery_method = ?'; $params[] = $_GET['method']; }

    $sql = "SELECT f.*, t.id_code as ticket_code, u.name as buyer_name, u.email as buyer_email, e.name as event_name
            FROM fulfillments f
            LEFT JOIN tickets t ON f.ticket_id = t.id
            LEFT JOIN users u ON f.buyer_id = u.id
            LEFT JOIN events e ON f.event_id = e.id
            WHERE " . implode(' AND ', $where) . " ORDER BY f.created_at DESC LIMIT 50";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['fulfillments' => $stmt->fetchAll()]);
}

function getFulfillment($id) {
    $db = getDB();
    $stmt = $db->prepare('SELECT f.*, t.id_code as ticket_code FROM fulfillments f LEFT JOIN tickets t ON f.ticket_id = t.id WHERE f.id = ?');
    $stmt->execute([$id]);
    $f = $stmt->fetch();
    if (!$f) jsonError('Fulfillment non trouvé', 404);
    jsonResponse(['fulfillment' => $f]);
}

function createFulfillment() {
    $user = requireAuth();
    $body = getBody();
    $db = getDB();

    $ticketId = $body['ticket_id'] ?? null;
    $method = $body['delivery_method'] ?? 'e_ticket';

    if (!$ticketId) jsonError('ticket_id requis');

    $ticket = $db->prepare('SELECT * FROM tickets WHERE id = ?');
    $ticket->execute([$ticketId]);
    $ticket = $ticket->fetch();
    if (!$ticket) jsonError('Billet non trouvé', 404);

    $stmt = $db->prepare("INSERT INTO fulfillments (ticket_id, event_id, buyer_id, delivery_method, delivery_address, status)
                          VALUES (?, ?, ?, ?, ?, 'pending')");
    $stmt->execute([
        $ticketId,
        $ticket['event_id'],
        $ticket['buyer_id'],
        $method,
        $body['delivery_address'] ?? null
    ]);

    jsonResponse(['id' => $db->lastInsertId(), 'message' => 'Fulfillment créé'], 201);
}

function updateFulfillmentStatus($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $status = $body['status'] ?? null; // pending, processing, shipped, delivered, failed
    $trackingCode = $body['tracking_code'] ?? null;

    if (!$status) jsonError('status requis');

    $updates = ["status = ?", "updated_at = datetime('now')"];
    $params = [$status];

    if ($trackingCode) { $updates[] = 'tracking_code = ?'; $params[] = $trackingCode; }
    if ($status === 'delivered') { $updates[] = "delivered_at = datetime('now')"; }

    $params[] = $id;
    $db->prepare('UPDATE fulfillments SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);

    jsonResponse(['message' => 'Statut fulfillment mis à jour']);
}

function getFulfillmentMethods() {
    jsonResponse(['methods' => [
        ['id' => 'e_ticket', 'label' => 'E-Ticket (PDF/QR)', 'price' => 0, 'icon' => 'mdi-email'],
        ['id' => 'print_home', 'label' => 'Imprimer à domicile', 'price' => 0, 'icon' => 'mdi-printer'],
        ['id' => 'will_call', 'label' => 'Retrait sur place', 'price' => 0, 'icon' => 'mdi-store'],
        ['id' => 'postal', 'label' => 'Envoi postal', 'price' => 5000, 'icon' => 'mdi-truck-delivery'],
        ['id' => 'courier', 'label' => 'Coursier (Tana)', 'price' => 15000, 'icon' => 'mdi-moped'],
    ]]);
}
