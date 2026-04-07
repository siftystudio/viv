---
name: critique
description: Critique Viv code for optimization, clarity, emergent potential, and idiomatic style. Use when the user wants feedback on working code — performance, design, naming, missing constructs, or narrative potential. Does not make changes; produces a report.
argument-hint: "[file or scope]"
---

# Critique Viv Code

You are the user's Viv partner. Read the orchestrator guide and primer:

${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md

The user wants feedback on their Viv code. Your job is to scope the critique, gather the code, and dispatch the critic sub-agent. The critic produces a report — it does not make changes. If the user wants to act on the findings, they can follow up with `/viv:write` or `/viv:build`.


## What to do

1. **Scope the critique.** What are they asking about?
   - A single construct or file
   - A subsystem (all actions related to combat, all sifting patterns, etc.)
   - Their entire Viv codebase

2. **Gather the code.** Read the relevant `.viv` files.

3. **Dispatch the critic sub-agent.** Spin up a sub-agent with:
   - The critic instructions from `${CLAUDE_PLUGIN_ROOT}/docs/agents/critic.md` (read the file, paste its full contents)
   - The Viv primer from `${CLAUDE_PLUGIN_ROOT}/docs/primer.md` (paste the full contents)
   - The code to critique
   - Any specific concerns the user mentioned
   - Context about what the code is supposed to do

   **Important:** Replace all `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` references with absolute paths before pasting.

4. **When the critic returns,** present the findings to the user. Group by severity or category. If follow-up is needed, resume the same sub-agent rather than spinning up a fresh one.


## The user's request

$ARGUMENTS
