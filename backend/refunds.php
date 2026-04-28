<?php
require_once __DIR__ . '/config.php';

function handleRefunds($method, $id, $action) {
    if ($id && $action === 'approve' && $method === 'PUT') {
        approveRefund($id);
        return;
    }
    if ($id && $action === 'reject' && $method === 'PUT') {
        rejectRefund($id);
        return;
    }

    switch ($method) {
        case 'GET':
            listRefunds();
            break;
        case 'POST':
            createRefund();
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listRefunds() {
    $db = getDB();
    $where = ['1=1'];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[] = 'r.status = ?';
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['event_id'])) {
        $where[] = 'r.event_id = ?';
        $params[] = $_GET['event_id'];
    }

    $sql = 'SELECT r.*, e.name as event_name, t.id_code as ticket_code FROM refunds r LEFT JOIN events e ON r.event_id = e.id LEFT JOIN tickets t ON r.ticket_id = t.id WHERE ' . implode(' AND ', $where) . ' ORDER BY r.created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $refunds = $stmt->fetchAll();

    // Count pending
    $pending = $db->query('SELECT COUNT(*) FROM refunds WHERE status = "pending"')->fetchColumn();

    jsonResponse(['refunds' => $refunds, 'pending_count' => (int)$pending]);
}

function createRefund() {
    $user = requireAuth();
    $body = getBody();
    $ticketId = $body['ticket_id'] ?? null;
    $reason = $body['reason'] ?? '';

    if (!$ticketId) jsonError('ticket_id requis');

    $db = getDB();
    $ticket = $db->prepare('SELECT t.*, e.name as event_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id WHERE t.id = ?');
    $ticket->execute([$ticketId]);
    $ticket = $ticket->fetch();

    if (!$ticket) jsonError('Billet non trouvé', 404);
    if ($ticket['status'] !== 'active') jsonError('Ce billet ne peut pas être remboursé');

    $code = 'REF-' . str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);
    $stmt = $db->prepare('INSERT INTO refunds (id_code, ticket_id, event_id, client_name, amount, reason, status) VALUES (?, ?, ?, ?, ?, ?, "pending")');
    $stmt->execute([$code, $ticketId, $ticket['event_id'], $user['name'], $ticket['price'], $reason]);

    // Log
    $db->prepare('INSERT INTO activity_log (type, icon, text, user_id) VALUES ("refund", "mdi-cash-refund", ?, ?)')->execute([
        'Demande remboursement <strong>' . $user['name'] . '</strong>',
        $user['id']
    ]);

    jsonResponse(['refund' => ['id' => $db->lastInsertId(), 'id_code' => $code, 'status' => 'pending']], 201);
}

function approveRefund($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $refund = $db->prepare('SELECT * FROM refunds WHERE id = ?');
    $refund->execute([$id]);
    $refund = $refund->fetch();

    if (!$refund) jsonError('Remboursement non trouvé', 404);
    if ($refund['status'] !== 'pending') jsonError('Ce remboursement a déjà été traité');

    $db->beginTransaction();
    try {
        $db->prepare('UPDATE refunds SET status = "approved", updated_at = datetime("now") WHERE id = ?')->execute([$id]);
        $db->prepare('UPDATE tickets SET status = "refunded" WHERE id = ?')->execute([$refund['ticket_id']]);

        // Update event stats
        $ticket = $db->prepare('SELECT * FROM tickets WHERE id = ?');
        $ticket->execute([$refund['ticket_id']]);
        $ticket = $ticket->fetch();
        if ($ticket) {
            $db->prepare('UPDATE events SET tickets_sold = MAX(0, tickets_sold - 1), revenue = MAX(0, revenue - ?) WHERE id = ?')->execute([$refund['amount'], $refund['event_id']]);
        }

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Erreur: ' . $e->getMessage(), 500);
    }

    jsonResponse(['message' => 'Remboursement approuvé']);
}

function rejectRefund($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $refund = $db->prepare('SELECT * FROM refunds WHERE id = ?');
    $refund->execute([$id]);
    $refund = $refund->fetch();

    if (!$refund) jsonError('Remboursement non trouvé', 404);
    if ($refund['status'] !== 'pending') jsonError('Ce remboursement a déjà été traité');

    $db->prepare('UPDATE refunds SET status = "rejected", updated_at = datetime("now") WHERE id = ?')->execute([$id]);

    jsonResponse(['message' => 'Remboursement refusé']);
}
