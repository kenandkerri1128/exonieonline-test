const { contextBridge, ipcRenderer } = require('electron');

// 🛡️ PRELOAD: Expose safe IPC methods to the game's renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Steam ID
    getSteamId: () => ipcRenderer.invoke('get-steam-id'),

    // Fullscreen Toggle (via IPC to main process)
    toggleFullScreen: () => ipcRenderer.send('toggle-fullscreen'),

    // Fullscreen state change listener
    onFsChanged: (callback) => {
        ipcRenderer.on('fs-changed', (event, isFS) => callback(isFS));
    },

    // Steam Microtransaction response listener
    onMicroTxnAuthorizationResponse: (callback) => {
        ipcRenderer.on('steam-payment-result', (event, data) => callback(data.authorized, data.orderId));
    },

    // Initiate Steam purchase (pass-through for renderer)
    initiateSteamPurchase: (orderId) => {
        console.log('[PRELOAD] Steam purchase initiated for order:', orderId);
    }
});
