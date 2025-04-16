import ollama from 'ollama';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import fs from 'fs';
import path from 'path';

// 1. 设定根目录
const ROOT_DIR = 'C:\\Users\\Administrator\\Desktop\\myfile';

// 2. 辅助函数：拼接并校验路径，防止越界
function safeJoin(root, targetPath) {
    const fullPath = path.resolve(root, targetPath || '');
    if (!fullPath.startsWith(path.resolve(root))) {
        throw new Error('禁止访问根目录以外的路径！');
    }
    return fullPath;
}

// 3. 定义 schema
const fileActionSchema = z.object({
    think: z.string(),
    action: z.enum(['move', 'mkdir', 'list', 'finishAllTask']),
    source: z.string().optional(),
    destination: z.string().optional(),
    target: z.string().optional(),
});

// 4. 循环对话主流程
let history = [
    {
        role: 'system',
        content: `
你是一个智能文件管理助手，只能操作根目录 myfile 及其子目录，所有路径都必须是相对路径。你可以让系统执行如下操作，每次只输出一步JSON指令：

- move（移动文件）：需要字段 action="move"，source（源文件相对路径），destination（目标文件相对路径）
- mkdir（创建文件夹）：需要字段 action="mkdir"，destination（要创建的文件夹相对路径）
- list（列出目录下所有文件）：需要字段 action="list"，target（要列出的目录相对路径）
- finishAllTask（结束）：需要字段 action="finishAllTask"

每执行完一个操作后，你会收到系统返回的执行结果。请根据反馈判断操作是否成功。
到最后的话 如果你的完成了用户的所有目标，请输出 {"action": "finishAllTask"} 结束任务
 `
    }
];

// 自然语言任务
history.push({ role: 'user', content: '移动 node-v22.14.0-x64.msi 到 images' });

interact();

async function interact() {
    while (true) {
        // 5. 向模型请求下一步指令
        const response = await ollama.chat({
            model: 'gemma3',
            messages: history,
            format: zodToJsonSchema(fileActionSchema),
        });

        console.log('--------------');
        console.log('模型输出内容：', response.message.content);

        // 6. 校验和解析
        let command;
        try {
            command = fileActionSchema.parse(JSON.parse(response.message.content));
            console.log('解析后的指令：', command);
        } catch (err) {
            console.error('模型输出格式不正确：', err);
            break;
        }

        // 7. 执行文件系统操作，并把结果反馈给模型
        let feedback = '';
        try {
            switch (command.action) {
                case 'move':
                    if (!command.source || !command.destination) {
                        feedback = 'move 操作需要 source 和 destination';
                        console.error(feedback);
                    } else {
                        fs.renameSync(
                            safeJoin(ROOT_DIR, command.source),
                            safeJoin(ROOT_DIR, command.destination)
                        );
                        feedback = `文件已从 ${command.source} 移动到 ${command.destination}`;
                        console.log(feedback);
                    }
                    break;

                case 'mkdir':
                    if (!command.destination) {
                        feedback = 'mkdir 操作需要 destination';
                        console.error(feedback);
                    } else {
                        fs.mkdirSync(safeJoin(ROOT_DIR, command.destination), { recursive: true });
                        feedback = `文件夹 ${command.destination} 创建成功`;
                        console.log(feedback);
                    }
                    break;

                case 'list':
                    if (!command.target) {
                        feedback = 'list 操作需要 target';
                        console.error(feedback);
                    } else {
                        const files = fs.readdirSync(safeJoin(ROOT_DIR, command.target));
                        feedback = `目录 ${command.target} 下的文件有：${JSON.stringify(files)}`;
                        console.log(feedback);
                    }
                    break;

                case 'finishAllTask':
                    console.log('工作结束！');
                    return;

                default:
                    feedback = '未知操作类型';
                    console.error(feedback);
            }
        } catch (err) {
            feedback = `操作失败：${err.message}`;
            console.error(feedback);
        }

        // 8. 把执行结果反馈给模型，进入下一轮
        history.push({ role: 'system', content: feedback });
    }
}
