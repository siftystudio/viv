"""Module that orchestrates the core pipeline for the Viv compiler.

This high-level module invokes other components to orchestrate the full compilation pipeline:

  * Load and parse the Viv DSL grammar to build a Viv PEG parser.
  * Load and parse an entry Viv source file.
  * Walk the parse tree with a visitor, to produce an AST.
  * Honor `include` statements (imports between Viv files), by producing and combining ASTs.
  * Postprocess the combined AST to produce finalized construct definitions.
  * Package up the construct definitions into a proper compiled content bundle.
  * Validate the content bundle, including against a canonical schema.
  * Emit JSON-serializable output for the validated content bundle.
"""

from .pipeline import compile_viv_source_code

__all__ = ["compile_viv_source_code"]
