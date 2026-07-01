const { app, BrowserWindow } = require('electron');
const path = require('path');

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});