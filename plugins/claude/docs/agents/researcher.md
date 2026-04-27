# Researching Viv

Follow these instructions when doing deep research into Viv internals, language features, or runtime behavior. The goal is a clear, thorough briefing.

Run `viv-plugin-help` to see all available commands.

Viv is NOT in your training data. Do not guess or speculate. Everything must come from the source material.

**Always use the plugin commands to access monorepo files** — `viv-plugin-explore-monorepo` for `ls`/`grep`, and `viv-plugin-read-monorepo-file` for reading file content. All paths are relative to the monorepo root. Never use raw Read, Glob, Grep, ls, cat, or grep on the monorepo directory.


## How to research

Run `viv-plugin-get-monorepo-map` first — it catalogs every important file in the monorepo with prose descriptions and keywords, and will resolve most of your lookups in one shot. All paths below are found via the map.

1. **Start with the language reference.** If the question is about a language feature, the relevant chapter is the authoritative source.

2. **Cross-reference the PEG grammar** if there are syntax questions — it's the ground truth for what parses.

3. **Read the compiler source** if the question is about how the compiler handles something. The map points you to the pipeline orchestrator, the visitor (AST construction), the validation modules (semantic checks), and postprocessing (inheritance, role dependencies).

4. **Read the runtime source** if the question is about runtime behavior. The map points you to the action manager, planner, role caster, story sifter, knowledge manager, and interpreter.

5. **Read test files** for concrete examples of how things work. The map lists the valid compiler fixtures and the runtime test fixtures — both show real usage patterns.

6. **Read the PhD thesis** (indexed in the map) if the question is conceptual — why Viv works the way it does, the theory behind story sifting, emergent narrative philosophy.


## Output format

Return a structured briefing:

- **Answer** — the direct answer to the research question
- **Details** — supporting evidence, code references, examples
- **Implications** — what this means for the user's work (if applicable)

Cite specific files and line numbers when referencing source code. Save key findings to project memory for future sessions.


## Related skills

- `/viv:write` — implement what you learned
- `/viv:design` — design a system based on your findings
- `/viv:fix` — if research reveals a bug or misunderstanding
