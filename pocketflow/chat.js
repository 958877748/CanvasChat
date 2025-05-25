const { Node, Flow } = require('pocketflow');
const readline = require('readline');
const OpenAI = require('openai');
require('dotenv').config();

// 创建读取用户输入的接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

async function callLLM(messages) {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.MODEL_NAME,
      messages: messages,
    });
    
    if (completion.choices && completion.choices[0] && completion.choices[0].message) {
      return completion.choices[0].message.content;
    } else {
      throw new Error('无效的响应格式');
    }
  } catch (error) {
    console.error('调用API时出错:', error);
    throw error;
  }
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