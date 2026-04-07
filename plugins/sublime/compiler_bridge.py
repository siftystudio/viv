"""Bridge script for invoking the Viv compiler in the Viv Sublime Text package."""

import json
import sys
import textwrap
from pathlib import Path


def main():
    """Compile a Viv source file, and print the result.

    If compilation results in an error with source-code annotations, we'll construct an error
    message in GCC diagnostic format (`file:line:column: severity: message`), which Sublime
    can parse and stylize as a clickable link to the offending source position.

    Note: We want to avoid exiting with a nonzero exit code here, because doing so will
    trigger Sublime's verbose error traceback. Instead, we'll just print out the error
    message and leave it at that.
    """
    # Attempt to import the compiler. If it's not installed, issue an error message.
    try:
        from viv_compiler import __version__, compile_from_path, VivCompileError, VivParseError
    except ImportError:
        print(
            "Viv compiler is not installed on the Sublime Text Python. To install it, run this command "
            f"in your terminal: {sys.executable} -m pip install viv-compiler",
            file=sys.stderr
        )
        return
    # Issue a warning if the compiler version is unexpected
    try:
        package_metadata = json.loads(
            (Path(__file__).parent / "repository.json").read_text(encoding="utf-8")
        )["packages"][0]
        expected_compiler_version_major_minor = ".".join(package_metadata["compilerVersion"].split(".")[:2])
        actual_compiler_version_major_minor = ".".join(__version__.split(".")[:2])
        if expected_compiler_version_major_minor != actual_compiler_version_major_minor:
            expected_tuple = tuple(int(segment) for segment in expected_compiler_version_major_minor.split("."))
            actual_tuple = tuple(int(segment) for segment in actual_compiler_version_major_minor.split("."))
            if actual_tuple < expected_tuple:
                # Compiler is older than what the package expects -- prompt to update compiler
                print(
                    f"Warning: This package was built for viv-compiler {expected_compiler_version_major_minor}.x, "
                    f"but the installed compiler is viv-compiler {__version__}. Syntax highlighting and/or "
                    f"compilation may be affected. To update the compiler, run this command in your terminal: "
                    f"{sys.executable} -m pip install --upgrade viv-compiler\n",
                    file=sys.stderr
                )
            else:
                # Package is older than the installed compiler -- prompt to update package
                print(
                    f"Warning: The installed compiler is viv-compiler {__version__}, "
                    f"but this package was built for viv-compiler {expected_compiler_version_major_minor}.x. "
                    f"Syntax highlighting and/or compilation may be affected. To resolve this issue, "
                    f"update the Viv package to its latest version.\n",
                    file=sys.stderr
                )
    except (FileNotFoundError, json.JSONDecodeError, KeyError, IndexError):  # Missing or malformed `repository.json`
        print(
            "Warning: Your package installation appears to be malformed. Basic functionality may be compromised. "
            "Try reinstalling via Package Control.\n",
            file=sys.stderr
        )
    # Treat the present file as the entry file, compile it, and report back with a result
    if len(sys.argv) < 2:
        print("No source file provided.", file=sys.stderr)
        return
    path_to_entry_file = Path(sys.argv[1])
    try:
        compile_from_path(source_file_path=path_to_entry_file)
        print("Compilation succeeded!\n")
    except VivParseError as parse_err:  # Must be caught before its parent class, VivCompileError
        if parse_err.line is None:  # If line is present, so are file and column
            print(parse_err, file=sys.stderr)
            return
        error_message = f"{parse_err.file_path}:{parse_err.line}:{parse_err.column}: error: {parse_err.msg}"
        print(error_message, file=sys.stderr)
        print(f"\n{parse_err.detail}\n", file=sys.stderr)
    except VivCompileError as compile_err:
        if compile_err.line is None:  # If line is present, so are file and column
            print(compile_err, file=sys.stderr)
            return
        error_message = f"{compile_err.file_path}:{compile_err.line}:{compile_err.column}: error: {compile_err.msg}"
        print(error_message, file=sys.stderr)
        if compile_err.code:
            # Restore the first line's leading whitespace (the compiler strips it during slicing)
            restored = " " * (compile_err.column - 1) + compile_err.code
            normalized = textwrap.dedent(restored).strip()
            indented = textwrap.indent(normalized, "    ")
            print(f"\n{indented}\n", file=sys.stderr)
    except Exception as error:
        print(f"An unexpected error occurred:\n\n{error}", file=sys.stderr)


if __name__ == "__main__":
    main()
