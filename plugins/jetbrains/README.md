# Viv

Welcome to the **JetBrains plugin** for [**Viv**](https://viv.sifty.studio), an engine for emergent narrative in games and simulations.

As the **default tool** for writing Viv code, this plugin provides a rich set of language-support features, such as syntax highlighting, code navigation, inline rename refactoring, hover documentation, and compiler integration.

It works in all IntelliJ-based IDEs: [WebStorm](https://www.jetbrains.com/webstorm/), [PyCharm](https://www.jetbrains.com/pycharm/), [IntelliJ IDEA](https://www.jetbrains.com/idea/), [CLion](https://www.jetbrains.com/clion/), [GoLand](https://www.jetbrains.com/go/), [Rider](https://www.jetbrains.com/rider/), and [more](https://www.jetbrains.com/products/?type=ide).

*For lightweight alternatives, see the [Viv VS Code extension](https://github.com/siftystudio/viv/blob/main/plugins/vscode/README.md) and the [Viv Sublime Text package](https://github.com/siftystudio/viv/blob/main/plugins/sublime/README.md).*

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Color Themes](#color-themes)
- [Compiler Integration](#compiler-integration)
- [Boilerplate Snippets](#boilerplate-snippets)
- [Plugin Settings](#plugin-settings)
- [Updates](#updates)
- [Compatibility](#compatibility)
- [Troubleshooting](#troubleshooting)
- [Installing a Specific Release](#installing-a-specific-release)
- [Building from Source](#building-from-source)
- [Changelog](#changelog)
- [Security and Privacy](#security-and-privacy)
- [License](#license)

## Features

* **Syntax highlighting.**
  - Activates automatically for `.viv` files. Provides full syntax coloring in any JetBrains theme (Darcula, IntelliJ Light, etc.) with no configuration needed. For a curated look, try one of the six bundled Viv color themes (see [Color Themes](#color-themes)).
* **Compiler integration.**
  - Compile Viv code directly from the editor, with inline error diagnostics, content summary statistics, and more.
  - See [Compiler Integration](#compiler-integration) for details.
* **Live inline diagnostics.**
  - References to undefined constructs, duplicate definitions, and more statically detectable issues are visually flagged without running the compiler.
* **Go to declaration.**
  - Navigate from any identifier to its declaration with a keyboard shortcut (`Cmd+Click` / `Ctrl+Click`). Roles resolve through the inheritance chain, so clicking `@initiator` in a child action navigates to its original declaration in the action from which it was inherited.
* **Find usages.**
  - Use that same keyboard shortcut (`Cmd+Click` / `Ctrl+Click`) on an identifier at its declaration site to view a popup menu with clickable snippets showing all its usage sites across your project files. Again, the inheritance chain is navigated for roles.
* **Rename refactoring.**
  - Rename all usages of any Viv identifier across its scope—even if that spans multiple project files—in one fell swoop (right-click > `Rename...`).
* **Autocompletion.**
  - Context-aware autocompletion for construct names, roles (including inherited roles), variables, enums, custom functions, and selector candidates. Triggers automatically on sigil characters and in the associated contexts for identifiers without sigils. For instance, typing `queue action ` will produce a dropdown menu containing the names of all actions defined across the profile files.
* **Boilerplate snippets.**
  - Type a keyword like `action` or `plan` and select it from the autocomplete pop-up to expand into a full template with tab-navigable placeholder elements.
  - See [Boilerplate Snippets](#boilerplate-snippets) for a full list of available triggers.
* **Hover documentation.**
  - Structured popups for every type, triggered by hover on an identifier of that type. Popup content includes clickable cross-reference links that chain to other popups. Grok a construct referenced from another file without opening that file.
* **Keyword tooltips.**
  - Hover over any Viv keyword—`reserved`, `conditions:`, `embargo:`, `from`, `@`, `#`, and 150+ more—to see a brief explanation of what it means. The full set covers the entire language, making it possible to open an example file and hover your way through it for an interactive Viv tutorial that is fully baked into the IDE.
* **Highlight usages.**
  - Click on any identifier to highlight all occurrences in its scope. This works for any identifier, from construct names to local variables. If you right-click > `Rename...` one of them, all of the highlighted instances will update too.
* **Block keyword matching.**
  - Click on `if`, `elif`, `else`, or `end` to highlight all related keywords in the same block. Also works for `loop`/`end`, `for`/`end`, and reaction windows (`all`/`any`/`untracked`/`close`). In plans, clicking the plan name or a phase name highlights all control-flow keywords used inside it ( `succeed`, `fail`, etc.).
* **Inheritance indicators.**
  - Child actions display a clickable gutter icon that navigates to the parent definition.
* **Structure view.**
  - The `Structure` tool window shows outlines for all construct definitions in the current file.
* **Breadcrumbs.**
  - Editor scope path shows the current construct, section, and subsection (e.g., `action greet > roles > @greeter` or `plan heist > phases > >execution`).
* **Code folding.**
  - Collapse and expand code blocks to focus on the structure. You can fold all constructs (`Cmd+Shift+{-/+}` / `Ctrl+Shift+{-/+}`) or just the current block (`Cmd+{-/+}` / `Ctrl+{-/+}`).
* **Comment toggling.**
  - Toggle line comments (`//`) with `Cmd+/` / `Ctrl+/`.
* **Auto-indentation.**
  - Indentation is managed automatically as you type.
* **Bracket matching.**
  - Brackets, parentheses, and quotes auto-close and auto-surround.
* **And much more...**
  - All standard JetBrains IDE features work with Viv files: bookmarks, local history, search everywhere, TODO tracking, version control annotations, and more.

## Getting Started

* Install the [JetBrains IDE](https://www.jetbrains.com/products/?type=ide) of your choice.
  * If you're using the Viv JavaScript runtime, the natural choice is [WebStorm](https://www.jetbrains.com/webstorm/).
* Install the [Viv plugin](https://plugins.jetbrains.com/plugin/31012-viv).
  * In your JetBrains IDE, navigate to `Settings > Plugins`, search for `Viv`, and click `Install`.
  * To install a specific older version, see [Installing a Specific Release](#installing-a-specific-release).
  
* Install the [Viv compiler](https://pypi.org/project/viv-compiler), or **let the plugin do it for you**.
  * If the compiler is not detected, the plugin will offer to install it for you automatically via a notification prompt.
  * If the compiler is installed but the plugin can't find it, see [Troubleshooting](#troubleshooting).
* Create or open a `.viv` file. Syntax highlighting should activate automatically.

## Color Themes

The plugin provides native syntax highlighting that works with any JetBrains theme out of the box. In Darcula, IntelliJ Light, or any third-party theme, Viv code is fully colored—keywords, strings, comments, roles, enums, and more are all styled using your theme's standard language colors.

But for a more curated Viv-centric experience, the plugin also bundles six **color themes** designed specifically for the language, with fine-grained distinctions (e.g., separate colors for entity roles vs. symbol roles, section keywords vs. control-flow keywords). 

| Theme | Dark Variant | Light Variant | Description |
|-------|---------------|----------------|-------------|
| Viv Warm | x             | x              | Earthy and rich. |
| Viv Cool | x             | x              | Calm and restrained. |
| Viv Electric | x             | x              | Bold and saturated. |

To select a theme:

* *Note that selecting a Viv theme will replace your current IDE theme globally.*
  
* In your JetBrains IDE, open `theme-preview.viv`, which is available [here](https://github.com/siftystudio/viv/blob/main/syntax/examples/theme-preview.viv).
  * This Viv example file showcases syntax highlighting by employing a variety of language features, making it suitable for evaluating color themes.

* Open `Settings > Editor > Color Scheme` and select one of the Viv themes from the dropdown.

* The selected theme should immediately take effect, allowing you to quickly toggle through all of them before settling on the one you like best.

## Compiler Integration

The Viv JetBrains plugin integrates with the [Viv compiler](https://viv.sifty.studio/reference/compiler/) to afford the following compilation actions, directly from the editor, assuming the compiler is installed and accessible (see [Getting Started](#getting-started)). All compilation is routed through IntelliJ's `Run` system—the same play button and `Run` tool window that JetBrains users already know.

### Compile Check

To compile a `.viv` file, just open it and save it (`Cmd+S` / `Ctrl+S`)—on every save, the plugin automatically compiles the active file if it has the `.viv` extension. You can also compile manually with the `Run` action (`Ctrl+R` on macOS / `Shift+F10` on Windows/Linux), or by clicking the play button in the toolbar.

A compile check *does not* write out the resulting content bundle (see [Save Content Bundle](#save-content-bundle)), but it does indicate the compilation result:

* If compilation **succeeds**, a green checkmark icon appears in the status bar at the bottom of the editor.
  * Additionally, a summary of all compiled constructs is written to the `Run` tool window.

* If compilation **fails**, a red error icon appears in the status bar.
  * Additionally, the error message appears in the `Run` tool window with the offending source code, and the offending code is underlined in the editor (in cases where information is available about the offending source code).

This is intended as a fast feedback loop while authoring—use it frequently to catch errors as you write.

To disable automatic compilation on save, uncheck `Automatically recompile .viv files on save` in your [plugin settings](#plugin-settings). You can still compile manually with the `Run` action or the play button.

If the compiler takes longer than expected, the process will be terminated after a configurable timeout (default: 120 seconds). This can be adjusted via the `Compiler timeout` [plugin setting](#plugin-settings).

### Save Content Bundle

To compile your project's entry file and write the resulting content bundle to disk, select `Save Content Bundle` from the run configuration dropdown next to the play button in the toolbar. In Viv parlance, the **entry file** is the one you submit directly to the compiler to produce a **content bundle** for your project. In addition to saving the content bundle, the compilation result will also be presented just like in a [Compile Check](#compile-check).

The first time you use this command, you will need to configure the entry file and output path. Select `Save Content Bundle` from the run configuration dropdown, then press the play button in the toolbar, which will cause a configuration menu to pop up. Now select your entry file and your content-bundle location. These selections are saved to your project and reused on subsequent builds, with the idea being that a Viv project will tend to have a single entry file and a single content-bundle location.

To change the entry file and/or content bundle later on, select `Save Content Bundle` from the dropdown, click `Edit Configurations`, and update the paths.

*Note: It's not necessary to navigate to your entry file before running this command, since that information is part of the run configuration.*

## Boilerplate Snippets

The plugin ships with a set of boilerplate snippets ([JetBrains Live Templates](https://www.jetbrains.com/help/idea/using-live-templates.html)) that expand common Viv keyphrases into full templates.

To use a snippet, type its **trigger** (from the tables below) in your `.viv` file and then select the target snippet from the autocompletion pop-up. The snippet will expand with placeholder elements, which you can tab through to fill in. Let us know if you have feedback on this feature.

### Construct definitions

| Trigger | Description |
|---------|-------------|
| `action` | Action definition with roles, conditions, and effects. |
| `action from` | Child action that inherits from a parent. |
| `action variant` | Named variation on a parent action. |
| `template action` | Action template. |
| `reserved action` | Reserved action definition. |
| `action-selector` | Action-selector definition. |
| `plan-selector` | Plan-selector definition. |
| `plan` | Plan definition. |
| `query` | Query definition. |
| `pattern` | Sifting-pattern definition. |
| `trope` | Trope definition. |

### Sections and fields

| Trigger | Description |
|---------|-------------|
| `roles` | Roles section with initiator and recipient. |
| `conditions` | Conditions section. |
| `effects` | Effects section. |
| `scratch` | Scratch section with a variable declaration. |
| `phases` | Phases section with a named phase. |
| `reactions` | Reactions section with a queued action. |
| `embargoes` | Embargoes section. |
| `embargo` | A single embargo entry. |
| `saliences` | Saliences section with a default value. |
| `saliences for` | Saliences section with a custom per-character field. |
| `associations` | Associations section with a default value. |
| `associations for` | Associations section with a custom per-character field. |
| `gloss` | Gloss field. |
| `report` | Report field. |
| `importance` | Importance field. |
| `tags` | Tags field. |

### Reactions and plan instructions

| Trigger | Description |
|---------|-------------|
| `queue action` | Queue an action as a reaction. |
| `queue plan` | Queue a plan as a reaction. |
| `queue action-selector` | Queue an action selector as a reaction. |
| `queue plan-selector` | Queue a plan selector as a reaction. |
| `repeat` | Repeat field for a reaction. |
| `wait` | Wait instruction for a plan phase. |
| `all` | Reaction window requiring all reactions to resolve. |
| `any` | Reaction window requiring any reaction to resolve. |
| `untracked` | Untracked reaction window. |

### Selector policies

| Trigger | Description |
|---------|-------------|
| `target randomly` | Selector candidates with randomized policy. |
| `target with weights` | Selector candidates with weighted-random policy. |
| `target in order` | Selector candidates with ordered policy. |

### Temporal constraints

| Trigger | Description |
|---------|-------------|
| `time` | Temporal-constraint block. |
| `after` | Temporal-constraint block (`after`). |
| `before` | Temporal-constraint block (`before`). |
| `between` | Temporal-constraint block (`between`). |

### Expressions and control flow

| Trigger | Description |
|---------|-------------|
| `search query` | Query search over the chronicle or a character's memories. |
| `search` | Bare search over the chronicle or a character's memories. |
| `sift` | Run a sifting pattern. |
| `fit trope` | Fit a trope with role bindings. |
| `fits` | Fit a trope with sugared (inlined) role bindings. |
| `~` | Custom function call. |
| `if` | Conditional (`if`). |
| `if else` | Conditional (`if` / `else`). |
| `loop` | Loop. |

### Other

| Trigger | Description |
|---------|-------------|
| `include` | Include statement. |

## Plugin Settings

The following **configuration** parameters can be configured in `Settings > Tools > Viv`.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Python interpreter | `string` | N/A | Path to a Python interpreter with `viv-compiler` installed. Defaults to `python3`. If the plugin cannot detect the compiler, it will prompt you to allow it to install it for you. |
| Automatically recompile | `boolean` | `true` | Automatically recompile `.viv` files on save. When disabled, use the play button or the `Run` action (`Ctrl+R` / `Shift+F10`) to compile manually. |
| Compiler timeout | `number` | `120` | Maximum time (in seconds) to wait for compilation to finish before terminating the process. |

Project-level settings (entry file and output path for content bundle export) are configured via the `Save Content Bundle` run configuration. See [Save Content Bundle](#save-content-bundle) for details.

## Updates

JetBrains IDEs will automatically check for plugin updates. When a new version is released, it will be installed automatically or you will be prompted to update, depending on your IDE settings.

## Compatibility

Each release of this plugin is built for a specific version of the Viv compiler, and if the installed compiler version doesn't match what the plugin expects, syntax highlighting and/or compiler integration may be affected. Whenever there is a discrepancy, a warning will appear in the compilation output.

If the installed compiler version is **older** than expected, the plugin will offer to update it for you automatically via a notification prompt.

If the installed compiler version is **newer** than expected, you need to update your Viv JetBrains plugin to the latest version.

## Troubleshooting

The plugin normally auto-detects an installed `viv-compiler` and adopts the right Python interpreter on its own. If it doesn't, or if you want to point it at a specific interpreter yourself:

* Run `vivc --version` in a shell.
   - If this command doesn't work, you may have installed the compiler in a virtual environment that is not activated, or you may need to to [reinstall the compiler](https://viv.sifty.studio/reference/compiler).
* Copy the path from the `python` line of the output.
* Paste it as as your `Python interpreter` setting (in `Settings > Tools > Viv`).

If you're still stuck, you might consider trying out the [Viv Claude Code plugin](https://github.com/siftystudio/viv/tree/main/plugins/claude). With our plugin installed, Claude will be able to help you get up and running here.

## Installing a Specific Release

You can also install a specific version of the plugin, for instance to use an older version.

* Download the `.zip` file attached to the pertinent [GitHub release](https://github.com/siftystudio/viv/releases).
* In your JetBrains IDE, go to `Settings > Plugins`, click the gear icon, and choose `Install Plugin from Disk...`.
* Select the downloaded `.zip` file.
* Restart when prompted.

## Building from Source

This requires JDK 21 or later.

```sh
./gradlew buildPlugin        # Build the plugin ZIP
./gradlew runIde             # Launch a sandboxed IDE with the plugin
./gradlew test               # Run the test suite
./gradlew verifyPlugin       # Run plugin verification
```

The built plugin ZIP is at `build/distributions/`.

## Changelog

See the [changelog](CHANGELOG.md) for a history of changes to this plugin.

## Security and Privacy

The Viv JetBrains plugin runs entirely on your machine. It collects no telemetry, makes no analytics calls, and sends no data to any third party. If you discover a security vulnerability in the plugin, please report it using the protocol described in the [Viv security policy](https://github.com/siftystudio/viv/blob/main/.github/SECURITY.md).

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out the [license](LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
