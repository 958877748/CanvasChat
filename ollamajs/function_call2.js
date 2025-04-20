import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import ollama from 'ollama';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// --- Configuration ---
const MODEL_CONTEXT_SERVER_DIR = "C:/Users/guole/Downloads";
const OLLAMA_MODEL = 'llama3.1';
const CLIENT_NAME = "example-client";
const CLIENT_VERSION = "1.0.0";
const SYSTEM_PROMPT = `You are a friendly artificial intelligence assistant`;
// --- End Configuration ---

const rl = readline.createInterface({ input, output });
const client = new Client({ name: CLIENT_NAME, version: CLIENT_VERSION });

let llm_tools = [];
const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

function initTool(tool) {
    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        }
    };
}

async function processChatTurn() {
    let accumulated_response = '';
    let accumulated_tool_calls = [];
    let final_message_chunk = null;
    let stream_ended = false; // Flag to track when the stream is fully processed

    try {
        const responseStream = await ollama.chat({
            model: OLLAMA_MODEL,
            messages: messages,
            tools: llm_tools.length > 0 ? llm_tools : undefined,
            stream: true,
        });

        // Print the initial "AI: " prefix once before the loop
        process.stdout.write("\nAI: ");

        for await (const chunk of responseStream) {
            if (chunk.message?.content) {
                // Write content chunk directly to stdout.
                // Buffering behavior might still depend on the terminal/OS.
                process.stdout.write(chunk.message.content);
                accumulated_response += chunk.message.content;
            }
            if (chunk.message?.tool_calls) {
                accumulated_tool_calls = accumulated_tool_calls.concat(chunk.message.tool_calls);
            }
            final_message_chunk = chunk; // Store the last message object

            if (chunk.done) {
                stream_ended = true; // Mark stream end
                 // Add a newline *only* if the stream ended AND no tool calls were made.
                 // If tool calls were made, subsequent console logs will handle spacing.
                if (!accumulated_tool_calls || accumulated_tool_calls.length === 0) {
                     process.stdout.write("\n");
                 }
            }
        }

        // Ensure the stream actually finished before proceeding
        if (!stream_ended && final_message_chunk) {
             console.warn("[Warning: Stream loop finished but 'done' flag was not definitively true in the last chunk. Processing based on last known chunk.]");
             // If somehow the loop finished without chunk.done being true in the *last* iteration,
             // ensure we add the newline if needed.
             if (!accumulated_tool_calls || accumulated_tool_calls.length === 0) {
                  process.stdout.write("\n");
              }
        }


        // Add the assistant's complete message to history AFTER the stream loop completes
        if (final_message_chunk?.message) {
             const assistantMessage = {
                 role: 'assistant',
                 content: accumulated_response || null, // Use accumulated text
                 tool_calls: accumulated_tool_calls.length > 0 ? accumulated_tool_calls : undefined,
             };
             // Only add if there's content or tool calls
             if (assistantMessage.content || assistantMessage.tool_calls) {
                messages.push(assistantMessage);
             } else if (final_message_chunk.done && !accumulated_response && accumulated_tool_calls.length === 0){
                 // Handle edge case: stream finished, no content, no tools (e.g., maybe just a stop token)
                 // We probably don't need to push an empty message.
                 console.log("[Received empty final response]");
             }
        }


        // --- Handle Tool Calls ---
        if (accumulated_tool_calls && accumulated_tool_calls.length > 0) {
            // Add a newline before starting tool logs if the streaming didn't end with one
            if (!stream_ended || accumulated_tool_calls.length > 0) {
                 process.stdout.write("\n");
            }
            console.log(`[Executing ${accumulated_tool_calls.length} tool call(s)...]`);

            for (const tool_call of accumulated_tool_calls) {
                // (Tool execution logic remains the same as before)
                 if (!tool_call.function || !tool_call.function.name || !tool_call.function.arguments) {
                     console.error('[Skipping invalid tool call structure:', tool_call, ']');
                     messages.push({
                         role: 'tool',
                         tool_call_id: tool_call.id || `invalid_call_${Date.now()}`,
                         content: JSON.stringify({ error: "Invalid tool call structure received from model." })
                     });
                     continue;
                }

                console.log(`  - Calling tool: ${tool_call.function.name}`);
                try {
                    const result = await client.callTool({
                        name: tool_call.function.name,
                        arguments: tool_call.function.arguments,
                    });
                    const resultContent = result.content[0]?.text ?? JSON.stringify(result.content);
                    console.log(`  - Tool result: ${resultContent}`);
                    messages.push({
                        role: 'tool',
                        tool_call_id: tool_call.id,
                        content: resultContent,
                    });
                } catch (error) {
                    console.error(`  - Error calling tool ${tool_call.function.name}:`, error);
                    messages.push({
                        role: 'tool',
                        tool_call_id: tool_call.id,
                        content: JSON.stringify({ error: `Failed to execute tool ${tool_call.function.name}: ${error.message}` }),
                    });
                }
            }

            console.log("[Sending tool results back to AI...]");
            await processChatTurn(); // Recursive call
        }

    } catch (error) {
        console.error("\n[Error during chat processing]:", error);
        // Maybe add a newline if an error interrupts streaming
        process.stdout.write("\n");
    }
}

// --- Main Application Logic ---
async function main() {
    console.log("Connecting to Model Context Protocol server...");
    try {
        await client.connect(new StdioClientTransport({
            command: "npx",
            args: [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                MODEL_CONTEXT_SERVER_DIR
            ]
        }));
        console.log("Connected.");

        console.log("Listing available tools...");
        const { tools: availableTools } = await client.listTools();
        llm_tools = availableTools.map(initTool);
        console.log(`Found ${llm_tools.length} tools:`, llm_tools.map(t => t.function.name).join(', '));

        if (llm_tools.length > 0) {
             // Make sure system prompt is updated *before* first use
             messages[0].content = SYSTEM_PROMPT + "\n\nAvailable tools:\n" + llm_tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');
        } else {
             messages[0].content = SYSTEM_PROMPT; // Ensure it's set even if no tools
        }


    } catch (error) {
        console.error("Failed to connect or list tools:", error);
        console.log("Proceeding without tools.");
        messages[0].content = SYSTEM_PROMPT; // Set default system prompt
    }


    console.log(`\nChatting with ${OLLAMA_MODEL}. Type 'exit' or 'quit' to end.`);
    console.log("System:", messages[0].content); // Print system prompt


    // Main conversation loop
    while (true) {
        const userInput = await rl.question("\nYou: ");
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            break;
        }

        messages.push({ role: 'user', content: userInput });
        await processChatTurn(); // Handles AI response, streaming, and tools
    }

    console.log("\nDisconnecting and exiting.");
    rl.close();
    try {
        // Only disconnect if client likely connected
        if (client.transport) { // Check if transport was initialized
             await client.disconnect();
        }
    } catch (disconnectError) {
        console.warn("Error during disconnect:", disconnectError.message);
    }
}

main().catch(console.error);