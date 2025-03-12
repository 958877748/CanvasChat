import gradio as gr
import ollama

def chat_with_model(message, history):
    # 将历史消息转换为 Ollama 期望的格式
    messages = []
    for human, assistant in history:
        messages.append({"role": "user", "content": human})
        messages.append({"role": "assistant", "content": assistant})
    messages.append({"role": "user", "content": message})  # 添加当前用户消息

    # 使用 ollama.generate 进行流式输出
    stream = ollama.chat(model='granite3.1-dense:2b', messages=messages, stream=True)
    
    # 逐块生成响应内容
    partial_message = ""
    for chunk in stream:
        partial_message += chunk['message']['content']
        yield partial_message

demo = gr.ChatInterface(
    chat_with_model,
    theme="soft"
)

if __name__ == "__main__":
    demo.launch()