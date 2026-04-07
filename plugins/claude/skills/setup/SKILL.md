---
name: setup
description: Set up Viv in the current project. Installs the compiler and runtime, clones reference material, configures CLAUDE.md, and optionally kicks off brainstorming. Run this first in any new Viv project.
argument-hint: ""
disable-model-invocation: true
---

# Set Up Viv

You are the user's Viv partner. Read the primer:

${CLAUDE_PLUGIN_ROOT}/docs/primer.md

The user wants to set up Viv in their project, or a Viv skill was invoked before setup was complete.


## What to do

Walk the user through each step interactively. Don't rush — this is their first impression of Viv tooling.


### 1. Install the toolchain

Check if the compiler and runtime are already installed:

```
vivc --version
npm list @siftystudio/viv-runtime
```

If not installed, guide the user through installation:

- **Compiler:** `pip install viv-compiler` (Python 3.11+)
- **Runtime:** `npm install @siftystudio/viv-runtime`

If the user has a virtual environment or non-standard Python setup, help them get `vivc` accessible. Record the working paths.

Once installed, write the toolchain file at `${CLAUDE_PLUGIN_DATA}/toolchain.md`:

```markdown
# Viv Toolchain
Compiler: /path/to/vivc
Runtime: /path/to/node_modules/@siftystudio/viv-runtime
```


### 2. Clone reference material

Invoke `/viv:sync` to clone the Viv monorepo to `${CLAUDE_PLUGIN_DATA}/viv-monorepo/`. If `/viv:sync` is not available, download the monorepo tarball manually:

```bash
mkdir -p ${CLAUDE_PLUGIN_DATA}/viv-monorepo
curl -sL https://github.com/siftystudio/viv/archive/refs/heads/main.tar.gz | tar xz --strip-components=1 -C ${CLAUDE_PLUGIN_DATA}/viv-monorepo/
```


### 3. Write status file

Write `${CLAUDE_PLUGIN_DATA}/status.json` with the current state:

```json
{
  "monorepo_tag": "<tag or 'main'>",
  "cloned_at": "<today's date>",
  "projects": {
    "<absolute path to current project>": {
      "compiler": "<installed compiler version>",
      "runtime": "<installed runtime version>",
      "last_checked": "<today's date>"
    }
  }
}
```

If `status.json` already exists (setup was run before in another project), merge the new project entry into the existing `projects` map.


### 4. Configure CLAUDE.md

Check if the project has a CLAUDE.md. If so, check whether a `## Viv` section already exists — if it does, update it rather than appending a duplicate. If no CLAUDE.md exists, create one. Add a small Viv section:

```markdown
## Viv

This project uses the Viv engine. The Viv Claude Code plugin is installed.
Read <absolute path to ${CLAUDE_PLUGIN_ROOT}/docs/agents/main.md> if the user mentions Viv or when working with `.viv` files.
```

Replace `<absolute path ...>` with the actual resolved path.


### 5. Editor plugin

Ask the user what editor or IDE they use for this project. Recommend the best Viv plugin for their setup:

- **JetBrains IDEs** (IntelliJ, PyCharm, WebStorm, CLion, GoLand, Rider) — the most full-featured option. Rename refactoring, go-to-declaration, context-aware autocompletion, hover documentation, structure view, breadcrumbs, find usages, inline diagnostics, and compiler integration. Search "Viv" in Plugins.
- **VS Code** — syntax highlighting, inline compiler diagnostics, compile on save, boilerplate snippets, six color themes. Search "Viv" in Extensions.
- **Sublime Text** — lightweight option. Syntax highlighting, compiler integration via build system, snippets, color themes. Search "Viv" in Package Control.

If they already have a JetBrains IDE open for this project, recommend that. If they're a VS Code user, that's great too. If they want the lightest touch, Sublime.

Since the Viv runtime is JavaScript/TypeScript, the user is likely working in a JS/TS project. If they aren't already using a JetBrains IDE, it's worth mentioning that WebStorm would give them deep IDE support for both their JS/TS project code *and* their `.viv` files in one editor — rename refactoring, go-to-def, autocompletion, and hover docs across both languages.


### 6. Verify

Run a quick smoke test to make sure everything works:

```
vivc --test
```


### 7. Tour

Give the user a quick overview of what they can now do:

- `/viv:write` — tell me what to build and I'll write the Viv code
- `/viv:design` — describe a world and I'll architect it
- `/viv:fix` — paste an error and I'll diagnose it
- `/viv:ask` — ask me anything about Viv
- `/viv:critique` — hand me your code and I'll review it
- `/viv:study` — point me at something and I'll research it
- `/viv:build` — I'll write your adapter, test harness, or integration code
- `/viv:feedback` — tell the Viv team what's working and what isn't

Tell them they can also just talk naturally — you'll use the right tool.


### 8. What's next?

Ask the user if they'd like to:
- Start brainstorming a storyworld (`/viv:design`)
- Dive into an existing `.viv` project
- Learn more about Viv (`/viv:ask`)

Save a project memory noting that Viv setup is complete, what versions were installed, and any notable configuration details.
