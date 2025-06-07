const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');

let config;
try {
    config = JSON.parse(await fs.readFile('config.json', 'utf8'));
} catch (e) {
    config = { prefix: '!' }; // fallback
}

const api_key = "b640e04c-2b90-434b-91d7-fdd90650e0bf";

module.exports = {
    name: 'pinterest',
    description: 'Fetch images based on a prompt from Pinterest',
    async execute(api, event, args) {
        const prompt = args.join(' ').trim();

        if (!prompt) {
            api.sendMessage(
                `Please provide a prompt.\nUsage: ${config.prefix}pinterest <your prompt>`,
                event.threadID,
                event.messageID
            );
            return;
        }

        api.sendMessage("Fetching image(s), please wait...", event.threadID, event.messageID);

        let response;
        try {
            const url = `https://kaiz-apis.gleeze.com/api/pinterest?search=${encodeURIComponent(prompt)}&apikey=${api_key}`;
            response = await axios.get(url, { timeout: 15000 });
        } catch (err) {
            api.sendMessage(
                "Failed to fetch Pinterest API. Please check your API key or network connection.",
                event.threadID,
                event.messageID
            );
            return;
        }

        // Log the raw API response for debugging
        if (!response.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
            api.sendMessage(
                "No images found for the given prompt.",
                event.threadID,
                event.messageID
            );
            return;
        }

        const images = response.data.data;
        const imagePaths = [];

        // Log the images array for debugging
        console.log('Pinterest images:', images);

        // Download images
        for (const [i, imageUrl] of images.entries()) {
            try {
                const imageResponse = await axios.get(imageUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                const imageBuffer = Buffer.from(imageResponse.data, 'binary');
                const tempFilePath = path.join(__dirname, `temp_image_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.jpg`);
                await fs.writeFile(tempFilePath, imageBuffer);
                imagePaths.push(tempFilePath);
            } catch (err) {
                console.error(`Failed to download image (${imageUrl}):`, err.message || err);
            }
        }

        if (imagePaths.length === 0) {
            api.sendMessage(
                "Failed to download any images. The source may be unreachable or blocked from this server.",
                event.threadID,
                event.messageID
            );
            return;
        }

        // Send all images back to the user in one message
        try {
            const attachments = imagePaths.map(imagePath => createReadStream(imagePath));
            api.sendMessage({
                body: `Here are the images for "${prompt}":`,
                attachment: attachments
            }, event.threadID, async (err) => {
                // Clean up temp files
                for (const imagePath of imagePaths) {
                    try {
                        await fs.unlink(imagePath);
                    } catch (e) {
                        console.error("Failed to remove temp image:", imagePath, e.message || e);
                    }
                }
                if (err) {
                    console.error("Error sending the images:", err.message || err);
                    api.sendMessage("Error sending the images. Please try again later.", event.threadID);
                }
            });
        } catch (sendErr) {
            console.error('Failed to send message with images:', sendErr);
            api.sendMessage(
                "There was an error sending the images. Please try again later.",
                event.threadID
            );
            // Cleanup temp files
            for (const imagePath of imagePaths) {
                try { await fs.unlink(imagePath); } catch(e) {}
            }
        }
    }
};
