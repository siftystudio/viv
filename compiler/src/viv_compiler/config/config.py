"""System configuration for the Viv DSL compiler.

Important: These settings are only meant to be modified in the course of system development, i.e.,
by the compiler maintainers and not by end users. That said, certain user-supplied default values
will be used programmatically to update some of the default values below.
"""

from typing import Final

from viv_compiler import external_types


# A default importance value, to be used when the CLI user (or API caller) does not provide one
DEFAULT_IMPORTANCE_SCORE = 1.0

# A default salience value, to be used when the CLI user (or API caller) does not provide one
DEFAULT_SALIENCE_SCORE = 1.0

# A default reaction priority value, to be used when the CLI user (or API caller) does not provide one
DEFAULT_REACTION_PRIORITY_VALUE = 1.0

# Name of the root symbol in the Viv DSL grammar
GRAMMAR_ROOT_SYMBOL: Final = "file"

# Name of the symbol associated with comments in the Viv DSL grammar
GRAMMAR_COMMENT_SYMBOL: Final = "comment"

# Viv expression types that support negation. While the grammar (and therefore the parser)
# will allow for negation in other expression types, the validator will use this config
# parameter to enforce this policy.
NEGATABLE_EXPRESSION_TYPES: Final = {
    external_types.ExpressionDiscriminator.ACTION_RELATION,
    external_types.ExpressionDiscriminator.CUSTOM_FUNCTION_CALL,
    external_types.ExpressionDiscriminator.COMPARISON,
    external_types.ExpressionDiscriminator.CONJUNCTION,
    external_types.ExpressionDiscriminator.DISJUNCTION,
    external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
    external_types.ExpressionDiscriminator.LOOP,
    external_types.ExpressionDiscriminator.MEMBERSHIP_TEST,
    external_types.ExpressionDiscriminator.MEMORY_CHECK,
    external_types.ExpressionDiscriminator.SYMBOL_REFERENCE,
    external_types.ExpressionDiscriminator.TROPE_FIT,
}

# A tuple containing the construct types that take on initiator roles
CONSTRUCT_TYPES_USING_INITIATOR_ROLES: Final = (
    external_types.ConstructDiscriminator.ACTION,
    external_types.ConstructDiscriminator.ACTION_SELECTOR,
)

# Mapping from construct type to the role labels permitted in construct definitions of that type
ROLE_LABELS_PERMITTED_IN_CONSTRUCT_OF_TYPE: Final = {
    external_types.ConstructDiscriminator.ACTION: (
        'action', 'anywhere', 'bystander', 'character', 'initiator', 'item',
        'location', 'partner', 'precast', 'recipient', 'spawn', 'symbol'
    ),
    external_types.ConstructDiscriminator.ACTION_SELECTOR: (
        'action', 'anywhere', 'bystander', 'character', 'initiator', 'item',
        'location', 'partner', 'precast', 'recipient', 'symbol'
    ),
    external_types.ConstructDiscriminator.PLAN: (
        'action', 'anywhere', 'character', 'item', 'location', 'precast', 'symbol'
    ),
    external_types.ConstructDiscriminator.PLAN_SELECTOR: (
        'action', 'anywhere', 'character', 'item', 'location', 'precast', 'symbol'
    ),
    external_types.ConstructDiscriminator.QUERY: (
        'action', 'anywhere', 'character', 'item', 'location', 'precast', 'symbol'
    ),
    external_types.ConstructDiscriminator.SIFTING_PATTERN: (
        'action', 'anywhere', 'character', 'item', 'location', 'precast', 'symbol'
    ),
    external_types.ConstructDiscriminator.TROPE: (
        'action', 'anywhere', 'character', 'item', 'location', 'precast', 'symbol'
    ),
}

# Sets of role labels such that only one from the set may be present for a given role
MUTUALLY_INCOMPATIBLE_ROLE_LABELS: Final = (
    ("character", "item", "location", "action", "symbol"),  # Not possible, but belt and suspenders
    ("initiator", "partner", "recipient", "bystander", "anywhere"),
    ("spawn", "symbol"),
    ("spawn", "action"),
    ("spawn", "initiator"),
)

# Name for the special action self-reference role, which is always bound to the action itself
ACTION_SELF_REFERENCE_ROLE_NAME: Final = "this"

# A set containing the special role names that are automatically created by Viv at various points
SPECIAL_ROLE_NAMES: Final = {"hearer", ACTION_SELF_REFERENCE_ROLE_NAME}

# The path to which the scratch-variable sigil `$` expands. This sigil is really just syntactic sugar for
# the path `@this.scratch`, which stores a blackboard local to a performed action. For instance, the scratch
# operation `$@foo.bar = 99` is syntactic sugar for the expression `@this.scratch.foo.bar = 99`.
SCRATCH_VARIABLE_REFERENCE_ANCHOR: Final = ACTION_SELF_REFERENCE_ROLE_NAME
SCRATCH_VARIABLE_REFERENCE_PATH_PREFIX: Final = [
    external_types.ReferencePathComponentPropertyName(
        type=external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_PROPERTY_NAME,
        name="scratch",
        failSafe=False
    )
]

# A tuple containing the names of action fields in which assignments are permitted
ACTION_FIELDS_PERMITTING_ASSIGNMENTS: Final = ("scratch", "effects",)

# A tuple containing the names of action fields in which reactions are permitted
ACTION_FIELDS_PERMITTING_REACTIONS: Final = ("reactions",)

# A tuple containing discriminators for the construct types in which reactions are permitted
CONSTRUCT_TYPES_PERMITTING_REACTIONS: Final = (
    external_types.ConstructDiscriminator.ACTION,
    external_types.ConstructDiscriminator.PLAN,
)

# A tuple containing the names of query fields defined using set predicates
QUERY_FIELDS_TAKING_SET_PREDICATES: Final = (
    "tags", "associations", "location", "initiator", "partners",
    "recipients", "bystanders", "active", "present",
)

# A tuple containing the names of query fields defined using set predicates that do not allow
# the operator 'all'. These fields pertain to singular values, and as a result, the 'all'
# operator does not make sense for them.
QUERY_FIELDS_WITH_SINGULAR_VALUE: Final = ("location", "initiator",)

# The role name to use for a selector virtual initiator role, which is created when an author
# defines a selector that elides the `roles` field. This supports the "initiator pass-through"
# pattern for selectors, where targeting a selector means targeting the selector candidates
# with the same initiator who is at hand (during targeting of the selector).
SELECTOR_VIRTUAL_INITIATOR_ROLE_NAME: Final = "__initiator__"

# A transient prefix used for positional role bindings, resolved to the corresponding
# role name during postprocessing.
POSITIONAL_BINDING_TRANSIENT_PREFIX: Final = "__position__"
