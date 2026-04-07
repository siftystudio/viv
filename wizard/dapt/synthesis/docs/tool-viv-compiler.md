# Tool: Viv Compiler (`vivc`)

This document is the reference for agents invoking the Viv compiler during authoring sessions. It covers invocation, output format, and exit codes.

---

## Invocation

The compiler takes exactly one `.viv` source file per invocation. No directory mode, no glob expansion.

```bash
python -m viv_compiler.cli -i <path-to-file.viv> [OPTIONS]
```

If the `vivc` console script is installed (via `pip install` of the compiler package), you can also invoke it as `vivc -i <file>`. In session logs, the shorthand `$ vivc <file>` is used in compiler output blocks for readability, regardless of the actual invocation method.

### Common flag combinations

Always set `NO_COLOR=1` to suppress ANSI color codes in stderr output.

**Compile and check for errors (most common):**
```bash
NO_COLOR=1 python -m viv_compiler.cli -i social.viv -l
```
Human-readable output on stderr: success/failure message, plus a listing of compiled construct names grouped by type.

**Compile and capture JSON bundle:**
```bash
NO_COLOR=1 python -m viv_compiler.cli -i social.viv -p
```
JSON bundle on stdout, human-readable messages on stderr. Pipe stdout for clean JSON: `... -p 2>/dev/null | jq`.

**Inspect a specific construct:**
```bash
NO_COLOR=1 python -m viv_compiler.cli -i social.viv -p "actions.gossip-about-boss"
```
Prints only the filtered subtree of the JSON bundle.

**Compile and save bundle to disk:**
```bash
NO_COLOR=1 python -m viv_compiler.cli -i social.viv -o bundle.json
```

### All flags

| Flag | Description |
|------|-------------|
| `-i PATH` | Input `.viv` source file. Required. |
| `-o PATH` | Write compiled JSON bundle to file. |
| `-p [FILTER]` | Print JSON bundle to stdout. Optional dot-notation filter. |
| `-l` | List compiled construct names to stderr. |
| `-V` | Print version info and exit. |
| `--traceback` | Show full Python traceback on error. |
| `--test` | Run built-in smoke test and exit. |

---

## Output Format

Human-readable messages always go to **stderr**. JSON output from `-p` goes to **stdout**. This separation is clean and reliable for programmatic use.

### Successful compilation (stderr with `-l`)

```
* Compiling source file: social.viv

* Compilation succeeded

* Actions (2):

  - gossip-about-boss
  - confide-in-friend

* Tropes (1):

  - my-friend

* No output file specified
```

### Parse error (stderr)

```
* Compiling source file: bad.viv

* Compilation failed:

Source file could not be parsed:

- File: /path/to/bad.viv
- Position: line 1, col 16
- Context (failed at *): ...n garbage [*]in out...
- Viable next tokens: from, :, ;
```

### Validation error (stderr)

Validation errors occur when code parses successfully but fails semantic checks. These have a different format than parse errors — just the error message, no position/context block.

```
* Compiling source file: social.viv

* Compilation failed:

Action 'gossip-about-boss' has 'saliences' with 'roles' entry for undefined role: 'bystander'
```

### Successful compilation (stderr without `-l`)

```
* Compiling source file: social.viv

* Compilation succeeded

* No output file specified
```

### File not found (stderr)

```
* Compiling source file: nonexistent.viv

* Compilation failed:

Source file not found: /nonexistent.viv
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Successful compilation |
| 1 | Compilation error (parse error, validation error, file not found) |
| 2 | Argument error (missing `-i`, invalid flag) |

All compilation failures return exit code 1. The error message text distinguishes parse errors from validation errors from file-not-found.

---

## Session Log Integration

When an author agent invokes the compiler, the stderr output is captured and appended to the session log in a fenced block:

- Exit code 0 → `~~~compiler-success` fence
- Exit code 1 → `~~~compiler-error` fence

The `$ vivc <filename>` invocation line is included at the top of the fenced block for readability. See the "Log Format" section of `docs/author-instructions.md` for the full fencing convention.

---

## Color

Stderr output is ANSI-colored by default when output is a TTY. Set `NO_COLOR=1` in the environment to suppress color codes when capturing stderr for logs. Agents should always set `NO_COLOR=1`.

---

## Python API (alternative)

For tighter integration, the compiler can be called directly from Python:

```python
from viv_compiler import compile_from_path, VivCompileError, VivParseError
from pathlib import Path

try:
    bundle = compile_from_path(source_file_path=Path("social.viv"))
except VivParseError as e:
    # Source could not be parsed
    ...
except VivCompileError as e:
    # Post-parse validation error
    ...
```

The CLI is recommended for authoring agents since it cleanly separates JSON and human-readable output and its stderr is directly suitable for session logs.
