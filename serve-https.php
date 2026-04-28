<?php
/**
 * TMscanner HTTPS Server
 * Sert le build Flutter web en HTTPS pour permettre l'accès caméra sur iPhone
 */

$host = '0.0.0.0';
$port = 5443;
$docRoot = __DIR__ . '/tmscanner/build/web';
$certFile = __DIR__ . '/cert.pem';
$keyFile = __DIR__ . '/key.pem';

// Vérifier que le build existe
if (!is_dir($docRoot)) {
    echo "❌ Build Flutter non trouvé. Lancez d'abord:\n";
    echo "   cd tmscanner && flutter build web --release\n";
    exit(1);
}

// Vérifier les certificats
if (!file_exists($certFile) || !file_exists($keyFile)) {
    echo "❌ Certificats non trouvés. Lancez d'abord:\n";
    echo "   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj \"/CN=192.168.1.72\"\n";
    exit(1);
}

$context = stream_context_create([
    'ssl' => [
        'local_cert' => $certFile,
        'local_pk' => $keyFile,
        'allow_self_signed' => true,
        'verify_peer' => false,
    ]
]);

$server = @stream_socket_server("ssl://$host:$port", $errno, $errstr, STREAM_SERVER_BIND | STREAM_SERVER_LISTEN, $context);

if (!$server) {
    echo "❌ Impossible de démarrer le serveur: $errstr ($errno)\n";
    exit(1);
}

// Obtenir l'IP locale
$localIP = trim(shell_exec("ipconfig getifaddr en0 2>/dev/null") ?: '192.168.1.72');

echo "\n🎫 TMscanner HTTPS Server\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "📱 iPhone:  https://$localIP:$port\n";
echo "💻 Mac:     https://localhost:$port\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "Sur iPhone Safari: Accepter le certificat\n";
echo "Ctrl+C pour arrêter\n\n";

// MIME types
$mimeTypes = [
    'html' => 'text/html',
    'js'   => 'application/javascript',
    'json' => 'application/json',
    'css'  => 'text/css',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'svg'  => 'image/svg+xml',
    'ico'  => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2'=> 'font/woff2',
    'ttf'  => 'font/ttf',
    'wasm' => 'application/wasm',
];

while ($conn = @stream_socket_accept($server, -1)) {
    $request = fread($conn, 8192);
    if (!$request) { fclose($conn); continue; }

    // Parse la requête
    $lines = explode("\r\n", $request);
    $firstLine = explode(' ', $lines[0]);
    $method = $firstLine[0] ?? 'GET';
    $uri = $firstLine[1] ?? '/';

    // Nettoyer l'URI
    $path = parse_url($uri, PHP_URL_PATH);
    $path = str_replace('..', '', $path); // Sécurité

    // Si c'est / ou un chemin sans extension, servir index.html (SPA)
    $filePath = $docRoot . $path;
    if (is_dir($filePath) || !file_exists($filePath)) {
        $filePath = $docRoot . '/index.html';
    }

    if (file_exists($filePath) && is_file($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mime = $mimeTypes[$ext] ?? 'application/octet-stream';
        $content = file_get_contents($filePath);
        $length = strlen($content);

        $response = "HTTP/1.1 200 OK\r\n";
        $response .= "Content-Type: $mime\r\n";
        $response .= "Content-Length: $length\r\n";
        $response .= "Access-Control-Allow-Origin: *\r\n";
        $response .= "Connection: close\r\n";
        $response .= "\r\n";
        $response .= $content;
    } else {
        $response = "HTTP/1.1 404 Not Found\r\n";
        $response .= "Content-Type: text/plain\r\n";
        $response .= "Connection: close\r\n";
        $response .= "\r\n";
        $response .= "404 Not Found";
    }

    @fwrite($conn, $response);
    @fclose($conn);

    // Log
    $time = date('H:i:s');
    $status = str_contains($response, '200 OK') ? '200' : '404';
    echo "[$time] $method $path → $status\n";
}

fclose($server);
