import gradio as gr
import ollama

def chat_with_model(message, history):
    # 添加当前用户消息
    history.append({"role": "user", "content": message})

    # 使用 ollama进行流式输出
    stream = ollama.chat(model='granite3.1-dense:2b', messages=history, stream=True)
    
    # 逐块生成响应内容
    partial_message = ""
    for chunk in stream:
        partial_message += chunk['message']['content']
        yield partial_message

demo = gr.ChatInterface(
    chat_with_model,
    type="messages",
    theme="soft"
)

if __name__ == "__main__":
    demo.launch()