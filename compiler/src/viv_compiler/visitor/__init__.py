"""Module serving as the visitor component of the Viv DSL compiler.

Exposes a single public visitor class that traverses and modifies a Viv AST, in accordance
with the structure prescribed by Arpeggio, our PEG parser solution. This class is composed
by a number of thematic mixin classes.

This implements the *visitor pattern* in parsing.
"""

from .visitor import Visitor
