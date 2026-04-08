# Viv Claude Code Plugin

The Viv plugin for [Claude Code](https://code.claude.com) (`viv`) turns Claude into a [Viv](https://viv.sifty.studio) expert—for authoring, building runtime integrations, debugging compiler errors, designing storyworlds, and more.

## Table of Contents

- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [How It Knows Viv](#how-it-knows-viv)
- [How It Works](#how-it-works)
- [Skills](#skills)
- [Compatibility](#compatibility)
- [Changelog](#changelog)
- [License](#license)

## Requirements

* Claude Code 1.0.33 or later.
* Git 2.25 or later (required by Claude Code's plugin installer).

## Getting Started

* Install [Claude Code](https://code.claude.com/docs/en/quickstart).
* In your terminal, boot up Claude Code: `claude`.
* Within the Claude Code session, paste in these commands to install the Viv Claude Code plugin:
  * `/plugin marketplace add siftystudio/claude-plugins`
  * `/plugin install viv@siftystudio`
* Start using the plugin:
  * `cd` into the project where you intend to use Viv.
  * Boot up Claude Code there: `claude`.
  * Run the special setup skill: `/viv:setup`.
  * Claude Code will handle all installation and setup for you, and it will give you a tour of the Viv plugin (and the larger Viv project).
* Now Claude Code will have deep Viv expertise any time you invoke it from your project directory, and there will also be a suite of Viv-specific Claude Code skills available there.

## How It Knows Viv

During initial setup (via `/viv:setup`), the plugin downloads a copy of the Viv monorepo so that Claude can search the full language reference, compiler source, runtime source, and other pertinent materials whenever it needs to look something up. This makes Claude immediately proficient in Viv.

## How It Works

Claude will always have general Viv awareness during sessions in the project where you ran the `/viv:setup` skill. In particular, it will have access to a detailed map of the Viv monorepo, allowing it to look up relevant information without spending considerable tokens reading. This is important because Viv is not in Claude's training data, which means its monorepo copy is its only viable source of information.

To further bolster Claude's Viv know-how, the plugin emphasizes the maintenance of Viv-specific memories detailing pertinent aspects of the usage of the system in your project.

When you ask Claude to carry out a Viv-centric task like writing code, fixing an error, or designing a system, it dispatches a focused subagent with the relevant instructions and reference material. In this pattern, you can keep talking to Claude while the subagent works. When results come back, Claude reviews them and presents them to you. If you have follow-ups on the task, Claude resumes the same subagent rather than starting over.

## Skills

After installing the plugin, the following Viv skills will be globally available to use when using Claude Code.

To list all the skills, type `/viv` in a Claude Code session, which will bring up a scrollable autocomplete dropdown. To use a skill, simply type it in—either in its full form, like `/viv:ask`, or in its abbreviated form, like `/ask`. Most of the Viv skills allow a kind of argument in the form of surrounding prose, but a skill will work however invoked, as long as your message includes it.

You can also just talk about Viv with Claude naturally, assuming you're in a project where `/viv:setup` has been run. It will use the right skill based on what you're doing.

* **`/viv:setup`** (alias `/setup`)
  - Set up Viv in your project. Walks you through installing the compiler and runtime, choosing an editor plugin, and configuring your environment. Run this first.
* **`/viv:ask`** (alias `/ask`)
  - Ask anything about Viv: language constructs, authoring workflows, the compiler, the runtime, emergent narrative in general. Claude will look up the answer using the Viv materials copied into its plugin data.
* **`/viv:write`** (alias `/write`)
  - Tell Claude what to make and it will write the Viv code—actions, plans, sifting patterns, tropes, queries, selectors, and more. In most cases, the code will be compiled and verified before being presented to you.
* **`/viv:fix`** (alias `/fix`)
  - Paste a compiler error, point at a broken file, or describe an unexpected runtime behavior. Claude will diagnose the issue, trace through the compiler and/or runtime source if needed, and propose a fix. If the fix is big, you can use `/viv:write` and/or `/viv:build` to carry it out.
* **`/viv:design`** (alias `/design`)
  - Describe what you want to build—a storyworld, an entity schema, an adapter architecture, a test strategy—and Claude will produce a design document that can be handed off to `/viv:write` and/or `/viv:build`.
* **`/viv:study`** (alias `/study`)
  - Point Claude at a topic and it will carry out a deep dive into the Viv internals, your project's structure, or a specific language feature, returning a detailed briefing.
* **`/viv:build`** (alias `/build`)
  - Claude will write your host adapter, test harness, simulation runner, or other integration code. Just tell it what you're after.
* **`/viv:critique`** (alias `/critique`)
  - Hand Claude your working code and it will review it for optimization opportunities, narrative potential, clarity, completeness, robustness, and style. In lieu of making changes, this skill typically produces a report (which can be handed off to `/viv:write`, `/viv:build`, or `/viv:fix`).
* **`/viv:feedback`** (alias `/feedback`)
  - Report issues or suggestions to the Viv team, directly from Claude Code. Claude will draft the feedback, search for similar existing issues, and file it on GitHub on your behalf (pending your approval).

## Compatibility

The plugin downloads a copy of the Viv monorepo that is matched to your installed compiler and runtime versions. If you update your compiler or runtime, Claude will notice the version mismatch and offer to sync its reference material and/or your Viv install to match. It can also detect when your Viv components are out of date and missing helpful new features or fixes.

## Changelog

See the [changelog](https://github.com/siftystudio/viv/blob/main/plugins/claude/CHANGELOG.md) for a history of changes to this plugin.

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out the [license](LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
