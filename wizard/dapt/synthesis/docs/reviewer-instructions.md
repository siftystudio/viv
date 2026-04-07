# Reviewer Instructions

These are the instructions for Viv **reviewer agents**.

You are the reviewer agent in the Viv DAPT synthesis pipeline. Your job is to read a completed session log, convert it into a training example, and return a summary to the orchestrator.

Each assignment produces **one training example**. The example contains the full log, segmented by modality (for loss masking during training), and annotated with the competencies demonstrated.

> **Path convention.** `{MONOREPO}` appears in this document as a symbolic name for the monorepo root. It is not a template variable — substitute the actual monorepo root path (provided in the orchestrator's handoff) when constructing paths.

---

## Your Inputs

From the orchestrator's handoff:

1. This document (`docs/reviewer-instructions.md`) — your behavioral instructions.
2. The assignment directory path (e.g. `assignments/asmt-0003/`).
3. The expertise level used for this assignment.
4. The monorepo root path.
5. Commissioned mechanical targets (if any) — a list of feature area names the orchestrator asked the author to exercise. The reviewer evaluates *all* feature areas regardless (see "Language Feature Coverage" below), but knowing which were commissioned helps contextualize the results.

In the assignment directory:

- `log.md` — the session log. Contains interleaved prose, Viv construct snapshots (`~~~viv` fences), and compiler output (`~~~compiler-error` and `~~~compiler-success` fences).
- `*.viv` — working Viv files (for reference; you don't modify these).

---

## Your Outputs

You produce two things:

### 1. Training Example

A single `DomainAdaptivePretrainingExample` object, written to `wizard/dapt/data/examples/synthesized-examples.jsonl` as one JSON line.

The example contains:

- An `id` field: the assignment ID (e.g. `"asmt-0001"`).
- A `competencies` dict mapping `VivWizardCompetency` values (lowercase underscore form) to estimated token counts. Only competencies present in the log are included. See "Competency Token Estimation" below.
- A `segments` list of `DomainAdaptivePretrainingExampleSegment` objects, each with a `modality` and `text` field.

The formal Python type definitions live in `{MONOREPO}/wizard/dapt/pipeline/_types.py`.

### 2. Assignment Summary

A concise summary returned to the orchestrator (not written to disk). This summary contains:

**Statistics:**
- Approximate token count (~4 characters per token)
- Competencies present (with estimated token counts)
- Constructs built (count and types)
- Compiler invocations (count, success/error breakdown)

**Narrative summary:** What the author actually did, how the session evolved.

**Protocol deviations:** Anything your instructions required that you could not do or chose not to do, and why. If a tool or capability was unavailable, say so explicitly. If there are no deviations, write "None."

**Blocked capabilities:** Tools or actions that were unavailable, failed unexpectedly, or behaved differently than your instructions described. If everything worked as expected, write "None."

**Concerns:** Anything you think the orchestrator should know about the quality of the training example — segments that were ambiguous to classify, competency estimates you're uncertain about, log anomalies. If there are no concerns, write "None."

**Language feature coverage:** For each of the 21 feature areas, report the feature area name and a verdict (fully exercised, partially exercised, or not exercised). The orchestrator uses these verdicts to update the language feature coverage table in `status.md` (+1.0 for fully exercised, +0.5 for partially exercised, +0 for not exercised). Always include this section. If the orchestrator provided commissioned mechanical targets, note which feature areas were commissioned vs. organically exercised.

---

## Modality Segmentation

The core mechanical task. Walk through the log and break it into segments tagged with the appropriate modality. This segmentation enables loss masking during training — the training pipeline uses modality tags to decide which tokens to mask (e.g., masking loss on broken Viv code tokens).

### Modality Mapping

| Log Element | Fence Marker | Modality |
|-------------|-------------|----------|
| Prose (unfenced) | None | `prose` |
| Viv code | `~~~viv` | `viv_code` |
| Compiler error | `~~~compiler-error` | `compiler_error_message` |
| Compiler success | `~~~compiler-success` | `compiler_success_message` |

When constructing segments, **strip fence markers** (`~~~viv`, `~~~compiler-error`, `~~~compiler-success`). The segment `text` contains the raw content inside the fences. File context lines preceding `~~~viv` blocks belong in `prose` segments (see below). The `$ vivc <filename>` invocation line inside compiler fences is kept — it is content, not a fence marker.

### File Context Lines

The file context line that precedes a `~~~viv` block (e.g. `` `social.viv`: ``) is part of the prose leading into the code, not part of the Viv code itself. Include it as a separate `prose` segment or as part of the preceding prose segment, not in the `viv_code` segment.

### Adjacent Segments

When two adjacent stretches of text have the same modality (e.g., two prose paragraphs separated by a blank line), merge them into a single segment. Each segment boundary should represent an actual modality transition.

---

## Competency Token Estimation

After segmenting, estimate the token volume for each competency. Each competency has a **signature** — a contiguous modality pattern, sometimes with content criteria. For each competency, scan the segment list for all contiguous subsequences matching the signature, estimate the token count of each match (~4 characters per token), and sum across all matches.

**Double counting is expected.** Each competency scans independently. A segment may contribute tokens to multiple competencies. For example, the `[prose, viv_code]` pair at the end of a `[viv_code, compiler_error_message, prose, viv_code]` sequence contributes to both `ideation_to_code` and `broken_code_to_repaired_code`. This is correct — both conditional distributions receive training signal from those tokens.

### Competency Signatures

| # | Competency | Signature |
|---|------------|-----------|
| 1 | `ideation_to_code` | `prose` → `viv_code` |
| 2 | `code_to_compiler_output` | `viv_code` → `prose?` → `compiler_*` |
| 3 | `broken_code_to_repaired_code` | `viv_code` → `prose?` → `compiler_error_message` → `prose` → `viv_code` |
| 4 | `error_message_to_diagnosis` | `viv_code` → `prose?` → `compiler_error_message` → `prose` |
| 5 | `working_code_to_ideation` | `compiler_success_message` → `prose` |
| 6 | `code_to_explanation` | `viv_code` → `prose` (prose explains the code) |
| 7 | `code_to_revised_code` | `viv_code` → `prose` → `viv_code` |
| 8 | `code_to_critique` | `viv_code` → `prose` (prose evaluates or critiques) |
| 9 | `partial_code_to_completed_code` | `prose` → `viv_code` (prose describes completing a stub) |
| 10 | `ideation_to_ideation` | `prose` (ideation continues without adjacent code) |
| 11 | `schema_to_construct_ideation` | preamble `prose` segment |
| 12 | `schema_and_code_to_runtime_prediction` | `viv_code` → `prose` (prose predicts runtime behavior) |

`compiler_*` matches either `compiler_error_message` or `compiler_success_message`. `prose?` means zero or one `prose` segments in that position.

### Shared Patterns and Content Criteria

Signatures 6, 8, and 12 share the `viv_code` → `prose` modality pattern. The reviewer classifies based on prose content. A single `viv_code` → `prose` pair may match multiple competencies if the prose serves multiple purposes (e.g., explanation that includes critique).

- **6 `code_to_explanation`**: The prose describes what the code does or how it works — paraphrasing structure, naming roles, walking through control flow, clarifying how effects or conditions interact.
- **8 `code_to_critique`**: The prose evaluates a design decision — questioning whether roles are too broad, effects too aggressive, casting pools redundant, embargoes too long, or suggesting alternatives.
- **12 `schema_and_code_to_runtime_prediction`**: The prose predicts what would happen at runtime — describing how characters would behave, what actions would fire, what narrative arcs would emerge from the constructs.

Signatures 1 and 9 share the `prose` → `viv_code` pattern. Most matches are `ideation_to_code`.

- **9 `partial_code_to_completed_code`**: Count only when the prose explicitly frames the next code block as completing, filling in, or extending a previously written stub or scaffold.

Signature 10 is a standalone prose segment:

- **10 `ideation_to_ideation`**: A prose segment that develops narrative or mechanical ideas without adjacent code. Transitional filler ("Now let's move on") does not qualify.

Signature 11 is positional:

- **11 `schema_to_construct_ideation`**: The first prose segment(s) in the log, before any code appears, where the author reads the schema and brainstorms construct ideas.

### Algorithm

For each of the 12 competencies:

1. Scan the segment list for contiguous subsequences matching the signature. For signatures with optional elements (`prose?`), check both the shorter and longer variants at each position.
2. For content-dependent signatures (6, 8, 9, 10, 11, 12), also check the content criteria.
3. For each match, estimate tokens: `sum(len(segment.text) for segment in match) / 4`.
4. Sum across all matches. Record the total as the competency's value.

Omit competencies with zero matches.

### Concrete Example

```json
{
  "id": "asmt-0003",
  "competencies": {
    "schema_to_construct_ideation": 820,
    "ideation_to_code": 3200,
    "code_to_compiler_output": 1800,
    "broken_code_to_repaired_code": 2400,
    "working_code_to_ideation": 1100,
    "code_to_explanation": 1600,
    "code_to_critique": 950,
    "code_to_revised_code": 1400,
    "error_message_to_diagnosis": 380
  },
  "segments": [
    {
      "modality": "prose",
      "text": "Looking at the schema, I see characters have `grudges` (UID[]) and `patron` (UID)..."
    },
    {
      "modality": "viv_code",
      "text": "trope my-grudge:\n    roles:\n        @holder:\n            as: character\n    ..."
    },
    {
      "modality": "compiler_success_message",
      "text": "* Compilation succeeded\n\n* Tropes (1):\n\n  - my-grudge"
    },
    ...
  ]
}
```

---

## Language Feature Coverage

After segmentation and competency estimation, the reviewer evaluates the session's coverage of all 21 Viv language feature areas. This is not limited to commissioned mechanical targets — every session is assessed against every feature area.

1. **Read the feature area definitions** in `{MONOREPO}/wizard/dapt/synthesis/docs/feature-areas.md`. This file lists all 21 feature areas with their sub-features.
2. **For each feature area**, check the log's `viv_code` segments for evidence that the author used the sub-features. Assess breadth (how many distinct sub-features within the area were used) and depth (how substantively they were used — shallow one-off usage vs. integrated into the design).
3. **Assign a verdict:** fully exercised (most sub-features in the area used with depth), partially exercised (some sub-features used or used shallowly), or not exercised.

Report the results in the "Language feature coverage" section of the assignment summary. List all feature areas with non-zero verdicts (omit "not exercised" areas to keep the report concise).

---

## Procedure

1. **Read the log.** Read `log.md` from the assignment directory.

2. **Segment by modality.** Walk through the log, identify fenced blocks, and construct the segments list. Strip fence markers. Merge adjacent same-modality segments.

3. **Estimate competency tokens.** For each competency, scan the segment list for matching signatures and sum the estimated token counts. Record as a dict.

4. **Assess language feature coverage.** Evaluate all 21 feature areas against the log's `viv_code` segments. See "Language Feature Coverage" above.

5. **Write the example.** Write the JSON object to `{MONOREPO}/wizard/dapt/data/examples/synthesized-examples.jsonl` — one line, no wrapping array.

6. **Return the summary.** Report competency token estimates, total token count, narrative summary, and language feature coverage verdicts to the orchestrator.

---

## Quality Checks

Before finalizing:

- Segments are in correct chronological order.
- Modalities are correct — especially that file context lines are in PROSE segments, not VIV_CODE.
- All fence markers are stripped from segment text.
- The competencies dict maps lowercase underscore keys to estimated token counts. Only non-zero competencies are included.
- Token estimates are consistent (~4 characters per token).

---

## What You Don't Do

**Don't modify the log.** You read and extract. Never edit `log.md`.

**Don't evaluate code quality.** Whether the code is good or bad is irrelevant — both produce valid training signal.

**Don't skip partial logs.** If an assignment was interrupted, process whatever is present.

**Don't split the log into multiple examples.** One assignment = one example.
