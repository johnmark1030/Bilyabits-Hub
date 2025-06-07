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
            // Fetch images from the new Pinterest API
            const url = `https://kaiz-apis.gleeze.com/api/pinterest?search=${encodeURIComponent(prompt)}&apikey=${api_key}`;
            const response = await axios.get(url);

            // Check if the response is successful and has data
            if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
                const images = response.data.data;

                // Prepare to send images
                const imagePaths = [];

                for (const imageUrl of images) {
                    // Download each image
                    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

                    // Create a temporary file path
                    const tempFilePath = path.join(__dirname, `temp_image_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`);
                    fs.writeFileSync(tempFilePath, imageBuffer);
                    imagePaths.push(tempFilePath);
                }

                // Send all images back to the user in one message
                const attachments = imagePaths.map(imagePath => fs.createReadStream(imagePath));

                // Send the message with attachments
                api.sendMessage({
                    body: `Here are the images for "${prompt}":`,
                    attachment: attachments // Send all images as attachments
                }, event.threadID, (err) => {
                    // Clean up the temporary files after sending
                    imagePaths.forEach(imagePath => fs.unlinkSync(imagePath));
                    if (err) {
                        console.error("Error sending the images:", err);
                    }
                });
            } else {
                api.sendMessage("No images found for the given prompt.", event.threadID, event.messageID);
            }
        } catch (error) {
            console.error("Error fetching images:", error);
            api.sendMessage("There was an error processing your request. Please try again later.", event.threadID, event.messageID);
        }
    }
};
