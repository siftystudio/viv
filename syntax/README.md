# Viv Syntax

This directory contains the [TextMate grammar](https://macromates.com/manual/en/language_grammars) for the Viv DSL (`viv.tmLanguage.json`), along with example Viv source files that exercise the syntax to enable evaluation of a color theme for syntax highlighting.

## TextMate grammar

The TextMate grammar is a shared artifact backing the [Viv VS Code extension](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv) and also syntax highlighting for Viv code blocks in our docs.

(The [Viv Sublime Text package](../plugins/sublime/README.md) uses its own `.sublime-syntax` file, which supports additional features that are not possible to define in the more limited TextMate notation. The [Viv JetBrains plugin](https://plugins.jetbrains.com/plugin/31012-viv) uses a native JFlex lexer and PSI-based annotator for syntax highlighting, providing full coloring in any JetBrains theme.)

## Syntax highlighting in your own docs

If you're writing documentation that includes Viv code examples, you can register our TextMate grammar as a custom language to get syntax highlighting for ` ```viv `–fenced code blocks.

Many documentation tools and static-site generators use [Shiki](https://shiki.style/) for syntax highlighting, and Shiki can load TextMate grammars directly. See Shiki's guide on [loading custom languages](https://shiki.style/guide/load-lang) for details. For a working example, see our [config](../docs/astro.config.mjs) for the Viv docs site, which registers the Viv TextMate grammar with [Starlight](https://starlight.astro.build/).

## Editor plugins

Among other features, the Viv editor plugins ([JetBrains](https://plugins.jetbrains.com/plugin/31012-viv), [VS Code](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv), [Sublime Text](../plugins/sublime/README.md)) provide syntax highlighting for Viv (`.viv`) files.

## Changelog

Any changes to the TextMate grammar will be reported in the [Viv VS Code extension changelog](../plugins/vscode/CHANGELOG.md).
