import mido
from mido import Message, MidiFile, MidiTrack
import random

def create_level_up_sound():
    # 创建MIDI文件
    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)
    
    # 设置乐器（合成器效果）
    track.append(Message('program_change', program=88, time=0))
    
    # 基础参数
    bpm = 128
    ticks_per_beat = 480
    velocity = 100
    
    # 生成上升音阶
    notes = [60, 64, 67, 72, 76, 79, 84]  # C大调上升音阶
    time_sequence = [120, 90, 60, 30, 20, 10, 5]  # 加速时间
    
    # 添加主旋律
    for i, (note, delta) in enumerate(zip(notes, time_sequence)):
        track.append(Message('note_on', note=note, velocity=velocity, time=0))
        track.append(Message('note_off', note=note, velocity=velocity, time=delta))
        
        # 添加和弦增强效果
        if i > 2:
            chord_note = note - 12
            track.append(Message('note_on', note=chord_note, velocity=velocity-30, time=0))
            track.append(Message('note_off', note=chord_note, velocity=velocity-30, time=delta))
    
    # 添加打击乐效果
    drum_track = MidiTrack()
    mid.tracks.append(drum_track)
    
    # 底鼓和军鼓模式
    drum_pattern = [
        (36, 0),  # 底鼓
        (0, 120), 
        (38, 0),  # 军鼓
        (0, 120)
    ]
    
    for _ in range(4):
        for note, delay in drum_pattern:
            if note > 0:
                drum_track.append(Message('note_on', note=note, velocity=80, time=0))
                drum_track.append(Message('note_off', note=note, velocity=80, time=60))
            else:
                drum_track.append(Message('note_off', time=delay))
    
    # 添加结尾效果（高音持续+渐弱）
    track.append(Message('note_on', note=84, velocity=100, time=240))
    for i in range(5):
        track.append(Message('control_change', control=7, value=100-(i*20), time=120))
    track.append(Message('note_off', note=84, velocity=0, time=480))
    
    # 保存文件
    mid.save('level_up.mid')
    print("角色升级音效已生成：level_up.mid")

if __name__ == "__main__":
    create_level_up_sound()
