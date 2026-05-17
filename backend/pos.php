<?php
require_once __DIR__ . '/config.php';

function handlePOS($method, $id, $action) {
    switch (true) {
        case $action === 'sale' && $method === 'POST':
            processPOSSale();
            break;
        case $action === 'sessions' && $method === 'GET':
            listPOSSessions();
            break;
        case $action === 'sessions' && $method === 'POST':
            openPOSSession();
            break;
        case $action === 'close' && $method === 'PUT' && $id:
            closePOSSession($id);
            break;
        case $action === 'summary' && $method === 'GET':
            getPOSSummary();
            break;
        case $method === 'GET':
            getPOSConfig();
            break;
        default:
            jsonError('Route POS non trouvée', 404);
    }
}

function openPOSSession() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $eventId = $body['event_id'] ?? null;
    if (!$eventId) jsonError('event_id requis');

    $token = bin2hex(random_bytes(16));
    $stmt = $db->prepare("INSERT INTO pos_sessions (token, event_id, operator_id, cash_start, status)
                          VALUES (?, ?, ?, ?, 'open')");
    $stmt->execute([$token, $eventId, $user['id'], (int)($body['cash_start'] ?? 0)]);

    jsonResponse([
        'session_id' => $db->lastInsertId(),
        'token' => $token,
        'message' => 'Session POS ouverte'
    ], 201);
}

function processPOSSale() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $sessionId = $body['session_id'] ?? null;
    $eventId = $body['event_id'] ?? null;
    $items = $body['items'] ?? []; // [{type:'ticket', ticket_type:'VIP', price:50000, qty:2}, {type:'product', product_id:5, qty:1}]
    $paymentMethod = $body['payment_method'] ?? 'cash'; // cash, mobile_money, card

    if (!$eventId || empty($items)) jsonError('event_id et items requis');

    // Verify event
    $event = $db->prepare("SELECT * FROM events WHERE id = ? AND status = 'active'");
    $event->execute([$eventId]);
    $event = $event->fetch();
    if (!$event) jsonError('Événement non trouvé');

    $db->beginTransaction();
    $totalAmount = 0;
    $createdTickets = [];
    $createdProducts = [];

    try {
        foreach ($items as $item) {
            if ($item['type'] === 'ticket') {
                $qty = (int)($item['qty'] ?? 1);
                $price = (int)$item['price'];
                $type = $item['ticket_type'] ?? 'Standard';

                // Check capacity
                if ($event['tickets_sold'] + $qty > $event['capacity']) {
                    throw new Exception('Capacité insuffisante');
                }

                for ($i = 0; $i < $qty; $i++) {
                    $code = generateTicketCode();
                    $check = $db->prepare('SELECT id FROM tickets WHERE id_code = ?');
                    while ($check->execute([$code]) && $check->fetch()) {
                        $code = generateTicketCode();
                    }

                    $db->prepare("INSERT INTO tickets (id_code, event_id, buyer_id, type, price, status, created_at)
                                  VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))")->execute([
                        $code, $eventId, $user['id'], $type, $price
                    ]);

                    $createdTickets[] = ['id_code' => $code, 'type' => $type, 'price' => $price];
                }

                $subtotal = $price * $qty;
                $totalAmount += $subtotal;

                // Update event stats
                $db->prepare('UPDATE events SET tickets_sold = tickets_sold + ?, revenue = revenue + ? WHERE id = ?')
                   ->execute([$qty, $subtotal, $eventId]);

            } elseif ($item['type'] === 'product') {
                $productId = (int)$item['product_id'];
                $qty = (int)($item['qty'] ?? 1);

                $product = $db->prepare('SELECT * FROM products WHERE id = ? AND status = "active"');
                $product->execute([$productId]);
                $product = $product->fetch();

                if (!$product) throw new Exception('Produit #' . $productId . ' non trouvé');
                if ($product['stock'] > 0 && $product['stock'] < $qty) throw new Exception('Stock insuffisant pour ' . $product['name']);

                $subtotal = $product['price'] * $qty;
                $totalAmount += $subtotal;

                // Decrement stock
                if ($product['stock'] > 0) {
                    $db->prepare('UPDATE products SET stock = stock - ? WHERE id = ?')->execute([$qty, $productId]);
                }

                $createdProducts[] = ['product' => $product['name'], 'qty' => $qty, 'price' => $product['price']];
            }
        }

        // Record POS transaction
        $db->prepare("INSERT INTO pos_transactions (session_id, operator_id, event_id, items_json, total_amount, payment_method, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))")->execute([
            $sessionId,
            $user['id'],
            $eventId,
            json_encode(['tickets' => $createdTickets, 'products' => $createdProducts]),
            $totalAmount,
            $paymentMethod
        ]);

        // Log activity
        $db->prepare("INSERT INTO activity_log (type, icon, text, user_id) VALUES ('pos_sale', 'mdi-point-of-sale', ?, ?)")->execute([
            '<strong>Vente POS</strong> ' . number_format($totalAmount) . ' Ar — ' . $event['name'],
            $user['id']
        ]);

        $db->commit();

    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Erreur POS: ' . $e->getMessage(), 500);
    }

    jsonResponse([
        'success' => true,
        'total' => $totalAmount,
        'payment_method' => $paymentMethod,
        'tickets' => $createdTickets,
        'products' => $createdProducts,
        'receipt_id' => 'POS-' . date('Ymd') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT)
    ], 201);
}

function closePOSSession($sessionId) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $cashEnd = (int)($body['cash_end'] ?? 0);

    // Calculate session totals
    $stats = $db->prepare("SELECT COUNT(*) as tx_count, COALESCE(SUM(total_amount),0) as total_sales,
                           SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END) as cash_total,
                           SUM(CASE WHEN payment_method='mobile_money' THEN total_amount ELSE 0 END) as mobile_total,
                           SUM(CASE WHEN payment_method='card' THEN total_amount ELSE 0 END) as card_total
                           FROM pos_transactions WHERE session_id = ?");
    $stats->execute([$sessionId]);
    $stats = $stats->fetch();

    $db->prepare("UPDATE pos_sessions SET status = 'closed', cash_end = ?, total_sales = ?, tx_count = ?, closed_at = datetime('now') WHERE id = ?")
       ->execute([$cashEnd, $stats['total_sales'], $stats['tx_count'], $sessionId]);

    jsonResponse([
        'message' => 'Session POS fermée',
        'summary' => $stats,
        'cash_difference' => $cashEnd - ($body['cash_start'] ?? 0) - (int)$stats['cash_total']
    ]);
}

function listPOSSessions() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $stmt = $db->prepare("SELECT ps.*, u.name as operator_name, e.name as event_name
                          FROM pos_sessions ps
                          LEFT JOIN users u ON ps.operator_id = u.id
                          LEFT JOIN events e ON ps.event_id = e.id
                          WHERE ps.operator_id = ? OR ? IN (SELECT id FROM users WHERE role IN ('admin','superadmin'))
                          ORDER BY ps.created_at DESC LIMIT 50");
    $stmt->execute([$user['id'], $user['id']]);
    jsonResponse(['sessions' => $stmt->fetchAll()]);
}

function getPOSSummary() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $eventId = $_GET['event_id'] ?? null;

    $where = '1=1';
    $params = [];
    if ($eventId) { $where = 'pt.event_id = ?'; $params[] = $eventId; }

    $stmt = $db->prepare("SELECT COUNT(*) as total_tx, COALESCE(SUM(total_amount),0) as total_revenue,
                          SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END) as cash,
                          SUM(CASE WHEN payment_method='mobile_money' THEN total_amount ELSE 0 END) as mobile,
                          SUM(CASE WHEN payment_method='card' THEN total_amount ELSE 0 END) as card
                          FROM pos_transactions pt WHERE $where");
    $stmt->execute($params);
    jsonResponse(['summary' => $stmt->fetch()]);
}

function getPOSConfig() {
    jsonResponse([
        'payment_methods' => [
            ['id' => 'cash', 'label' => 'Espèces', 'icon' => 'mdi-cash'],
            ['id' => 'mobile_money', 'label' => 'Mobile Money', 'icon' => 'mdi-cellphone'],
            ['id' => 'card', 'label' => 'Carte bancaire', 'icon' => 'mdi-credit-card'],
        ]
    ]);
}
