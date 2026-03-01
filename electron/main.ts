import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './database';
import { registerAllHandlers } from './ipc';
import { schedulerService } from './services/scheduler';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle close to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Send maximize state changes to renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximize-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximize-change', false);
  });

  return mainWindow;
}

// Window control IPC handlers
function registerWindowControls() {
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-toggle-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow?.close();
  });
}

function createTray() {
  // Create a simple tray icon (you should replace with actual icon)
  const icon = nativeImage.createEmpty();

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: '뉴스 수집',
      click: async () => {
        try {
          await schedulerService.triggerNewsCollection();
        } catch (error) {
          console.error('Failed to trigger news collection:', error);
        }
      },
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Web3 Security News Agent');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

// Extend app type for isQuitting property
declare module 'electron' {
  interface App {
    isQuitting: boolean;
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Initialize isQuitting flag
  app.isQuitting = false;
  // Initialize database (async for sql.js)
  console.log('Initializing database...');
  await initDatabase();

  // Register window control handlers
  registerWindowControls();

  // Create the main window
  const win = createWindow();

  // Register all IPC handlers
  registerAllHandlers(win);

  // Create system tray
  createTray();

  // Start scheduler
  console.log('Starting scheduler...');
  schedulerService.start();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  app.isQuitting = true;
  console.log('Stopping scheduler...');
  schedulerService.stop();
  console.log('Closing database...');
  closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
