"""Test that the compiler correctly handles Viv `include` declarations."""

import pytest

from viv_compiler import VivCompileError, compile_from_path

from .conftest import INVALID_INCLUDES_SUBDIR, VALID_INCLUDES_SUBDIR


def test_basic_include() -> None:
    """Compile the <basic_entry> fixture and check that included constructs appear."""
    bundle = compile_from_path(source_file_path=VALID_INCLUDES_SUBDIR / "basic_entry.viv")
    assert "greet" in bundle["actions"]
    assert "friends" in bundle["tropes"]


def test_transitive_include() -> None:
    """Compile the <chain_entry> fixture and check that transitively included constructs appear."""
    bundle = compile_from_path(source_file_path=VALID_INCLUDES_SUBDIR / "chain_entry.viv")
    assert "greet" in bundle["actions"]
    assert "wave" in bundle["actions"]
    assert "rivals" in bundle["tropes"]


def test_circular_include() -> None:
    """Compile the <circular_a> fixture and check that circular includes produce each construct once."""
    bundle = compile_from_path(source_file_path=VALID_INCLUDES_SUBDIR / "circular_a.viv")
    assert "greet" in bundle["actions"]
    assert "wave" in bundle["actions"]
    assert len(bundle["actions"]) == 2


def test_multiple_includes() -> None:
    """Compile the <multiple_includes_entry> fixture and check that all included files resolve."""
    bundle = compile_from_path(source_file_path=VALID_INCLUDES_SUBDIR / "multiple_includes_entry.viv")
    assert "greet" in bundle["actions"]
    assert "friends" in bundle["tropes"]
    assert "rivals" in bundle["tropes"]


def test_missing_include_raises_compile_error() -> None:
    """Compile the <missing_include_entry> fixture and check that it raises `VivCompileError`."""
    with pytest.raises(VivCompileError, match="(?si)file not found"):
        compile_from_path(source_file_path=INVALID_INCLUDES_SUBDIR / "missing_include_entry.viv")


def test_duplicate_name_across_files_raises_compile_error() -> None:
    """Compile the <duplicate_across_files_entry> fixture and check that it raises `VivCompileError`."""
    with pytest.raises(VivCompileError, match="(?si)duplicate.*action.*greet"):
        compile_from_path(source_file_path=INVALID_INCLUDES_SUBDIR / "duplicate_across_files_entry.viv")
