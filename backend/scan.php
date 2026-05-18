<?php
require_once __DIR__ . '/config.php';

function handleScan($method, $id, $action) {
    if ($action === 'validate-link') {
        validateScanLink();
        return;
    }
    
    // Normal scan requires specific roles
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN, 'guichetier']);
    if ($action === 'validate') {
        validateTicketScan();
        return;
    }

    jsonError('Action scan non reconnue');
}

function validateScanLink() {
    $body = getBody();
    $token = $body['token'] ?? null;
    $code = $body['code'] ?? null;
    
    if (!$token || !$code) jsonError('Token and code required');
    
    $db = getDB();
    // Validate scan link token
    $stmt = $db->prepare("SELECT * FROM scan_links WHERE token = ?");
    $stmt->execute([$token]);
    $link = $stmt->fetch();
    if (!$link) jsonError('Lien de scan invalide', 403);
    
    // Validate ticket
    doTicketScan($code, $link['event_id']);
}

function validateTicketScan() {
    $body = getBody();
    $code = $body['code'] ?? null;
    $eventId = $body['event_id'] ?? null;
    
    if (!$code) jsonError('Code requis');
    
    doTicketScan($code, $eventId);
}

function doTicketScan($code, $eventId = null) {
    $db = getDB();
    
    // Find ticket
    $stmt = $db->prepare("SELECT t.*, e.name as event_name FROM tickets t JOIN events e ON t.event_id = e.id WHERE t.id_code = ?");
    $stmt->execute([$code]);
    $ticket = $stmt->fetch();
    
    if (!$ticket) jsonError('Billet introuvable', 404);
    
    // Check event match if provided
    if ($eventId && $ticket['event_id'] != $eventId) {
        jsonError('Billet pour un autre événement : ' . $ticket['event_name'], 400);
    }
    
    if ($ticket['qr_blocked']) jsonError('Billet BLOQUÉ (Usage frauduleux)', 403);
    if ($ticket['status'] === 'scanned') jsonError('Billet déjà SCANNÉ à ' . $ticket['scanned_at'], 409);
    if ($ticket['status'] !== 'active') jsonError('Billet non valide (Statut: ' . $ticket['status'] . ')', 400);
    
    // Check HMAC if scanner sent payload
    $body = getBody();
    if (!empty($body['payload'])) {
        $valid = validateQRPayload($body['payload']);
        if (!$valid || $valid['code'] !== $code) {
            // Log fraud attempt
            jsonError('QR Code falsifié ! Code de sécurité incorrect.', 403);
        }
    }

    // Mark as scanned
    $db->prepare("UPDATE tickets SET status = 'scanned', scanned_at = datetime('now') WHERE id = ?")->execute([$ticket['id']]);
    
    jsonResponse([
        'success' => true,
        'message' => 'VALIDÉ',
        'ticket' => [
            'id' => $ticket['id_code'],
            'name' => $ticket['type'],
            'event' => $ticket['event_name']
        ]
    ]);
}
