<?php
// TicketMada API Router
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Serve static files (HTML, CSS, JS, images)
if (!str_starts_with($uri, '/api/')) {
    // Map to project root
    $projectRoot = dirname(__DIR__);
    $filePath = $projectRoot . $uri;

    if ($uri === '/' || $uri === '') {
        $filePath = $projectRoot . '/User/ticketmada-landing.html';
    }

    if (is_file($filePath)) {
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeTypes = [
            'html' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
        ];
        header('Content-Type: ' . ($mimeTypes[$ext] ?? 'application/octet-stream'));
        readfile($filePath);
        exit;
    }

    http_response_code(404);
    echo '404 Not Found';
    exit;
}

// Initialize database
require_once __DIR__ . '/database.php';

// Parse API route
$apiPath = substr($uri, 4); // Remove /api prefix
$parts = explode('/', trim($apiPath, '/'));
$resource = $parts[0] ?? '';
$id = $parts[1] ?? null;
$action = $parts[2] ?? null;

// If second part is a named action (not numeric), treat as action
if ($id && !is_numeric($id) && $id !== 'me') {
    $action = $id;
    $id = null;
}

// Route to handlers
try {
    switch ($resource) {
        case 'auth':
            require_once __DIR__ . '/auth.php';
            handleAuth($method, $id ?? $action, $parts[2] ?? null);
            break;
        case 'events':
            require_once __DIR__ . '/events.php';
            handleEvents($method, $id, $action);
            break;
        case 'orders':
            require_once __DIR__ . '/orders.php';
            handleOrders($method, $id, $action);
            break;
        case 'tickets':
            require_once __DIR__ . '/tickets.php';
            // PDF route
            if ($action === 'pdf' && $method === 'GET' && $id) {
                if (file_exists(__DIR__ . '/pdf-ticket.php')) {
                    require_once __DIR__ . '/pdf-ticket.php';
                    generateTicketPDF($id);
                }
            }
            handleTickets($method, $id, $action);
            break;
        case 'refunds':
            require_once __DIR__ . '/refunds.php';
            handleRefunds($method, $id, $action);
            break;
        case 'payouts':
            require_once __DIR__ . '/payouts.php';
            handlePayouts($method, $id, $action);
            break;
        case 'clients':
            require_once __DIR__ . '/clients.php';
            handleClients($method, $id, $action);
            break;
        case 'team':
            require_once __DIR__ . '/team.php';
            handleTeam($method, $id, $action);
            break;
        case 'analytics':
            require_once __DIR__ . '/analytics.php';
            handleAnalytics($method, $id, $action);
            break;
        case 'activity':
            require_once __DIR__ . '/analytics.php';
            handleActivity($method, $id, $action);
            break;
        case 'transactions':
            require_once __DIR__ . '/transactions.php';
            handleTransactions($method, $id, $action);
            break;
        case 'customers':
            require_once __DIR__ . '/customers.php';
            handleCustomers($method, $id, $action);
            break;
        case 'subscriptions':
            require_once __DIR__ . '/subscriptions.php';
            handleSubscriptions($method, $id, $action);
            break;
        case 'discounts':
            require_once __DIR__ . '/discounts.php';
            handleDiscounts($method, $id, $action);
            break;
        case 'products':
            require_once __DIR__ . '/products.php';
            handleProducts($method, $id, $action);
            break;
        case 'pos':
            require_once __DIR__ . '/pos.php';
            handlePOS($method, $id, $action);
            break;
        case 'purchase-intents':
            require_once __DIR__ . '/purchase-intents.php';
            handlePurchaseIntents($method, $id, $action);
            break;
        case 'accounting':
            require_once __DIR__ . '/accounting.php';
            handleAccounting($method, $action, $parts[3] ?? null);
            break;
        case 'security':
            require_once __DIR__ . '/security.php';
            handleSecurity($method, $action, $parts[3] ?? null);
            break;
        case 'fulfillment':
            require_once __DIR__ . '/fulfillment.php';
            handleFulfillment($method, $id, $action);
            break;
        case 'pricing':
            require_once __DIR__ . '/dynamic-pricing.php';
            handleDynamicPricing($method, $id, $action);
            break;
        case 'waitlist':
            require_once __DIR__ . '/waitlist.php';
            handleWaitlist($method, $id, $action);
            break;
        case 'resale':
            require_once __DIR__ . '/resale.php';
            handleResale($method, $id, $action);
            break;
        case 'settings':
            require_once __DIR__ . '/settings.php';
            handleSettings($method, $id, $action);
            break;
        case 'email-templates':
            require_once __DIR__ . '/email-templates.php';
            handleEmailTemplates($method, $id, $action);
            break;
        case 'transfers':
            require_once __DIR__ . '/resale.php';
            handleResale($method, $id, $action);
            break;
        case 'scan':
            require_once __DIR__ . '/scan.php';
            handleScan($method, $id, $action);
            break;
        case 'superadmin':
            require_once __DIR__ . '/superadmin.php';
            handleSuperAdmin($method, $action, $parts[3] ?? null);
            break;
        case 'organizer-applications':
            require_once __DIR__ . '/organizer-applications.php';
            handleOrganizerApplications($method, $id, $action);
            break;
        case 'pdf-ticket':
            require_once __DIR__ . '/pdf-ticket.php';
            generateTicketPDF($id);
            break;
        case 'admin':
            require_once __DIR__ . '/admin.php';
            handleAdmin($method, $id, $action);
            break;
        default:
            jsonError('Route non trouvée', 404);
    }
} catch (Exception $e) {
    jsonError('Erreur serveur: ' . $e->getMessage(), 500);
}
