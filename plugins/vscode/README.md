# Viv

Welcome to the VS Code extension for [**Viv**](https://viv.sifty.studio), an engine for **emergent narrative** in games and simulations.

The Viv project centers on a rich domain-specific language (DSL) that authors use to define the **actions** that characters can take in a simulated storyworld, along with material that enables **story sifting**—the task of automatically identifying stories that emerge as the simulation proceeds.

*For a more robust alternative, try the [Viv JetBrains plugin](https://plugins.jetbrains.com/plugin/31012-viv), and for a lightweight alternative, check out the [Viv Sublime Text package](https://github.com/siftystudio/viv/blob/main/plugins/sublime/README.md).*

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Color Themes](#color-themes)
- [Compiler Integration](#compiler-integration)
- [Boilerplate Snippets](#boilerplate-snippets)
- [Extension Settings](#extension-settings)
- [Updates](#updates)
- [Compatibility](#compatibility)
- [Installing a Specific Release](#installing-a-specific-release)
- [Changelog](#changelog)
- [Security and Privacy](#security-and-privacy)
- [License](#license)

## Features

* **Compiler integration.**
  - Compile Viv code directly from the editor, with inline error diagnostics, content summary statistics, and more.
  - See [Compiler Integration](#compiler-integration) for details.
* **Syntax highlighting.**
  - Activates automatically for `.viv` files. For best results, use one of the bundled Viv color themes (see [Color Themes](#color-themes)).
* **Boilerplate snippets.**
  - Type a keyword like `action` or `plan` and select it from the autocomplete pop-up to expand into a full template with tab-navigable placeholder elements.
  - See [Boilerplate Snippets](#boilerplate-snippets) for a full list of available triggers.
* **Comment toggling.**
  - Toggle line comments (`//`) with `Cmd+/` / `Ctrl+/`.
* **Auto-indentation.**
  - Indentation is managed automatically as you type.
* **Bracket matching.**
  - Brackets, parentheses, and quotes auto-close and auto-surround.

## Getting Started

* Install [the extension](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv).
  * To install a specific version, see [Installing a Specific Release](#installing-a-specific-release).
* Install the [Viv compiler](https://pypi.org/project/viv-compiler): `pip install viv-compiler`.
  * If the compiler is not detected, because VS Code is using a different Python interpreter, the extension will offer to install it for you automatically (in its associated Python).
* Create or open a `.viv` file. Syntax highlighting should activate automatically.
* **Important:** Open the `Output` tab of the panel (`Cmd+Shift+U` / `Ctrl+Shift+U`) and select `Viv` from the dropdown.
* Choose a Viv color theme (see [Color Themes](#color-themes)).

## Color Themes

While any VS Code theme will color the Viv syntax, certain semantic distinctions may be collapsed. Instead, we recommend using one of the bundled color themes designed specifically for Viv. Note that selecting a Viv theme will replace your current VS Code theme globally. Specifically, non-Viv files will be styled using VS Code's default dark or light colors, depending on the variant you choose.

Here are the current themes, all of which come bundled with the Viv VS Code extension:

| Theme | Dark Variant | Light Variant | Description |
|-------|---------------|----------------|-------------|
| Viv Warm | x             | x              | Earthy and rich. |
| Viv Cool | x             | x              | Calm and restrained. |
| Viv Electric | x             | x              | Bold and saturated. |

To select a theme:

* In VS Code, open `theme-preview.viv`, which is available [here](https://github.com/siftystudio/viv/blob/main/syntax/examples/theme-preview.viv).
  * This Viv example file showcases syntax highlighting by employing a variety of language features, making it suitable for evaluating color themes.

* Press `Cmd+K Cmd+T` (`Ctrl+K Ctrl+T` on Windows/Linux) to open the Color Theme picker.

* Search for `viv` and choose one of the Viv themes from the list.

* The new theme should immediately take effect, allowing you to quickly toggle through all of them before settling on the one you like best.

## Compiler Integration

The Viv VS Code extension integrates with the [Viv compiler](https://viv.sifty.studio/reference/compiler/) to afford the following compilation actions, directly from the editor, assuming the compiler is installed and accessible to VS Code (see [Getting Started](#getting-started)).

### Compile Check

To compile a `.viv` file, just open it and save it (`Cmd+S` / `Ctrl+S`)—on every save, the extension automatically compiles the active file if it has the `.viv` extension. You can also compile manually with `Cmd+R` / `Ctrl+R`, or by clicking the play button at the top right of the editor.

A compile check *does not* write out the resulting content bundle (see [Save Content Bundle](#save-content-bundle)), but it does indicate the compilation result:

* If compilation succeeds, a green checkmark appears in the status bar at the bottom of the editor.
  * Additionally, a summary of all compiled constructs is written to the `Output` panel tab. This lists every action, selector, plan, query, sifting pattern, and trope included in the content bundle, grouped by type.

* If compilation fails, a red error indicator appears in the status bar.
  * Additionally, the error message appears in the `Problems` panel tab, and the offending code is underlined in the editor (in cases where information is available about the offending source code).

This is intended as a fast feedback loop while authoring—use it frequently to catch errors as you write.

To disable automatic compilation on save, set `viv.compileOnSave` to `false` in your [extension settings](#extension-settings). You can still compile manually with `Cmd+R` / `Ctrl+R` or the play button.

If the compiler takes longer than expected, the process will be terminated after a configurable timeout (default: 120 seconds). This can be adjusted via the `viv.compileTimeout` [extension setting](#extension-settings).

### Save Content Bundle

To compile your project's **entry file** and write the resulting **content bundle** to disk, run the `Build` command (`Cmd+Shift+B`  / `Ctrl+Shift+B`). In Viv parlance, the entry file is the one you submit directly to the compiler to produce a content bundle for your project. In addition to saving the content bundle, the compilation result will also be presented just like in a [Compile Check](#compile-check).

The first time you use this command, the extension will prompt you to select your entry file, as well as the location to which to write the content bundle. These selections are saved to your workspace settings and reused on subsequent builds, with the idea being that a Viv project will tend to have a single entry file and a single content-bundle location.

To change the entry file and/or content bundle later on, edit `viv.entryFile` and `viv.outputPath` in your [extension settings](#extension-settings). You can just delete the values in these fields, and then do `Cmd+Shift+B` / `Ctrl+Shift+B` to trigger the menu-based selection again.

*Note: It's not necessary to navigate to your entry file before running this command, since that information is part of the project configuration—but you do need to be viewing a `.viv` file for the keyboard shortcut to work. Alternatively, the command can be invoked from the Command Palette at any time.*

## Boilerplate Snippets

The extension ships with a set of **boilerplate snippets** that expand common Viv keyphrases into full templates.

To use a snippet, type its **trigger** in your `.viv` file and then select the target snippet from the autocompletion pop-up. The snippet will expand with placeholder elements, which you can tab through to fill in. Let us know if you have feedback on this feature.

### Construct definitions

These snippets expand into top-level **construct definitions**, complete with a roles section and other optional scaffolding appropriate to the construct type.

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

These snippets expand into sections and other fields that appear within construct definitions.

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

## Extension Settings

The following configuration parameters for the Viv VS Code extension can be configured in your [VS Code settings](https://code.visualstudio.com/docs/getstarted/settings). To view and/or edit your extension settings, use the keyboard shortcut `Cmd+,` / `Ctrl+,` and search for `viv`.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `viv.pythonPath` | `string` | N/A | Path to a Python interpreter with `viv-compiler` installed. Defaults to the active interpreter from the Python extension, if any, else `python3`. Only configurable in user settings, not workspace settings. |
| `viv.compileOnSave` | `boolean` | `true` | Automatically compile `.viv` files on save. When disabled, use the play button or `Cmd+R` / `Ctrl+R` to compile manually. |
| `viv.compileTimeout` | `number` | `120` | Maximum time (in seconds) to wait for compilation to finish before terminating the process. |
| `viv.entryFile` | `string` | N/A | Path to the Viv entry file for the project-wide content bundle. Configured via pop-up menu on first use of `Cmd+Shift+B` / `Ctrl+Shift+B`. |
| `viv.outputPath` | `string` | N/A | Path to the project-wide content bundle output file. Configured via pop-up menu on first use of `Cmd+Shift+B` / `Ctrl+Shift+B`. |

## Updates

VS Code will automatically check for extension updates. When a new version is released, it will be installed automatically or you will be prompted to update, depending on your VS Code settings.

## Compatibility

Each release of this extension is built for a specific version of the Viv compiler, and if the installed compiler version doesn't match what the extension expects, syntax highlighting and/or compiler integration may be affected. Whenever there is a discrepancy, the `Problems` panel tab will display a warning upon any compilation action.

If the installed compiler version is **older** than expected, the extension will offer to update it for you automatically (in its associated Python).

If the installed compiler version is **newer** than expected, you need to update your Viv VS Code extension to the latest version.

## Installing a Specific Release

You can also install a specific version of the plugin, for instance to use an older version.

* Download the `.vsix` file attached to the pertinent [GitHub release](https://github.com/siftystudio/viv/releases).
* Run `code --install-extension <file>.vsix`.

## Changelog

See the [changelog](https://marketplace.visualstudio.com/items/siftystudio.viv/changelog) for a history of changes to this extension.

## Security and Privacy

The Viv VS Code extension runs entirely on your machine. It collects no telemetry, makes no analytics calls, and sends no data to any third party. If you discover a security vulnerability in the extension, please report it using the protocol described in the [Viv security policy](https://github.com/siftystudio/viv/blob/main/.github/SECURITY.md).

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out the [license](https://marketplace.visualstudio.com/items/siftystudio.viv/license) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
