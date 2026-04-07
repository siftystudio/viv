"""Patch synthesized DAPT examples to account for post-synthesis grammar changes.

REUSE GUIDE
===========

This script is a template for patching synthesized data after Viv grammar changes.
The specific rules below were written for two commits (1c7e263, 5f52d26) but the
structure is designed to be adapted. Here's how:

1. IDENTIFY THE GRAMMAR DIFF. Run `git diff <synthesis-commit>..<current>` on
   viv.peg. Each changed production tells you what to patch. The categories are:

   (a) KEYWORD CASE CHANGE (e.g., "FOREVER" → "forever"). If the keyword only
       appears in one syntactic position, match it with its left-context
       (e.g., r"(time:\\s*)FOREVER\\b"). If it's standalone on a line (like plan
       instructions), anchor with ^ and $ in MULTILINE mode. See steps 1–6 in
       patch_viv_code().

   (b) KEYWORD GAINS/LOSES PUNCTUATION (e.g., ADVANCE → advance;). Same approach
       as (a), but the replacement string includes the new punctuation. For prose,
       decide whether the punctuation belongs (backtick-quoted: yes; bare English
       reference: probably no). See step 6 vs prose step 4.

   (c) PRODUCTION REMOVED (e.g., number_word removed from time_period). Build a
       regex that matches the old form ONLY in the syntactic position it occupied.
       For number words, that meant matching word+time-unit. A word like "three"
       is too generic to replace globally — the left/right context is what makes
       it safe.

   (d) KEYWORD RENAMED IN STRUCTURAL POSITION (e.g., reaction window "end" →
       "close"). This is the hardest category because the old keyword may appear
       in many other positions (conditionals, loops). Use _patch_reaction_window_end()
       as the model: track nesting with an indent stack, only replace when the
       indent matches an opener. Regex alone is not sufficient here.

2. WRITE THE viv_code RULES FIRST. These are precise because Viv syntax is
   unambiguous. User-defined enum values always carry a # prefix, so bare
   ALL_CAPS words in code are always DSL keywords.

3. DERIVE prose RULES FROM THE viv_code RULES. Prose references to DSL syntax
   come in three forms, from safest to riskiest:
     - Backtick-quoted phrases: `location: HERE` — match with r"`..`" wrappers
     - Backtick-quoted single keywords: `FOREVER` — safe, same pattern
     - Bare ALL_CAPS keywords in prose: FOREVER, ADVANCE — safe if the word
       has no common English meaning in ALL_CAPS. Dangerous for ACTION, NOW,
       HEARING etc. Skip bare replacements for ambiguous words; the phrase
       replacements (step 1) catch the important ones.

   For number words in prose: only replace inside backtick spans. Use the
   split-on-backtick approach (step 8 in patch_prose), NOT a single regex — a
   single regex will match across backtick boundaries and produce false positives
   in plain English prose.

4. ALWAYS LOG EVERY CHANGE. The ChangeLog class and _context() helper are
   reusable as-is. After running, audit the log (or have Claude audit it) before
   swapping the patched file into place. Check especially:
     - Reaction-window / structural replacements (verify every instance)
     - Number/word replacements (watch for identifiers like @one, comments)
     - Bare-constant prose replacements (watch for English false positives)

5. KNOWN GAPS in the prose patching (acceptable tradeoffs):
     - Bare ACTION/NOW/HEARING without "from" prefix are left alone (too common
       as English words). If a future change affects an unambiguous keyword,
       add it to the bare-constant list without hesitation.
     - Reaction window "end" → "close" in prose is only caught when both the
       opener and "end" are individually backtick-quoted in proximity. Freeform
       prose descriptions of reaction windows may be missed.

First run (2026-03-19) patched these grammar changes:
  1c7e263 — ALL_CAPS constants → lowercase; ADVANCE/SUCCEED/FAIL gain semicolons;
            reaction window 'end' → 'close'
  5f52d26 — number words (one–twelve) removed from time_period; must use digits

This script reads synthesized-examples.jsonl, applies targeted fixes to both
viv_code and prose segments, writes a corrected copy, and produces a detailed
change log for review.
"""

import json
import re
import sys
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "examples"
INPUT_PATH = DATA_DIR / "synthesized-examples.jsonl"
OUTPUT_PATH = DATA_DIR / "synthesized-examples-patched.jsonl"
LOG_PATH = DATA_DIR / "patch-log.txt"

# ── Number-word mapping ────────────────────────────────────────────────────

WORD_TO_DIGIT = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
    "eleven": "11", "twelve": "12",
}

TIME_UNITS = r"(?:minutes?|hours?|days?|weeks?|months?|years?)"

# ── Change logger ──────────────────────────────────────────────────────────

class ChangeLog:
    def __init__(self):
        self.entries: list[str] = []
        self._counts: dict[str, int] = {}

    def record(self, entry_id: str, seg_idx: int, modality: str,
               rule: str, old: str, new: str, context: str = ""):
        self._counts[rule] = self._counts.get(rule, 0) + 1
        ctx_display = f"  context: {context}" if context else ""
        self.entries.append(
            f"[{entry_id}] seg {seg_idx} ({modality}) | {rule}\n"
            f"  old: {old!r}\n"
            f"  new: {new!r}\n"
            f"{ctx_display}"
        )

    def write(self, path: Path):
        with open(path, "w") as f:
            f.write("PATCH LOG — synthesized-examples.jsonl grammar fixes\n")
            f.write("=" * 60 + "\n\n")
            f.write("SUMMARY\n")
            f.write("-" * 60 + "\n")
            for rule, count in sorted(self._counts.items()):
                f.write(f"  {rule}: {count}\n")
            f.write(f"  TOTAL: {sum(self._counts.values())}\n")
            f.write("\n" + "=" * 60 + "\n\n")
            f.write("DETAILED CHANGES\n")
            f.write("-" * 60 + "\n\n")
            for e in self.entries:
                f.write(e + "\n\n")

    @property
    def total(self):
        return sum(self._counts.values())

    @property
    def counts(self):
        return dict(self._counts)


# ── viv_code transforms ───────────────────────────────────────────────────

def patch_viv_code(text: str, entry_id: str, seg_idx: int, log: ChangeLog) -> str:
    """Apply all grammar fixes to a viv_code segment."""

    # --- 1. Phrase replacements for temporal anchors ---
    for old_const, new_const in [("ACTION", "action"), ("HEARING", "hearing"), ("NOW", "now")]:
        pattern = re.compile(r"\bfrom\s+" + old_const + r"\b")
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "viv_code",
                       f"temporal-anchor:from-{old_const}", m.group(), f"from {new_const}", ctx)
        text = pattern.sub(f"from {new_const}", text)

    # --- 2. AGO (standalone temporal anchor) ---
    # Must not be inside an identifier — \bAGO\b is sufficient since AGO is all caps
    # and identifiers in Viv don't use all caps (user enums have # prefix)
    pattern = re.compile(r"\bAGO\b")
    for m in pattern.finditer(text):
        ctx = _context(text, m.start(), m.end())
        log.record(entry_id, seg_idx, "viv_code", "temporal-anchor:AGO", "AGO", "ago", ctx)
    text = pattern.sub("ago", text)

    # --- 3. Embargo location constants ---
    for old_const, new_const in [("HERE", "here"), ("ANYWHERE", "anywhere")]:
        pattern = re.compile(r"(location:\s*)" + old_const + r"\b")
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "viv_code",
                       f"embargo-location:{old_const}", m.group(), f"{m.group(1)}{new_const}", ctx)
        text = pattern.sub(rf"\g<1>{new_const}", text)

    # --- 4. Embargo time FOREVER ---
    pattern = re.compile(r"(time:\s*)FOREVER\b")
    for m in pattern.finditer(text):
        ctx = _context(text, m.start(), m.end())
        log.record(entry_id, seg_idx, "viv_code",
                   "embargo-time:FOREVER", m.group(), f"{m.group(1)}forever", ctx)
    text = pattern.sub(r"\g<1>forever", text)

    # --- 5. Search domain constants ---
    for old_const, new_const in [("INHERIT", "inherit"), ("CHRONICLE", "chronicle")]:
        pattern = re.compile(r"(over:\s*)" + old_const + r"\b")
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "viv_code",
                       f"search-domain:{old_const}", m.group(), f"{m.group(1)}{new_const}", ctx)
        text = pattern.sub(rf"\g<1>{new_const}", text)

    # --- 6. Plan instructions: ADVANCE/SUCCEED/FAIL → advance;/succeed;/fail; ---
    for old_const, new_const in [("ADVANCE", "advance;"), ("SUCCEED", "succeed;"), ("FAIL", "fail;")]:
        pattern = re.compile(r"^(\s*)" + old_const + r"\s*$", re.MULTILINE)
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "viv_code",
                       f"plan-instruction:{old_const}", old_const, new_const, ctx)
        text = pattern.sub(rf"\g<1>{new_const}", text)

    # --- 7. Reaction window end → close (indent-aware) ---
    text = _patch_reaction_window_end(text, entry_id, seg_idx, log)

    # --- 8. Number words → digits before time units ---
    word_pattern = "|".join(WORD_TO_DIGIT.keys())
    pattern = re.compile(
        r"\b(" + word_pattern + r")\b(\s+)(" + TIME_UNITS + r")\b"
    )
    def _replace_number_word(m):
        word = m.group(1)
        digit = WORD_TO_DIGIT[word]
        ctx = _context(text, m.start(), m.end())
        log.record(entry_id, seg_idx, "viv_code",
                   "number-word", m.group(), f"{digit}{m.group(2)}{m.group(3)}", ctx)
        return f"{digit}{m.group(2)}{m.group(3)}"
    text = pattern.sub(_replace_number_word, text)

    return text


def _patch_reaction_window_end(text: str, entry_id: str, seg_idx: int, log: ChangeLog) -> str:
    """Replace 'end' with 'close' only when it closes a reaction window block."""
    lines = text.split("\n")
    # Stack of indent levels where we've seen a reaction window opener
    window_indents: list[int] = []
    result = []

    for i, line in enumerate(lines):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        # Check for reaction window opener: all:/any:/untracked: on own line
        if re.match(r"^(all|any|untracked):\s*$", stripped):
            window_indents.append(indent)
            result.append(line)
            continue

        # Check for 'end' that might close a reaction window
        if re.match(r"^end\s*$", stripped) and window_indents:
            # Does this 'end' match the indent of a reaction window opener?
            if indent == window_indents[-1]:
                new_line = line.replace("end", "close", 1)
                ctx_before = lines[max(0, i - 2):i]
                ctx_after = lines[i + 1:min(len(lines), i + 2)]
                context = " | ".join(ctx_before + [line] + ctx_after)
                log.record(entry_id, seg_idx, "viv_code",
                           "reaction-window:end→close", "end", "close", context)
                window_indents.pop()
                result.append(new_line)
                continue

        # An 'end' or block exit at or below a window's indent that ISN'T the window close
        # means we've left that context without finding the close (shouldn't happen in valid code)
        # Pop any window indents that are >= current indent for non-window-close 'end'
        if re.match(r"^end\s*$", stripped):
            window_indents = [wi for wi in window_indents if wi < indent]

        result.append(line)

    return "\n".join(result)


# ── prose transforms ──────────────────────────────────────────────────────

def patch_prose(text: str, entry_id: str, seg_idx: int, log: ChangeLog) -> str:
    """Apply grammar-related fixes to prose segments."""

    # --- 1. Backtick-quoted code phrases: `location: HERE` etc. ---
    # These are inline code in prose that quotes Viv syntax.
    phrase_replacements = [
        (r"from ACTION", "from action"),
        (r"from HEARING", "from hearing"),
        (r"from NOW", "from now"),
        (r"location: HERE", "location: here"),
        (r"location: ANYWHERE", "location: anywhere"),
        (r"time: FOREVER", "time: forever"),
        (r"over: INHERIT", "over: inherit"),
        (r"over: CHRONICLE", "over: chronicle"),
    ]
    for old_phrase, new_phrase in phrase_replacements:
        # Match both backtick-quoted and bare occurrences
        pattern = re.compile(re.escape(old_phrase))
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "prose",
                       f"phrase:{old_phrase}", old_phrase, new_phrase, ctx)
        text = pattern.sub(new_phrase, text)

    # --- 2. AGO as standalone DSL reference ---
    pattern = re.compile(r"\bAGO\b")
    for m in pattern.finditer(text):
        ctx = _context(text, m.start(), m.end())
        log.record(entry_id, seg_idx, "prose", "constant:AGO", "AGO", "ago", ctx)
    text = pattern.sub("ago", text)

    # --- 3. Backtick-quoted single constants: `ADVANCE` → `advance;` etc. ---
    for old_const, new_const in [("ADVANCE", "advance;"), ("SUCCEED", "succeed;"), ("FAIL", "fail;")]:
        pattern = re.compile(r"`" + old_const + r"`")
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "prose",
                       f"backtick-constant:{old_const}",
                       f"`{old_const}`", f"`{new_const}`", ctx)
        text = pattern.sub(f"`{new_const}`", text)

    # --- 4. Bare plan-instruction constants in prose (no backticks) ---
    # These are ALL_CAPS words referring to the DSL concept. In prose they become
    # lowercase without semicolons (the semicolon is syntax, not the name).
    for old_const in ["ADVANCE", "SUCCEED", "FAIL"]:
        pattern = re.compile(r"(?<!`)\b" + old_const + r"\b(?!`)")
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "prose",
                       f"bare-constant:{old_const}", old_const, old_const.lower(), ctx)
        text = pattern.sub(old_const.lower(), text)

    # --- 5. Backtick-quoted other constants ---
    for old_const, new_const in [
        ("HERE", "here"), ("ANYWHERE", "anywhere"), ("FOREVER", "forever"),
        ("INHERIT", "inherit"), ("CHRONICLE", "chronicle"),
        ("ACTION", "action"), ("NOW", "now"), ("HEARING", "hearing"),
    ]:
        pattern = re.compile(r"`" + old_const + r"`")
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "prose",
                       f"backtick-constant:{old_const}",
                       f"`{old_const}`", f"`{new_const}`", ctx)
        text = pattern.sub(f"`{new_const}`", text)

    # --- 6. Bare embargo/search constants in prose ---
    # FOREVER, HERE, ANYWHERE, INHERIT, CHRONICLE — unambiguous in ALL_CAPS
    for old_const in ["FOREVER", "HERE", "ANYWHERE", "INHERIT", "CHRONICLE"]:
        pattern = re.compile(r"(?<!`)\b" + old_const + r"\b(?!`)")
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "prose",
                       f"bare-constant:{old_const}", old_const, old_const.lower(), ctx)
        text = pattern.sub(old_const.lower(), text)

    # --- 7. Bare ACTION/NOW/HEARING in prose ---
    # More ambiguous — only replace when preceded by 'from' or when clearly a DSL reference.
    # Bare ACTION without 'from' context is too risky (common word in Viv discussions).
    # NOW and HEARING similarly ambiguous in bare form.
    # (Phrase replacements in step 1 already handled 'from ACTION/NOW/HEARING'.)

    # --- 8. Number words → digits in backtick-quoted code ---
    # Find backtick-delimited spans first, then replace number words only within them.
    word_pattern_re = re.compile(
        r"\b(" + "|".join(WORD_TO_DIGIT.keys()) + r")\b(\s+)(" + TIME_UNITS + r")\b"
    )
    def _replace_in_backtick_spans(text_inner):
        parts = text_inner.split("`")
        # Odd-indexed parts are inside backticks: a`b`c`d`e → [a, b, c, d, e]
        for i in range(1, len(parts), 2):
            def _repl(m, _part_idx=i):
                word = m.group(1)
                digit = WORD_TO_DIGIT[word]
                log.record(entry_id, seg_idx, "prose",
                           "number-word-in-backtick", word, digit,
                           f"in backtick span: `{parts[_part_idx]}`")
                return f"{digit}{m.group(2)}{m.group(3)}"
            parts[i] = word_pattern_re.sub(_repl, parts[i])
        return "`".join(parts)
    text = _replace_in_backtick_spans(text)

    # --- 9. Reaction window 'end' → 'close' in prose references ---
    # Look for backtick-quoted references to the reaction window close keyword
    # These are rare; log but handle: `end` in context of reaction windows
    # Too ambiguous to auto-replace bare `end` — it's used for conditionals/loops too.
    # Only replace when explicitly paired with reaction window context.
    for pattern_str in [
        r"`all:` [^`]*`end`",
        r"`any:` [^`]*`end`",
        r"`untracked:` [^`]*`end`",
    ]:
        pattern = re.compile(pattern_str)
        for m in pattern.finditer(text):
            ctx = _context(text, m.start(), m.end())
            log.record(entry_id, seg_idx, "prose",
                       "reaction-window-end-in-prose", m.group(), m.group().replace("`end`", "`close`"), ctx)
        text = pattern.sub(lambda m: m.group().replace("`end`", "`close`"), text)

    return text


# ── Helpers ───────────────────────────────────────────────────────────────

def _context(text: str, start: int, end: int, window: int = 60) -> str:
    """Return surrounding context for a match."""
    ctx_start = max(0, start - window)
    ctx_end = min(len(text), end + window)
    before = text[ctx_start:start].replace("\n", " | ")
    match = text[start:end]
    after = text[end:ctx_end].replace("\n", " | ")
    return f"...{before}>>>{match}<<<{after}..."


# ── Main ──────────────────────────────────────────────────────────────────

def main():
    if not INPUT_PATH.exists():
        print(f"ERROR: {INPUT_PATH} not found", file=sys.stderr)
        sys.exit(1)

    log = ChangeLog()
    patched_entries = []

    with open(INPUT_PATH) as f:
        raw_lines = f.readlines()

    for line_num, raw_line in enumerate(raw_lines):
        entry = json.loads(raw_line)
        entry_id = entry.get("id", f"line-{line_num}")

        for seg_idx, seg in enumerate(entry["segments"]):
            modality = seg["modality"]
            original_text = seg["text"]

            if modality == "viv_code":
                seg["text"] = patch_viv_code(original_text, entry_id, seg_idx, log)
            elif modality == "prose":
                seg["text"] = patch_prose(original_text, entry_id, seg_idx, log)
            # other modalities left untouched

        patched_entries.append(json.dumps(entry, ensure_ascii=False))

    # Write outputs
    with open(OUTPUT_PATH, "w") as f:
        f.write("\n".join(patched_entries) + "\n")

    log.write(LOG_PATH)

    print(f"Patched {len(raw_lines)} entries → {OUTPUT_PATH.name}")
    print(f"Change log ({log.total} changes) → {LOG_PATH.name}")
    print()
    print("Summary:")
    for rule, count in sorted(log.counts.items()):
        print(f"  {rule}: {count}")
    print(f"  TOTAL: {log.total}")


if __name__ == "__main__":
    main()
