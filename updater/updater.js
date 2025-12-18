const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { app } = require("electron");

const { fetchRemoteSrcFiles } = require("./github");
const { readLocalHash, saveLocalHash } = require("./storage");

function hashFiles(files) {
    const hash = crypto.createHash("sha256");
    for (const key of Object.keys(files).sort()) {
        hash.update(files[key]);
    }
    return hash.digest("hex");
}

function readLocalSrcFiles(srcPath) {
    const files = {};
    for (const file of fs.readdirSync(srcPath)) {
        const full = path.join(srcPath, file);
        if (fs.statSync(full).isFile()) {
            files["telesto-updater/" + file] = fs.readFileSync(full);
        }
    }
    return files;
}

async function checkForUpdates() {

    const appPath = app.getAppPath();
    const srcPath = path.join(appPath, "telesto-updater/");

    try {
        if (!fs.existsSync(srcPath)) {
            fs.mkdirSync(srcPath);
        }
    } catch (err) {
        console.error(err);
    }


    try {
        console.log("[Updater] Checking for updates…");


        const localFiles = readLocalSrcFiles(srcPath);
        const localHash = hashFiles(localFiles);
        const savedHash = readLocalHash();

        const remoteFiles = await fetchRemoteSrcFiles();
        const remoteHash = hashFiles(remoteFiles);

        if (savedHash === remoteHash) {
            console.log("[Updater] Client is up to date");
            return;
        }

        console.log("[Updater] Update found, applying…");

        // overwrite src/*
        for (const [file, data] of Object.entries(remoteFiles)) {
            const dest = path.join(appPath, file);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, data);
        }

        saveLocalHash(remoteHash);

        console.log("[Updater] Update complete, restarting…");
        app.relaunch();
        app.exit(0);

    } catch (err) {
        console.error("[Updater] Update failed:", err);
    }
}

module.exports = { checkForUpdates };
