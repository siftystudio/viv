"""Bridge script for invoking the Viv compiler in the Viv VS Code extension.

Accepts a path to a Viv source file, compiles it, and emits a JSON object to
stdout representing the structured result. The VS Code extension parses this
JSON to drive status-bar updates, inline diagnostics, and the Output panel.

Success (compile check):
    {"status": "success", "constructs": {...}}

Success (bundle save):
    {"status": "success", "constructs": {...},
     "entryFile": "/path/to/entry.viv",
     "outputPath": "/path/to/bundle.json"}

Success or error with version mismatch:
    {..., "warning": "This extension was built for ..."}

Error:
    {"status": "error", "file": "...", "line": 21, "column": 13,
     "message": "...", "code": "..."}
"""

import json
import sys
from pathlib import Path


def main():
    """Compile a Viv source file and emit a structured JSON result to stdout.

    The JSON produced here is parsed by our VS Code extension, which uses it to drive
    status-bar updates, inline diagnostics, and other feedback mechanisms.
    """
    # Attempt to import the compiler. If it's not installed, raise an error.
    try:
        from viv_compiler import __version__, compile_from_path, VivCompileError, VivParseError
    except ImportError:
        print(json.dumps({
            "status": "error",
            "errorType": "not_installed",
            "file": None,
            "line": None,
            "column": None,
            "message": (
                "Viv compiler is not installed on the VS Code Python. To install it, run this command "
                f"in your terminal: {sys.executable} -m pip install viv-compiler"
            ),
            "code": None
        }))
        sys.exit(1)
    # Issue a warning if the compiler version is unexpected
    extension_metadata = json.loads((Path(__file__).parent / "package.json").read_text())
    expected_compiler_version_major_minor = ".".join(extension_metadata["compilerVersion"].split(".")[:2])
    actual_compiler_version_major_minor = ".".join(__version__.split(".")[:2])
    warning = None
    warning_type = None
    if expected_compiler_version_major_minor != actual_compiler_version_major_minor:
        expected_tuple = tuple(int(segment) for segment in expected_compiler_version_major_minor.split("."))
        actual_tuple = tuple(int(segment) for segment in actual_compiler_version_major_minor.split("."))
        if actual_tuple < expected_tuple:
            # Compiler is older than what the extension expects -- prompt to update compiler
            warning_type = "compiler_outdated"
            warning = (
                f"This extension was built for viv-compiler {expected_compiler_version_major_minor}.x, "
                f"but the installed compiler is viv-compiler {__version__}. Syntax highlighting and/or "
                f"compilation may be affected. To update the compiler, run this command in your terminal: "
                f"{sys.executable} -m pip install --upgrade viv-compiler"
            )
        else:
            # Extension is older than the installed compiler -- prompt to update extension
            warning_type = "plugin_outdated"
            warning = (
                f"The installed compiler is viv-compiler {__version__}, "
                f"but this extension was built for viv-compiler {expected_compiler_version_major_minor}.x. "
                f"Syntax highlighting and/or compilation may be affected. To resolve this issue, "
                f"update the Viv extension to its latest version."
            )
    if len(sys.argv) < 2:
        error_result = {
            "status": "error",
            "file": None,
            "line": None,
            "column": None,
            "message": "No source file provided.",
            "code": None
        }
        if warning is not None:
            error_result["warning"] = warning
            error_result["warningType"] = warning_type
        print(json.dumps(error_result))
        sys.exit(1)
    source_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2]) if len(sys.argv) == 3 else None
    # Compile the source file and handle errors
    try:
        content_bundle = compile_from_path(source_file_path=source_path)
        constructs = {
            "actions": sorted(content_bundle["actions"]),
            "actionSelectors": sorted(content_bundle["actionSelectors"]),
            "plans": sorted(content_bundle["plans"]),
            "planSelectors": sorted(content_bundle["planSelectors"]),
            "queries": sorted(content_bundle["queries"]),
            "siftingPatterns": sorted(content_bundle["siftingPatterns"]),
            "tropes": sorted(content_bundle["tropes"]),
        }
        result = {"status": "success", "constructs": constructs}
        if warning is not None:
            result["warning"] = warning
            result["warningType"] = warning_type
        if output_path is not None:
            output_path.write_text(json.dumps(content_bundle, indent=2))
            result["entryFile"] = str(source_path)
            result["outputPath"] = str(output_path)
        print(json.dumps(result))
    except VivParseError as parse_error:  # Must be caught before its parent class, VivCompileError
        error_result = {
            "status": "error",
            "file": str(parse_error.file_path),
            "line": parse_error.line,
            "column": parse_error.column,
            "message": parse_error.detail,
            "code": parse_error.code
        }
        if warning is not None:
            error_result["warning"] = warning
            error_result["warningType"] = warning_type
        print(json.dumps(error_result))
        sys.exit(1)
    except VivCompileError as compile_error:
        error_result = {
            "status": "error",
            "file": str(compile_error.file_path) if compile_error.file_path else str(source_path),
            "line": compile_error.line,
            "column": compile_error.column,
            "endLine": compile_error.end_line,
            "endColumn": compile_error.end_column,
            "message": compile_error.msg,
            "code": compile_error.code
        }
        if warning is not None:
            error_result["warning"] = warning
            error_result["warningType"] = warning_type
        print(json.dumps(error_result))
        sys.exit(1)
    except Exception as error:
        error_result = {
            "status": "error",
            "file": None,
            "line": None,
            "column": None,
            "message": f"An unexpected error occurred: {error}",
            "code": None
        }
        if warning is not None:
            error_result["warning"] = warning
            error_result["warningType"] = warning_type
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
