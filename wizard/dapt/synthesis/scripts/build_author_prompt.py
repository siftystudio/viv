"""Assemble the author agent prompt from handoff templates.

Usage:
    python scripts/build_author_prompt.py \\
        --level intermediate \\
        --assignment-dir /abs/path/to/assignments/asmt-0002 \\
        --monorepo-root /abs/path/to/monorepo

    Add --continuation for resuming a partially completed assignment.

Outputs the assembled prompt to stdout.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

LEVELS = ("novice", "intermediate", "expert")

DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

HANDOFF_BASE = DOCS_DIR / "author-handoff.md"
ADDENDA = {
    "novice": DOCS_DIR / "author-handoff-addendum-novice.md",
    "intermediate": DOCS_DIR / "author-handoff-addendum-intermediate.md",
    "expert": DOCS_DIR / "author-handoff-addendum-expert.md",
}

CONTINUATION_PARAGRAPH = """
---

## Continuation

You are continuing a partially completed assignment. Read the existing
`log.md` and `.viv` files in your assignment directory to understand where
the previous session left off, and continue from that point. The commission
still describes the overall goals.
"""


def build_prompt(
    *, level: str, assignment_dir: str, monorepo_root: str, continuation: bool = False
) -> str:
    """Read the base handoff and the level-specific addendum, fill placeholders,
    and return the concatenated prompt."""
    replacements = {
        "{MONOREPO}": monorepo_root,
        "{ASSIGNMENT_DIR}": assignment_dir,
        "{LEVEL}": level,
    }

    base = HANDOFF_BASE.read_text()
    addendum = ADDENDA[level].read_text()
    combined = base + "\n" + addendum

    if continuation:
        combined += CONTINUATION_PARAGRAPH

    for placeholder, value in replacements.items():
        combined = combined.replace(placeholder, value)

    return combined


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Assemble the author agent prompt from handoff templates.",
    )
    parser.add_argument("--level", required=True, choices=LEVELS)
    parser.add_argument("--assignment-dir", required=True)
    parser.add_argument("--monorepo-root", required=True)
    parser.add_argument(
        "--continuation",
        action="store_true",
        help="Append continuation instructions for resuming a partial assignment.",
    )
    args = parser.parse_args()

    sys.stdout.write(
        build_prompt(
            level=args.level,
            assignment_dir=args.assignment_dir,
            monorepo_root=args.monorepo_root,
            continuation=args.continuation,
        )
    )


if __name__ == "__main__":
    main()
