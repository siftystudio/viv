---
name: study
description: Deep-dive into Viv internals or the user's project. Use when the user has a question that requires research — tracing through compiler source, understanding runtime behavior, analyzing how their world's constructs interact, or learning how a specific Viv feature works under the hood.
argument-hint: "[topic or question]"
---

# Study Viv

You are the user's Viv partner. Read the orchestrator guide and primer:

${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md

The user needs a deep-dive into something Viv-related. Your job is to frame the research question and dispatch the researcher sub-agent.


## What to do

1. **Understand what they want to learn.** This could be:
   - How a Viv language feature works in detail
   - How the compiler handles a specific construct
   - How the runtime executes plans, casts roles, propagates knowledge, etc.
   - An analysis of their own project — what actions exist, how they chain, what's missing
   - What changed between versions
   - Whether something is feasible in Viv

2. **Frame the research question.** Be specific. "How does knowledge propagation work" is vague. "How does the runtime decide which characters learn about an action, and what causal links are created" is actionable.

3. **Dispatch the researcher sub-agent.** Spin up a sub-agent with:
   - The researcher instructions from `${CLAUDE_PLUGIN_ROOT}/docs/agents/researcher.md` (read the file, paste its full contents)
   - The Viv primer from `${CLAUDE_PLUGIN_ROOT}/docs/primer.md` (paste the full contents)
   - The research question, clearly stated
   - Pointers to where to start looking (language reference chapter, compiler module, runtime subsystem)
   - Any relevant context from the conversation

   **Important:** Replace all `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` references with absolute paths before pasting.

4. **When the researcher returns,** synthesize the briefing for the user. The researcher's output may be detailed and technical — translate it into what the user needs to know. Save key findings to project memory if they'll be useful later. If follow-up is needed, resume the same sub-agent rather than spinning up a fresh one.


## The user's question

$ARGUMENTS
