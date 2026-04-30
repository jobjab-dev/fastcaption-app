import json, sys

json_path = sys.argv[1] if len(sys.argv) > 1 else r'd:\tiktok\fastcaption\output\ElevenLabs_2026-04-27T10_44_55_jobjab2_ivc_sp100_s50_sb75_v3.json'

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

words = data['segments'][0]['words']

print("=== GAPS > 0.1s between chars ===")
for i in range(1, len(words)):
    gap = words[i]['start'] - words[i-1]['end']
    if gap > 0.1:
        ctx_before = ''.join(w['word'] for w in words[max(0,i-5):i])
        ctx_after = ''.join(w['word'] for w in words[i:i+5])
        print(f'Gap {gap:.2f}s at {words[i-1]["end"]:.2f}s: ...{ctx_before} | {ctx_after}...')

print("\n=== Chars with duration > 0.3s (pause absorbed into char) ===")
for i, w in enumerate(words):
    dur = w['end'] - w['start']
    if dur > 0.3:
        ctx = ''.join(ww['word'] for ww in words[max(0,i-3):i+4])
        print(f'Long dur {dur:.2f}s: char="{w["word"]}" at {w["start"]:.2f}-{w["end"]:.2f}s ctx={ctx}')
