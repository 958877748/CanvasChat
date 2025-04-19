import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
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
        "C:/Users/guole/Downloads"
    ]
}));

const { tools } = await client.listTools();

const dir = await client.callTool("list_directory", { path: "." });
console.log("当前目录内容:", dir);

// 定义提示词
const messages = [
    {
        role: 'system',
        content: `你是一名AI助手，帮助用户。你可以使用以下工具：
${tools.map(tool => `- ${tool.name}：${tool.description}`).join('\n')}
-------------
Allowed directories: [ 'C:\\Users\\Administrator\\Downloads' ]
-------------
如果调用工具出现问题，尝试调整参数再试
`,
    },
    {
        role: 'user',
        content: `创建一个名叫test1014的文件夹`,
    },
];

// 向模型请求
const response = await ollama.chat({
    model: 'gemma3',
    messages: messages,
    tools: tools,
});
debugger
// 定义聊天 schema
const schema1 = z.object({
    think: z.string(),
    use_tool: z.string().optional(),
});
mainloop()
async function mainloop() {
    // 向模型请求
    const response = await ollama.chat({
        model: 'gemma3',
        messages: messages,
        format: zodToJsonSchema(schema1),
    });

    messages.push({
        role: 'assistant',
        content: response.message.content,
    });
    console.log('--------------');
    // 解析模型的响应
    const json = schema1.parse(JSON.parse(response.message.content))
    // 模型要使用工具
    if (json.use_tool) {
        console.log('模型输出：', json.think);
        console.log('模型要使用工具：', json.use_tool);
        const tool = tools.find(tool => tool.name === json.use_tool);
        if (!tool) {
            messages.push({
                role: 'user',
                content: `[Tool]The tool "${json.use_tool}" does not exist.`,
            });
            mainloop()
        } else {
            messages.push({
                role: 'user',
                content: `[Tool]Please output the parameters required to call the ${tool.name} tool.`,
            });
            const mcp_parameter = await ollama.chat({
                model: 'gemma3',
                messages: messages,
                format: tool.inputSchema,
            });
            console.log('模型调用工具的参数:', mcp_parameter.message.content);
            messages.push({
                role: 'assistant',
                content: mcp_parameter.message.content,
            });
            // 调用mcp工具
            const mcp_result = await client.callTool({
                name: tool.name,
                arguments: JSON.parse(mcp_parameter.message.content),
            });
            // 将调用mcp工具的结果反馈给模型
            messages.push({
                role: 'user',
                content: `[Tool]result:${mcp_result.content[0].text}`,
            });
            console.log('工具调用反馈:', mcp_result.content[0].text);
            mainloop()
        }
    } else {
        // 模型不使用工具，直接输出结果
        console.log('模型最后输出：', json.think);
    }
}
