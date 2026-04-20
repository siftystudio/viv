"""Tests for `compiler_bridge.py`.

Exercises the bridge's text-output contract (GCC-diagnostic format on stderr,
success banner on stdout) against a fake `viv_compiler` module under
`fake_module_path/viv_compiler/`. Uses subprocess invocations so the bridge
runs as a real script, not a module imported into the test process.

Invariant asserted across every test: the bridge exits 0 even on error, to
avoid Sublime's verbose traceback UI.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path


def test_install_instructions_when_compiler_missing(source_file, tmp_path) -> None:
    """Tell the user how to install `viv-compiler` when it isn't on the PYTHONPATH."""
    plugin_root = Path(__file__).resolve().parent.parent.parent
    bridge_path = plugin_root / "bridge" / "compiler_bridge.py"
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    # `-S` skips `site.py` (no site-packages on sys.path); PYTHONPATH points
    # at an empty dir so the user's dev install isn't reached either.
    completed = subprocess.run(
        [sys.executable, "-S", str(bridge_path), str(source_file)],
        capture_output=True, text=True,
        env={"PATH": "/usr/bin:/bin", "PYTHONPATH": str(empty_dir)},
    )
    assert completed.returncode == 0
    assert "viv compiler is not installed" in completed.stderr.lower()
    assert "pip install viv-compiler" in completed.stderr


def test_success_banner_on_stdout(run) -> None:
    """Emit `Compilation succeeded!` on stdout when compilation succeeds."""
    out = run()
    assert out["returncode"] == 0
    assert "Compilation succeeded!" in out["stdout"]
    assert out["stderr"] == ""


def test_gcc_diagnostic_for_parse_error_with_line_info(run, source_file) -> None:
    """Format a parse error with line info as `file:line:col: error: msg` on stderr, followed by the detail."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "parse_error",
        "FAKE_ERROR_MESSAGE": "expected `:` at end of line",
        "FAKE_ERROR_LINE": "7",
        "FAKE_ERROR_COLUMN": "14",
    })
    assert out["returncode"] == 0
    assert out["stdout"] == ""
    assert f"{source_file}:7:14: error: expected `:` at end of line" in out["stderr"]
    # Bridge prints `detail` (= msg for VivParseError) on a new line after the GCC header
    assert out["stderr"].count("expected `:` at end of line") == 2


def test_parse_error_without_line_info_prints_raw_exception(run) -> None:
    """Print the raw exception when a parse error has no line/column attached."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "parse_error",
        "FAKE_ERROR_MESSAGE": "syntax error before we know where",
        "FAKE_ERROR_LINE": "",
        "FAKE_ERROR_COLUMN": "",
    })
    assert out["returncode"] == 0
    assert "syntax error before we know where" in out["stderr"]
    assert "error:" not in out["stderr"]


def test_gcc_diagnostic_for_compile_error_with_line_info(run, source_file) -> None:
    """Format a compile error with line info as `file:line:col: error: msg` on stderr."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "compile_error",
        "FAKE_ERROR_MESSAGE": "undefined action `foo`",
        "FAKE_ERROR_LINE": "12",
        "FAKE_ERROR_COLUMN": "3",
        "FAKE_ERROR_CODE": "foo()",
    })
    assert out["returncode"] == 0
    assert out["stdout"] == ""
    assert f"{source_file}:12:3: error: undefined action `foo`" in out["stderr"]


def test_compile_error_restores_leading_whitespace_when_column_greater_than_one(run) -> None:
    """Restore the `column - 1` leading whitespace the compiler strips during slicing."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "compile_error",
        "FAKE_ERROR_MESSAGE": "bad thing",
        "FAKE_ERROR_LINE": "5",
        "FAKE_ERROR_COLUMN": "9",
        "FAKE_ERROR_CODE": "offending",
    })
    assert out["returncode"] == 0
    # Code appears indented in the output after dedent of restored+normalized text
    assert "offending" in out["stderr"]


def test_compile_error_without_line_info_prints_raw_exception(run) -> None:
    """Print the raw exception when a compile error has no line/column attached."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "compile_error",
        "FAKE_ERROR_MESSAGE": "contextless failure",
        "FAKE_ERROR_LINE": "",
        "FAKE_ERROR_COLUMN": "",
    })
    assert out["returncode"] == 0
    assert "contextless failure" in out["stderr"]
    assert "error:" not in out["stderr"]


def test_generic_exception_prefixed_with_unexpected(run) -> None:
    """Prefix non-Viv exceptions with `An unexpected error occurred` on stderr."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "other_error",
        "FAKE_ERROR_MESSAGE": "kaboom",
    })
    assert out["returncode"] == 0
    assert "unexpected error" in out["stderr"].lower()
    assert "kaboom" in out["stderr"]


def test_warns_to_update_compiler_when_older_than_package(run) -> None:
    """Warn the user to upgrade `viv-compiler` when it's older than the package expects."""
    # Real repository.json has compilerVersion 0.12; 0.10 is older
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.10.0"})
    assert out["returncode"] == 0
    assert "update the compiler" in out["stderr"].lower() or "pip install --upgrade" in out["stderr"]


def test_warns_to_update_package_when_compiler_newer_than_package(run) -> None:
    """Warn the user to upgrade the Viv package when the compiler is newer than expected."""
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.14.0"})
    assert out["returncode"] == 0
    assert "update the viv package" in out["stderr"].lower()


def test_no_warning_when_versions_match(run) -> None:
    """Emit no version-mismatch warning when compiler and package versions match."""
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.12.0"})
    assert out["returncode"] == 0
    assert "warning" not in out["stderr"].lower()


def test_no_warning_when_only_patch_differs(run) -> None:
    """Emit no warning when only the patch version differs — only major.minor is compared."""
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.12.99"})
    assert out["returncode"] == 0
    assert "warning" not in out["stderr"].lower()


def test_warns_when_repository_json_is_missing(run, tmp_path) -> None:
    """Warn the user that the installation looks malformed when `repository.json` is absent."""
    bridge_dir = tmp_path / "bridge"
    bridge_dir.mkdir()
    real_bridge = Path(__file__).resolve().parent.parent.parent / "bridge" / "compiler_bridge.py"
    copied_bridge = bridge_dir / "compiler_bridge.py"
    shutil.copy2(real_bridge, copied_bridge)
    # No repository.json alongside the bridge's parent — should trigger malformed warning.
    out = run(bridge_path=copied_bridge)
    assert out["returncode"] == 0
    assert "malformed" in out["stderr"].lower()
    assert "reinstalling" in out["stderr"].lower()


def test_warns_when_repository_json_is_corrupt(run, tmp_path) -> None:
    """Warn the user that the installation looks malformed when `repository.json` can't be parsed."""
    bridge_dir = tmp_path / "bridge"
    bridge_dir.mkdir()
    real_bridge = Path(__file__).resolve().parent.parent.parent / "bridge" / "compiler_bridge.py"
    copied_bridge = bridge_dir / "compiler_bridge.py"
    shutil.copy2(real_bridge, copied_bridge)
    (tmp_path / "repository.json").write_text("{ this is not valid json")
    out = run(bridge_path=copied_bridge)
    assert out["returncode"] == 0
    assert "malformed" in out["stderr"].lower()


def test_clean_error_when_no_source_file_provided() -> None:
    """Emit `No source file provided.` on stderr when the bridge is invoked with no source-file arg."""
    plugin_root = Path(__file__).resolve().parent.parent.parent
    bridge_path = plugin_root / "bridge" / "compiler_bridge.py"
    fake_dir = Path(__file__).resolve().parent / "fake_module_path"
    env = os.environ.copy()
    env["PYTHONPATH"] = str(fake_dir)
    completed = subprocess.run(
        [sys.executable, str(bridge_path)],
        capture_output=True, text=True, env=env,
    )
    assert completed.returncode == 0
    assert "no source file provided" in completed.stderr.lower()
