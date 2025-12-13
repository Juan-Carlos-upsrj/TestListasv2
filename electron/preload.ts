import { contextBridge, ipcRenderer } from 'electron';
import type { AppState } from '../types';

contextBridge.exposeInMainWorld('electronAPI', {
  getData: (): Promise<Partial<AppState>> => ipcRenderer.invoke('get-data'),
  saveData: (data: AppState): Promise<void> => ipcRenderer.invoke('save-data', data),
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),
  
  // Update listeners
  onUpdateAvailable: (callback: () => void) => ipcRenderer.on('update_available', callback),
  onUpdateDownloaded: (callback: () => void) => ipcRenderer.on('update_downloaded', callback),
  onUpdateNotAvailable: (callback: () => void) => ipcRenderer.on('update_not_available', callback),
  onUpdateError: (callback: (message: string) => void) => ipcRenderer.on('update_error', (_, message) => callback(message)),
  
  // Actions
  restartApp: () => ipcRenderer.send('restart_app'),
  checkForUpdates: () => ipcRenderer.send('check_for_updates'),
});