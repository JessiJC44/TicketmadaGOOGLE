<?php
// TicketMada - Configuration
$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}
define('DB_PATH', $dataDir . '/ticketmada.db');
define('COMMISSION_RATE', 0.03); // 3%
define('TOKEN_EXPIRY', 86400 * 30); // 30 days
define('DEFAULT_PASSWORD', 'password123');

// Roles
define('ROLE_BUYER', 'buyer');
define('ROLE_ORGANIZER', 'organizer');
define('ROLE_ADMIN', 'admin');
define('ROLE_SUPERADMIN', 'superadmin');

// Statuses
define('STATUS_ACTIVE', 'active');
define('STATUS_PENDING', 'pending');
define('STATUS_COMPLETED', 'completed');
define('STATUS_CANCELLED', 'cancelled');

// Get PDO connection
function getDB() {
    static $db = null;
    if ($db === null) {
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $db->exec('PRAGMA journal_mode=WAL');
        $db->exec('PRAGMA foreign_keys=ON');
    }
    return $db;
}

// JSON response helper
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError($message, $code = 400) {
    jsonResponse(['error' => $message], $code);
}

// Get request body as array
function getBody() {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

// Get current authenticated user from Bearer token
function getCurrentUser() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/', $auth, $matches)) {
        return null;
    }
    $token = $matches[1];
    $db = getDB();
    $stmt = $db->prepare('SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime("now")');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

// Require authentication
function requireAuth($roles = null) {
    $user = getCurrentUser();
    if (!$user) {
        jsonError('Non authentifié', 401);
    }
    if ($roles && !in_array($user['role'], (array)$roles)) {
        jsonError('Accès interdit', 403);
    }
    return $user;
}

// Generate unique token
function generateToken() {
    return bin2hex(random_bytes(32));
}

// Generate ticket code
function generateTicketCode() {
    return 'TKT-' . str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
}
