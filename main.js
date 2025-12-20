const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { checkForUpdates } = require("./updater/updater");
const disableUpdates = process.argv.includes("--disable-updates");
const { registerUpdaterIpc } = require("./updater/updater");


function showMenu() {
    const menu = Menu.buildFromTemplate([
        {
            label: "Telesto",
            submenu: [
                { role: "quit" }
            ]
        },
        {
            label: "Developer",
            accelerator: "Ctrl+Shift+I",
            click: (_, win) => {
                win.webContents.toggleDevTools();
                console.log("-> User opened Dev Tools <-")
            }
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Source Code",
                    click: () => {
                        require("electron").shell.openExternal("https://github.com/gitipedras/textcat-telesto-client");
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

    showMenu()

    return win;
}

/* -------------------------
         APP LOGIC
--------------------------*/

app.whenReady().then(async () => {
    registerUpdaterIpc(); // MUST be registered before any renderer loads

    let updateInfo = null;

    if (disableUpdates) {
        console.log("[Updater] Disabled via --disable-updates");
    } else {
        try {
            updateInfo = await checkForUpdates();
            if (updateInfo) {
                console.log("[Updater] Update available:", updateInfo.version);
            }
        } catch (err) {
            console.error("[Updater] Failed:", err);
        }
    }

    const mainWin = createWindow();

    // Show updater window ONLY if update exists
    if (!disableUpdates && updateInfo) {
        createUpdaterWindow();
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});



app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

let updaterWin = null;

function createUpdaterWindow() {
    if (updaterWin) return updaterWin;

    updaterWin = new BrowserWindow({
        width: 480,
        height: 320,
        resizable: false,
        minimizable: false,
        maximizable: false,
        title: "Update Available",
        modal: true,
        parent: win, // main window
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    updaterWin.loadFile("src/updater.html");

    updaterWin.on("closed", () => {
        updaterWin = null;
    });

    return updaterWin;
}
