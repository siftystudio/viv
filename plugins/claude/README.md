# Viv Claude Code Plugin

The Viv plugin for [Claude Code](https://code.claude.com) (`viv`) turns Claude into a [Viv](https://viv.sifty.studio) expert—for writing Viv code, debugging compiler and runtime errors, designing storyworlds, building integrations, and more.

It works by maintaining a synced copy of the Viv codebase, which it efficiently navigates using special bundled commands, allowing Claude to search the full language reference, compiler source, runtime source, and other material any time it needs to look something up.

Skills include `/setup` for fully automated Viv installation and project setup, `/write` for authoring Viv code from a brief, `/fix` for diagnosing compiler and runtime errors, `/design` for worldbuilding and architecture planning, and `/build` for writing integration code. See below for a [full listing](#skills).

## Table of Contents

- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [How It Knows Viv](#how-it-knows-viv)
- [Skills](#skills)
- [Compatibility](#compatibility)
- [Updating](#updating)
- [Installing a Specific Release](#installing-a-specific-release)
- [Uninstalling](#uninstalling)
- [Changelog](#changelog)
- [Security and Privacy](#security-and-privacy)
- [License](#license)

## Requirements

* Claude Code 2.1.85 or later (the plugin uses the `if`-filter hook syntax introduced in that release).
* Git 2.25 or later (required by Claude Code's plugin installer).
* **For Windows users**: Install [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) and run Claude Code from there.
  * The plugin's utility commands are bash scripts, which don't run reliably under native Windows shells due to known upstream issues in Claude Code's plugin infrastructure. We are currently working on a more Windows-friendly scheme, but in meantime, everything should work like it does on macOS and Linux if you run Claude Code from inside WSL 2.


## Getting Started

* Install [Claude Code](https://code.claude.com/docs/en/quickstart).

* Install the Viv plugin:

  ```sh
  claude plugin marketplace add siftystudio/claude-plugins
  claude plugin install viv@siftystudio
  ```

  * To install a specific version, see [Installing a Specific Release](#installing-a-specific-release).

* Enable auto-update so the plugin stays current:

  * Within a Claude Code session, enter `/plugin`.
  * Navigate to the `Marketplaces` tab and select `siftystudio`.
  * Select `Enable auto-update`.

* Start a new Claude Code session.
  * Currently a full restart is required for the plugin to become active, despite what the UI may suggest about `/reload-plugins`.

* Start using the plugin:
  * `cd` into the project where you intend to use Viv.
  * Boot up Claude Code there: `claude`.
  * Run the special setup skill: `/viv:setup` (or just `/setup`).
  * Claude Code will handle all installation and setup for you, before giving you a tour of the Viv plugin—and of the larger Viv project, if desired.

* Now Claude Code has deep Viv expertise any time you invoke it from your project directory, and the suite of Viv-specific Claude Code [skills](#skills) will be available across your machine.

## How It Knows Viv

During initial setup (via `/viv:setup`), the plugin downloads a copy of the Viv codebase so that Claude can search the full language reference, compiler source, runtime source, and other pertinent materials whenever it needs to look something up.

Its copy of the Viv codebase is stored on your machine as part of its own internal plugin data, which it navigates using a suite of bundled special commands that are tailored to the Viv monorepo structure and to Viv concerns in general. This allows Claude to efficiently find information with a minimal cost of tokens and time, and with no permission prompts, because it's just reading its own plugin data via pre-approved plugin commands.

## Skills

After installing the plugin, the following Viv skills will be globally available to you across all Claude Code sessions.

To list all the skills, type `/viv` in a Claude Code session, which will bring up a scrollable autocomplete dropdown. **To use a skill, simply type it in—either in its full form, like `/viv:ask`, or in its abbreviated form, like `/ask`.** Most of the Viv skills allow a kind of argument in the form of surrounding prose, but a skill will work however invoked, as long as your message includes it.

Also note that you can just talk about Viv with Claude naturally, assuming you're in a project where `/viv:setup` has been run, in which case it will automatically select and use the right skill based on what you're doing.

### **`/viv:setup`**

Set up Viv in your project. Walks you through installing the compiler and runtime, choosing an editor plugin, and configuring your environment. Run this first on a per-project basis, and do so from a project folder (ideally the project root).

*Example: `/setup` (triggers highly structured onboarding flow).*

### **`/viv:ask`**

Ask anything about Viv: language constructs, authoring workflows, the compiler, the runtime, emergent narrative in general. Claude will look up the answer using the Viv materials copied into its plugin data.

*Example: `/ask what's the difference between a query and a sifting pattern`.*

### **`/viv:write`**

Tell Claude what to make and it will write the Viv code—actions, plans, sifting patterns, tropes, queries, selectors, and more. The code will be compiled and verified before being presented to you.

*Example: `/write a sifting pattern that matches rags-to-riches storylines`.*

### **`/viv:fix`**

Paste a compiler error, point at a broken file, or describe an unexpected runtime behavior. Claude will diagnose the issue, trace through the compiler and/or runtime source if needed, and propose a fix. If the fix is big, you can use `/viv:write` and/or `/viv:build` to carry it out.

*Example: `/fix the compiler error in mutiny.viv`.*

### **`/viv:critique`**

Hand Claude your working code and it will review it for optimization opportunities, narrative potential, clarity, completeness, robustness, and style. In lieu of making changes, this skill typically produces a report (which can be handed off to `/viv:write`, `/viv:build`, or `/viv:fix`).

*Example: `/critique all my project Viv code for optimization opportunities`.*

### **`/viv:study`**

Point Claude at a topic and it will carry out a deep dive into the Viv internals, your project's structure, or a specific language feature, returning a detailed briefing.

*Example: `/study how to do parallel tracks in a plan`.*

### **`/viv:design`**

Describe what you want to build—a storyworld, an entity schema, an adapter architecture, a test strategy—and Claude will produce a design document that can be handed off to `/viv:write` and/or `/viv:build`.

*Example: `/design a storyworld around sound system rivalries in 1950s Kingston`.*

### **`/viv:build`**

Claude will write your host adapter, test harness, simulation runner, or other integration code. Just tell it what you're after.

*Example: `/build a Viv adapter for my Express app and a test harness that runs 100 timesteps`.*

### **`/viv:sync`**

Check for newer versions of the Viv compiler, runtime, monorepo, editor plugins, and the Claude plugin itself. Claude reviews each component's changelog for breaking changes, presents the delta, and offers to upgrade what's behind (with your approval). This skill also handles downgrades, reinstalls, and reconciling drift from changes made outside the plugin.

Note: You will need to restart Claude Code in order for any update to this plugin itself to take effect.

*Example: `/sync` (triggers an update check across all Viv components).*

### **`/viv:feedback`**

Report issues or suggestions to the Viv team, directly from Claude Code. Claude will draft the feedback, search for similar existing issues, and file it on GitHub on your behalf (pending your approval).

*Example: `/feedback` (triggers a structured process for composing and submitting an issue on this GitHub repository).*

## Compatibility

The plugin downloads a copy of the Viv monorepo that is matched to your installed compiler and runtime versions. If you update your compiler or runtime outside the plugin, Claude will notice the version mismatch the moment it becomes relevant and offer to run `/viv:sync` to reconcile. You can also run `/viv:sync` directly at any time, to check whether your Viv components are behind the latest published versions.

## Updating

If you [enabled auto-update](#getting-started), the plugin will update automatically. But if auto-update is off, or if the latest version hasn't come through yet, you can update in one of two ways.

The easiest method is to run [`/viv:sync`](#vivsync) in a Claude Code session. If you'd rather update the plugin manually, [uninstall](#uninstalling) it and then [install](#getting-started) again from scratch. In either case, you'll need to restart Claude Code afterward for the new plugin version to take effect.

## Installing a Specific Release

You can also install a specific version of the plugin, for instance to use an older version.

* If you have a previous install, [uninstall](#uninstalling) it first.

* Download the `.zip` file attached to the pertinent [GitHub release](https://github.com/siftystudio/viv/releases), and unzip it.

* Install from the unzipped directory:

  ```sh
  claude plugin marketplace add path/to/unzipped/<directory-name>
  claude plugin install viv@siftystudio
  ```

## Uninstalling

To fully remove the plugin:

* Uninstall it via Claude Code:

  ```sh
  claude plugin uninstall viv@siftystudio
  ```

* Clear the marketplace cache. (Currently the `uninstall` command removes the plugin from your active install list but leaves the cached marketplace copy behind, which can cause a stale version to be served on future installs.)

  - macOS / Linux:

    ```sh
    rm -rf ~/.claude/plugins/cache/siftystudio
    ```

  - Windows (PowerShell):

    ```powershell
    Remove-Item -Recurse -Force ~/.claude/plugins/cache/siftystudio
    ```

## Changelog

See the [changelog](https://github.com/siftystudio/viv/blob/main/plugins/claude/CHANGELOG.md) for a history of changes to this plugin.

## Security and Privacy

See the [privacy policy](https://github.com/siftystudio/viv/blob/main/plugins/claude/PRIVACY.md) for information about how the plugin handles your data. If you discover a security vulnerability in the plugin, please report it using the protocol described in the [Viv security policy](https://github.com/siftystudio/viv/blob/main/.github/SECURITY.md).

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out the [license](LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
