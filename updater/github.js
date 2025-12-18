const https = require("https");

const OWNER = "gitipedras";
const REPO = "textcat-telesto-client";
const BRANCH = "stable";

function githubGet(path, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: "api.github.com",
            path,
            headers: {
                "User-Agent": "Telesto-Updater",
                ...extraHeaders
            }
        }, res => {
            let data = "";
            res.on("data", d => data += d);
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error("Invalid JSON from GitHub"));
                }
            });
        }).on("error", reject);
    });
}


async function fetchRemoteSrcFiles() {
    const tree = await githubGet(
        `/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`
    );

    if (!tree.tree || !Array.isArray(tree.tree)) {
        throw new Error(`Invalid tree response: ${tree.message || "unknown error"}`);
    }

    const srcFiles = tree.tree
        .filter(f => f.path.startsWith("src/") && f.type === "blob")
        .sort((a, b) => a.path.localeCompare(b.path));

    const files = {};

    for (const file of srcFiles) {
        const blob = await githubGet(
            `/repos/${OWNER}/${REPO}/git/blobs/${file.sha}`,
            {
                // THIS IS CRITICAL
                "Accept": "application/vnd.github.v3+json"
            }
        );

        if (!blob.content) {
            throw new Error(`Missing blob content for ${file.path}`);
        }

        files[file.path] = Buffer.from(blob.content, "base64");
    }

    return files;
}


module.exports = { fetchRemoteSrcFiles };
