import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";

const memoryStore = [];
try {
    let str = fs.readFileSync(process.env.MEMORY_JSON_URL, "utf8");
    memoryStore = JSON.parse(str)
} catch (error) {}

function saveMemory() {
    fs.writeFileSync(process.env.MEMORY_JSON_URL, JSON.stringify(memoryStore), 'utf8')
}

const server = new McpServer({
    name: "memory-storage-server",
    version: "1.0.0",
});

// Tool to save a memory
server.tool(
    "save_memory",
    "Save the information you consider important to your memory.",
    {
        memory: z.string(),
    },
    async (input) => {
        try {
            const { memory } = input;
            memoryStore.push(memory);
            saveMemory()

            return {
                content: [{
                    type: "text",
                    text: `Memory saved successfully!`,
                }],
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: `Exception occurred: ${err.message}`,
                }],
                isError: true,
            };
        }
    }
);

// Tool to retrieve all memories
server.tool(
    "get_memories",
    "Retrieve all saved memories.",
    {},
    async () => {
        try {
            return {
                content: [{
                    type: "text",
                    text: `Saved memories: ${memoryStore.join(", ")}`,
                }],
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: `Exception occurred: ${err.message}`,
                }],
                isError: true,
            };
        }
    }
);

// Tool to clear all memories
server.tool(
    "clear_memories",
    "Clear all saved memories.",
    {},
    async () => {
        try {
            memoryStore.length = 0; // Clear the array
            saveMemory()
            return {
                content: [{
                    type: "text",
                    text: `All memories cleared successfully!`,
                }],
            };
        } catch (err) {
            return {
                content: [{
                    type: "text",
                    text: `Exception occurred: ${err.message}`,
                }],
                isError: true,
            };
        }
    }
);

const transport = new StdioServerTransport();

await server.connect(transport);

console.log("MCP Memory Storage Server start");
