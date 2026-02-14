import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { AppState } from '../types';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'appData.json');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

if (process.platform === 'win32') {
  app.setAppUserModelId('Gestión Académica IAEV');
}

function readData(): Partial<AppState> {
  try {
    if (fs.existsSync(dataFilePath)) {
      const rawData = fs.readFileSync(dataFilePath, 'utf-8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    log.error('Failed to read data file:', error);
  }
  return {};
}

function writeData(data: AppState): void {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    log.error('Failed to write data file:', error);
  }
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    icon: path.join(__dirname, isDev ? '../../public/logo.png' : '../dist/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    console.log(`[ELECTRON] Cargando servidor de desarrollo: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    console.log(`[ELECTRON] Cargando archivo de producción (dist/index.html)`);
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
    }
  });
  
  // Auto Updater Events
  autoUpdater.on('checking-for-update', () => { log.info('Checking for update...'); });
  autoUpdater.on('update-available', (info) => {
    log.info('Update available.', info);
    mainWindow.webContents.send('update_available');
  });
  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.', info);
    mainWindow.webContents.send('update_not_available');
  });
  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('download_progress', progressObj.percent);
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded', info);
    mainWindow.webContents.send('update_downloaded');
  });
  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater. ' + err);
    mainWindow.webContents.send('update_error', err.message);
  });
};

app.whenReady().then(() => {
  ipcMain.handle('get-data', () => readData());
  ipcMain.handle('save-data', (_, data: AppState) => writeData(data));
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.on('restart_app', () => autoUpdater.quitAndInstall());
  ipcMain.on('check_for_updates', () => { if(!isDev) autoUpdater.checkForUpdates(); });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});