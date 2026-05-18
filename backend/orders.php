<?php
require_once __DIR__ . '/config.php';

function handleOrders($method, $id, $action) {
    $user = requireAuth();
    
    if ($method === 'POST' && $action === 'confirm') {
        confirmOrder($id);
        return;
    }
    
    if ($method === 'GET' && $id) {
        getOrder($id);
        return;
    }

    if ($method === 'POST') {
        createOrder();
        return;
    }

    jsonError('Action non reconnue', 404);
}

function createOrder() {
    $user = requireAuth();
    $body = getBody();
    $db = getDB();

    $eventId = $body['event_id'] ?? null;
    $items = $body['items'] ?? []; // [{type, price, quantity}]
    
    if (!$eventId || empty($items)) jsonError('Données de commande incomplètes');

    $totalBeforeFees = 0;
    foreach ($items as $item) {
        $totalBeforeFees += $item['price'] * ($item['quantity'] ?? 1);
    }

    $fees = round($totalBeforeFees * COMMISSION_RATE);
    $totalGross = $totalBeforeFees + $fees;

    $shortId = 'ORD-' . strtoupper(bin2hex(random_bytes(4)));
    $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("INSERT INTO orders (short_id, buyer_id, event_id, total_before_fees, total_fees, total_gross, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$shortId, $user['id'], $eventId, $totalBeforeFees, $fees, $totalGross, $expiresAt]);
        $orderId = $db->lastInsertId();

        $itemStmt = $db->prepare("INSERT INTO order_items (order_id, type, price) VALUES (?, ?, ?)");
        foreach ($items as $item) {
            for ($i = 0; $i < ($item['quantity'] ?? 1); $i++) {
                $itemStmt->execute([$orderId, $item['type'], $item['price']]);
            }
        }

        $db->commit();
        jsonResponse(['success' => true, 'orderId' => $shortId, 'expires_at' => $expiresAt]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Erreur lors de la création de la commande: ' . $e->getMessage());
    }
}

function getOrder($id) {
    $db = getDB();
    $stmt = $db->prepare("SELECT o.*, e.name as event_name, e.date_start as event_date, e.venue as event_venue, e.image_url as event_image FROM orders o JOIN events e ON o.event_id = e.id WHERE o.short_id = ? OR o.id = ?");
    $stmt->execute([$id, $id]);
    $order = $stmt->fetch();
    
    if (!$order) jsonError('Commande non trouvée', 404);
    
    $itemStmt = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
    $itemStmt->execute([$order['id']]);
    $items = $itemStmt->fetchAll();

    jsonResponse(['order' => $order, 'items' => $items]);
}

function confirmOrder($id) {
    $db = getDB();
    $body = getBody();
    
    $stmt = $db->prepare("SELECT * FROM orders WHERE short_id = ? OR id = ?");
    $stmt->execute([$id, $id]);
    $order = $stmt->fetch();

    if (!$order) jsonError('Commande non trouvée', 404);
    if ($order['status'] !== 'pending') jsonError('Commande déjà traitée');
    
    // Check expiry
    if (strtotime($order['expires_at']) < time()) {
        $db->prepare("UPDATE orders SET status = 'expired' WHERE id = ?")->execute([$order['id']]);
        jsonError('Commande expirée', 410);
    }

    $db->beginTransaction();
    try {
        // Create tickets
        $itemStmt = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $itemStmt->execute([$order['id']]);
        $items = $itemStmt->fetchAll();

        foreach ($items as $item) {
            $code = 'TKT-' . strtoupper(bin2hex(random_bytes(5)));
            $payload = generateQRPayload($order['id'], $code, $order['buyer_id']);
            
            $tStmt = $db->prepare("INSERT INTO tickets (id_code, event_id, buyer_id, type, price, qr_payload) VALUES (?, ?, ?, ?, ?, ?)");
            $tStmt->execute([$code, $order['event_id'], $order['buyer_id'], $item['type'], $item['price'], $payload]);
            $ticketId = $db->lastInsertId();
            
            $db->prepare("UPDATE order_items SET ticket_id = ? WHERE id = ?")->execute([$ticketId, $item['id']]);
        }

        // Update order status
        $db->prepare("UPDATE orders SET status = 'completed', payment_method = ?, customer_info_json = ? WHERE id = ?")
           ->execute([$body['payment_method'] ?? 'unknown', json_encode($body['customer_info'] ?? []), $order['id']]);

        // Create transaction record
        $db->prepare("INSERT INTO transactions (id_code, buyer_id, event_id, amount, fees, total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')")
           ->execute([$order['short_id'], $order['buyer_id'], $order['event_id'], $order['total_before_fees'], $order['total_fees'], $order['total_gross'], $body['payment_method'] ?? 'unknown']);

        $db->commit();
        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Erreur de confirmation: ' . $e->getMessage());
    }
}
