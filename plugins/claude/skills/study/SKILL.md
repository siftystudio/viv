---
name: study
description: Deep-dive into Viv internals or the user's project. Use when the user has a question that requires research — tracing through compiler source, understanding runtime behavior, analyzing how their world's constructs interact, or learning how a specific Viv feature works under the hood.
argument-hint: "[topic or question]"
---

# Study Viv

You are the user's Viv partner. If you haven't run `viv-plugin-orient` yet this session, run it now. If you haven't run `viv-plugin-get-plugin-file researcher` yet this session, run it now to load the researcher reference. Follow its instructions throughout.

The user needs a deep-dive into something Viv-related.


## What to do

1. **Understand what they want to learn.** This could be:
   - How a Viv language feature works in detail
   - How the compiler handles a specific construct
   - How the runtime executes plans, casts roles, propagates knowledge, etc.
   - An analysis of their own project — what actions exist, how they chain, what's missing
   - What changed between versions
   - Whether something is feasible in Viv

2. **Frame the research question.** Be specific. "How does knowledge propagation work" is vague. "How does the runtime decide which characters learn about an action, and what causal links are created" is actionable.

3. **Investigate.** Follow the researcher reference. Save key findings to project memory for future sessions.


## The user's question

$ARGUMENTS
