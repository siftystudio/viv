"""Internal types that are used by the compiler only.

The types defined here describe shapes whose life cycles begin and expire during
compilation. As such, they are not part of the public API for the compiler.
"""

from __future__ import annotations

from typing import Literal, NotRequired, Required, TypeAlias, TypedDict

from viv_compiler import external_types


class CombinedAST(TypedDict):
    """The merged AST after import resolution.

    Note: The `includes` field has been handled and is no longer present here.
    """
    # All intermediate actions across the entry file and its resolved imports
    actions: list[IntermediateActionDefinition | IntermediateChildActionDefinition]
    # All intermediate action-selector definitions across the entry file and its resolved imports
    actionSelectors: list[IntermediateActionSelectorDefinition]
    # All intermediate plan definitions across the entry file and its resolved imports
    plans: list[IntermediatePlanDefinition]
    # All intermediate plan-selector definitions across the entry file and its resolved imports
    planSelectors: list[IntermediatePlanSelectorDefinition]
    # All intermediate query definitions across the entry file and its resolved imports
    queries: list[IntermediateQueryDefinition]
    # All intermediate sifting-pattern definitions across the entry file and its resolved imports
    siftingPatterns: list[IntermediateSiftingPatternDefinition]
    # All intermediate trope definitions across the entry file and its resolved imports
    tropes: list[IntermediateTropeDefinition]


class AST(CombinedAST):
    """Visitor output for a single source file, prior to import resolution."""
    # A list of relative import paths, exactly as authored in the source file (using the
    # `include` operator). This transient field is deleted once inheritance has been handled.
    _includes: list[str]


class IntermediateConstructDefinitionBase(TypedDict, total=False):
    """A base shape that is shared across all intermediate construct definitions.

    A lone exception to this is intermediate child actions, which exist only before inheritance
    handling and have only a few required properties.
    """
    # A mapping from role name to role definition, for all roles defined for the construct
    roles: Required[dict[external_types.RoleName, external_types.RoleDefinition]]
    # A list containing all conditions on the construct (wrapping occurs midway through postprocessing)
    _conditions_raw: Required[list[external_types.Expression] | list[external_types.WrappedExpression]]


class IntermediateActionDefinition(IntermediateConstructDefinitionBase, total=False):
    """An intermediate action definition.

    If the action definition was originally a child action, this shape takes hold following inheritance.

    The shape captures the structure of action definitions throughout postprocessing.
    """
    # The `parent` field in its final schema-compliant shape, used as a discriminator distinguishing
    # an `IntermediateActionDefinition` from an `IntermediateChildActionDefinition`.
    parent: Required[None]
    # The discriminator for the action construct
    type: Required[external_types.ConstructDiscriminator.ACTION]
    # A list containing all effects defined for the action (pre-wrapping)
    _effects_raw: Required[list[external_types.Expression]]
    # A list containing all reactions declared for the action (pre-wrapping)
    _reactions_raw: Required[list[external_types.Reaction]]
    # Whether this is a transient 'template action' that is only intended to be inherited
    # by child actions, after which point it is deleted.
    _template: Required[bool]
    # (Assigned during postprocessing) The `initiator` field in its final schema-compliant shape
    initiator: external_types.RoleName
    # (Assigned during postprocessing) The `roleForestRoots` field in its final schema-compliant shape
    roleForestRoots: list[external_types.RoleName]
    # (Assigned during postprocessing) The `conditions` field in its final schema-compliant shape
    conditions: external_types.ConstructConditions
    # (Assigned during postprocessing) The `effects` field in its final schema-compliant shape
    effects: list[external_types.WrappedExpression]
    # (Assigned during postprocessing) The `reactions` field in its final schema-compliant shape
    reactions: list[external_types.WrappedExpression]
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.ActionName]
    # The `reserved` field in its final schema-compliant shape
    reserved: Required[bool]
    # The `tags` field in its final schema-compliant shape
    tags: Required[external_types.ListField]
    # The `gloss` field in its final schema-compliant shape
    gloss: Required[external_types.TemplateStringField | None]
    # The `report` field in its final schema-compliant shape
    report: Required[external_types.TemplateStringField | None]
    # The `importance` field in its final schema-compliant shape
    importance: Required[external_types.IntField | external_types.FloatField | external_types.Enum]
    # The `scratch` field in its final schema-compliant shape
    scratch: Required[list[external_types.Expression]]
    # The `saliences` field in its final schema-compliant shape
    saliences: Required[external_types.Saliences]
    # The `associations` field in its final schema-compliant shape
    associations: Required[external_types.Associations]
    # The `embargoes` field in its final schema-compliant shape
    embargoes: Required[list[external_types.EmbargoDeclaration]]


class IntermediateChildActionDefinition(TypedDict, total=False):
    """An intermediate child action definition, prior to inheritance handling.

    The shape captures the structure of child action definitions prior to inheritance handling,
    when they have only a few required properties.
    """
    # The `parent` field in its final schema-compliant shape, used as a discriminator distinguishing
    # an `IntermediateActionDefinition` from an `IntermediateChildActionDefinition`.
    parent: Required[external_types.ActionName]
    # Directives each indicating whether to merge a given field value with that of a parent,
    # as opposed to overriding the parent field value entirely.
    _join_directives: Required[list[Sentinel]]
    # The discriminator for the action construct
    type: Required[external_types.ConstructDiscriminator.ACTION]
    # A list containing all effects defined for the action (pre-wrapping)
    _effects_raw: list[external_types.Expression]
    # A list containing all reactions declared for the action (pre-wrapping)
    _reactions_raw: list[external_types.Reaction]
    # Whether this is a transient 'template action' that is only intended to be inherited
    # by child actions, after which point it is deleted.
    _template: Required[bool]
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.ActionName]
    # The `reserved` field in its final schema-compliant shape
    reserved: Required[bool]
    # The `tags` field in its final schema-compliant shape
    tags: external_types.ListField
    # The `gloss` field in its final schema-compliant shape
    gloss: external_types.TemplateStringField | None
    # The `report` field in its final schema-compliant shape
    report: external_types.TemplateStringField | None
    # The `importance` field in its final schema-compliant shape
    importance: external_types.IntField | external_types.FloatField | external_types.Enum
    # The `scratch` field in its final schema-compliant shape
    scratch: list[external_types.Expression]
    # The `saliences` field in its final schema-compliant shape
    saliences: external_types.Saliences
    # The `associations` field in its final schema-compliant shape
    associations: external_types.Associations
    # The `embargoes` field in its final schema-compliant shape
    embargoes: list[external_types.EmbargoDeclaration]


class IntermediatePlanDefinition(IntermediateConstructDefinitionBase, total=False):
    """An intermediate plan definition.

    The shape captures the structure of plan definitions throughout postprocessing.
    """
    # The discriminator for the plan construct
    type: Required[Literal[external_types.ConstructDiscriminator.PLAN]]
    # (Assigned during postprocessing) The `roleForestRoots` field in its final schema-compliant shape
    roleForestRoots: list[external_types.RoleName]
    # (Assigned during postprocessing) The `conditions` field in its final schema-compliant shape
    conditions: external_types.ConstructConditions
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.PlanName]
    # The `phases` field in its final schema-compliant shape
    phases: Required[dict[external_types.PlanPhaseName, external_types.PlanPhase]]
    # The `initialPhase` field in its final schema-compliant shape
    initialPhase: Required[external_types.PlanPhaseName]


class IntermediateQueryDefinition(IntermediateConstructDefinitionBase, total=False):
    """An intermediate query definition.

    The shape captures the structure of query definitions throughout postprocessing.
    """
    # The discriminator for the query construct
    type: Required[Literal[external_types.ConstructDiscriminator.QUERY]]
    # (Assigned during postprocessing) The `roleForestRoots` field in its final schema-compliant shape
    roleForestRoots: list[external_types.RoleName]
    # (Assigned during postprocessing) The `conditions` field in its final schema-compliant shape
    conditions: external_types.ConstructConditions
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.QueryName]
    # The `actionName` field in its final schema-compliant shape
    actionName: Required[list[external_types.SetPredicate] | None]
    # The `ancestors` field in its final schema-compliant shape
    ancestors: Required[list[external_types.SetPredicate] | None]
    # The `descendants` field in its final schema-compliant shape
    descendants: Required[list[external_types.SetPredicate] | None]
    # The `importance` field in its final schema-compliant shape
    importance: Required[external_types.QueryNumericRange | None]
    # The `tags` field in its final schema-compliant shape
    tags: Required[list[external_types.SetPredicate] | None]
    # The `salience` field in its final schema-compliant shape
    salience: Required[external_types.QueryNumericRange | None]
    # The `associations` field in its final schema-compliant shape
    associations: Required[list[external_types.SetPredicate] | None]
    # The `location` field in its final schema-compliant shape
    location: Required[list[external_types.SetPredicate] | None]
    # The `time` field in its final schema-compliant shape
    time: Required[list[external_types.TemporalConstraint] | None]
    # The `initiator` field in its final schema-compliant shape
    initiator: Required[list[external_types.SetPredicate] | None]
    # The `partners` field in its final schema-compliant shape
    partners: Required[list[external_types.SetPredicate] | None]
    # The `recipients` field in its final schema-compliant shape
    recipients: Required[list[external_types.SetPredicate] | None]
    # The `bystanders` field in its final schema-compliant shape
    bystanders: Required[list[external_types.SetPredicate] | None]
    # The `active` field in its final schema-compliant shape
    active: Required[list[external_types.SetPredicate] | None]
    # The `present` field in its final schema-compliant shape
    present: Required[list[external_types.SetPredicate] | None]


class IntermediateActionSelectorDefinition(IntermediateConstructDefinitionBase, total=False):
    """An intermediate action-selector definition.

    The shape captures the structure of action-selector definitions throughout postprocessing.
    """
    # The discriminator for the action-selector construct
    type: Required[Literal[external_types.ConstructDiscriminator.ACTION_SELECTOR]]
    # (Assigned during postprocessing) The `initiator` field in its final schema-compliant shape
    initiator: NotRequired[external_types.RoleName]
    # (Assigned during postprocessing) The `roleForestRoots` field in its final schema-compliant shape
    roleForestRoots: list[external_types.RoleName]
    # (Assigned during postprocessing) The `conditions` field in its final schema-compliant shape
    conditions: external_types.ConstructConditions
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.SelectorName]
    # The `reserved` field in its final schema-compliant shape
    reserved: Required[bool]
    # The `policy` field in its final schema-compliant shape
    policy: Required[external_types.SelectorPolicy]
    # The `candidates` field in its final schema-compliant shape
    candidates: Required[list[external_types.SelectorCandidate]]


class IntermediatePlanSelectorDefinition(IntermediateConstructDefinitionBase, total=False):
    """An intermediate plan-selector definition.

    The shape captures the structure of plan-selector definitions throughout postprocessing.
    """
    # The discriminator for the plan-selector construct
    type: Required[Literal[external_types.ConstructDiscriminator.PLAN_SELECTOR]]
    # (Assigned during postprocessing) The `roleForestRoots` field in its final schema-compliant shape
    roleForestRoots: list[external_types.RoleName]
    # (Assigned during postprocessing) The `conditions` field in its final schema-compliant shape
    conditions: external_types.ConstructConditions
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.SelectorName]
    # The `policy` field in its final schema-compliant shape
    policy: Required[external_types.SelectorPolicy]
    # The `candidates` field in its final schema-compliant shape
    candidates: Required[list[external_types.SelectorCandidate]]


class IntermediateSiftingPatternDefinition(IntermediateConstructDefinitionBase, total=False):
    """An intermediate sifting-pattern definition.

    The shape captures the structure of sifting-pattern definitions throughout postprocessing.
    """
    # The discriminator for the sifting-pattern construct
    type: Required[Literal[external_types.ConstructDiscriminator.SIFTING_PATTERN]]
    # (Assigned during postprocessing) The `roleForestRoots` field in its final schema-compliant shape
    roleForestRoots: list[external_types.RoleName]
    # (Assigned during postprocessing) The `conditions` field in its final schema-compliant shape
    conditions: external_types.ConstructConditions
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.SiftingPatternName]
    # The `actions` field in its final schema-compliant shape
    actions: Required[list[external_types.RoleName]]


class IntermediateTropeDefinition(IntermediateConstructDefinitionBase, total=False):
    """An intermediate trope definition.

    The shape captures the structure of trope definitions throughout postprocessing.
    """
    # The discriminator for the trope construct
    type: Required[Literal[external_types.ConstructDiscriminator.TROPE]]
    # (Assigned during postprocessing) The `roleForestRoots` field in its final schema-compliant shape
    roleForestRoots: list[external_types.RoleName]
    # (Assigned during postprocessing) The `conditions` field in its final schema-compliant shape
    conditions: external_types.ConstructConditions
    # The `name` field in its final schema-compliant shape
    name: Required[external_types.TropeName]


# Union covering all the intermediate construct definitions
IntermediateConstructDefinition = (
    IntermediateActionDefinition
    | IntermediateActionSelectorDefinition
    | IntermediateQueryDefinition
    | IntermediatePlanDefinition
    | IntermediatePlanSelectorDefinition
    | IntermediateSiftingPatternDefinition
    | IntermediateTropeDefinition
)


class IntermediatePlanInstructionJump(TypedDict):
    """An intermediate jump plan instruction, still containing an unresolved target offset."""
    # Discriminator for a jump plan instruction
    type: Literal[external_types.PlanInstructionDiscriminator.JUMP]
    # An offset, relative to the address of this instruction, that will point to the instruction
    # that is the target of this jump. This is resolved once the tape is linearized, which occurs
    # in the plan visitor.
    _target_offset: int


class IntermediatePlanInstructionJumpIfFalse(TypedDict):
    """An intermediate jump-if-false plan instruction, still containing an unresolved target offset."""
    # Discriminator for a jump-if-false plan instruction
    type: Literal[external_types.PlanInstructionDiscriminator.JUMP_IF_FALSE]
    # The `condition` field in its final schema-compliant shape
    _condition: external_types.Expression
    # An offset, relative to the address of this instruction, that will point to the instruction
    # that is the target of this jump. This is resolved once the tape is linearized, which occurs
    # in the plan visitor.
    _target_offset: int


class IntermediatePlanInstructionLoopNext(TypedDict):
    """An intermediate loop-next plan instruction, still containing an unresolved exit-target offset."""
    # Discriminator for a loop-next plan instruction
    type: Literal[external_types.PlanInstructionDiscriminator.LOOP_NEXT]
    # An offset, relative to the address of this instruction, that will point to the instruction
    # to jump to when the loop is exhausted. This is resolved once the tape is linearized, which
    # occurs in the plan visitor.
    _exitTarget_offset: int


class IntermediatePlanConditionalBranch(TypedDict):
    """An intermediate shape representing a branch of a conditional expression in a plan.

    The plan visitor will linearize this into a list of plan instructions.
    """
    # The condition associated with a branch, such that it will be entered if it holds while the
    # condition for no previous branch holds. If this is `None`, it's an alternative branch.
    _condition: external_types.Expression | None
    # A list containing the instructions associated with the branch
    _consequent: list[IntermediatePlanInstruction]


# Union covering all the intermediate plan instructions, most of which are in their final form
IntermediatePlanInstruction = (
    external_types.PlanInstructionAdvance
    | external_types.PlanInstructionFail
    | IntermediatePlanInstructionJump
    | IntermediatePlanInstructionJumpIfFalse
    | external_types.PlanInstructionLoopInit
    | IntermediatePlanInstructionLoopNext
    | external_types.PlanInstructionReactionQueue
    | external_types.PlanInstructionReactionWindowClose
    | external_types.PlanInstructionReactionWindowOpen
    | external_types.PlanInstructionSucceed
    | external_types.PlanInstructionWaitStart
    | external_types.PlanInstructionWaitEnd
)


class IntermediateRoleReference(TypedDict):
    """An intermediate shape containing transient data describing a role reference.

    This transient data does not survive past the visitor step, where it's used for prevalidation.
    """
    # The name of the role being referenced
    _name: external_types.RoleName
    # Whether the entity sigil introduced the reference
    _is_entity_role: bool
    # Whether the reference included the group-role decorator
    _is_group_role: bool


# A sentinel used internally by the compiler
Sentinel: TypeAlias = object
