<?php
require_once __DIR__ . '/config.php';

function handleTransactions($method, $id, $action) {
    if ($action === 'export' && $method === 'GET') {
        exportTransactions();
        return;
    }
    if ($action === 'stats' && $method === 'GET') {
        getTransactionStats();
        return;
    }
    
    switch ($method) {
        case 'GET':
            $id ? getTransaction($id) : listTransactions();
            break;
        case 'POST':
            createTransaction();
            break;
        case 'PUT':
            if (!$id) jsonError('ID requis');
            updateTransaction($id);
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listTransactions() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $where = ['1=1'];
    $params = [];
    
    // Filter by organizer's events
    if ($user['role'] === ROLE_ORGANIZER) {
        $where[] = 'tr.event_id IN (SELECT id FROM events WHERE organizer_id = ?)';
        $params[] = $user['id'];
    }
    
    if (!empty($_GET['status'])) {
        $where[] = 'tr.status = ?';
        $params[] = $_GET['status'];
    }
    if (!empty($_GET['event_id'])) {
        $where[] = 'tr.event_id = ?';
        $params[] = $_GET['event_id'];
    }
    if (!empty($_GET['date_from'])) {
        $where[] = 'date(tr.created_at) >= ?';
        $params[] = $_GET['date_from'];
    }
    if (!empty($_GET['date_to'])) {
        $where[] = 'date(tr.created_at) <= ?';
        $params[] = $_GET['date_to'];
    }
    if (!empty($_GET['search'])) {
        $where[] = '(tr.id_code LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
        $s = '%' . $_GET['search'] . '%';
        $params = array_merge($params, [$s, $s, $s]);
    }
    if (!empty($_GET['min_amount'])) {
        $where[] = 'tr.total >= ?';
        $params[] = (int)$_GET['min_amount'];
    }
    if (!empty($_GET['max_amount'])) {
        $where[] = 'tr.total <= ?';
        $params[] = (int)$_GET['max_amount'];
    }
    
    $limit = min((int)($_GET['limit'] ?? 50), 200);
    $offset = (int)($_GET['offset'] ?? 0);
    $orderBy = $_GET['sort'] ?? 'tr.created_at DESC';
    
    $sql = "SELECT tr.*, u.name as buyer_name, u.email as buyer_email, 
            e.name as event_name
            FROM transactions tr
            LEFT JOIN users u ON tr.buyer_id = u.id
            LEFT JOIN events e ON tr.event_id = e.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY {$orderBy}
            LIMIT {$limit} OFFSET {$offset}";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Total count
    $countSql = "SELECT COUNT(*) FROM transactions tr 
                 LEFT JOIN users u ON tr.buyer_id = u.id
                 WHERE " . implode(' AND ', $where);
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();
    
    jsonResponse(['transactions' => $transactions, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
}

function getTransaction($id) {
    $user = requireAuth();
    $db = getDB();
    
    $stmt = $db->prepare("SELECT tr.*, u.name as buyer_name, u.email as buyer_email,
        u.phone as buyer_phone, e.name as event_name, e.date_start as event_date
        FROM transactions tr
        LEFT JOIN users u ON tr.buyer_id = u.id
        LEFT JOIN events e ON tr.event_id = e.id
        WHERE tr.id = ? OR tr.id_code = ?");
    $stmt->execute([$id, $id]);
    $tr = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$tr) jsonError('Transaction non trouvée', 404);
    
    // Get associated tickets
    $tickets = $db->prepare("SELECT * FROM tickets WHERE event_id = ? AND buyer_id = ? 
        AND created_at >= datetime(?, '-1 minute') AND created_at <= datetime(?, '+1 minute')");
    $tickets->execute([$tr['event_id'], $tr['buyer_id'], $tr['created_at'], $tr['created_at']]);
    $tr['tickets'] = $tickets->fetchAll(PDO::FETCH_ASSOC);
    
    jsonResponse($tr);
}

function createTransaction() {
    $user = requireAuth();
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $idCode = 'TR-' . strtoupper(bin2hex(random_bytes(6)));
    
    $stmt = $db->prepare("INSERT INTO transactions 
        (id_code, buyer_id, event_id, amount, fees, total, currency, payment_method, 
         payment_provider, payment_reference, status, items_json, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $fees = (int)(($data['amount'] ?? 0) * 0.05); // 5% platform fee
    $total = ($data['amount'] ?? 0) + $fees;
    
    $stmt->execute([
        $idCode,
        $user['id'],
        $data['event_id'] ?? null,
        $data['amount'] ?? 0,
        $fees,
        $total,
        $data['currency'] ?? 'MGA',
        $data['payment_method'] ?? 'mobile_money',
        $data['payment_provider'] ?? null,
        $data['payment_reference'] ?? null,
        'pending',
        json_encode($data['items'] ?? []),
        $_SERVER['REMOTE_ADDR'] ?? '',
        $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);
    
    jsonResponse(['id' => $db->lastInsertId(), 'id_code' => $idCode, 'status' => 'pending'], 201);
}

function updateTransaction($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $allowed = ['status', 'payment_reference', 'metadata_json'];
    $sets = [];
    $params = [];
    
    foreach ($allowed as $field) {
        if (isset($data[$field])) {
            $sets[] = "{$field} = ?";
            $params[] = $data[$field];
        }
    }
    
    if (isset($data['status']) && $data['status'] === 'completed') {
        $sets[] = "completed_at = datetime('now')";
    }
    
    $params[] = $id;
    $stmt = $db->prepare("UPDATE transactions SET " . implode(', ', $sets) . " WHERE id = ?");
    $stmt->execute($params);
    
    // Log activity
    logActivity('transaction_update', "Transaction #{$id} mise à jour → " . ($data['status'] ?? 'N/A'), $user['id']);
    
    jsonResponse(['success' => true]);
}

function getTransactionStats() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    
    $orgFilter = '';
    $params = [];
    if ($user['role'] === ROLE_ORGANIZER) {
        $orgFilter = 'AND tr.event_id IN (SELECT id FROM events WHERE organizer_id = ?)';
        $params[] = $user['id'];
    }
    
    $stats = $db->prepare("SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN status='completed' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status='completed' THEN fees ELSE 0 END), 0) as total_fees,
        COALESCE(AVG(CASE WHEN status='completed' THEN total ELSE NULL END), 0) as avg_transaction,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END) as refunded
        FROM transactions tr WHERE 1=1 {$orgFilter}");
    $stats->execute($params);
    
    jsonResponse($stats->fetch(PDO::FETCH_ASSOC));
}

function exportTransactions() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    
    $format = $_GET['format'] ?? 'csv';
    
    $orgFilter = '';
    $params = [];
    if ($user['role'] === ROLE_ORGANIZER) {
        $orgFilter = 'AND tr.event_id IN (SELECT id FROM events WHERE organizer_id = ?)';
        $params[] = $user['id'];
    }
    
    $stmt = $db->prepare("SELECT tr.id_code, tr.created_at, tr.amount, tr.fees, tr.total,
        tr.status, tr.payment_method, u.name as buyer, u.email, e.name as event
        FROM transactions tr
        LEFT JOIN users u ON tr.buyer_id = u.id
        LEFT JOIN events e ON tr.event_id = e.id
        WHERE 1=1 {$orgFilter}
        ORDER BY tr.created_at DESC");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($format === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=transactions_export.csv');
        $out = fopen('php://output', 'w');
        if (!empty($rows)) {
            fputcsv($out, array_keys($rows[0]));
            foreach ($rows as $row) fputcsv($out, $row);
        }
        fclose($out);
        exit;
    }
    
    jsonResponse(['data' => $rows, 'count' => count($rows)]);
}
