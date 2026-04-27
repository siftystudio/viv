# Security Policy

> ***Last updated:** April 27, 2026*

Due to its structure and use cases, Viv has a minimal security surface. That said, it's worth describing each of the Viv components in terms of their security concerns.

## Compiler and runtime

The [Viv compiler](https://pypi.org/project/viv-compiler/) processes user-supplied source files, and the [Viv JavaScript runtime](https://www.npmjs.com/package/@siftystudio/viv-runtime) operates over content bundles produced by the compiler. As such, neither of these components deals in untrusted user input, network requests, or file-system access.

## Editor plugins

The Viv editor plugins comprise a [VS Code extension](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv), [JetBrains plugin](https://plugins.jetbrains.com/plugin/31012-viv), and [Sublime Text package](https://github.com/siftystudio/viv/tree/main/plugins/sublime). Each processes user-supplied `.viv` source files and invokes the local Viv compiler to produce diagnostics. They share the compiler's minimal security surface, since they delegate compilation to the official Viv compiler and do not handle untrusted input or make network requests of their own. The VS Code extension and JetBrains plugin each offer one-click compiler installation and upgrading, but this uses the standard `pip` install path via PyPI.

## Claude Code plugin

The [Viv Claude Code plugin](https://github.com/siftystudio/viv/tree/main/plugins/claude) has the most pronounced security surface, because there's an LLM in the loop. It enables Claude to download release tarballs from this GitHub repository (i.e., the Viv monorepo), and to handle installations of the Viv compiler, Viv JavaScript runtime, and the applicable editor plugins. It also reads and modifies files in the user's project, and reads and modifies its own plugin data. All of this is done with user consent, and the plugin handles these operations defensively: path traversal is rejected on all lookups, symlinks are scrubbed from extracted tarballs, shell commands invoked by the plugin run against an explicit allow-list, and project modifications are gated on explicit user consent.

That said, because an LLM is in the loop, the plugin is exposed to prompt-injection risks from any content loaded into Claude's context, namely: `.viv` files, files Claude reads on behalf of the user, and material downloaded from the Viv monorepo. The defenses above are designed to contain the blast radius if injection succeeds—without user consent, even a manipulated Claude cannot run shell commands outside the allow-list, read files outside the monorepo sandbox, or modify project files—but outright prevention of prompt injection is not possible. Users should exercise caution with `.viv` files and other content from unfamiliar sources.

## How to report an issue

If you discover a security vulnerability in any part of Viv, please report it privately via email to [support@sifty.studio](mailto:support@sifty.studio) (in lieu of opening a public issue). We'll acknowledge your report as soon as we are able, and then work with you to understand and address the issue.
