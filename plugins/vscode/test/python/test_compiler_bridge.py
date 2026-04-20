"""Tests for `compiler_bridge.py`.

Exercises the bridge's JSON contract against a fake `viv_compiler` module
(under `fake_module_path/viv_compiler/`). Uses subprocess invocations so the
bridge runs as a real script, not a module imported into the test process.
"""

import json
import os
import subprocess
import sys
from pathlib import Path


def test_not_installed_json_when_compiler_missing(source_file, tmp_path) -> None:
    """Emit a structured `not_installed` error when `viv_compiler` is not on the PYTHONPATH."""
    plugin_root = Path(__file__).resolve().parent.parent.parent
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    # `-S` skips site.py entirely (no site-packages on sys.path); PYTHONPATH
    # points at an empty dir so the user's dev install isn't reached either.
    completed = subprocess.run(
        [sys.executable, "-S", str(plugin_root / "compiler_bridge.py"), str(source_file)],
        capture_output=True, text=True,
        env={"PATH": "/usr/bin:/bin", "PYTHONPATH": str(empty_dir)},
    )
    assert completed.returncode == 1
    result = json.loads(completed.stdout)
    assert result["status"] == "error"
    assert result["errorType"] == "not_installed"
    assert "install" in result["message"].lower()


def test_success_json_with_sorted_constructs(run) -> None:
    """Emit success JSON with constructs sorted alphabetically within each category."""
    bundle = {
        "actions": ["zebra", "alpha"],
        "actionSelectors": [],
        "plans": ["gamma", "beta"],
        "planSelectors": [],
        "queries": [],
        "siftingPatterns": [],
        "tropes": [],
    }
    out = run(env={"FAKE_VIV_COMPILER_BUNDLE_JSON": json.dumps(bundle)})
    assert out["returncode"] == 0
    assert out["result"]["status"] == "success"
    assert out["result"]["constructs"]["actions"] == ["alpha", "zebra"]
    assert out["result"]["constructs"]["plans"] == ["beta", "gamma"]


def test_all_seven_construct_categories_present(run) -> None:
    """Emit all seven construct categories, even when all are empty."""
    out = run()
    assert out["returncode"] == 0
    constructs = out["result"]["constructs"]
    for key in ("actions", "actionSelectors", "plans", "planSelectors",
               "queries", "siftingPatterns", "tropes"):
        assert key in constructs


def test_writes_bundle_to_disk_when_output_path_provided(run, output_file, source_file) -> None:
    """Write the bundle to disk when an output-path arg is provided."""
    out = run(extra_args=[str(output_file)])
    assert out["returncode"] == 0
    assert output_file.exists()
    bundle = json.loads(output_file.read_text())
    assert "actions" in bundle
    assert out["result"]["outputPath"] == str(output_file)
    assert out["result"]["entryFile"] == str(source_file)


def test_omits_entry_and_output_path_when_no_third_arg(run) -> None:
    """Omit `entryFile` and `outputPath` from the result when no output-path arg is provided."""
    out = run()
    assert out["returncode"] == 0
    assert "outputPath" not in out["result"]
    assert "entryFile" not in out["result"]


def test_compiler_outdated_warning_when_compiler_is_older(run) -> None:
    """Emit a `compiler_outdated` warning when the compiler is older than the plugin expects."""
    # Plugin's compilerVersion is 0.12 per package.json; 0.10 is older
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.10.0"})
    assert out["result"]["status"] == "success"
    assert out["result"]["warningType"] == "compiler_outdated"
    assert "update the compiler" in out["result"]["warning"]


def test_plugin_outdated_warning_when_compiler_is_newer(run) -> None:
    """Emit a `plugin_outdated` warning when the compiler is newer than the plugin expects."""
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.14.0"})
    assert out["result"]["status"] == "success"
    assert out["result"]["warningType"] == "plugin_outdated"
    assert "update the viv extension" in out["result"]["warning"].lower()


def test_no_warning_when_versions_match(run) -> None:
    """Emit no warning when compiler and plugin versions match."""
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.12.0"})
    assert "warning" not in out["result"]
    assert "warningType" not in out["result"]


def test_no_warning_when_only_patch_differs(run) -> None:
    """Emit no warning when only the patch version differs."""
    # Major.minor matches; patch differs
    out = run(env={"FAKE_VIV_COMPILER_VERSION": "0.12.99"})
    assert "warning" not in out["result"]


def test_parse_error_json_shape(run, source_file) -> None:
    """Emit structured error JSON for a parse error, including line, column, message, and code."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "parse_error",
        "FAKE_ERROR_MESSAGE": "expected `:` at end of line",
        "FAKE_ERROR_LINE": "7",
        "FAKE_ERROR_COLUMN": "14",
        "FAKE_ERROR_CODE": "action hello",
    })
    assert out["returncode"] == 1
    assert out["result"]["status"] == "error"
    assert out["result"]["line"] == 7
    assert out["result"]["column"] == 14
    assert out["result"]["message"] == "expected `:` at end of line"
    assert out["result"]["code"] == "action hello"
    assert out["result"]["file"] == str(source_file)


def test_compile_error_full_range(run) -> None:
    """Emit structured error JSON with a full line/column range for a compile error."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "compile_error",
        "FAKE_ERROR_MESSAGE": "undefined action `foo`",
        "FAKE_ERROR_LINE": "12",
        "FAKE_ERROR_COLUMN": "3",
        "FAKE_ERROR_END_LINE": "12",
        "FAKE_ERROR_END_COLUMN": "15",
    })
    assert out["returncode"] == 1
    assert out["result"]["status"] == "error"
    assert out["result"]["line"] == 12
    assert out["result"]["column"] == 3
    assert out["result"]["endLine"] == 12
    assert out["result"]["endColumn"] == 15


def test_compile_error_includes_warning_when_versions_mismatch(run) -> None:
    """Attach a version-mismatch warning to a compile error when versions diverge."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "compile_error",
        "FAKE_VIV_COMPILER_VERSION": "0.10.0",
    })
    assert out["result"]["status"] == "error"
    assert "warning" in out["result"]
    assert out["result"]["warningType"] == "compiler_outdated"


def test_generic_error_prefixed_with_unexpected(run) -> None:
    """Prefix non-Viv errors with `Unexpected` in the user-facing message."""
    out = run(env={
        "FAKE_VIV_COMPILER_BEHAVIOR": "other_error",
        "FAKE_ERROR_MESSAGE": "kaboom",
    })
    assert out["returncode"] == 1
    assert out["result"]["status"] == "error"
    assert "unexpected" in out["result"]["message"].lower()
    assert "kaboom" in out["result"]["message"]


def test_missing_source_arg_emits_clean_error() -> None:
    """Emit a clean structured error when the bridge is invoked with no source-file arg."""
    plugin_root = Path(__file__).resolve().parent.parent.parent
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path(__file__).resolve().parent / "fake_module_path")
    completed = subprocess.run(
        [sys.executable, str(plugin_root / "compiler_bridge.py")],
        capture_output=True, text=True, env=env,
    )
    assert completed.returncode == 1
    result = json.loads(completed.stdout)
    assert result["status"] == "error"
    assert "no source file" in result["message"].lower()
