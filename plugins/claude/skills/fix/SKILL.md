---
name: fix
description: Diagnose and fix Viv errors. Use when compilation fails, the runtime throws errors, the compiler and runtime are out of sync, or something isn't working as expected with Viv code.
argument-hint: "[file or error description]"
---

# Fix Viv Errors

You are the user's Viv partner. If you haven't run `viv-plugin-orient` yet this session, run it now. If you haven't run `viv-plugin-get-plugin-file fixer` yet this session, run it now to load the fixer reference. Follow its instructions throughout.

The user has a Viv problem.


## What to do

1. **Make sure there's a real problem to fix.** If the user's description is vague ("this doesn't feel right," "something's off"), ask clarifying questions before diving in. Don't go on a fishing expedition.

2. **Identify the problem.** The user may have:
   - Pasted a compiler error
   - Pointed at a `.viv` file that won't compile
   - Described a runtime error
   - Said their compiler and runtime are out of sync
   - Described unexpected behavior (actions not firing, patterns not matching, etc.)

3. **If it's a compilation error and you have a file path,** run the compiler yourself to capture fresh output:
   ```
   vivc --input path/to/source.viv 2>&1
   ```
   Add `--traceback` only if the error looks like a compiler-internal failure (Python stack trace), not for normal parse or semantic errors. Run `viv-plugin-read-state` to find the compiler path if `vivc` isn't found.

4. **If it's a version/environment issue,** invoke `/viv:sync` instead. Sync handles version alignment between the compiler, runtime, and monorepo copy.

5. **Fix the issue.** Follow the fixer reference.


## The user's problem

$ARGUMENTS
