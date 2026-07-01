const { app, BrowserWindow } = require('electron');
const path = require('path');
// NUEVO: Importar autoUpdater
const { autoUpdater } = require('electron-updater');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Remex OS Enterprise",
    autoHideMenuBar: true, // Oculta el menú de "Archivo, Editar, Ver..." de Windows
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Le dice a Electron que cargue el archivo compilado de tu App
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  // NUEVO: Buscar actualizaciones silenciosamente al iniciar
  autoUpdater.checkForUpdatesAndNotify();
});

// NUEVO: Manejar la descarga completada
autoUpdater.on('update-downloaded', (info) => {
  const { dialog } = require('electron');
  
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});