<?php
require_once __DIR__ . '/config.php';

function handleClients($method, $id, $action) {
    switch ($method) {
        case 'GET':
            $id ? getClient($id) : listClients();
            break;
        case 'POST':
            createClient();
            break;
        case 'PUT':
            if (!$id) jsonError('ID requis');
            updateClient($id);
            break;
        case 'DELETE':
            if (!$id) jsonError('ID requis');
            deleteClient($id);
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listClients() {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $where = ['u.role = "organizer"'];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[] = 'u.status = ?';
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['plan'])) {
        $where[] = 'u.plan = ?';
        $params[] = $_GET['plan'];
    }
    if (!empty($_GET['search'])) {
        $where[] = '(u.name LIKE ? OR u.email LIKE ?)';
        $params[] = '%' . $_GET['search'] . '%';
        $params[] = '%' . $_GET['search'] . '%';
    }

    $sql = 'SELECT u.id, u.name, u.email, u.avatar_initials, u.plan, u.phone, u.status, u.created_at,
        (SELECT COUNT(*) FROM events WHERE organizer_id = u.id AND status != "cancelled") as events_count,
        (SELECT COALESCE(SUM(revenue), 0) FROM events WHERE organizer_id = u.id) as total_revenue
    FROM users u WHERE ' . implode(' AND ', $where) . ' ORDER BY u.created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['clients' => $stmt->fetchAll()]);
}

function getClient($id) {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $stmt = $db->prepare('SELECT u.*, (SELECT COUNT(*) FROM events WHERE organizer_id = u.id) as events_count, (SELECT COALESCE(SUM(revenue), 0) FROM events WHERE organizer_id = u.id) as total_revenue FROM users u WHERE u.id = ? AND u.role = "organizer"');
    $stmt->execute([$id]);
    $client = $stmt->fetch();

    if (!$client) jsonError('Client non trouvé', 404);
    unset($client['password_hash']);

    jsonResponse(['client' => $client]);
}

function createClient() {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();

    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $plan = $body['plan'] ?? 'starter';
    $status = $body['status'] ?? 'active';

    if (!$name || !$email) jsonError('Nom et email requis');

    $db = getDB();

    $check = $db->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) jsonError('Cet email est déjà utilisé');

    $hash = password_hash('password123', PASSWORD_DEFAULT);
    $initials = strtoupper(substr($name, 0, 1) . substr(strrchr($name, ' ') ?: $name, 1, 1));

    $stmt = $db->prepare('INSERT INTO users (name, email, password_hash, role, plan, avatar_initials, phone, status) VALUES (?, ?, ?, "organizer", ?, ?, ?, ?)');
    $stmt->execute([$name, $email, $hash, $plan, $initials, $phone, $status]);

    // Log activity
    $db->prepare('INSERT INTO activity_log (type, icon, text, user_id) VALUES ("user", "mdi-account-plus", ?, ?)')->execute([
        'Nouveau client: <strong>' . $name . '</strong>',
        $user['id']
    ]);

    jsonResponse(['client' => ['id' => $db->lastInsertId(), 'name' => $name, 'email' => $email, 'plan' => $plan]], 201);
}

function updateClient($id) {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $fields = [];
    $values = [];
    $allowed = ['name', 'email', 'phone', 'plan', 'status'];
    foreach ($allowed as $field) {
        if (isset($body[$field])) {
            $fields[] = "$field = ?";
            $values[] = $body[$field];
        }
    }

    if (empty($fields)) jsonError('Aucun champ à mettre à jour');

    $values[] = $id;
    $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ? AND role = "organizer"')->execute($values);

    jsonResponse(['message' => 'Client mis à jour']);
}

function deleteClient($id) {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $db->prepare('UPDATE users SET status = "suspended" WHERE id = ? AND role = "organizer"')->execute([$id]);

    jsonResponse(['message' => 'Client suspendu']);
}
