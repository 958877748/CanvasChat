const { Node, Flow } = require('pocketflow');
const readline = require('readline');
const https = require('https');

// 创建读取用户输入的接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 配置 API 密钥
const DASHSCOPE_API_KEY = 'sk-a254740282314b2e84f0b33739e836ce';
const API_URL = 'dashscope.aliyuncs.com';

// 辅助函数：发送 HTTP POST 请求
function callLLM(messages) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL,
      path: '/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('无效的响应格式'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({
      model: "qwen-plus-latest",
      messages: messages
    }));
    req.end();
  });
}

// 聊天节点
class ChatNode extends Node {
  async prep(shared) {
    // 初始化消息历史
    if (!shared.messages) {
      shared.messages = [];
      console.log("欢迎使用聊天机器人！输入'退出'结束对话。");
    }

    // 获取用户输入
    const userInput = await new Promise((resolve) => {
      rl.question('\n你: ', resolve);
    });

    // 检查用户输入的是否退出
    if (userInput.toLowerCase() === '退出' || userInput.toLowerCase() === 'exit') {
      return null;
    }

    // 添加用户消息到历史
    shared.messages.push({ role: "user", content: userInput });
    
    // 返回所有消息给LLM
    return shared.messages;
  }

  async exec(messages) {
    if (!messages) return null;
    try {
      return await callLLM(messages);
    } catch (error) {
      console.error('调用API时出错:', error.message);
      return "抱歉，我遇到了一些问题，请稍后再试。";
    }
  }

  async post(shared, prepRes, execRes) {
    if (prepRes === null || execRes === null) {
      console.log("\n再见！");
      rl.close();
      return null; // 结束对话
    }

    // 打印助手的回复
    console.log(`\n助手: ${execRes}`);
    
    // 添加助手消息到历史
    shared.messages.push({ role: "assistant", content: execRes });
    
    // 继续对话
    return "continue";
  }
}

// 创建并启动流程
const chatNode = new ChatNode();
chatNode.on("continue", chatNode);  // 自循环继续对话

const flow = new Flow(chatNode);

// 启动聊天
(async () => {
  const shared = {};
  await flow.run(shared);
})();