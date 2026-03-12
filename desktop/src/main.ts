import { app, BrowserWindow, shell, ipcMain } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { autoUpdater } from 'electron-updater';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://flowdesk-frontend-g35x.onrender.com';
const IS_DEV = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let loadingWindow: BrowserWindow | null = null;

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadingWindow.loadFile(path.join(__dirname, '../assets/loading.html'));
  loadingWindow.on('closed', () => (loadingWindow = null));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until ready
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
  });

  // Load the remote production URL
  mainWindow.loadURL(FRONTEND_URL);

  // Set menu and behavior
  mainWindow.once('ready-to-show', () => {
    if (loadingWindow) {
      loadingWindow.close();
    }
    mainWindow?.show();
    mainWindow?.maximize();
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle reload
  ipcMain.on('reload-app', () => {
    mainWindow?.reload();
  });

  // Check for updates
  if (!IS_DEV) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

app.on('ready', () => {
  createLoadingWindow();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Auto-updater events
autoUpdater.on('update-available', () => {
  console.log('Update available.');
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});
