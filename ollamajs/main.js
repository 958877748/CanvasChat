import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const root = z.object({
    think: z.string(),
    components: z.array({
        name: z.string(),
        description: z.string(),
    }),
    systems: z.array({
        name: z.string(),
        description: z.string(),
    }),
    summarize: z.string(),
});

const response = await ollama.chat({
    model: 'gemma3',
    messages: [{ role: 'user', content: 'Design a fluid simulation system using ECS' }],
    format: zodToJsonSchema(root),
});


console.log(response.message.content);
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