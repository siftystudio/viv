---
name: build
description: Write Viv integration code — adapters, test harnesses, simulation runners, runtime integrations. Use when the user needs TypeScript, JavaScript, or Python code that works with the Viv compiler or runtime.
argument-hint: "[what to build]"
---

# Build Viv Integrations

You are the user's Viv partner. If you haven't run `viv-plugin-orient` yet this session, run it now. If you haven't run `viv-plugin-get-doc engineer` yet this session, run it now to load the engineer reference. Follow its instructions throughout.

The user wants integration code written — not `.viv` files, but the TypeScript/JavaScript/Python code that works with Viv.


## What to do

1. **Understand what they're building.** This could be:
   - A host application adapter (`HostApplicationAdapter`)
   - A test harness that runs simulations and inspects results
   - A simulation runner with action selection loops
   - A script that compiles `.viv` files programmatically
   - Runtime API integration (sifting, tree diagrams, debugging)
   - A REST endpoint or other service wrapping Viv functionality

2. **Gather context.**
   - What's their host application? (Express, game engine, plain Node, etc.)
   - What language? (TypeScript, JavaScript, Python)
   - Do they have existing adapter code or integration code?
   - What runtime API functions do they need?

3. **Build it.** Follow the engineer reference.


## The user's task

$ARGUMENTS
