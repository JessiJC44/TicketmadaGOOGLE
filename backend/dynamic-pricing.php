<?php
require_once __DIR__ . '/config.php';

function handleDynamicPricing($method, $id, $action) {
    switch (true) {
        case $method === 'GET' && $action === 'calculate': calculateDynamicPrice(); break;
        case $method === 'GET' && !$id: listPricingRules(); break;
        case $method === 'POST': createPricingRule(); break;
        case $method === 'PUT' && $id: updatePricingRule($id); break;
        case $method === 'DELETE' && $id: deletePricingRule($id); break;
        default: jsonError('Route non trouvée', 404);
    }
}

function calculateDynamicPrice() {
    $eventId = $_GET['event_id'] ?? null;
    $ticketType = $_GET['ticket_type'] ?? 'Standard';
    $basePrice = (int)($_GET['base_price'] ?? 0);

    if (!$eventId || !$basePrice) jsonError('event_id et base_price requis');

    $db = getDB();

    // Get event info
    $event = $db->prepare('SELECT * FROM events WHERE id = ?');
    $event->execute([$eventId]);
    $event = $event->fetch();
    if (!$event) jsonError('Événement non trouvé', 404);

    // Get applicable rules
    $rules = $db->prepare("SELECT * FROM pricing_rules WHERE event_id = ? AND status = 'active' ORDER BY priority ASC");
    $rules->execute([$eventId]);
    $rules = $rules->fetchAll();

    $finalPrice = $basePrice;
    $appliedRules = [];
    $capacityPct = $event['capacity'] > 0 ? ($event['tickets_sold'] / $event['capacity']) * 100 : 0;
    $daysUntilEvent = max(0, (strtotime($event['date_start']) - time()) / 86400);

    foreach ($rules as $rule) {
        $applies = false;
        $adjustment = 0;

        switch ($rule['rule_type']) {
            case 'demand_surge':
                // Augmenter le prix quand la capacité dépasse un seuil
                $threshold = (int)($rule['threshold'] ?? 70);
                if ($capacityPct >= $threshold) {
                    $applies = true;
                    $adjustment = $rule['adjustment_type'] === 'percent'
                        ? $finalPrice * ((int)$rule['adjustment_value'] / 100)
                        : (int)$rule['adjustment_value'];
                }
                break;

            case 'early_bird':
                // Réduction si acheté X jours avant
                $daysThreshold = (int)($rule['threshold'] ?? 30);
                if ($daysUntilEvent >= $daysThreshold) {
                    $applies = true;
                    $adjustment = $rule['adjustment_type'] === 'percent'
                        ? -($finalPrice * ((int)$rule['adjustment_value'] / 100))
                        : -(int)$rule['adjustment_value'];
                }
                break;

            case 'last_minute':
                // Augmentation dans les derniers jours
                $daysThreshold = (int)($rule['threshold'] ?? 3);
                if ($daysUntilEvent <= $daysThreshold && $daysUntilEvent >= 0) {
                    $applies = true;
                    $adjustment = $rule['adjustment_type'] === 'percent'
                        ? $finalPrice * ((int)$rule['adjustment_value'] / 100)
                        : (int)$rule['adjustment_value'];
                }
                break;

            case 'time_of_day':
                // Prix différent selon l'heure
                $hour = (int)date('H');
                $startHour = (int)($rule['threshold'] ?? 18);
                $endHour = (int)($rule['threshold_max'] ?? 23);
                if ($hour >= $startHour && $hour <= $endHour) {
                    $applies = true;
                    $adjustment = $rule['adjustment_type'] === 'percent'
                        ? $finalPrice * ((int)$rule['adjustment_value'] / 100)
                        : (int)$rule['adjustment_value'];
                }
                break;
        }

        if ($applies) {
            $finalPrice += $adjustment;
            $appliedRules[] = [
                'rule' => $rule['name'],
                'type' => $rule['rule_type'],
                'adjustment' => $adjustment
            ];
        }
    }

    // Price floor/ceiling
    $minPrice = max(1000, (int)($basePrice * 0.5)); // Ne jamais descendre sous 50% du prix de base
    $maxPrice = (int)($basePrice * 3); // Ne jamais dépasser 3x le prix de base
    $finalPrice = max($minPrice, min($maxPrice, $finalPrice));

    jsonResponse([
        'base_price' => $basePrice,
        'final_price' => (int)$finalPrice,
        'discount' => $basePrice - (int)$finalPrice,
        'capacity_pct' => round($capacityPct),
        'days_until_event' => round($daysUntilEvent),
        'applied_rules' => $appliedRules
    ]);
}

function listPricingRules() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $eventId = $_GET['event_id'] ?? null;

    if ($eventId) {
        $stmt = $db->prepare('SELECT * FROM pricing_rules WHERE event_id = ? ORDER BY priority');
        $stmt->execute([$eventId]);
    } else {
        $stmt = $db->query('SELECT pr.*, e.name as event_name FROM pricing_rules pr LEFT JOIN events e ON pr.event_id = e.id ORDER BY pr.created_at DESC');
    }
    jsonResponse(['rules' => $stmt->fetchAll()]);
}

function createPricingRule() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $db->prepare("INSERT INTO pricing_rules (event_id, name, rule_type, threshold, threshold_max, adjustment_type, adjustment_value, priority, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')")->execute([
        $body['event_id'],
        $body['name'] ?? 'Rule',
        $body['rule_type'] ?? 'demand_surge',
        $body['threshold'] ?? 70,
        $body['threshold_max'] ?? null,
        $body['adjustment_type'] ?? 'percent', // percent or fixed
        (int)($body['adjustment_value'] ?? 10),
        (int)($body['priority'] ?? 0)
    ]);

    jsonResponse(['id' => $db->lastInsertId(), 'message' => 'Règle créée'], 201);
}

function updatePricingRule($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $allowed = ['name', 'rule_type', 'threshold', 'threshold_max', 'adjustment_type', 'adjustment_value', 'priority', 'status'];
    $updates = [];
    $params = [];
    foreach ($allowed as $f) {
        if (isset($body[$f])) { $updates[] = "$f = ?"; $params[] = $body[$f]; }
    }
    if (empty($updates)) jsonError('Rien à mettre à jour');
    $params[] = $id;
    $db->prepare('UPDATE pricing_rules SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
    jsonResponse(['message' => 'Règle mise à jour']);
}

function deletePricingRule($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $db->prepare('DELETE FROM pricing_rules WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Règle supprimée']);
}
