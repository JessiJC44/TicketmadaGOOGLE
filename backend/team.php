<?php
require_once __DIR__ . '/config.php';

function handleTeam($method, $id, $action) {
    switch ($method) {
        case 'GET':
            listTeam();
            break;
        case 'POST':
            addTeamMember();
            break;
        case 'PUT':
            if (!$id) jsonError('ID requis');
            updateTeamMember($id);
            break;
        case 'DELETE':
            if (!$id) jsonError('ID requis');
            removeTeamMember($id);
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listTeam() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $organizerId = $_GET['organizer_id'] ?? $user['id'];

    $stmt = $db->prepare('SELECT tm.*, u.name, u.email, u.avatar_initials FROM team_members tm LEFT JOIN users u ON tm.user_id = u.id WHERE tm.organizer_id = ? ORDER BY tm.created_at DESC');
    $stmt->execute([$organizerId]);

    jsonResponse(['team' => $stmt->fetchAll()]);
}

function addTeamMember() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();

    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $role = $body['role'] ?? 'guichetier';
    $roleLabel = $body['role_label'] ?? ucfirst($role);
    $eventsAccess = $body['events_access'] ?? 'Tous';

    if (!$name || !$email) jsonError('Nom et email requis');

    $db = getDB();

    // Create or find user
    $existingUser = $db->prepare('SELECT id FROM users WHERE email = ?');
    $existingUser->execute([$email]);
    $existingUser = $existingUser->fetch();

    if ($existingUser) {
        $memberId = $existingUser['id'];
    } else {
        $hash = password_hash('password123', PASSWORD_DEFAULT);
        $initials = strtoupper(substr($name, 0, 1) . substr(strrchr($name, ' ') ?: $name, 1, 1));
        $db->prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?, ?, ?, "organizer", ?, "active")')->execute([$name, $email, $hash, $initials]);
        $memberId = $db->lastInsertId();
    }

    // Check not already in team
    $check = $db->prepare('SELECT id FROM team_members WHERE organizer_id = ? AND user_id = ?');
    $check->execute([$user['id'], $memberId]);
    if ($check->fetch()) jsonError('Ce membre fait déjà partie de l\'équipe');

    $db->prepare('INSERT INTO team_members (organizer_id, user_id, role, role_label, events_access, last_access) VALUES (?, ?, ?, ?, ?, datetime("now"))')->execute([$user['id'], $memberId, $role, $roleLabel, $eventsAccess]);

    jsonResponse(['member' => ['id' => $db->lastInsertId(), 'name' => $name, 'email' => $email, 'role' => $role]], 201);
}

function updateTeamMember($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $fields = [];
    $values = [];
    $allowed = ['role', 'role_label', 'events_access'];
    foreach ($allowed as $field) {
        if (isset($body[$field])) {
            $fields[] = "$field = ?";
            $values[] = $body[$field];
        }
    }

    if (empty($fields)) jsonError('Aucun champ à mettre à jour');

    $values[] = $id;
    $db->prepare('UPDATE team_members SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    jsonResponse(['message' => 'Membre mis à jour']);
}

function removeTeamMember($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $db->prepare('DELETE FROM team_members WHERE id = ? AND organizer_id = ?')->execute([$id, $user['id']]);

    jsonResponse(['message' => 'Membre retiré']);
}
