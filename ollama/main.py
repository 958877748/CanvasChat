import gradio as gr
import ollama
import json
from PIL import Image
import numpy as np

current_brightness = 10

def create_light_image(brightness):
    img = Image.new('RGB', (200, 200), color=(255, 255, 0))
    arr = np.array(img)
    arr = arr * brightness // 100
    return Image.fromarray(np.clip(arr, 0, 255).astype('uint8'))

def control_light(state: str):
    global current_brightness
    if state.lower() == 'on':
        current_brightness = 100
    elif state.lower() == 'off':
        current_brightness = 10
    else:
        raise ValueError("Invalid state, must be 'on' or 'off'")
    return f"灯光已设置为 {state}"

tools = [
    {
        "name": "control_light",
        "description": "控制虚拟灯光的开关状态",
        "parameters": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "enum": ["on", "off"],
                    "description": "灯的开关状态"
                }
            },
            "required": ["state"]
        }
    }
]

def generate_response(message, history):
    messages = []
    for user_msg, ai_msg in history:
        messages.append({"role": "user", "content": user_msg})
        messages.append({"role": "assistant", "content": ai_msg})
    messages.append({"role": "user", "content": message})

    try:
        # 第一次调用检查工具
        response = ollama.chat(
            model="llama3.1",
            messages=messages,
            tools=tools,
            stream=False
        )

        if 'tool_calls' in response['message']:
            # 处理工具调用
            for tool_call in response['message']['tool_calls']:
                if tool_call['function']['name'] == 'control_light':
                    args = json.loads(tool_call['function']['arguments'])
                    result = control_light(args['state'])
                    
                    messages.append({
                        "role": "tool",
                        "content": result,
                        "tool_call_id": tool_call['id']
                    })
                    
                    # 第二次调用使用流式输出
                    stream = ollama.chat(
                        model="llama3.1",
                        messages=messages,
                        stream=True
                    )
                    
                    full_response = ""
                    for chunk in stream:
                        content = chunk["message"]["content"]
                        full_response += content
                        yield full_response
                    return
        else:
            # 没有工具调用时直接流式输出
            stream = ollama.chat(
                model="llama3.1",
                messages=messages,
                stream=True
            )
            full_response = ""
            for chunk in stream:
                content = chunk["message"]["content"]
                full_response += content
                yield full_response

    except Exception as e:
        yield f"错误：{str(e)}"

# 界面部分保持不变
css = """
#light-image img {
    transition: filter 0.5s ease-in-out;
}
"""

with gr.Blocks(css=css) as demo:
    gr.Markdown("# Ollama 智能灯控系统")
    
    with gr.Row():
        with gr.Column(scale=2):
            chat_interface = gr.ChatInterface(
                fn=generate_response,
                examples=[["打开灯"], ["关闭灯"], ["当前灯的状态"]],
                title="智能灯控聊天助手"
            )
        with gr.Column(scale=1):
            light_image = gr.Image(
                value=create_light_image(current_brightness),
                label="虚拟灯光",
                every=0.5,
                height=200,
                width=200
            )
    
    def update_light_image():
        return create_light_image(current_brightness)
    
    demo.load(
        fn=update_light_image,
        outputs=light_image,
        every=0.5
    )

if __name__ == "__main__":
    demo.launch()
