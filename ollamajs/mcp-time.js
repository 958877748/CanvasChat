import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 创建 MCP 服务器实例
const server = new McpServer({
  name: "time-server",
  version: "1.0.0"
});

server.prompt('time', async () => {
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
})

// 注册一个工具，名称为 get_current_time，无输入参数，返回当前时间字符串
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

// 创建标准输入输出传输层
const transport = new StdioServerTransport();

// 连接服务器和传输层，开始监听 MCP 请求
await server.connect(transport);

console.log("MCP 时间服务器已启动，等待请求...");
