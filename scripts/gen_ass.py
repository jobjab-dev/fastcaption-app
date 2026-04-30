"""
gen_ass.py — Wrapper to call split_ass.py from Node.js
Usage: python gen_ass.py <json_path> <output_ass_path> <mode> <orientation> [pause_threshold] [max_chars]
"""
import sys
import os
import json

# Ensure script directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from split_ass import process_json_to_ass, process_json_to_ass_pause, process_json_to_ass_word

def main():
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: gen_ass.py <json> <output> <mode> <orientation> [pause_threshold] [max_chars]"}))
        sys.exit(1)
    
    json_path = sys.argv[1]
    output_path = sys.argv[2]
    mode = sys.argv[3]         # "pause" or "smart" or "word"
    orientation = sys.argv[4]  # "portrait" or "landscape"
    pause_threshold = float(sys.argv[5]) if len(sys.argv) > 5 else 0.3
    max_chars = int(sys.argv[6]) if len(sys.argv) > 6 else 16

    # Landscape doubles max_chars
    if orientation == "landscape":
        max_chars = max_chars * 2

    if not os.path.exists(json_path):
        print(json.dumps({"error": f"JSON file not found: {json_path}"}))
        sys.exit(1)

    try:
        if mode == "word":
            num_caps = process_json_to_ass_word(
                json_path=json_path,
                output_path=output_path,
                ass_style_name="Default"
            )
        elif mode == "pause":
            num_caps = process_json_to_ass_pause(
                json_path=json_path,
                output_path=output_path,
                pause_threshold=pause_threshold,
                max_chars=max_chars,
                ass_style_name="Default"
            )
        else:
            # smart mode
            num_caps = process_json_to_ass(
                json_path=json_path,
                output_path=output_path,
                max_chars=max_chars,
                target_max_sec=2.5,
                min_sec=0.20,
                mode="continuous",
                min_gap=pause_threshold,
                ass_style_name="Default"
            )

        print(json.dumps({"success": True, "captions": num_caps}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
