# Viv Plugin Guide

You are working in a project that uses Viv, an engine for emergent narrative. This guide tells you how to operate as the user's Viv partner.

**You must read this guide in full before doing anything else.** Do not skim it. Do not skip sections. The monorepo map and scoping sections are load-bearing — ignoring them leads to wasted tokens and worse answers.


## Viv state

You should already have plugin state loaded — `viv-plugin-orient` prints it alongside the primer and this guide. The state file tracks the user's Viv ecosystem: compiler version and path, monorepo tag, and per-project runtime versions.

- **If there's no state yet,** Viv hasn't been set up. Tell the user: "Viv needs initial setup before we can get started. Want me to run `/viv:setup`?"
- **If state exists,** note the monorepo version and check whether the current project is registered in `projects`. If the project isn't listed, register it during setup or via `/viv:sync`.
- **If there's a version mismatch** between the project's installed compiler/runtime and the monorepo copy, note it but don't act on it immediately. Only suggest `/viv:sync` if it becomes relevant during the session.

State is a snapshot, not a live check. If you suspect drift between state and reality (e.g., the compiler isn't behaving as expected), invoke `/viv:sync` to reconcile.


## Critical: Viv is not in your training data

Viv is a brand-new domain-specific language. You have never seen it before. Do not guess syntax, semantics, or API details. When you need to know something about Viv, consult the primer (already loaded via orient) and then look it up in the reference material.


## The monorepo map — read this before you grep

The Viv monorepo is cloned locally. Check with `viv-plugin-fetch-monorepo --check`. If not installed, run `/viv:setup`.

**When you need to find anything in the monorepo, load the map first:** `viv-plugin-get-plugin-file monorepo-map`

The map indexes every important file in the Viv monorepo — not just directories, but individual scripts, bridge files, schemas, test fixtures, and config files — with a prose description and searchable keywords per entry.

When you get a question, search the map for relevant terms. It will hand you the exact file path(s) you need. Then use `viv-plugin-read-monorepo-file <path>` to read those files. This turns most questions into 2–3 tool calls instead of 15–20.

**Always use the plugin commands to access monorepo files.** `viv-plugin-explore-monorepo` handles locating (`ls`, `grep`); `viv-plugin-read-monorepo-file` handles reading file content. Never use raw `Read`, `Glob`, `Grep`, `ls`, `cat`, or `grep` on the monorepo directory. Both plugin commands are auto-approved — no permission prompts, ever. Raw filesystem commands will trigger permission prompts and degrade the user experience. All paths are relative to the monorepo root.


## Scoping your work

Before doing any Viv work, assess the scope. Match your research to the task:

- **A single action or simple construct:** The built-in examples and primer are enough. Start writing immediately.
- **A few interconnected constructs:** Read the example walkthrough. Consult the language reference for any construct you haven't seen before.
- **A full subsystem with plans, sifting patterns, and complex interactions:** Read the relevant language reference chapters. Use the monorepo map to find them.

Each skill has a reference doc (loaded via `viv-plugin-get-plugin-file <name>`) with specific guidance. Follow it.


## Token consciousness

Most Claude Code users run out of tokens every session. Be efficient:

- Use the monorepo map to locate files before searching. This is the single biggest token saver.
- Prefer targeted reads over exploratory browsing.
- Don't read files you don't need — the map tells you what's relevant and what's not.


## Your Viv skills

You have these skills available via the Viv plugin:

| Skill | What it does |
|-------|-------------|
| `/viv:setup` | Onboard this project — install toolchain, download reference material, configure environment |
| `/viv:ask` | Answer Viv questions using my Viv primer and reference material |
| `/viv:write` | Write `.viv` code from a brief |
| `/viv:fix` | Diagnose and fix compile/runtime errors |
| `/viv:design` | Architect Viv systems from a premise |
| `/viv:study` | Deep-dive into Viv internals or the user's project |
| `/viv:build` | Write adapters, test harnesses, and integrations |
| `/viv:critique` | Review working code for optimization, emergent potential, clarity, and completeness |
| `/viv:feedback` | Help the user report issues or suggestions to the Viv team |
| `/viv:sync` | Check for newer Viv component versions and upgrade what's behind with user approval; also handles downgrades, alignment, and reinstalls |

Use these skills proactively when the user's request calls for Viv work. You don't need to wait for them to invoke a skill explicitly.


## The compiler

Run `viv-plugin-read-state` and check `compiler_path`. If the state file doesn't exist, try `vivc` on the PATH. If that fails, suggest the user run `/viv:setup`.


## Plugin utilities (`bin/`)

These scripts are on your PATH when the plugin is active. All are auto-approved via hooks — no permission prompts. **Invoke them directly** — never wrap them in defensive shell patterns like `which cmd 2>/dev/null && cmd || echo "NOT FOUND"`, `command -v`, or `2>&1` redirects. They are guaranteed to exist when the plugin is loaded, and the Bash tool already captures both stdout and stderr. Defensive shell noise is unnecessary, wastes tokens, and looks alarming to the user — as if you're doing something secretive.

This plugin is designed to make your life easy. The hooks, PATH setup, and pre-approved permissions aren't restrictions — they're problems we already solved for you. Common agent pain points (permission prompts, missing commands, lost stderr) have been handled ahead of time so that both you and the user get an ultrasmooth experience. Trust the setup and just run the commands.

| Script | What it does |
|--------|-------------|
| `viv-plugin-orient` | Print primer + guide + state — everything you need to start a session |
| `viv-plugin-get-plugin-file <name>` | Fetch a plugin-bundled file atomically (main, primer, monorepo-map, web-links, writer, fixer, designer, researcher, engineer, critic) from the latest installed version |
| `viv-plugin-get-example [name]` | List or fetch idiomatic example Viv files |
| `viv-plugin-explore-monorepo <cmd>` | Locate files in the monorepo: `ls`, `grep` — all paths relative to monorepo root |
| `viv-plugin-read-monorepo-file <path>` | Print a file from the monorepo, optionally sliced by line range |
| `viv-plugin-fetch-monorepo [tag]` | Download or update the Viv monorepo copy |
| `viv-plugin-check-latest` | Report the latest published versions of each Viv component (compiler, runtime, monorepo, editor plugins, Claude plugin) for use by `/viv:sync` |
| `viv-plugin-read-state` | Print plugin state (versions, paths, projects) |
| `viv-plugin-write-state` | Write plugin state (`--init`, `--set <key> <value>`, `--project <path> <key> <value>`) |
| `viv-plugin-install-vscode-extension` | Install the Viv VS Code extension (or `--check` to detect) |
| `viv-plugin-install-webstorm-plugin` | Install the Viv JetBrains plugin in WebStorm (or `--check`) |
| `viv-plugin-install-sublime-package` | Install the Viv Sublime Text package (or `--check`) |
| `viv-plugin-install-runtime` | Install the Viv runtime in the current project, or `--check` to detect |

If the user mentions installing an editor plugin, offer to run the corresponding script. If they've installed a new editor since setup, the `--check` flags can detect whether the Viv plugin is missing.


## Web links

When the user needs a URL — to documentation, a registry, a marketplace, or a guide — run `viv-plugin-get-plugin-file web-links` to get the full list. Don't guess URLs from memory.


## Memory

Save what you learn about Viv to project memory. Next session, you will start from zero. The only things that persist are:

- This CLAUDE.md entry
- Project memories you write
- The cloned monorepo (check with `viv-plugin-fetch-monorepo --check`)
- The state file (read with `viv-plugin-read-state`)

Write down conventions, entity schemas, the user's preferences, tricky Viv behaviors you discovered — anything that would be painful to relearn.


## Support

If the user needs help from the Viv team, they can:
- Run `/viv:feedback` to file a GitHub issue
- Email support@sifty.studio
