# Viv: An Engine for Emergent Narrative

[![pypi][pypi-badge]][pypi-link] [![npm][npm-badge]][npm-link] [![claude code][claude-badge]][claude-link]

[![jetbrains][jetbrains-badge]][jetbrains-link] [![vs code][vscode-badge]][vscode-link] [![sublime text][sublime-badge]][sublime-link]

[![docs][docs-badge]][docs-link] [![CI][ci-badge]][ci-link] [![last release][last-release-badge]][last-release-link] [![last commit][last-commit-badge]][last-commit-link] [![license][license-badge]][license-link]

## Welcome

Welcome to the **monorepo** for Viv, an engine for emergent narrative in games and simulations.

In *emergent narrative*, stories arise from the bottom up, as characters take action in a simulated storyworld, rather than being authored from the top down. Viv offers (aspiring) narrative designers a custom programming language affording rich specifications of character actions, as well as constructs to drive *story sifting*—the task of identifying emergent storylines in a given simulation instance, such as a videogame playthrough.

If you're new to Viv, check out the [**homepage**](https://viv.sifty.studio) for a proper introduction.

Viv is a **source-available project**, which means that:

* Anyone can view its full codebase (which lives here in this monorepo).
* Non-commercial use is freely permitted.
* Commercial use requires a [license](#license).

Below, you'll find a high-level overview of the project, mostly in the form of links to the published packages and to various docs. There is also a [monorepo layout](#monorepo-layout) section providing a high-level map of the codebase, for folks who want to explore around in there.


## Table of Contents

- [Requirements](#requirements)
- [Quickstart](#quickstart)
- [Packages](#packages)
- [Docs](#docs)
- [Example Projects](#example-projects)
- [Monorepo Layout](#monorepo-layout)
- [Contributing](#contributing)
- [License](#license)


## Requirements

* Python 3.11+ (for the Viv compiler)
* Node.js 18+ (for the Viv JavaScript runtime)


## Quickstart

*Note that currently there is a single Viv runtime, aimed at JavaScript (and TypeScript) codebases. If you can’t run JavaScript in your project, you likely won’t be able to use Viv right now. A C# runtime tailored for Unity projects is planned.*

### I use LLMs

* Install [Claude Code](https://code.claude.com/).

* Install the [Viv Claude Code plugin](https://github.com/siftystudio/viv/tree/main/plugins/claude):

  ```sh
  claude plugin marketplace add siftystudio/claude-plugins
  claude plugin install viv@siftystudio
  ```

* In Claude Code, run the `/viv:setup` skill.

  * Claude takes it from there, installing Viv components, setting up your project, answering your questions, and proposing next steps.

### I do not use LLMs

* Install the compiler, and verify it works:

  ```sh
  pip install viv-compiler

  vivc --test
  ```

* Install the runtime:

  ```sh
  npm install @siftystudio/viv-runtime
  ```

* Clone and run an example project:

  ```sh
  npx degit siftystudio/viv/examples/hello-viv-ts my-viv-project  # or hello-viv-js

  cd my-viv-project
  npm install && npm start
  ```

* In your cloned project, try making a few edits to the simple Viv code in `src/content/source.viv`, then recompile and re-run:

  ```sh
  vivc -i src/content/source.viv -o src/content/compiled_content_bundle.json

  npm start
  ```

* Check out the full [Quickstart guide](https://viv.sifty.studio/quickstart/) for information on editor plugins and LLM-augmented authoring, and consult the [language reference](https://viv.sifty.studio/reference/language/) for details on the Viv syntax.


## Packages

| Package | Description                                                                                    | Install |
|---------|------------------------------------------------------------------------------------------------|---------|
| [Compiler](compiler/README.md) | Compiles `.viv` source files into JSON content bundles.                                        | [PyPI][pypi-link] |
| [JavaScript Runtime](runtimes/js/README.md) | Action selection, planning, and story sifting from a content bundle.                           | [npm][npm-link] |
| [JetBrains Plugin](plugins/jetbrains/README.md) | Full-featured IDE support for `.viv` files. This is the recommended tool for writing Viv code. | [JetBrains Marketplace][jetbrains-link] |
| [VS Code Extension](plugins/vscode/README.md) | Editor support for `.viv` files.                                                               | [VS Marketplace][vscode-link] |
| [Sublime Text Package](plugins/sublime/README.md) | Lightweight editor support for `.viv` files.                                                   | [GitHub][sublime-link] |
| [Claude Code Plugin](plugins/claude/README.md) | LLM-powered Viv expertise in your terminal.                                                    | [GitHub][claude-link] |


## Docs

| Resource | Description |
|----------|-------------|
| [Quickstart](https://viv.sifty.studio/quickstart/) | Installation, editor plugins, and LLM-augmented authoring for those that want it. |
| [Introduction](https://viv.sifty.studio/introduction/) | A complete introduction to Viv: features, design philosophy, and an extensive working example. |
| [Language Reference](https://viv.sifty.studio/reference/language/) | A complete specification of the Viv language. |
| [Runtime API Docs](https://viv.sifty.studio/reference/runtimes/js/) | Reference for the JavaScript runtime API. |
| [Viv: A Brief History](https://viv.sifty.studio/background/history-of-viv/) | A short overview of the intellectual and technical backdrop for the Viv project. |
| [*Curating Simulated Storyworlds*](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf) | My PhD thesis, which serves as the intellectual basis for Viv. |


## Example Projects

| Project | Description |
|---------|-------------|
| [hello-viv-ts](examples/hello-viv-ts) | Minimal working example of using Viv in a TypeScript project. |
| [hello-viv-js](examples/hello-viv-js) | Minimal working example of using Viv in a JavaScript project. |


## Monorepo Layout

```
viv/
├── compiler/              Viv compiler (Python)
├── runtimes/
│   └── js/                Viv JavaScript runtime (TypeScript)
├── plugins/
│   ├── vscode/            Viv VS Code extension
│   ├── jetbrains/         Viv JetBrains plugin
│   ├── sublime/           Viv Sublime Text package
│   └── claude/            Viv Claude Code plugin
├── syntax/                TextMate grammar and syntax examples
├── docs/                  Language reference and background material
├── examples/
│   ├── hello-viv-ts/      Minimal TypeScript example project
│   └── hello-viv-js/      Minimal JavaScript example project
├── wizard/                Viv wizard (LLM-powered authoring tool)
│   ├── dapt/              Domain-adaptive pretraining for the Viv wizard (in development)
│   └── tool/              Viv wizard CLI (in development)
└── scripts/               Utility scripts
```


## Contributing

Viv is not currently accepting pull requests. It's a solo project, and at this stage I prefer to maintain full control over the codebase.

That said, bug reports, feature requests, and general feedback are certainly welcome. You can get in touch by filing an issue [here on GitHub](https://github.com/siftystudio/viv/issues), or by sending an email to [hello@sifty.studio](mailto:hello@sifty.studio).


## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). See [LICENSE.txt](LICENSE.txt) for the full details, or visit [sifty.studio/licensing](https://sifty.studio/licensing).

*© 2025-2026 Sifty LLC. All rights reserved.*

[docs-badge]: https://img.shields.io/badge/docs-online-blue?logo=astro&logoColor=white
[docs-link]: https://viv.sifty.studio/quickstart/
[ci-badge]: https://img.shields.io/github/actions/workflow/status/siftystudio/viv/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white
[ci-link]: https://github.com/siftystudio/viv/actions/workflows/ci.yml
[last-release-badge]: https://img.shields.io/github/release-date/siftystudio/viv?label=last%20release&logo=github&logoColor=white
[last-release-link]: https://github.com/siftystudio/viv/releases
[last-commit-badge]: https://img.shields.io/github/last-commit/siftystudio/viv?logo=git&logoColor=white
[last-commit-link]: https://github.com/siftystudio/viv/commits/main
[license-badge]: https://img.shields.io/badge/license-source--available-blue?logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzdjE4Ii8%2BPHBhdGggZD0iTTMgN2w5LTQgOSA0Ii8%2BPHBhdGggZD0iTTMgMTNsMi02aDBsMiA2Ii8%2BPHBhdGggZD0iTTMgMTNoNCIvPjxwYXRoIGQ9Ik0xNyAxM2wyLTZoMGwyIDYiLz48cGF0aCBkPSJNMTcgMTNoNCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMjEiIHI9IjEiLz48L3N2Zz4%3D
[license-link]: https://github.com/siftystudio/viv/blob/main/LICENSE.txt
[pypi-badge]: https://img.shields.io/pypi/v/viv-compiler?logo=python&logoColor=white
[pypi-link]: https://pypi.org/project/viv-compiler/
[npm-badge]: https://img.shields.io/npm/v/%40siftystudio%2Fviv-runtime?logo=npm&logoColor=white
[npm-link]: https://www.npmjs.com/package/@siftystudio/viv-runtime
[jetbrains-badge]: https://img.shields.io/jetbrains/plugin/v/31012?label=jetbrains&logo=jetbrains&logoColor=white
[jetbrains-link]: https://plugins.jetbrains.com/plugin/31012-viv
[vscode-badge]: https://img.shields.io/github/v/release/siftystudio/viv?filter=vscode-v*&label=vs%20code&color=orange&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0yMy4xNSAyLjU5IDE4LjIuMmExLjUgMS41IDAgMCAwLTEuNy4yOUw3LjA0IDkuMTMgMi45MyA2YTEgMSAwIDAgMC0xLjI4LjA2TC4zMyA3LjI2YTEgMSAwIDAgMCAwIDEuNDhMMy45IDEyIC4zMiAxNS4yNmExIDEgMCAwIDAgMCAxLjQ4bDEuMzMgMS4yYTEgMSAwIDAgMCAxLjI4LjA2bDQuMTItMy4xMyA5LjQ2IDguNjNjLjQ0LjQ1IDEuMTMuNTcgMS43LjI5bDQuOTQtMi4zOGMuNTItLjI1Ljg1LS43Ny44NS0xLjM1VjMuOTRjMC0uNTgtLjMzLTEuMS0uODUtMS4zNlpNMTggMTcuNDUgMTAuODIgMTIgMTggNi41NXYxMC45WiIvPjwvc3ZnPg%3D%3D
[vscode-link]: https://marketplace.visualstudio.com/items?itemName=siftystudio.viv
[sublime-badge]: https://img.shields.io/github/v/release/siftystudio/viv?filter=sublime-v*&label=sublime%20text&color=orange&logo=sublimetext&logoColor=white
[sublime-link]: https://github.com/siftystudio/viv/blob/main/plugins/sublime/README.md#getting-started
[claude-badge]: https://img.shields.io/github/v/release/siftystudio/viv?filter=claude-v*&label=claude%20code&color=orange&logo=claude&logoColor=white
[claude-link]: https://github.com/siftystudio/viv/blob/main/plugins/claude/README.md#getting-started
