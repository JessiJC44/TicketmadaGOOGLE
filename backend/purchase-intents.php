<?php
require_once __DIR__ . '/config.php';

function handlePurchaseIntents($method, $id, $action) {
    switch ($method) {
        case 'GET':
            $id ? getPurchaseIntent($id) : listPurchaseIntents();
            break;
        case 'POST':
            createPurchaseIntent();
            break;
        case 'PUT':
            if ($action === 'status') updatePurchaseIntentStatus($id);
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listPurchaseIntents() {
    $db = getDB();
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    
    $where = ['1=1'];
    $params = [];
    
    if ($user['role'] === ROLE_ORGANIZER) {
        $where[] = "e.organizer_id = ?";
        $params[] = $user['id'];
    }

    $sql = "SELECT pi.*, e.name as event_name, u.name as buyer_name 
            FROM purchase_intents pi
            JOIN events e ON pi.event_id = e.id
            LEFT JOIN users u ON pi.user_id = u.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY pi.created_at DESC";
            
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['intents' => $stmt->fetchAll()]);
}

function getPurchaseIntent($id) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM purchase_intents WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['intent' => $stmt->fetch()]);
}

function createPurchaseIntent() {
    $db = getDB();
    $body = getBody();
    
    $stmt = $db->prepare("INSERT INTO purchase_intents (event_id, user_id, details_json, status) VALUES (?, ?, ?, 'pending')");
    $stmt->execute([
        $body['event_id'],
        $body['user_id'] ?? null,
        json_encode($body['details'] ?? [])
    ]);
    
    jsonResponse(['id' => $db->lastInsertId(), 'message' => 'Intention d\'achat enregistrée']);
}

function updatePurchaseIntentStatus($id) {
    $db = getDB();
    $body = getBody();
    $stmt = $db->prepare("UPDATE purchase_intents SET status = ? WHERE id = ?");
    $stmt->execute([$body['status'], $id]);
    jsonResponse(['message' => 'Statut mis à jour']);
}
