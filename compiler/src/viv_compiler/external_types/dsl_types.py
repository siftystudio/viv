"""Types associated with the lower-level concerns represented in the Viv DSL's abstract syntax trees."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING, Literal, TypeAlias, TypedDict, Union

if TYPE_CHECKING:
    # Imported for static checking only; referenced by string at runtime to avoid cycles
    from .content_types import (
        ActionName,
        QueryName,
        PlanName,
        ReactionTargetConstructDiscriminator,
        RoleName,
        SelectorName,
        SiftingPatternName,
        TropeName
    )


# A Viv expression
Expression: TypeAlias = Union[
    "ActionRelation",
    "ActionSearch",
    "CustomFunctionCall",
    "ArithmeticExpression",
    "Assignment",
    "BoolField",
    "ChanceExpression",
    "Comparison",
    "Conditional",
    "Conjunction",
    "Disjunction",
    "EntityReference",
    "Enum",
    "FloatField",
    "Inscription",
    "Inspection",
    "IntField",
    "ListField",
    "Loop",
    "MembershipTest",
    "MemoryCheck",
    "NullField",
    "ObjectField",
    "Reaction",
    "Sifting",
    "StringField",
    "SymbolReference",
    "TemplateStringField",
    "TropeFit",
]


# Enum containing discriminators for each Viv expression type
class ExpressionDiscriminator(StrEnum):
    ACTION_RELATION = "actionRelation"
    ACTION_SEARCH = "actionSearch"
    ASSIGNMENT = "assignment"
    ARITHMETIC_EXPRESSION = "arithmeticExpression"
    BOOL = "bool"
    CHANCE_EXPRESSION = "chanceExpression"
    COMPARISON = "comparison"
    CONDITIONAL = "conditional"
    CONJUNCTION = "conjunction"
    CUSTOM_FUNCTION_CALL = "customFunctionCall"
    DISJUNCTION = "disjunction"
    ENTITY_REFERENCE = "entityReference"
    ENUM = "enum"
    FLOAT = "float"
    INSPECTION = "inspection"
    INSCRIPTION = "inscription"
    INT = "int"
    LIST = "list"
    LOOP = "loop"
    MEMBERSHIP_TEST = "membershipTest"
    MEMORY_CHECK = "memoryCheck"
    NULL_TYPE = "nullType"
    OBJECT = "object"
    REACTION = "reaction"
    SIFTING = "sifting"
    STRING = "string"
    SYMBOL_REFERENCE = "symbolReference"
    TEMPLATE_STRING = "templateString"
    TROPE_FIT = "tropeFit"


class _SourceAnnotatedExpression(TypedDict):
    """Mixin for all expression types that specifies metadata about the expression source code."""
    # Annotations on the expression specifying its original source code and position
    # in a source file. This will be `None` in certain expressions, such as default
    # values for optional fields, that do not originate in source code.
    source: SourceAnnotations | None


class SourceAnnotations(TypedDict):
    """An object containing annotations on a Viv expression, specifying its original
    source code and position in a source file.
    """
    # Path to the source file including the expression, relative to the entry file's parent directory
    filePath: str
    # Line number (1-based) at the start of the expression
    line: int
    # Column number (1-based) at the start of the expression
    column: int
    # Line number (1-based) at the end of the expression
    endLine: int
    # Column number (1-based) at the end of the expression
    endColumn: int
    # The source code for the expression
    code: str


# Mixin for expression types that may be negated
class _NegatableExpression(TypedDict):
    """Mixin for expression types that may be negated."""
    # Whether to negate the result of the expression. Only present when `True`.
    negated: bool


# Mixin for expression components that may fail safely
class _FailSafeComponent(TypedDict):
    """Mixin for expression components that may fail safely."""
    # Whether the expression component should fail safely by converting a nullish evaluation
    # into the falsy 'eval fail-safe signal'. This allows for references whose (intermediate)
    # references may be undefined, as in `@foo.bar?.baz`. Only present when `True`.
    failSafe: bool


class ActionRelation(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv action relation.

    This is a kind of expression which evaluates to `true` if a specified relation holds between two actions.
    """
    # Discriminator for a Viv action relation
    type: Literal[ExpressionDiscriminator.ACTION_RELATION]
    # The actual expression value
    value: ActionRelationValue


class ActionRelationValue(TypedDict):
    """The actual expression value for a Viv action relation."""
    # An expression whose evaluation will be used as the left operand in relation test
    left: Expression
    # The relation operator
    operator: ActionRelationOperator
    # An expression whose evaluation will be used as the right operand in relation test
    right: Expression


# Enum containing the action-relation operators supported by Viv
ActionRelationOperator = Literal["caused", "preceded", "triggered"]


class CustomFunctionCall(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv custom-function call, which parameterizes a call to some function that must
    be registered in the host application's Viv adapter.

    For instance, a Viv author might specify a function call in an action such as
    `~transport(@person.id, @destination.id)`, in which case there must be a function
    `transport()` exposed in the adapter. The Viv runtime confirms the existence of all
    referenced function names during adapter initialization.
    """
    # Discriminator for a Viv adapter function call
    type: Literal[ExpressionDiscriminator.CUSTOM_FUNCTION_CALL]
    # The actual expression value
    value: CustomFunctionCallValue


class CustomFunctionCallValue(_FailSafeComponent):
    """The actual expression value for a Viv custom-function call."""
    # The name of the custom function. There must be a function stored in the host
    # application's Viv adapter, via a key by this same name.
    name: CustomFunctionName
    # An ordered list of Viv expressions whose evaluations will be passed as
    # arguments to the function, in that same order.
    args: list[Expression]


# The name for a custom function targeted by a Viv custom-function call
CustomFunctionName: TypeAlias = str


class ArithmeticExpression(_SourceAnnotatedExpression):
    """A Viv arithmetic expression, which accepts two numeric operands and evaluates to a number."""
    # Discriminator for a Viv arithmetic expression
    type: Literal[ExpressionDiscriminator.ARITHMETIC_EXPRESSION]
    # The actual expression value
    value: ArithmeticExpressionValue


class ArithmeticExpressionValue(TypedDict):
    """The actual expression value for a Viv arithmetic expression."""
    # An expression whose evaluation will be used as the left operand in the arithmetic expression
    left: Expression
    # The arithmetic operator
    operator: ArithmeticOperator
    # An expression whose evaluation will be used as the right operand in the arithmetic expression
    right: Expression


# Enum containing the arithmetic operators supported by Viv
ArithmeticOperator = Literal["+", "-", "*", "/"]


class Assignment(_SourceAnnotatedExpression):
    """A Viv assignment (or update)."""
    # Discriminator for a Viv assignment
    type: Literal[ExpressionDiscriminator.ASSIGNMENT]
    # The actual expression value
    value: AssignmentValue


class AssignmentValue(TypedDict):
    """The actual expression value for a Viv assignment."""
    # An expression whose evaluation will be used as the left operand in the assignment/update
    left: EntityReference | SymbolReference
    # The assignment/update operator
    operator: AssignmentOperator
    # An expression whose evaluation will be used as the right operand in the assignment/update. Note
    # that for assignments that update persistent entity data, the value will always be proactively
    # dehydrated, such that all entity data included in the value will be converted into the associated
    # entity ID. We do this to prevent several potential issues, and the data can be rehydrated later on.
    right: Expression


# Enum containing the Viv assignment (and update) operators
AssignmentOperator = Literal["=", "+=", "-=", "*=", "/=", "append", "remove"]


class BoolField(_SourceAnnotatedExpression):
    """A Viv boolean."""
    # Discriminator for a Viv boolean
    type: Literal[ExpressionDiscriminator.BOOL]
    # The boolean literal to which this expression will evaluate
    value: bool


class ChanceExpression(_SourceAnnotatedExpression):
    """A Viv chance expression.

    This is a kind of condition that evaluates to True if the specified probability value (a number
    between 0.0 and 1.0) exceeds a pseudorandom number generated by the Viv interpreter.
    """
    # Discriminator for a Viv chance expression
    type: Literal[ExpressionDiscriminator.CHANCE_EXPRESSION]
    # The specified probability, which the compiler guarantees to be a number in the range [0, 1]
    value: float


class Comparison(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv comparison, whereby two values are compared using a comparator."""
    # Discriminator for a Viv comparison
    type: Literal[ExpressionDiscriminator.COMPARISON]
    # The actual expression value
    value: ComparisonValue


class ComparisonValue(TypedDict):
    """The actual expression value for a Viv comparison."""
    # An expression whose evaluation will serve as the left operand in the comparison
    left: Expression
    # The comparison operator
    operator: Comparator
    # An expression whose evaluation will serve as the right operand in the comparison
    right: Expression


# Enum containing the Viv comparison operators
Comparator = Literal["==", ">", ">=", "<", "<=", "!="]


class Conditional(_SourceAnnotatedExpression):
    """A Viv conditional expression, allowing for branching based on the value of a test."""
    # Discriminator for a Viv conditional
    type: Literal[ExpressionDiscriminator.CONDITIONAL]
    # The actual expression value
    value: ConditionalValue


class ConditionalValue(TypedDict):
    """The actual expression value for a Viv conditional."""
    # Branches representing the `if` and `elif` clauses in this conditional expression
    branches: list[ConditionalBranch]
    # If an author has provided an alternative body (via an `else` clause), a list
    # of expressions that will be evaluated/executed should the condition not hold.
    alternative: list[Expression] | None


class ConditionalBranch(TypedDict):
    """A Viv conditional branch, representing an `if` or `elif` clause."""
    # The condition that will be tested, which holds if its evaluation is truthy
    condition: Expression
    # A list of expressions that will be evaluated/executed should the condition hold
    consequent: list[Expression]


class Conjunction(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv conjunction.

    This kind of expression takes multiple expressions as operands and evaluates to
    `True` if and only if all the respective expressions evaluate to truthy values.
    """
    # Discriminator for a Viv conjunction
    type: Literal[ExpressionDiscriminator.CONJUNCTION]
    # The actual expression value
    value: ConjunctionValue


class ConjunctionValue(TypedDict):
    """The actual expression value for a Viv conjunction."""
    # A list of expressions that will be evaluated in turn to determine the result
    # of the conjunction. Note that the interpreter stops evaluating as soon as a
    # falsy evaluation is encountered.
    operands: list[Expression]


class Disjunction(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv disjunction.

    This kind which takes multiple expressions and evaluates to `True` if and only
    if at least one of the respective expressions evaluate to a truthy value.
    """
    # Discriminator for a Viv disjunction
    type: Literal[ExpressionDiscriminator.DISJUNCTION]
    # The actual expression value
    value: DisjunctionValue


class DisjunctionValue(TypedDict):
    """The actual expression value for a Viv disjunction."""
    # A list of expressions that will be evaluated in turn to determine the result
    # of the disjunction. Note that the interpreter stops evaluating as soon as a
    # truthy evaluation is encountered.
    operands: list[Expression]


class EntityReference(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv entity reference, structured as an anchor name and a (possibly empty) path to a specific property value.

    Usually, the property is on the anchor entity, but this is not the case if the reference contains
    a pointer. For instance, `@person.boss->boss->traits.cruel` would return the value stored at the
    path `traits.cruel` on the boss of the boss of the entity cast in the anchor role `@person`.

    Note that the compiler prevents an author from anchoring an entity reference in a symbol.

    Also note that references anchored in scratch variables, e.g. `$@foo.bar.baz`, are compiled
    to entity references -- this is because `$` is really just syntactic sugar for `@this.scratch.`,
    with the next sigil indicating the type of the scratch variable.
    """
    # Discriminator for a Viv entity reference
    type: Literal[ExpressionDiscriminator.ENTITY_REFERENCE]
    # The actual expression value
    value: ReferenceValue


class SymbolReference(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv symbol reference, structured as an anchor name and a (possibly empty) path to a specific property value."""
    # Discriminator for a Viv symbol reference
    type: Literal[ExpressionDiscriminator.SYMBOL_REFERENCE]
    # The actual expression value
    value: ReferenceValue


# Convenience union for an entity reference or a symbol reference
Reference: TypeAlias = EntityReference | SymbolReference


class ReferenceValue(_FailSafeComponent):
    """The actual expression value for a Viv entity reference or symbol reference."""
    # The name anchoring this reference
    anchor: RoleName | VariableName
    # If applicable, the path to a specified property value. If the reference is just to the entity
    # or symbol itself, this will be an empty list. Otherwise, it will specify a path to a specific
    # property value, either on that entity or symbol or another entity (via a pointer).
    path: list[ReferencePathComponent]
    # Whether the anchor is a local variable. This is a common pattern when an author loops over a group role.
    local: bool
    # Whether the anchor is marked as a group role, in which case it will evaluate
    # to an array containing the bindings for the role.
    group: bool


class ReferencePathComponentPropertyName(_FailSafeComponent):
    """A component of a Viv reference path specifying a property to access."""
    # Discriminator for a property-name reference path component
    type: Literal[ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_PROPERTY_NAME]
    # The name of the property to access
    name: str


class ReferencePathComponentPointer(_FailSafeComponent):
    """A component of a Viv reference path specifying a pointer to dereference."""
    # Discriminator for a pointer reference path component
    type: Literal[ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_POINTER]
    # The name of the property to access in the entity data of the entity targeted by the pointer
    propertyName: str


class ReferencePathComponentLookup(_FailSafeComponent):
    """A component of a Viv reference path specifying a property lookup or an array access.

    The key/index can be specified by an arbitrary Viv expression.
    """
    # Discriminator for a lookup reference path component
    type: Literal[ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_LOOKUP]
    # An expression that should evaluate to a valid property key (string or integer)
    key: Expression


class ReferencePathComponentDiscriminator(StrEnum):
    """Enum containing discriminators for the possible reference path components."""
    # Discriminator for a property-name reference path component
    REFERENCE_PATH_COMPONENT_PROPERTY_NAME = "referencePathComponentPropertyName"
    # Discriminator for a pointer reference path component
    REFERENCE_PATH_COMPONENT_POINTER = "referencePathComponentPointer"
    # Discriminator for a lookup reference path component
    REFERENCE_PATH_COMPONENT_LOOKUP = "referencePathComponentLookup"


# A component in a Viv reference path
ReferencePathComponent = (
    ReferencePathComponentPropertyName
    | ReferencePathComponentPointer
    | ReferencePathComponentLookup
)


class Enum(_SourceAnnotatedExpression):
    """A Viv enum.

    Enums are resolved at runtime using the host application's Viv adapter.
    """
    # Discriminator for a Viv enum
    type: Literal[ExpressionDiscriminator.ENUM]
    # The actual expression value
    value: EnumValue


class EnumValue(TypedDict):
    """The actual expression value for a Viv enum."""
    # The name of the enum. This must be resolvable by the host application at runtime.
    name: EnumName
    # Whether to flip the sign of a numeric value associated with the enum.
    minus: bool


# A unique label for an enum value
EnumName: TypeAlias = str


class FloatField(_SourceAnnotatedExpression):
    """A Viv floating-point number."""
    # Discriminator for a Viv floating-point number
    type: Literal[ExpressionDiscriminator.FLOAT]
    # The float literal to which this expression will evaluate
    value: float


class Inspection(_SourceAnnotatedExpression):
    """A Viv inspection.

    This kind of expression causes a character to *inspect* an item, which
    in turn may lead them to learn about actions inscribed in the item.
    """
    # Discriminator for a Viv inspection
    type: Literal[ExpressionDiscriminator.INSPECTION]
    # The actual expression value
    value: InspectionValue


class InspectionValue(TypedDict):
    """The actual expression value for a Viv inspection."""
    # An expression whose evaluation will be treated as the character operand in an inspection
    character: Expression
    # An expression whose evaluation will be treated as the item operand in an inspection
    item: Expression


class Inscription(_SourceAnnotatedExpression):
    """A Viv inscription.

    This kind of expression causes an item to be inscribed with knowledge about a given
    action. If a character later inspects the item, they will learn about the action.
    """
    # Discriminator for a Viv inscription
    type: Literal[ExpressionDiscriminator.INSCRIPTION]
    # The actual expression value
    value: InscriptionValue


class InscriptionValue(TypedDict):
    """The actual expression value for a Viv inscription."""
    # An expression whose evaluation will be treated as the item operand in an inscription
    item: Expression
    # An expression whose evaluation will be treated as the action operand in an inscription
    action: Expression


class IntField(_SourceAnnotatedExpression):
    """A Viv integer."""
    # Discriminator for a Viv integer
    type: Literal[ExpressionDiscriminator.INT]
    # The integer literal to which this expression will evaluate
    value: int


class ListField(_SourceAnnotatedExpression):
    """A Viv list, defined as an ordered list of Viv expressions.

    Once evaluated, the result will contain the respective evaluations of the expressions, in that same order.
    """
    # Discriminator for a Viv list
    type: Literal[ExpressionDiscriminator.LIST]
    # The actual expression value
    value: list[Expression]


class Loop(_SourceAnnotatedExpression):
    """A Viv loop, allowing for iteration over some iterable value."""
    # Discriminator for a Viv loop
    type: Literal[ExpressionDiscriminator.LOOP]
    # The actual expression value
    value: LoopValue


class LoopValue(TypedDict):
    """The actual expression value for a Viv loop."""
    # An expression that should evaluate to a value that is iterable in the runtime at hand.
    iterable: Expression
    # The local variable to which each member of the iterable is assigned on its respective iteration of the loop
    variable: LocalVariable
    # The body of the loop, structured as a list of expressions that will each be interpreted,
    # in order, on each iteration. These body expressions can reference the loop variable,
    # allowing for Viv code that acts on each member of an iterable.
    body: list[Expression]


class LocalVariable(TypedDict):
    """A Viv local variable."""
    # The name of the local variable
    name: VariableName
    # Whether the variable is marked as binding an entity (as opposed to a symbol)
    isEntityVariable: bool


# The name for a variable used in an assignment or a loop
VariableName: TypeAlias = str


class MembershipTest(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv membership test.

    This kind of expression takes two expressions as operands and evaluates to `True` if the evaluation
    of the first expression is a member of the evaluation of the second expression.
    """
    # Discriminator for a Viv membership test
    type: Literal[ExpressionDiscriminator.MEMBERSHIP_TEST]
    # The actual expression value
    value: MembershipTestValue


class MembershipTestValue(TypedDict):
    """The actual expression value for a Viv membership test."""
    # An expression whose evaluation will be used as the item operand in the membership test
    item: Expression
    # An expression whose evaluation will be used as the collection operand in the membership test
    collection: Expression


class MemoryCheck(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv memory check.

    This kind of expression takes two expressions as operands and evaluates to `True` if
    the evaluation of the first expression is a character, the second expression is an
    action, and the character has a memory of the action.
    """
    # Discriminator for a Viv memory check
    type: Literal[ExpressionDiscriminator.MEMORY_CHECK]
    # The actual expression value
    value: MemoryCheckValue


class MemoryCheckValue(TypedDict):
    """The actual expression value for a Viv memory check."""
    # An expression whose evaluation will be treated as the character operand in a memory check
    character: Expression
    # An expression whose evaluation will be treated as the action operand in a memory check
    action: Expression


class NullField(_SourceAnnotatedExpression):
    """A Viv null value."""
    # Discriminator for a Viv null value
    type: Literal[ExpressionDiscriminator.NULL_TYPE]
    # Python's `None`, which serializes to JSON's `null`. In any Viv runtime, expressions of this
    # type evaluate to the null-like value in the language at hand.
    value: None


class ObjectField(_SourceAnnotatedExpression):
    """A Viv object literal.

    Expressions of this type maps keys (string literals) to Viv expressions. Once evaluated,
    the result will map those same keys to the respective evaluations of the Viv expressions.
    """
    # Discriminator for a Viv object literal
    type: Literal[ExpressionDiscriminator.OBJECT]
    # The actual expression value
    value: dict[str, "Expression"]


class ActionSearch(_SourceAnnotatedExpression):
    """A Viv action search.

    This kind of expression specifies a search over either a character's memories or the chronicle
    (all historical actions), which will return either that collection of actions, or a subset of
    them that match a specified target query.
    """
    # Discriminator for a Viv action search
    type: Literal[ExpressionDiscriminator.ACTION_SEARCH]
    # The actual expression value
    value: ActionSearchValue


class ActionSearchValue(TypedDict):
    """The actual expression value for a Viv action search."""
    # The name of the query that will be used for the search, if any, else `None`. If none
    # is provided, the search will simply retrieve all actions in the domain.
    queryName: QueryName | None
    # Precast bindings for the target query, as asserted in the search expression
    bindings: PrecastBindings
    # A declaration for how to construct a search domain for this action search
    searchDomain: SearchDomainDeclaration


class SearchDomainDeclaration(TypedDict):
    """A declaration for how to prepare a search domain for an action search or a sifting."""
    # The policy to use when preparing the search domain
    policy: SearchDomainPreparationPolicy
    # If the search is to run over a character's memories, this is an expression that should evaluate to
    # a reference to that character. If `None` is here, the query will be run over the chronicle (all
    # historical actions), though an error will be thrown if a query is specified and it uses memory
    # criteria (the `salience` and/or `associations` fields). A few notes: The compiler will ensure
    # that a value is only present here given an expression `policy`. If there is already a search
    # domain enclosing this one, the resulting domain will  be narrowed to the intersection of the
    # two domains (the existing one and the memories of the character specified by this expression).
    # If a character has forgotten an action, it will not be included in the constructed search domain.
    expression: Expression | None


class SearchDomainPreparationPolicy(StrEnum):
    """Enum containing the valid policies for preparing search domains for story sifting."""
    # Search in the full chronicle (all historical actions)
    CHRONICLE = "chronicle"
    # Search the memories of the character specified by the domain expression
    EXPRESSION = "expression"
    # Inherit the search domain passed into the evaluation context for the action search or sifting
    INHERIT = "inherit"


class Reaction(_SourceAnnotatedExpression):
    """A Viv reaction expression.

    A reaction specifies an action that may be queued up for some time in the future,
    should an instance of the one at hand be performed.
    """
    # Discriminator for Viv reaction expressions
    type: Literal[ExpressionDiscriminator.REACTION]
    # The actual expression value
    value: ReactionValue


class ReactionValue(TypedDict):
    """A specification of the parameters defining a reaction."""
    # The name of the target construct (action or selector), i.e., the one queued up by this reaction
    targetName: ActionName | PlanName | SelectorName
    # The type of construct that the reaction will queue
    targetType: ReactionTargetConstructDiscriminator
    # Precast bindings for the target action, as asserted in the reaction declaration
    bindings: PrecastBindings
    # An expression that should evaluate to a boolean value indicating whether the reaction
    # will queue its target construct urgently. The evaluated value will be cast to a boolean,
    # so authors should be careful when using this parameter. Urgent actions and action selectors
    # receive the highest priority in action queues, while an urgent plan or plan selector will
    # be targeted (and potentially launched) upon being queued. If no expression is supplied,
    # the reaction will not be marked urgent.
    urgent: Expression | None
    # An expression that should evaluate to a numeric value specifying the priority of the queued
    # action. Within a given queue group (urgent or non-urgent), queued actions are targeted in
    # descending order of priority. The compiler will flag the use of this option in a reaction
    # queueing a plan or plan selector.
    priority: Expression | None
    # An expression that should evaluate to a location, that being the specific location
    # at which the reaction must be performed. The compiler will flag the use of this
    # option in a reaction queueing a plan or plan selector.
    location: list[SetPredicate] | None
    # A set of 0-3 temporal constraints constraining the time at which this reaction may be
    # performed. The compiler will flag the use of this option in a reaction queueing a plan
    # or plan selector.
    time: list[TemporalConstraint] | None
    # A set of expressions such that, if all of them hold (i.e., evaluate to a truthy value),
    # the reaction will be dequeued.
    abandonmentConditions: list[Expression] | None
    # An object specifying logic around repeating the reaction should it succeed. (Viv already has
    # automatic retry logic for reactions that fail.)
    repeatLogic: ReactionRepeatLogic | None


class ReactionRepeatLogic(TypedDict):
    """An object specifying logic around repeating the reaction after it *succeeds*.

    This logic is only considered when the construct queued by the reaction is successfully
    performed/executed. Note that Viv already has automatic retry logic for reactions that fail.
    """
    # A set of expressions such that, if all of them hold (i.e., evaluate to a truthy value),
    # copy of the reaction will be queued again for its initiator.
    conditions: list[Expression]
    # The maximum number of times this reaction may be repeated
    maxRepeats: int


class PrecastBindings(TypedDict):
    """Precast bindings for the targeting of some construct, as in a reaction or a sifting expression."""
    # Whether the precast bindings are marked partial, meaning additional required role
    # slots will need to be cast. The compiler will verify that all required slots
    # appear to be precast, but we will also confirm this at runtime.
    partial: bool
    # A mapping from role name to an expression that will evaluate to precast bindings for that role
    roles: dict[RoleName, Expression]


class SetPredicate(TypedDict):
    """A set predicate that allows for certain values to appear in a set against which the operand will be tested."""
    # The operator associated with this predicate
    operator: SetPredicateOperator
    # The operand to use when testing this predicate
    operand: list[Expression]


# Enum containing the valid operators for the set predicates
SetPredicateOperator = Literal["none", "any", "all", "exactly"]


class Sifting(_SourceAnnotatedExpression):
    """A Viv sifting.

    This kind of expression tests a sifting pattern against either the chronicle,
    meaning all historical actions, or a character's memories.
    """
    # Discriminator for a Viv sifting
    type: Literal[ExpressionDiscriminator.SIFTING]
    # The actual expression value
    value: SiftingValue


class SiftingValue(TypedDict):
    """The actual expression value for a Viv sifting."""
    # The name of the sifting pattern to run
    patternName: SiftingPatternName
    # Precast bindings for the target pattern, as asserted in the sifting expression
    bindings: PrecastBindings
    # A declaration for how to construct a search domain for this sifting
    searchDomain: SearchDomainDeclaration


class StringField(_SourceAnnotatedExpression):
    """A Viv string literal."""
    # Discriminator for a Viv string literal
    type: Literal[ExpressionDiscriminator.STRING]
    # The string literal to which this expression will evaluate
    value: str


class TemplateStringField(_SourceAnnotatedExpression):
    """A Viv templated string.

    This kind of expression is structured as an ordered list of string literals and string-producing
    expressions, the evaluations of which are concatenated to form the rendered string.
    """
    # Discriminator for a Viv templated string
    type: Literal[ExpressionDiscriminator.TEMPLATE_STRING]
    # The actual expression value
    value: list[str | Expression]


class TimeFrameStatement(TypedDict):
    """A temporal constraint specifying a range between two points in time."""
    # Discriminator for a time-frame temporal constraint
    type: Literal[TemporalStatementDiscriminator.TIME_FRAME]
    # The point in time at which the range opens. This is specified as a time delta (e.g., `5 days`) that
    # the host application can resolve at runtime into a point in time (by anchoring it relative to a given
    # simulation timestamp). If no delta is specified here, the range is open on this end.
    open: TimeDelta | None
    # The point in time at which the range closes. This is specified as a time delta (e.g., `5 days`) that
    # the host application can resolve at runtime into a point in time (by anchoring it relative to a given
    # simulation timestamp). If no delta is specified here, the range is open on this end.
    close: TimeDelta | None
    # For reactions only: whether to anchor the time-frame constraint in the timestamp of the action that directly
    # triggered this reaction -- meaning the action whose definition included the reaction declaration -- as opposed
    # to the current simulation timestamp. This distinction only matters for cases where a reaction is triggered
    # because a character has learned about an action after the fact. In such cases, we need to know whether a
    # time-frame constraint like "between 1 year and 3 years" holds relative to the timestamp of the original
    # action or relative to the time at which the character learned about the original action.
    useActionTimestamp: bool


class TimeDelta(TypedDict):
    """A time period (e.g., "2 weeks") that can be used as a delta to resolve a point
    in time relative to some anchor time (e.g., the current simulation time).
    """
    # The number of time units -- e.g., `2` in `2 weeks`
    amount: float
    # The unit of time -- e.g., `weeks` in `2 weeks`
    unit: TimeFrameTimeUnit


class TimeOfDayStatement(TypedDict):
    """A temporal constraint specifying a range between two times of day."""
    # Discriminator for a time-of-day temporal constraint
    type: Literal[TemporalStatementDiscriminator.TIME_OF_DAY]
    # The time of day that opens the range. If no time of day is specified here, the range
    # is open on this end. Note that the host application is tasked with determining
    # whether a given time of day has passed.
    open: TimeOfDayDeclaration | None
    # The time of day that closes the range. If no time of day is specified here, the range
    # is open on this end. Note that the host application is tasked with determining
    # whether a given time of day has passed.
    close: TimeOfDayDeclaration | None


class TimeOfDayDeclaration(TypedDict):
    """A specified time of day."""
    # The hour of day (in `[0, 23]`)
    hour: int
    # The minute of the hour of day (in `[0, 59]`)
    minute: int


# Enum containing the valid time units for time-frame statements
TimeFrameTimeUnit = Literal["minutes", "hours", "days", "weeks", "months", "years"]


class TemporalStatementDiscriminator(StrEnum):
    """Enum containing discriminators for the possible temporal constraints."""
    # Discriminator for a time-frame temporal constraint
    TIME_FRAME = "timeFrame"
    # Discriminator for a time-of-day temporal constraint
    TIME_OF_DAY = "timeOfDay"


# A temporal constraint specifying a range between either points in time or times of day
TemporalConstraint = TimeFrameStatement | TimeOfDayStatement


class TropeFit(_SourceAnnotatedExpression, _NegatableExpression):
    """A Viv "trope fit" expression.

    This kind of expression evaluates to `True` if the trope holds with the given arguments.
    """
    # Discriminator for a Viv trope-fit expression
    type: Literal[ExpressionDiscriminator.TROPE_FIT]
    # The actual expression value
    value: TropeFitValue


class TropeFitValue(TypedDict):
    """The actual expression value for a Viv trope-fit expression."""
    # The name of the trope that will be used for the test
    tropeName: TropeName
    # Precast bindings for the target trope, as asserted in the trope-fit expression
    bindings: PrecastBindings
