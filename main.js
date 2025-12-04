const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const menuTemplate = [
  {
    label: "File",
    submenu: [
      { role: "quit" }
    ]
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
          const html = `<h2><i class="bi bi-chat-dots-fill"></i> Opensource Messaging Platform</h2><p><strong>Textcat</strong> is built using <a href="https://go.dev/" target="_blank"><i class="bi bi-cpu-fill"></i> <b>Golang</b></a> on the server side, providing performance, reliability, and simplicity.</p><h2><i class="bi bi-code-slash"></i> Custom Clients</h2><p>You can create your own custom clients using <i class="bi bi-filetype-js"></i> JavaScript, <i class="bi bi-filetype-lua"></i> Lua, <i class="bi bi-filetype-py"></i> Python, or any other language you prefer. Textcat provides a simple and open protocol that makes it easy to integrate and extend.</p><h2><i class="bi bi-github"></i> Star us on GitHub</h2><p>We’d love your support! Check out the official client branch on GitHub: <a href="https://github.com/gitipedras/textcat/tree/client" target="_blank"><i class="bi bi-github"></i> GitHub (official client branch)</a></p><h2><i class="bi bi-people-fill"></i> Contribute & Join the Community</h2><p>Textcat is open source and community-driven. Contributions, ideas, and feedback are always welcome! Join us to make messaging more open and customizable for everyone.</p>
`
          aboutWin.loadURL("data:text/html,<p>About Textcat</p><br>" + html);
        }
      }
    ]
  }
];


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
      contextIsolation: false, // needed if your client.js uses Node features
    },
  });

  win.loadFile('src/index.html');
}

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu)

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

