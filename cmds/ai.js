const axios = require('axios');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const roleplay = "You are a helpful assistant called gpt4o.";
const api_key = "12c8883f30b463857aabb5a76a9a4ce421a6497b580a347bdaf7666dc2191e25";

module.exports = {
    name: 'ai',
    description: 'Ask an AI question with gpt4o',
    async execute(api, event, args) {
        const question = args.join(' ');

        if (!question) {
            api.sendMessage(`Please enter a question.\nUsage: ${config.prefix}ai <your question>`, event.threadID, event.messageID);
            return;
        }

        api.sendMessage("Generating...", event.threadID, event.messageID);

        const url = `https://www.haji-mix-api.gleeze.com/api/gpt4o?ask=${encodeURIComponent(question)}&uid=${encodeURIComponent(event.senderID)}&roleplay=${encodeURIComponent(roleplay)}&api_key=${encodeURIComponent(api_key)}`;

        try {
            const response = await axios.get(url);
            if (response.data && response.data.answer) {
                api.sendMessage(`{}=====GPT4o====={}\n\n${response.data.answer}`, event.threadID, event.messageID);
            } else if (response.data && response.data.answer) {
                // If success property missing but API returned response
                api.sendMessage(`{}=====GPT4o====={}\n\n${response.data.answer}`, event.threadID, event.messageID);
            } else {
                api.sendMessage("There was an error processing your request. Please try again later.", event.threadID, event.messageID);
            }
        } catch (error) {
            api.sendMessage("There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
