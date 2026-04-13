"""Test the Viv compiler CLI entry point."""

import json
import subprocess
import sys
from pathlib import Path

from .conftest import (
    INVALID_FIXTURES_SEMANTICS_SUBDIR,
    INVALID_FIXTURES_SYNTAX_SUBDIR,
    VALID_FIXTURES_SUBDIR,
    VALID_INCLUDES_SUBDIR,
)

# Base command to invoke the Viv compiler CLI
VIVC = [sys.executable, "-m", "viv_compiler.cli"]


def test_cli_compile_minimal_action() -> None:
    """Run the <minimal_action> fixture through the CLI."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv")],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0


def test_cli_print_flag() -> None:
    """Run the `-p` flag to print JSON to `stdout`."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-p"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    # If the output parses as valid JSON, the flag works
    json.loads(result.stdout)


def test_cli_print_with_filter() -> None:
    """Run the `-p` flag with a section filter."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-p", "actions"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    # The filter should yield valid JSON keyed by action name
    assert "greet" in json.loads(result.stdout)


def test_cli_list_flag() -> None:
    """Run the `-l` flag to list compiled actions."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "multiple_actions.viv"), "-l"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert "wave" in result.stderr
    assert "nod" in result.stderr
    assert "shrug" in result.stderr


def test_cli_output_to_file(tmp_path: Path) -> None:
    """Run the `-o` flag to write compiled output to a file."""
    output_file = tmp_path / "output.json"
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-o", str(output_file)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    # The output file should contain valid JSON
    json.loads(output_file.read_text())


def test_cli_print_with_invalid_filter() -> None:
    """Run the `-p` flag with a nonexistent filter path."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-p", "nonexistent.path"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0


def test_cli_output_to_nonexistent_directory() -> None:
    """Run the `-o` flag with a nonexistent parent directory."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-o", "/no/such/dir/out.json"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0


def test_cli_output_path_is_directory(tmp_path: Path) -> None:
    """Run the `-o` flag with an existing directory rather than a file path."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-o", str(tmp_path)],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    # Should surface a friendly compile error, not an internal compiler error
    assert "Internal compiler error" not in result.stderr
    assert "directory" in result.stderr


def test_cli_output_path_with_viv_extension(tmp_path: Path) -> None:
    """Run the `-o` flag with a `.viv` output path (almost certainly a typo)."""
    output_file = tmp_path / "output.viv"
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-o", str(output_file)],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "Internal compiler error" not in result.stderr
    assert ".viv" in result.stderr
    # The file should not have been created
    assert not output_file.exists()


def test_cli_output_path_equals_input_path(tmp_path: Path) -> None:
    """Run the `-o` flag pointing at the same path as `-i` (would clobber the source)."""
    source_path = tmp_path / "source.txt"
    source_path.write_text((VALID_FIXTURES_SUBDIR / "minimal_action.viv").read_text())
    original_contents = source_path.read_text()
    result = subprocess.run(
        [*VIVC, "-i", str(source_path), "-o", str(source_path)],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "Internal compiler error" not in result.stderr
    # The source file should not have been clobbered
    assert source_path.read_text() == original_contents


def test_cli_syntax_error_exits_nonzero() -> None:
    """Run the <syntax_error> fixture and expect a nonzero exit."""
    result = subprocess.run(
        [*VIVC, "-i", str(INVALID_FIXTURES_SYNTAX_SUBDIR / "syntax_error.viv")],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0


def test_cli_missing_input_file() -> None:
    """Run the CLI with a nonexistent input path."""
    result = subprocess.run(
        [*VIVC, "-i", "/nonexistent/path/to/file.viv"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0


def test_cli_no_arguments() -> None:
    """Run the CLI with no arguments."""
    result = subprocess.run(
        VIVC,
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0


def test_cli_smoke_test_flag() -> None:
    """Run the `--test` smoke test flag."""
    result = subprocess.run(
        [*VIVC, "--test"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0


def test_cli_traceback_flag() -> None:
    """Run the `--traceback` flag on a file with a compile error to confirm traceback output."""
    result = subprocess.run(
        [*VIVC, "-i", str(INVALID_FIXTURES_SEMANTICS_SUBDIR / "duplicate_action_name.viv"), "--traceback"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "Traceback" in result.stderr


def test_cli_version_flag() -> None:
    """Run the `-V` version flag."""
    result = subprocess.run(
        [*VIVC, "-V"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert result.stdout.strip() != ""


def test_cli_quiet_flag_suppresses_output(tmp_path: Path) -> None:
    """Run the `-q` flag and confirm it suppresses status output on success."""
    output_file = tmp_path / "output.json"
    result = subprocess.run(
        [*VIVC, "-q", "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "-o", str(output_file)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert result.stderr == ""
    # The output file should still be written
    json.loads(output_file.read_text())


def test_cli_quiet_flag_preserves_errors() -> None:
    """Run the `-q` flag on a bad input and confirm errors still print."""
    result = subprocess.run(
        [*VIVC, "-q", "-i", "/nonexistent/path/to/file.viv"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert result.stderr != ""


# --string flag tests


MINIMAL_ACTION = 'action greet:\n    roles:\n        @greeter:\n            as: initiator'


def test_cli_string_compiles() -> None:
    """Compile a minimal action via the --string flag."""
    result = subprocess.run(
        [*VIVC, "-s", MINIMAL_ACTION],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert "Compilation succeeded" in result.stderr


def test_cli_string_shows_preview() -> None:
    """The --string status message shows a preview of the source."""
    result = subprocess.run(
        [*VIVC, "-s", MINIMAL_ACTION],
        capture_output=True,
        text=True,
    )
    assert "Compiling from source string:" in result.stderr
    assert '"action greet:' in result.stderr


def test_cli_string_with_error() -> None:
    """A syntax error via --string exits nonzero."""
    result = subprocess.run(
        [*VIVC, "-s", "action broken:\n    not valid"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "Compilation failed" in result.stderr


def test_cli_string_with_print_flag() -> None:
    """The -p flag works with --string."""
    result = subprocess.run(
        [*VIVC, "-s", MINIMAL_ACTION, "-p", "actions"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert "greet" in json.loads(result.stdout)


def test_cli_string_with_entry_dir() -> None:
    """The --entry-dir flag resolves includes when using --string."""
    code = 'include "basic_included.viv"\n\n' + MINIMAL_ACTION
    result = subprocess.run(
        [*VIVC, "-s", code, "--entry-dir", str(VALID_INCLUDES_SUBDIR)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0


def test_cli_string_and_input_mutually_exclusive() -> None:
    """The --string and --input flags cannot be used together."""
    result = subprocess.run(
        [*VIVC, "-s", MINIMAL_ACTION, "-i", "some_file.viv"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0


def test_cli_entry_dir_requires_string() -> None:
    """The --entry-dir flag is rejected without --string."""
    result = subprocess.run(
        [*VIVC, "-i", str(VALID_FIXTURES_SUBDIR / "minimal_action.viv"), "--entry-dir", "/tmp"],
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "--entry-dir" in result.stderr
