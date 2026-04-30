# split_to_ass.py
# WhisperX JSON (word timestamps) -> short caption boxes -> CapCut-friendly .ASS
# Key fix: prevent "missing words" caused by ASS centisecond rounding collisions
# WITHOUT forcing minimum duration or big gaps.
#
# Usage:
#   1) Run whisperx to produce out/*.json with word timestamps (segments[].words)
#   2) python split_to_ass.py
# Output:
#   out/final.ass

import json, glob, os, re, math

# ====== ปรับได้ ======
MIN_CHARS = 8           # ความยาวขั้นต่ำ (สำหรับประโยคสั้น)
IDEAL_CHARS = 16        # ความยาวเหมาะสม (พยายามแบ่งใกล้ๆนี้)
MAX_CHARS = 24          # ความยาวสูงสุด (ห้ามเกิน)
TARGET_MAX_SEC = 2.5    # ถ้าชิ้นยาวเกินนี้ จะพยายามตัดเพิ่ม
MIN_SEC = 0.20          # กันชิ้น "สั้นเกินแบบอ่านไม่ทัน" ตอนรวมคำ
MODE = "continuous"     # "continuous" = ต่อเนื่องไม่มีรู / "gap" = บังคับแยกด้วยช่องว่าง
MIN_GAP = 0.18          # ใช้เมื่อ MODE="gap"
ASS_STYLE_NAME = "Default"
OUT_DIR = "out"
OUT_NAME = "final2.ass"
# =====================

PUNCT_BREAK = set(list(".,?!;:"))

def is_thai_char(char):
    """Check if character is Thai"""
    return '\u0E00' <= char <= '\u0E7F'

def smart_join_words(words):
    """
    Join words smartly - no space for Thai, space for other languages
    """
    if not words:
        return ""
    
    result = []
    for i, word in enumerate(words):
        word = word.strip()
        if not word:
            continue
            
        # Check if this word is Thai
        is_current_thai = any(is_thai_char(c) for c in word)
        
        if i == 0:
            result.append(word)
        else:
            prev_word = result[-1] if result else ""
            is_prev_thai = any(is_thai_char(c) for c in prev_word)
            
            # Add space only if:
            # - Both are non-Thai (English, numbers, etc.)
            # - OR transitioning between Thai and non-Thai
            if is_current_thai and is_prev_thai:
                # Thai-Thai: no space
                result.append(word)
            elif not is_current_thai and not is_prev_thai:
                # Non-Thai to Non-Thai: add space
                result.append(" " + word)
            else:
                # Mixed: add space for clarity
                result.append(" " + word)
    
    return "".join(result)

def norm_space(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([.,?!;:])", r"\1", s)
    return s

def pick_json(out_dir=OUT_DIR):
    js = glob.glob(os.path.join(out_dir, "*.json"))
    if not js:
        raise FileNotFoundError(f"No .json found in ./{out_dir}. Run whisperx with --output_dir {out_dir} first.")
    js.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return js[0]

def extract_words(data):
    """
    Extract words using pythainlp for word boundaries + JSON character timestamps.
    Builds a per-character timestamp map, then slices by pythainlp word boundaries.
    """
    result = []
    
    for seg in data.get("segments", []):
        words_data = seg.get("words", [])
        if not words_data:
            text = seg.get("text", "").strip()
            if text:
                result.append({
                    "word": text,
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0)
                })
            continue
        # Step 0: Check if this segment has severely compressed timestamps
        # If >30% of chars have zero duration, redistribute ALL chars evenly
        # across the segment's start/end span (segment boundaries are reliable)
        seg_start = seg.get("start", 0)
        seg_end = seg.get("end", 0)
        zero_count = sum(1 for w in words_data if w.get("end", 0) - w.get("start", 0) <= 0.001)
        total_chars = len(words_data)
        all_segs = data.get("segments", [])
        seg_idx = all_segs.index(seg) if seg in all_segs else -1
        
        if total_chars > 0 and zero_count / total_chars > 0.30:
            # Handle zero-span segment (start == end): skip entirely if 100% compressed
            if seg_end <= seg_start + 0.01:
                if zero_count == total_chars:
                    print(f"  ⚠️ Segment {seg_start:.1f}s: {total_chars} chars all zero-dur, 0-span → SKIPPED", flush=True)
                    continue
                # Try to use next segment's start as boundary
                if seg_idx >= 0 and seg_idx + 1 < len(all_segs):
                    seg_end = all_segs[seg_idx + 1].get("start", seg_end)
                if seg_end <= seg_start + 0.01:
                    seg_end = seg_start + total_chars * 0.08  # fallback: 80ms per char
            
            dur_per_char = (seg_end - seg_start) / total_chars
            redistributed = []
            for ci, w in enumerate(words_data):
                redistributed.append({
                    "word": w.get("word", ""),
                    "start": round(seg_start + ci * dur_per_char, 3),
                    "end": round(seg_start + (ci + 1) * dur_per_char, 3)
                })
            words_data = redistributed
            print(f"  📐 Segment {seg_start:.1f}-{seg_end:.1f}s: {zero_count}/{total_chars} zero-dur chars → redistributed evenly", flush=True)
        
        # Step 1: Build per-character timestamp arrays
        # For each character in the rebuilt text, store its start and end time
        char_starts = []  # start time for each character position
        char_ends = []    # end time for each character position
        text_from_json = ""
        
        for w in words_data:
            chars = w.get("word", "")
            st = w.get("start", 0)
            en = w.get("end", 0)
            for c in chars:
                char_starts.append(st)
                char_ends.append(en)
            text_from_json += chars
        
        if not text_from_json.strip():
            continue
        
        # Step 2: Use pythainlp to get word boundaries
        try:
            from pythainlp import word_tokenize
            pythainlp_words = word_tokenize(text_from_json, engine="newmm")
        except ImportError:
            pythainlp_words = text_from_json.split() if ' ' in text_from_json else [text_from_json]
        
        # Step 2b: Split words that contain sentence-ending punctuation in the middle
        # e.g. pythainlp may produce "?1" as one token → split to ["?", "1"]
        import re
        split_words = []
        for word in pythainlp_words:
            # Split around ? ! but keep the punctuation as separate tokens
            parts = re.split(r'([?!]+)', word)
            # Also split ... or … as separate tokens
            final_parts = []
            for p in parts:
                sub = re.split(r'(\.{2,}|…)', p)
                final_parts.extend(sub)
            split_words.extend([p for p in final_parts if p])
        pythainlp_words = split_words
        
        # Step 3: Slice timestamp arrays by word boundaries
        INTERNAL_GAP_THRESHOLD = 0.15  # detect gaps > 150ms inside a word
        MAX_CHAR_DUR = 0.25  # max reasonable duration for a single Thai character
        pos = 0
        for word in pythainlp_words:
            word_len = len(word)
            end_pos = pos + word_len
            
            # Skip whitespace-only tokens
            if word.strip() and pos < len(char_starts) and end_pos <= len(char_starts):
                word_start = char_starts[pos]
                word_end = char_ends[end_pos - 1]
                
                # Check for internal gap: if first char(s) are separated from
                # the rest by a large gap, use the post-gap start time.
                # e.g. ค(1.52-1.78) ิ(2.63-2.95) → word should start at 2.63
                if word_len >= 2:
                    for ci in range(pos, end_pos - 1):
                        gap = char_starts[ci + 1] - char_ends[ci]
                        if gap > INTERNAL_GAP_THRESHOLD:
                            word_start = char_starts[ci + 1]
                            break  # use first significant gap
                
                # Fix: Whisper absorbs silence into the first char's duration.
                # e.g. น(7.40-8.08) = 0.68s when a normal char ~0.1s
                # Trim the start forward so the word starts near actual speech.
                if word_len >= 2:
                    first_dur = char_ends[pos] - char_starts[pos]
                    if first_dur > MAX_CHAR_DUR:
                        # Estimate real char duration from remaining chars
                        remaining_durs = [char_ends[pos+j] - char_starts[pos+j] 
                                         for j in range(1, word_len)
                                         if char_ends[pos+j] - char_starts[pos+j] > 0]
                        avg_dur = sum(remaining_durs) / len(remaining_durs) if remaining_durs else 0.08
                        # Push start forward: real speech starts near the end of the bloated char
                        new_start = char_ends[pos] - min(avg_dur, MAX_CHAR_DUR)
                        if new_start > word_start:
                            word_start = round(new_start, 3)
                elif word_len == 1:
                    # Single char word: if duration > MAX, trim the start
                    dur = word_end - word_start
                    if dur > MAX_CHAR_DUR:
                        word_start = round(word_end - MAX_CHAR_DUR, 3)
                
                result.append({
                    "word": word.strip(),
                    "start": word_start,
                    "end": word_end
                })
            
            pos = end_pos
    
    # Post-process: filter out standalone quote/punctuation-noise words
    # Smart quotes like ' ' " become separate words that cause double spaces
    # and hide real gaps (e.g. ' at 45.51-46.81 = 1.3s fake duration)
    NOISE_CHARS = set('\'\'\"\"\"\u2018\u2019\u201C\u201D')
    result = [w for w in result if not all(c in NOISE_CHARS for c in w["word"])]
    
    # Post-process: fix unreasonable word durations from WhisperX
    # WhisperX often assigns segment end time to the last few characters
    MAX_DURATION_PER_CHAR = 1.5  # seconds per character max
    for i in range(len(result)):
        w = result[i]
        duration = w["end"] - w["start"]
        word_len = max(len(w["word"]), 1)
        max_dur = word_len * MAX_DURATION_PER_CHAR
        
        if duration > max_dur:
            # Cap to reasonable duration based on word length
            reasonable_end = w["start"] + word_len * 0.15
            # But also check if next word starts sooner
            if i + 1 < len(result) and result[i + 1]["start"] > w["start"]:
                next_start = result[i + 1]["start"]
                if next_start - w["start"] <= max_dur:
                    reasonable_end = next_start
            result[i]["end"] = reasonable_end
    
    # Post-process: fix compressed timestamp zones
    # Detect words with unreasonably short duration relative to their character count
    # then interpolate between the surrounding good timestamps
    MIN_DUR_PER_CHAR = 0.03  # minimum 30ms per character  
    MIN_ZONE_SIZE = 3  # at least 3 consecutive compressed words
    
    # Mark each word as compressed or not
    compressed = []
    for w in result:
        word_len = max(len(w["word"]), 1)
        dur = w["end"] - w["start"]
        expected_min = word_len * MIN_DUR_PER_CHAR
        # Word is compressed if zero duration OR duration way less than expected for its length
        compressed.append(dur <= 0.001 or (dur < expected_min and word_len >= 2))
    
    # Find consecutive runs of compressed words
    i = 0
    while i < len(result):
        if compressed[i]:
            zone_start = i
            while i < len(result) and compressed[i]:
                i += 1
            zone_end = i - 1  # inclusive
            zone_count = zone_end - zone_start + 1
            
            if zone_count >= MIN_ZONE_SIZE:
                # Also expand zone BACKWARDS to include preceding words with inflated duration
                # that end at the same compressed time (e.g. word with start=135.5 end=150.66)
                zone_time = result[zone_start]["start"]
                while zone_start > 0:
                    prev = result[zone_start - 1]
                    # Include if prev word's end time matches compressed zone's time
                    if abs(prev["end"] - zone_time) < 0.01:
                        zone_start -= 1
                    else:
                        break
                
                zone_count = zone_end - zone_start + 1
                
                # Find interpolation boundaries
                t_before = result[zone_start - 1]["end"] if zone_start > 0 else 0
                t_after = None
                # Look forward for first word with real duration
                for k in range(zone_end + 1, len(result)):
                    if result[k]["end"] - result[k]["start"] > 0.01:
                        t_after = result[k]["start"]
                        break
                
                if t_after is not None and t_after > t_before:
                    total_chars = sum(len(result[j]["word"]) for j in range(zone_start, zone_end + 1))
                    total_dur = t_after - t_before
                    dur_per_char = total_dur / max(total_chars, 1)
                    
                    pos = 0
                    for j in range(zone_start, zone_end + 1):
                        word_chars = len(result[j]["word"])
                        result[j]["start"] = round(t_before + pos * dur_per_char, 3)
                        result[j]["end"] = round(t_before + (pos + word_chars) * dur_per_char, 3)
                        pos += word_chars
                    
                    print(f"  ⚡ Fixed compressed zone: words [{zone_start}-{zone_end}] ({zone_count} words) "
                          f"interpolated {t_before:.2f}-{t_after:.2f}s", flush=True)
        else:
            i += 1
    
    return result


def should_break(curr_text, curr_start, curr_end, next_word, next_word_start=None):
    """
    ENHANCED: Pause-aware intelligent caption breaking.
    Prioritizes natural speech rhythm over mechanical length.
    """
    text = norm_space(curr_text)
    dur = curr_end - curr_start
    text_len = len(text)

    # HARD LIMIT: absolute maximum
    if text_len >= MAX_CHARS:
        return True
    
    # HARD LIMIT: duration too long with enough content
    if dur >= TARGET_MAX_SEC and text_len >= MIN_CHARS:
        return True

    # PRIORITY 1: PAUSE DETECTION (most natural)
    # If there's a pause between current and next word, that's a natural break
    if next_word_start is not None:
        pause_duration = next_word_start - curr_end
        
        # Significant pause (>0.3s) = strong break signal
        if pause_duration > 0.3 and text_len >= MIN_CHARS and dur >= MIN_SEC:
            return True
        
        # Medium pause (>0.15s) + we have enough content
        if pause_duration > 0.15 and text_len >= IDEAL_CHARS * 0.6:
            return True

    # PRIORITY 2: PUNCTUATION (phrase boundaries)
    if text and text[-1] in PUNCT_BREAK:
        # Strong punctuation with minimum content
        if dur >= MIN_SEC and text_len >= MIN_CHARS * 0.5:
            return True
    
    # If no next word, don't break unless we must
    if not next_word:
        return False

    # Calculate prospective text
    if any(is_thai_char(c) for c in text) and any(is_thai_char(c) for c in next_word):
        prospective = norm_space(text + next_word)
    else:
        prospective = norm_space(text + " " + next_word)
    
    prospective_len = len(prospective)

    # Would overflow maximum? Break now
    if prospective_len > MAX_CHARS and dur >= MIN_SEC:
        return True

    # PRIORITY 3: DYNAMIC LENGTH ZONES
    # Instead of fixed IDEAL_CHARS, use flexible ranges
    
    # Zone 1: Short (MIN to 60% of IDEAL) - only break if forced
    # Zone 2: Medium (60% to 120% of IDEAL) - break at natural points
    # Zone 3: Long (>120% of IDEAL) - break ASAP
    
    if text_len >= IDEAL_CHARS * 1.2:  # Zone 3: getting long
        # Break at next reasonable point
        if dur >= MIN_SEC:
            return True
    
    elif text_len >= IDEAL_CHARS * 0.6:  # Zone 2: good range
        # Only break if there's a natural boundary
        
        # Check for Thai word boundaries
        if any(is_thai_char(c) for c in text):
            try:
                from pythainlp import word_tokenize
                words = word_tokenize(text, engine="newmm")
                # Multiple complete words = can break
                if len(words) >= 3:
                    return True
            except:
                pass
        
        # For mixed/English: check word boundary
        elif text and text[-1].isspace():
            return True
    
    # Zone 1: still building up, don't break yet
    return False

def build_captions(words):
    """
    FIXED: Build caption chunks with accurate word-level timing.
    Output: list of (start_sec, end_sec, text)
    """
    caps = []
    if not words:
        return caps

    curr_word_indices = []  # Track actual word indices in this caption
    
    def flush():
        nonlocal curr_word_indices
        if not curr_word_indices:
            return
        
        # Get actual start/end from first and last word
        first_idx = curr_word_indices[0]
        last_idx = curr_word_indices[-1]
        
        curr_start = words[first_idx]["start"]
        curr_end = words[last_idx]["end"]
        
        # Build text from these words
        word_list = [words[idx]["word"] for idx in curr_word_indices]
        text = norm_space(smart_join_words(word_list))
        
        if text:
            # Ensure non-zero duration
            if (curr_end - curr_start) < 0.01:
                curr_end = curr_start + 0.01
            caps.append((curr_start, curr_end, text))
            
            # ENHANCED DEBUG
            if len(caps) <= 5:
                # Show word details
                first_word = words[first_idx]["word"]
                last_word = words[last_idx]["word"]
                print(f"  Caption {len(caps)}: indices [{first_idx}..{last_idx}]", flush=True)
                print(f"    First word: '{first_word}' @ {words[first_idx]['start']:.2f}", flush=True)
                print(f"    Last word: '{last_word}' @ {words[last_idx]['end']:.2f}", flush=True)
                print(f"    Result: {curr_start:.2f} -> {curr_end:.2f} '{text[:30]}'", flush=True)
                
        curr_word_indices = []

    for i, w in enumerate(words):
        # Add current word to caption
        curr_word_indices.append(i)
        
        # Get next word info (for pause detection)
        next_word = None
        next_word_start = None
        if i+1 < len(words):
            next_word = words[i+1]["word"]
            next_word_start = words[i+1]["start"]
        
        # Build current text for should_break check
        curr_word_list = [words[idx]["word"] for idx in curr_word_indices]
        curr_text = smart_join_words(curr_word_list)
        curr_start = words[curr_word_indices[0]]["start"]
        curr_end = words[curr_word_indices[-1]]["end"]
        
        # Check if should break after this word
        if should_break(
            curr_text, 
            curr_start, 
            curr_end, 
            next_word,
            next_word_start
        ):
            flush()

    flush()
    print(f"  Total caps before make_continuous: {len(caps)}", flush=True)
    return caps

def make_continuous(caps):
    """
    Make captions continuous by extending END time of previous caption.
    Preserves original START times from JSON.
    Only extends across small gaps (<=2s); large gaps are natural pauses.
    """
    if not caps:
        return caps
    
    MAX_GAP_TO_FILL = 2.0  # Don't extend across gaps larger than this
    
    out = [list(caps[0])]
    
    # DEBUG: Show first few transformations
    for idx, (st, en, text) in enumerate(caps[1:], 1):
        prev_st, prev_en, prev_text = out[-1]
        
        # If there's a gap between previous end and current start
        gap = st - prev_en
        if gap > 0 and gap <= MAX_GAP_TO_FILL:
            # Extend previous caption to current start
            out[-1][1] = st
            if idx <= 5:
                print(f"  Make continuous {idx-1}: extended {prev_en:.2f}->{st:.2f} '{prev_text[:15]}'", flush=True)
        
        # Keep current caption with original timing
        if idx <= 5:
            print(f"  Caption {idx}: {st:.2f}->{en:.2f} '{text[:15]}'", flush=True)
        
        out.append([st, en, text])  # Use original times
    
    return [tuple(x) for x in out]

def enforce_gap(caps, min_gap):
    """
    Force a minimum gap between captions by pushing start times forward.
    """
    if not caps:
        return caps
    out = [list(caps[0])]
    for st, en, text in caps[1:]:
        pst, pen, _ = out[-1]
        if st - pen < min_gap:
            st = pen + min_gap
            if en < st + 0.01:
                en = st + 0.01
        out.append([st, en, text])
    return [tuple(x) for x in out]

# -------- ASS timing: collision-safe (centisecond) --------
def to_cs_floor(t: float) -> int:
    """
    Convert seconds -> centiseconds using floor to reduce boundary collisions.
    ASS supports 0.01s resolution only.
    """
    if t < 0:
        t = 0
    return int(math.floor(t * 100 + 1e-9))

def to_cs_ceil(t: float) -> int:
    """Convert seconds -> centiseconds using ceil so end times don't cut early."""
    if t < 0:
        t = 0
    return int(math.ceil(t * 100 - 1e-9))

def ass_ts_from_cs(cs: int) -> str:
    """
    Convert centiseconds -> ASS time H:MM:SS.cc
    """
    if cs < 0:
        cs = 0
    h = cs // (3600 * 100)
    cs %= (3600 * 100)
    m = cs // (60 * 100)
    cs %= (60 * 100)
    s = cs // 100
    cs %= 100
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def caps_to_cs_no_drop(caps):
    """
    Convert (sec) -> (cs) and prevent CapCut dropping events due to:
      - end_cs <= start_cs after rounding
      - start_cs <= prev_end_cs (overlap/zero boundary)
    Also preserve real silence gaps from the input data.
    """
    out = []
    prev_end = -1
    prev_end_sec = -1
    for st, en, text in caps:
        st_cs = to_cs_floor(st)
        en_cs = to_cs_ceil(en)

        # ensure positive duration in centiseconds
        if en_cs <= st_cs:
            en_cs = st_cs + 1

        # Preserve real gaps: if original data has a gap, keep it
        if prev_end >= 0:
            original_gap = st - prev_end_sec
            if original_gap >= 0.05:
                # Ensure minimum gap of 3cs (0.03s) so editors show it
                min_st = prev_end + max(3, to_cs_floor(original_gap))
                if st_cs < min_st:
                    st_cs = min_st
                    if en_cs <= st_cs:
                        en_cs = st_cs + 1
            else:
                # ensure strictly increasing boundaries (no overlap)
                if st_cs <= prev_end:
                    st_cs = prev_end + 1
                    if en_cs <= st_cs:
                        en_cs = st_cs + 1

        out.append((st_cs, en_cs, text))
        prev_end = en_cs
        prev_end_sec = en

    return out

def escape_ass_text(s: str) -> str:
    # Minimal escaping; CapCut mostly tolerates plain text.
    # Avoid braces which are ASS override syntax.
    # Remove commas and quotes — not needed for subtitle display
    s = s.replace(",", "").replace("，", "")
    s = s.replace('"', '').replace('"', '').replace('"', '').replace("'", "").replace("'", "").replace("'", "")
    s = s.replace("{", r"\{").replace("}", r"\}")
    # Collapse multiple spaces to single space
    while '  ' in s:
        s = s.replace('  ', ' ')
    return s.strip()

def write_ass(caps, out_path):
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: {ASS_STYLE_NAME},Arial,64,&H00FFFFFF,&H000000FF,&H00111111,&H90000000,0,0,0,0,100,100,0,0,1,3,0,2,80,80,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    caps_cs = caps_to_cs_no_drop(caps)

    with open(out_path, "w", encoding="utf-8-sig") as f:
        f.write(header)
        for i, (st_cs, en_cs, text) in enumerate(caps_cs, 1):
            # Use varying layers to reduce any app heuristics that merge adjacent events
            layer = i % 10
            f.write(
                f"Dialogue: {layer},{ass_ts_from_cs(st_cs)},{ass_ts_from_cs(en_cs)},{ASS_STYLE_NAME},,"
                f"0,0,0,,{escape_ass_text(text)}\n"
            )

def build_captions_by_pause(words, pause_threshold=0.3, max_chars=32):
    """
    Build captions based on actual speech pauses.
    - Groups words together during continuous speech
    - Breaks at silence gaps >= pause_threshold
    - Uses max_chars as safety limit only (break at nearest pause if too long)
    - Caption ends at last word's end time (no lingering past speech)
    """
    caps = []
    if not words:
        return caps
    
    curr_indices = []
    
    def flush():
        nonlocal curr_indices
        if not curr_indices:
            return
        
        first_idx = curr_indices[0]
        last_idx = curr_indices[-1]
        
        curr_start = words[first_idx]["start"]
        curr_end = words[last_idx]["end"]
        
        word_list = [words[idx]["word"] for idx in curr_indices]
        text = norm_space(smart_join_words(word_list))
        
        if text:
            if (curr_end - curr_start) < 0.01:
                curr_end = curr_start + 0.01
            caps.append((curr_start, curr_end, text))
        
        curr_indices = []
    
    for i, w in enumerate(words):
        curr_indices.append(i)
        
        # Get current caption text length
        word_list = [words[idx]["word"] for idx in curr_indices]
        curr_text = smart_join_words(word_list)
        text_len = len(norm_space(curr_text))
        
        # Check if there's a pause after this word
        has_pause = False
        if i + 1 < len(words):
            gap = words[i + 1]["start"] - w["end"]
            if gap >= pause_threshold:
                has_pause = True
        
        # Check if current word contains sentence-ending punctuation
        ends_sentence = False
        word_text = w["word"].strip()
        if any(c in word_text for c in '?!'):
            ends_sentence = True
        elif '..' in word_text or '…' in word_text:
            # Catches ... and .. (pythainlp may split ... into parts)
            ends_sentence = True
        
        is_last = (i + 1 >= len(words))
        
        # Break conditions:
        # 1. Speech pause detected → natural break
        # 2. Sentence-ending punctuation → sentence break
        # 3. Max chars exceeded → safety break
        # 4. Last word → flush remaining
        if has_pause or ends_sentence or is_last:
            flush()
        elif text_len >= max_chars:
            # Over max chars, find nearest word to break at
            flush()
    
    print(f"  Built {len(caps)} captions by pause (threshold={pause_threshold}s, max={max_chars}chars)", flush=True)
    return caps

def build_captions_word_by_word(words):
    """
    Build captions where each real word gets its own subtitle line.
    Words from extract_words() are already properly segmented via pythainlp.
    Perfect for TikTok/Reels word-by-word highlight style.
    """
    caps = []
    if not words:
        return caps
    
    for w in words:
        text = w["word"].strip()
        if not text:
            continue
        st = w["start"]
        en = w["end"]
        if (en - st) < 0.01:
            en = st + 0.05
        caps.append((st, en, text))
    
    print(f"  Built {len(caps)} word-by-word captions", flush=True)
    return caps

def process_json_to_ass_word(
    json_path,
    output_path,
    ass_style_name="Default"
):
    """
    Process JSON to ASS with word-by-word mode.
    Each real word (grouped by pythainlp for Thai) gets its own subtitle line.
    """
    global ASS_STYLE_NAME
    orig_style = ASS_STYLE_NAME
    
    try:
        ASS_STYLE_NAME = ass_style_name
        
        print(f"📐 Word-by-word mode", flush=True)
        
        print("📖 กำลังอ่านไฟล์ JSON...", flush=True)
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        print("🔤 กำลังแยกคำ (extract words + pythainlp)...", flush=True)
        words = extract_words(data)
        if not words:
            raise RuntimeError("JSON ไม่มี word timestamps")

        print(f"📝 กำลังสร้าง word-by-word captions...", flush=True)
        caps = build_captions_word_by_word(words)
        
        # Word-by-word: NO make_continuous — each word shows only during its actual timestamp
        # Silence gaps = no subtitle (correct for word highlight style)
        print(f"✓ สร้าง {len(caps)} word captions เรียบร้อย", flush=True)

        print("💾 กำลังเขียนไฟล์ ASS...", flush=True)
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        write_ass(caps, output_path)
        print(f"✅ เสร็จสิ้น! บันทึกที่ {output_path}", flush=True)
        
        return len(caps)
    finally:
        ASS_STYLE_NAME = orig_style


def process_json_to_ass_pause(
    json_path,
    output_path,
    pause_threshold=0.3,
    max_chars=32,
    ass_style_name="Default"
):
    """
    Process JSON to ASS using pause-based splitting.
    Breaks captions based on actual speech gaps.
    """
    global ASS_STYLE_NAME
    orig_style = ASS_STYLE_NAME
    
    try:
        ASS_STYLE_NAME = ass_style_name
        
        print(f"📐 Pause mode: threshold={pause_threshold}s, max_chars={max_chars}", flush=True)
        
        print("📖 กำลังอ่านไฟล์ JSON...", flush=True)
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        print("🔤 กำลังแยกคำ (extract words)...", flush=True)
        words = extract_words(data)
        if not words:
            raise RuntimeError("JSON ไม่มี word timestamps")

        print(f"📝 กำลังสร้าง caption boxes (pause-based)...", flush=True)
        caps = build_captions_by_pause(words, pause_threshold, max_chars)
        print(f"✓ สร้าง {len(caps)} boxes เรียบร้อย", flush=True)

        print("💾 กำลังเขียนไฟล์ ASS...", flush=True)
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        write_ass(caps, output_path)
        print(f"✅ เสร็จสิ้น! บันทึกที่ {output_path}", flush=True)
        
        return len(caps)
    finally:
        ASS_STYLE_NAME = orig_style


def process_json_to_ass(
    json_path,
    output_path,
    min_chars=8,
    ideal_chars=16,
    max_chars=24,
    target_max_sec=2.5,
    min_sec=0.20,
    mode="continuous",
    min_gap=0.18,
    ass_style_name="Default"
):
    """
    Process WhisperX JSON to ASS subtitle file with intelligent breaking.
    
    Args:
        json_path: Path to WhisperX JSON file with word timestamps
        output_path: Path to output .ASS file
        min_chars: Minimum characters (for very short phrases)
        ideal_chars: Ideal target length (breaks near this when possible)
        max_chars: Maximum characters (hard limit)
        target_max_sec: Target maximum duration per caption
        min_sec: Minimum duration when building captions
        mode: "continuous" (no gaps) or "gap" (force gaps)
        min_gap: Minimum gap between captions when mode="gap"
        ass_style_name: ASS style name to use
    
    Returns:
        Number of caption boxes created
    """
    # Save original globals
    global MIN_CHARS, IDEAL_CHARS, MAX_CHARS, TARGET_MAX_SEC, MIN_SEC, MODE, MIN_GAP, ASS_STYLE_NAME
    orig_min_chars = MIN_CHARS
    orig_ideal_chars = IDEAL_CHARS
    orig_max_chars = MAX_CHARS
    orig_target_max_sec = TARGET_MAX_SEC
    orig_min_sec = MIN_SEC
    orig_mode = MODE
    orig_min_gap = MIN_GAP
    orig_style = ASS_STYLE_NAME
    
    try:
        # Set parameters
        MAX_CHARS = max_chars
        
        # Auto-scale IDEAL and MIN based on MAX_CHARS
        # Keep the ratios: MIN ~33% of MAX, IDEAL ~67% of MAX
        if ideal_chars == 16 and min_chars == 8:
            # User only changed max_chars, auto-scale the others
            IDEAL_CHARS = max(8, int(max_chars * 0.67))
            MIN_CHARS = max(4, int(max_chars * 0.33))
        else:
            IDEAL_CHARS = ideal_chars
            MIN_CHARS = min_chars
        
        TARGET_MAX_SEC = target_max_sec
        MIN_SEC = min_sec
        MODE = mode
        MIN_GAP = min_gap
        ASS_STYLE_NAME = ass_style_name
        
        print(f"📐 Parameters: MAX={MAX_CHARS}, IDEAL={IDEAL_CHARS}, MIN={MIN_CHARS}", flush=True)
        
        print("📖 กำลังอ่านไฟล์ JSON...", flush=True)
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        print("🔤 กำลังแยกคำ (extract words)...", flush=True)
        words = extract_words(data)
        if not words:
            raise RuntimeError("JSON ไม่มี word timestamps (segments[].words). ให้ whisperx run จนจบพร้อม alignment ก่อน")

        print(f"📝 กำลังสร้าง caption boxes (smart split)...", flush=True)
        caps = build_captions(words)
        print(f"✓ สร้าง {len(caps)} boxes เรียบร้อย", flush=True)

        # No make_continuous — captions show only during actual speech timestamps
        # Silence gaps = no subtitle on screen (correct behavior)
        if MODE == "gap":
            caps = enforce_gap(caps, MIN_GAP)

        print("💾 กำลังเขียนไฟล์ ASS...", flush=True)
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        write_ass(caps, output_path)
        print(f"✅ เสร็จสิ้น! บันทึกที่ {output_path}", flush=True)
        
        return len(caps)
    finally:
        # Restore original globals
        MIN_CHARS = orig_min_chars
        IDEAL_CHARS = orig_ideal_chars
        MAX_CHARS = orig_max_chars
        TARGET_MAX_SEC = orig_target_max_sec
        MIN_SEC = orig_min_sec
        MODE = orig_mode
        MIN_GAP = orig_min_gap
        ASS_STYLE_NAME = orig_style

def main():
    js_path = pick_json(OUT_DIR)
    out_path = os.path.join(OUT_DIR, OUT_NAME)
    
    num_caps = process_json_to_ass(
        js_path,
        out_path,
        max_chars=MAX_CHARS,
        target_max_sec=TARGET_MAX_SEC,
        min_sec=MIN_SEC,
        mode=MODE,
        min_gap=MIN_GAP,
        ass_style_name=ASS_STYLE_NAME
    )

    print(f"OK: wrote {num_caps} boxes -> {out_path}")
    print(f"source json: {os.path.basename(js_path)}")

if __name__ == "__main__":
    main()
