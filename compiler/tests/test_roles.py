"""Test compilation of Viv role declarations."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_role_defaults() -> None:
    """Check default field values on a role with only a participation-mode label."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv")
    role = bundle["actions"]["greet"]["roles"]["greeter"]
    assert role["min"] == 1
    assert role["max"] == 1
    assert role["anywhere"] is False
    assert role["spawn"] is False
    assert role["pool"] is None


def test_entity_type_inferred_from_participation_mode() -> None:
    """Check that `as: initiator` implies `entityType: character`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv")
    role = bundle["actions"]["greet"]["roles"]["greeter"]
    assert role["entityType"] == "character"
    assert role["participationMode"] == "initiator"


def test_initiator_derived_fields() -> None:
    """Check that the compiler derives the `initiator` field and sets `precast` on the initiator role."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv")
    action = bundle["actions"]["greet"]
    assert action["initiator"] == "greeter"
    assert action["reserved"] is False
    assert action["roles"]["greeter"]["precast"] is True


def test_role_dependency_forest() -> None:
    """Compile the <roles_with_from> fixture and check that `from:` clauses build the role tree."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "roles_with_from.viv")
    action = bundle["actions"]["give-gift"]
    assert action["roleForestRoots"] == ["giver"]
    assert action["roles"]["giver"]["parent"] is None
    assert set(action["roles"]["giver"]["children"]) == {"receiver", "gift"}
    assert action["roles"]["receiver"]["parent"] == "giver"
    assert action["roles"]["gift"]["parent"] == "giver"


def test_casting_pool_cachability() -> None:
    """Compile the <roles_with_from> fixture and check pool cachability."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "roles_with_from.viv")
    roles = bundle["actions"]["give-gift"]["roles"]
    assert roles["receiver"]["pool"]["uncachable"] is False
    assert roles["gift"]["pool"]["uncachable"] is False


def test_group_role_loop() -> None:
    """Compile the <group_role_loop> fixture (Bug 1)."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "group_role_loop.viv")
    action = bundle["actions"]["announce"]
    assert "audience" in action["roles"]
    assert action["roles"]["audience"]["max"] == 5


def test_role_spawn_directive() -> None:
    """Compile the <role_with_spawn> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "role_with_spawn.viv")
    role = bundle["actions"]["create-artifact"]["roles"]["artifact"]
    assert role["spawn"] is True
    assert role["spawnFunction"] is not None
    assert role["spawnFunction"]["value"]["name"] == "createItem"
    assert role["entityType"] == "item"


def test_role_is_casting_pool() -> None:
    """Compile the <role_with_is_pool> fixture and check singleton-list pool body."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "role_with_is_pool.viv")
    role = bundle["actions"]["inspect-weapon"]["roles"]["weapon"]
    assert role["pool"] is not None
    assert role["pool"]["body"]["type"] == "list"
    assert len(role["pool"]["body"]["value"]) == 1


def test_role_optional_slots_with_chance() -> None:
    """Compile the <role_optional_slots> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "role_optional_slots.viv")
    role = bundle["actions"]["party"]["roles"]["guests"]
    assert role["min"] == 1
    assert role["max"] == 5
    assert role["chance"] is not None
    assert role["chance"] == 0.75


def test_role_with_mean() -> None:
    """Compile the <role_with_mean> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "role_with_mean.viv")
    role = bundle["actions"]["rally"]["roles"]["crowd"]
    assert role["min"] == 2
    assert role["max"] == 10
    assert role["mean"] == 5.0
    assert role["sd"] is not None
    assert role["sd"] > 0
