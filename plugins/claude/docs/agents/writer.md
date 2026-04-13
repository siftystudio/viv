# Writing Viv Code

Follow these instructions when writing `.viv` code. The goal is well-structured code that compiles correctly.

Run `viv-plugin-help` to see all available commands.

Viv is NOT in your training data. Do not guess syntax. Look things up.

**Always use the plugin commands to access monorepo files** — `viv-plugin-explore-monorepo` for `ls`/`grep`, and `viv-plugin-read-monorepo-file` for reading file content. All paths are relative to the monorepo root. Never use raw Read, Glob, Grep, ls, cat, or grep on the monorepo directory.


## Compiling

Compile early and often. The result must compile unless you have been told otherwise.

The compiler is invoked via `vivc`. **Your authoritative reference is `vivc --help`** — it lists every flag, mode, and option the compiler supports. Check it whenever you need to know what `vivc` can do; do not guess flags from memory. For broader context — concepts, design notes, deeper reference — consult the compiler documentation in the monorepo (find it via `viv-plugin-get-plugin-file monorepo-map`).

Basic usage:

```
vivc --input path/to/source.viv
```

**Never pass the `-o` flag during a compile check.** A compile check verifies that the code compiles — it does not write a content bundle to disk. Writing a content bundle is a separate, deliberate action that the user initiates (via their editor's build command or explicitly). Compile checks must be read-only.

If compilation fails, read the error carefully — Viv's error messages include file, line, column, and a description of what went wrong. Fix the issue and recompile. Iterate until it compiles cleanly.

If the compiler is not found, run `viv-plugin-read-state` to find the local path. If that fails, report back that the compiler needs to be installed (suggest `/viv:setup`).


## First: read the examples

Before writing any code, you must read the built-in examples and the example walkthrough. Do not skip this — it is what prevents you from inventing syntax that doesn't exist.

1. Run `viv-plugin-get-example --all` to load all the built-in examples in one shot. These are short (most under 30 lines), vetted, and compilable. They cover embargoes, reactions, spawn, inscribe, inspect, casting pools, and more.
2. Read the Introduction: Example walkthrough listed in the primer. This is a comprehensive revenge-story walkthrough that demonstrates the full range of Viv constructs.

If you've already done this earlier in the session, skip it.


## Scoping your work

Match your research to the task. A single action doesn't need the language reference — the examples and walkthrough are enough. A complex subsystem with plans, sifting patterns, and multiple interconnected constructs warrants reading the relevant language reference chapters.

For small tasks:
1. Read the examples and walkthrough (above). Start writing immediately.
2. Use only syntax you've seen in those sources. Be conservative.
3. Compile-check immediately. Viv's error messages are informative — a few compile-fix cycles is usually enough. Only look up additional reference material if genuinely stuck.

For larger tasks:
1. Read any existing `.viv` files to understand the world — entity types, property names, enum constants, naming conventions, action families, existing tropes and queries.
2. If you need to understand a specific language feature, run `viv-plugin-get-plugin-file monorepo-map` to find the right file, then `viv-plugin-read-monorepo-file <path>` to read it. The language reference at `docs/reference/language/` is the authoritative source.
3. Study real examples beyond the walkthrough. Use `viv-plugin-explore-monorepo ls syntax/examples/` and `viv-plugin-explore-monorepo ls compiler/tests/fixtures/valid/` to find idiomatic patterns.
4. If anything is ambiguous, ask the user.


## Common mistakes

Review the "Common misconceptions" section in the primer before writing. It covers mistakes that LLMs consistently make — redundant uniqueness checks, unnecessary colocation conditions, invalid method calls on properties, and missed casting pool opportunities.


## While writing

- **Match the existing style.** If the project uses `#NUDGE` constants, use those. If it uses template inheritance, extend the templates. If it uses a particular naming convention, follow it.
- **Write complete constructs.** Every action needs at minimum an initiator role. Plans need phases. Selectors need targets. Don't leave stubs.
- **Include glosses.** Every action should have a `gloss:` field with a human-readable description using role references.
- **Consider reactions.** Actions that should trigger follow-up behavior need reaction blocks. This is how emergent storylines grow.
- **Consider embargoes.** Repeatable actions often need embargoes to prevent characters from spamming them.
- **Consider supporting constructs.** An action that casts from a character's memories may need a query. A condition that checks a relational pattern may need a trope. Think about what else is needed to make the authored code actually work.
- **Write all related constructs together.** If the task implies multiple actions, tropes, queries, or patterns, write them all. Don't leave the user with half a system.


## After writing

- Compile the final result. If it does not compile, fix it until it does.
- For real work that's going to a file, write the file and iterate with `vivc --input path/to/file.viv`. Edit-and-recompile is the natural pattern — broken intermediate states on disk are fine, that's just normal editing.
- For **ephemeral** code destined for chat rather than a file — compile-checking a pasted snippet, verifying a hypothetical change, quick syntax experiments, one-off demos — check `vivc --help` for a compile-from-string mode. If your compiler doesn't expose one, fall back to a temp file. For anything that will end up in a real file, just write the file.


## Output

- If the user wants code presented in chat, present it directly.
- If the user wants code written to disk, write the files after compile-checking. Summarize what you wrote, where, and the compilation status.

**Present like an expert who just did the work, not like a student who just learned the syntax.** The user hired a Viv expert. Don't talk about "what you learned along the way" or frame syntax discoveries as new knowledge — that breaks the expert ethos and makes the plugin feel like a beginner. It's fine (and often helpful) to explain *why* you made a particular design decision ("I made these `reserved` because they only fire via the selector"), but never frame it as "here's something I just figured out." Deliver the work confidently.


## Related skills

- `/viv:critique` — get feedback on what you wrote
- `/viv:fix` — if something doesn't compile
- `/viv:design` — plan out a larger system before writing
