"""Test compilation of Viv trope constructs."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_trope() -> None:
    """Compile the <trope> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "trope.viv")
    assert "friends" in bundle["tropes"]
    assert "a" in bundle["tropes"]["friends"]["roles"]
    assert "b" in bundle["tropes"]["friends"]["roles"]


def test_trope_with_conditions() -> None:
    """Compile the <trope_with_conditions> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "trope_with_conditions.viv")
    trope = bundle["tropes"]["allies"]
    conditions = trope["conditions"]
    role_conditions = conditions["roleConditions"]
    all_conditions = []
    for role_name in role_conditions:
        all_conditions.extend(role_conditions[role_name])
    assert len(all_conditions) >= 2
