<?php
require_once __DIR__ . '/config.php';

function handleProducts($method, $id, $action) {
    switch ($method) {
        case 'GET':
            if ($action === 'categories') { getProductCategories(); return; }
            $id ? getProduct($id) : listProducts();
            break;
        case 'POST':
            createProduct();
            break;
        case 'PUT':
            if (!$id) jsonError('ID requis');
            updateProduct($id);
            break;
        case 'DELETE':
            if (!$id) jsonError('ID requis');
            deleteProduct($id);
            break;
        default:
            jsonError('Méthode non autorisée', 405);
    }
}

function listProducts() {
    $db = getDB();
    $where = ['1=1'];
    $params = [];

    if (!empty($_GET['organizer_id'])) { $where[] = 'p.organizer_id = ?'; $params[] = $_GET['organizer_id']; }
    if (!empty($_GET['event_id'])) { $where[] = 'p.event_id = ?'; $params[] = $_GET['event_id']; }
    if (!empty($_GET['category'])) { $where[] = 'p.category = ?'; $params[] = $_GET['category']; }
    if (!empty($_GET['status'])) { $where[] = 'p.status = ?'; $params[] = $_GET['status']; }

    $limit = (int)($_GET['limit'] ?? 50);
    $offset = (int)($_GET['offset'] ?? 0);

    $sql = "SELECT p.*, u.name as organizer_name, e.name as event_name,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) as sold_count
            FROM products p
            LEFT JOIN users u ON p.organizer_id = u.id
            LEFT JOIN events e ON p.event_id = e.id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['products' => $stmt->fetchAll()]);
}

function getProduct($id) {
    $db = getDB();
    $stmt = $db->prepare('SELECT p.*, u.name as organizer_name FROM products p LEFT JOIN users u ON p.organizer_id = u.id WHERE p.id = ?');
    $stmt->execute([$id]);
    $product = $stmt->fetch();
    if (!$product) jsonError('Produit non trouvé', 404);

    // Get variants
    $variants = $db->prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY price ASC');
    $variants->execute([$id]);
    $product['variants'] = $variants->fetchAll();

    jsonResponse(['product' => $product]);
}

function createProduct() {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();

    $required = ['name', 'price'];
    foreach ($required as $field) {
        if (empty($body[$field])) jsonError("$field requis");
    }

    $db = getDB();
    $stmt = $db->prepare("INSERT INTO products (organizer_id, event_id, name, description, category, price, stock, image_url, status)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')");
    $stmt->execute([
        $user['id'],
        $body['event_id'] ?? null,
        $body['name'],
        $body['description'] ?? '',
        $body['category'] ?? 'merchandise',
        (int)$body['price'],
        (int)($body['stock'] ?? -1), // -1 = unlimited
        $body['image_url'] ?? null
    ]);

    $productId = $db->lastInsertId();

    // Create variants if provided
    if (!empty($body['variants']) && is_array($body['variants'])) {
        $varStmt = $db->prepare('INSERT INTO product_variants (product_id, name, price, stock) VALUES (?, ?, ?, ?)');
        foreach ($body['variants'] as $v) {
            $varStmt->execute([$productId, $v['name'], (int)$v['price'], (int)($v['stock'] ?? -1)]);
        }
    }

    jsonResponse(['id' => $productId, 'message' => 'Produit créé'], 201);
}

function updateProduct($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $body = getBody();
    $db = getDB();

    $updates = [];
    $params = [];
    $allowed = ['name', 'description', 'category', 'price', 'stock', 'image_url', 'status', 'event_id'];

    foreach ($allowed as $field) {
        if (isset($body[$field])) {
            $updates[] = "$field = ?";
            $params[] = $body[$field];
        }
    }

    if (empty($updates)) jsonError('Rien à mettre à jour');

    $updates[] = "updated_at = datetime('now')";
    $params[] = $id;

    $db->prepare('UPDATE products SET ' . implode(', ', $updates) . ' WHERE id = ?')->execute($params);
    jsonResponse(['message' => 'Produit mis à jour']);
}

function deleteProduct($id) {
    $user = requireAuth([ROLE_ORGANIZER, ROLE_ADMIN, ROLE_SUPERADMIN]);
    $db = getDB();
    $db->prepare('DELETE FROM product_variants WHERE product_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Produit supprimé']);
}

function getProductCategories() {
    jsonResponse(['categories' => [
        ['id' => 'merchandise', 'label' => 'Merchandising', 'icon' => 'mdi-tshirt-crew'],
        ['id' => 'food', 'label' => 'Nourriture & Boissons', 'icon' => 'mdi-food'],
        ['id' => 'parking', 'label' => 'Parking', 'icon' => 'mdi-car'],
        ['id' => 'addon', 'label' => 'Add-on', 'icon' => 'mdi-plus-circle'],
        ['id' => 'bundle', 'label' => 'Bundle', 'icon' => 'mdi-package-variant'],
        ['id' => 'vip_upgrade', 'label' => 'Upgrade VIP', 'icon' => 'mdi-star'],
    ]]);
}
