import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  reload: () => ipcRenderer.send('reload-app'),

  // ----- Auto-updater bridge -----
  // Renderer → Main: trigger restart & install
  restartAndInstall: () => ipcRenderer.send('update-action', 'restart'),
  // Renderer → Main: dismiss the update banner
  dismissUpdate: () => ipcRenderer.send('update-action', 'dismiss'),

  // Main → Renderer: receive download progress { percent, bytesPerSecond, total, transferred }
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data));
  },

  // Main → Renderer: update fully downloaded, ready to install
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
});

console.log('FlowDesk Preload Bridge Initialized');
