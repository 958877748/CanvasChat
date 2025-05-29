const { Node, Flow } = require('pocketflow');
const fs = require('fs');
const path = require('path');
const https = require('https');

class Task {
    /**
     * 文件路径
     * @type {string}
     */
    filePath;
    /**
     * 任务状态
     * @type {'pending' | 'processing' | 'completed' | 'failed'}
     */
    status = 'pending';
    /**
     * 任务结果
     * @type {string}
     */
    result;
}
const DATA = {
    baseUrl: "C:\\Users\\guole\\Documents\\GitHub\\jar_game_chcb\\jar2",
    /**
     * 任务列表
     * @type {Task[]}
     */
    tasks: [],
}
const DASHSCOPE_API_KEY = 'sk-a254740282314b2e84f0b33739e836ce';
// 辅助函数：调用AI API
async function callLLM(userContent) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'dashscope.aliyuncs.com',
            path: '/compatible-mode/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed.choices[0].message.content);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(JSON.stringify({
            model: "qwen-turbo-latest",
            messages: [
                { role: "system", content: "找出用户发送的java文件中使用m.java类的代码有几处" },
                { role: "user", content: userContent }
            ]
        }));
        req.end();
    });
}

class InitTasks extends Node {
    /**
     * 初始化任务
     * @param {DATA} data 
     */
    async prep(data) {
        data.tasks.length = 0;
        return data;
    }
    /**
     * @param {DATA} data 
     */
    async exec(data) {
        try {
            const files = fs.readdirSync(data.baseUrl)
                .filter(file => file.endsWith('.java'))
                .map(file => path.join(data.baseUrl, file));

            files.forEach(v => {
                let task = new Task()
                task.filePath = v;
                data.tasks.push(task)
            })
            return data;  
        } catch (error) {
            console.error('读取文件列表失败:', error);
            return null;
        }
    }
    async post() {
        return "next"
    }
}

// 2. 文件处理节点
class FileProcessorNode extends Node {
    /**
     * 取出一个未处理的任务
     * @param {DATA} data 
     */
    async prep(data) {
        let task = data.tasks.find(v => v.status === "pending")
        if (!task) {
            return null;
        }
        task.status = "processing";
        return task
    }
    /**
     * 处理任务
     * @param {Task} task 
     */
    async exec(task) {
        const content = fs.readFileSync(task.filePath, 'utf-8');

        const answer = await callLLM(content);

        task.result = answer;
        task.status = "completed";

        console.log(`已处理: ${task.filePath}`);

        return task
    }
    async post(task) {
        return "next"
    }
}

// 创建节点实例
const initTasks = new InitTasks();
const fileProcessor = new FileProcessorNode();

// 定义流程
initTasks.on('next', fileProcessor) 
fileProcessor.on('next', fileProcessor)

// 创建并启动流程
const flow = new Flow(initTasks);

// 启动处理流程
(async () => {
    console.log('开始处理文件...');
    await flow.run(DATA);
})();