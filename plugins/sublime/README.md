# Viv Sublime Text Package

`Viv` is the [Sublime Text](https://www.sublimetext.com) package for [**Viv**](https://viv.sifty.studio), an engine for **emergent narrative** in games and simulations.

The Viv project centers on a rich DSL that authors use to define the **actions** that characters can take in a simulated storyworld, along with constructs that drive **story sifting**—the task of automatically identifying stories that emerge as the simulation proceeds.

This package is a lightweight **editor plugin** for the project, providing various forms of language support for the Viv DSL. It's a good tool for quickly viewing or editing Viv code without the overhead of firing up an IDE.

*For more robust alternatives, try the [JetBrains plugin](https://plugins.jetbrains.com/plugin/31012-viv) (recommended) or the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv).*


## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Color Schemes](#color-schemes)
- [Compiler Integration](#compiler-integration)
- [Boilerplate Snippets](#boilerplate-snippets)
- [Updates](#updates)
- [Compatibility](#compatibility)
- [Troubleshooting](#troubleshooting)
- [Installing a Specific Release](#installing-a-specific-release)
- [Changelog](#changelog)
- [Security and Privacy](#security-and-privacy)
- [License](#license)


## Features

* **Compiler integration.**
  - Compile Viv source files directly from the editor, with errors displayed in the build-results panel.
  - See [Compiler Integration](#compiler-integration) for details.
* **Syntax highlighting.**
  - Syntax highlighting activates automatically for any `.viv` file once the package is installed. Keywords, names, references, literals, operators, and other tokens are stylized to reflect their respective purposes in the language.
* **Boilerplate snippets.**
  - Type a keyword like `action` or `plan` and select it from the autocomplete pop-up to expand into a full template with tab-navigable placeholder elements.
  - See [Boilerplate Snippets](#boilerplate-snippets) for details.
* **Autocompletion.**
  - Sublime will have awareness of Viv keywords and will suggest them as completions, along with your own tokens that you frequently use in a file.
* **Auto-indentation.**
  - Indentation is managed automatically as you type.


## Requirements

* Sublime Text 3 (Build `3149`+) or Sublime Text 4.
* Python 3.11+ (for compiler integration).


## Getting Started

* Install [Package Control](https://packagecontrol.io/installation), the Sublime Text package manager.
  * macOS users: if you don't see `Package Control:` commands in the command palette after restarting Sublime Text, see [Troubleshooting](#package-control-commands-dont-appear-macos).

* In Sublime Text, open the *command palette* (`Cmd+Shift+P` / `Ctrl+Shift+P`).

* Search for `Package Control: Install Package` and select it.

* Search for `Viv`, and install the package.
  * If Viv doesn't appear in the search results, see [Troubleshooting](#viv-doesnt-appear-in-package-control-install-package-results).
  * To install a specific version, see [Installing a Specific Release](#installing-a-specific-release).

* Install the [Viv compiler](https://pypi.org/project/viv-compiler): `pip install viv-compiler`.
  * On macOS and Linux, the compiler must be accessible via `python3`. On Windows, it must be accessible via `py -3` (the Python launcher). If you installed the compiler into a virtual environment, you will need to ensure that the interpreter invoked by Sublime Text can find it.
  * If you get stuck here, you might consider trying out the [Viv Claude Code plugin](https://github.com/siftystudio/viv/tree/main/plugins/claude). With our plugin installed, Claude will be able to help you get up and running.

* Create or open a `.viv` file in Sublime Text. Syntax highlighting should activate automatically.

* Choose a Viv color scheme (see [Color Schemes](#color-schemes)).


## Color Schemes

While any Sublime Text color scheme will color the Viv syntax, certain semantic distinctions may be collapsed. Instead, we recommend using one of the bundled color schemes designed specifically for Viv.

Here are the current color schemes, all of which come bundled with the Viv Sublime Text package:

| Color Scheme | Dark Variant | Light Variant | Description |
|--------------|--------------|---------------|-------------|
| Viv Warm | x | x | Earthy and rich. |
| Viv Cool | x | x | Calm and restrained. |
| Viv Electric | x | x | Bold and saturated. |

There are two ways to apply a Viv color scheme in Sublime Text:

*	**[Set it as your global color scheme.](#setting-a-global-color-scheme)** This option replaces any current color scheme that you may have in place, across all file types. It's recommended if you plan to use Sublime Text exclusively for Viv code.
*	**[Scope it to `.viv` files only.](#scoping-to-viv-files)** This option leaves your current color scheme in place everywhere else, making it ideal if you use Sublime Text to edit other kinds of files too.

### Setting a Global Color Scheme

To set a Viv color scheme as your global color scheme, for all file types:

* In Sublime Text, open `theme-preview.viv`, which is available [here](https://github.com/siftystudio/viv/blob/main/syntax/examples/theme-preview.viv).
  * This Viv example file showcases the language's syntax highlighting by employing a variety of language features, making it suitable for evaluating color schemes.

* Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`), search for `UI: Select Color Scheme`, and select it to turn the command palette into a color-scheme picker.
* Search for `viv` and browse through the six Viv color schemes using the arrows keys.
  * The preview will update live as you move through them.

* Pick your favorite, and press `Enter` to set it as your new color scheme.
  * Our favorite is `Viv Warm (Dark)`, for what it's worth.

### Scoping to Viv Files

To apply a Viv color scheme only when a `.viv` file is active, leaving your global color scheme in place for all other file types:

* Use `UI: Select Color Scheme` to decide on your favorite Viv color scheme.

  * See [Setting a Global Color Scheme](#setting-a-global-color-scheme) for instructions on using `UI: Select Color Scheme`, but stop before the final step, which applies the scheme globally (as opposed to `.viv` files only).

* Open any `.viv` file.
* With the `.viv` file as your active tab, open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`), search for `Preferences: Settings - Syntax Specific`, and select it. This will open a `Viv.sublime-settings` file for you.
* In the user-settings pane (on the right), add a `color_scheme` entry pointing to your preferred Viv color scheme, using one of the following six options: `Viv Warm (Light)`, `Viv Warm (Dark)`, `Viv Cool (Light)`, `Viv Cool (Dark)`, `Viv Electric (Light)`, or `Viv Electric (Dark)`. Here's an example:

  ```json
  {
    "color_scheme": "Packages/Viv/schemes/Viv Warm (Light).sublime-color-scheme"
  }
  ```

* Save the file. The Viv color scheme will now apply only to `.viv` files, and your global color scheme will remain in effect everywhere else.


## Compiler Integration

The Viv compiler can be invoked from the editor if the [Viv compiler](https://viv.sifty.studio/reference/compiler/) is installed and accessible to Sublime Text (see [Getting Started](#getting-started)).

To compile the current `.viv` file, run the `Build` command (`Cmd+B` / `Ctrl+B`). This *does not* write out the resulting content bundle, but the compilation result will appear in Sublime's build-results panel:

* If compilation succeeds, the panel shows a success message.
* If compilation fails, the error message appears in the panel.
  * If the error message indicates the offending line in the source file, double-click it to navigate directly to that location. An inline diagnostic will mark the problematic location with squiggly line(s), and a pop-up will appear next to it with a summary of the error.

## Boilerplate Snippets

The package ships with a set of **boilerplate snippets** that expand common Viv keyphrases into full templates.

To use a snippet, type its **trigger** in your `.viv` file and then select the target snippet from the autocompletion pop-up. The snippet will expand with placeholder elements, which you can tab through to fill in.

### Construct definitions

These snippets expand into complete top-level construct definitions, including a roles section and other scaffolding appropriate to the construct type.

| Trigger | Description |
|---------|-------------|
| `action` | Action definition with roles, conditions, and effects. |
| `action from` | Child action that inherits from a parent. |
| `action variant` | Named variation on a parent action. |
| `template action` | Template action definition. |
| `reserved action` | Reserved action definition. |
| `action-selector` | Action-selector definition. |
| `plan-selector` | Plan-selector definition. |
| `plan` | Plan definition with phases. |
| `query` | Query definition. |
| `pattern` | Sifting-pattern definition. |
| `trope` | Trope definition. |

### Sections and fields

These snippets expand into sections and fields that appear within construct definitions.

| Trigger | Description |
|---------|-------------|
| `roles` | Roles section with initiator and recipient. |
| `conditions` | Conditions section. |
| `effects` | Effects section. |
| `scratch` | Scratch section with a variable declaration. |
| `phases` | Phases section with a named phase. |
| `reactions` | Reactions section with a queued action. |
| `embargoes` | Embargoes section. |
| `embargo` | Single embargo entry. |
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
| `target randomly` | Random selector policy. |
| `target with weights` | Weighted selector policy. |
| `target in order` | Ordered selector policy. |

### Temporal constraints

| Trigger | Description |
|---------|-------------|
| `time` | Time constraint block. |
| `after` | After temporal constraint. |
| `before` | Before temporal constraint. |
| `between` | Between temporal constraint. |

### Expressions and control flow

| Trigger | Description |
|---------|-------------|
| `search query` | Search over a query. |
| `search` | Bare search over chronicle or memories. |
| `sift` | Sift a pattern. |
| `fit trope` | Fit a trope with role bindings. |
| `fits` | Inline trope-fit expression. |
| `~` | Custom function call. |
| `if` | If conditional. |
| `if else` | If/else conditional. |
| `loop` | Loop. |

### Other

| Trigger | Description |
|---------|-------------|
| `include` | Include statement. |


## Updates

Package Control will automatically check for updates, and when a new version of the package is released, it will be installed the next time you restart Sublime Text.


## Compatibility

Each release of this package is built for a specific version of the Viv compiler. If the installed compiler version doesn't match what the package expects, syntax highlighting and/or compiler integration may be affected. To mark this discrepancy, a warning will appear in the build-results panel upon any compilation action.

To resolve a compatibility issue, update both the package and the compiler to their latest versions.


## Troubleshooting

There are currently a few known Package Control issues that can interfere with installing Viv. Each is described below, along with a workaround.

### Package Control commands don't appear (macOS)

On recent macOS versions, Sublime's built-in `Install Package Control` command installs a legacy version of Package Control (`3.4.1`) that silently fails to load due to a missing OpenSSL symbol. The symptom is that no `Package Control:` commands appear in the command palette after restarting Sublime Text.

To work around this, you'll need to install the latest Package Control manually:

* Open the Sublime Text console with `` Ctrl+` ``.

* Paste in this command (and hit `Enter`):

   ```python
   from urllib.request import urlretrieve; urlretrieve(url="https://github.com/wbond/package_control/releases/latest/download/Package.Control.sublime-package", filename=sublime.installed_packages_path() + '/Package Control.sublime-package')
   ```

* Fully quit and reopen Sublime Text. The `Package Control:` commands should now appear in the command palette.

### Viv doesn't appear in `Package Control: Install Package` results

If Viv currently doesn't appear in the `Package Control: Install Package` search results, due to an upstream Package Control configuration issue, you can still add our repository to Package Control directly:

* Open the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`), search for `Package Control: Add Repository`, and select it.
* In the input box that pops up, enter the following URL:

  ```
  https://raw.githubusercontent.com/siftystudio/viv/main/plugins/sublime/repository.json
  ```

* Re-open the command palette, search for `Package Control: Install Package`, and search for `Viv` again. It should now appear.


## Installing a Specific Release

You can also install a specific version of the plugin, for instance to use an older version.

* Visit our [GitHub releases page](https://github.com/siftystudio/viv/releases) and find the version you want. Right-click the `Viv.sublime-package` asset for that release and copy its download URL.

* Open the Sublime Text console with `` Ctrl+` ``.

* Paste in this command, replacing `<url>` with the release URL you just copied (and hit `Enter`):

   ```python
   from urllib.request import urlretrieve; from zipfile import ZipFile; zip_path = sublime.installed_packages_path() + '/Viv.sublime-package'; urlretrieve("<url>", zip_path); ZipFile(zip_path).extractall(sublime.packages_path() + '/Viv')
   ```

   * Here's an example:

      ```python
      from urllib.request import urlretrieve; from zipfile import ZipFile; zip_path = sublime.installed_packages_path() + '/Viv.sublime-package'; urlretrieve("https://github.com/siftystudio/viv/releases/download/sublime-v0.11.0/Viv.sublime-package", zip_path); ZipFile(zip_path).extractall(sublime.packages_path() + '/Viv')
      ```

* Fully quit and reopen Sublime Text.


## Changelog

See the [changelog](https://github.com/siftystudio/viv/blob/main/plugins/sublime/CHANGELOG.md) for a history of changes to this package.


## Security and Privacy

The Viv Sublime Text package runs entirely on your machine. It collects no telemetry, makes no analytics calls, and sends no data to any third party. If you discover a security vulnerability in the package, please report it using the protocol described in the [Viv security policy](https://github.com/siftystudio/viv/blob/main/.github/SECURITY.md).


## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out [LICENSE.txt](https://github.com/siftystudio/viv/blob/main/plugins/sublime/LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
