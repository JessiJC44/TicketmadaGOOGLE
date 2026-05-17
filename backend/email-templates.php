<?php
require_once __DIR__ . '/config.php';

function handleEmailTemplates($method, $id, $action) {
    switch (true) {
        case $method === 'GET' && $action === 'preview' && $id: previewEmailTemplate($id); break;
        case $method === 'GET' && !$id: listEmailTemplates(); break;
        case $method === 'GET' && $id: getEmailTemplate($id); break;
        case $method === 'PUT' && $id: updateEmailTemplate($id); break;
        case $method === 'POST' && $action === 'send-test': sendTestEmail(); break;
        default: jsonError('Route non trouvée', 404);
    }
}

function listEmailTemplates() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    // Check if user has custom templates, otherwise return defaults
    $stmt = $db->prepare('SELECT * FROM email_templates WHERE organizer_id = ? ORDER BY template_type');
    $stmt->execute([$user['id']]);
    $custom = $stmt->fetchAll();

    $defaults = getDefaultTemplates();

    // Merge: custom overrides defaults
    $customByType = [];
    foreach ($custom as $c) { $customByType[$c['template_type']] = $c; }

    $result = [];
    foreach ($defaults as $d) {
        $result[] = $customByType[$d['template_type']] ?? $d;
    }

    jsonResponse(['templates' => $result]);
}

function getEmailTemplate($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM email_templates WHERE id = ?');
    $stmt->execute([$id]);
    $template = $stmt->fetch();
    if (!$template) {
        // Return default by type
        $defaults = getDefaultTemplates();
        foreach ($defaults as $d) {
            if ($d['template_type'] === $id) { jsonResponse(['template' => $d]); return; }
        }
        jsonError('Template non trouvé', 404);
    }
    jsonResponse(['template' => $template]);
}

function updateEmailTemplate($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    // Check if custom template exists
    $existing = $db->prepare('SELECT id FROM email_templates WHERE id = ? AND organizer_id = ?');
    $existing->execute([$id, $user['id']]);

    if ($existing->fetch()) {
        $db->prepare("UPDATE email_templates SET subject = ?, body_html = ?, updated_at = datetime('now') WHERE id = ?")->execute([
            $body['subject'] ?? '',
            $body['body_html'] ?? '',
            $id
        ]);
    } else {
        // Create custom override
        $db->prepare("INSERT INTO email_templates (organizer_id, template_type, subject, body_html) VALUES (?, ?, ?, ?)")->execute([
            $user['id'],
            $body['template_type'] ?? $id,
            $body['subject'] ?? '',
            $body['body_html'] ?? ''
        ]);
    }

    jsonResponse(['message' => 'Template sauvegardé']);
}

function previewEmailTemplate($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $defaults = getDefaultTemplates();
    $template = null;
    foreach ($defaults as $d) {
        if ($d['template_type'] === $id) { $template = $d; break; }
    }
    if (!$template) jsonError('Template non trouvé', 404);

    // Replace placeholders with sample data
    $html = $template['body_html'];
    $replacements = [
        '{{buyer_name}}' => 'Jean Rakoto',
        '{{event_name}}' => 'Festival Donia 2026',
        '{{event_date}}' => '15 Mars 2026 à 19:00',
        '{{event_venue}}' => 'Stade Municipal, Nosy Be',
        '{{ticket_code}}' => 'TKT-00850',
        '{{ticket_type}}' => 'VIP',
        '{{ticket_price}}' => '200 000 Ar',
        '{{order_total}}' => '400 000 Ar',
        '{{org_name}}' => $user['name'],
        '{{qr_code_url}}' => 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKM:v2:TKT-00850:2:1717000000:demo',
    ];
    foreach ($replacements as $k => $v) { $html = str_replace($k, $v, $html); }

    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
}

function sendTestEmail() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    // In production, this would use mail() or an SMTP library
    jsonResponse(['message' => 'Email de test envoyé à ' . $user['email'] . ' (simulation)']);
}

function getDefaultTemplates() {
    $baseStyle = '
        <style>
            body{font-family:"DM Sans",Arial,sans-serif;background:#FAF7F2;margin:0;padding:20px;}
            .email-container{max-width:600px;margin:0 auto;background:white;border:3px solid #1a1a1a;box-shadow:6px 6px 0 #1a1a1a;}
            .email-header{background:#FF6B4A;padding:25px 30px;border-bottom:3px solid #1a1a1a;color:white;}
            .email-header h1{font-family:"Syne",sans-serif;font-weight:800;margin:0;font-size:1.5rem;}
            .email-body{padding:30px;}
            .email-footer{background:#1a1a1a;color:white;padding:15px 30px;font-size:0.8rem;text-align:center;}
            .btn{display:inline-block;background:#FF6B4A;color:white;padding:12px 30px;text-decoration:none;border:2px solid #1a1a1a;font-weight:700;margin:15px 0;}
        </style>
    ';

    return [
        [
            'template_type' => 'order_confirmation',
            'subject' => '🎫 Confirmation de commande — {{event_name}}',
            'body_html' => $baseStyle . '<div class="email-container"><div class="email-header"><h1>🎫 Commande confirmée !</h1></div><div class="email-body"><p>Bonjour <strong>{{buyer_name}}</strong>,</p><p>Votre commande pour <strong>{{event_name}}</strong> a été confirmée.</p><p><strong>Détails :</strong></p><ul><li>Événement : {{event_name}}</li><li>Date : {{event_date}}</li><li>Lieu : {{event_venue}}</li><li>Billet : {{ticket_type}} — {{ticket_price}}</li><li>Code : {{ticket_code}}</li></ul><p>Présentez le QR code ci-dessous à l\'entrée :</p><img src="{{qr_code_url}}" width="200"><a href="#" class="btn">Voir mes billets</a></div><div class="email-footer">TicketMada — La billetterie de Madagascar</div></div>',
        ],
        [
            'template_type' => 'ticket_transfer',
            'subject' => '🔄 Billet transféré — {{event_name}}',
            'body_html' => $baseStyle . '<div class="email-container"><div class="email-header"><h1>🔄 Billet transféré</h1></div><div class="email-body"><p>Bonjour <strong>{{buyer_name}}</strong>,</p><p>Un billet pour <strong>{{event_name}}</strong> vous a été transféré.</p><p>Nouveau code : <strong>{{ticket_code}}</strong></p><a href="#" class="btn">Voir mon billet</a></div><div class="email-footer">TicketMada</div></div>',
        ],
        [
            'template_type' => 'refund_approved',
            'subject' => '💸 Remboursement approuvé — {{event_name}}',
            'body_html' => $baseStyle . '<div class="email-container"><div class="email-header"><h1>💸 Remboursement approuvé</h1></div><div class="email-body"><p>Bonjour <strong>{{buyer_name}}</strong>,</p><p>Votre demande de remboursement pour <strong>{{event_name}}</strong> a été approuvée.</p><p>Montant : <strong>{{ticket_price}}</strong></p></div><div class="email-footer">TicketMada</div></div>',
        ],
        [
            'template_type' => 'event_reminder',
            'subject' => '⏰ Rappel — {{event_name}} c\'est bientôt !',
            'body_html' => $baseStyle . '<div class="email-container"><div class="email-header"><h1>⏰ C\'est bientôt !</h1></div><div class="email-body"><p>Bonjour <strong>{{buyer_name}}</strong>,</p><p><strong>{{event_name}}</strong> a lieu demain !</p><p>📅 {{event_date}}<br>📍 {{event_venue}}</p><p>N\'oubliez pas votre billet :</p><img src="{{qr_code_url}}" width="200"></div><div class="email-footer">TicketMada</div></div>',
        ],
        [
            'template_type' => 'waitlist_notification',
            'subject' => '🎉 Place disponible — {{event_name}}',
            'body_html' => $baseStyle . '<div class="email-container"><div class="email-header"><h1>🎉 Une place s\'est libérée !</h1></div><div class="email-body"><p>Bonjour <strong>{{buyer_name}}</strong>,</p><p>Une place s\'est libérée pour <strong>{{event_name}}</strong>. Dépêchez-vous de réserver !</p><a href="#" class="btn">Réserver maintenant</a><p style="font-size:0.85rem;color:#666;">Cette offre est valable 24 heures.</p></div><div class="email-footer">TicketMada</div></div>',
        ],
    ];
}
