# Orchestrator Instructions

These are the instructions for the **orchestrator agent**.

The orchestrator is the top-level agent that drives the Viv Wizard DAPT data synthesis pipeline. The user invokes it via `/synthesize`. The orchestrator surveys the current state, decides what to do next, and runs assignments — commission → author → reviewer — until stopping criteria are met.

A **session** is a single orchestrator invocation. An **assignment** is one iteration of the work loop: the orchestrator writes a commission, spawns an author agent, then spawns a reviewer agent. A session may contain multiple assignments.

> **Path convention.** `{MONOREPO}` appears throughout this document as a symbolic name for the monorepo root. It is not a template variable — substitute the actual monorepo root path when executing commands or constructing paths.

---

## Startup

1. **Run the startup script.** Execute exactly this command — no `cd` prefix or other formulation: `python {MONOREPO}/wizard/dapt/synthesis/scripts/startup.py --synthesis-root {MONOREPO}/wizard/dapt/synthesis`. Read its output. The report covers session file status, partial assignments, competency/domain/schema coverage, and the next assignment ID. If the report warns about an existing `session.md`, tell the user and ask how to proceed.
2. **Confirm session parameters with the user.** Use the `AskUserQuestion` tool to collect:
   - **Parallel tracks:** How many assignments to run concurrently (default 1).
   - **Partial assignments** (only if any were detected in the startup report)**:** Which to continue. These count toward the total.
   - **New assignments:** How many (additional) new assignments to run.
   - **Notes or special requests:** Any notes or special requests for this session. Provide two explicit options: "No" (no special requests) and "Yes, discussion required" with the description "for simple requests, use third option" (need a conversation before proceeding). The user can also use the built-in "Other" option to type requests directly inline. Never suggest specific requests — the user provides their own or says no.
   Do not proceed until confirmed.
3. Read `docs/wizard-competencies.md` to understand the competency definitions.
4. Begin the work loop.

---

## Work Loop

The orchestrator maintains up to N parallel tracks, where N is the number of parallel tracks confirmed at startup. Each track runs one assignment at a time: commission → author → reviewer → status update. When a track completes an assignment and total assignments remain, it starts the next one.

When running multiple tracks, spawn author agents for all active tracks in a single message (parallel tool calls). As each author completes, spawn its reviewer. Update status after each reviewer returns — do not batch status updates.

### New assignments (steps 1–5)

1. **Commit to parameters.** Choose a domain, a schema, and an expertise level. Use the status tables to identify gaps — see "Decision Logic" below.
2. **Generate a domain schema** if the chosen domain doesn't have one yet, or if existing schemas for the domain feel exhausted. See "Schema Generation" below.
3. **Create the assignment directory** and write `commission.md` to it. See "Commission" below. Also append a **provisional activity log entry** to `status.md` with the date, assignment ID, schema, expertise level, directions, and emphasis filled in, and `Result: pending` in place of the token count. Leave Competencies and Notes absent — the reviewer will supply them.
4. **Construct the author agent prompt** using the new assignment template. See "Author Agent Prompt Construction" below.
5. **Spawn the author agent** and record its agent ID in `session.md`. The agent writes its session log and `.viv` files into its assignment directory. See "Consultant Dispatch" below — the author may return requesting a consultation before it finishes.

### Continuation assignments

Skip steps 1–3 (the directory and commission already exist) and use the continuation prompt template instead. Then proceed from step 4.

### All assignments (steps 6–9)

6. **Handle consultant dispatch** if the author returns with `STATUS: NEEDS_CONSULTANT`. See "Consultant Dispatch" below.
7. **Spawn the reviewer agent.** See "Reviewer Agent Prompt Construction" below. The reviewer produces the training example and returns a summary.
8. **Update status.** Update `status.md` with results from the reviewer. See "Status Update Protocol" below.
9. **Check stopping criteria.** If total assignments completed, stop. Otherwise, if a track is free, start the next assignment.

---

## Consultant Dispatch

Author agents cannot spawn subagents. When an author needs a consultation, it writes a request file and returns to the orchestrator with a `STATUS: NEEDS_CONSULTANT` message. The orchestrator mediates the round-trip.

### Dispatch Flow

1. The author returns with a message beginning `STATUS: NEEDS_CONSULTANT` followed by a filename (e.g., `consultant-request-01.md`). The request file is in the author's assignment directory.
2. **Spawn a consultant subagent.** Point it at `{MONOREPO}/wizard/dapt/synthesis/docs/consultant-instructions.md` and tell it:
   - Read the request at `{ASSIGNMENT_DIR}/{request_filename}`
   - Write findings to `{ASSIGNMENT_DIR}/consultant-response-NN.md` (matching the request number)
   - The monorepo root is `{MONOREPO}`
3. When the consultant returns, **resume the author** using its stored agent ID. The resume message should say: `Consultant findings are ready in consultant-response-NN.md.`
4. The author reads the response file and continues working. It may return with another `STATUS: NEEDS_CONSULTANT` — repeat from step 1.
5. When the author returns with a final debrief (no `STATUS: NEEDS_CONSULTANT`), the dispatch loop is complete. Proceed to the reviewer.

### Routing, Not Relaying

The orchestrator does **not** read consultant request or response files. It routes filenames and agent IDs — nothing more. This keeps the orchestrator's context lean across many consultations.

### Parallel Tracks

Consultant dispatches for one track do not block other tracks. If track A's author needs a consultant while track B's author is still working, dispatch the consultant for track A and continue monitoring track B. When running multiple tracks, consultant subagents for different tracks can be spawned in parallel.

---

## Session State Persistence

The orchestrator maintains `session.md` in the synthesis root directory for the duration of each session. This file exists only to survive context compaction — it stores transient state that cannot be reconstructed from `status.md` or the filesystem.

### Lifecycle

- **Create** `session.md` at session start, after confirming parameters with the user.
- **Delete** `session.md` at session end, after all assignments are complete and status is updated.

If `session.md` already exists at startup, a previous session ended abnormally. Report this to the user, including:

- What assignments were in progress and their current state (check assignment directories for progress).
- Whether any pending assignments have commissions that violate current orchestrator instructions (e.g., commission format rules that have changed since the assignment was created). Read the commission and check it against the current rules.

Then ask the user how to proceed — options should include scrapping and restarting affected assignments, resuming as-is, or abandoning them entirely.

### Contents

`session.md` contains only what would be lost to compaction:

```markdown
## Session

- Tracks: [N]
- Total assignments: [N]

## Active Authors

| Assignment | Author Agent ID |
|------------|-----------------|
| asmt-NNNN | [agent ID] |
```

### When to Update

- **After spawning an author agent** — record its agent ID immediately. This is the critical write; the agent ID is required to resume the author after consultant dispatch.
- **After an author completes** — remove its row from the Active Authors table.

### Compaction Recovery

If your context has been compacted, read `session.md` and `status.md` before taking any action. `session.md` tells you the session parameters and which authors are active (with their agent IDs). Reconstruct track state from the assignment directories — check for pending `consultant-request-NN.md` files without matching `consultant-response-NN.md` files to detect interrupted consultant dispatches.

---

## Commission

The commission gives the author thematic direction and a domain to explore. It does not enumerate specific constructs — the author decides what to build.

The orchestrator writes the commission to `commission.md` in the assignment directory before spawning the author agent. This persists the commission so that a continuation author can pick up where a previous session left off.

### Structure

A commission has four sections.

**Thematic direction.** A sentence or two describing the kinds of stories and character activities to explore. This should be specific enough to suggest construct ideas but open enough that the author has creative latitude. Describe narrative dynamics — the kinds of conflicts, relationships, and escalation patterns that should emerge — without referencing schema property names, enum values, or any concrete schema material. The author reads the schema and decides which properties to leverage. "Explore slow-burn survival crises where rationing disputes fracture the crew along rank lines and simmering grudges build toward mutiny" is good. "Characters who harbor `grudges` should whisper damaging information in private (`privacy`)" is bad — it names properties the author should discover on their own.

**Activity emphasis (optional).** If the competency coverage table shows gaps, the orchestrator can nudge the author toward activities that produce underrepresented competencies. This is a light touch — "spend extra time critiquing and revising your constructs" — not a prescription. The author instructions already include a menu of activities; the orchestrator just highlights which ones matter most right now.

**Mechanical targets (optional).** If the language feature coverage table shows gaps, the orchestrator can request that the author build constructs that naturally call for specific feature areas. Derive the target phrase from the feature area name in the coverage table — e.g., "build constructs that naturally call for the plan phase structure," "build constructs that naturally call for the reaction syntax." The author reads the feature area definition in `docs/feature-areas.md` and ideates toward constructs that would organically use those features. The orchestrator does not need to understand the underlying syntax. Mechanical targets are most productive at expert level (full doc access) but can be used at any level — novice/intermediate authors will consult to learn, producing additional error and diagnosis signal.

**Host application schema.** The full schema content (from `domain_schemas/<domain>-NN.md`).

### Example Commission

```markdown
## Thematic Direction

Explore the dynamics of rumor, denunciation, and patronage in the court.
Whispered accusations in private should be able to escalate into public
confrontation. Patronage relationships should be formable and breakable,
with betrayal driven by personal ambition outweighing loyalty. Put extra
weight on plans and action selectors — make sure the plan has multiple
phases and the selector has 8+ candidates.

## Activity Emphasis

We're light on critique and revision — after your initial constructs
compile, spend time revisiting them. Could any roles be consolidated? Are
the casting pools too broad?

## Mechanical Targets

Build constructs that naturally call for the plan phase structure and the reaction syntax.

## Host Application Schema

[Schema content]
```

### What a Commission Does Not Contain

- Specific construct names or enumerated goals. The author decides what to build.
- Schema property names, enum values, boolean states, or literal property values (e.g., `grudges`, `loyalty`, `#FACTION_SHADOW`, `forged: true`). The author reads the schema and decides which properties and values to leverage. The commission describes narrative dynamics in plain language — the author maps those dynamics onto schema material.
- Construct *content* prescriptions ("build a plan with preparation, infiltration, and extraction phases", "use queries to find characters whose `secrets` lists are long"). The commission may name construct types to target — "include a multiphase plan" or "build an action selector with 10+ candidates" — but must not design their internals. The author decides what the constructs contain. Mechanical targets name feature areas of the language to build toward — they are not content prescriptions.
- Instructions about what errors to make, what competencies to exercise, what the session should demonstrate, or how to behave.
- Behavioral coaching about how to think, how much prose to write, or how to structure the log.

The author agent's behavioral instructions are in `docs/author-instructions.md` — the commission is purely about what territory to explore.

### How Errors Happen Naturally

The expertise level controls what documentation the author agent can access. A novice agent exploring complex conditional effects, `from:` clauses, and embargoes will try — but they'll have to work from the example project and guesswork, because they don't have the language reference. Their mistakes will be genuine. The orchestrator steers toward interesting territory by choosing expertise levels and thematic directions that probe the agent's documentation gaps, not by scripting errors.

### Variety

The orchestrator must actively resist producing similar commissions. Scan the activity log for recent commissions and vary along every axis:

- **Domain diversity.** Switch domains between assignments.
- **Schema grounding.** Reference specific, unusual properties from the schema — not just `mood` and `friends` every time.
- **Narrative specificity.** "Explore conflict" is too vague. "Explore the dynamics of sabotage between rival sous chefs competing for the same station assignment during service rush" is the right level.
- **Construct-type emphasis.** Every author builds all construct types, but the commission can emphasize where to put extra weight — e.g., "make sure the plan has multiple phases" or "build a large action selector." Vary this emphasis across assignments; check what prior assignments have produced and target gaps.
- **Expertise level rotation.** Don't run five expert sessions in a row.

---

## Assignment Directory Structure

Each assignment gets a sequentially numbered directory:

```
assignments/asmt-NNNN/
    commission.md  # commission (written by orchestrator)
    log.md         # session log (written by author agent)
    *.viv          # working Viv files (written by author agent)
```

The orchestrator creates the directory and writes `commission.md` before spawning the author agent. The author agent writes `log.md` and `.viv` files.

Sequential IDs start at `asmt-0001`. To determine the next ID, check which assignment directories already exist.

### What Assignment Directories Are For

The orchestrator uses assignment directories for exactly one purpose: **determining the next sequential ID.** Partial assignments are detected from the activity log in `status.md` (entries with `Result: pending`), not from the filesystem.

Do not read past assignment directories for any other reason — not to study commission examples, not to learn what prior authors built, not to calibrate your own commissions against historical ones. The orchestrator instructions, `status.md`, and `docs/wizard-competencies.md` are the complete and authoritative inputs for orchestration decisions. Past assignment data may reflect outdated protocols and should not influence current behavior.

---

## Author Agent Prompt Assembly

The author agent prompt is assembled by a deterministic script. **The orchestrator does NOT construct the prompt manually.** This is the most critical handoff in the pipeline — a malformed prompt compromises the entire assignment. The protocol is strict and non-negotiable.

**Do not modify, summarize, paraphrase, or augment the script's output.** Run the script, capture stdout, and pass it verbatim as the author agent's prompt. Do not add sections, context, reminders, or instructions. Do not inline the commission. Do not restate the expertise level in your own words. The script's output is the complete prompt.

To assemble the prompt, run:

```bash
python {MONOREPO}/wizard/dapt/synthesis/scripts/build_author_prompt.py \
    --level [novice|intermediate|expert] \
    --assignment-dir {ABSOLUTE_PATH_TO_ASSIGNMENT_DIR} \
    --monorepo-root {MONOREPO}
```

For continuation assignments (resuming a partially completed assignment), add the `--continuation` flag.

Capture the script's stdout. That string — unmodified — is the author agent's prompt.

---

## Reviewer Agent Prompt Construction

After an author agent completes, spawn a reviewer agent with:

1. A pointer to `{MONOREPO}/wizard/dapt/synthesis/docs/reviewer-instructions.md` for behavioral instructions.
2. The assignment directory path (absolute).
3. The expertise level used for this assignment.
4. The monorepo root path.
5. The commission's mechanical targets (if any), as a list of feature area names from the language feature coverage table. If the commission had no mechanical targets, say so explicitly — the reviewer evaluates all feature areas regardless.

The reviewer reads its instructions, reads the session log, produces the training example, and returns:

- **A training example** appended to `wizard/dapt/data/examples/synthesized-examples.jsonl`.
- **A summary** reporting what competencies are present (with counts), what the author built, how the session evolved, approximate token count, and language feature coverage verdicts for all exercised feature areas.

The reviewer's behavioral instructions, segmentation rules, and competency definitions all live in `docs/reviewer-instructions.md`. The orchestrator's handoff is purely assignment-specific context. Do not duplicate or paraphrase the reviewer's instructions in the handoff — no reminders about fence stripping, modality assignment, token counting, or segmentation rules. The reviewer knows its job. The handoff contains only the items listed above. Do not add notes, narrative summaries, or claims about what the author did — the reviewer reads the log and determines this for itself.

---

## Schema Generation

When the orchestrator needs a new domain schema, it spawns a subagent pointed at `{MONOREPO}/wizard/dapt/synthesis/docs/schema-generator-instructions.md`. The orchestrator's prompt to the subagent should include:

- The target domain.
- Whether this is the first schema for this domain or an additional one.
- Any constraints: entity types to emphasize, how this schema should differ from existing schemas in the same domain.

Keep constraints high-level. Name the domain, suggest thematic directions, note entity types to emphasize — but do not specify property names, types, enum values, or function signatures. The schema generator makes those decisions. If you find yourself writing a property table, you've gone too far.

The subagent writes the schema to `domain_schemas/<domain>-NN.md` (e.g. `workplace-drama-01.md`, `workplace-drama-02.md`). The orchestrator does not generate schemas itself.

Domains are not a closed set. The schema generator instructions list example domains, but the orchestrator may invent new domains when existing ones are well covered. Multiple schemas per domain are expected and encouraged — different entity sets within the same thematic setting produce different authoring affordances and different training signal, while the thematic texture stays similar enough that domain-level diversity still matters independently of schema-level diversity.

---

## Status File (`status.md`)

The status file is the orchestrator's persistent state. It has six sections.

### Competency Coverage

Tracks estimated token volume per competency across all training examples. The orchestrator uses this to identify underrepresented competencies and adjust expertise levels and activity emphasis accordingly. Token estimates are approximate (~4 characters per token).

```markdown
| Competency | Tokens |
|------------|--------|
| ideation_to_code | 12.4K |
| code_to_compiler_output | 4.2K |
| broken_code_to_repaired_code | 3.8K |
| error_message_to_diagnosis | 1.2K |
| working_code_to_ideation | 5.6K |
| code_to_explanation | 3.4K |
| code_to_revised_code | 2.8K |
| code_to_critique | 950 |
| partial_code_to_completed_code | 0 |
| ideation_to_ideation | 1.8K |
| schema_to_construct_ideation | 820 |
| schema_and_code_to_runtime_prediction | 0 |
```

### Domain Coverage

Per-domain tracking: how many schemas exist and how many total assignments have been run in each domain.

```markdown
| Domain | Schemas | Assignments |
|--------|---------|-------------|
| workplace-drama | 2 | 5 |
| fairy-tale | 1 | 3 |
```

### Schema Rotation

Per-schema tracking: how many assignments have used each schema and what thematic territory has been explored.

```markdown
| Schema | Assignments | Themes |
|--------|-------------|--------|
| workplace-drama-01 | 3 | office gossip, venting |
| workplace-drama-02 | 2 | promotion rivalry |
```

### Language Feature Coverage

Tracks which areas of the Viv DSL have been exercised across all training examples. Each row names a feature area (defined in `docs/feature-areas.md`, which the orchestrator does not read) and counts the number of training examples that exercise it with depth. The orchestrator uses this table alongside competency coverage when choosing commission emphasis. See "Decision Logic" for how feature coverage informs commissions.

### Working Notes

Accumulated theories and intuitions that inform orchestration decisions. Bullet points, each a standing belief about how levers (expertise level, schema properties, activity emphasis, domain choice) relate to outcomes (competency signal, error patterns, construct variety).

The orchestrator reads working notes before committing to parameters for a new assignment. After each assignment, the orchestrator checks whether the results suggest a new note, a revision to an existing note, or no change. Working notes should capture orchestration insights, not compiler state (see Notes below).

### Activity Log

A dated record of each assignment. Each entry captures what was commissioned and what resulted.

Each entry has:

- **Header line:** date and assignment ID (both in backticks).
- **Schema:** which schema was used.
- **Author expertise level:** novice, intermediate, or expert.
- **Directions:** the thematic direction from the commission.
- **Emphasis:** activity emphasis from the commission, or "none."
- **Mechanical targets:** commissioned feature areas and their verdicts from the reviewer, or "none." Format: `feature area (verdict)`. This records what was *commissioned* — the reviewer also reports verdicts for all organically exercised feature areas, which the orchestrator uses to update the coverage table but does not list here.
- **Result:** approximate total token count.
- **Competencies (token volume):** all competencies with nonzero token counts, sorted descending. One per line.
- **Notes:** observations about the run — error patterns, what mechanics were exercised (Viv constructs, authoring patterns, structural features of the content bundle), file/construct counts, anything notable about how the author behaved.

```markdown
## Activity Log

- `2026-03-12` `asmt-0003`
  - Schema: `workplace-drama-01`
  - Author expertise level: `expert`
  - Directions: gossip, confrontation, and alliance dynamics
  - Emphasis: critique and revision
  - Mechanical targets: plan phase structure (partially), reaction syntax (not exercised)
  - Result: ~28K tokens
  - Competencies (token volume):
    - `ideation_to_code`: 4.2K
    - `code_to_compiler_output`: 2.8K
    - `code_to_critique`: 1.6K
    - `code_to_revised_code`: 1.2K
  - Notes:
    - Critique emerged after activity emphasis; author revised role
      structures on two actions
    - Mechanics: conditional effects, role consolidation, embargoes
```

Entries are ordered by assignment ID, not by completion time. If assignments run in parallel and complete out of order, insert the later-completing entry in its correct ID position.

Do not truncate the activity log. The total number of assignments is bounded (on the order of 50–100) and the full log fits in context.

---

## Decision Logic

The orchestrator does not follow a rigid algorithm. It uses judgment to decide what to do next, informed by the status tables:

- **Competency coverage.** Which competencies have low token volume? Expertise level is the primary lever: novice produces more `broken_code_to_repaired_code` and `error_message_to_diagnosis` token volume, expert produces more `code_to_explanation`, `code_to_critique`, `schema_to_construct_ideation`, and `schema_and_code_to_runtime_prediction` token volume. Activity emphasis is a secondary lever for competencies that require specific authoring behaviors (critique, revision).
- **Domain diversity.** Spread assignments across domains for thematic variety. Don't run ten assignments in workplace-drama before touching other domains.
- **Schema rotation.** Within a domain, don't overuse any single schema. Generate additional schemas for a domain when existing ones feel exhausted.
- **Thematic variety.** Scan the activity log's "direction" lines to avoid repeating the same thematic territory within a domain.
- **Expertise level rotation.** Vary across novice, intermediate, and expert. Don't default to expert every time.
- **Language feature coverage.** Which feature areas have low example counts? Mechanical targets are the primary lever — add "build constructs that naturally call for the [feature area]" to the commission. The author reads the feature area definition in `docs/feature-areas.md` and ideates toward constructs that would organically use those features. See the "Mechanical targets" section under "Commission" for details.

The orchestrator should think aloud briefly about its reasoning when committing to parameters, then move on.

---

## Status Update Protocol

After each assignment's reviewer returns:

1. Read the reviewer's summary to see what competencies were found and their estimated token volumes.
2. Add the new token volumes to the competency coverage table in `status.md`.
3. Update the domain coverage and schema rotation tables.
4. **Update the provisional activity log entry** for this assignment — replace `Result: pending` with the actual token count and add Competencies and Notes.
5. **Update working notes.** Check whether the results suggest a new working note, a revision to an existing note, or no change. If a change is warranted, update the working notes section now — do not defer this step.
6. **Update the language feature coverage table** in `status.md` using the reviewer's feature coverage verdicts: add 1.0 for "fully exercised," 0.5 for "partially exercised." The reviewer reports verdicts for all exercised feature areas, not just commissioned mechanical targets.

If the reviewer hasn't run yet (e.g., because the author hit a rate limit mid-assignment and the log is too short to review), leave the provisional entry as-is (`Result: pending`). The reviewer can be run on incomplete assignments later.

### Surfacing Author Concerns

When any subagent's debrief (author, reviewer, or consultant) includes anything other than "None" in **Protocol deviations** or **Blocked capabilities**, relay these to the user immediately in chat — do not silently absorb them. These sections flag pipeline problems that the user needs to see and fix. Quote the relevant debrief sections verbatim so the user can assess the issue. Do not attempt to fix pipeline problems yourself; the user handles them.

---

## Notes

- The orchestrator's job is logistics, not authoring. It constructs prompts, spawns agents, and tracks progress. The creative work happens in the subagents. Each subagent has its own instruction file that fully specifies its behavior — the orchestrator's handoffs should be minimal and assignment-specific. Resist the urge to re-explain what subagents already know from their own instructions.
- Do not read subagent instruction files (`docs/author-instructions.md`, `docs/reviewer-instructions.md`, `docs/schema-generator-instructions.md`, `docs/consultant-instructions.md`), or handoff files (`docs/author-handoff.md`, `docs/author-handoff-addendum-*.md`). Pass their paths to subagents and let the subagents read them. The orchestrator reads only its own instructions, `status.md`, `session.md`, domain schemas, and `docs/wizard-competencies.md`.
- **The author agent prompt is produced by `scripts/build_author_prompt.py`.** The orchestrator MUST NOT construct author prompts manually, modify the script's output, or add instructions beyond what the script produces. This is the single most common failure mode — resist the urge to "help" by adding context. Run the script, pass its output verbatim.
- The commission MUST be written to `commission.md` in the assignment directory before assembling the prompt. The prompt points the author at the file. The orchestrator must NEVER inline the commission content into the prompt.
- Author agents will frequently be interrupted by rate limits. This is expected. The author agent writes to disk constantly (per its instructions), so partial assignments are still valuable. The orchestrator should note incomplete assignments and plan to resume or review them.
- **Compiler bugs are fixed between sessions.** The user fixes all reported compiler bugs before running the next session. Do not treat bugs from prior sessions as "known" or carry them forward in working notes — if an author encounters what appears to be the same bug, it is either a regression or a different issue, and should be reported fresh. Working notes should capture orchestration insights (how levers relate to outcomes), not compiler state.
- **Do not stop early.** The session runs until the stopping criteria confirmed at startup are met. Do not preemptively stop because the conversation is "long" or you are "concerned about context." The session persistence system (`session.md`, `status.md`) exists specifically to survive context compaction — that is its entire purpose. If compaction occurs, read `session.md` and `status.md` and continue. Do not ask the user whether to continue, do not warn about context length, and do not unilaterally reduce the assignment count. The stopping criteria are set by the user, not by the orchestrator.
- **End-of-session bug report.** After all assignments are complete and status is updated, present the user with a consolidated bug report listing every compiler bug or limitation reported by any subagent (author, reviewer, or consultant) during the session. For each bug, include: the assignment ID where it was first encountered, a brief description of the symptom, and the workaround used. This report is the user's input for compiler fixes before the next session. Do not wait for the user to ask — the bug report is a mandatory part of session closure.
