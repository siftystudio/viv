# Privacy Policy

> ***Viv Claude Code Plugin***
> 
> ***Last updated:** April 14, 2026*

The Viv Claude Code plugin (the "plugin") is published by [Sifty LLC](https://www.sifty.studio/). This policy describes what data the plugin handles, what it sends to third parties, and what choices you have.

## The short version

The plugin does not collect, transmit, or store any personal data. It runs entirely on your machine and does not phone home. The network requests it makes are limited to installing and updating the Viv toolchain, syncing reference material, checking public package registries for the latest published Viv component versions, and filing feedback.

## What the plugin stores locally

The plugin writes state to your home directory under `~/.claude/plugins/data/viv-siftystudio/` and `~/.claude/plugins/cache/siftystudio/`. This state contains:

- The versions of the Viv compiler, schema, and grammar you have installed.
- The path to your Viv compiler `vivc` binary.
- A local copy of the Viv source code the plugin downloads so Claude can consult it.
- For each project where you've run `/viv:setup`: the project's absolute path, the installed Viv runtime version, and the date of the last check.

This data never leaves your machine. To delete it, remove the two directories above.

## Network requests the plugin makes

The plugin makes outbound HTTPS requests in the following situations:

- Downloading the Viv source code.
  - This occurs during `/viv:setup`, and also when you invoke `/viv:sync` to refresh reference material or reconcile drift. The plugin fetches a release tarball from `github.com/siftystudio/viv`. GitHub may log standard request metadata such as IP address and `User-Agent`.

- Checking for new releases of Viv components.
  - This occurs when you invoke `/viv:sync`. The plugin makes read-only requests to public package registries to retrieve the latest published versions of each Viv component: PyPI (compiler), the npm registry (runtime), the GitHub Releases API (monorepo, Sublime package, and the Claude plugin itself), the VS Code Marketplace (VS Code extension), and the JetBrains Marketplace (JetBrains plugin). These are anonymous version lookups—no user data is sent—and the responses are parsed locally to decide whether any component is behind.

- Installing the Viv compiler.
  - This occurs during `/viv:setup`, and also during `/viv:sync` if you choose to upgrade the compiler after a version check. The plugin invokes `pip` to install the `viv-compiler` package from PyPI on your behalf, with your consent.

- Installing or updating the Viv JavaScript runtime.
  - This occurs during `/viv:setup`, and also during `/viv:sync` if Claude detects that the runtime is behind the latest published version. The plugin invokes `npm` to install `@siftystudio/viv-runtime` from the npm registry on your behalf, with your consent.

- Installing or updating editor plugins.
  - This occurs during `/viv:setup`, and also during `/viv:sync` if Claude detects an installed editor that does not yet have the Viv plugin, or if an installed editor plugin is behind the latest published version. Claude invokes the relevant editor's CLI to install the Viv extension from the pertinent marketplace: VS Code Marketplace, the JetBrains Marketplace, or via copy from the local Viv source code for Sublime Text.

- Filing feedback.
  - This occurs when you invoke `/viv:feedback`. The plugin drafts a GitHub issue and, after you explicitly approve the draft, files it on `github.com/siftystudio/viv` via the `gh` CLI you have authenticated.

The plugin sends no other data to any third party.

## Your project files

The plugin reads and writes files in your project directory only when you explicitly ask Claude to do so via a Viv skill—for example, if you use `/viv:write` to create a `.viv` file, or `/viv:fix` to edit one. The `/viv:setup` skill modifies your project's `package.json`, `package-lock.json`, `node_modules/`, and `CLAUDE.md` only after you consent to each change.

## What the plugin does not do

The plugin includes none of the following:

- Telemetry or usage analytics.
- Error or crash reporting.
- Cookies, tracking pixels, or web beacons.
- Third-party analytics or tracking services.
- Advertising integrations.
- Background data transmission of any kind.
- Sale or sharing of any data with marketing partners.

## Data shared with Anthropic

The plugin runs inside Claude Code, which is an Anthropic product. Anthropic's own privacy policy governs what Claude Code transmits to Anthropic during your sessions, including the contents of conversations and any files Claude reads. The Viv plugin does not add data to that flow beyond the normal contents of your prompts and Claude's responses.

## Children

The Viv Claude Code plugin is not directed at children under 13, and does not knowingly collect data from anyone.

## Reporting security issues

If you discover a security vulnerability in the plugin, please report it using the protocol described in the [Viv security policy](https://github.com/siftystudio/viv/blob/main/.github/SECURITY.md).

## Changes to this policy

Updates will be posted to the same URL as this document, with a modified `Last updated` date.

## Contact

If you have any questions or concerns about this policy, please send an email to `support@sifty.studio`.
