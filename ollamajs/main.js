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
    model: 'gemma3:1b',
    messages: [{ role: 'user', content: 'Give me a science fiction story' }],
    format: zodToJsonSchema(root),
});

const country = root.parse(JSON.parse(response.message.content));
console.log(country);

import fs from 'fs';

const data = response.message.content

fs.writeFile('example.json', data, (err) => {
    if (err) {
        console.error('Error writing to file', err);
    } else {
        console.log('File saved successfully!');
    }
});