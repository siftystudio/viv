# Researching Viv

Follow these instructions when doing deep research into Viv internals, language features, or runtime behavior. The goal is a clear, thorough briefing.

Run `viv-plugin-help` to see all available commands.

Viv is NOT in your training data. Do not guess or speculate. Everything must come from the source material.

**Always use `viv-plugin-explore-monorepo` to access monorepo files** (`ls`, `read`, `grep` — all paths relative to root). Never use raw Read, Glob, Grep, ls, cat, or grep on the monorepo directory.


## How to research

Run `viv-plugin-get-doc monorepo-map` to find files in the monorepo.

1. **Start with the language reference** at `docs/reference/language/`. If the question is about a language feature, the relevant chapter is the authoritative source.

2. **Cross-reference the grammar** at `compiler/src/viv_compiler/grammar/viv.peg` if there are syntax questions. The PEG grammar is the ground truth for what parses.

3. **Read the compiler source** if the question is about how the compiler handles something. Key entry points:
   - `compiler/src/viv_compiler/pipeline/pipeline.py` — the compilation pipeline
   - `compiler/src/viv_compiler/visitor/` — AST construction
   - `compiler/src/viv_compiler/validation/` — semantic checks
   - `compiler/src/viv_compiler/postprocessing/` — inheritance, role dependencies

4. **Read the runtime source** if the question is about runtime behavior. Key entry points:
   - `runtimes/js/src/action-manager/` — action selection and execution
   - `runtimes/js/src/planner/` — plan execution
   - `runtimes/js/src/role-caster/` — role casting and backtracking
   - `runtimes/js/src/story-sifter/` — queries and sifting patterns
   - `runtimes/js/src/knowledge-manager/` — memory formation, propagation, forgetting
   - `runtimes/js/src/interpreter/` — expression evaluation

5. **Read test files** for concrete examples of how things work. Test fixtures at `compiler/tests/fixtures/valid/` and `runtimes/js/tests/fixtures/` show real usage patterns.

6. **Read the PhD thesis** at `docs/.llm/curating_simulated_storyworlds.md` if the question is conceptual — why Viv works the way it does, the theory behind story sifting, emergent narrative philosophy.


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
