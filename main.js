// TicketMada - Electron Main Process
const { app, BrowserWindow } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const http = require('http');

let mainWindow;
let serverProcess;
const PORT = 8000;

// Try PHP first, fall back to Node.js
function startServer() {
    return new Promise((resolve, reject) => {
        // Try PHP first
        try {
            execSync('php --version', { stdio: 'ignore' });
            console.log('Starting PHP server...');
            serverProcess = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'backend/server.php'], {
                cwd: __dirname,
                stdio: ['ignore', 'pipe', 'pipe']
            });
        } catch {
            // Fall back to Node.js
            console.log('PHP not found, starting Node.js server...');
            serverProcess = spawn(process.execPath, ['backend/server-node.js'], {
                cwd: __dirname,
                stdio: ['ignore', 'pipe', 'pipe']
            });
        }

        serverProcess.stdout.on('data', (data) => console.log(`Server: ${data}`));
        serverProcess.stderr.on('data', (data) => console.error(`Server: ${data}`));
        serverProcess.on('error', (err) => reject(err));

        // Wait for server to be ready
        const checkServer = () => {
            const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
                resolve();
            });
            req.on('error', () => {
                setTimeout(checkServer, 200);
            });
            req.setTimeout(500, () => {
                req.destroy();
                setTimeout(checkServer, 200);
            });
        };
        setTimeout(checkServer, 500);
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'TicketMada',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.loadURL(`http://localhost:${PORT}/User/ticketmada-landing.html`);

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        await startServer();
        console.log('Server ready!');
        createWindow();
    } catch (err) {
        console.error('Failed to start server:', err);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (serverProcess) serverProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
});
