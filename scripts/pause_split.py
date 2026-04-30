"""
Split ASS subtitles based on spaces in segment text
"""
import json
import os

def split_by_spaces(segments):
    """
    Split segments by spaces in text, using word timestamps for timing
    Handles Thai repeat marks (ๆ) and makes subtitles continuous
    
    Args:
        segments: List of segments with text and words
    
    Returns:
        List of caption tuples (start, end, text)
    """
    captions = []
    
    for seg in segments:
        text = seg.get("text", "").strip()
        words_data = seg.get("words", [])
        
        if not text:
            continue
            
        if not words_data:
            # No word timestamps, use segment as-is
            captions.append((seg["start"], seg["end"], text))
            continue
        
        # Split text by spaces
        text_parts = text.split()
        
        if not text_parts:
            continue
        
        # Merge parts that are just repeat marks (ๆ, ฯ) with previous part
        merged_parts = []
        for i, part in enumerate(text_parts):
            if part in ["ๆ", "ฯ", "ฯลฯ"] and merged_parts:
                # Merge with previous
                merged_parts[-1] = merged_parts[-1] + part
            else:
                merged_parts.append(part)
        
        # For each text part, find corresponding words in words_data
        word_index = 0
        
        for part in merged_parts:
            part_start = None
            part_end = None
            
            # Collect words that match this text part
            chars_matched = 0
            target_chars = len(part)
            
            while word_index < len(words_data) and chars_matched < target_chars:
                word_info = words_data[word_index]
                word = word_info["word"]
                
                # Track timing
                if part_start is None:
                    part_start = word_info["start"]
                part_end = word_info["end"]
                
                chars_matched += len(word.strip())
                word_index += 1
                
                # Check if we've matched enough characters
                if chars_matched >= target_chars:
                    break
            
            # Create caption for this part
            if part_start is not None and part_end is not None:
                captions.append((part_start, part_end, part))
    
    # DON'T make captions continuous - use exact timing from JSON
    # This preserves natural pauses in speech
    return captions

def write_ass_from_spaces(json_path, output_path):
    """
    Create ASS file from JSON based on spaces in text
    
    Args:
        json_path: Path to WhisperX JSON
        output_path: Path to output ASS file
    
    Returns:
        Number of captions created
    """
    # Read JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    segments = data.get("segments", [])
    
    # Split by spaces
    captions = split_by_spaces(segments)
    
    # Write ASS
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00111111,&H90000000,0,0,0,0,100,100,0,0,1,3,0,2,80,80,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    with open(output_path, 'w', encoding='utf-8-sig') as f:
        f.write(header)
        
        for i, (start, end, text) in enumerate(captions, 1):
            # Convert to ASS timestamp
            start_ts = format_ass_time(start)
            end_ts = format_ass_time(end)
            
            # Escape text
            escaped_text = text.replace("{", r"\{").replace("}", r"\}")
            
            layer = i % 10
            f.write(f"Dialogue: {layer},{start_ts},{end_ts},Default,,0,0,0,,{escaped_text}\n")
    
    return len(captions)

def format_ass_time(seconds):
    """Format seconds to ASS timestamp (H:MM:SS.CS)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centisecs = int((seconds % 1) * 100)
    return f"{hours}:{minutes:02d}:{secs:02d}.{centisecs:02d}"
