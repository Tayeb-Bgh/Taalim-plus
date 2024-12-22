const { app, BrowserWindow } = require('electron');
const path = require('path');

require('electron-reload')(__dirname, {
    electron: require(`${__dirname}/node_modules/electron`)
});


function createWindow() {
    const win = new BrowserWindow({
        width: 1300,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
            
        }
    });

    win.loadURL('http://localhost:3000');
}
app.disableHardwareAcceleration(); // Ajoute pour tester si c'est mieux ou pire

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
