import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Resend } from "resend";

// 发送邮箱（带显示名）
const SENDER_EMAIL = "MCP-email <onboarding@resend.dev>";
const USER_EMAIL = "txdygl@gmail.com";

const resend = new Resend(process.env.RESEND_API_KEY);

const server = new McpServer({
  name: "resend-email-server",
  version: "1.0.0",
});

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

const transport = new StdioServerTransport();

await server.connect(transport);

console.log("MCP Resend 邮件服务器已启动，等待请求...");
