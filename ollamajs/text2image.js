const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { mkdir } = require('fs').promises;

const AKEY = 'your_api_key_here'; // 替换为您的 API 密钥

const API_URL = "https://api-inference.huggingface.co/models/glif/90s-anime-art";
const headers = {
  "Authorization": `Bearer hf_${AKEY}`,
  "x-use-cache": "False",
};

const input = `
Create the main game panel for a match-3 puzzle game, designed in an anime style. The panel should include the following elements:
Match-3 5x6Grid:
Each cell contains a game item. The items is Tomatoes, blueberries, bananas, green apples, purple grapes
`;

async function query(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: new URL(API_URL).hostname,
      path: new URL(API_URL).pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': headers.Authorization,
        'x-use-cache': headers['x-use-cache'],
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = [];
      res.on('data', (chunk) => {
        data.push(chunk);
      });
      res.on('end', () => {
        resolve(Buffer.concat(data));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function myFunction() {
  console.log("函数被调用了");

  try {
    const imageBytes = await query({
      inputs: input,
      parameters: {
        width: 720,
        height: 1280,
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const imagePath = path.join(__dirname, `image_${timestamp}.jpg`);
    await mkdir(path.dirname(imagePath), { recursive: true });

    fs.writeFileSync(imagePath, imageBytes);

    console.log("生成完成");
  } catch (error) {
    console.error("生成失败:", error);
  }
}

myFunction();
