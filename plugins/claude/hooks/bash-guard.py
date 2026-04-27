"""Auto-approval guard for Viv plugin Bash invocations.

Reads a Claude Code `PreToolUse` hook JSON payload from stdin, determines
whether the Bash command is a known-safe Viv plugin invocation, and emits
the auto-approval decision if so. Falls through with no output otherwise,
letting Claude Code's normal permission prompt fire.

Principles (load-bearing — respect when modifying this file):

1. Allow-list only. Only explicitly-named commands auto-approve. Substring
   matches are never sufficient.
2. Per-segment validation. A compound command (joined by `&&`, `||`, `;`,
   or `|`) is approved only if every segment is independently allowed.
   Prevents `rm -rf ~ && vivc` from slipping through.
3. Parse failure fails closed. Subshells, backticks, unterminated quotes,
   or anything the tokenizer cannot parse cleanly cause the hook to fall
   through. Better a one-time permission prompt than a silent auto-approve.
4. Anchored regex only. Every allow pattern uses `^` and `$` markers and
   matches the whole segment (minus leading `VAR=value` env assignments).
"""
import json
import re
import sys
from typing import Final


ALLOW_PATTERNS: Final[list[re.Pattern[str]]] = [
    re.compile(r"^vivc(\s.*)?$"),
    re.compile(r"^viv_compiler(\s.*)?$"),
    re.compile(r"^viv-plugin-[a-z-]+(\s.*)?$"),
    re.compile(r"^npm\s+install\s+@siftystudio/viv-runtime(\s.*)?$"),
    re.compile(r"^npm\s+init\s+-y(\s.*)?$"),
    # `head` and `tail`, mainly for output trimming as pipe stages
    # (e.g. `vivc | head -100`). Allowed with flag-shaped or numeric args
    # only; positional file paths are rejected, so `head /etc/passwd`
    # doesn't auto-approve. Standalone `head`/`tail` (no file arg) is also
    # allowed because it just reads stdin and is harmless on its own.
    re.compile(r"^head(\s+(-[a-zA-Z0-9]+|\d+))*$"),
    re.compile(r"^tail(\s+(-[a-zA-Z0-9]+|\d+))*$"),
]


class BashParseError(Exception):
    """Raised when the input command cannot be parsed safely.

    Callers should treat this as a signal to fall through — the guard
    never auto-approves a command it cannot tokenize cleanly.
    """


def main() -> None:
    """Read the hook payload, emit auto-approval JSON or exit silently.

    The Claude Code hook protocol supplies a JSON payload on stdin. Reads
    `tool_input.command`, parses it, and emits an allow-decision JSON on
    stdout when every segment matches an allow pattern. Any other outcome
    (malformed input, parse failure, disallowed segment) exits silently so
    the normal permission prompt fires.
    """
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return
    command = payload.get("tool_input", {}).get("command", "")
    if not command:
        return
    try:
        parsed = segments(command=command)
    except BashParseError:
        return
    if not parsed or not all(is_allowed(segment=s) for s in parsed):
        return
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow",
            "permissionDecisionReason": "Viv plugin auto-approved all command segments",
        },
    }))


def segments(*, command: str) -> list[str]:
    """Split a Bash command string into top-level segments.

    Walks the command character by character, respecting single- and
    double-quote state, and splits on the unquoted operators `&&`, `||`,
    `;`, and `|`. Shell features the guard cannot reason about safely
    (backticks, `$(...)` subshells, unterminated quotes) raise
    `BashParseError`.

    Args:
        command: The Bash command string as supplied by Claude Code's Bash
            tool invocation.

    Returns:
        The list of stripped, non-empty segment strings in source order.

    Raises:
        BashParseError: The command contains a backtick.
        BashParseError: The command contains a `$(...)` subshell.
        BashParseError: The command contains an unterminated quote or a
            trailing backslash.
    """
    out: list[str] = []
    current: list[str] = []
    in_single = False
    in_double = False
    escape_next = False
    i = 0
    while i < len(command):
        c = command[i]
        if escape_next:
            current.append(c)
            escape_next = False
            i += 1
            continue
        if in_single:
            if c == "'":
                in_single = False
            current.append(c)
            i += 1
            continue
        if in_double:
            if c == "\\" and i + 1 < len(command):
                current.append(c)
                current.append(command[i + 1])
                i += 2
                continue
            if c == '"':
                in_double = False
            current.append(c)
            i += 1
            continue
        # Dispatch unquoted characters
        match c:
            case "\\":
                current.append(c)
                escape_next = True
                i += 1
            case "'":
                in_single = True
                current.append(c)
                i += 1
            case '"':
                in_double = True
                current.append(c)
                i += 1
            case ";":
                out.append("".join(current).strip())
                current = []
                i += 1
            case "&" if i + 1 < len(command) and command[i + 1] == "&":
                out.append("".join(current).strip())
                current = []
                i += 2
            case "|" if i + 1 < len(command) and command[i + 1] == "|":
                out.append("".join(current).strip())
                current = []
                i += 2
            case "|":
                out.append("".join(current).strip())
                current = []
                i += 1
            case "`":
                raise BashParseError("backtick substitution is not supported")
            case "$" if i + 1 < len(command) and command[i + 1] == "(":
                raise BashParseError("process substitution is not supported")
            case _:
                current.append(c)
                i += 1
    if in_single or in_double or escape_next:
        raise BashParseError("unterminated quote or trailing backslash")
    out.append("".join(current).strip())
    return [segment for segment in out if segment]


def is_allowed(*, segment: str) -> bool:
    """Check whether a single command segment matches the allow-list.

    Strips any leading `VAR=value` environment assignments (Claude Code
    does the same when matching `Bash(pattern)` filters), then tests the
    remainder against each compiled allow pattern. Returns on the first
    match.

    Args:
        segment: A single segment of a Bash command — no top-level
            operators (those are split by `segments`).

    Returns:
        True if the segment's effective command matches an allow pattern,
        False otherwise.
    """
    effective = strip_env_prefix(segment=segment)
    if not effective:
        return False
    return any(pattern.match(effective) for pattern in ALLOW_PATTERNS)


def strip_env_prefix(*, segment: str) -> str:
    """Drop leading `VAR=value` environment assignments from a segment.

    Claude Code's own `Bash(pattern)` filters match after these prefixes
    are stripped, so the guard mirrors that behaviour. Multiple consecutive
    assignments are supported.

    Args:
        segment: A single segment of a Bash command.

    Returns:
        The segment with any leading environment assignments removed. If
        the segment consists only of environment assignments, returns the
        empty string.
    """
    remaining = segment.lstrip()
    while True:
        match = re.match(r"^[A-Za-z_][A-Za-z0-9_]*=\S*\s*", remaining)
        if not match:
            return remaining
        remaining = remaining[match.end():]


if __name__ == "__main__":
    main()
