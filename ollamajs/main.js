import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const root = z.object({
    think: z.string(),
    answer: z.string(),
});

const response = await ollama.chat({
    model: 'gemma3',
    messages: [{ role: 'user', content: 'How much higher will Nasdaq 100 and gold be in 10 years compared to now?' }],
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