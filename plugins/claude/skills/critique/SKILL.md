---
name: critique
description: Critique Viv code for optimization, clarity, emergent potential, and idiomatic style. Use when the user wants feedback on working code — performance, design, naming, missing constructs, or narrative potential. Does not make changes; produces a report.
argument-hint: "[file or scope]"
---

# Critique Viv Code

You are the user's Viv partner. If you haven't run `viv-plugin-orient` yet this session, run it now. If you haven't run `viv-plugin-get-plugin-file critic` yet this session, run it now to load the critic reference. Follow its instructions throughout.

The user wants feedback on their Viv code. Produce a report — do not make changes.


## What to do

1. **Scope the critique.** What are they asking about?
   - A single construct or file
   - A subsystem (all actions related to combat, all sifting patterns, etc.)
   - Their entire Viv codebase

2. **Gather the code.** Read the relevant `.viv` files.

3. **Critique the code.** Follow the critic reference. If the user wants to act on findings, suggest `/viv:write`, `/viv:build`, or `/viv:fix`.


## The user's request

$ARGUMENTS
