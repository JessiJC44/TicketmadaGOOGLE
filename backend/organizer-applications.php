<?php
// backend/organizer-applications.php

function handleOrganizerApplications($method, $id = null, $action = null) {
    global $db;
    
    // Auth Check: SuperAdmin required for everything except POST
    $user = getCurrentUser();
    if ($method !== 'POST' && (!$user || $user['role'] !== 'superadmin')) {
        jsonError('Non autorisé', 403);
    }

    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM organizer_applications WHERE id = ?");
                $stmt->execute([$id]);
                $app = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$app) jsonError('Demande non trouvée', 404);
                jsonResponse($app);
            } else {
                $status = $_GET['status'] ?? null;
                if ($status) {
                    $stmt = $db->prepare("SELECT * FROM organizer_applications WHERE status = ? ORDER BY created_at DESC");
                    $stmt->execute([$status]);
                } else {
                    $stmt = $db->query("SELECT * FROM organizer_applications ORDER BY created_at DESC");
                }
                $apps = $stmt->fetchAll(PDO::FETCH_ASSOC);
                jsonResponse($apps);
            }
            break;

        case 'POST':
            $data = getBody();
            if (empty($data['fullName']) || empty($data['email'])) {
                jsonError('Champs requis manquants', 400);
            }
            
            $stmt = $db->prepare("INSERT INTO organizer_applications (fullName, email, phone, city, motivation, organizationName, organizationDescription, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')");
            $stmt->execute([
                $data['fullName'],
                $data['email'],
                $data['phone'] ?? '',
                $data['city'] ?? '',
                $data['motivation'] ?? '',
                $data['organizationName'] ?? '',
                $data['organizationDescription'] ?? ''
            ]);
            
            jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
            break;

        case 'PUT':
            if (!$id) jsonError('ID requis', 400);
            
            if ($action === 'approve') {
                // 1. Get the application
                $stmt = $db->prepare("SELECT * FROM organizer_applications WHERE id = ?");
                $stmt->execute([$id]);
                $app = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$app) jsonError('Demande non trouvée', 404);
                
                // 2. Check if user already exists
                $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$app['email']]);
                $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($existingUser) {
                    // Update role to organizer
                    $stmt = $db->prepare("UPDATE users SET role = 'organizer', name = ? WHERE id = ?");
                    $stmt->execute([$app['fullName'], $existingUser['id']]);
                } else {
                    // Create new user (they will need to Reset Password or Login with Google)
                    $tempPass = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
                    $stmt = $db->prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'organizer', 'active')");
                    $stmt->execute([$app['fullName'], $app['email'], $tempPass]);
                }
                
                // 3. Update application status
                $stmt = $db->prepare("UPDATE organizer_applications SET status = 'approved' WHERE id = ?");
                $stmt->execute([$id]);
                
                jsonResponse(['success' => true]);
            } elseif ($action === 'reject') {
                $data = getBody();
                $reason = $data['reason'] ?? 'Non spécifiée';
                
                $stmt = $db->prepare("UPDATE organizer_applications SET status = 'rejected' WHERE id = ?");
                $stmt->execute([$id]);
                
                // Log the rejection reason (could send email here)
                jsonResponse(['success' => true]);
            } else {
                jsonError('Action non reconnue', 400);
            }
            break;
            
        case 'DELETE':
            if (!$id) jsonError('ID requis', 400);
            $stmt = $db->prepare("DELETE FROM organizer_applications WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['success' => true]);
            break;
    }
}
