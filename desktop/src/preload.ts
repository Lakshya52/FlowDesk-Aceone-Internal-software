import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  reload: () => ipcRenderer.send('reload-app'),
  // You can add more APIs here if the React app needs to call desktop-specific functions
  // Example:
  // sendMessage: (message: string) => ipcRenderer.send('message', message)
});

console.log('FlowDesk Preload Bridge Initialized');
