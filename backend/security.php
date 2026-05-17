<?php
require_once __DIR__ . '/config.php';

function handleSecurity($method, $action, $subAction) {
    switch ($action) {
        case 'audit-log': getAuditLog(); break;
        case 'api-keys': handleApiKeys($method, $subAction); break;
        case 'sessions': handleSessions($method, $subAction); break;
        case 'permissions': getPermissions(); break;
        default: jsonError('Route sécurité non trouvée', 404);
    }
}

function logAudit($userId, $action, $resourceType = null, $resourceId = null, $details = null) {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO audit_log 
        (user_id, action, resource_type, resource_id, details_json, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $userId, $action, $resourceType, $resourceId,
        $details ? json_encode($details) : null,
        $_SERVER['REMOTE_ADDR'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
}

function getAuditLog() {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    
    $limit = min((int)($_GET['limit'] ?? 100), 500);
    $offset = (int)($_GET['offset'] ?? 0);
    
    $where = ['1=1'];
    $params = [];
    
    if (!empty($_GET['user_id'])) {
        $where[] = 'al.user_id = ?';
        $params[] = $_GET['user_id'];
    }
    if (!empty($_GET['action'])) {
        $where[] = 'al.action LIKE ?';
        $params[] = '%' . $_GET['action'] . '%';
    }
    if (!empty($_GET['from'])) {
        $where[] = 'date(al.created_at) >= ?';
        $params[] = $_GET['from'];
    }
    
    $stmt = $db->prepare("SELECT al.*, u.name as user_name, u.email as user_email
        FROM audit_log al LEFT JOIN users u ON al.user_id = u.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY al.created_at DESC LIMIT {$limit} OFFSET {$offset}");
    $stmt->execute($params);
    
    jsonResponse(['logs' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function handleApiKeys($method, $id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT id, name, key_prefix, permissions_json, last_used_at, 
            is_active, created_at FROM api_keys WHERE organizer_id = ?");
        $stmt->execute([$user['id']]);
        jsonResponse(['api_keys' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }
    
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $rawKey = 'tm_' . bin2hex(random_bytes(24));
        $prefix = substr($rawKey, 0, 8) . '...';
        
        $stmt = $db->prepare("INSERT INTO api_keys 
            (organizer_id, name, key_hash, key_prefix, permissions_json, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $user['id'], $data['name'] ?? 'API Key',
            password_hash($rawKey, PASSWORD_DEFAULT),
            $prefix,
            json_encode($data['permissions'] ?? ['read']),
            $data['expires_at'] ?? null
        ]);
        
        logAudit($user['id'], 'api_key_created', 'api_key', $db->lastInsertId());
        
        // Return raw key ONLY on creation
        jsonResponse(['api_key' => $rawKey, 'prefix' => $prefix, 'message' => 'Sauvegardez cette clé — elle ne sera plus affichée'], 201);
        return;
    }
    
    if ($method === 'DELETE' && $id) {
        $stmt = $db->prepare("UPDATE api_keys SET is_active = 0 WHERE id = ? AND organizer_id = ?");
        $stmt->execute([$id, $user['id']]);
        logAudit($user['id'], 'api_key_revoked', 'api_key', $id);
        jsonResponse(['success' => true]);
        return;
    }
}

function handleSessions($method, $id) {
    $user = requireAuth();
    $db = getDB();
    
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT id, device, ip_address, location, is_current, 
            last_active, created_at FROM user_sessions 
            WHERE user_id = ? AND expires_at > datetime('now')
            ORDER BY last_active DESC");
        $stmt->execute([$user['id']]);
        jsonResponse(['sessions' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }
    
    if ($method === 'DELETE' && $id) {
        if ($id === 'all') {
            $stmt = $db->prepare("DELETE FROM user_sessions WHERE user_id = ? AND is_current = 0");
            $stmt->execute([$user['id']]);
        } else {
            $stmt = $db->prepare("DELETE FROM user_sessions WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $user['id']]);
        }
        logAudit($user['id'], 'session_revoked', 'session', $id);
        jsonResponse(['success' => true]);
        return;
    }
}

function getPermissions() {
    $user = requireAuth();
    // In a real app, this would query role_permissions table
    $perms = match($user['role']) {
        'superadmin' => ['*'],
        'admin' => ['events.*', 'users.*', 'transactions.*'],
        'organizer' => ['events.own', 'transactions.own', 'team.own'],
        default => ['tickets.own'],
    };
    jsonResponse(['role' => $user['role'], 'permissions' => $perms]);
}
