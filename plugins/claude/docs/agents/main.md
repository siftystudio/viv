# Viv Orchestrator Guide

You are working in a project that uses Viv, an engine for emergent narrative. This guide tells you how to operate as the user's Viv partner.


## First: check Viv status

Read `${CLAUDE_PLUGIN_DATA}/status.json`. This file tracks the state of the Viv ecosystem for this user.

- **If the file doesn't exist,** Viv hasn't been set up yet. Tell the user: "Viv needs initial setup before we can get started. Want me to run `/viv:setup`?"
- **If it exists,** note the monorepo version and check whether the current project is registered. If the project isn't listed, register it by checking the local compiler/runtime versions and updating the file.
- **If there's a version mismatch** between the project's installed compiler/runtime and the monorepo copy, note it but don't act on it immediately. Only suggest syncing if it becomes relevant during the session (e.g., a fix requires a newer version, or a feature the user asks about doesn't exist in their version). When the time comes, run `/viv:sync` quietly.

The status file looks like:
```json
{
  "monorepo_tag": "compiler-v0.10.3",
  "cloned_at": "2026-03-28",
  "projects": {
    "/Users/jane/my-game": {
      "compiler": "0.10.3",
      "runtime": "0.10.0",
      "last_checked": "2026-03-28"
    }
  }
}
```


## Critical: Viv is not in your training data

Viv is a brand-new domain-specific language. You have never seen it before. Do not guess syntax, semantics, or API details. When you need to know something about Viv, read the primer and then look it up in the reference material.

Read the primer:

${CLAUDE_PLUGIN_ROOT}/docs/primer.md


## Your Viv skills

You have these skills available via the Viv plugin:

| Skill | What it does |
|-------|-------------|
| `/viv:setup` | Onboard this project — install toolchain, clone reference material, write config |
| `/viv:ask` | Answer Viv questions (loads the primer into this session) |
| `/viv:write` | Dispatch a writer agent to produce `.viv` code from a brief |
| `/viv:fix` | Dispatch a fixer agent to diagnose and fix compile/runtime errors |
| `/viv:design` | Dispatch a designer agent to architect Viv systems from a premise |
| `/viv:study` | Dispatch a researcher agent to deep-dive into Viv internals or the user's project |
| `/viv:build` | Dispatch an engineer agent to write adapters, test harnesses, and integrations |
| `/viv:critique` | Dispatch a critic agent to review working code for optimization, emergent potential, clarity, and completeness |
| `/viv:feedback` | Help the user report issues or suggestions to the Viv team |
| `/viv:sync` | *(hidden)* Synchronize compiler, runtime, and monorepo versions — invoked by other skills, not by the user |

Use these skills proactively when the user's request calls for Viv work. You don't need to wait for them to invoke a skill explicitly.


## Dispatching sub-agents

When you dispatch a Viv sub-agent (writer, fixer, designer, researcher, engineer, critic), you are their only link to the user. They cannot ask the user questions. So:

1. **Enrich the brief.** Don't just pass the user's words — add context from the conversation, relevant file paths, conventions you've observed, constraints discussed.
2. **Include the agent instructions.** Each agent has an instruction doc at `${CLAUDE_PLUGIN_ROOT}/docs/agents/`. **Read the file and paste its full contents into the sub-agent's prompt.** The sub-agent cannot access plugin paths — it only sees what you give it.
3. **Resolve paths.** The agent instruction docs reference `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`. These variables resolve in your context but NOT in the sub-agent's. Before pasting, replace them with the actual absolute paths so the sub-agent can read files. Also paste the primer content directly — don't just give a path to it.
4. **Resume over restart.** This is critical. If the user has follow-ups for a sub-agent that already ran, resume it with `SendMessage` rather than spinning up a fresh one. Viv is not in training data — every fresh sub-agent must learn the entire domain from scratch by reading docs. A resumed sub-agent already has all that context. The cost difference is massive.


## The compiler

Check `${CLAUDE_PLUGIN_DATA}/toolchain.md` for the local compiler and runtime paths. If it doesn't exist, try `vivc` on the PATH. If that fails, suggest the user run `/viv:setup`.


## Memory

Save what you learn about Viv to project memory. Next session, you and every sub-agent you dispatch will start from zero. The only things that persist are:

- This CLAUDE.md entry
- Project memories you write
- The cloned monorepo at `${CLAUDE_PLUGIN_DATA}/viv-monorepo/`
- The status file at `${CLAUDE_PLUGIN_DATA}/status.json`

Write down conventions, entity schemas, the user's preferences, tricky Viv behaviors you discovered — anything that would be painful to relearn.


## Reference material

The Viv monorepo should be cloned at `${CLAUDE_PLUGIN_DATA}/viv-monorepo/`. If it's not there, run `/viv:setup`.

For a map of every important file in the monorepo, see:

${CLAUDE_PLUGIN_ROOT}/docs/monorepo-map.md


## Support

If the user needs help from the Viv team, they can:
- Run `/viv:feedback` to file a GitHub issue
- Email support@sifty.studio
