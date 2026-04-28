<?php
require_once __DIR__ . '/config.php';

function handlePayouts($method, $id, $action) {
    if (($id === 'stats' && !$action) || $action === 'stats') {
        getPayoutStats();
        return;
    }

    switch ($method) {
        case 'GET':
            listPayouts();
            break;
        case 'POST':
            createPayout();
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listPayouts() {
    $db = getDB();
    $where = ['1=1'];
    $params = [];

    if (!empty($_GET['organizer_id'])) {
        $where[] = 'p.organizer_id = ?';
        $params[] = $_GET['organizer_id'];
    }
    if (!empty($_GET['status'])) {
        $where[] = 'p.status = ?';
        $params[] = $_GET['status'];
    }

    $sql = 'SELECT p.*, u.name as organizer_name FROM payouts p LEFT JOIN users u ON p.organizer_id = u.id WHERE ' . implode(' AND ', $where) . ' ORDER BY p.created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['payouts' => $stmt->fetchAll()]);
}

function createPayout() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();

    $organizerId = $body['organizer_id'] ?? $user['id'];
    $amount = (int)($body['amount'] ?? 0);
    $method = $body['method'] ?? 'Virement';

    if (!$amount) jsonError('Montant requis');

    $commission = (int)($amount * COMMISSION_RATE);
    $net = $amount - $commission;
    $code = 'PAY-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);

    $db = getDB();
    $stmt = $db->prepare('INSERT INTO payouts (id_code, organizer_id, amount, commission, net, method, status) VALUES (?, ?, ?, ?, ?, ?, "pending")');
    $stmt->execute([$code, $organizerId, $amount, $commission, $net, $method]);

    jsonResponse(['payout' => [
        'id' => $db->lastInsertId(),
        'id_code' => $code,
        'amount' => $amount,
        'commission' => $commission,
        'net' => $net,
        'method' => $method,
        'status' => 'pending'
    ]], 201);
}

function getPayoutStats() {
    $db = getDB();
    $where = '1=1';
    $params = [];

    if (!empty($_GET['organizer_id'])) {
        $where = 'organizer_id = ?';
        $params[] = $_GET['organizer_id'];
    }

    $sql = "SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN net ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN net ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(commission), 0) as total_commission,
        COUNT(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 END) as this_month_count
    FROM payouts WHERE $where";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    jsonResponse(['stats' => $stmt->fetch()]);
}
