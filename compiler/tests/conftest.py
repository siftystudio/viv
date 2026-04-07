"""Expose fixtures and helpers for the Viv compiler test suite."""

import json
from importlib.resources import files
from pathlib import Path

import pytest


def collect_fixtures(directory: Path) -> list[Path]:
    """Collect all `.viv` fixture files in a directory, sorted by name."""
    return sorted(directory.glob("*.viv"))


def get_fixture_id(path: Path) -> str:
    """Derive a pytest ID from a `.viv` fixture path."""
    return path.stem


# Fixture directory paths
FIXTURES_DIR = Path(__file__).parent / "fixtures"
VALID_FIXTURES_SUBDIR = FIXTURES_DIR / "valid"
INCLUDES_DIR = FIXTURES_DIR / "includes"
VALID_INCLUDES_SUBDIR = INCLUDES_DIR / "valid"
INVALID_INCLUDES_SUBDIR = INCLUDES_DIR / "invalid"
INVALID_FIXTURES_SYNTAX_SUBDIR = FIXTURES_DIR / "invalid" / "syntax"
INVALID_FIXTURES_SEMANTICS_SUBDIR = FIXTURES_DIR / "invalid" / "semantics"

# Collected fixture file lists for parametrized tests
VALID_FIXTURES = collect_fixtures(directory=VALID_FIXTURES_SUBDIR) + collect_fixtures(directory=VALID_INCLUDES_SUBDIR)
INVALID_FIXTURES_SYNTAX = collect_fixtures(directory=INVALID_FIXTURES_SYNTAX_SUBDIR)
INVALID_FIXTURES_SEMANTICS = collect_fixtures(directory=INVALID_FIXTURES_SEMANTICS_SUBDIR)


@pytest.fixture(scope="session")
def content_bundle_schema():
    """Load the compiler's JSON schema once for the entire test session."""
    text = files("viv_compiler.schemas").joinpath("content-bundle.schema.json").read_text()
    return json.loads(text)
