"""Viv Compiler: the reference compiler for the DSL at the heart of the Viv system for emergent narrative."""

__all__ = [
    "__version__",
    "__grammar_version__",
    "__schema_version__",
    "compile_from_path",
    "compile_from_string",
    "ContentBundle",
    "VivCompileError",
    "VivParseError"
]

from ._versions import __version__, __grammar_version__, __schema_version__
from .api import compile_from_path, compile_from_string  # Relies on `__version__` already being set
from .errors import VivCompileError, VivParseError
from .external_types import ContentBundle
