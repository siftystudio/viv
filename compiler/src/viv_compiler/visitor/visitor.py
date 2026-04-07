"""The visitor component of the Viv DSL compiler, composed by a number of thematic mixin classes."""

from arpeggio import PTNodeVisitor

from ._actions import VisitorMixinActions
from ._bindings import VisitorMixinBindings
from ._expressions import VisitorMixinExpressions
from ._files import VisitorMixinFiles
from ._plans import VisitorMixinPlans
from ._queries import VisitorMixinQueries
from ._reactions import VisitorMixinReactions
from ._roles import VisitorMixinRoles
from ._selectors import VisitorMixinSelectors
from ._sifting_patterns import VisitorMixinSiftingPatterns
from ._statements import VisitorMixinStatements
from ._temporal_constraints import VisitorMixinTemporalConstraints
from ._tropes import VisitorMixinTropes


class Visitor(
    VisitorMixinActions,
    VisitorMixinBindings,
    VisitorMixinExpressions,
    VisitorMixinFiles,
    VisitorMixinPlans,
    VisitorMixinQueries,
    VisitorMixinReactions,
    VisitorMixinRoles,
    VisitorMixinSelectors,
    VisitorMixinSiftingPatterns,
    VisitorMixinStatements,
    VisitorMixinTemporalConstraints,
    VisitorMixinTropes,
    PTNodeVisitor,  # Must come last, otherwise order doesn't matter (no duplicate method names)
):
    """The composed visitor class for Viv ASTs, containing methods for visiting all
    nonterminal symbols that appear in the Viv DSL grammar.
    """
    pass
