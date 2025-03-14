import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const root = z.object({
    story: z.object({
        title: z.string(),
        characters: z.array(z.object({
            name: z.string(),
            role: z.string(),
            experience: z.string()
        })),
        chapters: z.array(z.object({
            title: z.string(),
            content: z.string()
        }))
    }),
});

const response = await ollama.chat({
    model: 'gemma3',
    messages: [{ role: 'user', content: 'Give me a science fiction story' }],
    format: zodToJsonSchema(root),
});

console.log(response.message.content);
const country = root.parse(JSON.parse(response.message.content));
console.log(country);
