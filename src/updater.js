// src/updater.js (RENDERER)

const { ipcRenderer } = require("electron");

async function init() {
    const info = await ipcRenderer.invoke("updater:getInfo");

    if (!info) {
        document.getElementById("info").textContent =
            "No update available.";
        return;
    }

    document.getElementById("info").textContent =
        "An update is available.";
}

document.getElementById("updateNow").onclick = async () => {
    document.getElementById("info").textContent =
        "Downloading and installing update...";

    await ipcRenderer.invoke("updater:start");
};

document.getElementById("later").onclick = () => {
    window.close();
};

init();
