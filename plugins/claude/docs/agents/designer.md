# Designing Viv Systems

Follow these instructions when designing Viv systems. The goal is a design document — a blueprint that can be handed to `/viv:write` or `/viv:build` to implement.

Run `viv-plugin-help` to see all available commands.

Viv is NOT in your training data. Do not guess what's possible. Look things up.

**Always use `viv-plugin-explore-monorepo` to access monorepo files** (`ls`, `read`, `grep` — all paths relative to root). Never use raw Read, Glob, Grep, ls, cat, or grep on the monorepo directory.


## Understanding Viv's capabilities

Before designing, make sure you understand what Viv can and cannot do. Run `viv-plugin-get-doc monorepo-map` to find the right reference files.

Key references for design work:
- Language reference at `docs/reference/language/` — what constructs exist and how they work
- Syntax examples at `syntax/examples/` — what real Viv code looks like
- Valid test fixtures at `compiler/tests/fixtures/valid/` — idiomatic patterns
- The introduction example at `docs/introduction/example.md` — the revenge story walkthrough shows how constructs compose
- Runtime API at `runtimes/js/src/api/` — what the runtime can do
- Example projects at `examples/` — how integration works end to end


## Design principles

- **Design for emergence.** Viv's power is that storylines emerge from the interaction of simple constructs. Don't try to script specific stories — design the conditions from which stories arise.
- **Think in causal chains.** Actions trigger reactions, which trigger more actions. Design with these chains in mind — where does a storyline start, what propels it forward, what makes it branch?
- **Design the sifting patterns alongside the actions.** If you want to detect revenge arcs, the actions that compose revenge arcs need to produce the causal links and tags that sifting patterns can match.
- **Keep entity schemas minimal.** Only define properties that Viv conditions and effects actually reference. Don't model things that no action will ever check or modify.
- **Consider scale.** How many characters, locations, actions per timestep, total story years? This affects design choices around group roles, query constraints, and sifting pattern complexity.


## Output format

Adapt the output to what's being designed. A storyworld design is different from an adapter architecture. But in general, the design should include:

- **What it is and what it's for** — one paragraph
- **The components** — what constructs, entity types, modules, or files are needed
- **How they connect** — the causal chains, data flow, or dependency relationships
- **What emerges** — what storylines, behaviors, or capabilities this design enables
- **Open questions** — anything you couldn't resolve without the user's input

If the design implies specific Viv constructs, sketch them in enough detail that they could be implemented via `/viv:write` — names, roles, key conditions, key effects, reaction targets. Not full code, but enough to build from.


## Existing systems

If the user has existing `.viv` files or application code, read them before designing. The design must be compatible with what's already built. Note any conflicts or refactoring that the new design would require.


## Related skills

- `/viv:write` — implement the design as Viv code
- `/viv:build` — implement the adapter or integration code
- `/viv:critique` — review the implementation against the design
