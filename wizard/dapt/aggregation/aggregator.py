"""Core module that aggregates DAPT training examples and writes them to disk."""

__all__ = ["aggregate"]

import json
from pathlib import Path

from ..data import DAPTExample, DAPTExampleSegment, DAPTExampleSegmentModality
from ._config import CHARS_PER_TOKEN, DEFAULT_COMPETENCY, PATH_TO_OUTPUT_FILE, PATH_TO_VIV_MONOREPO_ROOT
from ._manifest import MANIFEST
from ._types import Bundle, Source


def aggregate() -> None:
    """Create DAPT aggregated training examples and write them to file.

    Returns:
        None. Writes the examples to file.
    """
    # Aggregate all examples
    print("Creating aggregated training examples...")
    examples: list[DAPTExample] = []
    for bundle in MANIFEST:
        dapt_example = _aggregate_example(bundle=bundle)
        examples.append(dapt_example)
    # Write out a single examples file
    with open(PATH_TO_OUTPUT_FILE, mode="w", encoding="utf-8") as output_file:
        for example in examples:
            output_file.write(json.dumps(obj=example, ensure_ascii=False) + "\n")
    print(f"\nWrote {len(examples)} examples to {PATH_TO_OUTPUT_FILE}")


def _aggregate_example(*, bundle: Bundle) -> DAPTExample:
    """Return a DAPT aggregated example prepared from the given manifest bundle.

    Args:
        bundle: The manifest bundle specifying the source files from which
                the aggregated example will be prepared.

    Returns:
        The prepared DAPT aggregated example. Also prints some statistics.
    """
    resolved_sources = _resolve_sources(sources=bundle["sources"])
    dapt_example_segments = _build_segments(resolved_sources=resolved_sources)
    dapt_example_total_characters = sum(len(segment["text"]) for segment in dapt_example_segments)
    dapt_example_token_estimate = dapt_example_total_characters // CHARS_PER_TOKEN
    competencies = {DEFAULT_COMPETENCY: dapt_example_token_estimate} if DEFAULT_COMPETENCY else {}
    dapt_example = DAPTExample(id=bundle["example_id"], competencies=competencies, segments=dapt_example_segments)
    print(f"* {bundle['example_id']}")
    print(f"  - {len(dapt_example['segments'])} segments")
    print(f"  - ~{dapt_example_token_estimate:,} tokens")
    return dapt_example


def _resolve_sources(*, sources: list[Source]) -> list[tuple[Path, DAPTExampleSegmentModality]]:
    """Expand source entries into concrete (file_path, modality) pairs.

    Paths containing glob characters (`*`, `?`, `[`) are expanded and then sorted alphabetically.

    Args:
        sources: Source entries from the manifest.

    Returns:
        A list of (absolute_path, modality) pairs, in manifest order.

    Raises:
        ValueError: If a glob pattern does not match any files.
        FileNotFoundError: If a literal path does not exist.
    """
    resolved: list[tuple[Path, DAPTExampleSegmentModality]] = []
    for source in sources:
        # If the path is a glob pattern, expand it
        if any(char in source["path"] for char in ("*", "?", "[")):
            matches = sorted(PATH_TO_VIV_MONOREPO_ROOT.glob(source["path"]))
            if not matches:
                raise ValueError(f"Glob pattern did not match any files: {source['path']}")
            for match in matches:
                resolved.append((match, source["modality"]))
        else:
            # Otherwise, treat it as a literal file path
            full_path = PATH_TO_VIV_MONOREPO_ROOT / source["path"]
            if not full_path.exists():
                raise FileNotFoundError(f"Source file not found: {source['path']}")
            resolved.append((full_path, source["modality"]))
    return resolved


def _build_segments(*, resolved_sources: list[tuple[Path, DAPTExampleSegmentModality]]) -> list[DAPTExampleSegment]:
    """Read each source file and package it up as a segment.

    Empty files are silently skipped, because these are likely empty Viv files used as test fixtures.

    Args:
        resolved_sources: The (file_path, modality) pairs to read.

    Returns:
        A list of segment dicts with `modality` and `text` keys.
    """
    segments: list[DAPTExampleSegment] = []
    for file_path, modality in resolved_sources:
        text = file_path.read_text(encoding="utf-8")
        # Skip empty files (e.g., empty_file.viv test fixture)
        if not text.strip():
            continue
        dapt_example_segment = DAPTExampleSegment(modality=modality, text=text)
        segments.append(dapt_example_segment)
    return segments
