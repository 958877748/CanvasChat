import gradio as gr
import ollama

# 定义生成回复的函数（流式输出）
def generate_response(message, history):
    full_response = ""
    
    # 将聊天历史转换为 Ollama 需要的格式
    messages = []
    for user_msg, ai_msg in history:
        messages.append({"role": "user", "content": user_msg})
        messages.append({"role": "assistant", "content": ai_msg})
    messages.append({"role": "user", "content": message})

    try:
        # 调用 Ollama 生成回复（流式）
        stream = ollama.chat(
            model="llama3.1",  # 使用你本地的模型名称
            messages=messages,
            stream=True
        )
        
        # 逐个 token 生成响应
        for chunk in stream:
            content = chunk["message"]["content"]
            full_response += content
            yield full_response
            
    except Exception as e:
        yield f"发生错误：{str(e)}，请检查 Ollama 服务是否运行"

# 创建 Gradio 界面
demo = gr.ChatInterface(
    fn=generate_response,
    title="Ollama 聊天助手",
    description="使用 Ollama 和 Gradio 构建的本地大模型聊天应用",
    examples=["你好！", "请解释量子计算", "如何做蛋糕？"],
    cache_examples=False,
    retry_btn=None,
    undo_btn=None,
    clear_btn="清空历史"
)

# 启动应用
if __name__ == "__main__":
    demo.launch()
