const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

app.whenReady().then(() => {
  const open = () => {
    const win = new BrowserWindow({
      width: 1480, height: 980, minWidth: 840, minHeight: 680,
      title: 'River Club', backgroundColor: '#111817',
      autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  };
  open();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) open(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
