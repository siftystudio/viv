"""Command‑line interface (CLI) for the Viv compiler."""

__all__ = ["main"]

import os
import sys
import json
import argparse
import traceback
from contextlib import contextmanager
from importlib import resources
from pathlib import Path
from typing import Any

from viv_compiler import (
    __version__,
    __schema_version__,
    __grammar_version__,
    api,
    config,
    errors,
    external_types
)


def main() -> None:
    """Command-line interface (CLI) for the Viv DSL compiler."""
    # Build the parser for command-line arguments
    command_line_parser = _build_parser()
    # Parse the command-line arguments
    args = command_line_parser.parse_args()
    # The `--entry-dir` flag is only meaningful with `--string` (it sets an anchor for resolving includes)
    if args.entry_dir and not args.string:
        command_line_parser.error("--entry-dir can only be used with --string")
    # If the user has requested compiler version numbers, print them and exit
    if args.version:
        _print_versions()
        sys.exit(0)
    with _handle_compiler_errors(show_traceback=args.traceback):
        # If test mode is engaged, invoke the compiler on a test file and exit
        if args.test:
            _run_smoke_test()
            sys.exit(0)
        # Otherwise, it's showtime, so let's invoke the compiler
        compiled_content_bundle = _invoke_compiler(args=args)
        # If we get to here, compilation succeeded
        if not args.quiet:
            print(_bold(text=_green(text="\n* Compilation succeeded")), file=sys.stderr)
        if args.output:
            path_to_output_file = Path(args.output).expanduser().resolve()
            if path_to_output_file.is_dir():
                raise errors.VivCompileError(
                    f"Output path is a directory, not a file: {path_to_output_file}"
                )
            if path_to_output_file.suffix.lower() == ".viv":
                raise errors.VivCompileError(
                    f"Output path has a `.viv` extension, but the compiler emits JSON content "
                    f"bundles, not Viv source. Refusing to overwrite what looks like a source "
                    f"file: {path_to_output_file}"
                )
            if args.input and path_to_output_file == Path(args.input).expanduser().resolve():
                raise errors.VivCompileError(
                    f"Output path is the same as the input path: {path_to_output_file}. "
                    f"Refusing to overwrite the source file."
                )
            if not path_to_output_file.parent.exists():
                raise errors.VivCompileError(f"Output-file directory does not exist: {path_to_output_file.parent}")
        else:
            path_to_output_file = None
        _emit_results(
            content_bundle=compiled_content_bundle,
            args=args,
            path_to_output_file=path_to_output_file,
            quiet=args.quiet
        )


def _build_parser() -> argparse.ArgumentParser:
    """Build the parser for our command-line arguments.

    Returns:
        A prepared parser for our command-line arguments.
    """
    parser = argparse.ArgumentParser(
        description="Compile a Viv source file (.viv) to produce a content bundle ready for use in a Viv runtime",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument(
        '-V',
        '--version',
        action='store_true',
        help='print compiler versions and associated Python interpreter, and exit'
    )
    mode_group.add_argument(
        '--test',
        action='store_true',
        default=False,
        help='run a simple smoke test to confirm the compiler is installed correctly'
    )
    mode_group.add_argument(
        '-i',
        '--input',
        metavar='PATH',
        type=str,
        help='relative or absolute path to the Viv source file (.viv) to be compiled'
    )
    mode_group.add_argument(
        '-s',
        '--string',
        metavar='CODE',
        type=str,
        help='a string containing (only) Viv source code to compile directly'
    )
    parser.add_argument(
        '-o',
        '--output',
        metavar='PATH',
        type=str,
        default=None,
        help='relative or absolute path to which to write an output file (.json)'
    )
    parser.add_argument(
        '-p',
        '--print',
        metavar='FILTER',
        type=str,
        nargs='?',
        const='',  # Bare `-p` with no argument
        default=None,
        help=(
            "print compiled output, optionally with filter (examples: 'plans', "
            "'plans.plot-revenge', 'plans.plot-revenge.roles.plotter')"
        )
    )
    parser.add_argument(
        '-l',
        '--list',
        action='store_true',
        default=False,
        help='after compilation, list all compiled construct names in console'
    )
    parser.add_argument(
        '--entry-dir',
        metavar='PATH',
        type=str,
        default=None,
        help='directory for resolving include paths when using --string (default: current directory)'
    )
    parser.add_argument(
        '--default-importance',
        metavar='FLOAT',
        type=float,
        default=config.DEFAULT_IMPORTANCE_SCORE,
        help='default importance value to use when one is not specified'
    )
    parser.add_argument(
        '--default-salience',
        metavar='FLOAT',
        type=float,
        default=config.DEFAULT_SALIENCE_SCORE,
        help='default salience value to use when one is not specified'
    )
    parser.add_argument(
        '--default-reaction-priority',
        metavar='FLOAT',
        type=float,
        default=config.DEFAULT_REACTION_PRIORITY_VALUE,
        help='default reaction priority to use when not specified'
    )
    parser.add_argument(
        '--memoization',
        action=argparse.BooleanOptionalAction,
        default=True,
        help='enable/disable memoization in the underlying PEG parser',
    )
    parser.add_argument(
        '--verbose-parser',
        action='store_true',
        default=False,
        help=(
            'engage a verbose debug mode in the underlying PEG parser '
            '(side effect: writes debug files to working directory)'
        )
    )
    parser.add_argument(
        '--traceback',
        action='store_true',
        default=False,
        help='upon a compiler error, log traceback in addition to the error message'
    )
    parser.add_argument(
        '-q',
        '--quiet',
        action='store_true',
        default=False,
        help='suppress status output on success (errors will still be printed)'
    )
    return parser


def _print_versions() -> None:
    """Print version numbers for the compiler package, content-bundle schema, and DSL grammar,
    plus the absolute path of the Python interpreter running the compiler.

    The idea here is to support programmatic use, namely by the editor plugins during
    automatic detection of which Python interpreter to invoke.
    """
    lines = (
        f"vivc {__version__}",
        f"schema {__schema_version__}",
        f"grammar {__grammar_version__}",
        f"python {sys.executable}"
    )
    print("\n".join(lines))


def _run_smoke_test() -> None:
    """Runs a smoke test to confirm that the Viv compiler installation appears to be functioning.

    Side Effects:
        The results are printed out to `stderr`.
    """
    print(_cyan(text="\n* Compiling sample file..."), file=sys.stderr)
    with resources.as_file(resources.files("viv_compiler._samples") / "smoke-test.viv") as sample_path:
        api.compile_from_path(source_file_path=sample_path)
        print(_bold(text=_green(text="\n* Smoke test passed")), file=sys.stderr)
        print(_green(text="\n* Viv compiler installation is operational\n"), file=sys.stderr)


def _invoke_compiler(*, args: argparse.Namespace) -> external_types.ContentBundle:
    """Invokes the compiler on the user's specified source code, with their specified configuration settings.

    The source code may be specified via a file path (via `--input`) or directly as a string (via `--string`).

    Args:
        args: Parsed command-line arguments.

    Returns:
        The compiled content bundle, if compilation succeeds.
    """
    if args.string:
        if not args.quiet:
            preview = args.string[:20].replace('\n', ' ')
            print(_cyan(text=f'\n* Compiling from source string: "{preview}..."'), file=sys.stderr)
        entry_dir = Path(args.entry_dir).expanduser() if args.entry_dir else None
        compiled_content_bundle = api.compile_from_string(
            source_code=args.string,
            entry_dir=entry_dir,
            default_importance=args.default_importance,
            default_salience=args.default_salience,
            default_reaction_priority=args.default_reaction_priority,
            use_memoization=args.memoization,
            verbose_parser=args.verbose_parser,
        )
    else:
        source_file_path = Path(args.input).expanduser().resolve()
        if not args.quiet:
            print(_cyan(text=f"\n* Compiling source file: {source_file_path.name}"), file=sys.stderr)
        compiled_content_bundle = api.compile_from_path(
            source_file_path=source_file_path,
            default_importance=args.default_importance,
            default_salience=args.default_salience,
            default_reaction_priority=args.default_reaction_priority,
            use_memoization=args.memoization,
            verbose_parser=args.verbose_parser,
        )
    return compiled_content_bundle


@contextmanager
def _handle_compiler_errors(*, show_traceback: bool):
    """Context manager that catches and formats compiler errors for CLI output."""
    # User interrupts
    try:
        yield
    except KeyboardInterrupt:
        sys.exit(130)
    except BrokenPipeError:
        # noinspection PyBroadException
        try:
            sys.stderr.close()
        except Exception:
            pass
        sys.exit(1)
    # Parsing errors
    except errors.VivParseError as parse_error:
        print(_bold(text=_red(text=f"\n* Compilation failed:")), file=sys.stderr)
        print(_red(text=f"\n{parse_error}\n"), file=sys.stderr)
        sys.exit(1)
    # Compilation errors
    except errors.VivCompileError as compile_error:
        if show_traceback:
            traceback_str = "".join(
                traceback.format_exception(type(compile_error), compile_error, compile_error.__traceback__)
            )
            print(_yellow(text=f"\n{traceback_str}"), file=sys.stderr)
        print(_bold(text=_red(text=f"\n* Compilation failed:")), file=sys.stderr)
        print(_red(text=f"\n{compile_error}\n"), file=sys.stderr)
        if show_traceback:
            print(_red(text=f"Scroll up for the full traceback.\n"), file=sys.stderr)
        sys.exit(1)
    # Some kind of unexpected error
    except Exception as internal_error:
        traceback_str = "".join(
            traceback.format_exception(type(internal_error), internal_error, internal_error.__traceback__)
        )
        print(_red(text=f"\n{traceback_str}"), file=sys.stderr)
        print(_bold(text=_red(text="\n* Internal compiler error! This is a bug; please report it.\n")), file=sys.stderr)
        sys.exit(1)


def _emit_results(
    *,
    content_bundle: external_types.ContentBundle,
    args: argparse.Namespace,
    path_to_output_file: Path | None,
    quiet: bool = False
) -> None:
    """Emits the compiled content bundle according to the user's specified output parameters.

    Args:
        content_bundle: A compiled content bundle.
        args: Parsed command-line arguments.
        path_to_output_file: Relative or absolute path to which to write an output file.
        quiet: Whether to suppress status output (errors will still be printed).

    Side Effects:
        The results are written to file and/or printed to `stderr` and `stdout`, depending on user parameters.
    """
    # If we're to print out the result, let's do so now, via `stdout` (with headers piped to `stderr`)
    if args.print is not None:
        output_filter: str = args.print.strip()
        if output_filter:
            try:
                output = _resolve_output_filter_path(content_bundle=content_bundle, path=output_filter)
            except (KeyError, IndexError, ValueError):
                error_message = f"* Invalid print filter: '{output_filter}' is not a valid path in the content bundle"
                print(_bold(text=_red(text=f"\n{error_message}\n")), file=sys.stderr)
                sys.exit(1)
        else:
            output = content_bundle
        if not quiet:
            print(_cyan(text=f"\n* Output{' (filtered)' if output_filter else ''}: \n"), file=sys.stderr)
        sys.stdout.write(f"{json.dumps(output, indent=2, sort_keys=True)}\n")
    # If we're to list out the compiled actions, let's do so now. We'll only write to `stderr`,
    # since the API should be used if a user wants to programmatically gather this list.
    if args.list:
        _list_compiled_constructs(content_bundle=content_bundle)
    # If an output file path has been provided, write the output file to the specified path
    if path_to_output_file:
        with open(path_to_output_file, "w", encoding="utf-8") as outfile:
            outfile.write(json.dumps(content_bundle, ensure_ascii=False, sort_keys=True))
        if not quiet:
            print(_cyan(text=f"\n* Wrote output to file: {path_to_output_file}\n"), file=sys.stderr)
    else:
        if not quiet:
            print(_cyan(text=f"\n* No output file specified\n"), file=sys.stderr)


def _resolve_output_filter_path(*, content_bundle: external_types.ContentBundle, path: str) -> Any:
    """Resolve a dot-notation path into a JSON-like structure.

    Args:
        content_bundle: The content bundle serving as the root structure to traverse.
        path: A dot-separated path (e.g., 'plans.foobar.phases').

    Returns:
        The value at the given path.

    Raises:
        KeyError: A segment of the path does not exist.
    """
    data: Any = dict(content_bundle)
    for segment in path.split("."):
        if isinstance(data, dict):
            data = data[segment]
        elif isinstance(data, list):
            data = data[int(segment)]
        else:
            raise KeyError(segment)
    return data


def _list_compiled_constructs(*, content_bundle: external_types.ContentBundle) -> None:
    """Logs all the constructs contained in the given compiled content bundle.

    Note: We only write to `stderr` here. The API should be used if a user wants
    to programmatically gather this list.

    Args:
        content_bundle: A compiled content bundle.

    Side Effects:
        The constructs are logged to `stderr`.
    """
    _print_compiled_constructs_list_block(
        block_label="Actions",
        construct_names=sorted(content_bundle["actions"])
    )
    _print_compiled_constructs_list_block(
        block_label="Action selectors",
        construct_names=sorted(content_bundle["actionSelectors"])
    )
    _print_compiled_constructs_list_block(
        block_label="Plans",
        construct_names=sorted(content_bundle["plans"])
    )
    _print_compiled_constructs_list_block(
        block_label="Plan selectors",
        construct_names=sorted(content_bundle["planSelectors"])
    )
    _print_compiled_constructs_list_block(
        block_label="Queries",
        construct_names=sorted(content_bundle["queries"])
    )
    _print_compiled_constructs_list_block(
        block_label="Sifting patterns",
        construct_names=sorted(content_bundle["siftingPatterns"])
    )
    _print_compiled_constructs_list_block(
        block_label="Tropes",
        construct_names=sorted(content_bundle["tropes"])
    )


def _print_compiled_constructs_list_block(*, block_label: str, construct_names: list[str]) -> None:
    """Print a block listing the given construct names.

    Args:
        block_label: A label for the block, identifying the construct type.
        construct_names: The names of the constructs to include in the block, if any, else an empty list.

    Side Effects:
        The construct block is logged to `stderr`.
    """
    if not construct_names:
        print(_dim(text=f"\n* {block_label} ({len(construct_names)})"), file=sys.stderr)
        return
    print(_cyan(text=f"\n* {block_label} ({len(construct_names)}):\n"), file=sys.stderr)
    print("\n".join(f"  - {construct_name}" for construct_name in construct_names), file=sys.stderr)


def _styled(*, text: str, code: str) -> str:
    """Wrap text in an ANSI escape code, respecting terminal and NO_COLOR conventions.

    Args:
        text: The text to style.
        code: An SGR parameter string.

    Returns:
        The styled text, if the environment supports styling, else the original text.
    """
    if not sys.stderr.isatty() or os.environ.get("NO_COLOR") is not None:
        return text
    return f"\033[{code}m{text}\033[0m"


def _dim(*, text: str) -> str:
    """Return the given string styled as dim text, if the environment supports it.

    Args:
        text: The text to style.

    Returns:
        The styled text, if the environment supports styling, else the original text.
    """
    return _styled(text=text, code="2")


def _red(*, text: str) -> str:
    """Return the given string styled as red text, if the environment supports it.

    Args:
        text: The text to style.

    Returns:
        The styled text, if the environment supports styling, else the original text.
    """
    return _styled(text=text, code="31")


def _green(*, text: str) -> str:
    """Return the given string styled as green text, if the environment supports it.

    Args:
        text: The text to style.

    Returns:
        The styled text, if the environment supports styling, else the original text.
    """
    return _styled(text=text, code="32")


def _yellow(*, text: str) -> str:
    """Return the given string styled as yellow text, if the environment supports it.

    Args:
        text: The text to style.

    Returns:
        The styled text, if the environment supports styling, else the original text.
    """
    return _styled(text=text, code="33")


def _cyan(*, text: str) -> str:
    """Return the given string styled as cyan text, if the environment supports it.

    Args:
        text: The text to style.

    Returns:
        The styled text, if the environment supports styling, else the original text.
    """
    return _styled(text=text, code="36")


def _bold(*, text: str) -> str:
    """Return the given string styled as boldface text, if the environment supports it.

    Args:
        text: The text to style.

    Returns:
        The styled text, if the environment supports styling, else the original text.
    """
    return _styled(text=text, code="1")


if __name__ == "__main__":
    main()
