<?php
require_once __DIR__ . '/config.php';

function handleEvents($method, $id, $action) {
    if ($action === 'featured' && !$id) {
        getFeaturedEvents();
        return;
    }
    if ($action === 'categories' && !$id) {
        getCategories();
        return;
    }

    switch ($method) {
        case 'GET':
            $id ? getEvent($id) : listEvents();
            break;
        case 'POST':
            createEvent();
            break;
        case 'PUT':
            if (!$id) jsonError('ID requis');
            updateEvent($id);
            break;
        case 'DELETE':
            if (!$id) jsonError('ID requis');
            deleteEvent($id);
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listEvents() {
    $db = getDB();
    $where = ['1=1'];
    $params = [];

    if (!empty($_GET['category']) && $_GET['category'] !== 'all') {
        $where[] = 'e.category = ?';
        $params[] = $_GET['category'];
    }
    if (!empty($_GET['status'])) {
        $where[] = 'e.status = ?';
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['search'])) {
        $where[] = '(e.name LIKE ? OR e.venue LIKE ?)';
        $params[] = '%' . $_GET['search'] . '%';
        $params[] = '%' . $_GET['search'] . '%';
    }
    if (!empty($_GET['organizer_id'])) {
        $where[] = 'e.organizer_id = ?';
        $params[] = $_GET['organizer_id'];
    }

    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);

    $sql = 'SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE ' . implode(' AND ', $where) . ' ORDER BY e.date_start ASC LIMIT ? OFFSET ?';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $events = $stmt->fetchAll();

    // Count total
    $countSql = 'SELECT COUNT(*) FROM events e WHERE ' . implode(' AND ', array_slice($where, 0));
    $countParams = array_slice($params, 0, -2);
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($countParams);
    $total = $countStmt->fetchColumn();

    jsonResponse(['events' => $events, 'total' => $total]);
}

function getEvent($id) {
    $db = getDB();
    $stmt = $db->prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.id = ?');
    $stmt->execute([$id]);
    $event = $stmt->fetch();

    if (!$event) jsonError('Événement non trouvé', 404);

    // Get ticket stats for this event
    $ticketStats = $db->prepare('SELECT type, COUNT(*) as count, SUM(price) as total_price, status FROM tickets WHERE event_id = ? GROUP BY type, status');
    $ticketStats->execute([$id]);
    $event['ticket_stats'] = $ticketStats->fetchAll();

    jsonResponse(['event' => $event]);
}

function getFeaturedEvents() {
    $db = getDB();
    $limit = (int)($_GET['limit'] ?? 8);
    $stmt = $db->prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.status IN ("active", "pending") ORDER BY e.tickets_sold DESC LIMIT ?');
    $stmt->execute([$limit]);
    jsonResponse(['events' => $stmt->fetchAll()]);
}

function getCategories() {
    $db = getDB();
    $stmt = $db->query('SELECT category, COUNT(*) as count FROM events WHERE status IN ("active", "pending") GROUP BY category ORDER BY count DESC');
    $categories = $stmt->fetchAll();

    $icons = ['concerts' => '🎵', 'festivals' => '🎪', 'sports' => '⚽', 'theatre' => '🎭'];
    foreach ($categories as &$cat) {
        $cat['icon'] = $icons[$cat['category']] ?? '🎫';
    }

    jsonResponse(['categories' => $categories]);
}

function createEvent() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();

    $required = ['name', 'category', 'date_start', 'venue', 'capacity'];
    foreach ($required as $field) {
        if (empty($body[$field])) jsonError("Le champ '$field' est requis");
    }

    $db = getDB();
    $stmt = $db->prepare('INSERT INTO events (organizer_id, name, category, description, emoji, date_start, date_end, venue, capacity, image_url, badge, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $user['id'],
        $body['name'],
        $body['category'],
        $body['description'] ?? '',
        $body['emoji'] ?? '🎫',
        $body['date_start'],
        $body['date_end'] ?? null,
        $body['venue'],
        (int)$body['capacity'],
        $body['image_url'] ?? null,
        $body['badge'] ?? null,
        $body['status'] ?? 'pending'
    ]);

    $eventId = $db->lastInsertId();

    // Log activity
    $db->prepare('INSERT INTO activity_log (type, icon, text, user_id) VALUES ("event", "mdi-calendar-plus", ?, ?)')->execute([
        'Événement: <strong>' . $body['name'] . '</strong>',
        $user['id']
    ]);

    $stmt = $db->prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.id = ?');
    $stmt->execute([$eventId]);

    jsonResponse(['event' => $stmt->fetch()], 201);
}

function updateEvent($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    // Check ownership
    $event = $db->prepare('SELECT * FROM events WHERE id = ?');
    $event->execute([$id]);
    $event = $event->fetch();
    if (!$event) jsonError('Événement non trouvé', 404);
    if ($user['role'] === ROLE_ORGANIZER && $event['organizer_id'] != $user['id']) {
        jsonError('Accès interdit', 403);
    }

    $fields = [];
    $values = [];
    $allowed = ['name', 'category', 'description', 'emoji', 'date_start', 'date_end', 'venue', 'capacity', 'image_url', 'badge', 'status'];
    foreach ($allowed as $field) {
        if (isset($body[$field])) {
            $fields[] = "$field = ?";
            $values[] = $body[$field];
        }
    }

    if (empty($fields)) jsonError('Aucun champ à mettre à jour');

    $values[] = $id;
    $db->prepare('UPDATE events SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    $stmt = $db->prepare('SELECT e.*, u.name as organizer_name FROM events e LEFT JOIN users u ON e.organizer_id = u.id WHERE e.id = ?');
    $stmt->execute([$id]);

    jsonResponse(['event' => $stmt->fetch()]);
}

function deleteEvent($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $event = $db->prepare('SELECT * FROM events WHERE id = ?');
    $event->execute([$id]);
    $event = $event->fetch();
    if (!$event) jsonError('Événement non trouvé', 404);

    // Soft delete by setting status to cancelled
    $db->prepare('UPDATE events SET status = "cancelled" WHERE id = ?')->execute([$id]);

    jsonResponse(['message' => 'Événement supprimé']);
}
