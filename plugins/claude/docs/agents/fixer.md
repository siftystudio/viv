# Fixing Viv Errors

Follow these instructions when diagnosing and fixing Viv errors. The code must compile when you're done.

Run `viv-plugin-help` to see all available commands.

Viv is NOT in your training data. Do not guess syntax. Look things up.

**Always use the plugin commands to access monorepo files** — `viv-plugin-explore-monorepo` for `ls`/`grep`, and `viv-plugin-read-monorepo-file` for reading file content. All paths are relative to the monorepo root. Never use raw Read, Glob, Grep, ls, cat, or grep on the monorepo directory.


## Diagnosing compiler errors

Viv's compiler errors include:
- **File, line, and column** of the error
- **A code snippet** showing the problematic source
- **A description** of what went wrong
- **Viable tokens** (for parse errors) showing what the parser expected

If you were given `--traceback` output, it shows exactly where in the compiler the error originated. You can read that compiler source file in the monorepo to understand the validation logic that failed. Run `viv-plugin-get-plugin-file monorepo-map` to find the right file.

Common error categories:
- **Parse errors** — syntax issues. Check the language reference or PEG grammar.
- **Duplicate names** — two constructs of the same type with the same name.
- **Undefined roles** — referencing a role that doesn't exist in the construct.
- **Role label mismatches** — using labels not permitted for the construct type (e.g., `precast` on a non-reserved action).
- **Inheritance cycles** — action A inherits from B which inherits from A.
- **Invalid expressions** — type mismatches, wrong operators, bad references.

The language reference at `docs/reference/language/` in the monorepo is the authoritative source for what's valid.


## Diagnosing runtime errors

If the error is from the JavaScript runtime:
- Check the runtime error classes at `runtimes/js/src/errors/index.ts` in the monorepo
- Check the runtime API types at `runtimes/js/src/api/dto.ts` for correct function signatures
- Check the adapter interface at `runtimes/js/src/adapter/types.ts` for adapter contract requirements


## Scoping your work

Match your research to the problem. A clear compiler error (wrong syntax, missing role, duplicate name) usually tells you everything you need — read the error, read the source file, fix it, compile. Don't read the language reference or monorepo map for straightforward issues. Viv's compiler errors are informative — trust them.

For complex issues — behavioral problems, subtle semantic misunderstandings, errors that don't make sense — do the deeper research. Look up the relevant language feature. Trace through the compiler or runtime source if needed.


## Fixing

1. **Understand the error.** Read it carefully. Look up the relevant language feature if needed.
2. **Read the source file.** Understand the author's intent — what were they trying to do?
3. **Fix the issue.** Make the minimal change that resolves the error while preserving intent.
4. **Compile.** Run `vivc --input path/to/source.viv` to verify the fix. Run `viv-plugin-read-state` for the compiler path if `vivc` isn't found.
5. **If new errors appear,** fix those too. Iterate until it compiles cleanly.
6. **Explain what was wrong and why the fix works.** The user should understand, not just have working code. If anything is ambiguous about the author's intent, ask.


## The compiler

Run `vivc --help` for options. For details, see the compiler README in the monorepo (use `viv-plugin-get-plugin-file monorepo-map` to find it).

Basic usage:

```
vivc --input path/to/source.viv
vivc --input path/to/source.viv --traceback    # includes Python traceback on error
```


## Behavioral issues

Sometimes the code compiles but doesn't behave as expected — actions never fire, patterns match nothing, plans stall. These are harder:

1. **Read the code carefully.** Trace through the conditions, role casting, reactions.
2. **Check common pitfalls:**
   - Conditions too restrictive (action can never target)
   - Missing embargoes (action spams)
   - Reaction chains that loop
   - Group roles with huge slot ranges (combinatorial explosion)
   - Queries over chronicle without enough constraints (too slow)
   - `from hearing` temporal anchors creating unintended time windows
3. **Consult the language reference** for the precise semantics of the construct in question.


## Output

1. **Diagnosis** — what was wrong and why, explained clearly enough for the user to understand.
2. **The fix** — file paths and the specific changes made (or proposed, if you weren't sure).
3. **Compilation status** — confirm the code now compiles, or explain what's still unresolved.
4. **Root cause** — if the error reveals a pattern the user should watch for (e.g., "you're using `precast` roles without marking the action `reserved`"), note it.


## Related skills

- `/viv:write` — rewrite or extend the code after fixing
- `/viv:study` — investigate why something behaves unexpectedly
- `/viv:critique` — review working code for deeper issues
