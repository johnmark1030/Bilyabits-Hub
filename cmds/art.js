// /cmds/art.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const api_key = "b640e04c-2b90-434b-91d7-fdd90650e0bf";

module.exports = {
    name: 'art',
    description: 'Generate an AI image based on the provided prompt',
    async execute(api, event, args) {
        const prompt = args.join(' ');

        if (!prompt) {
            api.sendMessage(`Please provide a prompt for the image.\nUsage: ${config.prefix}art <your prompt>`, event.threadID, event.messageID);
            return;
        }

        api.sendMessage("Generating your image, please wait...", event.threadID, event.messageID);

        try {
            // Call the new API to get the generated image URL
            const url = `https://kaiz-apis.gleeze.com/api/flux-replicate?prompt=${encodeURIComponent(prompt)}&apikey=${api_key}`;
            const response = await axios.get(url);
            
            // The API response is the image URL
            const imageUrl = typeof response.data === "string" ? response.data : response.data.image || response.data.url;

            if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
                api.sendMessage("Failed to generate the image. Please try again later.", event.threadID, event.messageID);
                return;
            }

            // Download the generated image
            const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResp.data, 'binary');
            const tempFilePath = path.join(__dirname, `temp_art_${Date.now()}.png`);
            fs.writeFileSync(tempFilePath, imageBuffer);

            api.sendMessage({
                body: `Image generated for "${prompt}":`,
                attachment: fs.createReadStream(tempFilePath)
            }, event.threadID, (err) => {
                fs.unlinkSync(tempFilePath);
                if (err) {
                    console.error("Error sending the image:", err);
                }
            });
        } catch (error) {
            console.error("Error fetching image:", error);
            api.sendMessage("There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
