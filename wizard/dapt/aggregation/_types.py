"""Internal types used by the aggregator."""

from __future__ import annotations

from typing_extensions import TypedDict

from ..data import DAPTExampleSegmentModality


# A manifest defining the reference material bundles to use for DAPT aggregated training examples
Manifest = list["Bundle"]


class Bundle(TypedDict):
    """A group of source files to aggregate into a single training example."""
    # A unique identifier for this bundle, which will be used as the example ID
    example_id: str
    # Ordered list of sources making up this bundle
    sources: list[Source]


class Source(TypedDict):
    """A source file or glob pattern to include in an aggregated training example."""
    # File path or glob pattern, relative to the repository root
    path: str
    # The modality of the segment
    modality: DAPTExampleSegmentModality
