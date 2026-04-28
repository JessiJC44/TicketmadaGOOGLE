#!/bin/bash
# ============================================
# TicketMada - Serveur de développement
# Stack: Electron + Laravel + PHP + Vue.js + Node.js + MySQL
# ============================================

echo ""
echo "  🎫 TicketMada - Serveur de développement"
echo "  ========================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js non trouvé. Installez Node.js d'abord."
    echo "     https://nodejs.org/"
    exit 1
fi

echo "  ✅ Node.js $(node -v) détecté"

# Get the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing server on port 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Create a simple static file server
cat > "$DIR/.dev-server.js" << 'SERVEREOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let urlPath = decodeURIComponent(req.url.split('?')[0]);

    // Default to index.html
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);
    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Try adding .html
            fs.readFile(filePath + '.html', (err2, data2) => {
                if (err2) {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>404 - Page non trouvée</h1><p><a href="/">Retour à l\'accueil</a></p>');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data2);
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  🚀 Serveur démarré !');
    console.log('');
    console.log('  📍 Ouvrez dans Brave :');
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log('  │                                                         │');
    console.log(`  │  🏠 Accueil:    http://localhost:${PORT}                   │`);
    console.log('  │                                                         │');
    console.log(`  │  👤 Landing:    http://localhost:${PORT}/User/ticketmada-landing.html     │`);
    console.log(`  │  🎫 Billetterie: http://localhost:${PORT}/User/ticketmada-ticketing.html  │`);
    console.log(`  │  📋 Organisateur: http://localhost:${PORT}/User/ticketmada-organisateur.html │`);
    console.log(`  │  📊 Dashboard:  http://localhost:${PORT}/Admin/ticketmada-dashboard.html  │`);
    console.log(`  │  🛡️ SuperAdmin: http://localhost:${PORT}/Admin/ticketmada-superadmin.html │`);
    console.log('  │                                                         │');
    console.log('  └─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('  Appuyez sur Ctrl+C pour arrêter le serveur');
    console.log('');
});
SERVEREOF

# Start the server
echo ""
echo "  🚀 Démarrage du serveur sur le port $PORT..."
echo ""
node "$DIR/.dev-server.js"
