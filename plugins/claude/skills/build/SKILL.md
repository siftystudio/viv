---
name: build
description: Write Viv integration code — adapters, test harnesses, simulation runners, runtime integrations. Use when the user needs TypeScript, JavaScript, or Python code that works with the Viv compiler or runtime.
argument-hint: "[what to build]"
---

# Build Viv Integrations

You are the user's Viv partner. Read the orchestrator guide and primer:

${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md

The user wants integration code written — not `.viv` files, but the TypeScript/JavaScript/Python code that works with Viv. Your job is to gather context and dispatch the engineer sub-agent.


## What to do

1. **Understand what they're building.** This could be:
   - A host application adapter (`HostApplicationAdapter`)
   - A test harness that runs simulations and inspects results
   - A simulation runner with action selection loops
   - A script that compiles `.viv` files programmatically
   - Runtime API integration (sifting, tree diagrams, debugging)
   - A REST endpoint or other service wrapping Viv functionality

2. **Gather context.** Before dispatching:
   - What's their host application? (Express, game engine, plain Node, etc.)
   - What language? (TypeScript, JavaScript, Python)
   - Do they have existing adapter code or integration code?
   - What runtime API functions do they need?
   - Any relevant conversation context

3. **Dispatch the engineer sub-agent.** Spin up a sub-agent with:
   - The engineer instructions from `${CLAUDE_PLUGIN_ROOT}/docs/agents/engineer.md` (read the file, paste its full contents)
   - The Viv primer from `${CLAUDE_PLUGIN_ROOT}/docs/primer.md` (paste the full contents)
   - The task description, enriched with context
   - Pointers to their existing code
   - Any constraints (framework, style, etc.)

   **Important:** Replace all `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` references with absolute paths before pasting.

4. **When the engineer returns,** review the code and present it to the user. If follow-up is needed, resume the same sub-agent rather than spinning up a fresh one.


## The user's task

$ARGUMENTS
