import json, sys
sys.path.insert(0, 'scripts')
from split_ass import extract_words

with open(r'd:\tiktok\fastcaption\output\ElevenLabs_2026-04-27T10_44_55_jobjab2_ivc_sp100_s50_sb75_v3.json','r',encoding='utf-8') as f:
    data = json.load(f)

words = extract_words(data)

# Show words where end - start is very small
print("=== Words with short duration (<0.1s) ===")
for i, w in enumerate(words):
    dur = w['end'] - w['start']
    if dur < 0.1:
        print(f"  [{i}] '{w['word']}' {w['start']:.3f}-{w['end']:.3f} = {dur:.3f}s")

# Show first 20 words with their end times
print("\n=== First 20 words ===")
for i, w in enumerate(words[:20]):
    dur = w['end'] - w['start']
    flag = " <<< SHORT" if dur < 0.1 else ""
    print(f"  '{w['word']}' {w['start']:.3f}-{w['end']:.3f} dur={dur:.3f}s{flag}")

# Check where end of word != start of next (gaps vs overlaps)
print("\n=== End-start mismatches (first 20) ===")
for i in range(min(19, len(words)-1)):
    gap = words[i+1]['start'] - words[i]['end']
    if abs(gap) > 0.01:
        print(f"  [{i}] '{words[i]['word']}' end={words[i]['end']:.3f} -> [{i+1}] '{words[i+1]['word']}' start={words[i+1]['start']:.3f} gap={gap:.3f}s")
