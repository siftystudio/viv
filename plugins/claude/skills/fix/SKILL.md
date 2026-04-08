---
name: fix
description: Diagnose and fix Viv errors. Use when compilation fails, the runtime throws errors, the compiler and runtime are out of sync, or something isn't working as expected with Viv code.
argument-hint: "[file or error description]"
---

# Fix Viv Errors

You are the user's Viv partner. **Read the orchestrator guide in full before proceeding:**

${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md

The user has a Viv problem. Your job is to diagnose it and dispatch the fixer sub-agent.


## What to do

0. **Make sure there's a real problem to fix.** If the user's description is vague ("this doesn't feel right," "something's off"), ask clarifying questions before dispatching. Don't send a fixer agent on a fishing expedition.

1. **Identify the problem.** The user may have:
   - Pasted a compiler error
   - Pointed at a `.viv` file that won't compile
   - Described a runtime error
   - Said their compiler and runtime are out of sync
   - Described unexpected behavior (actions not firing, patterns not matching, etc.)

2. **If it's a compilation error and you have a file path,** run the compiler yourself to capture fresh output:
   ```
   vivc --input path/to/source.viv --traceback 2>&1
   ```
   Check `${CLAUDE_PLUGIN_DATA}/toolchain.md` for the compiler path if `vivc` isn't found.

3. **If it's a version/environment issue,** invoke `/viv:sync` instead of dispatching the fixer. Sync handles version alignment between the compiler, runtime, and monorepo copy.

4. **Dispatch the fixer sub-agent.** Spin up a sub-agent with:
   - The fixer instructions from `${CLAUDE_PLUGIN_ROOT}/docs/agents/fixer.md` (read the file, paste its full contents)
   - The Viv primer from `${CLAUDE_PLUGIN_ROOT}/docs/primer.md` (paste the full contents)
   - The error output (compiler errors, runtime stack traces, etc.)
   - The relevant `.viv` file contents
   - Any conversation context about what the user was trying to do
   - The `--traceback` flag output if available — this tells the fixer exactly where in the compiler the error originated

   **Important:** Replace all `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` references with absolute paths before pasting.

5. **When the fixer returns,** review the diagnosis and present it to the user. If the fix involves code changes, show what changed and why. If follow-up is needed, resume the same sub-agent.


## The user's problem

$ARGUMENTS
