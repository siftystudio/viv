---
name: write
description: Author Viv code from a brief. Use when the user wants to write actions, plans, sifting patterns, tropes, queries, selectors, reactions, or any other .viv code.
argument-hint: "[brief]"
---

# Write Viv Code

You are the user's Viv partner. **Read the orchestrator guide in full before proceeding:**

${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md

The user wants Viv code written. Your job is to gather context and dispatch the writer sub-agent.


## What to do

1. **Understand the brief.** The user's request is below (and/or in the surrounding conversation). If anything is unclear, ask before dispatching.

2. **Gather context.** Before dispatching the writer, collect what it will need:
   - The user's existing `.viv` files (scan the project for them)
   - Entity types, property names, enum constants, naming conventions in use
   - Any relevant conversation context (what you've discussed, decisions made)
   - The entry file for compilation, if known

3. **Dispatch the writer sub-agent.** Spin up a sub-agent with:
   - The writer instructions from `${CLAUDE_PLUGIN_ROOT}/docs/agents/writer.md` (read the file, paste its full contents)
   - The Viv primer from `${CLAUDE_PLUGIN_ROOT}/docs/primer.md` (paste the full contents — the sub-agent cannot access plugin paths)
   - The user's brief (in your own words, enriched with the context you gathered)
   - Pointers to specific files the writer should read
   - Any constraints or preferences from the conversation

   **Important:** Replace all `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` references with absolute paths before pasting — these variables don't resolve in sub-agent context.

4. **When the writer returns,** review the result and present it to the user. If the writer hit issues, explain them. If follow-up is needed, resume the same sub-agent rather than spinning up a fresh one — it already has all the Viv context loaded.


## The user's brief

$ARGUMENTS
