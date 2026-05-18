<?php
require_once __DIR__ . '/config.php';

function handleSubscriptions($method, $id, $action) {
    switch ($method) {
        case 'GET':
            $id ? getSubscription($id) : listSubscriptions();
            break;
        case 'POST':
            createSubscription();
            break;
        case 'PUT':
            if ($action === 'cancel') cancelSubscription($id);
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listSubscriptions() {
    $db = getDB();
    $user = requireAuth();
    $stmt = $db->prepare("SELECT * FROM subscriptions WHERE user_id = ?");
    $stmt->execute([$user['id']]);
    jsonResponse(['subscriptions' => $stmt->fetchAll()]);
}

function getSubscription($id) {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM subscriptions WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['subscription' => $stmt->fetch()]);
}

function createSubscription() {
    $db = getDB();
    $body = getBody();
    $user = requireAuth();
    
    $stmt = $db->prepare("INSERT INTO subscriptions (user_id, plan_id, status, next_billing) VALUES (?, ?, 'active', date('now', '+1 month'))");
    $stmt->execute([$user['id'], $body['plan_id']]);
    jsonResponse(['id' => $db->lastInsertId(), 'message' => 'Abonnement activé']);
}

function cancelSubscription($id) {
    $db = getDB();
    $db->prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?")->execute([$id]);
    jsonResponse(['message' => 'Abonnement annulé']);
}
