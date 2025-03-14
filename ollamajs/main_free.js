
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: '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',
});

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

const completion = await openai.beta.chat.completions.parse({
    model: "qwen/qwen2.5-vl-72b-instruct:free",
    messages: [
        { role: "user", content: "帮我写一个科幻小说,赛博朋克风格,每一章500字左右" },
    ],
    response_format: zodResponseFormat(root, "root"),
});

const root_ = completion.choices[0].message.parsed;

import fs from 'fs';

fs.writeFile(root_.story.title + '.json', JSON.stringify(root_), (err) => {
    if (err) {
        console.error('Error writing to file', err);
    } else {
        console.log('File saved successfully!');
    }
});