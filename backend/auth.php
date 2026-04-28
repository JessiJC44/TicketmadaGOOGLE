<?php
require_once __DIR__ . '/config.php';

function handleAuth($method, $action, $subAction = null) {
    switch ($action) {
        case 'register':
            if ($method !== 'POST') jsonError('Méthode non autorisée', 405);
            register();
            break;
        case 'login':
            if ($method !== 'POST') jsonError('Méthode non autorisée', 405);
            login();
            break;
        case 'oauth':
            if ($method !== 'POST') jsonError('Méthode non autorisée', 405);
            oauthLogin();
            break;
        case 'me':
            if ($method !== 'GET') jsonError('Méthode non autorisée', 405);
            getMe();
            break;
        case 'logout':
            if ($method !== 'POST') jsonError('Méthode non autorisée', 405);
            logout();
            break;
        default:
            jsonError('Route auth non trouvée', 404);
    }
}

function register() {
    $body = getBody();
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $role = $body['role'] ?? ROLE_BUYER;

    if (!$name || !$email || !$password) {
        jsonError('Nom, email et mot de passe requis');
    }

    $db = getDB();

    // Check if email exists
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonError('Cet email est déjà utilisé');
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $initials = strtoupper(substr($name, 0, 1) . substr(strrchr($name, ' ') ?: $name, 1, 1));

    $stmt = $db->prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?, ?, ?, ?, ?, "active")');
    $stmt->execute([$name, $email, $hash, $role, $initials]);
    $userId = $db->lastInsertId();

    $token = createSession($db, $userId);
    $user = getUserById($db, $userId);

    jsonResponse(['user' => $user, 'token' => $token], 201);
}

function login() {
    $body = getBody();
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$email || !$password) {
        jsonError('Email et mot de passe requis');
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonError('Email ou mot de passe incorrect', 401);
    }

    // Update last login
    $db->prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?')->execute([$user['id']]);

    $token = createSession($db, $user['id']);
    unset($user['password_hash']);

    jsonResponse(['user' => $user, 'token' => $token]);
}

function oauthLogin() {
    $body = getBody();
    $provider = $body['provider'] ?? 'google';
    $name = $body['name'] ?? '';
    $email = $body['email'] ?? '';

    // Simulate OAuth: if no email provided, generate one
    if (!$email) {
        $email = strtolower(str_replace(' ', '.', $name ?: 'user')) . '_' . $provider . '@ticketmada.local';
    }
    if (!$name) {
        $name = 'Utilisateur ' . ucfirst($provider);
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Create new user
        $hash = password_hash(generateToken(), PASSWORD_DEFAULT);
        $initials = strtoupper(substr($name, 0, 1) . substr(strrchr($name, ' ') ?: $name, 1, 1));

        $stmt = $db->prepare('INSERT INTO users (name, email, password_hash, role, avatar_initials, status) VALUES (?, ?, ?, "buyer", ?, "active")');
        $stmt->execute([$name, $email, $hash, $initials]);
        $userId = $db->lastInsertId();
        $user = getUserById($db, $userId);
    } else {
        $db->prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?')->execute([$user['id']]);
        unset($user['password_hash']);
    }

    $token = createSession($db, $user['id']);
    jsonResponse(['user' => $user, 'token' => $token]);
}

function getMe() {
    $user = requireAuth();
    unset($user['password_hash']);
    jsonResponse(['user' => $user]);
}

function logout() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(.+)/', $auth, $matches)) {
        $db = getDB();
        $db->prepare('DELETE FROM sessions WHERE token = ?')->execute([$matches[1]]);
    }
    jsonResponse(['message' => 'Déconnecté']);
}

function createSession($db, $userId) {
    $token = generateToken();
    $expires = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY);
    $stmt = $db->prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->execute([$userId, $token, $expires]);
    return $token;
}

function getUserById($db, $id) {
    $stmt = $db->prepare('SELECT id, name, email, role, plan, avatar_initials, phone, status, created_at, last_login FROM users WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch();
}
