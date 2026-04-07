"""Manifest defining the reference material to use in DAPT aggregated training examples.

A few notes:
    - Each bundle groups thematically related source files into a single training example.
    - All paths are relative to the repository root (PATH_TO_VIV_MONOREPO_ROOT config param).
    - Glob patterns are supported for matching multiple files.
"""

__all__ = ["MANIFEST"]

from ..data import DAPTExampleSegmentModality
from ._types import Bundle, Manifest, Source

# Shorter handles on the modality names
_PROSE_MODALITY = DAPTExampleSegmentModality.PROSE
_VIV_CODE_MODALITY = DAPTExampleSegmentModality.VIV_CODE

# The manifest specifying how to construct each of the DAPT aggregated training examples
MANIFEST: Manifest = [
    # Chapters on language foundations, plus the grammar specification
    Bundle(
        example_id="ref-001",
        sources=[
            Source(path="docs/reference/language/01-introduction.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/02-lexical-elements.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/03-file-structure.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/04-includes.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/05-entities-and-symbols.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/06-names.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/07-expressions.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/08-statements-and-control-flow.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/22-glossary.md", modality=_PROSE_MODALITY),
            Source(path="compiler/src/viv_compiler/grammar/viv.peg", modality=_PROSE_MODALITY),
        ],
    ),
    # Chapters on the construct types, plus valid Viv fixtures
    Bundle(
        example_id="ref-002",
        sources=[
            Source(path="docs/reference/language/09-roles.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/10-actions.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/11-reactions.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/12-temporal-constraints.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/13-bindings.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/14-tropes.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/15-queries.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/16-sifting-patterns.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/17-plans.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/18-selectors.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/19-compiler-output.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/20-runtime-model.md", modality=_PROSE_MODALITY),
            Source(path="docs/reference/language/21-appendix-a-implementation-notes.md", modality=_PROSE_MODALITY),
            Source(path="compiler/tests/fixtures/valid/*.viv", modality=_VIV_CODE_MODALITY),
            Source(path="compiler/tests/fixtures/includes/valid/*.viv", modality=_VIV_CODE_MODALITY),
        ],
    ),
    # TypeScript type definitions
    Bundle(
        example_id="ref-003",
        sources=[
            Source(path="runtimes/js/src/content-bundle/types.ts", modality=_PROSE_MODALITY),
            Source(path="runtimes/js/src/dsl/types.ts", modality=_PROSE_MODALITY),
            Source(path="runtimes/js/src/adapter/types.ts", modality=_PROSE_MODALITY),
        ],
    ),
]
