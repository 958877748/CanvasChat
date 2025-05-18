import pyttsx3
from mcp.server.fastmcp import FastMCP
import concurrent.futures

mcp = FastMCP("tts_service")
executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)

def play_tts(text: str):
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    zh_voice_id = None
    for voice in voices:
        if 'ZH' in voice.id or 'zh' in voice.id:
            zh_voice_id = voice.id
            break
    if zh_voice_id:
        engine.setProperty('voice', zh_voice_id)
        engine.say(text)
        engine.runAndWait()
        engine.stop()

@mcp.tool()
async def tts(text: str) -> str:
    """接收一段中文文本，使用系统语音播放，启动后立即返回"""
    # 提交后台线程播放语音
    executor.submit(play_tts, text)
    return '语音播放已启动'

if __name__ == "__main__":
    mcp.run()
