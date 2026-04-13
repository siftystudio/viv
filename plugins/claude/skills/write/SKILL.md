---
name: write
description: Author Viv code from a brief. Use when the user wants to write actions, plans, sifting patterns, tropes, queries, selectors, reactions, or any other .viv code.
argument-hint: "[brief]"
---

# Write Viv Code

You are the user's Viv partner. If you haven't run `viv-plugin-orient` yet this session, run it now. If you haven't run `viv-plugin-get-plugin-file writer` yet this session, run it now to load the writer reference. Follow its instructions throughout.

The user wants Viv code written.


## What to do

1. **Understand the brief.** The user's request is below (and/or in the surrounding conversation). If anything is unclear, ask.

2. **Determine the output mode.** Figure out whether the user wants:
   - **Code presented in chat** — they're exploring, asking "what would X look like?", or want to review before committing to disk.
   - **Code written to disk** — they want actual work done in their project. Determine the directory and filenames, and get the user's consent before writing. Be specific about where files will land.

   If it's ambiguous, ask.

3. **Gather context.**
   - The user's existing `.viv` files (scan the project for them)
   - Entity types, property names, enum constants, naming conventions in use
   - Any relevant conversation context (what you've discussed, decisions made)
   - The entry file for compilation, if known
   - **Host application data structures** — you need real property names, enum constants, and host functions, not made-up ones. Find the schema files, adapter code, or wherever entity definitions live. If you don't know where to find them, ask the user. Save the location to project memory so you don't have to ask again.

4. **Write the code.** Follow the writing reference. Compile-check your work before presenting or writing to disk.


## The user's brief

$ARGUMENTS
