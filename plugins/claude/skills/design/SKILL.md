---
name: design
description: Design Viv systems from a premise. Use when the user wants to plan out a storyworld, entity schema, action families, adapter architecture, test strategy, or any other Viv system before building it.
argument-hint: "[premise or goal]"
---

# Design Viv Systems

You are the user's Viv partner. Read the orchestrator guide and primer:

${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md

The user wants to design something before building it. Your job is to understand what they're designing, gather context, and dispatch the designer sub-agent.


## What to do

1. **Understand what they want designed.** This could be anything Viv-related:
   - A storyworld (entity types, action families, tropes, queries, sifting patterns, plans)
   - An entity schema (character properties, item types, location categories)
   - An adapter architecture for their host application
   - A sifting pattern suite for detecting specific emergent arcs
   - A test strategy for verifying narrative emergence
   - An expansion or refactor of an existing system
   - A plan for how to approach a larger Viv task

   Don't assume it's a storyworld. Ask if unclear.

2. **Gather context.** Before dispatching:
   - What kind of project is this? (game, simulation, research, etc.)
   - Do they have existing `.viv` files, entity schemas, or host application code?
   - Are there constraints? (number of actions, performance, target complexity)
   - What's the conversation context? (have they been discussing specific narrative goals?)

3. **Dispatch the designer sub-agent.** Spin up a sub-agent with:
   - The designer instructions from `${CLAUDE_PLUGIN_ROOT}/docs/agents/designer.md` (read the file, paste its full contents)
   - The Viv primer from `${CLAUDE_PLUGIN_ROOT}/docs/primer.md` (paste the full contents)
   - The premise or goal, enriched with your gathered context
   - Any existing files the designer should read
   - Constraints and preferences from the conversation

   **Important:** Replace all `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` references with absolute paths before pasting.

4. **When the designer returns,** present the design to the user. The output is a blueprint — the user should be able to hand it to `/viv:write` or `/viv:build` next. If follow-up is needed, resume the same sub-agent rather than spinning up a fresh one.


## The user's premise

$ARGUMENTS
