"""Print session startup report for the orchestrator.

Usage:
    python scripts/startup.py --synthesis-root /abs/path/to/synthesis

Outputs a plain-text report covering:
  - Session file status (exists / doesn't exist)
  - Partial assignments (provisional activity log entries with "Result: pending")
  - Competency coverage from status.md
  - Domain and schema coverage from status.md
  - Next available assignment ID
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def _read_status_tables(status_path: Path) -> str:
    """Extract competency, domain, and schema coverage tables from status.md."""
    text = status_path.read_text()
    sections: list[str] = []

    for header in ("Competency Coverage", "Domain Coverage", "Schema Rotation"):
        pattern = rf"## {re.escape(header)}\s*\n(.*?)(?=\n## |\Z)"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            sections.append(f"## {header}\n{match.group(1).strip()}")

    return "\n\n".join(sections)


def _find_partials(status_path: Path) -> list[dict]:
    """Find provisional activity log entries (Result: pending) in status.md."""
    if not status_path.exists():
        return []

    text = status_path.read_text()
    partials: list[dict] = []

    # Each activity log entry starts with "- `DATE` `asmt-NNNN`"
    # Split into entries and check for "Result: pending"
    entry_pattern = re.compile(
        r"^- `[\d-]+` `(asmt-\d+)`\s*\n((?:  .*\n)*)",
        re.MULTILINE,
    )
    for match in entry_pattern.finditer(text):
        asmt_id = match.group(1)
        body = match.group(2)
        if "Result: pending" in body:
            schema_m = re.search(r"Schema: `([^`]+)`", body)
            level_m = re.search(r"Author expertise level: `([^`]+)`", body)
            partials.append({
                "id": asmt_id,
                "schema": schema_m.group(1) if schema_m else "unknown",
                "level": level_m.group(1) if level_m else "unknown",
            })

    return partials


def _next_id(status_path: Path, assignments_dir: Path) -> str:
    """Compute next sequential assignment ID from directories on disk."""
    nums: list[int] = []
    if assignments_dir.is_dir():
        for d in assignments_dir.iterdir():
            m = re.match(r"asmt-(\d+)", d.name)
            if m and d.is_dir():
                nums.append(int(m.group(1)))
    return f"asmt-{max(nums) + 1:04d}" if nums else "asmt-0001"


def _count_dirs(assignments_dir: Path) -> int:
    if not assignments_dir.is_dir():
        return 0
    return sum(1 for d in assignments_dir.iterdir() if d.is_dir() and d.name.startswith("asmt-"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Print session startup report.")
    parser.add_argument("--synthesis-root", required=True)
    args = parser.parse_args()

    root = Path(args.synthesis_root).resolve()
    status_path = root / "status.md"
    assignments_dir = root / "assignments"

    lines: list[str] = []
    lines.append("# Session Startup Report")
    lines.append("")

    # Session file check
    session_file = root / "session.md"
    if session_file.exists():
        lines.append("## Session File")
        lines.append("")
        lines.append("WARNING: session.md exists from a previous session.")
        lines.append("A prior session may have ended abnormally.")
        lines.append("")
    else:
        lines.append("## Session File")
        lines.append("")
        lines.append("No existing session file. Clean start.")
        lines.append("")

    # Partial assignments (from status.md provisional entries)
    partials = _find_partials(status_path)

    lines.append("## Partial Assignments")
    lines.append("")
    if partials:
        lines.append(f"{len(partials)} partial assignment(s) detected:")
        lines.append("")
        lines.append("| Assignment | Schema | Level |")
        lines.append("|------------|--------|-------|")
        for p in partials:
            lines.append(f"| `{p['id']}` | `{p['schema']}` | `{p['level']}` |")
        lines.append("")
    else:
        lines.append("None. All assignments have been reviewed.")
        lines.append("")

    # Coverage tables from status.md
    if status_path.exists():
        lines.append(_read_status_tables(status_path))
        lines.append("")

    # Next assignment ID
    total = _count_dirs(assignments_dir)
    next_id = _next_id(status_path, assignments_dir)
    lines.append("## Next Assignment")
    lines.append("")
    lines.append(f"Next ID: `{next_id}`")
    lines.append(f"Total existing: {total}")
    lines.append("")

    sys.stdout.write("\n".join(lines))


if __name__ == "__main__":
    main()
