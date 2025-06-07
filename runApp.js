const fs = require("fs");
const wiegine = require("ws3-fca");
const express = require("express");
const app = express();

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const port = config.port || 3000;

// Load commands from the cmds folder
const commandFiles = fs.readdirSync('./cmds').filter(file => file.endsWith('.js'));
console.log("\n\n\n");
console.log("=====COMMANDS LOADED=====");
console.log("====={}=====");
commandFiles.forEach(file => {
    console.log(`[~] ${file.replace('.js', '')}`);
});
console.log("====={}=====");
console.log("\n\n\n");

// Load command modules into an object
const commands = {};
commandFiles.forEach(file => {
    const command = require(`./cmds/${file}`);
    commands[command.name] = command;
});

// Read the cookie string from appstate.txt
let cookie;
try {
    cookie = fs.readFileSync("appstate.txt", "utf8").trim();
    if (!cookie) throw new Error("appstate.txt is empty or invalid.");
} catch (error) {
    console.error("Failed to load a valid appstate.txt:", error);
    process.exit(1);
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
    if (err) return console.error("Login failed:", err);

    // Save the session (cookie) back to appstate.txt after login
    try {
        fs.writeFileSync("appstate.txt", cookie, "utf-8");
        console.log("Saved session cookie to appstate.txt");
    } catch (e) {
        console.error("Failed to save appstate.txt:", e);
    }

    // Function to change bot's bio
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
    console.log("[ Bilyabits-Hub ] Refreshing fb_dtsg every 1 hour");

    // Notify the user that the bot is online with basic information
    const adminUserThread = config.adminID;
    const botID = api.getCurrentUserID();
    api.sendMessage(
        `I am online!\nBot Owner Name: ${config.botOwnerName}\nBot ID: ${botID}`,
        adminUserThread
    );

    // Refresh fb_dtsg every hour
    const refreshInterval = 60 * 60 * 1000;
    setInterval(() => {
        if (api.refreshFb_dtsg) {
            api.refreshFb_dtsg();
            console.log("Refreshed fb_dtsg at:", new Date().toLocaleString());
        }
    }, refreshInterval);

    // =============== BUILT-IN AND COMMAND HANDLING ===============
    function handleBuiltInCommands(api, event) {
        const msg = event.body ? event.body.trim() : "";

        // Reply to "Prefix" or "prefix" (case-insensitive)
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

        // If message is empty, ignore
        if (!message) return;

        // Built-in commands: "Prefix"
        if (handleBuiltInCommands(api, event)) return;

        // If message starts with prefix, process command
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

            // Execute the command
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

        // If message does NOT start with prefix but matches a command name, warn the user to use the prefix
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

        // For any other (gibberish) input, show a warning about invalid input and remind to use prefix
        api.sendMessage(
            `🤖 Unrecognized input.\nAlways use the prefix "${config.prefix}" before commands.\nType "${config.prefix}help" to see available commands.`,
            event.threadID,
            undefined,
            event.messageID
        );
    }

    // =============== LISTEN FOR EVENTS ===============
    api.listenMqtt((err, event) => {
        if (err) return console.error("Error while listening:", err);

        console.log("Event received:", event);

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

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Define a simple route
app.get("/", (req, res) => {
    res.send("Bot is running");
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
