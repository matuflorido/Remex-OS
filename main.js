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
});

// --- NUEVA LÓGICA DEL ACTUALIZADOR MANUAL ---
let isManualCheck = false;

// Evento: Cuando NO hay actualización
autoUpdater.on('update-not-available', () => {
  if (isManualCheck) {
    isManualCheck = false; // Reiniciar bandera
    const { dialog } = require('electron');
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualizador de Remex OS',
      message: 'Ya tienes la versión más reciente del sistema instalada.'
    });
  }
});

// Evento: Cuando SÍ hay actualización
autoUpdater.on('update-available', () => {
  if (isManualCheck) {
    const { dialog } = require('electron');
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización encontrada',
      message: 'Se está descargando la nueva versión de forma invisible. Te avisaremos cuando esté lista para instalarse.'
    });
  }
});

// Escuchar el botón manual de "Buscar Actualización" desde React
ipcMain.on('check-for-updates-manual', () => {
  isManualCheck = true; // Avisar que fue el usuario quien hizo clic
  autoUpdater.checkForUpdates().catch(err => {
    isManualCheck = false;
    const { dialog } = require('electron');
    dialog.showErrorBox('Error de Actualización', 'Detalle técnico: ' + err.message);
  });
});
// --- FIN NUEVA LÓGICA ---

// Manejar la descarga completada (automático)
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

// Escuchar el botón manual de "Buscar Actualización" desde React
ipcMain.on('check-for-updates-manual', () => {
  autoUpdater.checkForUpdates().then((result) => {
    if (!result || !result.updateInfo) {
      const { dialog } = require('electron');
      dialog.showMessageBox({
        type: 'info',
        title: 'Actualizador',
        message: 'Ya tienes la versión más reciente del sistema instalada.'
      });
    }
  }).catch(err => {
    const { dialog } = require('electron');
    dialog.showErrorBox('Error de Actualización', 'Detalle técnico: ' + err.message);
  });
});

// Puente para disparar notificaciones nativas desde React
ipcMain.on('show-native-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title,
      body: body
    }).show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});