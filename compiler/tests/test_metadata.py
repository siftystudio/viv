"""Test compilation of Viv content-bundle metadata."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_metadata_referenced_enums() -> None:
    """Compile the <saliences> fixture and check that referenced enums appear in metadata."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "saliences.viv")
    metadata = bundle["metadata"]
    assert "BORING" in metadata["referencedEnums"]
    assert "INTERESTING" in metadata["referencedEnums"]
    assert "CRITICAL" in metadata["referencedEnums"]


def test_metadata_referenced_custom_functions() -> None:
    """Compile the <expressions_custom_function> fixture and check function names in metadata."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "expressions_custom_function.viv")
    metadata = bundle["metadata"]
    assert "hasSkill" in metadata["referencedFunctionNames"]
    assert "computeGain" in metadata["referencedFunctionNames"]


def test_metadata_has_entity_data_assignments() -> None:
    """Check that `hasEntityDataAssignments` is `True` when effects contain assignments."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_effects.viv")
    assert bundle["metadata"]["hasEntityDataAssignments"] is True


def test_metadata_no_entity_data_assignments() -> None:
    """Check that `hasEntityDataAssignments` is `False` when there are no assignments."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv")
    assert bundle["metadata"]["hasEntityDataAssignments"] is False


def test_metadata_time_of_day_parameterized_reactions() -> None:
    """Check that reactions with time-of-day constraints appear in metadata."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "temporal_constraints.viv")
    metadata = bundle["metadata"]
    tod_reactions = metadata["timeOfDayParameterizedReactions"]
    reaction_names = [r["reaction"] for r in tod_reactions]
    assert "morning-reminder" in reaction_names
