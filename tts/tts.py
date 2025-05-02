import pyttsx3
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("tts_service")

@mcp.tool()
async def tts(text: str) -> str:
    """接收一段中文文本，使用系统语音播放"""
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
        return '语音播放完成'
    else:
        return "系统未检测到中文语音包"

if __name__ == "__main__":
    mcp.run()
