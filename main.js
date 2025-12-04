const { app, BrowserWindow, Menu, BrowserView } = require('electron');
const path = require('path');

let profileViews = {};
let activeProfile = null;

/* -------------------------
   PROFILE VIEW MANAGEMENT
--------------------------*/

function createProfileView(win, profileName) {
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  profileViews[profileName] = view;

  // Remove existing view before attaching a new one
  if (activeProfile && profileViews[activeProfile]) {
    win.removeBrowserView(profileViews[activeProfile]);
  }

  win.setBrowserView(view);

  const [width, height] = win.getSize();
  view.setBounds({ x: 0, y: 0, width, height });
  view.setAutoResize({ width: true, height: true });

  view.webContents.loadFile('src/index.html', {
    query: { profile: profileName }
  });

  activeProfile = profileName;
  rebuildMenu(win);
}


function switchProfile(win, profileName) {
  const view = profileViews[profileName];
  if (!view) return;

  // Remove currently active view
  if (activeProfile && profileViews[activeProfile]) {
    win.removeBrowserView(profileViews[activeProfile]);
  }

  // Attach the new one
  win.setBrowserView(view);

  const [width, height] = win.getSize();
  view.setBounds({ x: 0, y: 0, width, height });
  view.setAutoResize({ width: true, height: true });

  activeProfile = profileName;
  rebuildMenu(win);
}


/* -------------------------
       DYNAMIC MENUS
--------------------------*/

function buildProfilesSubmenu(win) {
  const submenu = [];

  submenu.push({
    label: "New Profile",
    click: () => {
      const name = "Profile_" + (Object.keys(profileViews).length + 1);
      createProfileView(win, name);
    }
  });

  submenu.push({ type: "separator" });

  const names = Object.keys(profileViews);

  if (names.length === 0) {
    submenu.push({ label: "(No profiles)", enabled: false });
  } else {
    names.forEach(name => {
      submenu.push({
        label: name + (name === activeProfile ? " ✔" : ""),
        click: () => switchProfile(win, name)
      });
    });
  }

  return submenu;
}

function rebuildMenu(win) {
  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        { role: "quit" }
      ]
    },

    {
      label: "Profiles",
      submenu: buildProfilesSubmenu(win)
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
  const win = new BrowserWindow({
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

  createProfileView(win, "Profile_1");
  return win;
}

/* -------------------------
         APP LOGIC
--------------------------*/

app.whenReady().then(() => {
  const win = createWindow();
  rebuildMenu(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow();
      rebuildMenu(newWin);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

