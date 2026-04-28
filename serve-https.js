const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 5443;
const WEB_DIR = path.join(__dirname, 'tmscanner', 'build', 'web');

// Vérifier le build
if (!fs.existsSync(WEB_DIR)) {
  console.log('❌ Build Flutter non trouvé. Lance d\'abord:');
  console.log('   cd tmscanner && flutter build web --release');
  process.exit(1);
}

// Vérifier les certificats
if (!fs.existsSync('cert.pem') || !fs.existsSync('key.pem')) {
  console.log('❌ Certificats non trouvés. Lance d\'abord:');
  console.log('   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=TMscanner" -addext "subjectAltName=IP:192.168.1.72"');
  process.exit(1);
}

const options = {
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem'),
};

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

const server = https.createServer(options, (req, res) => {
  let urlPath = req.url.split('?')[0].split('#')[0];
  let filePath = path.join(WEB_DIR, urlPath);

  // SPA: si pas un fichier, servir index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(WEB_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
  }

  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${req.method} ${urlPath}`);
});

server.listen(PORT, '0.0.0.0', () => {
  // Détecter l'IP locale
  const nets = require('os').networkInterfaces();
  let localIP = '192.168.1.72';
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }

  console.log('\n🎫 TMscanner HTTPS Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📱 iPhone:  https://${localIP}:${PORT}`);
  console.log(`💻 Mac:     https://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Sur iPhone Safari: Accepter le certificat');
  console.log('Ctrl+C pour arrêter\n');
});
