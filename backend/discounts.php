<?php
require_once __DIR__ . '/config.php';

function handleDiscounts($method, $id, $action) {
    if ($action === 'validate' && $method === 'POST') { validateDiscount(); return; }
    if ($action === 'apply' && $method === 'POST') { applyDiscount(); return; }
    if ($action === 'bulk' && $method === 'POST') { bulkCreateDiscounts(); return; }
    
    switch ($method) {
        case 'GET': $id ? getDiscount($id) : listDiscounts(); break;
        case 'POST': createDiscount(); break;
        case 'PUT': if (!$id) jsonError('ID requis'); updateDiscount($id); break;
        case 'DELETE': if (!$id) jsonError('ID requis'); deleteDiscount($id); break;
        default: jsonError('Méthode non autorisée', 405);
    }
}

function listDiscounts() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    
    $stmt = $db->prepare("SELECT d.*, 
        (SELECT COUNT(*) FROM discount_usage du WHERE du.discount_id = d.id) as times_used
        FROM discounts d 
        WHERE d.created_by = ? OR ? IN ('admin','superadmin')
        ORDER BY d.created_at DESC");
    $stmt->execute([$user['id'], $user['role']]);
    
    jsonResponse(['discounts' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

function createDiscount() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate unique code
    $existing = $db->prepare("SELECT id FROM discounts WHERE code = ?");
    $existing->execute([strtoupper($data['code'])]);
    if ($existing->fetch()) jsonError('Ce code existe déjà', 409);
    
    $stmt = $db->prepare("INSERT INTO discounts 
        (code, name, discount_type, discount_value, min_order_amount, max_discount_amount,
         usage_limit, usage_per_customer, applicable_events_json, auto_apply, 
         is_active, starts_at, expires_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)");
    $stmt->execute([
        strtoupper($data['code']),
        $data['name'],
        $data['discount_type'] ?? 'fixed',
        $data['discount_value'],
        $data['min_order_amount'] ?? 0,
        $data['max_discount_amount'] ?? null,
        $data['usage_limit'] ?? null,
        $data['usage_per_customer'] ?? 1,
        json_encode($data['applicable_events'] ?? []),
        $data['auto_apply'] ?? 0,
        $data['starts_at'] ?? null,
        $data['expires_at'] ?? null,
        $user['id']
    ]);
    
    jsonResponse(['id' => $db->lastInsertId()], 201);
}

function getDiscount($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM discounts WHERE id = ?");
    $stmt->execute([$id]);
    $discount = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$discount) jsonError('Coupon non trouvé', 404);
    jsonResponse($discount);
}

function updateDiscount($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $allowed = ['name', 'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount',
                'usage_limit', 'usage_per_customer', 'applicable_events_json', 'auto_apply', 'is_active',
                'starts_at', 'expires_at'];
    $sets = [];
    $params = [];
    
    foreach ($allowed as $field) {
        if (isset($data[$field])) {
            $sets[] = "$field = ?";
            $params[] = is_array($data[$field]) ? json_encode($data[$field]) : $data[$field];
        }
    }
    
    $params[] = $id;
    $stmt = $db->prepare("UPDATE discounts SET " . implode(', ', $sets) . " WHERE id = ?");
    $stmt->execute($params);
    jsonResponse(['success' => true]);
}

function deleteDiscount($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $stmt = $db->prepare("DELETE FROM discounts WHERE id = ?");
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

function validateDiscount() {
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    $code = strtoupper($data['code'] ?? '');
    
    $stmt = $db->prepare("SELECT * FROM discounts WHERE code = ? AND is_active = 1");
    $stmt->execute([$code]);
    $discount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$discount) jsonError('Code invalide', 404);
    
    // Check expiry
    if ($discount['expires_at'] && strtotime($discount['expires_at']) < time()) {
        jsonError('Code expiré', 410);
    }
    if ($discount['starts_at'] && strtotime($discount['starts_at']) > time()) {
        jsonError('Code pas encore actif', 425);
    }
    
    // Check usage limit
    if ($discount['usage_limit'] && $discount['usage_count'] >= $discount['usage_limit']) {
        jsonError('Limite d\'utilisation atteinte', 429);
    }
    
    // Check per-customer limit
    if (!empty($data['user_id'])) {
        $userUsage = $db->prepare("SELECT COUNT(*) FROM discount_usage WHERE discount_id = ? AND user_id = ?");
        $userUsage->execute([$discount['id'], $data['user_id']]);
        if ((int)$userUsage->fetchColumn() >= $discount['usage_per_customer']) {
            jsonError('Vous avez déjà utilisé ce code', 429);
        }
    }
    
    // Check event applicability
    $applicableEvents = json_decode($discount['applicable_events_json'], true) ?: [];
    if (!empty($applicableEvents) && !empty($data['event_id'])) {
        if (!in_array($data['event_id'], $applicableEvents)) {
            jsonError('Code non valide pour cet événement', 422);
        }
    }
    
    // Calculate discount
    $orderAmount = $data['order_amount'] ?? 0;
    if ($orderAmount < $discount['min_order_amount']) {
        jsonError('Montant minimum requis: ' . number_format($discount['min_order_amount']) . ' MGA', 422);
    }
    
    $savings = 0;
    if ($discount['discount_type'] === 'percentage') {
        $savings = (int)($orderAmount * $discount['discount_value'] / 100);
        if ($discount['max_discount_amount']) {
            $savings = min($savings, $discount['max_discount_amount']);
        }
    } else {
        $savings = $discount['discount_value'];
    }
    
    jsonResponse([
        'valid' => true,
        'discount_id' => $discount['id'],
        'code' => $discount['code'],
        'type' => $discount['discount_type'],
        'value' => $discount['discount_value'],
        'savings' => $savings,
        'new_total' => max(0, $orderAmount - $savings)
    ]);
}

function applyDiscount() {
    // This would be called during checkout finalization
    // For now we just mock the logic or use it in transaction creation
    jsonResponse(['message' => 'Apply discount logic integrated in checkout']);
}

function bulkCreateDiscounts() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $prefix = strtoupper($data['prefix'] ?? 'PROMO');
    $count = min((int)($data['count'] ?? 10), 500);
    $codes = [];
    
    for ($i = 0; $i < $count; $i++) {
        $code = $prefix . '-' . strtoupper(bin2hex(random_bytes(3)));
        $stmt = $db->prepare("INSERT INTO discounts 
            (code, name, discount_type, discount_value, usage_limit, usage_per_customer,
             applicable_events_json, starts_at, expires_at, created_by, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([
            $code, $data['name'] ?? $prefix, 
            $data['discount_type'] ?? 'fixed', $data['discount_value'] ?? 0,
            $data['usage_limit'] ?? 1, 1,
            json_encode($data['applicable_events'] ?? []),
            $data['starts_at'] ?? null, $data['expires_at'] ?? null,
            $user['id']
        ]);
        $codes[] = $code;
    }
    
    jsonResponse(['codes' => $codes, 'count' => count($codes)], 201);
}
