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
        case 'tickets':
            require_once __DIR__ . '/tickets.php';
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
        default:
            jsonError('Route non trouvée', 404);
    }
} catch (Exception $e) {
    jsonError('Erreur serveur: ' . $e->getMessage(), 500);
}
