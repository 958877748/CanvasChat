import { OpenAI } from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    baseURL: process.env.BASE_URL,
    apiKey: process.env.API_KEY,
});

// 定义Zod Schema，描述期望的响应结构
const Step = z.object({
    explanation: z.string(),
    output: z.string(),
});

const MathResponse = z.object({
    steps: z.array(Step),
    final_answer: z.string(),
});

const res = zodResponseFormat(MathResponse, "mathResponse")

// 调用OpenAI聊天接口，并使用zodResponseFormat解析响应
const completion = await openai.beta.chat.completions.parse({
    model: process.env.MODEL,
    messages: [
        {
            role: "system",
            content: "You are a helpful math tutor. You must respond in valid JSON format that matches the provided schema for math responses. The response must be a valid JSON object.",
        },
        {
            role: "user",
            content: "solve 8x + 3 = 21",
        },
    ],
    response_format: res,
});

// 解析后的结构化数据
const message = completion.choices?.message;
if (message?.parsed) {
    console.log("步骤详情:", message.parsed.steps);
    console.log("最终答案:", message.parsed.final_answer);
} else {
    console.log("解析失败或拒绝:", message.refusal);
}

/**
 * @param {string} prompt 
 * @returns {Promise<string>}
 */
export async function callLlm(prompt) {
    const response = await openai.chat.completions.create({
        model: process.env.MODEL,
        messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || "";
}

/**
 * @param {string} prompt
 * @param {T} zodSchema
 * @returns {Promise<T>}
 */
export async function callLlmWithSchema(prompt, zodSchema) {
    const completion = await openai.beta.chat.completions.parse({
        model: process.env.MODEL,
        messages: [
            { role: "user", content: prompt },
        ],
        response_format: zodResponseFormat(root, "root"),
    });

    const root_ = completion.choices[0].message.parsed;

    JSON.stringify(root_)
}
