<?php
/**
 * TicketMada — Permission & Tier Enforcement System
 * Handles: SuperAdmin tier checks, Organizer plan checks, feature limits
 */

require_once __DIR__ . '/config.php';

// ═══════════════════════════════════════════
// SUPERADMIN TIERS
// ═══════════════════════════════════════════

/**
 * Get the SuperAdmin tier for a user
 * @param array $user User row from database
 * @return string|null 'moderator', 'admin', 'superadmin' or null if not admin
 */
function getSuperAdminTier($user) {
    if ($user['role'] === ROLE_SUPERADMIN) {
        return $user['plan'] ?? 'superadmin';
    }
    if ($user['role'] === ROLE_ADMIN) {
        return $user['plan'] ?? 'admin';
    }
    return null;
}

/**
 * Require a minimum SuperAdmin tier to proceed
 * @param string $minTier 'moderator', 'admin', or 'superadmin'
 * @return array The authenticated user
 */
function requireSuperAdminTier($minTier) {
    $user = requireAuth([ROLE_ADMIN, ROLE_SUPERADMIN]);
    $tierLevels = ['moderator' => 1, 'admin' => 2, 'superadmin' => 3];
    $userTier = getSuperAdminTier($user);
    $userLevel = $tierLevels[$userTier] ?? 0;
    $minLevel = $tierLevels[$minTier] ?? 0;

    if ($userLevel < $minLevel) {
        jsonError('Accès insuffisant — tier ' . $minTier . ' requis. Votre tier : ' . $userTier, 403);
    }
    return $user;
}

// ═══════════════════════════════════════════
// ORGANIZER TIERS
// ═══════════════════════════════════════════

/**
 * Get the Organizer tier/plan
 * @param array $user User row from database
 * @return string 'starter', 'pro', or 'enterprise'
 */
function getOrganizerTier($user) {
    return $user['organizer_license'] ?? $user['plan'] ?? 'starter';
}

/**
 * Require a minimum Organizer tier to proceed
 * @param string $minTier 'starter', 'pro', or 'enterprise'
 * @return array The authenticated user
 */
function requireOrganizerTier($minTier) {
    $user = requireAuth([ROLE_ORGANIZER]);
    $tierLevels = ['starter' => 1, 'pro' => 2, 'enterprise' => 3];
    $userTier = getOrganizerTier($user);
    $userLevel = $tierLevels[$userTier] ?? 0;
    $minLevel = $tierLevels[$minTier] ?? 0;

    if ($userLevel < $minLevel) {
        jsonError('Votre licence ' . $userTier . ' ne permet pas cette action. Tier ' . $minTier . ' requis.', 403);
    }
    return $user;
}

// ═══════════════════════════════════════════
// ORGANIZER LIMITS
// ═══════════════════════════════════════════

/**
 * Get limits for an organizer tier
 * @param string $tier 'starter', 'pro', or 'enterprise'
 * @return array Limits array
 */
function getOrganizerLimits($tier) {
    $limits = [
        'starter' => [
            'max_active_events' => 2,
            'max_tickets_per_event' => 200,
            'max_team_members' => 0,
            'can_promo_codes' => false,
            'can_affiliates' => false,
            'can_pos' => false,
            'can_dynamic_pricing' => false,
            'can_resale' => false,
            'can_ticket_designer' => false,
            'can_homepage_designer' => false,
            'can_api_webhooks' => false,
            'can_fulfillment' => false,
            'can_reports_charts' => false,
            'can_seatmap' => false,
            'can_checkin_lists' => false,
            'can_email_templates' => false,
            'can_accounting' => false,
            'can_widget_embed' => false,
            'can_custom_css' => false,
            'can_subscriptions' => false,
        ],
        'pro' => [
            'max_active_events' => 10,
            'max_tickets_per_event' => 2000,
            'max_team_members' => 5,
            'can_promo_codes' => true,
            'can_affiliates' => true,
            'can_pos' => true,
            'can_dynamic_pricing' => false,
            'can_resale' => false,
            'can_ticket_designer' => true,
            'can_homepage_designer' => false,
            'can_api_webhooks' => false,
            'can_fulfillment' => true,
            'can_reports_charts' => true,
            'can_seatmap' => true,
            'can_checkin_lists' => true,
            'can_email_templates' => true,
            'can_accounting' => false,
            'can_widget_embed' => false,
            'can_custom_css' => false,
            'can_subscriptions' => true,
        ],
        'enterprise' => [
            'max_active_events' => PHP_INT_MAX,
            'max_tickets_per_event' => PHP_INT_MAX,
            'max_team_members' => PHP_INT_MAX,
            'can_promo_codes' => true,
            'can_affiliates' => true,
            'can_pos' => true,
            'can_dynamic_pricing' => true,
            'can_resale' => true,
            'can_ticket_designer' => true,
            'can_homepage_designer' => true,
            'can_api_webhooks' => true,
            'can_fulfillment' => true,
            'can_reports_charts' => true,
            'can_seatmap' => true,
            'can_checkin_lists' => true,
            'can_email_templates' => true,
            'can_accounting' => true,
            'can_widget_embed' => true,
            'can_custom_css' => true,
            'can_subscriptions' => true,
        ],
    ];

    return $limits[$tier] ?? $limits['starter'];
}

/**
 * Check if organizer can create a new active event
 * @param array $user User row from database
 * @return bool
 */
function canCreateEvent($user) {
    $tier = getOrganizerTier($user);
    $limits = getOrganizerLimits($tier);
    $db = getDB();

    $stmt = $db->prepare("SELECT COUNT(*) as count FROM events WHERE organizer_id = :uid AND status IN ('active', 'pending_approval')");
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $count = $stmt->execute()->fetchArray(SQLITE3_ASSOC)['count'];

    return $count < $limits['max_active_events'];
}

/**
 * Check ticket limit for an event
 * @param array $user User row
 * @param int $eventId Event ID
 * @param int $additionalTickets Number of new tickets to add
 * @return bool
 */
function canAddTickets($user, $eventId, $additionalTickets = 1) {
    $tier = getOrganizerTier($user);
    $limits = getOrganizerLimits($tier);
    $db = getDB();

    $stmt = $db->prepare("SELECT COUNT(*) as count FROM tickets WHERE event_id = :eid");
    $stmt->bindValue(':eid', $eventId, SQLITE3_INTEGER);
    $count = $stmt->execute()->fetchArray(SQLITE3_ASSOC)['count'];

    return ($count + $additionalTickets) <= $limits['max_tickets_per_event'];
}

/**
 * Check team member limit
 * @param array $user User row
 * @return bool
 */
function canAddTeamMember($user) {
    $tier = getOrganizerTier($user);
    $limits = getOrganizerLimits($tier);
    $db = getDB();

    $stmt = $db->prepare("SELECT COUNT(*) as count FROM team_members WHERE organizer_id = :uid");
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $count = $stmt->execute()->fetchArray(SQLITE3_ASSOC)['count'];

    return $count < $limits['max_team_members'];
}

/**
 * Check if organizer can access a specific feature
 * @param array $user User row
 * @param string $feature Feature key (e.g., 'can_promo_codes', 'can_pos')
 * @return bool
 */
function canAccessFeature($user, $feature) {
    $tier = getOrganizerTier($user);
    $limits = getOrganizerLimits($tier);
    return $limits[$feature] ?? false;
}

// ═══════════════════════════════════════════
// SUPERADMIN ACTION MAP
// ═══════════════════════════════════════════

/**
 * SuperAdmin actions and their required minimum tier
 * Use this map to check before executing protected actions
 */
function getSuperAdminActionTier($action) {
    $actionTiers = [
        // Moderator actions
        'view_dashboard' => 'moderator',
        'view_organizers' => 'moderator',
        'view_users' => 'moderator',
        'view_events' => 'moderator',
        'view_orders' => 'moderator',
        'approve_application' => 'moderator',
        'reject_application' => 'moderator',
        'manage_support_tickets' => 'moderator',
        'respond_messages' => 'moderator',

        // Admin actions
        'block_user' => 'admin',
        'unblock_user' => 'admin',
        'block_organizer' => 'admin',
        'unblock_organizer' => 'admin',
        'manage_payouts' => 'admin',
        'approve_refund' => 'admin',
        'manage_licences' => 'admin',
        'manage_kyc' => 'admin',
        'view_audit_logs' => 'admin',
        'manage_seatmaps' => 'admin',
        'manage_scan_links' => 'admin',
        'approve_event' => 'admin',
        'reject_event' => 'admin',

        // SuperAdmin actions
        'change_commission_rate' => 'superadmin',
        'toggle_maintenance_mode' => 'superadmin',
        'broadcast_notification' => 'superadmin',
        'delete_organizer_permanent' => 'superadmin',
        'delete_user_permanent' => 'superadmin',
        'manage_api_keys' => 'superadmin',
        'full_security_access' => 'superadmin',
        'override_organizer_settings' => 'superadmin',
        'manage_platform_config' => 'superadmin',
    ];

    return $actionTiers[$action] ?? 'superadmin';
}

/**
 * Convenience: check and enforce a specific action
 * @param string $action Action name from the action map
 * @return array The authenticated user
 */
function requireActionPermission($action) {
    $minTier = getSuperAdminActionTier($action);
    return requireSuperAdminTier($minTier);
}
