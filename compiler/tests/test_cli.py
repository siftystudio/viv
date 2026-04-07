"""Test the Viv compiler CLI entry point."""

import json
import subprocess
import sys
from pathlib import Path

from .conftest import (
    INVALID_FIXTURES_SEMANTICS_SUBDIR,
    INVALID_FIXTURES_SYNTAX_SUBDIR,
    VALID_FIXTURES_SUBDIR,
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
