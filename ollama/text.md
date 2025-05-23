**目标：**

创建一个 Python 应用，该应用包含一个聊天界面和一个可控制亮度的灯光模拟。用户可以通过聊天与 LLM 交互，并使用自然语言指令控制灯光亮度。

**技术栈：**

*   Python
*   Gradio (用于构建用户界面)
*   Ollama SDK (用于与 Ollama LLM 交互)
*   Llama3.1 (或支持函数调用的其他 LLM)

**功能需求：**

1.  **聊天界面：**
    *   使用 Gradio 创建一个聊天界面，允许用户输入文本消息。
    *   将用户消息发送到 Ollama LLM。
    *   将 LLM 的响应显示在聊天界面上。
2.  **灯光模拟：**
    *   使用 Gradio 创建一个灯光组件（例如，一个滑块或一个图像），用于模拟灯光亮度。
    *   允许用户通过 LLM 的函数调用来控制灯光亮度。
3.  **LLM 函数调用：**
    *   定义一个函数，该函数可以设置灯光亮度（例如，接受一个 0-100 的亮度值）。
    *   配置 Llama3.1 或其他 LLM，使其能够识别并调用该函数。
    *   当用户在聊天中输入类似“把灯调亮一点”的指令时，LLM 应识别该指令并调用相应的函数来调整灯光亮度。

**代码要求：**

提供一个完整的 Python 代码示例，包括：

*   Gradio 界面的创建
*   Ollama LLM 的连接和交互
*   灯光模拟组件的创建和控制
*   LLM 函数调用的实现

**明确性要求：**

*   代码应具有良好的可读性和注释。
*   应清晰地展示如何将 Gradio 组件与 LLM 函数调用连接起来。
*   应提供一个可运行的示例，方便用户直接使用。
