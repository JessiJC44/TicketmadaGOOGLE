<?php
// backend/superadmin.php

function handleSuperAdmin($method, $action = null, $id = null) {
    global $db;
    
    // Auth Check: SuperAdmin required
    $user = getCurrentUser();
    if (!$user || $user['role'] !== 'superadmin') {
        jsonError('Non autorisé', 403);
    }

    switch ($action) {
        case 'dashboard':
            // Aggregate stats for the whole platform
            $stats = [];
            
            // Volume total
            $stmt = $db->query("SELECT SUM(amount) as total FROM transactions WHERE status = 'completed'");
            $stats['totalRevenue'] = (float)$stmt->fetchColumn() ?: 0;
            
            // Billets vendus
            $stmt = $db->query("SELECT COUNT(*) FROM tickets WHERE status = 'active' OR status = 'used'");
            $stats['totalTicketsSold'] = (int)$stmt->fetchColumn();
            
            // Commission (3% mock or calculated)
            $stats['totalCommission'] = $stats['totalRevenue'] * 0.03;
            
            // Organisateurs actifs
            $stmt = $db->query("SELECT COUNT(*) FROM users WHERE role = 'organizer' AND status = 'active'");
            $stats['activeOrganizers'] = (int)$stmt->fetchColumn();
            
            // Demandes en attente
            $stmt = $db->query("SELECT COUNT(*) FROM organizer_applications WHERE status = 'pending'");
            $stats['pendingApplications'] = (int)$stmt->fetchColumn();
            
            // Monthly revenue (last 6 months)
            $months = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = date('Y-m', strtotime("-$i months"));
                $stmt = $db->prepare("SELECT SUM(amount) FROM transactions WHERE status = 'completed' AND created_at LIKE ?");
                $stmt->execute([$month . '%']);
                $months[] = [
                    'month' => date('M', strtotime($month . '-01')),
                    'revenue' => (float)$stmt->fetchColumn() ?: 0
                ];
            }
            $stats['monthlyRevenue'] = $months;
            
            // Top events
            $stmt = $db->query("SELECT e.id, e.name, e.date_start as event_date, 
                                (SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id) as tickets_sold,
                                (SELECT SUM(price) FROM tickets t WHERE t.event_id = e.id) as revenue
                                FROM events e ORDER BY revenue DESC LIMIT 5");
            $stats['topEventsPerformance'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Recent activity
            $stmt = $db->query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20");
            $stats['recentActivity'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse($stats);
            break;

        case 'organizers':
            // List all organizers with their performance
            $stmt = $db->query("SELECT u.id, u.name, u.email, u.status, u.organizer_license, u.created_at,
                                (SELECT COUNT(*) FROM events e WHERE e.organizer_id = u.id) as events_count,
                                (SELECT SUM(amount) FROM transactions t JOIN events e ON t.event_id = e.id WHERE e.organizer_id = u.id AND t.status = 'completed') as total_revenue
                                FROM users u WHERE u.role = 'organizer' OR u.role = 'superadmin' ORDER BY total_revenue DESC");
            $orgs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Calculate commission for each
            foreach ($orgs as &$o) {
                $o['total_revenue'] = (float)$o['total_revenue'] ?: 0;
                $o['total_commission'] = $o['total_revenue'] * 0.03;
            }
            jsonResponse($orgs);
            break;

        case 'users':
            // List all platform users (customers)
            $stmt = $db->query("SELECT id, name, email, role, status, created_at,
                                (SELECT COUNT(*) FROM tickets WHERE buyer_id = users.id) as purchaseCount,
                                (SELECT SUM(price) FROM tickets WHERE buyer_id = users.id) as totalSpent
                                FROM users WHERE role = 'buyer' ORDER BY created_at DESC");
            jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'events':
            // Oversight of all events
            $stmt = $db->query("SELECT e.id, e.name, e.category, e.venue, e.capacity, e.status, e.created_at,
                                u.name as organizer_name,
                                (SELECT COUNT(*) FROM tickets WHERE event_id = e.id) as ticketsSold,
                                (SELECT SUM(price) FROM tickets WHERE event_id = e.id) as totalRevenue
                                FROM events e JOIN users u ON e.organizer_id = u.id ORDER BY e.created_at DESC");
            jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'finance':
            // Financial oversight
            $finance = [
                'stats' => [
                    'totalVolume' => 0,
                    'totalCommissionCollected' => 0,
                    'pendingPayouts' => 0
                ],
                'payouts' => [],
                'taxes' => [],
                'config' => [
                    ['key' => 'COMMISSION_RATE', 'value' => '3%', 'description' => 'Taux de commission standard appliqué aux ventes'],
                    ['key' => 'WITHDRAWAL_MIN', 'value' => '10000', 'description' => 'Montant minimum pour un retrait (Ar)'],
                    ['key' => 'MAINTENANCE_MODE', 'value' => 'OFF', 'description' => 'Activer le mode maintenance global']
                ]
            ];
            
            // Fetch real payout requests
            $stmt = $db->query("SELECT p.*, u.name as organizer_name FROM payouts p JOIN users u ON p.organizer_id = u.id ORDER BY p.created_at DESC");
            $finance['payouts'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate stats
            $stmt = $db->query("SELECT SUM(amount) FROM transactions WHERE status = 'completed'");
            $finance['stats']['totalVolume'] = (float)$stmt->fetchColumn() ?: 0;
            $finance['stats']['totalCommissionCollected'] = $finance['stats']['totalVolume'] * 0.03;
            
            $stmt = $db->query("SELECT SUM(amount) FROM payouts WHERE status = 'pending'");
            $finance['stats']['pendingPayouts'] = (float)$stmt->fetchColumn() ?: 0;
            
            jsonResponse($finance);
            break;

        case 'orders':
            // All orders globally
            $stmt = $db->query("SELECT t.*, e.name as event_name, u.name as buyer_name, u.email as buyer_email
                                FROM tickets t 
                                JOIN events e ON t.event_id = e.id 
                                JOIN users u ON t.buyer_id = u.id
                                ORDER BY t.created_at DESC LIMIT 100");
            jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'broadcast':
            if ($method === 'POST') {
                $data = getBody();
                // Mock broadcast logic: log the notification
                $stmt = $db->prepare("INSERT INTO audit_log (details_json, action) VALUES (?, 'system_broadcast')");
                $stmt->execute([json_encode(["target" => $data['target'], "subject" => $data['subject']], JSON_UNESCAPED_UNICODE), "Broadcast envoyé"]);
                jsonResponse(['success' => true]);
            }
            break;

        default:
            jsonError('Action superadmin non reconnue', 400);
    }
}
