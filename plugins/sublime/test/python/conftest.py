"""Shared pytest fixtures for `compiler_bridge.py` tests."""

import os
import subprocess
import sys
from pathlib import Path

import pytest


PLUGIN_ROOT = Path(__file__).resolve().parent.parent.parent
BRIDGE_PATH = PLUGIN_ROOT / "bridge" / "compiler_bridge.py"
FAKE_MODULE_DIR = Path(__file__).resolve().parent / "fake_module_path"  # contains viv_compiler/


def run_bridge(args, env_overrides=None, bridge_path=None):
    """Invoke `compiler_bridge.py` in a subprocess, returning a dict of `returncode`, `stdout`, and `stderr`.

    `bridge_path` overrides the real bridge script — tests needing a custom directory
    layout (e.g., a missing or corrupt `repository.json`) pass a tmp path.
    """
    env = os.environ.copy()
    # Prepend the fake-module dir to PYTHONPATH so `import viv_compiler` resolves
    # to our fake instead of any real viv_compiler installed on the system.
    existing = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = f"{FAKE_MODULE_DIR}{os.pathsep}{existing}" if existing else str(FAKE_MODULE_DIR)
    if env_overrides:
        env.update(env_overrides)
    completed = subprocess.run(
        [sys.executable, str(bridge_path or BRIDGE_PATH), *args],
        capture_output=True,
        text=True,
        env=env,
    )
    return {
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


@pytest.fixture
def source_file(tmp_path):
    """Provide an absolute path to a throwaway .viv source file for tests that don't care about contents."""
    path = tmp_path / "source.viv"
    path.write_text("action hello:\n")
    return path


@pytest.fixture
def run(source_file):
    """Return a callable that invokes the bridge with the source file and optional env overrides."""
    def _run(env=None, extra_args=None, bridge_path=None):
        args = [str(source_file)]
        if extra_args:
            args.extend(extra_args)
        return run_bridge(args, env_overrides=env, bridge_path=bridge_path)
    return _run
