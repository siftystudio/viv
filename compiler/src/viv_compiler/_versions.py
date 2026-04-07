"""Version identifiers for concerns pertinent to the Viv compiler."""

__all__ = ["__version__", "__grammar_version__", "__schema_version__"]

import json
import tomllib
from pathlib import Path
from typing import Final
from importlib import resources
from importlib.metadata import version, PackageNotFoundError


def _read_compiler_version() -> str:
    """Return the current compiler version.

    Returns:
        The current compiler version.
    """
    # If `pyproject.toml` is reachable on disk, then we are running from the source
    # tree and need to read the version directly from it.
    pyproject = Path(__file__).resolve().parents[2] / "pyproject.toml"
    try:
        with open(pyproject, "rb") as f:
            return tomllib.load(f)["project"]["version"]
    except (FileNotFoundError, KeyError):
        pass
    # Otherwise, follow the normal protocol by retrieving from the installed package metadata
    try:
        return version("viv-compiler")
    except PackageNotFoundError:
        return "0.0.0+local"


def _read_grammar_version() -> str:
    """Return the current grammar version stored in the grammar file.

    Returns:
        The current grammar version.

    Raises:
        RuntimeError: There is no version number in the grammar file.
    """
    text = resources.files("viv_compiler.grammar").joinpath("viv.peg").read_text(encoding="utf-8")
    for line in text.splitlines():
        if line.startswith("// VERSION:"):
            return line.split(":", 1)[1].strip()
    raise RuntimeError("Grammar version not found") from None


def _read_schema_version() -> str:
    """Return the current content-bundle schema version.

    This version tracks the shape of compiled content bundles, which constitutes
     the contract between the compiler and any Viv runtime.

    Returns:
        The current content-bundle schema version.

    Raises:
        RuntimeError: There is no version number in the schema file.
    """
    text = resources.files("viv_compiler.schemas").joinpath("content-bundle.schema.json").read_text(encoding="utf-8")
    try:
        return json.loads(text)["version"]
    except KeyError:
        raise RuntimeError("Schema version not found") from None


# Version for the Viv compiler
__version__: Final[str] = _read_compiler_version()

# Version for the Viv DSL grammar (editor plugins assume compatibility)
__grammar_version__: Final[str] = _read_grammar_version()

# Version for the content-bundle schema (runtimes enforce compatibility)
__schema_version__: Final[str] = _read_schema_version()
