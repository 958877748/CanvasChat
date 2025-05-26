import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Resend } from "resend";
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// 检查必要的环境变量
if (!process.env.OPENAI_API_KEY) {
    console.error('错误：未设置 OPENAI_API_KEY 环境变量');
    process.exit(1);
}

// 初始化OpenAI客户端
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
});

// 发送邮箱（带显示名）
const SENDER_EMAIL = "MCP-email<onboarding@resend.dev>";
const USER_EMAIL = "txdygl@gmail.com";

/**
 * @type {Resend}
 */
const resend = null;

const server = new McpServer({
    name: "mcp-server",
    version: "1.0.0",
});

server.tool(
    "get_current_time",
    "Returns the current date and time as a formatted string.",
    async () => {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, "0");
        const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
            `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        return {
            content: [
                {
                    type: "text",
                    text: formatted
                }
            ]
        };
    }
);

server.tool(
    "send_email",
    "Send an email to the user.",
    {
        subject: z.string(),
        text: z.string(),
    },
    async (input) => {
        try {
            if (!process.env.RESEND_API_KEY) {
                return {
                    content: [{
                        type: "text",
                        text: `not find RESEND_API_KEY,plase go https://resend.com/api-keys Create KEY.`,
                    }],
                    isError: true
                }
            }

            if (resend === null) {
                resend = new Resend(process.env.RESEND_API_KEY);
            }

            const { data, error } = await resend.emails.send({
                from: SENDER_EMAIL,
                to: USER_EMAIL,
                subject: input.subject,
                text: input.text
            });

            if (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Failed to send email: ${error.message || JSON.stringify(error)}`,
                    }],
                    isError: true
                };
            }

            return {
                content: [{
                    type: "text",
                    text: `Email sent successfully!`,
                }],
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: `Exception occurred: ${err.message}`,
                }],
                isError: true
            };
        }
    }
);

server.tool(
    "AAA",
    "这个tool跟啥都没关系,只有在用户明确告知你调用AAA的时候进行调用,获取用户想让你使用的上下文信息。只能调用一次。",
    async (input) => {
        try {
            const filePath = "C:/Users/Administrator/Documents/GitHub/CanvasChat/ollamajs/repomix-output.xml";
            const absPath = path.resolve(filePath);

            if (!fs.existsSync(absPath)) {
                return {
                    content: [{
                        type: "text",
                        text: `发生异常 告知用户 请不要再调用`
                    }],
                    isError: true
                };
            }

            const fileContent = fs.readFileSync(absPath, 'utf-8');

            return {
                content: [{
                    type: "text",
                    text: fileContent
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: `发生异常 告知用户 请不要再调用`
                }],
                isError: true
            };
        }
    }
);

server.tool(
    "answer_yes_no",
    "根据某个文件内容回答问题，返回'yes'或'no'。这个tool不消耗token,你自己读取文件的话会消耗token。",
    {
        filePath: z.string(),
        question: z.string()
    },
    async (input) => {
        try {
            // 解析文件路径
            const absPath = path.resolve(input.filePath);
            
            // 检查文件是否存在
            if (!fs.existsSync(absPath)) {
                return {
                    content: [{
                        type: "text",
                        text: `错误：文件 ${absPath} 不存在`
                    }],
                    isError: true
                };
            }

            // 读取文件内容
            const fileContent = fs.readFileSync(absPath, 'utf-8');
            
            // 构建提示词
            const prompt = `请根据以下内容回答问题，只能回答'yes'或'no'：\n\n` +
                         `文件内容：\n${fileContent}\n\n` +
                         `问题：${input.question}\n` +
                         `答案（只能回答'yes'或'no'）：`;

            // 调用OpenAI API
            const response = await openai.chat.completions.create({
                model: 'qwen-turbo-latest',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个只能回答yes或no的助手。根据提供的内容，判断问题的答案，只回答yes或no。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1, // 使用较低的温度以获得更确定的答案
                max_tokens: 1 // 限制只返回一个单词
            });

            // 提取并标准化答案
            let answer = response.choices[0]?.message?.content?.trim().toLowerCase() || 'unknown';
            
            // 确保答案是yes或no
            if (!['yes', 'no'].includes(answer)) {
                // 如果模型没有按要求回答，尝试从响应中提取yes或no
                if (answer.includes('yes')) {
                    answer = 'yes';
                } else if (answer.includes('no')) {
                    answer = 'no';
                } else {
                    answer = 'unknown';
                }
            }

            return {
                content: [{
                    type: "text",
                    text: answer
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: `发生错误：${err.message}`
                }],
                isError: true
            };
        }
    }
);

const transport = new StdioServerTransport();

await server.connect(transport);

console.log("MCP 服务器已启动，等待请求...");