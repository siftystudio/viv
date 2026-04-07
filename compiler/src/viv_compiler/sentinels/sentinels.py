"""Sentinels used internally by the Viv compiler."""

from typing import Final

from viv_compiler import internal_types

# Sentinel used to mark the child-join operator
CHILD_JOIN_OPERATOR: Final[internal_types.Sentinel] = object()

# Sentinel used to mark an entity binding type
ENTITY_BINDING_TYPE: Final[internal_types.Sentinel] = object()

# Sentinel used to mark a symbol binding type
SYMBOL_BINDING_TYPE: Final[internal_types.Sentinel] = object()

# Sentinel used to represent the negation of an expression
NEGATION: Final[internal_types.Sentinel] = object()

# Sentinel for an action temporal anchor in time-frame statements
ACTION_TEMPORAL_ANCHOR: Final[internal_types.Sentinel] = object()

# Sentinel for a non-action temporal anchor in time-frame statements
NON_ACTION_TEMPORAL_ANCHOR: Final[internal_types.Sentinel] = object()

# Sentinel for the entity sigil
ENTITY_SIGIL: Final[internal_types.Sentinel] = object()

# Sentinel for the symbol sigil
SYMBOL_SIGIL: Final[internal_types.Sentinel] = object()

# Sentinel for the local-variable sigil
LOCAL_VARIABLE_SIGIL: Final[internal_types.Sentinel] = object()

# Sentinel for the scratch-variable sigil
SCRATCH_VARIABLE_SIGIL: Final[internal_types.Sentinel] = object()

# Sentinel for the plan-phase sigil
PLAN_PHASE_SIGIL: Final[internal_types.Sentinel] = object()

# Sentinel for the group-role decorator
GROUP_ROLE_DECORATOR: Final[internal_types.Sentinel] = object()

# Sentinel for the eval-fail-safe marker
EVAL_FAIL_SAFE_MARKER: Final[internal_types.Sentinel] = object()

# Sentinel for a directive to join the tags of a child and parent action
CHILD_JOIN_DIRECTIVE_TAGS: Final[internal_types.Sentinel] = object()

# Sentinel for a directive to join the roles of a child and parent action
CHILD_JOIN_DIRECTIVE_ROLES: Final[internal_types.Sentinel] = object()

# Sentinel for a directive to join the conditions of a child and parent action
CHILD_JOIN_DIRECTIVE_CONDITIONS: Final[internal_types.Sentinel] = object()

# Sentinel for a directive to join the scratch field of a child and parent action
CHILD_JOIN_DIRECTIVE_SCRATCH: Final[internal_types.Sentinel] = object()

# Sentinel for a directive to join the effects of a child and parent action
CHILD_JOIN_DIRECTIVE_EFFECTS: Final[internal_types.Sentinel] = object()

# Sentinel for a directive to join the reactions of a child and parent action
CHILD_JOIN_DIRECTIVE_REACTIONS: Final[internal_types.Sentinel] = object()

# Sentinel for a directive to join the embargoes of a child and parent action
CHILD_JOIN_DIRECTIVE_EMBARGOES: Final[internal_types.Sentinel] = object()

# Sentinel for the permanent embargo marker
PERMANENT_EMBARGO_MARKER: Final[internal_types.Sentinel] = object()

# Sentinel for the location-specific embargo marker
LOCATION_SPECIFIC_EMBARGO_MARKER: Final[internal_types.Sentinel] = object()

# Sentinel for the location-agnostic embargo marker
LOCATION_AGNOSTIC_EMBARGO_MARKER: Final[internal_types.Sentinel] = object()

# Sentinel marking that a reaction targets an action
REACTION_TARGET_TYPE_ACTION: Final[internal_types.Sentinel] = object()

# Sentinel marking that a reaction targets an action selector
REACTION_TARGET_TYPE_ACTION_SELECTOR: Final[internal_types.Sentinel] = object()

# Sentinel marking that a reaction targets a plan
REACTION_TARGET_TYPE_PLAN: Final[internal_types.Sentinel] = object()

# Sentinel marking that a reaction targets a plan selector
REACTION_TARGET_TYPE_PLAN_SELECTOR: Final[internal_types.Sentinel] = object()

# Sentinel marking an action search with no target query
ACTION_SEARCH_NO_QUERY: Final[internal_types.Sentinel] = object()

# Sentinel marking that a search domain (for an action search or sifting) is the full chronicle
SEARCH_DOMAIN_CHRONICLE: Final[internal_types.Sentinel] = object()

# Sentinel marking that a search domain (for an action search or sifting)
# is to be inherited from the enclosing context.
SEARCH_DOMAIN_INHERIT: Final[internal_types.Sentinel] = object()

# Sentinel for the 'all' reaction-window operator used in plans
REACTION_WINDOW_OPERATOR_ALL: Final[internal_types.Sentinel] = object()

# Sentinel for the 'any' reaction-window operator used in plans
REACTION_WINDOW_OPERATOR_ANY: Final[internal_types.Sentinel] = object()

# Sentinel for the 'untracked' reaction-window operator used in plans
REACTION_WINDOW_OPERATOR_UNTRACKED: Final[internal_types.Sentinel] = object()

# Sentinel for a randomized selector policy
SELECTOR_POLICY_RANDOM: Final[internal_types.Sentinel] = object()

# Sentinel for a weighted selector policy
SELECTOR_POLICY_WEIGHTED: Final[internal_types.Sentinel] = object()

# Sentinel for an ordered selector policy
SELECTOR_POLICY_ORDERED: Final[internal_types.Sentinel] = object()
