---
title: Python API
description: Reference for the Viv compiler's Python API — compile_from_path(), compile_from_string(), and the exception types.
tableOfContents:
  maxHeadingLevel: 3
---

In addition to the [command-line interface](/reference/compiler/cli/) and the [editor plugins](/reference/compiler/#editor-plugins), Viv ships a Python API to its compiler. Once you've [installed](/reference/compiler/#installation) the compiler, its Python API can be accessed by importing `viv_compiler` into your project, as seen in the [usage examples](#examples) below.

## Functions

:::caution[Compilation is not thread-safe]
Do not call `compile_from_path()` or `compile_from_string()` concurrently from multiple threads. The compiler relies on module-level globals to track the source file currently being visited and to apply user-supplied config defaults, so concurrent calls would race on that shared state. If you need to compile many files in parallel, run each compilation in its own process.
:::

### `compile_from_path()`

*Compiles a Viv source file (`.viv`) into a content bundle.*

```py
compile_from_path(
    source_file_path: Path,
    *,
    default_importance: float = config.DEFAULT_IMPORTANCE_SCORE,
    default_salience: float = config.DEFAULT_SALIENCE_SCORE,
    default_reaction_priority: float = config.DEFAULT_REACTION_PRIORITY_VALUE,
    use_memoization: bool = True,
    verbose_parser: bool = False,
) -> ContentBundle
```

#### Parameters

* `source_file_path`
  * Relative or absolute path to a `.viv` source file. This will be treated as the *entry file*, meaning the top-level file that pulls in all the others, directly or transitively, via `include` statements.
* `default_importance`
  * Default [importance](/reference/language/10-actions/#importance) for actions when unspecified.
* `default_salience`
  * Default [salience](/reference/language/10-actions/#saliences) for actions when unspecified.
* `default_reaction_priority`
  * Default [reaction priority](/reference/language/11-reactions/#priority) for reactions when unspecified.
* `use_memoization`
  * Whether to enable *memoization* in the underlying PEG parser. Memoization makes parsing faster, but it uses more memory.
* `verbose_parser`
  * Whether to engage a verbose debugging mode in the underlying PEG parser.

#### Returns

The compiled content bundle, as a JSON-serializable `dict` conforming to the `ContentBundle` schema. Typed definitions for this shape and its inner structures (e.g., `ActionDefinition`, `PlanDefinition`) are available via `viv_compiler.external_types`, for advanced use cases, but are not part of the stable public API.

#### Raises

* `VivParseError`
  * The source file, or a file that it includes, could not be parsed.
* `VivCompileError`
  * An issue occurred during compilation, but after parsing. Usually this is raised when a validation check discovers a problem.


### `compile_from_string()`

*Compiles a string containing Viv source code into a content bundle.*

```py
compile_from_string(
    source_code: str,
    *,
    entry_dir: Path | None = None,
    default_importance: float = config.DEFAULT_IMPORTANCE_SCORE,
    default_salience: float = config.DEFAULT_SALIENCE_SCORE,
    default_reaction_priority: float = config.DEFAULT_REACTION_PRIORITY_VALUE,
    use_memoization: bool = True,
    verbose_parser: bool = False,
) -> ContentBundle
```

#### Parameters

* `source_code`
  * A string containing (only) the Viv source code to compile.
* `entry_dir`
  * Relative or absolute path to a directory that will be used for resolving any `include` paths in the source code. Defaults to the current working directory, and it can be ignored if `source_code` has no includes.
* All other parameters are the same as [`compile_from_path()`](#compile_from_path).

#### Returns

Same as [`compile_from_path()`](#compile_from_path).

#### Raises

Same as [`compile_from_path()`](#compile_from_path).


## Exceptions

:::caution[Catch `VivParseError` before `VivCompileError`]
Because `VivParseError` subclasses `VivCompileError`, they must always be caught in that order, since otherwise parse errors would be silently swallowed as compile errors.
:::

### `VivParseError`

*Raised when a source file cannot be parsed.*

```py
class VivParseError(VivCompileError):
    msg: str
    file_path: Path
    original: Exception
    line: int | None
    column: int | None
    detail: str
```

#### Attributes

* `msg`
  * A brief message explaining the issue.
* `file_path`
  * Absolute path to the file that failed to parse. This may be a file that was included in the source file, or one imported through a more complex include chain.
* `original`
  * The underlying parser error.
* `line`
  * Line number where the parse error occurred, if applicable.
* `column`
  * Column number where the parse error occurred, if applicable.
* `detail`
  * The full formatted diagnostic string. This is also what `str(error)` returns.

### `VivCompileError`

*Raised when parsing succeeds but compilation still fails downstream, usually due to a failed validation check.*

```py
class VivCompileError(Exception):
    msg: str
    file_path: Path | None
    line: int | None
    column: int | None
    end_line: int | None
    end_column: int | None
    code: str | None
    detail: str
```

#### Attributes

* `msg`
  * A brief message explaining the issue.
* `file_path`
  * Absolute path to the offending source file, if applicable.
* `line`
  * Line number at the start of the offending source, if applicable.
* `column`
  * Column number at the start of the offending source, if applicable.
* `end_line`
  * Line number at the end of the offending source, if applicable.
* `end_column`
  * Column number at the end of the offending source, if applicable.
* `code`
  * The offending source code snippet, if applicable.
* `detail`
  * The full formatted diagnostic string. This is also what `str(error)` returns.


## Examples

Print out versions for the compiler, content-bundle schema, and DSL grammar associated with your installation:

```python
import viv_compiler

print(f"Package: {viv_compiler.__version__}")
print(f"Schema:  {viv_compiler.__schema_version__}")
print(f"Grammar: {viv_compiler.__grammar_version__}")
```

Compile a source file into a dictionary conforming to the `ContentBundle` shape:

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

Compile Viv source code directly from a string:

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

Print out a parse error:

```python
from pathlib import Path
from viv_compiler import compile_from_path, VivParseError

try:
    compile_from_path(Path("hamlet.viv"))
except VivParseError as e:
    print(e)
```

```
Source file could not be parsed:

- File: /Users/vivian/hamlet.viv
- Position: line 21, col 13
- Context (failed at *): ...queue [*]plot-reven...
- Viable next tokens: action, action-selector, plan, plan-selector
```

Print out a compile error:

```python
from pathlib import Path
from viv_compiler import compile_from_path, VivCompileError

try:
    compile_from_path(Path("hamlet.viv"))
except VivCompileError as e:
    print(e)
```

```
Action 'greet' has no 'initiator' role (every action requires exactly one role labeled 'as: initiator')

/Users/vivian/hamlet.viv:14:1

  action greet:
      roles:
          @greeter:
              as: greeter
```

Inspect an error's structured fields to build a custom diagnostic (e.g., for a CI reporter or editor integration):

```python
from pathlib import Path
from viv_compiler import compile_from_path, VivCompileError

try:
    compile_from_path(Path("hamlet.viv"))
except VivCompileError as e:
    location = f"{e.file_path.name}:{e.line}:{e.column}" if e.file_path else "unknown"
    print(f"[{location}] {e.msg}")
    if e.code:
        print()
        for line in e.code.splitlines():
            print(f"  | {line}")
```
