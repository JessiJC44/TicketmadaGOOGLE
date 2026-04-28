// TicketMada - Electron Preload Script
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('API_CONFIG', {
    baseURL: 'http://localhost:8000/api'
});

contextBridge.exposeInMainWorld('ELECTRON', {
    isElectron: true
});
