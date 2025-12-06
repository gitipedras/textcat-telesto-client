const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

/* -------------------------
       DYNAMIC MENUS
--------------------------*/

let profiles = ['Default_Server'];
let activeProfile = 'Default_Server';
let win = null;

function buildProfilesSubmenu() {
    const submenu = [];

    submenu.push({
        label: "Add Server",
        click: () => {
            const name = "Server_" + (profiles.length + 1);
            profiles.push(name);
            activeProfile = name;
            rebuildMenu();
            win.webContents.send('profile-changed', name);
        }
    });

    submenu.push({ type: "separator" });

    if (profiles.length === 0) {
        submenu.push({ label: "(No servers)", enabled: false });
    } else {
        profiles.forEach(name => {
            submenu.push({
                label: name + (name === activeProfile ? " ✔" : ""),
                click: () => {
                    activeProfile = name;
                    rebuildMenu();
                    win.webContents.send('profile-changed', name);
                }
            });
        });
    }

    return submenu;
}

function rebuildMenu() {
    const menu = Menu.buildFromTemplate([
        {
            label: "Telesto",
            submenu: [
                { role: "quit" }
            ]
        },

        {
            label: "Servers",
            submenu: buildProfilesSubmenu()
        },

        {
            label: "Help",
            submenu: [
                {
                    label: "Docs/Help",
                    click: () => {
                        require("electron").shell.openExternal("https://github.com/gitipedras/textcat");
                    }
                },
                {
                    label: "About",
                    click: () => {
                        const aboutWin = new BrowserWindow({
                            width: 600,
                            height: 500,
                            title: "About"
                        });

                        const html = `<p>Telesto client is an official textcat client made using javascript and electron</p> 
                        <br><br> 
                        <p>Source code: github.com/gitipedras/textcat-telesto-client</p>
                        <br>
                        <p>Named after the Saturn moon 'Telesto'</p>`;

                        aboutWin.loadURL("data:text/html,<p>About Telesto</p><br>" + html);
                    }
                }
            ]
        }
    ]);

    Menu.setApplicationMenu(menu);
}

/* -------------------------
      MAIN WINDOW
--------------------------*/

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(__dirname, "icons/icon.png"),
        width: 900,
        height: 600,
        resizable: true,
        frame: true,
        transparent: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Load your main HTML
    win.loadFile('src/index.html');

    // Open DevTools
    win.webContents.openDevTools({ mode: 'detach' });

    rebuildMenu();

    return win;
}

/* -------------------------
         APP LOGIC
--------------------------*/

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
