const fs = require("fs");
const path = require("path");

const HASH_FILE = path.join(process.cwd(), "telesto-update.hash.txt");

function readLocalHash() {
    if (!fs.existsSync(HASH_FILE)) return null;
    return fs.readFileSync(HASH_FILE, "utf8");
}

function saveLocalHash(hash) {
    fs.writeFileSync(HASH_FILE, hash);
}

module.exports = { readLocalHash, saveLocalHash };
