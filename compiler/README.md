# Viv Compiler

This package contains the reference **compiler** for the domain-specific language (DSL) at the heart of [Viv](https://viv.sifty.studio), an engine for emergent narrative in games and simulations.

The Viv compiler accepts a **Viv source file** (`.viv`) and produces a **Viv content bundle** in a JSON-serializable format that is compatible with any Viv runtime, enabling character simulation and story sifting according to the constructs defined in the authored Viv code.

Once you've installed this package, you'll have access to the two compiler interfaces that are documented below:

* A **command-line interface** (`vivc`) for invoking the compiler from the command line.

* A **Python API** for invoking the compiler programmatically.

As for runtimes, currently there is a single option: the [Viv JavaScript runtime](https://www.npmjs.com/package/@siftystudio/viv-runtime).

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Editor Plugins](#editor-plugins)
- [Command-Line Interface](#command-line-interface-cli)
- [Python API](#python-api)
- [Runtime Compatibility](#runtime-compatibility)
- [Troubleshooting](#troubleshooting)
- [Running from Source](#running-from-source)
- [Changelog](#changelog)
- [License](#license)

## Requirements

* Python 3.11+.

## Installation

* Install from PyPI:

  ```console
  pip install viv-compiler
  ```

* Run a smoke test to confirm your installation looks good:

  ```console
  vivc --test
  ```

## Editor Plugins

We recommend writing Viv code in an editor for which we have released a *plugin*. The Viv editor plugins provide compiler integration, in addition to syntax highlighting, boilerplate snippets, and many other features. So far, these three are available:

- [Viv JetBrains Plugin](https://plugins.jetbrains.com/plugin/31012-viv) *(recommended)*
  - The default tool for writing Viv code.

- [Viv VS Code extension](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv)
  - A lightweight alternative.

- [Viv Sublime Text package](https://github.com/siftystudio/viv/blob/main/plugins/sublime/README.md)
  - A very lightweight alternative.

Each plugin release is built for a specific range of compiler versions. If there's a mismatch, the plugin will issue a warning, as described in its documentation.

## Command-Line Interface (CLI)

Once you've installed the Viv compiler, its CLI will be exposed via the command `vivc` (and its alias `viv-compiler`).

### Usage

```console
vivc --input path/to/source.viv [options]
vivc --string 'source code' [options]
```

### Arguments

*Note: exactly one of `--input`, `--string`, `--version`, or `--test` must be provided.*

* `-i, --input PATH`
	* Relative or absolute path to the Viv source file (`.viv`) to compile.
	* If you are using `include` statements to import between files, this should be the main **entry file**.

* `-s, --string CODE`
	* A string of Viv source code to compile directly, without a file on disk.

* `--entry-dir PATH`
	* Optional. Only valid with `--string`.
	* Directory for resolving `include` paths. Defaults to the current working directory.

* `-o, --output PATH`
	* Optional.
	* Relative or absolute path to write the compiled JSON bundle.

### Flags and Options (Optional)

* `-h, --help`

	* Show help message and exit.

* `-V, --version`

	* Print versions for the compiler, content-bundle schema, and DSL grammar, and then exit.

* `-p, --print`

	* After compilation, pretty-print the compiled content bundle JSON (to `stdout`). 
	* If an optional dot-notation filter is provided, the value at that path (in the content bundle JSON) will be pretty-printed instead.

* `-l, --list`

	* After compilation, list all compiled construct names (to `stderr`).

* `-q, --quiet`

	* Suppress status output on success (errors will still be printed).
	* Useful for scripted/batch compilation.

* `--default-importance FLOAT`

	* Sets the default importance (floating-point number) for actions when unspecified.
	* Default: value from `viv_compiler.config.DEFAULT_IMPORTANCE_SCORE`.

* `--default-salience FLOAT`

	* Sets the default salience (floating-point number) for actions when unspecified.
	* Default: value from `viv_compiler.config.DEFAULT_SALIENCE_SCORE`.

* `--default-reaction-priority FLOAT`

	* Sets the default reaction priority (floating-point number) for reactions when unspecified.
	* Default: value from `viv_compiler.config.DEFAULT_REACTION_PRIORITY_VALUE`.

* `--memoization, --no-memoization`

	* Enable/disable memoization in the underlying PEG parser (memoization is faster but uses more memory).
	* Default: enabled.

* `--verbose-parser`

	* Engage a verbose debugging mode in the underlying PEG parser.
    * Entering this mode causes the underlying parser framework to write debug files to the working directory.

* `--traceback`

	* Upon a compiler error, log traceback in addition to the error message.

* `--test`

	* Run a smoke test using a sample Viv file to confirm the installation works.

### Examples

* Log versions for the compiler, content-bundle schema, and DSL grammar associated with your installation:

  ```console
  vivc -V
  ```

* Compile a source file and write the resulting content bundle to file:

  ```console
  vivc --input /path/to/my-actions.viv --output /path/to/myContentBundle.json
  ```

  ```console
  vivc -i /path/to/my-actions.viv -o /path/to/myContentBundle.json
  ```

* Compile a source file and log (a portion of) the output in the console:

  ```console
  vivc -i /path/to/my-actions.viv --print
  ```

  ```console
  vivc -i /path/to/my-actions.viv -p
  ```
  
  ```console
  # Print all action definitions
  vivc -i /path/to/my-actions.viv -p actions
  ```
  
  ```console
  # Print the definition for the 'hugger' role of the 'hug' action
  vivc -i /path/to/my-actions.viv -p actions.hug.roles.hugger
  ```

* Compile a source file and copy the output to your clipboard:

  * macOS:

    ```console
    vivc -i /path/to/my-actions.viv -p | pbcopy
    ```

  * Linux (Wayland):

    ```console
    vivc -i /path/to/my-actions.viv -p | wl-copy
    ```

  * Linux (X11):

    ```console
    vivc -i /path/to/my-actions.viv -p | xclip -selection clipboard
    ```

  * Windows PowerShell:

    ```powershell
    vivc -i C:\path\to\my-actions.viv -p | Set-Clipboard
    ```

* Compile Viv source code directly from a string:

  ```console
  vivc --string 'action greet:
      roles:
          @greeter:
              as: initiator'
  ```

* Compile from a string with include resolution:

  ```console
  vivc --entry-dir ./content/viv --string 'include "helpers.viv"
  
  action greet:
      roles:
          @greeter:
              as: initiator' 
  ```

* Compile Viv source code generated by another process:

  ```console
  vivc -s "$(./generate_viv_code.py --seed 77)"
  ```

### Color Output

The CLI displays colored output when printing directly to the console. In accordance with the [NO_COLOR standard](https://no-color.org), this can be disabled by setting the `NO_COLOR` environment variable:

```console
NO_COLOR=1 vivc -i path/to/source.viv
```

## Python API

Once you've installed `viv-compiler`, the Viv compiler Python API can be invoked by importing `viv_compiler` into your project.

### API Reference

#### `compile_from_path()`

* **Purpose**

	* Invokes the compiler for a specified Viv source file.

* **Arguments**

	* `source_file_path` (`Path`)

		* Relative or absolute path to a `.viv` source file.

	* `default_importance` (`float`)

		* Default importance for actions (if unspecified).

	* `default_salience` (`float`)

		* Default salience for actions (if unspecified).

	* `default_reaction_priority` (`float`)

		* Default reaction priority (if unspecified).

	* `use_memoization` (`bool`)

		* Whether to enable memoization in the underlying PEG parser (faster but uses more memory).

	* `verbose_parser` (`bool`)

		* Whether to engage a verbose debugging mode in the underlying PEG parser.

* **Returns**

	* The compiled content bundle, as a JSON-serializable dictionary conforming to the `ContentBundle` schema. Typed definitions for the inner structures (e.g., `ActionDefinition`, `PlanDefinition`) are available via `viv_compiler.external_types`, for advanced use cases, but are not part of the stable public API.

* **Raises**
	* `VivParseError`
		- The source file, or a file it includes, could not be parsed.
	
	* `VivCompileError`
		- An issue occurred during compilation, but after parsing.
	
* **Note**
* This function is not thread-safe. Do not call it concurrently from multiple threads.

#### `compile_from_string()`

* **Purpose**

	* Compiles Viv source code from a string. Same as `compile_from_path()`, but accepts source code directly instead of a file path.

* **Arguments**

  * `source_code` (`str`)

  	* A string containing (only) the Viv source code to compile.

  * `entry_dir` (`Path | None`)

    * Relative or absolute path to a directory that will be used as the parent directory of the proxy entry file. This allows any includes in the source code to be handled, since  the include paths are always relative to the file being compiled. 
    * This defaults to the current working directory, and can be ignored if `source_code` has no includes.

  * All other arguments are the same as `compile_from_path()`.

* **Returns**
* Same as `compile_from_path()`.

#### `VivCompileError`

* **Purpose**
	* Custom exception type (inherits from `Exception`) raised when compilation fails.
	
* **Attributes**

	* `msg` (`str`)
	  * A brief message explaining the issue.
	
	* `file_path` (`Path | None`)
	  * Absolute path to the offending source file, if applicable.

	* `line` (`int | None`)
	  * Line number at the start of the offending source, if applicable.
	
	* `column` (`int | None`)
	  * Column number at the start of the offending source, if applicable.

	* `end_line` (`int | None`)
	  * Line number at the end of the offending source, if applicable.
	
	* `end_column` (`int | None`)
	  * Column number at the end of the offending source, if applicable.
	
	* `code` (`str | None`)
	  * The offending source code snippet, if applicable.
	
	* `detail` (`str`)
	  * The full formatted diagnostic string. This is also what `str(error)` returns.
	

#### `VivParseError`

* **Purpose**

	* Subclass of `VivCompileError` raised when a source file cannot be parsed.

* **Attributes**

	* `msg` (`str`)
	  * A brief message explaining the issue.
	
	* `file_path` (`Path`)
	  * Absolute path to the file that failed to parse. This may be a file that was included in the source file, or one imported through a more complex include chain.

	* `original` (`Exception`)
	  * The underlying parser error.
	
	* `detail` (`str`)
	  * The full formatted diagnostic string. This is also what `str(error)` returns.
	
	* `line` (`int | None`)
	  * Line number where the parse error occurred, if applicable.
	
	* `column` (`int | None`)
	  * Column number where the parse error occurred, if applicable.
	

### Examples

* Log versions for the compiler, content-bundle schema, and DSL grammar associated with your installation:

  ```python
  import viv_compiler

  print(f"Package: {viv_compiler.__version__}")
  print(f"Schema:  {viv_compiler.__schema_version__}")
  print(f"Grammar: {viv_compiler.__grammar_version__}")
  ```

* Compile a source file into a dictionary conforming to the `ContentBundle` shape:

  ```python
  from pathlib import Path
  from viv_compiler import compile_from_path, VivCompileError, VivParseError
  from viv_compiler.external_types import ContentBundle
  
  try:
      content_bundle: ContentBundle = compile_from_path(
          source_file_path=Path("my-actions.viv")
      )
      print("Compilation succeeded:", content_bundle)
  except VivParseError as e:  # Handle first, because it's a subclass of VivCompileError
      print(e)
  except VivCompileError as e:
      print(e)
  ```

* Compile Viv source code directly from a string:

  ```python
  from viv_compiler import compile_from_string
  
  source_code = """
  action greet:
      roles:
          @greeter:
              as: initiator
  """
  bundle = compile_from_string(source_code)
  ```

## Runtime Compatibility

In order to use a compiled content bundle in a Viv runtime there must be compatibility between the respective **schema versions** associated with the compiler and the runtime:

- When the compiler emits a content bundle, it stamps it with the current version number for the schema for content bundles (stored at `metadata.schemaVersion`).

	- The schema version for this compiler release is exposed in the CLI via `vivc -V`, and in the API as `viv_compiler.__schema_version__`.

- Each runtime declares a range of supported schema versions, as documented in their respective packages.

- When registering a content bundle, the runtime will throw an error if the bundle’s schema version falls outside its supported range.

## Troubleshooting

There are two kinds of issues that can prevent Viv source files from being compiled:

* **Syntax errors** occur when a source file cannot be parsed due to malformed syntax (e.g., a typo in a field name). In such cases, a `VivParseError` will be emitted. When invoked via the CLI, the compiler will display some helpful debugging data (see the troubleshooting example below). For an extremely detailed parsing trace, set the `--verbose-parser` CLI flag.

* **Semantic errors** in the compiled content bundle that are detected by the Viv compiler's validator module (e.g., an action with no initiator role). In such cases, a `VivCompileError` will be emitted. When invoked via the CLI, the compiler may also display (alongside an error message) the offending file, line, column, and source code. For the full traceback, pass the `--traceback` CLI flag.

### Example

Here's an example excerpt from an error message associated with a syntax issue:

```
Source file could not be parsed:

- File: /Users/Vivian/Desktop/hamlet.viv
- Position: line 21, col 13
- Context (failed at *): ...queue [*]plot-reven...
- Viable next tokens: action, action-selector, plan, plan-selector
```

Some critical information is included in this message:

 - The issue occurs in this file: `/Users/Vivian/Desktop/hamlet.viv`.

 - The issue occurs specifically at line 21, column 13.

 - The position marker `[*]` marks the exact spot at which the parser could proceed no further: `queue [*]plot-reven`.

 - The parser could have proceeded had one of these tokens appeared at that position: `action`, `action-selector`, `plan`, or `plan-selector`.

In this case, the parser got through a token `queue` before getting stuck upon encountering a token beginning `plot-reven` (it was `plot-revenge`). This is because the reaction was missing the keyword `action`. That is, the author should have typed `queue action plot-revenge`, rather than just `queue plot-revenge`.

Note that the error message does hint at this exact solution, in that it indicates that one of the tokens that would have worked here was `action`. In other cases, there will be too many expected tokens for the error message to be much help, but at least you'll know exactly where the parser tripped up.

If you're perplexed by a parser error, you could try passing the `--verbose-parser` flag, though the resulting debug printout is extremely verbose and may overwhelm you more. (This will also cause debugging files to be written to your working directory.)

In the case of a semantic error, you can pass the `--traceback` flag to get the full compiler traceback—though this is generally intended to aid development of the compiler, not authoring.

## Language Reference

For a full specification of the Viv DSL—its syntax, semantics, and compiler output format—consult the [Viv Language Reference](https://viv.sifty.studio/reference/language/).

## Running from Source

Here's how to work directly from a repo checkout:

* Clone the Viv monorepo:

  ```console
  git clone https://github.com/siftystudio/viv
  ```
  
* Install the compiler package and its dependencies via [Poetry](https://python-poetry.org):

  ```console
  cd viv/compiler
  poetry install
  ```

* Use Poetry to invoke the CLI:

  ```console
  poetry run vivc --test
  ```

## Changelog

See the [changelog](https://github.com/siftystudio/viv/blob/main/compiler/CHANGELOG.md) for a history of changes to this package.

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out [LICENSE.txt](https://github.com/siftystudio/viv/blob/main/compiler/LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
