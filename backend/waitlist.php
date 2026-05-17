<?php
require_once __DIR__ . '/config.php';

function handleWaitlist($method, $id, $action) {
    switch (true) {
        case $method === 'POST' && $action === 'join': joinWaitlist(); break;
        case $method === 'GET' && $action === 'position': getWaitlistPosition(); break;
        case $method === 'GET' && !$id: listWaitlist(); break;
        case $method === 'PUT' && $id && $action === 'notify': notifyWaitlistEntry($id); break;
        case $method === 'PUT' && $id && $action === 'convert': convertWaitlistToTicket($id); break;
        case $method === 'DELETE' && $id: leaveWaitlist($id); break;
        default: jsonError('Route non trouvée', 404);
    }
}

function joinWaitlist() {
    $user = requireAuth();
    $body = getBody();
    $db = getDB();

    $eventId = $body['event_id'] ?? null;
    $ticketType = $body['ticket_type'] ?? 'Standard';
    if (!$eventId) jsonError('event_id requis');

    // Check if already on waitlist
    $existing = $db->prepare('SELECT id FROM waitlist WHERE event_id = ? AND user_id = ? AND status = "waiting"');
    $existing->execute([$eventId, $user['id']]);
    if ($existing->fetch()) jsonError('Vous êtes déjà sur la liste d\'attente');

    // Get position
    $pos = $db->prepare('SELECT COUNT(*) + 1 FROM waitlist WHERE event_id = ? AND status = "waiting"');
    $pos->execute([$eventId]);
    $position = (int)$pos->fetchColumn();

    $db->prepare("INSERT INTO waitlist (event_id, user_id, ticket_type, position, status) VALUES (?, ?, ?, ?, 'waiting')")
       ->execute([$eventId, $user['id'], $ticketType, $position]);

    jsonResponse([
        'id' => $db->lastInsertId(),
        'position' => $position,
        'message' => 'Ajouté à la liste d\'attente en position ' . $position
    ], 201);
}

function getWaitlistPosition() {
    $user = requireAuth();
    $eventId = $_GET['event_id'] ?? null;
    if (!$eventId) jsonError('event_id requis');

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM waitlist WHERE event_id = ? AND user_id = ? AND status = "waiting"');
    $stmt->execute([$eventId, $user['id']]);
    $entry = $stmt->fetch();

    if (!$entry) jsonResponse(['on_waitlist' => false]);

    // Recalculate position
    $pos = $db->prepare('SELECT COUNT(*) FROM waitlist WHERE event_id = ? AND status = "waiting" AND created_at <= ?');
    $pos->execute([$eventId, $entry['created_at']]);

    jsonResponse([
        'on_waitlist' => true,
        'position' => (int)$pos->fetchColumn(),
        'entry' => $entry
    ]);
}

function listWaitlist() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $eventId = $_GET['event_id'] ?? null;
    $where = '1=1';
    $params = [];
    if ($eventId) { $where = 'w.event_id = ?'; $params[] = $eventId; }

    $stmt = $db->prepare("SELECT w.*, u.name, u.email, e.name as event_name
                          FROM waitlist w
                          LEFT JOIN users u ON w.user_id = u.id
                          LEFT JOIN events e ON w.event_id = e.id
                          WHERE $where ORDER BY w.position ASC LIMIT 200");
    $stmt->execute($params);
    jsonResponse(['waitlist' => $stmt->fetchAll()]);
}

function notifyWaitlistEntry($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $db->prepare("UPDATE waitlist SET status = 'notified', notified_at = datetime('now') WHERE id = ?")->execute([$id]);
    jsonResponse(['message' => 'Notification envoyée']);
}

function convertWaitlistToTicket($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $entry = $db->prepare('SELECT w.*, e.capacity, e.tickets_sold FROM waitlist w LEFT JOIN events e ON w.event_id = e.id WHERE w.id = ?');
    $entry->execute([$id]);
    $entry = $entry->fetch();
    if (!$entry) jsonError('Entrée non trouvée', 404);

    if ($entry['tickets_sold'] >= $entry['capacity']) {
        jsonError('Événement complet, impossible de convertir');
    }

    $db->prepare("UPDATE waitlist SET status = 'converted', converted_at = datetime('now') WHERE id = ?")->execute([$id]);

    jsonResponse([
        'message' => 'Prêt pour conversion — rediriger l\'utilisateur vers le checkout',
        'user_id' => $entry['user_id'],
        'event_id' => $entry['event_id'],
        'ticket_type' => $entry['ticket_type']
    ]);
}

function leaveWaitlist($id) {
    $user = requireAuth();
    $db = getDB();
    $db->prepare("UPDATE waitlist SET status = 'cancelled' WHERE id = ? AND user_id = ?")->execute([$id, $user['id']]);
    jsonResponse(['message' => 'Retiré de la liste d\'attente']);
}
