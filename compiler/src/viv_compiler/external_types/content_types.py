"""Types associated with the higher-level concerns represented in Viv compiled content bundles."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING, Literal, TypeAlias, TypedDict

if TYPE_CHECKING:
    from .dsl_types import (
        CustomFunctionCall,
        Enum,
        EnumName,
        Expression,
        FloatField,
        IntField,
        ListField,
        LocalVariable,
        PrecastBindings,
        Reaction,
        SetPredicate,
        StringField,
        TemplateStringField,
        TimeDelta,
        TemporalConstraint
    )


class ContentBundle(TypedDict):
    """A content bundle in the format produced by the Viv compiler."""
    # Metadata for the content bundle, which is currently used for validation purposes
    metadata: ContentBundleMetadata
    # Action definitions, keyed by name
    actions: dict[ActionName, ActionDefinition]
    # Action-selector definitions, keyed by name
    actionSelectors: dict[SelectorName, ActionSelectorDefinition]
    # Plan definitions, keyed by name
    plans: dict[PlanName, PlanDefinition]
    # Query definitions, keyed by name
    queries: dict[QueryName, QueryDefinition]
    # Sifting-pattern definitions, keyed by name
    siftingPatterns: dict[SiftingPatternName, SiftingPatternDefinition]
    # Plan-selector definitions, keyed by name
    planSelectors: dict[SelectorName, PlanSelectorDefinition]
    # Trope definitions, keyed by name
    tropes: dict[TropeName, TropeDefinition]


class ContentBundleMetadata(TypedDict):
    """Metadata on the content bundle.

    This metadata attaches a Viv version number to the content bundle, which guarantees
    compatibility with any Viv runtime with the same version number.

    The metadata here is also used to support validation during initialization of a host application's
    Viv adapter by, e.g., confirming that any referenced enums and adapter functions actually exist.
    """
    # The version number for the Viv content-bundle schema at the time of compiling this
    # content bundle. All Viv runtimes will have a supported version range for content
    # bundles, and will enforce compatibility when a bundle is registered.
    schemaVersion: str
    # The Viv compiler version at the time of compiling this content bundle, stored here
    # to give provenance as a potential aid to debugging.
    compilerVersion: str
    # The Viv DSL grammar version at the time of compiling this content bundle, stored here
    # to give provenance as a potential aid to debugging.
    grammarVersion: str
    # An array containing the names of all enums referenced in the content bundle. This is
    # used for validation during the initialization of a host application's Viv adapter.
    referencedEnums: list[EnumName]
    # An array containing the names of all adapter functions referenced in the
    # content bundle. This is used for validation during the initialization of
    # a host application's Viv adapter.
    referencedFunctionNames: list[str]
    # An array specifying all reactions that are constrained by the time of day. This is used
    # for validation during the initialization of a host application's Viv adapter.
    timeOfDayParameterizedReactions: list[TimeOfDayParameterizedReaction]
    # An array specifying all queries that are parameterized by the time of day. This is used
    # for validation during the initialization of a host application's Viv adapter.
    timeOfDayParameterizedQueries: list[QueryName]
    # A flag indicating whether the content bundle has at least one assignment that modifies entity
    # data. We include this here because such assignments are not allowed in all adapter configurations.
    hasEntityDataAssignments: bool


class TimeOfDayParameterizedReaction(TypedDict):
    """A simple record of a case of reaction that is constrained by the time of day, used for validation purposes."""
    # The type of the construct definition containing a reaction that is constrained by the time of day
    constructType: ConstructDiscriminator
    # The name of the construct definition containing a reaction that is constrained by the time of day
    constructName: ActionName
    # The name of the target construct of the reaction that is constrained by the time of day
    reaction: ActionName | SelectorName | PlanName


class ConstructDiscriminator(StrEnum):
    """Enum specifying the discriminators for all Viv construct types."""
    # Discriminator for action definitions
    ACTION = "action"
    # Discriminator for action-selector definitions
    ACTION_SELECTOR = "actionSelector"
    # Discriminator for plan definitions
    PLAN = "plan"
    # Discriminator for plan-selector definitions
    PLAN_SELECTOR = "planSelector"
    # Discriminator for query definitions
    QUERY = "query"
    # Discriminator for sifting-pattern definitions
    SIFTING_PATTERN = "siftingPattern"
    # Discriminator for trope definitions
    TROPE = "trope"


# Union containing discriminators for the construct types that a reaction may queue
ReactionTargetConstructDiscriminator: TypeAlias = Literal[
    ConstructDiscriminator.ACTION,
    ConstructDiscriminator.ACTION_SELECTOR,
    ConstructDiscriminator.PLAN,
    ConstructDiscriminator.PLAN_SELECTOR
]


class ActionDefinition(TypedDict):
    """A compiled definition for a Viv action."""
    # Discriminator for the action construct type
    type: Literal[ConstructDiscriminator.ACTION]
    # The (unique) name of the action
    name: ActionName
    # Whether this action is reserved, in which case it may only be targeted via selector targeting or queueing
    reserved: bool
    # Mapping from the names of the roles associated with this action to their respective role definitions
    roles: dict[RoleName, RoleDefinition]
    # The name of the initiator role, isolated here for optimization purposes
    initiator: RoleName
    # The names of the roles constituting the roots of the trees composing role-dependency forest for
    # this action definition. The roots are given in the order by which role casting should proceed.
    roleForestRoots: list[RoleName]
    # An expression yielding a numeric importance score the action, for purposes of story sifting
    importance: IntField | FloatField | Enum
    # Tags on the action. These are meant to facilitate search over actions, during story
    # sifting, and their function may be extended in the host application.
    tags: ListField
    # Definition for a simple templated string describing this action in a sentence or so
    gloss: StringField | TemplateStringField | None
    # Definition for a more detailed templated string describing this action in a paragraph or so
    report: StringField | TemplateStringField | None
    # Conditions for the action, grouped by role name (with the special global-conditions key). A condition
    # is an expression that must hold (i.e., evaluate to a truthy value) in order for an action to be performed
    # with a prospective cast.
    conditions: ConstructConditions
    # An ordered set of expressions that prepare a set of temporary variables that may be referenced
    # downstream in the action definition. These temporary variables can be referenced by an author
    # using the `$` sigil, but this is syntactic sugar for `@this.scratch` — e.g., `$&foo` is equivalent
    # to `@this.scratch.foo`, with the second sigil indicating the type of the scratch variable.
    scratch: list[Expression]
    # An ordered set of expressions that, when executed, cause updates to the host application state
    effects: list[WrappedExpression]
    # A set of expressions that each produce a reaction when evaluated. A reaction specifies an action that
    # may be queued up for some time in the future, should an instance of the one at hand be performed.
    reactions: list[WrappedExpression]
    # Specifications for yielding numeric salience values for the action
    saliences: Saliences
    # Specifications for yielding subjective associations for the action
    associations: Associations
    # Embargo directives, which are authorial levers for controlling the frequency
    # with which this action will be performed in the host application.
    embargoes: list[EmbargoDeclaration]


# A unique name for an action
ActionName: TypeAlias = str


class ConstructConditions(TypedDict):
    """Conditions that must hold in order to target a given construct."""
    # Global construct conditions, meaning ones that do not reference any roles
    # and can thus be tested immediately upon targeting a construct.
    globalConditions: list[WrappedExpression]
    # Standard conditions, keyed by the role during whose casting they will be tested
    roleConditions: dict[RoleName, list[WrappedExpression]]


class RoleDefinition(TypedDict):
    """A definition for a role."""
    # A name for this role, unique only within the associated action definition
    name: RoleName
    # The type of entity (or symbol) that must be cast in this role
    entityType: RoleEntityType
    # The minimum number of slots to cast for this role
    min: int
    # The maximum number of slots to cast for this role
    max: int
    # The name of this role's parent, if any, in the dependency tree that is used
    # during role casting. This dependency tree is used to optimize this process.
    parent: RoleName | None
    # The names of this role's children, if any, in the dependency tree that is
    # used during casting. This dependency tree is used to optimize this process.
    children: list[RoleName]
    # If specified, a directive specifying the pool of entities who may be cast into this role at a given
    # point in time, given an initiator and possibly other prospective role bindings. If this is an action
    # role, and if there is an active search domain (from an action search or a sifting), the pool will
    # automatically be filtered to actions in the search domain.
    pool: CastingPool | None
    # If specified, the chance that a qualifying entity will be cast into the role. This field was
    # first implemented to support a pattern of specifying how likely it is that a given nearby
    # character will witness an action, which can be accomplished by defining a `bystander` role
    # with a high `max` and a specified `chance` value. Chance values are always guaranteed to
    # fall between `0.0` and `1.0`.
    chance: float | None
    # A mean on which to anchor a distribution from which will be sampled the number of entities
    # to cast into the role. This distribution must also be parameterized by a `sd` value.
    mean: float | None
    # Standard deviation for a distribution from which will be sampled the number of entities
    # to cast into the role. This distribution must also be parameterized by a `mean` value.
    sd: float | None
    # If applicable, the mode of participation for a character cast in this role. This field
    # is only non-null for action roles that cast characters who are physically present for
    # the action (i.e., ones for which `anywhere` is `false`).
    participationMode: RoleParticipationMode | None
    # Whether an entity cast in this role does not need to be physically present for the action. Note that
    # the entity *can* still be physically present, so authors should take care to write conditions specifying
    # whether an entity must be present, as needed. Currently, this only applies to characters and items,
    # though roles casting all other entity types will have `True` here.
    anywhere: bool
    # Whether this role must be precast and never cast through typical role casting. For an action, a role
    # can be "precast" via a reaction declaration that targets the action. For other constructs, a role
    # can be precast in the expression targeting the construct -- e.g., an action search can precast a role
    # for a query. If an action has a precast role, it must be marked `reserved`, because there is no way
    # to cast a precast role via general action targeting.
    precast: bool
    # Whether the entity cast in this role is to be constructed as a result of the associated
    # action. Spawn roles are always accompanied by an entity recipe.
    spawn: bool
    # For `spawn` roles only, an adapter-function call that will cause the new entity
    # (to be cast in this role) to be constructed before returning its entity ID.
    spawnFunction: CustomFunctionCall | None
    # If this role is an alias for a role in a parent definition, this will
    # store the name of the original role.
    renames: RoleName | None


# A name for an action role (unique only within its action definition)
RoleName: TypeAlias = str


class RoleEntityType(StrEnum):
    """Enum specifying the entity types that may be associated with a role definition."""
    # The role casts an action
    ACTION = "action"
    # The role casts a character
    CHARACTER = "character"
    # The role casts an item
    ITEM = "item"
    # The role casts a location
    LOCATION = "location"
    # The role casts a symbol
    SYMBOL = "symbol"


class RoleParticipationMode(StrEnum):
    """Enum specifying the participation modes for action roles that cast characters.

    To be clear, these are *only* applicable to action roles that cast characters.
    """
    # The role casts a bystander who is an uninvolved witness to the associated action
    BYSTANDER = "bystander"
    # The role casts the single initiator of an action
    INITIATOR = "initiator"
    # The role casts a partner who helps to initiate an action
    PARTNER = "partner"
    # The role casts a recipient of an action
    RECIPIENT = "recipient"


class CastingPool(TypedDict):
    """A directive specifying the pool of entities who may be cast into a role at a given
    point in time, given an initiator and possibly other prospective role bindings.
    """
    # The Viv expression that should evaluate to a casting pool
    body: Expression
    # Whether the casting pool is uncachable. A casting pool is cachable so long as the associated
    # pool declaration *does not* reference a non-initiator role, in which case the role pool would
    # have to be re-computed if the parent role(s) are re-cast (which never happens with an
    # initiator role). When a casting pool is cached, it is not recomputed even as other
    # non-initiator roles are re-cast.
    uncachable: bool


class Saliences(TypedDict):
    """Specifications for determining a numeric salience score for the action that will be held
    by a given character who experiences, observes, or otherwise learns about the action.
    """
    # A specification for a default value to be used as a fallback for any character for which there is no
    # applicable `roles` entry and for which no `custom` expression yielded a value. This will always be
    # structured as a Viv enum, int, or float, where even the enum should resolve to a numeric value.
    default: SalienceScoreExpression
    # A mapping from role names to expressions yielding salience values. For a character who is bound
    # in the given role, the corresponding expression will determine the salience value.
    roles: dict[RoleName, SalienceScoreExpression]
    # For characters for whom no `roles` entry applies, a series of zero or more custom salience-yielding
    # expressions will be evaluated, with the character bound to the local variable specified in the
    # `variable` property. These will be evaluated in turn, with the first numeric evaluated value
    # being assigned as the character's salience. This field is only used if there is no applicable
    # per-role field for the character at hand. If no custom expression evaluates to a numeric value,
    # the default value will be used.
    custom: list[Expression]
    # If there is a non-empty `custom` field, the local variable to which a character will be bound when
    # computing a salience for them. This allows for evaluation of the body expressions, which may refer
    # to this variable in order to do things like conditionalize salience based on the character at hand.
    variable: LocalVariable | None


# An expression that evaluates to a numeric salience score
SalienceScoreExpression: TypeAlias = "Enum | IntField | FloatField"


class Associations(TypedDict):
    """Specifications for determining the subjective associations for the action that will be held
    by a given character who experiences, observes, or otherwise learns about the action.
    """
    # A specification for a default value to be used as a fallback for any character for which there is no
    # applicable `roles` entry and for which no `custom` expression yielded a value. This will always be
    # structured as a Viv list whose elements will be simple Viv string expressions.
    default: ListField
    # A mapping from role names to Viv lists whose elements will be simple Viv string expressions. For a
    # character who is bound in the given role, the corresponding expression will determine their associations.
    roles: dict[RoleName, ListField]
    # For characters for whom no `roles` entry applies, a series of zero or more custom associations-yielding
    # expressions will be evaluated, with the character bound to the local variable specified in the `variable`
    # property. These will be evaluated in turn, with the first evaluated string array being assigned as the
    # character's salience. This field is only used if there is no applicable per-role field for the character
    # at hand. If no custom expression evaluates to a numeric value, the default value will be used.
    custom: list[Expression]
    # If there is a non-empty `custom` field, the local variable to which a character will be bound when
    # computing associations for them. This allows for evaluation of the body expressions, which may refer
    # to this variable in order to do things like conditionalize associations based on the character at hand.
    variable: LocalVariable | None


class EmbargoDeclaration(TypedDict):
    """An embargo declaration constraining the subsequent performance of an associated action."""
    # Names for all the roles constituting the bindings over which this embargo holds. For instance,
    # if two roles R1 and R2 were specified here, and if an action A was performed with bindings
    # R1=[E1] and R2=[E2, E3], then this embargo would hold over all cases of A with any prospective
    # bindings that cast E1 in R1 and *either* E2 and/or E3 in R2. Stated differently, the embargo
    # holds if for all roles specified here, some subset overlaps between the embargo role bindings
    # and the prospective role bindings. Often, an embargo will only specify an initiator.
    roles: list[RoleName] | None
    # Whether the embargo is permanent. If so, `period` will always be null, and exactly one of
    # the fields is guaranteed to be truthy.
    permanent: bool
    # For an embargo that is not permanent, a specification of the time period over which the embargo
    # will hold. If `period` is present, `permanent` will always be false, and exactly one of the
    # fields is guaranteed to be truthy.
    period: TimeDelta | None
    # Whether the embargo holds only over a certain location, that being the location
    # at which an instance of the associated action has just been performed.
    here: bool


class QueryDefinition(TypedDict):
    """A query used to search for actions in a character's memories or in the chronicle."""
    # Discriminator for the query construct type
    type: Literal[ConstructDiscriminator.QUERY]
    # The (unique) name of the query
    name: QueryName
    # Mapping from the names of the roles associated with this query to their respective
    # role definitions. Note that a query may have zero roles, in which case this is empty.
    roles: dict[RoleName, RoleDefinition]
    # The names of the roles constituting the roots of the trees composing role-dependency forest for
    # this query definition. The roots are given in the order by which role casting should proceed.
    roleForestRoots: list[RoleName]
    # Conditions for the query, grouped by role name (with the special global-conditions key). A condition
    # is an expression that must hold (i.e., evaluate to a truthy value) in order for a query to match.
    conditions: ConstructConditions
    # If specified, a component specifying permissible action names for matches to the query
    actionName: list[SetPredicate] | None
    # If specified, a component specifying permissible causal ancestors for matches to the query
    ancestors: list[SetPredicate] | None
    # If specified, a component specifying permissible causal descendants for matches to the query
    descendants: list[SetPredicate] | None
    # If specified, a component specifying a permissible importance range for matches to the query
    importance: QueryNumericRange | None
    # If specified, a component specifying permissible tags for matches to the query
    tags: list[SetPredicate] | None
    # If specified, a component specifying a permissible salience range for matches to the query. If this
    # query is targeted with the chronicle as a search domain, an error will be thrown, since the query
    # applies to character memories.
    salience: QueryNumericRange | None
    # If specified, a component specifying permissible associations for matches to the query. If this
    # query is targeted with the chronicle as a search domain, an error will be thrown, since the query
    # applies to character memories.
    associations: list[SetPredicate] | None
    # If specified, a component specifying permissible locations for matches to the query
    location: list[SetPredicate] | None
    # If specified, a component specifying permissible performance times for matches to the query
    time: list[TemporalConstraint] | None
    # If specified, a component specifying permissible initiator-role bindings for matches to the query
    initiator: list[SetPredicate] | None
    # If specified, a component specifying permissible partner-role bindings for matches to the query
    partners: list[SetPredicate] | None
    # If specified, a component specifying permissible recipient-role bindings for matches to the query
    recipients: list[SetPredicate] | None
    # If specified, a component specifying permissible bystander-role bindings for matches to the query
    bystanders: list[SetPredicate] | None
    # If specified, a component specifying permissible active-role bindings for matches to the query
    active: list[SetPredicate] | None
    # If specified, a component specifying permissible present-role bindings for matches to the query
    present: list[SetPredicate] | None


# A unique name for a query
QueryName: TypeAlias = str


class QueryNumericRange(TypedDict):
    """A permissible numeric range used in a query."""
    # The lower bound of the range, if there is one, else `None`
    lower: QueryNumericRangeBound | None
    # The upper bound of the range, if there is one, else `None`
    upper: QueryNumericRangeBound | None


class QueryNumericRangeBound(TypedDict):
    """A bound on a permissible numeric range used in a query."""
    # The number at this bound of a range
    value: IntField | FloatField | Enum
    # Whether this bound is inclusive
    inclusive: bool


class PlanDefinition(TypedDict):
    """The definition for a plan, which an author defines to orchestrate complex action sequences
    that may play out over extended periods of story time.

    A plan is composed primarily by an ordered set of phases, each of which centers on a *tape* of plan
    instructions. The plan executor executes a phase by stepping a program counter through the phase tape,
    which specifies control flow along with instructions for queueing the material that makes up the plan.
    """
    # Discriminator for the plan construct type
    type: Literal[ConstructDiscriminator.PLAN]
    # The (unique) name of the plan
    name: PlanName
    # Mapping from the names of the roles associated with this plan to their respective role
    # definitions. Note that the roles appear in the order in which the author defined them.
    roles: dict[RoleName, RoleDefinition]
    # The names of the roles constituting the roots of the trees composing role-dependency forest for this
    # plan definition. The roots are given in the order by which role casting will proceed.
    roleForestRoots: list[RoleName]
    # Conditions for the plan, grouped by role name (with the special global-conditions key). A condition is
    # an expression that must hold (i.e., evaluate to a truthy value) in order for the plan to be launched.
    conditions: ConstructConditions
    # A mapping from phase name to phase definition, for all the phases structuring the plan. Note that
    # the individual phases each point to the next phase, so we don't need to maintain order here.
    phases: dict[PlanPhaseName, PlanPhase]
    # The name of the initial phase in the plan. Plan execution will always begin in this phase.
    initialPhase: PlanPhaseName


# A unique name for a plan
PlanName: TypeAlias = str


class PlanPhase(TypedDict):
    """A phase in a plan, which is structured as a tape of instructions for which execution can
    be arbitrary paused according to the author-defined control flow.

    For instance, an author can specify that the plan will not resume until some period of story time
    has elapsed, or until one of the reactions in a group has been performed, and so forth.
    """
    # The name for the phase, guaranteed to be unique (only) within the enclosing plan
    name: PlanPhaseName
    # The name of the next phase in the plan, if any, else `None` if it's the last phase in the
    # plan. Completion of a final phase causes the plan to resolve with a final success status.
    next: PlanPhaseName | None
    # A list containing the compiled instruction tape for this phase, such that each array index serves
    # as an address. If execution reaches the end of the tape, execution proceeds to the next phase in
    # the plan, if there is one; otherwise, the plan succeeds.
    tape: list[PlanInstruction]


# A name for a plan phase, guaranteed to be unique only within the enclosing plan
PlanPhaseName: TypeAlias = str


class PlanInstructionAdvance(TypedDict):
    """A plan instruction that advances to the next plan phase, skipping any remaining
    instructions in the current phase.
    """
    # Discriminator for an advance plan instruction
    type: Literal[PlanInstructionDiscriminator.ADVANCE]


class PlanInstructionFail(TypedDict):
    """A plan instruction that resolves the plan with a final failure status."""
    # Discriminator for a fail plan instruction
    type: Literal[PlanInstructionDiscriminator.FAIL]


class PlanInstructionJump(TypedDict):
    """A plan instruction that causes an unconditional jump to a different position
    in the phase's instruction tape.
    """
    # Discriminator for a jump plan instruction
    type: Literal[PlanInstructionDiscriminator.JUMP]
    # The instruction address to which execution will jump unconditionally
    target: PlanInstructionAddress


class PlanInstructionJumpIfFalse(TypedDict):
    """A plan instruction that specifies a conditional jump to a different position in the phase's
    instruction tape.

    If the condition does not hold, the plan executor will proceed to the next instruction
    (i.e., increment program counter by one). This enables conditionals in plan bodies.
    """
    # Discriminator for a jump-if-false plan instruction
    type: Literal[PlanInstructionDiscriminator.JUMP_IF_FALSE]
    # The condition to evaluate. If it does *not* hold, execution will proceed to the instruction address specified
    # in the `target` field, else it will proceed to the next instruction (by incrementing the counter by one).
    condition: Expression
    # The instruction address to which execution will jump if `condition` does not hold
    target: PlanInstructionAddress


class PlanInstructionLoopInit(TypedDict):
    """A plan instruction that initializes a loop frame."""
    # Discriminator for a loop-init plan instruction
    type: Literal[PlanInstructionDiscriminator.LOOP_INIT]
    # The expression yielding the iterable to loop over. This will be evaluated once, at the time
    # the loop is initialized. For example, a loop over `@foo.friends` with a loop-body instruction
    # causing a one-year wait after each iteration would still be operating over the friends that
    # `@foo` had at the time the loop was entered (years ago, in diegetic terms).
    iterable: Expression
    # The local variable to bind on each iteration, which the plan executor stores in the loop
    # frame that will be created when executing this instruction.
    variable: LocalVariable


class PlanInstructionLoopNext(TypedDict):
    """A plan instruction that advances an active loop frame by one iteration, or else exits
    the loop if the iterable has been exhausted.

    If there is a next element in the iterable, the plan executor will bind it to the loop variable and
    fall through to the next instruction (i.e., increment by the program counter by one). If the iterable
    has been exhausted, the executor will jump to the instruction address specified by `exitTarget`.
    """
    # Discriminator for a loop-next plan instruction
    type: Literal[PlanInstructionDiscriminator.LOOP_NEXT]
    # The instruction address to jump to when the loop is exhausted. If the iterable is empty
    # from the start, the loop will immediately exit by virtue of this instruction.
    exitTarget: PlanInstructionAddress


class PlanInstructionReactionQueue(TypedDict):
    """A plan instruction that causes queueing of an action, plan, or selector according to a specified reaction."""
    # Discriminator for a reaction-queue plan instruction
    type: Literal[PlanInstructionDiscriminator.REACTION_QUEUE]
    # The reaction declaration
    reaction: Reaction


class PlanInstructionReactionWindowOpen(TypedDict):
    """A plan instruction that opens a new reaction window whose resolution will be governed by
    an operator specified in the corresponding window-close instruction."""
    # Discriminator for a plan instruction that opens a reaction window
    type: Literal[PlanInstructionDiscriminator.REACTION_WINDOW_OPEN]


class PlanInstructionReactionWindowClose(TypedDict):
    """A plan instruction that closes the active reaction window, pending resolution that is
    governed by a specified operator."""
    # Discriminator for a plan instruction that closes the active reaction window
    type: Literal[PlanInstructionDiscriminator.REACTION_WINDOW_CLOSE]
    # The logical operator that will govern resolution of the reaction window
    operator: PlanPhaseReactionWindowOperator


class PlanInstructionSucceed(TypedDict):
    """A plan instruction that resolves the plan with a final success status."""
    # Discriminator for a succeed plan instruction
    type: Literal[PlanInstructionDiscriminator.SUCCEED]


class PlanInstructionWaitEnd(TypedDict):
    """A plan instruction that resumes plan execution following a pause imposed by a wait-start instruction."""
    # Discriminator for a wait-end plan instruction
    type: Literal[PlanInstructionDiscriminator.WAIT_END]
    # If specified, a set of expressions that must hold to resume plan execution prior to the timeout elapsing
    resumeConditions: list[Expression] | None


class PlanInstructionWaitStart(TypedDict):
    """A plan instruction that commences a pause on plan execution that will persist
    until a timeout elapses or a set of conditions hold.
    """
    # Discriminator for a wait plan instruction
    type: Literal[PlanInstructionDiscriminator.WAIT_START]
    # A timeout, expressed as the maximum period of story time to wait counting from the time
    # at which this instruction was executed.
    timeout: TimeDelta


# An address for an instruction in a plan phase, which is really just as an index into the
# phase's `tape` array property. As plan execution proceeds, the executor maintains the
# address for the current instruction as a program counter.
PlanInstructionAddress: TypeAlias = int


class PlanInstructionDiscriminator(StrEnum):
    """Discriminator values for compiled plan instructions."""
    # Advance to the next phase in the plan
    ADVANCE = "advance"
    # Resolve the plan with a final failure status
    FAIL = "fail"
    # Jump unconditionally to a new plan instruction
    JUMP = "jump"
    # Jump to a new plan instruction if a condition does not hold
    JUMP_IF_FALSE = "jumpIfFalse"
    # Initialize a `foreach`-style loop frame
    LOOP_INIT = "loopInit"
    # Advance an active loop frame to the next iteration, or exit the loop if its iterations have been exhausted
    LOOP_NEXT = "loopNext"
    # Queue a single reaction
    REACTION_QUEUE = "reactionQueue"
    # Open a new reaction window
    REACTION_WINDOW_OPEN = "reactionWindowOpen"
    # Close the active reaction window, and start trying to resolve the window according to its operator
    REACTION_WINDOW_CLOSE = "reactionWindowClose"
    # Resolve the plan with a final success status
    SUCCEED = "succeed"
    # Resume execution of the plan following a pause imposed by a wait-start instruction
    WAIT_END = "waitEnd"
    # Commence a pause on execution of the plan that will persist until a timeout occurs (diegetic duration),
    # or until an optional set of author-supplied conditions hold.
    WAIT_START = "waitStart"


class PlanPhaseReactionWindowOperator(StrEnum):
    """Enum containing the valid operators for reaction windows.

    When a reaction window is active during execution of a plan phase, all reactions that are queued during
    the window are tracked. Once the end of the window is reached, execution focuses on resolving the window
    according to its operator. Depending on the operator and the reaction outcomes, this may require all the
    queued reactions to be resolved.

    Note: The DSL allows for authors to use the `untracked` operator, but this is equivalent to declaring
    a sequence of bare reactions, and in fact this is how an `untracked` window is compiled. As such, the
    operator never makes it into the compiled content bundle, hence its not appearing here.
    """
    # All the reactions must be performed/launched in order for plan execution to proceed. Note that
    # plan execution will always proceed if no reactions are queued during the reaction window.
    ALL = "all"
    # At least one of the reactions must be performed/launched in order for plan execution to proceed. Note
    # that the plan will always fail if no reactions are queued during the reaction window.
    ANY = "any"


# A Viv plan instruction
PlanInstruction = (
        PlanInstructionAdvance
        | PlanInstructionFail
        | PlanInstructionJump
        | PlanInstructionJumpIfFalse
        | PlanInstructionLoopInit
        | PlanInstructionLoopNext
        | PlanInstructionReactionQueue
        | PlanInstructionReactionWindowClose
        | PlanInstructionReactionWindowOpen
        | PlanInstructionSucceed
        | PlanInstructionWaitStart
        | PlanInstructionWaitEnd
)


class _SelectorDefinitionBase(TypedDict):
    """Base class for action-selector definitions and plan-selector definitions."""
    # The (unique) name of the selector
    name: SelectorName
    # Mapping from the names of the roles associated with this selector to their respective role
    # definitions. Note that the roles appear in the order in which the author defined them.
    roles: dict[RoleName, RoleDefinition]
    # The names of the roles constituting the roots of the trees composing role-dependency forest for this
    # selector definition. The roots are given in the order by which role casting will proceed.
    roleForestRoots: list[RoleName]
    # Conditions for the selector, grouped by role name (with the special global-conditions key). A condition is
    # an expression that must hold (i.e., evaluate to a truthy value) in order for the selector to be targeted.
    conditions: ConstructConditions
    # The sort policy that will be used to determine the order in which candidates will be targeted
    policy: SelectorPolicy
    # The candidates (actions and/or other action selectors) that may be targeted via this selector
    candidates: list[SelectorCandidate]


# A unique name for a selector
SelectorName: TypeAlias = str


class SelectorPolicy(StrEnum):
    """Enum containing the valid selector policies."""
    # Target the candidates in the author-specified order
    ORDERED = "ordered"
    # Target the candidates in random order
    RANDOMIZED = "randomized"
    # Target the candidates in weighted random order
    WEIGHTED = "weighted"


class SelectorCandidate(TypedDict):
    """A candidate that may be targeted via a selector."""
    # The name of the candidate, i.e., the name of the construct to target
    name: ActionName | PlanName | SelectorName
    # Whether the candidate is a selector. The compiler ensures that action selectors can only
    # target other action selectors, and that plan selectors can only target other plan selectors.
    isSelector: bool
    # Precast bindings for the candidate, as asserted in the selector definition
    bindings: PrecastBindings
    # If applicable, an expression that will evaluate to the weight for this candidate,
    # which will be used as part of a weighted random sort procedure.
    weight: Expression | None


class ActionSelectorDefinition(_SelectorDefinitionBase):
    """The definition for an action selector, which groups candidate actions (and potentially other action
    selectors) under a targeting policy and succeeds upon successful targeting of one of the candidates.
    """
    # Discriminator for the action-selector construct type
    type: Literal[ConstructDiscriminator.ACTION_SELECTOR]
    # Whether this selector is reserved, in which case it may only be targeted via selector targeting or queueing
    reserved: bool
    # The name of the initiator role, isolated here for optimization purposes
    initiator: RoleName


class PlanSelectorDefinition(_SelectorDefinitionBase):
    """The definition for a plan selector, which groups candidate plans (and potentially other plan
    selectors) under a targeting policy and succeeds upon successful launching of one of the candidates.
    """
    # Discriminator for the plan-selector construct type
    type: Literal[ConstructDiscriminator.PLAN_SELECTOR]


class SiftingPatternDefinition(TypedDict):
    """The definition for a sifting pattern, which is used to retrieve a sequence of
    actions that together may be construed as constituting the events in a story.
    """
    # Discriminator for the sifting-pattern construct type
    type: Literal[ConstructDiscriminator.SIFTING_PATTERN]
    # The (unique) name of the sifting pattern
    name: SiftingPatternName
    # Mapping from the names of the roles associated with this sifting pattern to their respective
    # role definitions. This will include the role definitions defined in the 'actions' section of a
    # sifting-pattern definition, whose role names will also be stored in the `actions` property here.
    roles: dict[RoleName, RoleDefinition]
    # The names of the roles constituting the roots of the trees composing role-dependency forest for this
    # sifting-pattern definition. The roots are given in the order by which role casting should proceed.
    roleForestRoots: list[RoleName]
    # Conditions for the sifting pattern, grouped by role name (with the special global-conditions key). A condition
    # is an expression that must hold (i.e., evaluate to a truthy value) in order for the sifting pattern to match.
    conditions: ConstructConditions

    # An array containing the roles names for all the actions to expose in a match for this pattern. These will
    # correspond to a subset of the roles defined in the `roles` property.
    actions: list[RoleName]


# A unique name for a sifting pattern
SiftingPatternName: TypeAlias = str


class TropeDefinition(TypedDict):
    """A definition for a Viv trope (reusable bundle of conditions)."""
    # Discriminator for the trope construct type
    type: Literal[ConstructDiscriminator.TROPE]
    # The (unique) name of the trope
    name: TropeName
    # Mapping from the names of the roles associated with this trope to their respective role definitions
    roles: dict[RoleName, RoleDefinition]
    # The names of the roles constituting the roots of the trees composing role-dependency forest for
    # this trope definition. The roots are given in the order by which role casting should proceed.
    roleForestRoots: list[RoleName]
    # Conditions for the trope, grouped by role name (with the special global-conditions key). A condition is an
    # expression that must hold (i.e., evaluate to a truthy value) in order for the trope to fit a given cast.
    conditions: ConstructConditions


# A unique name for a trope
TropeName: TypeAlias = str


# A Viv construct definition
ConstructDefinition = (
    ActionDefinition
    | ActionSelectorDefinition
    | QueryDefinition
    | PlanDefinition
    | PlanSelectorDefinition
    | SiftingPatternDefinition
    | TropeDefinition
)


class WrappedExpression(TypedDict):
    """A Viv expression wrapped with an array containing the names of all roles that it references.

    These reference lists are used for various optimizations.
    """
    # The actual Viv expression that is being wrapped
    body: Expression
    # Names of the roles referenced in the Viv expression
    references: list[RoleName]
