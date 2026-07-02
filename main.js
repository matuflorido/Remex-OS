const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
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

  // NUEVO: Configuración para entrar al repositorio PRIVADO
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'matuflorido',
    repo: 'Remex-OS',
    private: true,
    token: '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'
  });

  // Buscar actualizaciones silenciosamente al iniciar
  autoUpdater.checkForUpdatesAndNotify();
});

// NUEVO: Manejar la descarga completada
    }
  }).catch(err => {
    dialog.showErrorBox(
      'Error de Actualización', 
      'No se pudo buscar actualizaciones. Verifica tu conexión a internet o asegúrate de que el repositorio de GitHub sea Público para esta prueba.'
    );
  });
});

// 3. Manejar la descarga completada (se dispara tanto en auto como en manual)
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Actualización Disponible',
    message: 'Se ha descargado una nueva versión de Remex OS. ¿Deseas reiniciar para instalarla ahora?',
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