"""Bridge script for invoking the Viv compiler in the Viv JetBrains plugin.

Accepts a path to a Viv source file, compiles it, and emits a JSON object to
stdout representing the structured result. The JetBrains plugin parses this
JSON to drive annotations, status bar updates, and the tool window.

Success (compile check):
    {"status": "success", "constructs": {...}}

Success (bundle save):
    {"status": "success", "constructs": {...},
     "entryFile": "/path/to/entry.viv",
     "outputPath": "/path/to/bundle.json"}

Success or error with version mismatch:
    {..., "warning": "This plugin was built for ..."}

Error:
    {"status": "error", "file": "...", "line": 21, "column": 13,
     "message": "...", "code": "..."}
"""

import argparse
import json
import sys
from pathlib import Path


def main():
    """Compile a Viv source file and emit a structured JSON result to stdout."""
    parser = argparse.ArgumentParser(description="Viv compiler bridge")
    parser.add_argument("source", help="Path to the Viv source file to compile")
    parser.add_argument("--output", help="Path to write the content bundle JSON")
    parser.add_argument("--expect-version", help="Expected compiler major.minor version")
    args = parser.parse_args()

    # Attempt to import the compiler
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
                "Viv compiler is not installed. To install it, run: "
                f"{sys.executable} -m pip install viv-compiler"
            ),
            "code": None
        }))
        sys.exit(1)

    # Check version mismatch
    warning = None
    warning_type = None
    if args.expect_version:
        actual_major_minor = ".".join(__version__.split(".")[:2])
        expected_major_minor = args.expect_version
        if expected_major_minor != actual_major_minor:
            try:
                expected_tuple = tuple(int(s) for s in expected_major_minor.split("."))
                actual_tuple = tuple(int(s) for s in actual_major_minor.split("."))
                compiler_is_older = actual_tuple < expected_tuple
            except ValueError:
                compiler_is_older = True  # Assume outdated if version is unparseable
            if compiler_is_older:
                warning_type = "compiler_outdated"
                warning = (
                    f"This plugin was built for viv-compiler {expected_major_minor}.x, "
                    f"but the installed compiler is viv-compiler {__version__}. "
                    f"To update the compiler, run: "
                    f"{sys.executable} -m pip install --upgrade viv-compiler"
                )
            else:
                warning_type = "plugin_outdated"
                warning = (
                    f"The installed compiler is viv-compiler {__version__}, "
                    f"but your installed JetBrains plugin was built for viv-compiler {expected_major_minor}.x. "
                    f"To resolve this, update this plugin to its latest version."
                )

    source_path = Path(args.source)
    output_path = Path(args.output) if args.output else None

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
    except VivParseError as parse_error:
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
