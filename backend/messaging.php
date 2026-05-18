<?php
/**
 * TicketMada — Messaging, Support Tickets & Notifications System
 * Handles: Direct messages, Support tickets, Notifications
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/config.php';

// ═══════════════════════════════════════════════════════════
// MESSAGING (Direct Messages between SuperAdmin & Organizer)
// ═══════════════════════════════════════════════════════════

function handleMessaging($method, $id = null, $action = null) {
    switch ($method) {
        case 'GET':
            if ($id && $action === 'read') {
                markAsRead($id);
            } elseif ($id) {
                getConversation($id);
            } else {
                listConversations();
            }
            break;
        case 'POST':
            sendMessage();
            break;
        case 'PUT':
            if ($id && $action === 'read') {
                markAsRead($id);
            }
            break;
        default:
            jsonError('Method not allowed', 405);
    }
}

function listConversations() {
    $user = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("
        SELECT c.*,
            u1.name as participant_1_name, u1.email as participant_1_email, u1.role as participant_1_role,
            u2.name as participant_2_name, u2.email as participant_2_email, u2.role as participant_2_role,
            (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != :uid AND read_at IS NULL) as unread_count
        FROM conversations c
        LEFT JOIN users u1 ON c.participant_1 = u1.id
        LEFT JOIN users u2 ON c.participant_2 = u2.id
        WHERE c.participant_1 = :uid1 OR c.participant_2 = :uid2
        ORDER BY c.last_message_at DESC
    ");
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':uid1', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':uid2', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();

    $conversations = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        // Determine the other participant
        if ($row['participant_1'] == $user['id']) {
            $row['other_participant'] = [
                'id' => $row['participant_2'],
                'name' => $row['participant_2_name'],
                'email' => $row['participant_2_email'],
                'role' => $row['participant_2_role']
            ];
        } else {
            $row['other_participant'] = [
                'id' => $row['participant_1'],
                'name' => $row['participant_1_name'],
                'email' => $row['participant_1_email'],
                'role' => $row['participant_1_role']
            ];
        }
        $conversations[] = $row;
    }

    jsonResponse(['conversations' => $conversations]);
}

function getConversation($id) {
    $user = requireAuth();
    $db = getDB();

    // Verify user is a participant
    $stmt = $db->prepare("SELECT * FROM conversations WHERE id = :id AND (participant_1 = :uid1 OR participant_2 = :uid2)");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid1', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':uid2', $user['id'], SQLITE3_INTEGER);
    $conversation = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$conversation) {
        jsonError('Conversation non trouvée', 404);
    }

    // Get messages
    $stmt = $db->prepare("
        SELECT m.*, u.name as sender_name, u.email as sender_email, u.role as sender_role
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = :cid
        ORDER BY m.created_at ASC
    ");
    $stmt->bindValue(':cid', $id, SQLITE3_INTEGER);
    $result = $stmt->execute();

    $messages = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $messages[] = $row;
    }

    // Mark messages from the other party as read
    $stmt = $db->prepare("
        UPDATE messages SET read_at = datetime('now')
        WHERE conversation_id = :cid AND sender_id != :uid AND read_at IS NULL
    ");
    $stmt->bindValue(':cid', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();

    jsonResponse([
        'conversation' => $conversation,
        'messages' => $messages
    ]);
}

function sendMessage() {
    $user = requireAuth();
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    $recipientId = $data['recipient_id'] ?? null;
    $content = trim($data['content'] ?? '');
    $conversationId = $data['conversation_id'] ?? null;
    $subject = trim($data['subject'] ?? '');

    if (empty($content)) {
        jsonError('Le contenu du message est requis');
    }

    // If no conversation_id, find or create one
    if (!$conversationId && $recipientId) {
        // Check if conversation exists between these two users
        $stmt = $db->prepare("
            SELECT id FROM conversations
            WHERE (participant_1 = :uid AND participant_2 = :rid)
               OR (participant_1 = :rid2 AND participant_2 = :uid2)
            LIMIT 1
        ");
        $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
        $stmt->bindValue(':rid', $recipientId, SQLITE3_INTEGER);
        $stmt->bindValue(':uid2', $user['id'], SQLITE3_INTEGER);
        $stmt->bindValue(':rid2', $recipientId, SQLITE3_INTEGER);
        $row = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

        if ($row) {
            $conversationId = $row['id'];
        } else {
            // Create new conversation
            $stmt = $db->prepare("
                INSERT INTO conversations (participant_1, participant_2, subject, last_message_at, created_at)
                VALUES (:p1, :p2, :subject, datetime('now'), datetime('now'))
            ");
            $stmt->bindValue(':p1', $user['id'], SQLITE3_INTEGER);
            $stmt->bindValue(':p2', $recipientId, SQLITE3_INTEGER);
            $stmt->bindValue(':subject', $subject ?: 'Nouveau message', SQLITE3_TEXT);
            $stmt->execute();
            $conversationId = $db->lastInsertRowID();
        }
    }

    if (!$conversationId) {
        jsonError('conversation_id ou recipient_id requis');
    }

    // Verify user is participant
    $stmt = $db->prepare("SELECT * FROM conversations WHERE id = :id AND (participant_1 = :uid1 OR participant_2 = :uid2)");
    $stmt->bindValue(':id', $conversationId, SQLITE3_INTEGER);
    $stmt->bindValue(':uid1', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':uid2', $user['id'], SQLITE3_INTEGER);
    $conv = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$conv) {
        jsonError('Conversation non trouvée', 404);
    }

    // Insert message
    $stmt = $db->prepare("
        INSERT INTO messages (conversation_id, sender_id, content, created_at)
        VALUES (:cid, :sid, :content, datetime('now'))
    ");
    $stmt->bindValue(':cid', $conversationId, SQLITE3_INTEGER);
    $stmt->bindValue(':sid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':content', $content, SQLITE3_TEXT);
    $stmt->execute();
    $messageId = $db->lastInsertRowID();

    // Update conversation last_message_at
    $stmt = $db->prepare("UPDATE conversations SET last_message_at = datetime('now') WHERE id = :id");
    $stmt->bindValue(':id', $conversationId, SQLITE3_INTEGER);
    $stmt->execute();

    // Create notification for the other participant
    $otherParticipantId = ($conv['participant_1'] == $user['id']) ? $conv['participant_2'] : $conv['participant_1'];
    createNotification($otherParticipantId, 'new_message', 'Nouveau message', 'Message de ' . ($user['name'] ?? $user['email']), '/messages/' . $conversationId);

    jsonResponse([
        'message_id' => $messageId,
        'conversation_id' => $conversationId
    ], 201);
}

function markAsRead($conversationId) {
    $user = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("
        UPDATE messages SET read_at = datetime('now')
        WHERE conversation_id = :cid AND sender_id != :uid AND read_at IS NULL
    ");
    $stmt->bindValue(':cid', $conversationId, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();

    jsonResponse(['success' => true]);
}


// ═══════════════════════════════════════════════════════════
// SUPPORT TICKETS
// ═══════════════════════════════════════════════════════════

function handleSupportTickets($method, $id = null, $action = null) {
    switch ($method) {
        case 'GET':
            if ($action === 'stats') {
                getTicketStats();
            } elseif ($id) {
                getTicket($id);
            } else {
                listTickets();
            }
            break;
        case 'POST':
            if ($id && $action === 'reply') {
                replyToTicket($id);
            } else {
                createTicket();
            }
            break;
        case 'PUT':
            if ($id && $action === 'status') {
                updateTicketStatus($id);
            }
            break;
        default:
            jsonError('Method not allowed', 405);
    }
}

function listTickets() {
    $user = requireAuth();
    $db = getDB();

    $isAdmin = in_array($user['role'], [ROLE_ADMIN, ROLE_SUPERADMIN]);

    if ($isAdmin) {
        // Admin sees all tickets
        $query = "
            SELECT st.*, u.name as organizer_name, u.email as organizer_email,
                   au.name as assigned_admin_name,
                   (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = st.id) as message_count,
                   (SELECT content FROM support_ticket_messages WHERE ticket_id = st.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM support_tickets st
            LEFT JOIN users u ON st.organizer_id = u.id
            LEFT JOIN users au ON st.assigned_admin_id = au.id
        ";

        // Apply filters from query params
        $where = [];
        $params = [];

        if (!empty($_GET['status'])) {
            $where[] = "st.status = :status";
            $params[':status'] = $_GET['status'];
        }
        if (!empty($_GET['category'])) {
            $where[] = "st.category = :category";
            $params[':category'] = $_GET['category'];
        }
        if (!empty($_GET['priority'])) {
            $where[] = "st.priority = :priority";
            $params[':priority'] = $_GET['priority'];
        }

        if ($where) {
            $query .= " WHERE " . implode(' AND ', $where);
        }
        $query .= " ORDER BY 
            CASE st.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END,
            st.created_at DESC";

        $stmt = $db->prepare($query);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, SQLITE3_TEXT);
        }
    } else {
        // Organizer sees only their own tickets
        $stmt = $db->prepare("
            SELECT st.*,
                   au.name as assigned_admin_name,
                   (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = st.id) as message_count,
                   (SELECT content FROM support_ticket_messages WHERE ticket_id = st.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM support_tickets st
            LEFT JOIN users au ON st.assigned_admin_id = au.id
            WHERE st.organizer_id = :uid
            ORDER BY st.created_at DESC
        ");
        $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    }

    $result = $stmt->execute();
    $tickets = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $tickets[] = $row;
    }

    jsonResponse(['tickets' => $tickets]);
}

function createTicket() {
    $user = requireAuth();
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    $subject = trim($data['subject'] ?? '');
    $category = $data['category'] ?? 'general';
    $priority = $data['priority'] ?? 'normal';
    $content = trim($data['content'] ?? '');
    $attachmentData = $data['attachment_data'] ?? null; // JSON string for seatmap etc.

    $validCategories = ['seatmap_help', 'payment_issue', 'technical', 'account', 'general', 'validation_request', 'event_review', 'license_upgrade'];
    $validPriorities = ['low', 'normal', 'high', 'urgent'];

    if (empty($subject)) {
        jsonError('Le sujet est requis');
    }
    if (empty($content)) {
        jsonError('Le contenu est requis');
    }
    if (!in_array($category, $validCategories)) {
        jsonError('Catégorie invalide');
    }
    if (!in_array($priority, $validPriorities)) {
        jsonError('Priorité invalide');
    }

    // Create ticket
    $stmt = $db->prepare("
        INSERT INTO support_tickets (organizer_id, subject, category, priority, status, created_at, updated_at)
        VALUES (:oid, :subject, :category, :priority, 'open', datetime('now'), datetime('now'))
    ");
    $stmt->bindValue(':oid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':subject', $subject, SQLITE3_TEXT);
    $stmt->bindValue(':category', $category, SQLITE3_TEXT);
    $stmt->bindValue(':priority', $priority, SQLITE3_TEXT);
    $stmt->execute();
    $ticketId = $db->lastInsertRowID();

    // Add initial message
    $stmt = $db->prepare("
        INSERT INTO support_ticket_messages (ticket_id, sender_id, content, attachment_url, created_at)
        VALUES (:tid, :sid, :content, :attachment, datetime('now'))
    ");
    $stmt->bindValue(':tid', $ticketId, SQLITE3_INTEGER);
    $stmt->bindValue(':sid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':content', $content, SQLITE3_TEXT);
    $stmt->bindValue(':attachment', $attachmentData, SQLITE3_TEXT);
    $stmt->execute();

    // Notify all admins
    $admins = $db->query("SELECT id FROM users WHERE role IN ('admin', 'superadmin')");
    while ($admin = $admins->fetchArray(SQLITE3_ASSOC)) {
        createNotification(
            $admin['id'],
            'new_ticket',
            'Nouveau ticket de support',
            '[' . $category . '] ' . $subject . ' — de ' . ($user['name'] ?? $user['email']),
            '/support-tickets/' . $ticketId
        );
    }

    jsonResponse(['ticket_id' => $ticketId], 201);
}

function getTicket($id) {
    $user = requireAuth();
    $db = getDB();
    $isAdmin = in_array($user['role'], [ROLE_ADMIN, ROLE_SUPERADMIN]);

    // Get ticket
    $stmt = $db->prepare("
        SELECT st.*, u.name as organizer_name, u.email as organizer_email, u.organizer_license,
               au.name as assigned_admin_name
        FROM support_tickets st
        LEFT JOIN users u ON st.organizer_id = u.id
        LEFT JOIN users au ON st.assigned_admin_id = au.id
        WHERE st.id = :id
    ");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $ticket = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$ticket) {
        jsonError('Ticket non trouvé', 404);
    }

    // Check access
    if (!$isAdmin && $ticket['organizer_id'] != $user['id']) {
        jsonError('Accès refusé', 403);
    }

    // Get messages
    $stmt = $db->prepare("
        SELECT stm.*, u.name as sender_name, u.email as sender_email, u.role as sender_role
        FROM support_ticket_messages stm
        LEFT JOIN users u ON stm.sender_id = u.id
        WHERE stm.ticket_id = :tid
        ORDER BY stm.created_at ASC
    ");
    $stmt->bindValue(':tid', $id, SQLITE3_INTEGER);
    $result = $stmt->execute();

    $messages = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $messages[] = $row;
    }

    jsonResponse([
        'ticket' => $ticket,
        'messages' => $messages
    ]);
}

function replyToTicket($id) {
    $user = requireAuth();
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    $content = trim($data['content'] ?? '');
    $attachmentData = $data['attachment_data'] ?? null;

    if (empty($content)) {
        jsonError('Le contenu est requis');
    }

    // Get ticket
    $stmt = $db->prepare("SELECT * FROM support_tickets WHERE id = :id");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $ticket = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$ticket) {
        jsonError('Ticket non trouvé', 404);
    }

    $isAdmin = in_array($user['role'], [ROLE_ADMIN, ROLE_SUPERADMIN]);

    // Check access
    if (!$isAdmin && $ticket['organizer_id'] != $user['id']) {
        jsonError('Accès refusé', 403);
    }

    // Insert reply
    $stmt = $db->prepare("
        INSERT INTO support_ticket_messages (ticket_id, sender_id, content, attachment_url, created_at)
        VALUES (:tid, :sid, :content, :attachment, datetime('now'))
    ");
    $stmt->bindValue(':tid', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':sid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':content', $content, SQLITE3_TEXT);
    $stmt->bindValue(':attachment', $attachmentData, SQLITE3_TEXT);
    $stmt->execute();
    $messageId = $db->lastInsertRowID();

    // Update ticket updated_at and set status to in-progress if admin replies to open ticket
    $newStatus = $ticket['status'];
    if ($isAdmin && $ticket['status'] === 'open') {
        $newStatus = 'in_progress';
    }

    $stmt = $db->prepare("UPDATE support_tickets SET updated_at = datetime('now'), status = :status WHERE id = :id");
    $stmt->bindValue(':status', $newStatus, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    // Notify the other party
    if ($isAdmin) {
        // Notify organizer
        createNotification(
            $ticket['organizer_id'],
            'ticket_reply',
            'Réponse à votre ticket',
            'Réponse sur : ' . $ticket['subject'],
            '/support-tickets/' . $id
        );
    } else {
        // Notify assigned admin or all admins
        if ($ticket['assigned_admin_id']) {
            createNotification(
                $ticket['assigned_admin_id'],
                'ticket_reply',
                'Nouvelle réponse sur un ticket',
                '[' . $ticket['category'] . '] ' . $ticket['subject'],
                '/support-tickets/' . $id
            );
        } else {
            $admins = $db->query("SELECT id FROM users WHERE role IN ('admin', 'superadmin')");
            while ($admin = $admins->fetchArray(SQLITE3_ASSOC)) {
                createNotification(
                    $admin['id'],
                    'ticket_reply',
                    'Nouvelle réponse sur un ticket',
                    '[' . $ticket['category'] . '] ' . $ticket['subject'],
                    '/support-tickets/' . $id
                );
            }
        }
    }

    jsonResponse(['message_id' => $messageId, 'new_status' => $newStatus], 201);
}

function updateTicketStatus($id) {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    $status = $data['status'] ?? null;
    $assignedAdminId = $data['assigned_admin_id'] ?? null;
    $priority = $data['priority'] ?? null;

    $validStatuses = ['open', 'in_progress', 'resolved', 'closed'];

    // Get ticket
    $stmt = $db->prepare("SELECT * FROM support_tickets WHERE id = :id");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $ticket = $stmt->execute()->fetchArray(SQLITE3_ASSOC);

    if (!$ticket) {
        jsonError('Ticket non trouvé', 404);
    }

    // Update fields
    $updates = [];
    $params = [];

    if ($status && in_array($status, $validStatuses)) {
        $updates[] = "status = :status";
        $params[':status'] = $status;
        if ($status === 'closed' || $status === 'resolved') {
            $updates[] = "closed_at = datetime('now')";
        }
    }

    if ($assignedAdminId !== null) {
        $updates[] = "assigned_admin_id = :admin_id";
        $params[':admin_id'] = $assignedAdminId;
    }

    if ($priority) {
        $validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (in_array($priority, $validPriorities)) {
            $updates[] = "priority = :priority";
            $params[':priority'] = $priority;
        }
    }

    $updates[] = "updated_at = datetime('now')";

    $query = "UPDATE support_tickets SET " . implode(', ', $updates) . " WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, is_int($val) ? $val : $val, is_int($val) ? SQLITE3_INTEGER : SQLITE3_TEXT);
    }
    $stmt->execute();

    // Notify organizer of status change
    $statusLabels = [
        'open' => 'Ouvert',
        'in_progress' => 'En cours',
        'resolved' => 'Résolu',
        'closed' => 'Fermé'
    ];
    createNotification(
        $ticket['organizer_id'],
        'ticket_status',
        'Ticket mis à jour',
        'Votre ticket "' . $ticket['subject'] . '" est maintenant : ' . ($statusLabels[$status] ?? $status),
        '/support-tickets/' . $id
    );

    jsonResponse(['success' => true]);
}

function getTicketStats() {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();

    $stats = [];

    // Count by status
    $result = $db->query("SELECT status, COUNT(*) as count FROM support_tickets GROUP BY status");
    $byStatus = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $byStatus[$row['status']] = $row['count'];
    }
    $stats['by_status'] = $byStatus;

    // Count by category
    $result = $db->query("SELECT category, COUNT(*) as count FROM support_tickets GROUP BY category");
    $byCategory = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $byCategory[$row['category']] = $row['count'];
    }
    $stats['by_category'] = $byCategory;

    // Count by priority
    $result = $db->query("SELECT priority, COUNT(*) as count FROM support_tickets GROUP BY priority");
    $byPriority = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $byPriority[$row['priority']] = $row['count'];
    }
    $stats['by_priority'] = $byPriority;

    // Tickets this week
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM support_tickets WHERE created_at >= datetime('now', '-7 days')");
    $stats['this_week'] = $stmt->execute()->fetchArray(SQLITE3_ASSOC)['count'];

    // Total open
    $stats['total_open'] = ($byStatus['open'] ?? 0) + ($byStatus['in_progress'] ?? 0);

    // Average response time (time between ticket creation and first admin reply)
    $avgResp = $db->query("
        SELECT AVG(
            (julianday(stm.created_at) - julianday(st.created_at)) * 24 * 60
        ) as avg_minutes
        FROM support_tickets st
        INNER JOIN support_ticket_messages stm ON st.id = stm.ticket_id
        INNER JOIN users u ON stm.sender_id = u.id
        WHERE u.role IN ('admin', 'superadmin')
        AND stm.id = (
            SELECT MIN(stm2.id) FROM support_ticket_messages stm2
            INNER JOIN users u2 ON stm2.sender_id = u2.id
            WHERE stm2.ticket_id = st.id AND u2.role IN ('admin', 'superadmin')
        )
    ")->fetchArray(SQLITE3_ASSOC);
    $stats['avg_response_minutes'] = round($avgResp['avg_minutes'] ?? 0, 1);

    jsonResponse(['stats' => $stats]);
}


// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

function handleNotifications($method, $id = null, $action = null) {
    switch ($method) {
        case 'GET':
            if ($action === 'unread-count') {
                getUnreadCount();
            } else {
                listNotifications();
            }
            break;
        case 'PUT':
            if ($action === 'read-all') {
                markAllNotificationsRead();
            } elseif ($id && $action === 'read') {
                markNotificationRead($id);
            }
            break;
        default:
            jsonError('Method not allowed', 405);
    }
}

function listNotifications() {
    $user = requireAuth();
    $db = getDB();

    $limit = intval($_GET['limit'] ?? 50);
    $offset = intval($_GET['offset'] ?? 0);

    $stmt = $db->prepare("
        SELECT * FROM notifications
        WHERE user_id = :uid
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':limit', $limit, SQLITE3_INTEGER);
    $stmt->bindValue(':offset', $offset, SQLITE3_INTEGER);
    $result = $stmt->execute();

    $notifications = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $notifications[] = $row;
    }

    jsonResponse(['notifications' => $notifications]);
}

function markNotificationRead($id) {
    $user = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid");
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();

    jsonResponse(['success' => true]);
}

function markAllNotificationsRead() {
    $user = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :uid AND is_read = 0");
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();

    jsonResponse(['success' => true]);
}

function getUnreadCount() {
    $user = requireAuth();
    $db = getDB();

    $stmt = $db->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = :uid AND is_read = 0");
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $count = $stmt->execute()->fetchArray(SQLITE3_ASSOC)['count'];

    jsonResponse(['unread_count' => $count]);
}

/**
 * Helper: Create a notification for a user
 */
function createNotification($userId, $type, $title, $body = null, $link = null) {
    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at)
        VALUES (:uid, :type, :title, :body, :link, 0, datetime('now'))
    ");
    $stmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
    $stmt->bindValue(':type', $type, SQLITE3_TEXT);
    $stmt->bindValue(':title', $title, SQLITE3_TEXT);
    $stmt->bindValue(':body', $body, SQLITE3_TEXT);
    $stmt->bindValue(':link', $link, SQLITE3_TEXT);
    $stmt->execute();
    return $db->lastInsertRowID();
}
