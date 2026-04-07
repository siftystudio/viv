# Author Instructions

These are the instructions for Viv **authoring agents**.

Your job is to pursue genuine authoring goals — designing narrative constructs, writing Viv code, compiling, debugging, and iterating — while producing a session log that will be segmented into training examples.

Your documentation access is limited by your expertise level. The Viv documentation listed in your prompt is everything you have — if a document isn't listed, you don't have access to it at your level. When you need documentation beyond what your expertise level provides — typically when diagnosing a compiler error or trying to understand a language feature — you spawn a **consultant agent** with full access to all Viv documentation. The consultant looks things up and reports back. You incorporate its findings into the session log as unattributed prose, as if you were thinking aloud about what you found in the docs.

> **Path convention.** `{MONOREPO}` appears in this document as a symbolic name for the monorepo root. It is not a template variable — substitute the actual monorepo root path (provided in your handoff) when constructing paths.

---

## CRITICAL: Write to Disk Constantly

**Your session will be interrupted by a rate limit.** This is not an edge case — it will happen every single session. Anything in your context that hasn't been written to disk will be lost.

**After every meaningful unit of work, write it to disk before moving on.** This means:

- After writing prose (ideation, reasoning, design decisions) → append it to `log.md` immediately.
- After writing or revising a Viv construct → write the `.viv` file AND append the construct snapshot to `log.md` immediately.
- After invoking the compiler → append the compiler output to `log.md` immediately.

**Do not batch up work in your context.** Do not ideate for three paragraphs and then write them all to the log. Write each paragraph as you produce it. Do not write a construct and keep iterating on it mentally before saving. Save it, compile it, then revise from what's on disk.

**The log on disk is the product, not your context.** If your session dies right now, whatever is in `log.md` is what we have. Make sure it's always current.

---

## Protocol Compliance

Your session is subject to automated protocol compliance checks. The following violations will cause your session to be **DISCARDED** without review — no partial credit, no recovery:

- **Accessing documentation files not listed in your handoff addendum.** Your handoff specifies exactly which documentation paths you may access. Every file-system read is logged. Accessing a forbidden path — even once, even to "glance" at a file — is a terminal violation.
- **Failing to use the consultant when your handoff addendum requires it.** Your addendum specifies when consultant usage is mandatory. Skipping a mandatory consultation is a terminal violation.
- **Modifying files outside your assignment directory.** You may only create or edit files within your assignment directory.

These rules are enforced automatically. Do not test them.

---

## Your Inputs

When you start, you have:

1. **A commission** (`commission.md` in your assignment directory) describing the thematic direction to explore, and optionally an activity emphasis. The commission also contains the host application schema.

2. **Viv documentation** available at your expertise level. See "Viv Documentation Access" below.

3. **A session log** (`log.md`) which may be empty (new assignment) or partially written (resumed assignment). You append to this file.

4. **Working `.viv` files** in your assignment directory. You create and edit these as you work.

---

## Viv Documentation Access

All expertise levels have the following documentation directly in these instructions (see the appendices at the end of this document):

- **Viv overview** — what Viv is, the seven construct types, basic syntax
- **Example project** — a complete working Viv project with entity types, enums, custom functions, and source code
- **Compiler reference** — how to invoke `vivc`, flags, output format

Depending on your expertise level, you may also have access to additional documentation at paths listed in your prompt:

- **Language reference** — the full Viv language reference, split across several chapter files in a directory. Each chapter has a descriptive filename. Read individual chapters as needed — do not read the entire directory at once.
- **PEG grammar** — the formal grammar definition for Viv syntax.
- **Adapter types** — TypeScript type definitions for the runtime adapter.

If your prompt doesn't list a path, you don't have access. Use the consultant for documentation beyond your level.

---

## What You Produce

A session log file (`log.md`). The log format is specified in detail in "Log Format" below, but the key rules are:

**Prose** is unmarked running text. Think aloud. Narrate your design decisions, your reasoning, your false starts. When you consult documentation, trace your reasoning explicitly — "Let me check the grammar for role sources... the `from:` clause takes any expression, but it must evaluate to an iterable." This is not polished writing — it's a working log of someone authoring Viv code.

**Construct snapshots** are fenced with `~~~viv` and preceded by a file context line. When you write or revise a construct, paste its full current definition into the log. Only the construct you touched — not the whole file.

**Compiler output** is fenced with `~~~compiler-success` or `~~~compiler-error`. When you invoke the compiler, capture the stderr output and append it.

---

## How You Work

**Explore the commissioned territory.** Your commission describes a thematic direction. Decide what constructs to build based on the schema and the direction. Ideate, write code, compile, debug, iterate. Don't try to hit specific competencies — just author. Aim to end up with a rich set of interrelated constructs that provide good coverage of the domain schema.

**Think aloud.** Write prose explaining what you're doing and why. This is the most important part. The training data needs rich reasoning tokens, not just code. Explain your design choices, why you picked one construct type over another, what you expect the compiler to do.

**Trace through documentation you have access to.** When you need to check how something works using docs available at your expertise level, explicitly trace your reasoning. Show your work: "Looking at the example project, I see that `friends` is used in a `from:` clause, so it must be an array property."

**Use the consultant for docs beyond your expertise level.** When you hit a compiler error you can't diagnose, or need to understand a language feature that your available docs don't cover, request a consultation. See "Consultant Mechanism" below.

**Make mistakes when you genuinely don't know.** If you're at an intermediate or novice expertise level, you won't have access to all documentation before your first compile attempt. Work from your best understanding and let the compiler correct you. Don't fake mistakes — but don't look things up you can't access either. After an error, *that's* when you reach for the consultant.

**Use the compiler.** Invoke `vivc` whenever you want to check your work. See the compiler reference appendix. Always set `NO_COLOR=1`.

**Create and manage files.** Organize your constructs into `.viv` files with meaningful names. When you create a new file, mention it in prose. When you move a construct between files, narrate the move.

**Aim for the character threshold.** Your target is at least **128,000 characters** (~32K tokens). Check your log's size periodically. After your initial constructs compile, continue authoring — the activity menu below suggests productive ways to extend your session. Your session will likely be interrupted by a rate limit before you reach this target; that's expected. Get as far as you can.

**Write to disk after every step.** See the critical section at the top of this document. This is not optional.

### Activity Menu

After your initial constructs compile, keep authoring until you hit the character threshold. Here are productive ways to extend your session:

- **Build more constructs.** Add actions, tropes, queries, sifting patterns, or selectors that complement what you've already built. Explore parts of the schema you haven't touched yet.
- **Revise existing constructs.** Restructure roles, tighten conditions, change effect logic. Narrate why the revision improves things.
- **Critique your work.** Step back and evaluate: are casting pools too broad? Could roles be consolidated? Are trope conditions redundant with `from:` clauses? Write the critique into the log.
- **Explain your constructs.** Pick a complex construct and explain how it works — what the runtime does with it, how roles get cast, what the effects accomplish. Write as if explaining to someone unfamiliar with the code.
- **Predict runtime behavior.** Given the schema's entity types and your constructs, reason about what would happen at runtime. Which characters would be cast into which roles? How often would certain actions fire?
- **Build interconnections.** Add reactions between actions, sifting patterns that span multiple actions, selectors that coordinate groups of actions. Make the constructs work as a system.

If your commission includes an **activity emphasis**, prioritize those activities. Otherwise, follow your judgment — variety is good.

If your commission includes **mechanical targets**, read the corresponding feature area definitions in `{MONOREPO}/wizard/dapt/synthesis/docs/feature-areas.md` to understand what sub-features each area encompasses. Then ideate toward constructs that would *naturally* call for those features — don't force syntax into constructs where it doesn't belong. Sometimes exercising a feature area means building new constructs that organically need it, not retrofitting existing ones.

---

## What You Don't Do

**Don't mention the consultant in the log.** The log must never refer to "the consultant," and must never use "consult" or "consulting" without an object. When you incorporate consultant findings, frame the activity as your own documentation lookup: "Let me check the language reference…", "Looking into the grammar…", "Consulting the docs on role types…". No "Author:" or "Consultant:" tags, no speaker attribution. The log is a continuous document written by one person tracing through docs.

**Don't produce structured metadata.** No JSON, no YAML frontmatter, no timestamps. Just prose, code, and compiler output.

**Don't try to cover specific competencies.** Just author naturally. Explore the commissioned thematic direction.

**Don't generate code you know is wrong on purpose.** If you genuinely don't know the syntax (because you lack grammar access), your mistakes will be authentic. Don't manufacture errors.

---

## Resuming an Assignment

If you're starting from a partially-written log, read the existing content to understand where the previous run left off. Check the `.viv` files on disk for the current state of the code. Continue from where things stand — the commission still describes the overall goals, and you can pick up wherever the previous run stopped.

---

## Session Debrief

When your session ends — whether because you hit the character threshold, a rate limit interrupts you, or you run out of productive work — your final message back to the orchestrator must include a structured debrief. This is not part of the session log; it is your return message.

The debrief has four sections:

1. **Summary.** What you built (construct count by type, file list), approximate log size, whether all files compile.
2. **Protocol deviations.** Anything your instructions required that you could not do or chose not to do, and why. If you were told to use a tool or capability that was unavailable, say so explicitly. If you skipped a mandatory step, explain the reason. If there are no deviations, write "None."
3. **Blocked capabilities.** Tools or actions that were unavailable, failed unexpectedly, or behaved differently than your instructions described. If everything worked as expected, write "None."
4. **Concerns.** Anything you think the orchestrator should know about the quality, completeness, or structural integrity of your work. Design decisions you're uncertain about, constructs that compile but feel wrong, coverage gaps you noticed. If there are no concerns, write "None."

Do not omit sections or fold them into the summary. The orchestrator relays protocol deviations and blocked capabilities directly to the user — these sections are how pipeline problems get detected and fixed.

---

## Consultant Mechanism

You have access to a **consultant** — a separate agent with full documentation access. The consultant traces through the language reference, PEG grammar, and adapter types to answer your questions, returning structured findings with verbatim citations from the source material.

Your handoff addendum specifies when you must use the consultant and how to invoke it. The core principle across all expertise levels: when you encounter a compiler error you haven't seen before in the session, your job is to **understand the underlying rule**, not just make the error disappear. The consultant provides grounded, cited explanations from the actual documentation. The reasoning you write after consulting — with quoted passages and grammar productions woven into your prose — is the most valuable output of your session.

Do not treat the consultant as a last resort. Treat it as the natural first step when you hit something new. Guessing at a fix and getting lucky produces a thin log entry. Consulting, understanding, and then fixing produces a rich one.

### How to Request a Consultation

1. **Write your request to a file.** Create `consultant-request-NN.md` in your assignment directory, where NN is a two-digit sequential number starting at 01. The file should contain:
   - Your question — what you need to understand
   - The relevant code (the construct or snippet that's causing the issue)
   - The compiler error, if applicable (full error message)
   - What you've already tried or checked
2. **Return to the orchestrator.** Your return message must begin with `STATUS: NEEDS_CONSULTANT` followed by the request filename. Example: `STATUS: NEEDS_CONSULTANT consultant-request-01.md`
3. **Wait for the response.** The next message you receive will tell you that the consultant's findings are ready in `consultant-response-NN.md` (matching your request number). Read that file and continue working.

Previous consultant responses remain on disk in your assignment directory. You can read earlier responses (e.g., `consultant-response-01.md`) at any time if a previous finding becomes relevant again.

**Do not use the Agent tool.** It is not available in your context. The file-based protocol above is the only way to reach the consultant.

### What the Consultant Returns

The consultant writes structured findings to the response file. Each finding has a labeled source, a verbatim quote from the documentation, and an explanation of the implication. This is raw material for you to render as prose.

---

## Rendering Consultant Findings

After reading a consultant response file, you render each finding as prose in the session log. The goal is to weave the documentation into your reasoning naturally, as if you traced through the docs yourself. Each finding becomes a paragraph or two in the log.

For each finding:

1. **Explain the takeaway** in your own words. What did you learn?
2. **Quote the source material.** Include the grammar production, language reference passage, or type definition — but embed it in your prose naturally. Use inline code formatting for short productions (e.g., `` `role_type = 'character' / 'item' / ...` ``) and block quotes for longer passages.
3. **Show how it applies.** Connect the finding to your current problem — what needs to change in your code and why.
4. **Attribute the source conversationally.** Write as if you are tracing through the docs yourself: "Looking at chapter 7 of the language reference..." or "The grammar production for `role_type` is..." or "Checking the adapter types, `RoleConfig` has..."

### Example

If the consultant response file contains a finding about `as:` only accepting specific role types, you might write in the log:

> The compiler is complaining that `object` isn't a valid role type. Let me look into what the `as:` clause actually accepts. Looking at chapter 7 of the language reference, it says: "The `as:` clause declares what kind of entity fills the role. It accepts either an entity type — `character`, `item`, `location`, `action`, `symbol` — or a casting keyword that controls how the role is filled during action selection: `initiator`, `partner`, `recipient`, `bystander`, `anywhere`, `precast`, `spawn`." So `object` simply isn't in either list — it's not a recognized keyword. The grammar production `role_type` confirms this is a closed set of literals. Since `@intel` is an item, I need `as: item`. And `@suspect` is a character, so that should be `as: character`.

Notice: the prose quotes directly from the language reference, names the chapter, cites the grammar production by name, and explains the fix — all as continuous thinking-aloud prose. No "Finding:" labels, no "Source:" labels, no mention of the consultant. The documentation tokens are present in the log but embedded in natural reasoning, as if you looked things up yourself.

**Do not paste the consultant's structured response verbatim.** Rewrite it. The log must read as a continuous stream of thought.

---

## Log Format

The session log is a flat token stream. Authoring activity — prose, code, compiler output — is interleaved in chronological order.

### Design Principles

**Flat token stream.** The log is a single sequential document. No structured metadata, no timestamps, no JSON wrappers.

**No attribution.** No speaker tags, role labels, or agent identifiers. No mention of "the consultant" — frame all documentation lookups as your own activity ("checking the docs," "looking into the grammar"). The log reads as one person's continuous work.

**Construct as atomic unit.** The unit of code in the log is the construct definition, not the file and not the line. When you write or revise a construct, its full current definition appears in the log.

**File provenance.** The log always makes clear which file a construct resides in.

### Context Preamble

The log begins with a context preamble that establishes the working environment. The preamble is set once at assignment start and not repeated.

The preamble contains:

1. **Schema.** The host application schema for the assignment, pasted verbatim. This establishes what entity types, properties, enums, and custom functions are available.

2. **Pre-existing .viv files** (if any). When an assignment starts with existing code to extend, the full contents of each relevant .viv file are included.

If the assignment starts from a clean slate, only the schema appears in the preamble.

#### Preamble Formatting

The schema is included as-is (it is already a markdown document). Pre-existing files are included as fenced Viv blocks with a file path header:

```
`relationships.viv`:

~~~viv
trope my-friend:
    roles:
        @person:
            as: subject
        @other:
            as: object
    conditions:
        @other in @person.friends
~~~
```

### Session Body

The session body follows the preamble and contains the interleaved stream of authoring activity.

#### Prose

Unmarked running text. Ideation, reasoning, design decisions, reference tracing, critique.

```
I want characters to be able to gossip about their boss when the boss
isn't around. The schema has `boss` and `affinity` on Character, so I
can check whether the boss is present via location.
```

#### Construct Snapshots

A fenced Viv block containing one complete construct definition, preceded by a file context line indicating which file the construct belongs to.

```
`social.viv`:

~~~viv
action gossip-about-boss:
    gloss: "@gossiper complains about @boss to @listener"
    roles:
        @gossiper:
            as: initiator
        @boss:
            as: subject
            from: @gossiper.boss
        @listener:
            as: recipient
    conditions:
        @boss.location != @gossiper.location
~~~
```

When a construct is revised, the full revised definition appears — not a diff. Only the edited construct is re-pasted; other constructs in the same file that were not touched do not reappear.

#### Compiler Output

A fenced block containing the verbatim output of a `vivc` invocation:

```
~~~compiler-error
$ vivc social.viv
Error (line 6): 'boss' is not a valid source expression. Role sources
must reference a property that yields a collection of entities.
~~~
```

```
~~~compiler-success
$ vivc social.viv
Compiled successfully. 1 action definition.
~~~
```

### File Provenance Rules

**Pre-existing files** appear as full file dumps in the context preamble.

**New files** are introduced in session body prose. Write something like "I'll create `social.viv` for the social interaction constructs." Subsequent construct snapshots reference this file in their file context line.

**Edits to existing constructs** carry their file context line.

**Moves** are narrated in prose: "Moving `confide-in-friend` from `misc.viv` to `relationships.viv`." The next snapshot shows the new file context.

**Multiple files** may be active in a single session. Each construct snapshot independently identifies its file.

### Fencing Conventions

Viv code uses `~~~viv` fences. Compiler errors use `~~~compiler-error` fences. Compiler successes use `~~~compiler-success` fences. Prose is unfenced. No other fence types are used.

Triple-tilde (`~~~`) is used rather than triple-backtick to avoid conflicts with backtick-fenced code in prose (e.g. property names like `mood`).

---

## Appendix A: What is Viv?

Viv is a domain-specific language for authoring emergent narrative simulations. You write Viv source files (`.viv`) that define how characters, items, and locations behave in a simulated storyworld. The Viv compiler (`vivc`) compiles your source into a JSON content bundle that a game or simulation engine consumes at runtime.

Viv has seven construct types: **actions** (things characters do), **action selectors** (rules for choosing which action to perform), **plans** (multi-step sequences of actions), **plan selectors** (rules for choosing plans), **queries** (searches over entity data), **sifting patterns** (searches over past events), and **tropes** (reusable relationship patterns). Each construct defines **roles** that get filled by entities (characters, items, locations) at runtime.

The syntax is indentation-based and resembles YAML. Roles are prefixed with `@`, enums with `#`, custom functions with `~`. Conditions and effects use operators like `==`, `!=`, `in`, `+=`, `-=`, `append`, `remove`. You can reference entity properties via dot notation (e.g. `@character.mood`).

---

## Appendix B: Example Project

This is a self-contained excerpt from a working Viv project. It demonstrates actions, tropes, sifting patterns, queries, roles, conditions, effects, reactions, saliences, embargoes, and associations.

### Entity Types

**Character** properties: `name` (string), `friends` (UID[]), `enemies` (UID[]), `mood` (number), `awake` (boolean).

**Location** properties: `name` (string), `characters` (UID[]), `items` (UID[]).

### Enum Values

```
BORING: 1
INTERESTING: 5
NUDGE: 1
CHANGE_SMALL: 3
CHANGE_MEDIUM: 6
CHANGE_BIG: 9
```

Enums are referenced in Viv code with `#` (e.g. `#BORING`, `#CHANGE_SMALL`).

### Custom Functions

`moveToNewLocation(characterID)` — moves a character to a new location.

Custom functions are referenced in Viv code with `~` (e.g. `~moveToNewLocation(@runner)`).

### Viv Source

```viv
// Hello, friend!
action hello:
    gloss: "@greeter greets their friend @friend"
    roles:
        @greeter:
            as: initiator
        @friend:
            as: recipient
            from: @greeter.friends
    reactions:
        if <@friend, @greeter> fits trope my-friend:
            queue action hug:
                urgent: true
                with:
                    @hugger: @friend
                    @friend: @greeter
        elif <@friend, @greeter> fits trope my-enemy:
            queue action flee:
                urgent: true
                with:
                    @runner: @friend
                    @threat: @greeter
        end
    saliences:
        default: #BORING
    embargoes:
        embargo:
            location: here
            time: forever


// Bring it in!
reserved action hug:
    gloss: "@hugger hugs @friend"
    roles:
        @hugger:
            as: initiator
        @friend:
            as: recipient
    effects:
        if <@friend, @hugger> fits trope my-friend:
            @hugger.mood += #CHANGE_SMALL
            @friend.mood += #CHANGE_SMALL
        elif <@friend, @hugger> fits trope my-enemy:
            @hugger.mood += #NUDGE
            @friend.mood -= #CHANGE_MEDIUM
        else:
            @hugger.mood += #NUDGE
            @friend.mood += #NUDGE
        end
    associations:
        default: happy
    saliences:
        default: #BORING
        roles:
            @hugger: #INTERESTING
            @friend: #INTERESTING


// Run away!
reserved action flee:
    gloss: "@runner runs away from @threat"
    roles:
        @runner:
            as: initiator
        @threat:
            as: recipient
    effects:
        ~moveToNewLocation(@runner)
        if <@threat, @runner> fits trope my-friend:
            @threat.mood -= #CHANGE_BIG
        end
    associations:
        default: notable
        for _@c:
            if _@c == @threat:
                if <@threat, @runner> fits trope my-friend:
                    sad
                end
            end
        end
    saliences:
        default: #INTERESTING


// Unidirectional friendship (may not be mutual)
trope my-friend:
    roles:
        @person:
            as: character
        @other:
            as: character
    conditions:
        @other in @person.friends


// Unidirectional enmity (may not be mutual)
trope my-enemy:
    roles:
        @person:
            as: character
        @other:
            as: character
    conditions:
        @other in @person.enemies


// Matches micro-stories where something good happens to the protagonist
pattern good-day:
    roles:
        @protagonist:
            as: character
    actions:
        @setup:
            from: @protagonist.memories
        @payoff:
            from:
                search query good-memory:
                    over: @protagonist
        conditions:
            @setup caused @payoff


// Matches micro-stories where something bad happens to the protagonist
pattern bad-day:
    roles:
        @protagonist:
            as: character
    actions:
        @setup:
            from: @protagonist.memories
        @payoff:
            from:
                search query bad-memory:
                    over: @protagonist
    conditions:
        @setup caused @payoff


// Matches memories tagged 'happy' for a given character
query good-memory:
    associations:
        all: happy


// Matches memories tagged 'sad' for a given character
query bad-memory:
    associations:
        all: sad
```

---

## Appendix C: Compiler Reference

Key points:

- Invoke with `NO_COLOR=1 vivc -i <file.viv> -l` to compile a single file and list compiled constructs.
- Compiler output goes to stderr. Capture it for the log.
- On success: prints a summary of compiled constructs and exits 0.
- On error: prints the error message with line numbers and exits 1.
- The `-l` flag lists compiled construct names — always include it.
- Use `vivc --help` for all flags.
