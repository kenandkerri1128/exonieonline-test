const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 🛡️ STEAM MASTER LOCK: Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

let steamworks;
try {
    steamworks = require('steamworks.js');
} catch (e) {
    console.warn("steamworks.js not loaded:", e.message);
}

if (steamworks) {
    try {
        // 🛡️ STEAM MASTER LOCK: Prevent direct execution outside of Steam
        if (steamworks.restartAppIfNecessary(4579730)) {
            app.quit();
            process.exit(0);
        }
    } catch (e) {
        console.error("Steamworks app restart check failed.", e);
    }
}

let mainWindow;
let steamClient;

if (steamworks) {
    try {
        // 🛡️ THE FIX: Explicitly pass your AppID to ensure Steam knows which game this is!
        steamClient = steamworks.init(4579730);
        steamworks.electronEnableSteamOverlay();
        console.log("Steam Connected as:", steamClient.localplayer.getName());
    } catch (e) {
        console.error("Steamworks failed. Ensure Steam is open!", e);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        backgroundColor: '#000000',
        icon: path.join(__dirname, 'icon.ico'),
        fullscreenable: true,          // 🎮 Allows players to maximize the game
        autoHideMenuBar: true,         // 🎮 Removes the ugly white file menu at the top
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            sandbox: false,                    // 🛡️ Allows the Steam Overlay to send the "Purchase Authorized" signal back
            nodeIntegration: false,
            webSecurity: false,
            allowRunningInsecureContent: true,
            images: true
        }
    });

    // Load local index.html
    mainWindow.loadFile(path.join(__dirname, 'public/index.html'));

    // Block F11 and Escape from toggling default fullscreen
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
            if (input.key === 'F11') {
                event.preventDefault();
            }
            if (input.key === 'Escape' && mainWindow.isFullScreen()) {
                event.preventDefault();
                mainWindow.webContents.executeJavaScript(`if(typeof window.toggleSettingsMenu === 'function') window.toggleSettingsMenu();`);
            }
        }
    });

    // Zero-file IPC via page title update for Native Fullscreen
    mainWindow.on('page-title-updated', (event, title) => {
        if (title === 'EXONIE_TOGGLE_FS') {
            event.preventDefault();
            const isFS = !mainWindow.isFullScreen();
            mainWindow.setFullScreen(isFS);
            mainWindow.webContents.executeJavaScript(`
                window.isElectronFS = ${isFS};
                document.title = 'Exonie';
                const fsBtn = document.getElementById('settings-fullscreen-btn');
                if (fsBtn) {
                    fsBtn.innerText = window.isElectronFS ? 'Full Screen: ON' : 'Full Screen: OFF';
                    fsBtn.style.background = window.isElectronFS ? '#4CAF50' : '#333';
                }
            `);
        }
    });

    // If local load fails, retry
    mainWindow.webContents.on('did-fail-load', () => {
        setTimeout(() => mainWindow.loadFile(path.join(__dirname, 'public/index.html')), 5000);
    });

    // 🛡️ Listen for the Steam Overlay response (Authorize or Cancel)
    if (steamClient && steamClient.callback) {
        steamClient.callback.on('MicroTxnAuthorizationResponse', (data) => {
            mainWindow.webContents.send('steam-payment-result', {
                authorized: data.authorized,
                orderId: data.orderId ? data.orderId.toString() : ""
            });
        });
    }
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

ipcMain.handle('get-steam-id', () => {
    if (!steamClient) return null;
    try {
        let rawId = steamClient.localplayer.getSteamId();
        if (typeof rawId === 'bigint') return rawId.toString();
        if (typeof rawId === 'string' || typeof rawId === 'number') return rawId.toString();
        if (rawId && rawId.steamId64) return rawId.steamId64.toString();
        if (rawId && rawId.accountId) return rawId.accountId.toString();
        return null;
    } catch (error) {
        console.error("Steam ID Extraction Error:", error);
        return null;
    }
});

ipcMain.on('toggle-fullscreen', () => {
    if (!mainWindow) return;
    const isFS = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(isFS);
    mainWindow.webContents.send('fs-changed', isFS);
});

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(createWindow);

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}
