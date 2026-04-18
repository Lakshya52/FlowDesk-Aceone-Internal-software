import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { autoUpdater } from 'electron-updater';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://flowdesk-frontend-g35x.onrender.com';
const IS_DEV = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let loadingWindow: BrowserWindow | null = null;
let updateOverlay: BrowserWindow | null = null;

// ─── Auto-updater configuration ────────────────────────────────────────────
autoUpdater.autoDownload = true;          // Download silently in background
autoUpdater.autoInstallOnAppQuit = true;  // Install when user quits normally

// ─── Loading splash window ─────────────────────────────────────────────────
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadingWindow.loadFile(path.join(__dirname, '../assets/loading.html'));
  loadingWindow.on('closed', () => (loadingWindow = null));
}

// ─── Main app window ───────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
  });

  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.once('ready-to-show', () => {
    if (loadingWindow) loadingWindow.close();
    mainWindow?.show();
    mainWindow?.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (updateOverlay) {
      updateOverlay.close();
      updateOverlay = null;
    }
  });

  // Keep overlay anchored when main window moves/resizes
  mainWindow.on('move', repositionOverlay);
  mainWindow.on('resize', repositionOverlay);

  ipcMain.on('reload-app', () => mainWindow?.reload());
}

// ─── Update overlay (banner shown inside the app window) ──────────────────
function createUpdateOverlay() {
  if (!mainWindow || updateOverlay) return;

  const [x, y] = mainWindow.getPosition();
  const [w] = mainWindow.getSize();

  updateOverlay = new BrowserWindow({
    width: w,
    height: 56,
    x,
    y,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  updateOverlay.loadFile(path.join(__dirname, '../assets/update-overlay.html'));

  // Handle overlay IPC actions
  ipcMain.on('update-action', (_event, action: string) => {
    if (action === 'restart') {
      autoUpdater.quitAndInstall(false, true);
    } else if (action === 'dismiss') {
      updateOverlay?.close();
      updateOverlay = null;
    }
  });
}

function repositionOverlay() {
  if (!mainWindow || !updateOverlay) return;
  const [x, y] = mainWindow.getPosition();
  const [w] = mainWindow.getSize();
  updateOverlay.setPosition(x, y);
  updateOverlay.setSize(w, 56);
}

function sendToOverlay(channel: string, data?: any) {
  if (updateOverlay) {
    updateOverlay.webContents.send(channel, data);
  }
}

// ─── Auto-updater events ───────────────────────────────────────────────────
function setupAutoUpdater() {
  // Check for updates every 30 minutes while running
  const CHECK_INTERVAL_MS = 30 * 60 * 1000;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[Updater] Update available: v${info.version}`);
    createUpdateOverlay();
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] App is up to date.');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] Download progress: ${Math.round(progress.percent)}%`);
    sendToOverlay('download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[Updater] Update downloaded: v${info.version}`);
    sendToOverlay('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err);

    // Only show a dialog if an overlay was open (i.e., user was aware of the update)
    if (updateOverlay) {
      updateOverlay.close();
      updateOverlay = null;
      dialog.showErrorBox(
        'Update Failed',
        `Could not download the update. Please try again later.\n\n${err.message}`
      );
    }
  });

  // Initial check
  if (!IS_DEV) {
    autoUpdater.checkForUpdates();
    setInterval(() => {
      if (!IS_DEV) autoUpdater.checkForUpdates();
    }, CHECK_INTERVAL_MS);
  }
}

// ─── App lifecycle ─────────────────────────────────────────────────────────
app.on('ready', () => {
  Menu.setApplicationMenu(null);
  createLoadingWindow();
  createMainWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createMainWindow();
});

export default app;
