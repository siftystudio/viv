"""Test compilation of Viv template strings."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_template_string_no_trailing_space_after_reference() -> None:
    """Check that `"Welcome, @guest!"` does not introduce a spurious space before `!`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "template_string_gap.viv")
    action = bundle["actions"]["greet-formally"]
    gloss = action["gloss"]
    assert gloss["type"] == "templateString"
    template_parts = gloss["value"]
    for i, part in enumerate(template_parts):
        if isinstance(part, dict) and part.get("type") == "entityReference":
            if i + 1 < len(template_parts):
                trailing = template_parts[i + 1]
                if isinstance(trailing, str):
                    assert not trailing.startswith(" "), (
                        f"Spurious space before trailing text after template gap: '{trailing}'"
                    )


def test_template_string_brace_gap_simple() -> None:
    """Check that `"Score: {@player.points}"` compiles with an expression gap."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "template_string_brace_gap.viv")
    action = bundle["actions"]["score-report"]
    gloss = action["gloss"]
    assert gloss["type"] == "templateString"
    parts = gloss["value"]
    assert isinstance(parts[0], str)
    assert "Score:" in parts[0]
    assert parts[1]["type"] == "entityReference"


def test_template_string_brace_gap_arithmetic() -> None:
    """Check that mixed reference and brace-expression gaps compile correctly.

    The template `"@player scored {@player.hits + @player.bonus} points!"` exercises
    both gap types. The `flat_str()` fix from round 1 must handle brace-expression gaps
    without misaligning the surrounding text slices.
    """
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "template_string_brace_gap.viv")
    action = bundle["actions"]["score-report"]
    report = action["report"]
    assert report["type"] == "templateString"
    parts = report["value"]
    expression_parts = [p for p in parts if isinstance(p, dict)]
    assert expression_parts[0]["type"] == "entityReference"
    assert expression_parts[1]["type"] == "arithmeticExpression"
    trailing = parts[-1]
    assert isinstance(trailing, str)
    assert trailing == " points!"


def test_template_string_irregular_spacing() -> None:
    """Check that irregular whitespace between gaps is preserved exactly."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "template_string_irregular_spacing.viv")
    action = bundle["actions"]["announce"]
    gloss = action["gloss"]
    assert gloss["type"] == "templateString"
    parts = gloss["value"]
    assert parts[1] == "      announces      "
