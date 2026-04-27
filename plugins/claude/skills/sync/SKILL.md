---
name: sync
description: "Sync the Viv install. Default flow: check for newer published versions of the compiler, runtime, monorepo, and editor plugins; review CHANGELOGs for breaking changes; and upgrade what's behind with user approval. Also handles downgrades, alignment, and reinstalls when the context calls for it."
argument-hint: "[optional direction — e.g., 'downgrade the compiler', 'align to compiler v0.11.3', 'reinstall everything']"
user-invocable: true
---

# Viv Sync

You are managing the user's Viv install. Read the conversation to determine the goal before acting:

- **Default case** (no specific direction from context): bring everything to the latest published versions.
- **Specific direction** (downgrade to debug a regression, pin to a version, reinstall because something broke, align the monorepo to the installed compiler, etc.): honor it. Don't override with "but latest would be better" — the user or the invoking agent had a reason.


## Flow

### 1. Check latest published versions

Run `viv-plugin-check-latest`. It reports the latest versions for:

- **Compiler** — PyPI (`viv-compiler`)
- **Runtime** — npm (`@siftystudio/viv-runtime`)
- **Monorepo** — GitHub releases, most recent release tag of *any* flavor. Under the Viv project invariant that all latest components play nice together, the freshest tag is always a safe fetch target for the default upgrade flow.
- **VS Code extension** — VS Code Marketplace (`siftystudio.viv`)
- **JetBrains plugin** — JetBrains Marketplace (plugin 31012)
- **Sublime package** — GitHub releases, latest `sublime-v*` tag
- **Claude Code plugin** — GitHub releases, latest `claude-v*` tag

### 2. Determine what's installed

Use your judgment. The right command depends on the component:

- **Compiler:** `vivc --version`, or read `compiler_path` from `viv-plugin-read-state` if `vivc` isn't on PATH.
- **Runtime:** `npm list @siftystudio/viv-runtime` in the project directory.
- **Monorepo:** read `monorepo_tag` from `viv-plugin-read-state`.
- **Editors:** the corresponding `viv-plugin-install-*-{extension,plugin,package} --check`.
- **Claude Code plugin:** call `viv-plugin-version` for the version that's *actually running* in this session, then list `~/.claude/plugins/cache/siftystudio/viv/` for the version that's been *cached* (highest semver subdirectory). If the running version is older than the cached version, that's the well-known Claude Code cache-staleness bug — surface it to the user explicitly and recommend a manual cache clear + reinstall (handled by the upgrade flow in step 5). Do not rely solely on the cache directory listing — it tells you the latest *available* on disk, not what's actually executing.

### 3. Check CHANGELOGs before recommending anything

For every component that's behind, read the component's CHANGELOG in the monorepo to understand what changed. Each package has its own:

- `compiler/CHANGELOG.md`
- `runtimes/js/CHANGELOG.md`
- `plugins/vscode/CHANGELOG.md`
- `plugins/jetbrains/CHANGELOG.md`
- `plugins/sublime/CHANGELOG.md`
- `plugins/claude/CHANGELOG.md`

Look especially hard at minor-version bumps — pre-1.0, `0.10.x → 0.11.0` may include breaking changes per semver convention. Patch bumps (`0.10.1 → 0.10.2`) are typically safe but still worth a glance. Fall back to `git log` in the monorepo if the CHANGELOG is thin or missing the relevant entries.

Summarize anything user-facing, especially breaking changes, so you can present them to the user in step 4.

### 4. Present the delta and ask

Show the user what's current, what's behind, and what each upgrade would bring — including any breaking changes you found in the CHANGELOGs. Then ask whether to upgrade.

**Always check in before upgrading.** Sync is a rarely used skill; the cost of asking is small compared to the cost of surprise changes. Even for patch bumps, confirm with the user.

**Use `AskUserQuestion` for structured decisions.** The `/viv:setup` skill leans heavily on this pattern for procedural interactions and it's a natural fit for sync too. Concretely: for each component that's behind, consider an `AskUserQuestion` with labeled options like "Upgrade" / "Skip" / "Show me the CHANGELOG first" (and for minor-version bumps, include a "Show the breaking-change summary" option). Don't assume the user wants to upgrade everything at once — let them pick and choose.

### 5. Execute approved upgrades

For each component the user approved:

- **Compiler:** conversational install, because Python environments vary. Follow the same logic as `/viv:setup` step 5 (pipx / pip3 / venv). Use `compiler_path` from state as a hint about how it was originally installed.
- **Runtime:** `viv-plugin-install-runtime` — re-runs the install, which pulls latest from npm.
- **Monorepo:**
  - **Default upgrade flow:** `viv-plugin-fetch-monorepo <tag>` where `<tag>` is the most recent release tag of any flavor (what `viv-plugin-check-latest` reports for `monorepo`). This grabs the freshest snapshot, which by the project invariant contains the latest of every component.
  - **Downgrade / pin / align-to-installed-compiler:** `viv-plugin-fetch-monorepo compiler-v<installed_version>` so the monorepo's language reference and grammar match the compiler the user is running. This is the only time compiler-v primacy applies.
- **VS Code extension:** `viv-plugin-install-vscode-extension`.
- **JetBrains plugin:** `viv-plugin-install-webstorm-plugin`.
- **Sublime package:** `viv-plugin-install-sublime-package` copies from `plugins/sublime/` in the currently-fetched monorepo — it does not reach out to any package registry. Order matters: fetch the monorepo first (see above) so that the sublime directory reflects the correct version, then run the install. Under the default upgrade flow, the monorepo refresh fetches the freshest release of any flavor, guaranteeing the latest sublime is present.
- **Claude Code plugin itself:** this is Viv's own plugin and it's installable via Claude Code's plugin system. Due to a Claude Code caching bug where new versions land in the cache but the oldest cached version is what runs, the manual upgrade sequence is:
  1. `rm -rf ~/.claude/plugins/cache/siftystudio/viv` — clear the cache so the bug can't bite.
  2. `claude plugin install viv@siftystudio` — triggers a fresh install from the marketplace.
  3. Tell the user to restart Claude Code for the new version to take effect.
  Ask for explicit consent before running step 1 (destructive) and warn about the restart requirement before running step 2.

**When an install or upgrade command fails** — e.g., the WebStorm CLI launcher isn't on PATH, VS Code's `code` command isn't installed, Sublime Text isn't detected, or some other environmental prerequisite is missing — surface the failure to the user and offer to help. You (Claude) know how to install these tools and how to enable auto-updates inside each editor, so use `AskUserQuestion` to present structured recovery options, e.g.:

- Label: "Walk me through it" — Description: "I'll guide you through installing the missing tool so sync can finish the upgrade"
- Label: "Handle it manually" — Description: "Use the editor's built-in plugin management instead (I'll tell you where to click)"
- Label: "Turn on auto-updates" — Description: "Enable auto-updates in the editor so future upgrades happen without me"
- Label: "Skip this one" — Description: "Move on without upgrading this component"

One blocked component should not block the rest of the sync. Continue with the other upgrades and report the skip at the end.

### 6. Verify

After any changes, run `vivc --version` and confirm the expected version. If you touched the compiler, also run `vivc --test`. If verification fails, report back to the user — do not update state as if the sync succeeded.

### 7. Update state

Use `viv-plugin-write-state` to persist the new versions:

```bash
viv-plugin-write-state --set compiler_version <version>
viv-plugin-write-state --set monorepo_tag <tag>
viv-plugin-write-state --set monorepo_cloned_at <date>
viv-plugin-write-state --project <path> runtime_version <version>
viv-plugin-write-state --project <path> last_checked <date>
```

Report what was done.


## Notes

- **If compiler and runtime are mutually incompatible,** the tools surface the mismatch themselves via their error messages. Follow whichever side is behind and upgrade it.
- **If a component's install is broken** (e.g., `vivc --version` fails entirely, npm complains about a corrupted package), this is a repair situation, not an upgrade. Diagnose the underlying issue and remediate before trying to move forward.
- **If the user has pinned a version** — either explicitly in the conversation or implicitly by having a specific setup they don't want disturbed — don't push past it. Align other components to match their pin instead.
