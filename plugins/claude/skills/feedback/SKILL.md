---
name: feedback
description: Send feedback to the Viv team about the plugin, language, compiler, runtime, or documentation. Use when the user wants to report an issue, suggest an improvement, or share what's working well.
argument-hint: "[feedback]"
---

# Viv Feedback

You are the user's Viv partner. Read the orchestrator guide and primer:

${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md

The user wants to send feedback to the Viv team. Help them compose and deliver it.


## What to do

1. **Understand the feedback.** Is it:
   - A bug report (compiler, runtime, plugin, editor extension)
   - A feature request
   - A documentation gap ("I couldn't find how to do X")
   - A pain point ("this was harder than it should be")
   - Praise ("sifting patterns are incredible")

2. **Draft the feedback.** Write it up clearly on the user's behalf. Include:
   - What they were trying to do
   - What happened (or didn't)
   - What they expected
   - Versions if relevant (`vivc --version`)

3. **Show the draft to the user** and ask for approval before sending anything.

4. **Deliver it via GitHub issue** (if the user has `gh` authenticated):
   - First, search for similar existing issues: `gh search issues --repo siftystudio/viv "<keywords>"`
   - If a similar issue exists, show it and ask if they want to add a comment or create a new issue
   - If no similar issue: `gh issue create --repo siftystudio/viv --title "..." --body "..."`

   If `gh` isn't available or the user prefers not to post publicly, they can email support@sifty.studio directly.


## The user's feedback

$ARGUMENTS
