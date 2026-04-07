---
title: Quickstart
---

> *Note that currently there is a single Viv runtime, aimed at JavaScript (and TypeScript) codebases. If you can't run JavaScript in your project, you likely won't be able to use Viv right now. A C# runtime tailored for Unity projects is planned.*



Alright, let's get started. First, make sure you're up to date with the [requirements](#requirements). And then you can choose your own adventure:

*☞ [I do not use LLMs](#i-do-not-use-llms)*

*☞ [I do use LLMs](#i-do-use-llms)*

## Requirements

* Python 3.11+ (for the Viv compiler)
* Node.js 16+ (for the Viv JavaScript runtime)

## I do not use LLMs

Great, your Viv experience will be entirely LLM-free. It's a symbolic AI system, after all.

* Install the <a href="https://pypi.org/project/viv-compiler" target="_blank">Viv compiler</a>:

   ```sh
   pip install viv-compiler
   ```

* Install the <a href="https://www.npmjs.com/package/@siftystudio/viv-runtime" target="_blank">Viv JavaScript runtime</a>:

   ```sh
   npm install @siftystudio/viv-runtime
   ```

* Install the editor plugin of your choice:

   - The <a href="https://plugins.jetbrains.com/plugin/31012-viv" target="_blank">Viv JetBrains plugin</a> is the default tool for authoring Viv code. Assuming your larger codebase is primarily JavaScript or TypeScript, you can use the <a href="https://www.jetbrains.com/webstorm" target="_blank">WebStorm</a> IDE, with our plugin exposing rich features for `.viv` files.
   - For more lightweight alternatives, there is also the <a href="https://marketplace.visualstudio.com/items?itemName=siftystudio.viv" target="_blank">Viv VS Code extension</a> and the <a href="https://github.com/siftystudio/viv/blob/main/plugins/sublime/README.md" target="_blank">Viv Sublime Text package</a>.

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

* Consult the [language reference](/docs/language-reference/00-preamble/) for details on the Viv syntax, and start cooking up some constructs of your own!

   * If you're using the Viv JetBrains plugin, you can get an interactive tutorial by pasting any Viv code (from the docs or another source) into your IDE and hovering over the keywords and other code.



## I do use LLMs

Unless you have ethical qualms surrounding LLM usage—and certainly such qualms have merit—the recommended interface between you and all things Viv is the <a href="https://github.com/siftystudio/viv/tree/main/plugins/claude" target="_blank">Viv Claude Code plugin</a>.

The plugin's custom skills turn Claude into a Viv expert (with a copy of this monorepo) that can facilitate installation, building, debugging, and most pertinently, authoring. Even if you don't want an LLM touching your content or code, this plugin can be an immense help for learning the system. It's like having me in your terminal.

* Install <a href="https://code.claude.com/docs/en/quickstart" target="_blank">Claude Code</a>.

* In your terminal, boot up Claude Code: `claude`.

* In the Claude Code session, install the Viv Claude Code plugin:
   * `/plugin marketplace add siftystudio/claude-plugins`
   
   * `/plugin install viv@siftystudio`
   
* Start using the plugin:

   - `cd` into the project where you intend to use Viv.
   - Boot up Claude Code there: `claude`.
   - Run the special setup skill: `/viv:setup`.
   - Claude Code will handle all installation and setup for you, and it will give you a tour of the Viv plugin (and the larger Viv project).

* Now Claude Code will have deep Viv expertise any time you invoke it from your project directory, and there will also be a suite of Viv-specific Claude Code skills available there. See the <a href="https://github.com/siftystudio/viv/blob/main/plugins/claude/README.md" target="_blank">plugin documentation</a> for more information (or just ask Claude).
