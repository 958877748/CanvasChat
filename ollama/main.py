import gradio as gr
import ollama
import json

# 1. 初始化 Ollama LLM
model_name = "llama3.1"  # 替换为您使用的模型

# 2. 定义灯光控制函数
def set_light_brightness(brightness: int):
    """设置灯光亮度。

    Args:
        brightness: 灯光亮度值，范围为 0-100。
    """
    print(f"设置灯光亮度为: {brightness}")
    return brightness  # 返回亮度值，用于更新界面

# 3. 定义 LLM 函数调用配置
functions = [
    {
        "name": "set_light_brightness",
        "description": "根据用户指令设置灯光亮度。",
        "parameters": {
            "type": "object",
            "properties": {
                "brightness": {
                    "type": "integer",
                    "description": "灯光亮度值，范围为 0-100。",
                },
            },
            "required": ["brightness"],
        },
    }
]

# 4. Gradio 界面
def respond(message, chat_history, light_brightness):
    """处理用户消息并与 LLM 交互。"""
    full_prompt = f"""
    你是一个智能家居助手，可以控制灯光亮度。
    你可以使用 set_light_brightness 函数来控制灯光。
    当前灯光亮度为 {light_brightness}。
    用户消息：{message}
    """

    response = ollama.chat( # 修改这里
        model=model_name,
        messages=[
            {
                "role": "user",
                "content": full_prompt,
            }
        ],
        stream=False,
        options={"temperature": 0.5},
        format="json",
    )

    try:
        response_content = json.loads(response['message']['content'])
        if 'function_call' in response_content:
            function_name = response_content['function_call']['name']
            arguments = json.loads(response_content['function_call']['arguments'])

            if function_name == "set_light_brightness":
                brightness = arguments['brightness']
                new_light_brightness = set_light_brightness(brightness)  # 调用灯光控制函数
                chat_history.append((message, f"已将灯光亮度设置为 {new_light_brightness}。"))
                return "", chat_history, new_light_brightness # 清空输入框, 更新聊天记录, 更新亮度
            else:
                chat_history.append((message, "不支持的函数调用。"))
                return "", chat_history, light_brightness

        else:
            llm_response = response_content['response']
            chat_history.append((message, llm_response))
            return "", chat_history, light_brightness

    except (json.JSONDecodeError, KeyError) as e:
        print(f"Error decoding JSON: {e}")
        chat_history.append((message, f"LLM 响应解析错误: {response['message']['content']}"))
        return "", chat_history, light_brightness


with gr.Blocks() as demo:
    chatbot = gr.Chatbot()
    light_slider = gr.Slider(minimum=0, maximum=100, value=50, label="灯光亮度")
    msg = gr.Textbox(label="输入你的指令")
    clear = gr.ClearButton([msg, chatbot])

    msg.submit(respond, [msg, chatbot, light_slider], [msg, chatbot, light_slider])

demo.launch()