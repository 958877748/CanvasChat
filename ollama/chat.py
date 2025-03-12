import gradio as gr
import ollama

def chat_with_model(message, history):
    # 将历史消息转换为 Ollama 期望的格式
    messages = []
    for human, assistant in history:
        messages.append({"role": "user", "content": human})
        messages.append({"role": "assistant", "content": assistant})
    messages.append({"role": "user", "content": message})  # 添加当前用户消息

    response = ollama.chat(model='granite3.1-dense:2b', messages=messages)
    bot_message = response['message']['content']

    return bot_message

demo = gr.ChatInterface(
    chat_with_model,
    title="Ollama 聊天机器人",
    description="使用本地 Ollama 模型进行对话",
    theme="soft"
)
if __name__ == "__main__":
    demo.launch()