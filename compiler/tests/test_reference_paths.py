"""Test compilation of Viv reference paths, scratch variables, and fail-safe semantics."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_scratch_variable_expansion() -> None:
    """Check that `$@offer` expands to `@this.scratch.offer`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "scratch_variables.viv")
    action = bundle["actions"]["negotiate"]
    assert len(action["scratch"]) > 0
    first_scratch = action["scratch"][0]
    assert first_scratch["type"] == "assignment"
    lhs = first_scratch["value"]["left"]
    assert lhs["type"] == "entityReference"
    assert lhs["value"]["anchor"] == "this"
    path = lhs["value"]["path"]
    assert path[0]["name"] == "scratch"
    assert path[1]["name"] == "offer"


def test_reference_path_chained_property() -> None:
    """Check that `@subject.stats.strength` compiles to a two-component property path."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reference_paths.viv")
    action = bundle["actions"]["examine"]
    all_conditions = list(action["conditions"]["globalConditions"])
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    for cond in all_conditions:
        body = cond["body"]
        if body["type"] != "comparison":
            continue
        left = body["value"]["left"]
        if left["type"] == "entityReference" and len(left["value"]["path"]) == 2:
            path = left["value"]["path"]
            assert path[0]["type"] == "referencePathComponentPropertyName"
            assert path[0]["name"] == "stats"
            assert path[1]["type"] == "referencePathComponentPropertyName"
            assert path[1]["name"] == "strength"
            return
    raise AssertionError("Did not find a condition with a 2-component chained property path")


def test_reference_path_pointer_after_dot() -> None:
    """Check that `@subject.relations->leader.trust` compiles pointer + property components."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reference_paths.viv")
    action = bundle["actions"]["examine"]
    all_conditions = list(action["conditions"]["globalConditions"])
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    for cond in all_conditions:
        body = cond["body"]
        if body["type"] != "comparison":
            continue
        left = body["value"]["left"]
        if left["type"] != "entityReference":
            continue
        path = left["value"]["path"]
        pointer_components = [p for p in path if p["type"] == "referencePathComponentPointer"]
        if pointer_components:
            assert pointer_components[0]["propertyName"] == "leader"
            return
    raise AssertionError("Did not find a condition with a pointer path component")


def test_reference_path_lookup_string_key() -> None:
    """Check that `@subject.inventory["sword"]` compiles to a lookup path component."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reference_paths.viv")
    action = bundle["actions"]["examine"]
    all_conditions = list(action["conditions"]["globalConditions"])
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    for cond in all_conditions:
        body = cond["body"]
        if body["type"] != "comparison":
            continue
        left = body["value"]["left"]
        if left["type"] != "entityReference":
            continue
        path = left["value"]["path"]
        lookup_components = [p for p in path if p["type"] == "referencePathComponentLookup"]
        if lookup_components:
            key = lookup_components[0]["key"]
            assert key["type"] in ("string", "templateString")
            if key["type"] == "templateString":
                assert key["value"] == ["sword"]
            else:
                assert key["value"] == "sword"
            return
    raise AssertionError("Did not find a condition with a lookup path component")


def test_reference_path_fail_safe_on_property() -> None:
    """Check that `@subject.optional_field?.value` sets `failSafe` on the right component."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reference_paths.viv")
    action = bundle["actions"]["examine"]
    all_conditions = list(action["conditions"]["globalConditions"])
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    for cond in all_conditions:
        body = cond["body"]
        if body["type"] != "comparison":
            continue
        left = body["value"]["left"]
        if left["type"] != "entityReference":
            continue
        path = left["value"]["path"]
        fail_safe_props = [p for p in path if p.get("failSafe") is True]
        if fail_safe_props and fail_safe_props[0].get("name") == "optional_field":
            assert fail_safe_props[0]["type"] == "referencePathComponentPropertyName"
            return
    raise AssertionError("Did not find a condition with a fail-safe property path component")


def test_reference_path_fail_safe_on_anchor() -> None:
    """Check that `@subject?.name` sets `failSafe` on the anchor, not the path."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reference_paths.viv")
    action = bundle["actions"]["examine"]
    all_conditions = list(action["conditions"]["globalConditions"])
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    for cond in all_conditions:
        body = cond["body"]
        if body["type"] != "comparison":
            continue
        left = body["value"]["left"]
        if left["type"] != "entityReference":
            continue
        if left["value"]["anchor"] == "subject" and left["value"]["failSafe"] is True:
            path = left["value"]["path"]
            assert len(path) == 1
            assert path[0]["name"] == "name"
            assert path[0]["failSafe"] is False
            return
    raise AssertionError("Did not find a condition with a fail-safe anchor reference")


def test_scratch_variable_fail_safe_position() -> None:
    """Check that `$@counter?` puts `failSafe` on `counter`, not on `this`.

    `$@counter?` is sugar for `@this.scratch.counter?`. The fail-safe should land on the
    `counter` component, since that is what the author is guarding.
    """
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "scratch_fail_safe.viv")
    action = bundle["actions"]["test-scratch-failsafe"]
    conditional_effects = [e for e in action["effects"] if e["body"]["type"] == "conditional"]
    assert len(conditional_effects) == 1
    condition = conditional_effects[0]["body"]["value"]["branches"][0]["condition"]
    assert condition["type"] == "comparison"
    lhs = condition["value"]["left"]
    assert lhs["type"] == "entityReference"
    assert lhs["value"]["anchor"] == "this"
    assert lhs["value"]["failSafe"] is False
    path = lhs["value"]["path"]
    assert path[0]["name"] == "scratch"
    assert path[0]["failSafe"] is False
    counter_component = path[1]
    assert counter_component["name"] == "counter"
    assert counter_component["failSafe"] is True
