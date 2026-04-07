"""Test compilation of Viv query constructs."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_query() -> None:
    """Compile the <query> fixture."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "query.viv")
    assert "happy-memory" in bundle["queries"]


def test_query_with_numeric_criteria() -> None:
    """Compile the <query> fixture and check numeric importance/salience criteria (Bug 2)."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "query.viv")
    assert "important-memory" in bundle["queries"]


def test_query_comprehensive_fields() -> None:
    """Compile the <query_comprehensive> fixture and check all field types."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "query_comprehensive.viv")
    query = bundle["queries"]["witnessed-conflict"]
    assert query["actionName"] is not None
    assert len(query["actionName"]) == 1
    assert query["actionName"][0]["operator"] == "any"
    assert query["tags"] is not None
    assert query["tags"][0]["operator"] == "all"
    assert query["importance"] is not None
    assert query["importance"]["lower"]["inclusive"] is True
    assert query["importance"]["lower"]["value"]["value"] == 2
    assert query["importance"]["upper"]["inclusive"] is False
    assert query["importance"]["upper"]["value"]["value"] == 10
    assert query["salience"] is not None
    assert query["salience"]["lower"]["inclusive"] is False
    assert query["salience"]["lower"]["value"]["value"] == 1
    assert query["time"] is not None
    assert query["initiator"] is not None
    assert query["initiator"][0]["operator"] == "none"
    assert query["bystanders"] is not None
    assert query["bystanders"][0]["operator"] == "any"


def test_query_equality_criterion() -> None:
    """Compile the <query_equality_criterion> fixture and check that `==: 5` sets both bounds."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "query_equality_criterion.viv")
    query = bundle["queries"]["exact-importance"]
    importance = query["importance"]
    assert importance["lower"] is not None
    assert importance["upper"] is not None
    assert importance["lower"]["inclusive"] is True
    assert importance["upper"]["inclusive"] is True
    assert importance["lower"]["value"]["value"] == 5
    assert importance["upper"]["value"]["value"] == 5
