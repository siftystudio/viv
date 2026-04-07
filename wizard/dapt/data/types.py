"""Module exposing external types associated with DAPT training examples."""

from __future__ import annotations

from enum import StrEnum, auto
from typing_extensions import TypedDict


class DAPTExample(TypedDict):
    """An example ready for use in domain-adaptive pretraining for a Viv wizard LoRA adapter."""
    # A unique ID for the example
    id: str
    # Estimated token volumes (~4 characters per token) for each wizard competency. Keys are elided
    # for competencies that do not appear to be present in the example. Note that a segment may
    # contribute tokens to multiple competencies, since we double-count in cases where the signature
    # of one competency is subsumed by or overlaps the signature of a nearby attested competency.
    competencies: dict[VivWizardCompetency, int]
    # The annotated text segments making up this example, in order
    segments: list[DAPTExampleSegment]


class DAPTExampleSegment(TypedDict):
    """An annotated text segment in an example intended for domain-adaptive pretraining."""
    # The modality of the segment (prose, code, or compiler output)
    modality: DAPTExampleSegmentModality
    # The raw text making up the segment
    text: str


class DAPTExampleSegmentModality(StrEnum):
    """Enum containing the modalities for a text segment in an example intended for domain-adaptive pretraining."""
    # Marks a prose segment
    PROSE = auto()
    # Marks a segment exclusively containing Viv code
    VIV_CODE = auto()
    # Marks a segment constituted in a compiler error message
    COMPILER_ERROR_MESSAGE = auto()
    # Marks a segment constituted in a compiler success message
    COMPILER_SUCCESS_MESSAGE = auto()


class VivWizardCompetency(StrEnum):
    """Enum containing the core Viv wizard competencies.

    As documented below, these competencies map onto distinct conditional distributions
    in terms of the kinds of tokens that would appear in a log showing the wizard
    demonstrating the competency.
    """
    # Ideation prose conditionalizes further ideation prose
    IDEATION_TO_IDEATION = auto()
    # Ideation prose conditionalizes valid Viv code
    IDEATION_TO_CODE = auto()
    # Partial or stub code conditionalizes completed code
    PARTIAL_CODE_TO_COMPLETED_CODE = auto()
    # Viv code conditionalizes a (predicted) compiler output message
    CODE_TO_COMPILER_OUTPUT = auto()
    # Broken code and a compiler error message conditionalizes diagnostic prose and a repair plan
    ERROR_MESSAGE_TO_DIAGNOSIS = auto()
    # Broken code, a compiler error message, and diagnostic prose conditionalizes repaired code
    BROKEN_CODE_TO_REPAIRED_CODE = auto()
    # Ideation, working code, and a compiler success message conditionalizes ideation prose
    WORKING_CODE_TO_IDEATION = auto()
    # Viv code and ideation prose specifying refinement goal conditionalizes refined Viv code
    CODE_TO_REVISED_CODE = auto()
    # Viv code conditionalizes a prose explanation of the code
    CODE_TO_EXPLANATION = auto()
    # Viv code conditionalizes critique prose
    CODE_TO_CRITIQUE = auto()
    # A host application schema (with no prior ideation) conditionalizes narrative construct ideas
    SCHEMA_TO_CONSTRUCT_IDEATION = auto()
    # A host application schema and Viv code conditionalizes runtime behavior prediction
    SCHEMA_AND_CODE_TO_RUNTIME_PREDICTION = auto()
