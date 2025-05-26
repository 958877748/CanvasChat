const OpenAI = require('openai');
require('dotenv').config();

/**
 * @param {string} prompt 
 * @returns {Promise<string>}
 */
export async function callLlm(prompt) {
    const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "";
}