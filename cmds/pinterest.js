const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8')); // Load configuration

const api_key = "b640e04c-2b90-434b-91d7-fdd90650e0bf";

module.exports = {
    name: 'pinterest',
    description: 'Fetch images based on a prompt from Pinterest',
    async execute(api, event, args) {
        const prompt = args.join(' ');

        if (!prompt) {
            api.sendMessage(`Please provide a prompt.\nUsage: ${config.prefix}pinterest <your prompt>`, event.threadID, event.messageID);
            return;
        }

        api.sendMessage("Fetching image(s), please wait...", event.threadID, event.messageID);

        try {
            // Fetch images from the Pinterest API
            const url = `https://kaiz-apis.gleeze.com/api/pinterest?search=${encodeURIComponent(prompt)}&apikey=${api_key}`;
            const response = await axios.get(url, { timeout: 15000 }); // 15s timeout

            if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
                const images = response.data.data;
                const imagePaths = [];

                for (const imageUrl of images) {
                    try {
                        const imageResponse = await axios.get(imageUrl, { 
                            responseType: 'arraybuffer',
                            timeout: 10000 // 10s timeout per image
                        });
                        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

                        const tempFilePath = path.join(__dirname, `temp_image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`);
                        fs.writeFileSync(tempFilePath, imageBuffer);
                        imagePaths.push(tempFilePath);
                    } catch (err) {
                        console.error(`Failed to download image: ${imageUrl}`, err.message || err);
                        // Continue to next image
                    }
                }

                if (imagePaths.length === 0) {
                    api.sendMessage("Failed to download any images. The source may be unreachable or blocked from this server.", event.threadID, event.messageID);
                    return;
                }

                // Send all images back to the user in one message
                const attachments = imagePaths.map(imagePath => fs.createReadStream(imagePath));

                api.sendMessage({
                    body: `Here are the images for "${prompt}":`,
                    attachment: attachments
                }, event.threadID, (err) => {
                    // Clean up temp files
                    imagePaths.forEach(imagePath => {
                        fs.unlink(imagePath, (e) => {
                            if (e) console.error("Failed to remove temp image:", imagePath, e.message || e);
                        });
                    });
                    if (err) {
                        console.error("Error sending the images:", err.message || err);
                        api.sendMessage("Error sending the images. Please try again later.", event.threadID);
                    }
                });

            } else {
                api.sendMessage("No images found for the given prompt.", event.threadID, event.messageID);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                api.sendMessage("The request timed out. The source API or image server may be slow or unreachable from this server.", event.threadID, event.messageID);
            } else {
                console.error("Error fetching images:", error);
                api.sendMessage("There was an error processing your request. Please try again later.", event.threadID, event.messageID);
            }
        }
    }
};
