<?php
require_once __DIR__ . '/config.php';

function handleAccounting($method, $action, $id) {
    switch ($method) {
        case 'GET':
            if ($action === 'invoices') listInvoices();
            else if ($action === 'ledger') getLedger();
            else getAccountingStats();
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function getAccountingStats() {
    $db = getDB();
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    
    $where = ($user['role'] === ROLE_ORGANIZER) ? "WHERE organizer_id = " . (int)$user['id'] : "";
    
    $stats = [
        'gross_revenue' => $db->query("SELECT SUM(price) FROM tickets $where")->fetchColumn(),
        'net_revenue' => $db->query("SELECT SUM(price * 0.97) FROM tickets $where")->fetchColumn(), // 3% commission
        'commissions' => $db->query("SELECT SUM(price * 0.03) FROM tickets $where")->fetchColumn(),
        'pending_payouts' => $db->query("SELECT SUM(amount) FROM payouts WHERE status = 'pending'")->fetchColumn()
    ];
    
    jsonResponse($stats);
}

function listInvoices() {
    $db = getDB();
    $user = requireAuth();
    // Simplified: list tickets as invoice stubs
    $stmt = $db->prepare("SELECT t.*, e.name as event_name FROM tickets t JOIN events e ON t.event_id = e.id WHERE t.buyer_id = ? ORDER BY t.created_at DESC");
    $stmt->execute([$user['id']]);
    jsonResponse(['invoices' => $stmt->fetchAll()]);
}

function getLedger() {
    $db = getDB();
    $user = requireAuth([ROLE_SUPERADMIN]);
    $stmt = $db->query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100");
    jsonResponse(['entries' => $stmt->fetchAll()]);
}
