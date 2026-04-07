# Viv Monorepo

Welcome to the monorepo for **Viv**, an engine for **emergent narrative** in games and simulations.

In *emergent narrative*, stories arise from the bottom up, as characters take action in a simulated storyworld, rather than being authored from the top down. Viv offers practitioners of this approach a custom programming language that allows rich specifications of character actions, as well as material for *story sifting*—the task of identifying emergent storylines in a given simulation instance, such as a videogame playthrough.

If you're new to Viv, check out the [**homepage**](https://viv.sifty.studio) for a proper introduction.

Viv is a **source-available project**, which means that:

* Anyone can view its full codebase (which lives here in this monorepo).
* Non-commercial use is freely permitted. 
* Commercial use requires a [license](#license).

Below, you'll find a barebones overview of the project, mostly taking the form of links to the published packages and to various docs. The [monorepo layout](#monorepo-layout) section also provides a high-level map of the codebase, for folks who want to explore around in there.


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
* Node.js 16+ (for the Viv JavaScript runtime)


## Quickstart

*Note that currently there is a single Viv runtime, aimed at JavaScript (and TypeScript) codebases. If you can’t run JavaScript in your project, you likely won’t be able to use Viv right now. A C# runtime tailored for Unity projects is planned.*

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

| Package | Description | Registry |
|---------|-------------|----------|
| Viv Compiler | Compiles `.viv` source files into JSON content bundles. | [PyPI](https://pypi.org/project/viv-compiler/) |
| Viv JavaScript Runtime | Action selection, planning, and story sifting from a content bundle. | [npm](https://www.npmjs.com/package/@siftystudio/viv-runtime) |
| Viv JetBrains Plugin | Full-featured IDE support for `.viv` files. This is the default tool for writing Viv code. | [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/31012-viv) |
| Viv VS Code Extension | Editor support for `.viv` files. | [VS Marketplace](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv) |
| Viv Sublime Text Package | Lightweight editor support for `.viv` files. | [GitHub](https://github.com/siftystudio/viv/tree/main/plugins/sublime) |
| Viv Claude Code Plugin | LLM-powered Viv expertise in your terminal. | [GitHub](https://github.com/siftystudio/viv/tree/main/plugins/claude) |


## Docs

| Resource                                                     | Description                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [Quickstart](https://viv.sifty.studio/quickstart/)      | Installation, editor plugins, and LLM-augmented authoring for those that want it. |
| [Introduction](https://viv.sifty.studio/introduction/)  | A complete introduction to Viv: features, design philosophy, and an extensive working example. |
| [Language Reference](https://viv.sifty.studio/reference/language/) | A complete specification of the Viv language.                |
| [Runtime API Docs](https://viv.sifty.studio/reference/runtimes/js/) | Reference for the JavaScript runtime API.                    |
| [Viv: A Brief History](https://viv.sifty.studio/background/history-of-viv/) | A short overview of the intellectual and technical backdrop for the Viv project. |
| [*Curating Simulated Storyworlds*](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf) | My PhD thesis, which serves as the intellectual basis for Viv. |


## Example Projects

| Project | Description |
|---------|-------------|
| [hello-viv-ts](examples/hello-viv-ts/) | Minimal working example of using Viv in a TypeScript project. |
| [hello-viv-js](examples/hello-viv-js/) | Minimal working example of using Viv in a JavaScript project. |


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
