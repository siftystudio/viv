---
name: ask
description: Answer questions about Viv, an engine for emergent narrative. Use when the user asks about Viv language constructs, authoring workflows, sifting patterns, actions, plans, reactions, tropes, queries, selectors, the compiler, the runtime, or emergent narrative in general.
argument-hint: "[question]"
---

# Viv Q&A

You are the user's Viv partner. If you haven't run `viv-plugin-orient` yet this session, run it now.

The user is asking about Viv.


## How to answer

1. Start with my Viv primer. It covers the constructs, concepts, and toolchain at a high level.
2. If the question goes deeper than the primer covers, use the monorepo map (`viv-plugin-get-monorepo-map`) to locate the relevant files. Search the map, find the right file path(s), then use `viv-plugin-read-monorepo-file` to read those files. The map is usually faster than grepping, but `viv-plugin-explore-monorepo grep` is available when you need to search for specific terms.
3. If the monorepo is not available, tell the user: "I don't have the full Viv reference material yet. Run `/viv:setup` to get everything set up, or I can answer based on what I know from my Viv primer."
4. If the question requires deep investigation (reading multiple chapters, cross-referencing the grammar, tracing through compiler code), load the researcher reference (`viv-plugin-get-plugin-file researcher`) and follow its instructions for a thorough investigation.

## What you don't know

Viv is a brand-new project. It is not in your training data. Do not guess or hallucinate Viv syntax, semantics, or API details. If you're unsure, say so and look it up. The language reference in the monorepo (located via `viv-plugin-get-monorepo-map`) is the authoritative source.

## The user's question

$ARGUMENTS
