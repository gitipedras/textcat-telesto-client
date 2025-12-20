// updater/updater.js (MAIN PROCESS)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { app, ipcMain } = require("electron");

const { fetchRemoteSrcFiles } = require("./github");
const { readLocalHash, saveLocalHash } = require("./storage");

let updateInfo = null;

function hashFiles(files) {
    const hash = crypto.createHash("sha256");
    for (const key of Object.keys(files).sort()) {
        hash.update(files[key]);
    }
    return hash.digest("hex");
}

function readLocalSrcFiles(srcPath) {
    const files = {};
    if (!fs.existsSync(srcPath)) return files;

    for (const file of fs.readdirSync(srcPath)) {
        const full = path.join(srcPath, file);
        if (fs.statSync(full).isFile()) {
            files[file] = fs.readFileSync(full);
        }
    }
    return files;
}

async function checkForUpdates() {
    console.log("[Updater] Checking for updates…");

    const appPath = app.getAppPath();
    const srcPath = path.join(appPath, "telesto-updater");

    if (!fs.existsSync(srcPath)) {
        fs.mkdirSync(srcPath, { recursive: true });
    }

    const localFiles = readLocalSrcFiles(srcPath);
    const localHash = hashFiles(localFiles);
    const savedHash = readLocalHash();

    const remoteFiles = await fetchRemoteSrcFiles();
    const remoteHash = hashFiles(remoteFiles);

    if (savedHash === remoteHash) {
        console.log("[Updater] Client is up to date");
        return null;
    }

    updateInfo = {
        hash: remoteHash,
        files: remoteFiles
    };

    return updateInfo;
}

async function applyUpdate() {
    if (!updateInfo) return;

    const appPath = app.getAppPath();

    console.log("[Updater] Applying update…");

    for (const [file, data] of Object.entries(updateInfo.files)) {
        const dest = path.join(appPath, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, data);
    }

    saveLocalHash(updateInfo.hash);

    console.log("[Updater] Update complete, restarting…");
    app.relaunch();
    app.exit(0);
}

function registerUpdaterIpc() {
    ipcMain.handle("updater:getInfo", () => {
        return updateInfo ? { available: true } : null;
    });

    ipcMain.handle("updater:start", async () => {
        await applyUpdate();
    });
}

module.exports = {
    checkForUpdates,
    registerUpdaterIpc
};
