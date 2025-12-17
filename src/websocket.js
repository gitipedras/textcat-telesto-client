/* ======================
   GLOBAL STATE
====================== */

const newMessagesBtn = document.getElementById("newMessagesBtn");

let userNearBottom = true;
const SCROLL_THRESHOLD = 80; // px


const servers = new Map();
let activeServerId = null;

let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;

    notificationSound.muted = true;

    notificationSound.play()
        .then(() => {
            notificationSound.pause();
            notificationSound.currentTime = 0;
            notificationSound.muted = false;
            console.log("Audio unlocked");
        })
        .catch(err => {
            console.error("Audio unlock failed:", err);
        });
}


// Any user interaction unlocks audio
document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

/* ======================
   DOM
====================== */

const serverBar = document.getElementById("serverBar");
const channelList = document.getElementById("channelList");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const serverNameLabel = document.getElementById("currentServerName");

messagesDiv.addEventListener("scroll", () => {
    const distanceFromBottom =
        messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;

    userNearBottom = distanceFromBottom < SCROLL_THRESHOLD;

    // If user manually scrolls back down, hide the button
    if (userNearBottom) {
        newMessagesBtn.classList.add("hidden");
    }
});

newMessagesBtn.onclick = () => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    newMessagesBtn.classList.add("hidden");
};

if (userNearBottom) {
    requestAnimationFrame(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}




/* ======================
   ERROR DIALOG
====================== */

const errorModal = document.getElementById("errorModal");
const errorTitle = document.getElementById("errorTitle");
const errorMessage = document.getElementById("errorMessage");
const errorCloseBtn = document.getElementById("errorCloseBtn");

errorCloseBtn.onclick = () => {
    errorModal.classList.add("hidden");
};

function showErrorDialog(title, message) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorModal.classList.remove("hidden");
}


/* ======================
   NOTIFICATIONS & SOUND
====================== */

// Preload notification sound
const notificationSound = new Audio("sounds/ping.wav");
notificationSound.volume = 0.6;

// Ask permission once (Electron usually auto-grants)
if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
}

// Helper: show notification
function notifyMessage(server, msg) {
    // don't notify for your own messages
    //if (msg.Username === server.username) return;

    const windowFocused = document.hasFocus();
    const isActiveServer = server.id === activeServerId;
    const isActiveChannel = msg.ChannelID === server.activeChannel;

    // always play sound (even if focused, cuz i want it to pls)
    try {
        notificationSound.currentTime = 0;
        notificationSound.play();
    } catch (e) {
        console.warn("Sound blocked:", e);
    }

    // only show desktop notification if NOT focused
    if (windowFocused && isActiveServer && isActiveChannel) return;

    if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification(`${server.name} • #${msg.ChannelID}`, {
            body: `${msg.Username}: ${msg.Value}`,
            silent: true // sound handled manually
        });

        n.onclick = () => {
            window.focus();
            setActiveServer(server.id);
            switchChannel(server, msg.ChannelID);
        };
    }
}

console.log("Notification permission:", Notification.permission);


/* ======================
   ADD SERVER MODAL
====================== */

const modal = document.getElementById("addServerModal");

addServerBtn.onclick = () => modal.classList.remove("hidden");
cancelServerBtn.onclick = () => modal.classList.add("hidden");

connectServerBtn.onclick = () => {
    createServer(
        serverAddress.value,
        serverUsername.value,
        serverToken.value
    );
    modal.classList.add("hidden");
};

registerServerBtn.onclick = () => {
    const address = serverAddress.value;
    const username = serverUsername.value;
    const password = serverToken.value;

    if (!address || !username || !password) {
        alert("Address, username, and password are required");
        return;
    }

    const ws = new WebSocket(`ws://${address}/ws`);

    ws.onopen = () => {
        const payload = {
            Rtype: "register",
            Username: username,
            SessionToken: password
        };

        console.log("Sent register request to server at", address);
        ws.send(JSON.stringify(payload));
    };

    ws.onmessage = e => {
        console.log("Register response:", e.data);
        alert("Registered! You can now connect.");
        ws.close();
    };

    ws.onerror = err => {
        console.error("Register failed:", err);
        alert("Register failed \n Check address, internet connection \n or check developer console (toolbar)");
    };
};


/* ======================
   SERVER CREATION
====================== */

function createServer(address, username, token) {
    const id = crypto.randomUUID();
    const ws = new WebSocket(`ws://${address}/ws`);

    const server = {
        id,
        address,
        username,
        password: token, // initially password
        sessionToken: null, // later filled by server
        socket: ws,
        name: address,
        channels: new Map(),
        activeChannel: "main",
        loggedIn: false
    };

    servers.set(id, server);
    createServerIcon(server);
    saveServers();


    ws.onopen = () => {
        ws.send(JSON.stringify({
            Rtype: "login",
            Username: server.username,
            SessionToken: server.password // PASSWORD HERE
        }));
    };



    ws.onclose = () => {
        server.icon.style.backgroundColor = "red"; // visually mark disconnected
        appendMessage({ Username: "System", Value: `Server ${server.name} disconnected.` });
    };


    ws.onmessage = e => handleServerMessage(server, JSON.parse(e.data));
}

/* ======================
   MESSAGE HANDLER
====================== */

function handleServerMessage(server, msg) {
    switch (msg.Rtype) {

        case "loginStats":
            if (msg.Status === "ok") {
                server.loggedIn = true;
                server.sessionToken = msg.Value; // SESSION TOKEN
                server.name = msg.ServerName;
                updateServerIcon(server);
                requestChannels(server);
                setActiveServer(server.id);
                document.getElementById("userButton").textContent = server.username;
                document.getElementById("sessionToken").textContent = server.sessionToken;

            }
            break;

        case "invalidInput":
            if (msg.Status === "message") {
                showErrorDialog(
                    "Server",
                    "Your message could not be sent.\n It is probably empty or too long."
                );
            }
            break;


        case "channelList":
            server.channels.clear();

            /* Always include main visually */
            server.channels.set("main", []);

            /* Server-provided channels */
            for (const [name] of Object.entries(msg.ChannelList || {})) {
                if (name !== "main") {
                    server.channels.set(name, []);
                }
            }

            // ensure active channel is set then switch
            if (!server.activeChannel) server.activeChannel = "main";
            switchChannel(server, server.activeChannel);

            renderChannels(server);
            break; // <-- important to prevent fall-through

        case "messageCache":
            if (msg.MsgCache) {
                for (const [user, text] of Object.entries(msg.MsgCache)) {
                    appendMessage({ Username: user, Value: text });
                }
            }
            break;

        case "NewMessage": {
            // resolve channel id robustly
            const channelId = msg.ChannelID ?? msg.Channel ?? msg.ChannelId ?? server.activeChannel;
            const safeChannelId = (typeof channelId === "string" && channelId.length > 0) ? channelId : server.activeChannel;

            // create a message object that always contains ChannelID for later use
            const msgWithChannel = { ...msg, ChannelID: safeChannelId };

            // ensure channel exists and store message
            if (!server.channels.has(safeChannelId)) server.channels.set(safeChannelId, []);
            server.channels.get(safeChannelId).push(msgWithChannel);

            // If the message is for the currently-viewed server+channel, show it in the chat
            if (server.id === activeServerId && safeChannelId === server.activeChannel) {
                appendMessage(msgWithChannel);
            } else {
                // otherwise notify the user (sound + desktop notification)
                notifyMessage(server, msgWithChannel);
            }
            break;
        }


        default:
            // optionally log unknown message types for debugging
            console.warn("Unhandled message type:", msg.Rtype, msg);
            break;
    }
}


/* ======================
   CHANNELS
====================== */

function requestChannels(server) {
    server.socket.send(JSON.stringify({
        Rtype: "channelsList",
        Username: server.username,
        SessionToken: server.sessionToken
    }));
}


function renderChannels(server) {
    channelList.innerHTML = "";

    server.channels.forEach((_, name) => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="#" class="channel-link" data-channel="${name}">${name}</a>`;

        const a = li.firstElementChild;
        if (name === server.activeChannel) a.classList.add("active");

        li.onclick = e => {
            e.preventDefault();
            switchChannel(server, name);
        };

        channelList.appendChild(li);
    });
}


function switchChannel(server, channel) {
    if (!server.loggedIn) return;

    server.activeChannel = channel;
    clearChat();

    server.socket.send(JSON.stringify({
        Rtype: "connect",
        ChannelID: channel,
        Username: server.username,
        SessionToken: server.sessionToken
    }));

    newMessagesBtn.classList.add("hidden");
    userNearBottom = true;


    renderMessages(server);
    renderChannels(server);

}

/* ======================
   MESSAGES
====================== */

function renderMessages(server) {
    clearChat();
    (server.channels.get(server.activeChannel) || []).forEach(appendMessage);
}

const MAX_MESSAGES = 500;

function appendMessage(msg) {
    const div = document.createElement("div");
    div.innerHTML = `<b>${msg.Username}:</b> ${msg.Value}`;
    messagesDiv.appendChild(div);

    while (messagesDiv.children.length > MAX_MESSAGES) {
        messagesDiv.removeChild(messagesDiv.firstChild);
    }

    if (userNearBottom) {
        requestAnimationFrame(() => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
    } else {
        newMessagesBtn.classList.remove("hidden");
    }
}



function clearChat() {
    messagesDiv.innerHTML = "";
}

/* ======================
   SEND MESSAGE
====================== */

messageInput.onkeydown = e => {
    if (e.key !== "Enter") return;

    const server = servers.get(activeServerId);
    if (!server || !server.loggedIn) return;

    server.socket.send(JSON.stringify({
        Rtype: "message",
        ChannelID: server.activeChannel,
        Message: messageInput.value,
        Username: server.username,
        SessionToken: server.sessionToken
    }));


    messageInput.value = "";
};


/* ======================
   SERVER UI
====================== */

function createServerIcon(server) {
    const icon = document.createElement("div");
    icon.className = "server-icon";
    icon.textContent = "?";
    icon.dataset.serverId = server.id;           // store server id on element
    icon.onclick = () => setActiveServer(server.id);
    serverBar.appendChild(icon);
    server.icon = icon;
}


// ======================
// SERVER CONTEXT MENU
// ======================

const serverContextMenu = document.getElementById("serverContextMenu");
let rightClickedServerId = null;

// Right-click on server icon
serverBar.addEventListener("contextmenu", e => {
    e.preventDefault();
    const icon = e.target.closest(".server-icon");
    if (!icon) return;

    rightClickedServerId = icon.dataset.serverId; // now an id string
    serverContextMenu.style.top = `${e.pageY}px`;
    serverContextMenu.style.left = `${e.pageX}px`;
    serverContextMenu.style.display = "block";
});

// Hide menu on click elsewhere
document.addEventListener("click", () => {
    serverContextMenu.style.display = "none";
});

// Disconnect server
document.getElementById("disconnectServer").onclick = () => {
    if (!rightClickedServerId) return;
    const server = servers.get(rightClickedServerId);
    if (!server) return;
    server.socket.close();
    server.icon.style.backgroundColor = "red"; // show disconnected
    serverContextMenu.style.display = "none";
};

// Reload server
document.getElementById("reloadServer").onclick = () => {
    if (!rightClickedServerId) return;
    const server = servers.get(rightClickedServerId);
    if (!server) return;

    const { address, username, password } = server;

    // fully close old connection
    try { server.socket.close(); } catch {}

    // remove old icon + server entry (important)
    if (server.icon?.parentNode) {
        server.icon.parentNode.removeChild(server.icon);
    }
    servers.delete(server.id);

    // reconnect using PASSWORD, not session token
    setTimeout(() => {
        createServer(address, username, password);
    }, 300);

    serverContextMenu.style.display = "none";
};


document.getElementById("removeServer").onclick = () => {
    if (!rightClickedServerId) return;

    const server = servers.get(rightClickedServerId);
    if (!server) return;

    // Close connection
    try { server.socket.close(); } catch {}

    // Remove icon
    if (server.icon?.parentNode) {
        server.icon.parentNode.removeChild(server.icon);
    }

    // Remove from map
    servers.delete(rightClickedServerId);

    // Reset UI if it was active
    if (activeServerId === rightClickedServerId) {
        activeServerId = null;
        channelList.innerHTML = "";
        messagesDiv.innerHTML = "";
        serverNameLabel.textContent = "No Server";
    }

    serverContextMenu.style.display = "none";
};




function updateServerIcon(server) {
    server.icon.textContent = (server.name && server.name.length) ? server.name[0] : "?";
}


function setActiveServer(id) {
    activeServerId = id;

    document.querySelectorAll(".server-icon")
        .forEach(i => i.classList.remove("active"));

    const server = servers.get(id);
    server.icon.classList.add("active");
    serverNameLabel.textContent = server.name;

    renderChannels(server);
    renderMessages(server);
}

function saveServers() {
    const data = Array.from(servers.values()).map(s => ({
        address: s.address,
        username: s.username,
        password: s.password,
        sessionToken: s.sessionToken
    }));
    localStorage.setItem("servers", JSON.stringify(data));
}


(function restoreServers() {
    const saved = JSON.parse(localStorage.getItem("servers") || "[]");
    for (const s of saved) {
        createServer(s.address, s.username, s.password);
    }
})();

