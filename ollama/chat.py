import gradio as gr
import ollama

def chat_with_model(message, history):
    """
    与 Ollama 模型进行对话的函数
    
    参数:
    - message: 用户输入的消息
    - history: 对话历史记录
    
    返回:
    - 模型的响应
    """
    try:
        # 将对话历史转换为 Ollama 所需的消息格式
        messages = [{"role": "user", "content": msg} for msg in history + [message]]
        
        # 使用 Ollama 生成响应
        response = ollama.chat(
            model='granite3.1-dense:2b',  # 可以根据需要更换模型
            messages=messages
        )
        
        return response['message']['content']
    
    except Exception as e:
        return f"发生错误: {str(e)}"

# 创建 Gradio 界面
demo = gr.ChatInterface(
    chat_with_model,
    title="Ollama 聊天机器人",
    description="使用本地 Ollama 模型进行对话",
    theme="soft"
)

# 启动 Gradio 应用
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",  # 允许从任何 IP 访问
        server_port=7860,        # 指定端口
        share=True               # 创建公共链接
    )