"""Test the compile_from_string API."""

from pathlib import Path

import pytest

from viv_compiler import compile_from_string, VivCompileError, VivParseError

from .conftest import VALID_INCLUDES_SUBDIR


MINIMAL_ACTION = """\
action greet:
    roles:
        @greeter:
            as: initiator
"""


def test_compile_valid_source_code() -> None:
    """Compile a minimal action from a source string."""
    bundle = compile_from_string(MINIMAL_ACTION)
    assert "greet" in bundle["actions"]
    assert "greeter" in bundle["actions"]["greet"]["roles"]


def test_compile_invalid_syntax() -> None:
    """A syntax error in the source string raises VivParseError."""
    with pytest.raises(VivParseError):
        compile_from_string("action broken:\n    not valid syntax here")


def test_compile_missing_initiator() -> None:
    """A semantic error in the source string raises VivCompileError."""
    code = """\
action broken:
    roles:
        @person:
            as: character
"""
    with pytest.raises(VivCompileError, match="no initiator role"):
        compile_from_string(code)


def test_error_reports_string_path() -> None:
    """Error messages from string compilation reference '<string>' as the file."""
    with pytest.raises(VivParseError) as exc_info:
        compile_from_string("action broken:\n    not valid syntax here")
    assert "<string>" in str(exc_info.value)


def test_include_with_entry_dir() -> None:
    """An include directive resolves relative to the specified entry_dir."""
    code = 'include "basic_included.viv"\n\n' + MINIMAL_ACTION
    bundle = compile_from_string(code, entry_dir=VALID_INCLUDES_SUBDIR)
    assert "greet" in bundle["actions"]
    assert "friends" in bundle["tropes"]


def test_include_with_wrong_entry_dir(tmp_path: Path) -> None:
    """An include directive fails when the entry_dir doesn't contain the file."""
    code = 'include "basic_included.viv"\n\n' + MINIMAL_ACTION
    with pytest.raises(VivCompileError):
        compile_from_string(code, entry_dir=tmp_path)


def test_include_defaults_to_cwd(monkeypatch: pytest.MonkeyPatch) -> None:
    """When entry_dir is omitted, includes resolve relative to the current working directory."""
    monkeypatch.chdir(VALID_INCLUDES_SUBDIR)
    code = 'include "basic_included.viv"\n\n' + MINIMAL_ACTION
    bundle = compile_from_string(code)
    assert "friends" in bundle["tropes"]


def test_returns_valid_content_bundle() -> None:
    """The returned bundle has the expected top-level structure."""
    bundle = compile_from_string(MINIMAL_ACTION)
    for key in ("actions", "actionSelectors", "plans", "planSelectors", "queries", "siftingPatterns", "tropes"):
        assert key in bundle
