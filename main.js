const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Remex OS Enterprise",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

// Configurar el token de GitHub para poder descargar la actualización privada
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'matuflorido',
  repo: 'Remex-OS',
  token: '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'
});

app.whenReady().then(() => {
  // ID de la app para que Windows 10/11 permita lanzar las notificaciones
  app.setAppUserModelId("com.remex.workos");
  
  createWindow();

  // Busca actualizaciones silenciosamente al abrir el programa
  autoUpdater.checkForUpdatesAndNotify();

  // Buscar actualizaciones automáticamente una vez al día (cada 24 horas)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 24 * 60 * 60 * 1000);
});

// --- LÓGICA DEL ACTUALIZADOR MANUAL ---
let isManualCheck = false;

autoUpdater.on('update-not-available', () => {
  if (isManualCheck) {
    isManualCheck = false; // Reiniciar bandera
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualizador de Remex OS',
      message: 'Ya tienes la versión más reciente del sistema instalada.'
    });
  }
});

autoUpdater.on('update-available', () => {
  if (isManualCheck) {
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización encontrada',
      message: 'Se está descargando la nueva versión de forma invisible. Te avisaremos cuando esté lista para instalarse.'
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización Disponible',
    message: 'Se ha descargado una nueva versión de Remex OS. Se instalará automáticamente al cerrar el programa, o puedes reiniciar ahora.',
    buttons: ['Reiniciar y Actualizar', 'Más tarde']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

ipcMain.on('check-for-updates-manual', () => {
  isManualCheck = true; 
  autoUpdater.checkForUpdates().catch(err => {
    isManualCheck = false;
    dialog.showErrorBox('Error de Actualización', 'Detalle técnico: ' + err.message);
  });
});

// --- LÓGICA DE NOTIFICACIONES Y GLOBOS ---

// Puente para disparar notificaciones nativas desde React
ipcMain.on('show-native-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title,
      body: body
    }).show();
  }
});

// Pone un globito rojo con el número en el ícono de la barra de tareas
ipcMain.on('update-badge-count', (event, count) => {
  if (process.platform === 'darwin') {
    app.setBadgeCount(count); // Globito rojo nativo en Mac
  } else if (process.platform === 'win32') {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      // En Windows hace titilar la app en la barra de tareas si hay alertas
      if (count > 0) {
        wins[0].flashFrame(true);
      } else {
        wins[0].flashFrame(false);
      }
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});