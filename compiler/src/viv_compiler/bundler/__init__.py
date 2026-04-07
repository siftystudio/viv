"""Module that creates the finalized compiled content bundle.

This module takes in a postprocessed combined AST produced by the Viv postprocessor, and uses
the construct definitions contained in that AST to construct a compiled content bundle, which
will also contain metadata produced via another module.
"""

from .bundler import create_compiled_content_bundle
