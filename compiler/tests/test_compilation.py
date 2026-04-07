"""Test that valid .viv fixtures compile successfully and produce well-formed content bundles."""

from pathlib import Path

import jsonschema
import pytest

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES, VALID_FIXTURES_SUBDIR, get_fixture_id


@pytest.mark.parametrize("fixture_path", VALID_FIXTURES, ids=get_fixture_id)
def test_valid_fixture_compiles(fixture_path: Path) -> None:
    """Compile each valid fixture and check that compilation succeeds."""
    compile_from_path(source_file_path=fixture_path)


@pytest.mark.parametrize("fixture_path", VALID_FIXTURES, ids=get_fixture_id)
def test_valid_fixture_matches_schema(fixture_path: Path, content_bundle_schema) -> None:
    """Validate each compiled fixture against the content-bundle JSON schema.

    This catches structural drift between the compiler's Python types and the
    schema contract consumed by runtimes.
    """
    bundle = compile_from_path(source_file_path=fixture_path)
    jsonschema.validate(instance=bundle, schema=content_bundle_schema)


def test_minimal_action() -> None:
    """Compile the <minimal_action> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv")
    assert "greet" in bundle["actions"]
    assert "greeter" in bundle["actions"]["greet"]["roles"]


def test_multiple_actions() -> None:
    """Compile the <multiple_actions> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "multiple_actions.viv")
    assert "wave" in bundle["actions"]
    assert "nod" in bundle["actions"]
    assert "shrug" in bundle["actions"]


def test_reserved_action() -> None:
    """Compile the <reserved_action> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reserved_action.viv")
    action = bundle["actions"]["hug"]
    assert action["reserved"] is True
    assert action["gloss"] is not None


def test_empty_file_produces_no_constructs() -> None:
    """Compile the <empty_file> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "empty_file.viv")
    assert len(bundle["actions"]) == 0
    assert len(bundle["actionSelectors"]) == 0
    assert len(bundle["plans"]) == 0
    assert len(bundle["planSelectors"]) == 0
    assert len(bundle["queries"]) == 0
    assert len(bundle["siftingPatterns"]) == 0
    assert len(bundle["tropes"]) == 0


def test_object_literal() -> None:
    """Compile the <object_literal> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "object_literal.viv")
    assert "catalog" in bundle["actions"]


def test_identifier_with_keyword_prefix() -> None:
    """Compile the <identifier_with_keyword_prefix> fixture (Bug 7)."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "identifier_with_keyword_prefix.viv")
    assert "endangered-species-report" in bundle["actions"]
    roles = bundle["actions"]["endangered-species-report"]["roles"]
    assert "reporter" in roles
    assert "endpoint" in roles


def test_default_importance() -> None:
    """Check that omitting `importance` yields a default of `1.0`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv")
    importance = bundle["actions"]["greet"]["importance"]
    assert importance["type"] == "float"
    assert importance["value"] == 1.0


def test_custom_default_importance() -> None:
    """Check that `default_importance` propagates to actions that omit it."""
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv",
        default_importance=5.0
    )
    importance = bundle["actions"]["greet"]["importance"]
    assert importance["type"] == "float"
    assert importance["value"] == 5.0


def test_custom_default_salience() -> None:
    """Check that `default_salience` propagates to actions that omit it."""
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv",
        default_salience=3.0
    )
    saliences = bundle["actions"]["greet"]["saliences"]
    assert saliences["default"]["type"] == "float"
    assert saliences["default"]["value"] == 3.0


def test_custom_default_reaction_priority() -> None:
    """Check that `default_reaction_priority` propagates to reactions that omit it."""
    bundle = compile_from_path(
        source_file_path=VALID_FIXTURES_SUBDIR / "action_with_reactions.viv",
        default_reaction_priority=7.0
    )
    reaction = bundle["actions"]["provoke"]["reactions"][0]["body"]["value"]
    assert reaction["priority"]["type"] == "float"
    assert reaction["priority"]["value"] == 7.0


def test_default_salience() -> None:
    """Check that omitting `salience` yields a default of `1.0`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "minimal_action.viv")
    salience_default = bundle["actions"]["greet"]["saliences"]["default"]
    assert salience_default["type"] == "float"
    assert salience_default["value"] == 1.0


def test_condition_partitioning() -> None:
    """Compile the <action_with_conditions> fixture and check global/per-role partitioning."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_conditions.viv")
    conditions = bundle["actions"]["confide"]["conditions"]
    assert len(conditions["globalConditions"]) == 0
    assert "speaker" in conditions["roleConditions"]
    assert "listener" in conditions["roleConditions"]
    assert len(conditions["roleConditions"]["speaker"]) == 1
    assert len(conditions["roleConditions"]["listener"]) == 1


def test_embargo_permanent_and_here() -> None:
    """Compile the <action_with_embargoes> fixture and check `time: forever` + `location: here`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_embargoes.viv")
    embargo = bundle["actions"]["chat"]["embargoes"][0]
    assert embargo["permanent"] is True
    assert embargo["period"] is None
    assert embargo["here"] is True


def test_embargo_time_period() -> None:
    """Compile the <action_with_embargo_time_period> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_embargo_time_period.viv")
    embargo = bundle["actions"]["greet"]["embargoes"][0]
    assert embargo["permanent"] is False
    assert embargo["period"] is not None
    assert embargo["period"]["amount"] == 3
    assert embargo["period"]["unit"] == "days"
    assert embargo["here"] is False
    assert embargo["roles"] is None


def test_embargo_roles() -> None:
    """Compile the <action_with_embargo_roles> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_embargo_roles.viv")
    embargo = bundle["actions"]["interrogate"]["embargoes"][0]
    assert set(embargo["roles"]) == {"detective", "suspect"}
    assert embargo["permanent"] is True


def test_embargo_location_anywhere() -> None:
    """Compile the <action_with_embargo_anywhere> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_embargo_anywhere.viv")
    embargo = bundle["actions"]["announce"]["embargoes"][0]
    assert embargo["here"] is False
    assert embargo["permanent"] is True


def test_embargo_multiple() -> None:
    """Compile the <action_with_multiple_embargoes> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_multiple_embargoes.viv")
    embargoes = bundle["actions"]["trade"]["embargoes"]
    assert len(embargoes) == 2
    assert embargoes[0]["here"] is True
    assert embargoes[0]["permanent"] is False
    assert embargoes[0]["period"]["amount"] == 2
    assert embargoes[0]["period"]["unit"] == "hours"
    assert set(embargoes[0]["roles"]) == {"seller", "buyer"}
    assert embargoes[1]["here"] is False
    assert embargoes[1]["permanent"] is True
    assert embargoes[1]["period"] is None
    assert embargoes[1]["roles"] == ["seller"]


def test_per_role_saliences() -> None:
    """Compile the <saliences> fixture and check per-role overrides."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "saliences.viv")
    saliences = bundle["actions"]["gossip"]["saliences"]
    assert set(saliences["roles"].keys()) == {"gossiper", "subject", "eavesdroppers"}
    assert "listener" not in saliences["roles"]


def test_action_with_report() -> None:
    """Compile the <action_with_report> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_report.viv")
    action = bundle["actions"]["discover"]
    assert action["report"] is not None
    assert action["report"]["type"] == "templateString"


def test_unicode_content_survives_compilation() -> None:
    """Compile the <unicode_content> fixture and check that Unicode survives into the bundle."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "unicode_content.viv")
    gloss = bundle["actions"]["greet"]["gloss"]
    assert gloss["type"] == "templateString"
    string_parts = [part for part in gloss["value"] if isinstance(part, str)]
    joined = "".join(string_parts)
    assert "は" in joined
    assert "に挨拶する" in joined


def test_action_with_loop_in_effects() -> None:
    """Compile the <action_with_loop> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_loop.viv")
    action = bundle["actions"]["distribute"]
    effects = action["effects"]
    loop_effects = [e for e in effects if e["body"]["type"] == "loop"]
    assert len(loop_effects) == 1
    loop = loop_effects[0]["body"]
    assert loop["value"]["variable"]["name"] == "r"


def test_inscription_expression() -> None:
    """Compile the <inscription> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "inscription.viv")
    action = bundle["actions"]["write-note"]
    effects = action["effects"]
    inscription_effects = [e for e in effects if e["body"]["type"] == "inscription"]
    assert len(inscription_effects) == 1


def test_conditional_effects_with_trope_fit() -> None:
    """Compile the <conditional_effects> fixture and check trope-fit sugar in conditions."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "conditional_effects.viv")
    action = bundle["actions"]["confront"]
    effects = action["effects"]
    conditional_effects = [e for e in effects if e["body"]["type"] == "conditional"]
    assert len(conditional_effects) == 1
    conditional = conditional_effects[0]["body"]
    condition = conditional["value"]["branches"][0]["condition"]
    assert condition["type"] == "tropeFit"
    assert condition["value"]["tropeName"] == "rivals"


def test_saliences_custom_field() -> None:
    """Compile the <saliences> fixture and check the `for _@c:` custom salience field."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "saliences.viv")
    saliences = bundle["actions"]["gossip"]["saliences"]
    assert len(saliences["custom"]) > 0
    assert saliences["variable"] is not None
    assert saliences["variable"]["name"] == "c"


def test_action_tags() -> None:
    """Compile the <action_with_tags> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "action_with_tags.viv")
    action = bundle["actions"]["trade"]
    tag_values = [t["value"] for t in action["tags"]["value"]]
    assert "commerce" in tag_values
    assert "exchange" in tag_values
    assert "social" in tag_values
    assert len(tag_values) == 3


def test_reserved_action_precast_non_initiator() -> None:
    """Compile the <reserved_action_with_precast> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "reserved_action_with_precast.viv")
    action = bundle["actions"]["summon"]
    assert action["reserved"] is True
    assert action["roles"]["summoned"]["precast"] is True


def test_conditional_effects_elif() -> None:
    """Compile the <conditional_effects_elif> fixture with elif branches."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "conditional_effects_elif.viv")
    action = bundle["actions"]["assess-threat"]
    effects = action["effects"]
    conditional_effects = [e for e in effects if e["body"]["type"] == "conditional"]
    assert len(conditional_effects) == 1
    conditional = conditional_effects[0]["body"]
    assert len(conditional["value"]["branches"]) == 2
    assert conditional["value"]["alternative"] is not None


def test_saliences_elif() -> None:
    """Compile the <saliences_elif> fixture with elif branches."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "saliences_elif.viv")
    saliences = bundle["actions"]["assess-risk"]["saliences"]
    assert len(saliences["custom"]) > 0
    conditional = saliences["custom"][0]
    assert conditional["type"] == "conditional"
    assert len(conditional["value"]["branches"]) == 2
    assert conditional["value"]["alternative"] is not None


def test_whitespace_wild_west() -> None:
    """Compile the <whitespace_wild_west> fixture and verify every construct survived."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "whitespace_wild_west.viv")

    # All nine constructs are present
    assert sorted(bundle["actions"].keys()) == ["cower", "inscribe-threat", "research", "threaten"]
    assert sorted(bundle["actionSelectors"].keys()) == ["fallback-response", "social-response"]
    assert sorted(bundle["plans"].keys()) == ["intimidation-campaign"]
    assert sorted(bundle["queries"].keys()) == ["recent-threats"]
    assert sorted(bundle["siftingPatterns"].keys()) == ["threat-spree"]
    assert sorted(bundle["tropes"].keys()) == ["rivals"]

    # Threaten: inherited importance from template
    threaten = bundle["actions"]["threaten"]
    assert threaten["importance"]["value"] == 2

    # Threaten: inherited gloss is a template string with role references
    assert threaten["gloss"]["type"] == "templateString"

    # Threaten: inherited tags
    tag_values = [t["value"] for t in threaten["tags"]["value"]]
    assert "social" in tag_values
    assert "interpersonal" in tag_values

    # Threaten: scratch variables
    assert len(threaten["scratch"]) == 2

    # Threaten: embargo with location, time, and roles
    embargo = threaten["embargoes"][0]
    assert embargo["here"] is True
    assert embargo["period"]["amount"] == 3
    assert embargo["period"]["unit"] == "days"
    assert set(embargo["roles"]) == {"actor", "target"}

    # Threaten: salience overrides
    assert threaten["saliences"]["roles"]["witness"] is not None

    # Threaten: associations
    assert threaten["associations"]["roles"]["witness"] is not None

    # Threaten: reaction with repeat logic
    reaction = threaten["reactions"][0]["body"]["value"]
    assert reaction["targetName"] == "cower"
    repeat = reaction["repeatLogic"]
    assert repeat is not None
    assert repeat["maxRepeats"] == 2

    # Cower is reserved
    assert bundle["actions"]["cower"]["reserved"] is True

    # Inscription effect
    inscribe = bundle["actions"]["inscribe-threat"]
    inscription_effects = [e for e in inscribe["effects"] if e["body"]["type"] == "inscription"]
    assert len(inscription_effects) == 1

    # Action selector with weighted policy and correct candidates
    selector = bundle["actionSelectors"]["social-response"]
    assert selector["policy"] == "weighted"
    assert len(selector["candidates"]) == 2
    names = [c["name"] for c in selector["candidates"]]
    assert "threaten" in names
    assert "cower" in names

    # Action selector with ordered policy
    fallback = bundle["actionSelectors"]["fallback-response"]
    assert fallback["policy"] == "ordered"
    assert len(fallback["candidates"]) == 2

    # Query has expected criteria
    query = bundle["queries"]["recent-threats"]
    assert query["actionName"] is not None
    assert query["time"] is not None
    assert query["importance"] is not None
    assert query["bystanders"] is not None

    # Plan has two phases
    plan = bundle["plans"]["intimidation-campaign"]
    assert len(plan["phases"]) == 2

    # Custom function calls survived in research action
    research = bundle["actions"]["research"]
    assert len(research["effects"]) == 1
