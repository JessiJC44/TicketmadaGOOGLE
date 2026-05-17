<?php
require_once __DIR__ . '/config.php';

function handleSettings($method, $id, $action) {
    switch (true) {
        case $method === 'GET': getSettings(); break;
        case $method === 'PUT': updateSettings(); break;
        default: jsonError('Méthode non autorisée', 405);
    }
}

function getSettings() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM org_settings WHERE organizer_id = ?');
    $stmt->execute([$user['id']]);
    $settings = $stmt->fetch();

    if (!$settings) {
        // Return defaults
        $settings = [
            'organizer_id' => $user['id'],
            'org_name' => $user['name'],
            'org_email' => $user['email'],
            'org_phone' => $user['phone'] ?? '',
            'org_address' => '',
            'org_logo_url' => '',
            'org_website' => '',
            'org_description' => '',
            'currency' => 'MGA',
            'timezone' => 'Indian/Antananarivo',
            'language' => 'fr',
            'ticket_prefix' => 'TKT',
            'commission_rate' => COMMISSION_RATE * 100,
            'auto_approve_refunds' => 0,
            'max_tickets_per_order' => 10,
            'enable_resale' => 1,
            'enable_transfer' => 1,
            'enable_waitlist' => 1,
            'email_notifications' => 1,
            'webhook_url' => '',
            'webhook_secret' => '',
            'custom_css' => '',
            'google_analytics_id' => '',
        ];
    }

    jsonResponse(['settings' => $settings]);
}

function updateSettings() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    // Check if settings row exists
    $existing = $db->prepare('SELECT id FROM org_settings WHERE organizer_id = ?');
    $existing->execute([$user['id']]);

    $allowed = [
        'org_name', 'org_email', 'org_phone', 'org_address', 'org_logo_url',
        'org_website', 'org_description', 'currency', 'timezone', 'language',
        'ticket_prefix', 'auto_approve_refunds', 'max_tickets_per_order',
        'enable_resale', 'enable_transfer', 'enable_waitlist',
        'email_notifications', 'webhook_url', 'webhook_secret',
        'custom_css', 'google_analytics_id'
    ];

    if ($existing->fetch()) {
        // Update
        $updates = [];
        $params = [];
        foreach ($allowed as $field) {
            if (isset($body[$field])) {
                $updates[] = "$field = ?";
                $params[] = $body[$field];
            }
        }
        if (empty($updates)) jsonError('Rien à mettre à jour');
        $updates[] = "updated_at = datetime('now')";
        $params[] = $user['id'];
        $db->prepare('UPDATE org_settings SET ' . implode(', ', $updates) . ' WHERE organizer_id = ?')->execute($params);
    } else {
        // Insert
        $fields = ['organizer_id'];
        $placeholders = ['?'];
        $values = [$user['id']];
        foreach ($allowed as $field) {
            if (isset($body[$field])) {
                $fields[] = $field;
                $placeholders[] = '?';
                $values[] = $body[$field];
            }
        }
        $db->prepare('INSERT INTO org_settings (' . implode(',', $fields) . ') VALUES (' . implode(',', $placeholders) . ')')->execute($values);
    }

    jsonResponse(['message' => 'Paramètres sauvegardés']);
}
