"""Test compilation of Viv expressions, operators, and precedence."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_arithmetic_expression_structure() -> None:
    """Compile the <expressions_arithmetic> fixture and check operator precedence in the AST."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "expressions_arithmetic.viv")
    action = bundle["actions"]["calculate"]
    effects = action["effects"]
    first_effect = effects[0]["body"]
    assert first_effect["type"] == "assignment"
    rhs = first_effect["value"]["right"]
    assert rhs["type"] == "arithmeticExpression"
    assert rhs["value"]["operator"] == "+"


def test_logical_conjunction_structure() -> None:
    """Compile the <expressions_logic> fixture and check for `&&` → conjunction."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "expressions_logic.viv")
    action = bundle["actions"]["secret-meeting"]
    conditions = action["conditions"]
    role_conditions = conditions["roleConditions"]
    all_conditions = []
    for role_name in role_conditions:
        all_conditions.extend(role_conditions[role_name])
    conjunction_conditions = [c for c in all_conditions if c["body"]["type"] == "conjunction"]
    assert len(conjunction_conditions) > 0


def test_logical_disjunction_structure() -> None:
    """Compile the <expressions_logic> fixture and check for `||` → disjunction."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "expressions_logic.viv")
    action = bundle["actions"]["secret-meeting"]
    conditions = action["conditions"]
    role_conditions = conditions["roleConditions"]
    all_conditions = []
    for role_name in role_conditions:
        all_conditions.extend(role_conditions[role_name])
    disjunction_conditions = [c for c in all_conditions if c["body"]["type"] == "disjunction"]
    assert len(disjunction_conditions) > 0


def test_negation_on_reference() -> None:
    """Compile the <expressions_logic> fixture and check for `!()` → negated expression."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "expressions_logic.viv")
    action = bundle["actions"]["secret-meeting"]
    conditions = action["conditions"]
    role_conditions = conditions["roleConditions"]
    all_conditions = []
    for role_name in role_conditions:
        all_conditions.extend(role_conditions[role_name])
    negated_conditions = [c for c in all_conditions if c["body"].get("negated") is True]
    assert len(negated_conditions) > 0


def test_chance_expression() -> None:
    """Compile the <expressions_chance> fixture and check that `25%` → probability `0.25`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "expressions_chance.viv")
    action = bundle["actions"]["gamble"]
    conditions = action["conditions"]
    assert len(conditions["globalConditions"]) > 0
    chance = conditions["globalConditions"][0]["body"]
    assert chance["type"] == "chanceExpression"
    assert chance["value"] == 0.25


def test_custom_function_call_in_conditions() -> None:
    """Compile the <expressions_custom_function> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "expressions_custom_function.viv")
    action = bundle["actions"]["research"]
    conditions = action["conditions"]
    role_conditions = conditions["roleConditions"]
    all_conditions = []
    for role_name in role_conditions:
        all_conditions.extend(role_conditions[role_name])
    func_conditions = [c for c in all_conditions if c["body"]["type"] == "customFunctionCall"]
    assert len(func_conditions) == 1
    assert func_conditions[0]["body"]["value"]["name"] == "hasSkill"
    assert len(func_conditions[0]["body"]["value"]["args"]) == 2


def test_negation_of_all_negatable_expression_types() -> None:
    """Compile the <negation_all_types> fixture.

    Exercises every expression type in `NegatableExpression` to ensure the validator
    accepts negation on all of them.
    """
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "negation_all_types.viv")
    assert "test-negation" in bundle["actions"]


def test_precedence_arithmetic_over_relational() -> None:
    """Check that `@a.x + 1 > @a.y * 2` parses as `(@a.x + 1) > (@a.y * 2)`."""
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "precedence_arithmetic_over_relational.viv"
    )
    action = bundle["actions"]["test-arith-rel"]
    all_conditions = []
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    assert len(all_conditions) == 1
    cond = all_conditions[0]["body"]
    assert cond["type"] == "comparison"
    assert cond["value"]["operator"] == ">"
    assert cond["value"]["left"]["type"] == "arithmeticExpression"
    assert cond["value"]["left"]["value"]["operator"] == "+"
    assert cond["value"]["right"]["type"] == "arithmeticExpression"
    assert cond["value"]["right"]["value"]["operator"] == "*"


def test_precedence_conjunction_over_disjunction() -> None:
    """Check that `a || b && c` parses as `a || (b && c)`."""
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "precedence_conjunction_over_disjunction.viv"
    )
    action = bundle["actions"]["test-conj-disj"]
    all_conditions = []
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    assert len(all_conditions) == 1
    cond = all_conditions[0]["body"]
    assert cond["type"] == "disjunction"
    assert cond["value"]["operands"][0]["type"] == "comparison"
    assert cond["value"]["operands"][1]["type"] == "conjunction"


def test_precedence_full_chain() -> None:
    """Check the full precedence chain: arithmetic < relational < conjunction < disjunction.

    Expression: `@a.x + 1 > 2 && @b.y * 3 <= @c.z || @d.w != 0`
    Expected:   `((@a.x + 1) > 2) && ((@b.y * 3) <= @c.z)) || (@d.w != 0)`
    """
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "precedence_full_chain.viv")
    action = bundle["actions"]["test-full-chain"]
    all_conditions = list(action["conditions"]["globalConditions"])
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    assert len(all_conditions) >= 1
    cond = all_conditions[0]["body"]
    assert cond["type"] == "disjunction"
    left = cond["value"]["operands"][0]
    right = cond["value"]["operands"][1]
    assert left["type"] == "conjunction"
    left_left = left["value"]["operands"][0]
    assert left_left["type"] == "comparison"
    assert left_left["value"]["operator"] == ">"
    assert left_left["value"]["left"]["type"] == "arithmeticExpression"
    left_right = left["value"]["operands"][1]
    assert left_right["type"] == "comparison"
    assert left_right["value"]["operator"] == "<="
    assert left_right["value"]["left"]["type"] == "arithmeticExpression"
    assert right["type"] == "comparison"
    assert right["value"]["operator"] == "!="


def test_precedence_parens_override() -> None:
    """Check that `(@a.x > 0 || @a.y > 0) && @a.z > 0` has conjunction at root.

    Without parens, `&&` binds tighter and the root would be `||`.
    """
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "precedence_parens_override.viv"
    )
    action = bundle["actions"]["test-parens-override"]
    all_conditions = []
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    assert len(all_conditions) == 1
    cond = all_conditions[0]["body"]
    assert cond["type"] == "conjunction"
    assert cond["value"]["operands"][0]["type"] == "disjunction"
    assert cond["value"]["operands"][1]["type"] == "comparison"


def test_precedence_multiplicative_over_additive() -> None:
    """Check that `@a.x + @a.y * @a.z - 1` respects `*` binding tighter than `+`/`-`.

    Expected: `(@a.x + (@a.y * @a.z)) - 1`
    """
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "precedence_multiplicative_over_additive.viv"
    )
    action = bundle["actions"]["test-mult-add"]
    rhs = action["effects"][0]["body"]["value"]["right"]
    assert rhs["type"] == "arithmeticExpression"
    assert rhs["value"]["operator"] == "-"
    left = rhs["value"]["left"]
    assert left["type"] == "arithmeticExpression"
    assert left["value"]["operator"] == "+"
    assert left["value"]["right"]["type"] == "arithmeticExpression"
    assert left["value"]["right"]["value"]["operator"] == "*"


def test_symbol_reference_in_condition() -> None:
    """Compile the <symbol_reference_structure> fixture and check `&flag.active` → symbol reference."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "symbol_reference_structure.viv")
    action = bundle["actions"]["mark-territory"]
    assert "flag" in action["roles"]
    assert action["roles"]["flag"]["entityType"] == "symbol"
    all_conditions = list(action["conditions"]["globalConditions"])
    for group in action["conditions"]["roleConditions"].values():
        all_conditions.extend(group)
    symbol_conditions = [
        c for c in all_conditions
        if c["body"]["type"] == "comparison"
        and c["body"]["value"]["left"]["type"] == "symbolReference"
    ]
    assert len(symbol_conditions) >= 1
    sym_ref = symbol_conditions[0]["body"]["value"]["left"]
    assert sym_ref["value"]["anchor"] == "flag"
