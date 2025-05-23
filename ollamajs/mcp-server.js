import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Resend } from "resend";
import fs from 'fs';
import path from 'path';

// 发送邮箱（带显示名）
const SENDER_EMAIL = "MCP-email<onboarding@resend.dev>";
const USER_EMAIL = "txdygl@gmail.com";

const resend = new Resend(process.env.RESEND_API_KEY);

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
            const { subject, text } = input;

            const sendOptions = {
                from: SENDER_EMAIL,
                to: USER_EMAIL,
                subject,
                text
            };

            const { data, error } = await resend.emails.send(sendOptions);

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

const transport = new StdioServerTransport();

await server.connect(transport);

console.log("MCP 服务器已启动，等待请求...");