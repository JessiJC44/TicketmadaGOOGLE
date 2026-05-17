<?php
require_once __DIR__ . '/config.php';

function handleResale($method, $id, $action) {
    switch (true) {
        case $method === 'POST' && $action === 'transfer': transferTicket(); break;
        case $method === 'POST' && $action === 'list-for-sale': listTicketForSale(); break;
        case $method === 'POST' && $action === 'buy': buyResaleTicket(); break;
        case $method === 'GET' && $action === 'marketplace': getResaleMarketplace(); break;
        case $method === 'GET' && !$id: listResaleListings(); break;
        case $method === 'PUT' && $id && $action === 'cancel': cancelResaleListing($id); break;
        default: jsonError('Route non trouvée', 404);
    }
}

function transferTicket() {
    $user = requireAuth();
    $body = getBody();
    $db = getDB();

    $ticketId = $body['ticket_id'] ?? null;
    $recipientEmail = $body['recipient_email'] ?? null;

    if (!$ticketId || !$recipientEmail) jsonError('ticket_id et recipient_email requis');

    // Verify ownership
    $ticket = $db->prepare("SELECT * FROM tickets WHERE id = ? AND buyer_id = ? AND status = 'active'");
    $ticket->execute([$ticketId, $user['id']]);
    $ticket = $ticket->fetch();
    if (!$ticket) jsonError('Billet non trouvé ou non transférable');

    // Find recipient
    $recipient = $db->prepare('SELECT * FROM users WHERE email = ?');
    $recipient->execute([$recipientEmail]);
    $recipient = $recipient->fetch();
    if (!$recipient) jsonError('Destinataire non trouvé — l\'utilisateur doit avoir un compte TicketMada');

    if ($recipient['id'] == $user['id']) jsonError('Vous ne pouvez pas transférer un billet à vous-même');

    $db->beginTransaction();
    try {
        // Generate new QR payload for security
        $newCode = generateTicketCode();
        $check = $db->prepare('SELECT id FROM tickets WHERE id_code = ?');
        while ($check->execute([$newCode]) && $check->fetch()) { $newCode = generateTicketCode(); }

        // Update ticket
        $db->prepare("UPDATE tickets SET buyer_id = ?, id_code = ?, qr_payload = NULL, qr_generated_at = NULL WHERE id = ?")
           ->execute([$recipient['id'], $newCode, $ticketId]);

        // Log transfer
        $db->prepare("INSERT INTO ticket_transfers (ticket_id, from_user_id, to_user_id, old_code, new_code, transfer_type) VALUES (?, ?, ?, ?, ?, 'transfer')")
           ->execute([$ticketId, $user['id'], $recipient['id'], $ticket['id_code'], $newCode]);

        $db->prepare("INSERT INTO activity_log (type, icon, text, user_id) VALUES ('transfer', 'mdi-swap-horizontal', ?, ?)")
           ->execute(['<strong>Transfert</strong> ' . $ticket['id_code'] . ' → ' . $recipient['name'], $user['id']]);

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Erreur transfert: ' . $e->getMessage(), 500);
    }

    jsonResponse([
        'message' => 'Billet transféré avec succès',
        'new_code' => $newCode,
        'recipient' => $recipient['name']
    ]);
}

function listTicketForSale() {
    $user = requireAuth();
    $body = getBody();
    $db = getDB();

    $ticketId = $body['ticket_id'] ?? null;
    $askingPrice = (int)($body['asking_price'] ?? 0);

    if (!$ticketId || !$askingPrice) jsonError('ticket_id et asking_price requis');

    // Verify ownership
    $ticket = $db->prepare("SELECT t.*, e.name as event_name FROM tickets t LEFT JOIN events e ON t.event_id = e.id WHERE t.id = ? AND t.buyer_id = ? AND t.status = 'active'");
    $ticket->execute([$ticketId, $user['id']]);
    $ticket = $ticket->fetch();
    if (!$ticket) jsonError('Billet non trouvé ou non vendable');

    // Price cap: max 150% of original price (prevent scalping)
    $maxPrice = (int)($ticket['price'] * 1.5);
    if ($askingPrice > $maxPrice) {
        jsonError('Prix maximum autorisé: ' . number_format($maxPrice) . ' Ar (150% du prix original)');
    }

    $db->prepare("INSERT INTO resale_listings (ticket_id, seller_id, event_id, original_price, asking_price, status) VALUES (?, ?, ?, ?, ?, 'active')")
       ->execute([$ticketId, $user['id'], $ticket['event_id'], $ticket['price'], $askingPrice]);

    jsonResponse(['id' => $db->lastInsertId(), 'message' => 'Billet mis en vente'], 201);
}

function buyResaleTicket() {
    $user = requireAuth();
    $body = getBody();
    $db = getDB();

    $listingId = $body['listing_id'] ?? null;
    if (!$listingId) jsonError('listing_id requis');

    $listing = $db->prepare("SELECT rl.*, t.event_id, t.type, e.name as event_name FROM resale_listings rl
                             LEFT JOIN tickets t ON rl.ticket_id = t.id
                             LEFT JOIN events e ON t.event_id = e.id
                             WHERE rl.id = ? AND rl.status = 'active'");
    $listing->execute([$listingId]);
    $listing = $listing->fetch();
    if (!$listing) jsonError('Annonce non trouvée ou déjà vendue');

    if ($listing['seller_id'] == $user['id']) jsonError('Vous ne pouvez pas acheter votre propre billet');

    $db->beginTransaction();
    try {
        // Generate new code
        $newCode = generateTicketCode();
        $check = $db->prepare('SELECT id FROM tickets WHERE id_code = ?');
        while ($check->execute([$newCode]) && $check->fetch()) { $newCode = generateTicketCode(); }

        // Transfer ticket to buyer
        $db->prepare("UPDATE tickets SET buyer_id = ?, id_code = ?, qr_payload = NULL WHERE id = ?")
           ->execute([$user['id'], $newCode, $listing['ticket_id']]);

        // Close listing
        $db->prepare("UPDATE resale_listings SET status = 'sold', buyer_id = ?, sold_at = datetime('now') WHERE id = ?")
           ->execute([$user['id'], $listingId]);

        // Log transfer
        $db->prepare("INSERT INTO ticket_transfers (ticket_id, from_user_id, to_user_id, old_code, new_code, transfer_type, sale_price) VALUES (?, ?, ?, NULL, ?, 'resale', ?)")
           ->execute([$listing['ticket_id'], $listing['seller_id'], $user['id'], $newCode, $listing['asking_price']]);

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Erreur achat: ' . $e->getMessage(), 500);
    }

    jsonResponse([
        'message' => 'Billet acheté avec succès',
        'ticket_code' => $newCode,
        'price_paid' => $listing['asking_price']
    ]);
}

function getResaleMarketplace() {
    $db = getDB();
    $eventId = $_GET['event_id'] ?? null;

    $where = "rl.status = 'active'";
    $params = [];
    if ($eventId) { $where .= ' AND rl.event_id = ?'; $params[] = $eventId; }

    $stmt = $db->prepare("SELECT rl.*, t.type as ticket_type, e.name as event_name, e.date_start, u.name as seller_name
                          FROM resale_listings rl
                          LEFT JOIN tickets t ON rl.ticket_id = t.id
                          LEFT JOIN events e ON rl.event_id = e.id
                          LEFT JOIN users u ON rl.seller_id = u.id
                          WHERE $where ORDER BY rl.asking_price ASC LIMIT 50");
    $stmt->execute($params);
    jsonResponse(['listings' => $stmt->fetchAll()]);
}

function listResaleListings() {
    $user = requireAuth();
    $db = getDB();
    $stmt = $db->prepare("SELECT rl.*, e.name as event_name FROM resale_listings rl LEFT JOIN events e ON rl.event_id = e.id WHERE rl.seller_id = ? ORDER BY rl.created_at DESC");
    $stmt->execute([$user['id']]);
    jsonResponse(['my_listings' => $stmt->fetchAll()]);
}

function cancelResaleListing($id) {
    $user = requireAuth();
    $db = getDB();
    $db->prepare("UPDATE resale_listings SET status = 'cancelled' WHERE id = ? AND seller_id = ?")->execute([$id, $user['id']]);
    jsonResponse(['message' => 'Annonce annulée']);
}
