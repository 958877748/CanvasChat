import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import ollama from 'ollama';

const client = new Client(
    {
        name: "example-client",
        version: "1.0.0"
    }
);

await client.connect(new StdioClientTransport({
    command: "npx",
    "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\Administrator\\Desktop\\test"
    ]
}));

const { tools } = await client.listTools();
const llm_tools = tools.map(v => initTool(v));
function initTool(tool) {
    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        }
    }
}

// 定义提示词
const messages = [
    {
        role: 'system',
        content: `你是一名AI助手,使用提供的工具解决用户的问题，允许访问的目录C:\\Users\\Administrator\\Desktop\\test`,
    },
    {
        role: 'user',
        content: `创建一个image文件夹`,
    },
];

chat_loop()
async function chat_loop() {
    const response = await ollama.chat({
        model: 'llama3.1',
        messages: messages,
        tools: llm_tools,
    });

    const tool_calls = response.message.tool_calls;
    if (tool_calls && tool_calls.length > 0) {
        const { name, arguments: args } = tool_calls[0].function;
        console.log('模型调用工具:', name);
        const result = await client.callTool({
            name,
            arguments: args,
        });
        console.log('工具调用反馈:', result.content[0].text);

        messages.push({
            role: 'tool',
            content: result.content[0].text
        })
        chat_loop()
    } else {
        console.log('最终输出:', response.message.content);
        process.exit(0)
    }
}
