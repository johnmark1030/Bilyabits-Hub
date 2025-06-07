const fs = require("fs");
const wiegine = require("ws3-fca");
const express = require("express");
const path = require("path");
const app = express();

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const port = config.port || 3000;

let botStatus = "OFFLINE";
let apiInstance = null;
let listenStopFunc = null;
let refreshIntervalId = null;
let lastNotifiedBotId = null;

// Serve static files
app.use("/portal", express.static(path.join(__dirname, "portal")));
app.use("/img", express.static(path.join(__dirname, "img")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "portal", "index.html"));
});

app.get("/api/status", (req, res) => {
    res.json({ status: botStatus });
});

app.get("/api/cookie", (req, res) => {
    try {
        const cookie = fs.readFileSync("appstate.txt", "utf8").trim();
        res.json({ cookie });
    } catch {
        res.json({ cookie: "" });
    }
});
app.use(express.json());
app.post("/api/cookie", (req, res) => {
    const { cookie } = req.body;
    if (!cookie || typeof cookie !== "string") {
        return res.json({ success: false, message: "No cookie provided." });
    }
    try {
        fs.writeFileSync("appstate.txt", cookie.trim(), "utf-8");
        res.json({ success: true, message: "Cookie updated successfully." });
    } catch (e) {
        res.json({ success: false, message: "Failed to update cookie." });
    }
});
app.delete("/api/cookie", (req, res) => {
    try {
        fs.writeFileSync("appstate.txt", "", "utf-8");
        res.json({ success: true, message: "Cookie deleted." });
    } catch (e) {
        res.json({ success: false, message: "Failed to delete cookie." });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Load commands
const commandFiles = fs.readdirSync('./cmds').filter(file => file.endsWith('.js'));
console.log("\n\n\n");
console.log("=====COMMANDS LOADED=====");
console.log("====={}=====");
commandFiles.forEach(file => {
    console.log(`[~] ${file.replace('.js', '')}`);
});
console.log("====={}=====");
console.log("\n\n\n");
const commands = {};
commandFiles.forEach(file => {
    const command = require(`./cmds/${file}`);
    commands[command.name] = command;
});

function readCookie() {
    try {
        const cookie = fs.readFileSync("appstate.txt", "utf8").trim();
        if (!cookie) throw new Error("appstate.txt is empty or invalid.");
        return cookie;
    } catch (error) {
        console.error("Failed to load a valid appstate.txt:", error);
        return null;
    }
}

// Clear previous listeners and intervals
function clearBot() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
    if (listenStopFunc) {
        try { listenStopFunc(); } catch {}
        listenStopFunc = null;
    }
    apiInstance = null;
}

function startBot() {
    clearBot();
    const cookie = readCookie();
    if (!cookie) {
        if (botStatus !== "OFFLINE") console.log("[Bilyabits-Hub] Bot status: OFFLINE");
        botStatus = "OFFLINE";
        lastNotifiedBotId = null;
        return;
    }

    wiegine.login(cookie, {
        forceLogin: true,
        listenEvents: true,
        logLevel: "silent",
        updatePresence: true,
        bypassRegion: "PNB",
        selfListen: false,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0",
        online: true,
        autoMarkDelivery: true,
        autoMarkRead: true
    }, (err, api) => {
        if (err) {
            console.error("[Bilyabits-Hub] Login failed:", err);
            if (botStatus !== "OFFLINE") console.log("[Bilyabits-Hub] Bot status: OFFLINE");
            botStatus = "OFFLINE";
            lastNotifiedBotId = null;
            return;
        }
        apiInstance = api;
        botStatus = "ONLINE";
        console.log("[Bilyabits-Hub] Bot status: ONLINE");

        function updateBotBio(api) {
            const bio = `Prefix: ${config.prefix}\nOwner: ${config.botOwner}`;
            api.changeBio(bio, (err) => {
                if (err) {
                    console.error("Failed to update bot bio:", err);
                } else {
                    console.log("Bot bio updated successfully.");
                }
            });
        }
        updateBotBio(api);

        const adminUserThread = config.adminID;
        const botID = api.getCurrentUserID();
        if (lastNotifiedBotId !== botID) {
            api.sendMessage(
                `I am online!\nBot Owner Name: ${config.botOwnerName}\nBot ID: ${botID}`,
                adminUserThread
            );
            lastNotifiedBotId = botID;
        }

        refreshIntervalId = setInterval(() => {
            if (api.refreshFb_dtsg) {
                api.refreshFb_dtsg();
                console.log("Refreshed fb_dtsg at:", new Date().toLocaleString());
            }
        }, 60 * 60 * 1000);

        function handleBuiltInCommands(api, event) {
            const msg = event.body ? event.body.trim() : "";

            if (msg.toLowerCase() === "prefix") {
                api.sendMessage(
                    `The current prefix is: "${config.prefix}"`,
                    event.threadID,
                    undefined,
                    event.messageID
                );
                return true;
            }
            return false;
        }
        function handleCommand(event) {
            const prefix = config.prefix;
            const message = event.body ? event.body.trim() : "";

            if (!message) return;

            if (handleBuiltInCommands(api, event)) return;

            if (message.startsWith(prefix)) {
                const args = message.slice(prefix.length).trim().split(/ +/);
                const commandNameRaw = args.shift();
                const commandName = commandNameRaw ? commandNameRaw.toLowerCase() : "";

                if (!commandName) {
                    api.sendMessage(
                        `No command input, please type "${config.prefix}help" for available commands.`,
                        event.threadID,
                        undefined,
                        event.messageID
                    );
                    return;
                }

                if (!commands[commandName]) {
                    let usageMsg = "⚠️ Invalid command.\n";
                    usageMsg += `Usage: ${prefix}<command>\n`;
                    usageMsg += `Example: ${prefix}help\n`;
                    usageMsg += `Type "${prefix}help" to see the available commands.`;
                    api.sendMessage(
                        usageMsg,
                        event.threadID,
                        undefined,
                        event.messageID
                    );
                    return;
                }

                try {
                    commands[commandName].execute(api, event, args);
                } catch (error) {
                    console.error(`Error executing command ${commandName}:`, error);
                    api.sendMessage(
                        `There was an error executing the ${commandName} command.`,
                        event.threadID,
                        undefined,
                        event.messageID
                    );
                }
                return;
            }

            const splitMessage = message.split(/ +/);
            const msgCommandName = splitMessage[0].toLowerCase();

            if (commands[msgCommandName]) {
                api.sendMessage(
                    `⚠️ Please use the prefix "${config.prefix}" before the command.\nExample: ${config.prefix}${msgCommandName}`,
                    event.threadID,
                    undefined,
                    event.messageID
                );
                return;
            }

            api.sendMessage(
                `🤖 Unrecognized input.\nAlways use the prefix "${config.prefix}" before commands.\nType "${config.prefix}help" to see available commands.`,
                event.threadID,
                undefined,
                event.messageID
            );
        }

        listenStopFunc = api.listenMqtt((err, event) => {
            if (err) return console.error("Error while listening:", err);

            // Log event for debugging
            console.log("Event received:", {
                type: event.type,
                threadID: event.threadID,
                senderID: event.senderID,
                body: event.body
            });

            switch (event.type) {
                case "message":
                    handleCommand(event);
                    break;
                case "event":
                    console.log("Other event type:", event);
                    break;
            }
        });
    });
}

// Watch cookie file for changes, restart bot on update
fs.watchFile("appstate.txt", { interval: 1500 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
        console.log("appstate.txt changed, restarting bot...");
        botStatus = "OFFLINE";
        setTimeout(() => {
            startBot();
        }, 1500);
    }
});

startBot();

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
