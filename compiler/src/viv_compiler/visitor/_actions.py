"""Mixin class containing visitor methods associated with action definitions."""

__all__ = ["VisitorMixinActions"]

from copy import deepcopy
from typing import Any, Final

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import config, errors, external_types, internal_types, sentinels, utils, validation
from ._statements import VisitorMixinStatements


class VisitorMixinActions(PTNodeVisitor):
    """A visitor mixin for Viv actions."""

    # The name of the transient `_join_directives` field
    JOIN_DIRECTIVES_FIELD_NAME: Final = "_join_directives"
    # A default value for the `tags` field, used when the author elides it
    TAGS_DEFAULT = external_types.ListField(
        type=external_types.ExpressionDiscriminator.LIST,
        value=[],
        source=None
    )
    # A default value for the `default` subfield of the `associations` field, used when the author elides it
    ASSOCIATIONS_DEFAULT_FIELD_DEFAULT: Final = external_types.ListField(
        type=external_types.ExpressionDiscriminator.LIST,
        value=[],
        source=None
    )

    @staticmethod
    def visit_action(
        node: NonTerminal,
        children: list[Any]
    ) -> internal_types.IntermediateActionDefinition | internal_types.IntermediateChildActionDefinition:
        """Visit an <action> node."""
        # Populate the fields that were authored
        accumulated_fields = {}
        action_header = children[0]
        action_body = children[1] if len(children) > 1 else {}  # Bare renaming of a parent action
        accumulated_fields.update(action_header)
        for field_name, field_value in action_body.items():
            if field_name == "roles":
                validation.prevalidate_role_names(
                    construct_type=external_types.ConstructDiscriminator.ACTION,
                    construct_name=accumulated_fields['name'],
                    role_definitions=field_value,
                    source=utils.derive_source_annotations(node=node)
                )
                accumulated_fields["roles"] = {role["name"]: role for role in field_value}
            else:
                accumulated_fields[field_name] = field_value
        # Ensure `roles` is present, unless it's a child action
        if "roles" not in action_body:
            if "parent" not in accumulated_fields:
                error_message = (
                    f"Action '{accumulated_fields['name']}' is missing 'roles' field "
                    f"(required for actions that do not inherit from a parent action)"
                )
                raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        # Fill out the minimal intermediate structure, seeding with default values as applicable
        if "parent" in accumulated_fields:
            # If it's a child action, we won't seed defaults for any heritable fields, because
            # such defaults would override what would otherwise be inherited from the parent.
            intermediate_action_definition = internal_types.IntermediateChildActionDefinition(
                type=external_types.ConstructDiscriminator.ACTION,
                name=accumulated_fields["name"],
                _template=accumulated_fields.get("_template", False),
                reserved=accumulated_fields.get("reserved", False),
                parent=accumulated_fields["parent"],
                _join_directives=accumulated_fields.get(VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME, [])
            )
            # Add in any fields that were specified for the child. This will duplicate some of
            # the work we just carried out in manually setting required fields, but we'll keep
            # the above so that we're sure to at least set all required fields.
            intermediate_action_definition.update(accumulated_fields)
        else:
            # Before we would otherwise lose them, flag any erroneous join fields in a standalone action
            if VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME in accumulated_fields:
                error_message = (
                    f"Action '{accumulated_fields['name']}' uses 'join' operator but declares no parent"
                )
                raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
            intermediate_action_definition = internal_types.IntermediateActionDefinition(
                type=external_types.ConstructDiscriminator.ACTION,
                name=accumulated_fields["name"],
                _template=accumulated_fields.get("_template", False),
                reserved=accumulated_fields.get("reserved", False),
                parent=accumulated_fields.get("parent", None),
                roles=accumulated_fields["roles"],
                importance=accumulated_fields.get("importance", external_types.FloatField(
                    type=external_types.ExpressionDiscriminator.FLOAT,
                    value=config.DEFAULT_IMPORTANCE_SCORE,  # Need to grab the live value (overridden at runtime)
                    source=None
                )),
                tags=accumulated_fields.get("tags", deepcopy(VisitorMixinActions.TAGS_DEFAULT)),
                gloss=accumulated_fields.get("gloss", None),
                report=accumulated_fields.get("report", None),
                _conditions_raw=accumulated_fields.get("_conditions_raw", []),
                scratch=accumulated_fields.get("scratch", []),
                _effects_raw=accumulated_fields.get("_effects_raw", []),
                _reactions_raw=accumulated_fields.get("_reactions_raw", []),
                saliences=accumulated_fields.get("saliences", external_types.Saliences(
                    default=external_types.FloatField(
                        type=external_types.ExpressionDiscriminator.FLOAT,
                        value=config.DEFAULT_SALIENCE_SCORE,  # Need to grab the live value (overridden at runtime)
                        source=None
                    ),
                    roles={},
                    custom=[],
                    variable=None
                )),
                associations=accumulated_fields.get("associations", external_types.Associations(
                    default=deepcopy(VisitorMixinActions.ASSOCIATIONS_DEFAULT_FIELD_DEFAULT),
                    roles={},
                    custom=[],
                    variable=None
                )),
                embargoes=accumulated_fields.get("embargoes", [])
            )
        return intermediate_action_definition

    @staticmethod
    def visit_action_header(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_header> node."""
        action_header = {}
        for child in children:
            if isinstance(child, str):
                action_header['name'] = child
            else:
                action_header.update(child)
        return action_header

    @staticmethod
    def visit_reserved_construct_marker(_, __) -> dict[str, bool]:
        """Visit a <reserved_construct_marker> node."""
        return {"reserved": True}

    @staticmethod
    def visit_template_action_marker(_, __) -> dict[str, bool]:
        """Visit a <template_action_marker> node."""
        return {"_template": True}

    @staticmethod
    def visit_parent_action_declaration(
        _, children: list[external_types.ActionName]
    ) -> dict[str, external_types.ActionName]:
        """Visit a <parent_action_declaration> node."""
        return {"parent": children[0]}

    @staticmethod
    def visit_action_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_body> node."""
        accumulated_fields = {}
        for child in children:
            for field_name, field_value in child.items():
                if field_name == VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME:
                    accumulated_fields.setdefault(VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME, [])
                    accumulated_fields[VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME].append(field_value)
                else:
                    accumulated_fields[field_name] = field_value
        return accumulated_fields

    @staticmethod
    def visit_action_gloss(
        _, children: list[external_types.TemplateStringField | external_types.StringField]
    ) -> dict[str, external_types.TemplateStringField | external_types.StringField]:
        """Visit an <action_gloss> node."""
        gloss = children[0]
        return {"gloss": gloss}

    @staticmethod
    def visit_action_report(
        _, children: list[external_types.TemplateStringField | external_types.StringField]
    ) -> dict[str, external_types.TemplateStringField | external_types.StringField]:
        """Visit an <action_report> node."""
        return {"report": children[0]}

    @staticmethod
    def visit_action_tags(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_tags> node."""
        if children[0] is sentinels.CHILD_JOIN_OPERATOR:
            accumulated_fields = {
                "tags": children[1],
                VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME: sentinels.CHILD_JOIN_DIRECTIVE_TAGS
            }
        else:
            accumulated_fields = {"tags": children[0]}
        return accumulated_fields

    @staticmethod
    def visit_action_importance(
        _, children: list[external_types.IntField | external_types.FloatField | external_types.Enum]
    ) -> dict[str, external_types.IntField | external_types.FloatField | external_types.Enum]:
        """Visit an <action_importance> node."""
        return {"importance": children[0]}

    @staticmethod
    def visit_action_roles(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_roles> node."""
        if children[0] is sentinels.CHILD_JOIN_OPERATOR:
            accumulated_fields = {
                "roles": children[1:],
                VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME: sentinels.CHILD_JOIN_DIRECTIVE_ROLES
            }
        else:
            accumulated_fields = {"roles": children}
        return accumulated_fields

    @staticmethod
    def visit_action_conditions(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_conditions> node."""
        if children[0] is sentinels.CHILD_JOIN_OPERATOR:
            accumulated_fields = {
                "_conditions_raw": children[1],
                VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME: sentinels.CHILD_JOIN_DIRECTIVE_CONDITIONS
            }
        else:
            accumulated_fields = {"_conditions_raw": children[0]}
        return accumulated_fields

    @staticmethod
    def visit_action_scratch(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_scratch> node."""
        if children[0] is sentinels.CHILD_JOIN_OPERATOR:
            accumulated_fields = {
                "scratch": children[1],
                VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME: sentinels.CHILD_JOIN_DIRECTIVE_SCRATCH
            }
        else:
            accumulated_fields = {"scratch": children[0]}
        return accumulated_fields

    @staticmethod
    def visit_action_effects(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_effects> node."""
        if children[0] is sentinels.CHILD_JOIN_OPERATOR:
            accumulated_fields = {
                "_effects_raw": children[1],
                VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME: sentinels.CHILD_JOIN_DIRECTIVE_EFFECTS
            }
        else:
            accumulated_fields = {"_effects_raw": children[0]}
        return accumulated_fields

    @staticmethod
    def visit_action_reactions(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_reactions> node."""
        if children[0] is sentinels.CHILD_JOIN_OPERATOR:
            accumulated_fields = {
                "_reactions_raw": children[1:],
                VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME: sentinels.CHILD_JOIN_DIRECTIVE_REACTIONS
            }
        else:
            accumulated_fields = {"_reactions_raw": children}
        return accumulated_fields

    @staticmethod
    def visit_action_saliences(_, children: list[external_types.Saliences]) -> dict[str, external_types.Saliences]:
        """Visit an <action_saliences> node."""
        return {"saliences": children[0]}

    @staticmethod
    def visit_saliences_body(_, children: list[Any]) -> external_types.Saliences:
        """Visit a <saliences_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        saliences = external_types.Saliences(
            # Need to grab the live value (see importance comment in visit_action)
            default=accumulated_fields.get("default", external_types.FloatField(
                type=external_types.ExpressionDiscriminator.FLOAT,
                value=config.DEFAULT_SALIENCE_SCORE,
                source=None
            )),
            roles=accumulated_fields.get("roles", {}),
            custom=accumulated_fields.get("custom", []),
            variable=accumulated_fields.get("variable", None)
        )
        return saliences

    @staticmethod
    def visit_saliences_default(
        _, children: list[external_types.SalienceScoreExpression]
    ) -> dict[str, external_types.SalienceScoreExpression]:
        """Visit a <saliences_default> node."""
        return {"default": children[0]}

    @staticmethod
    def visit_saliences_roles(
        node: NonTerminal,
        children: list[Any]
    ) -> dict[str, dict[str, external_types.SalienceScoreExpression]]:
        """Visit a <saliences_roles> node."""
        role_entries = {}
        for role_entry in children:
            for role_name, expression in role_entry.items():  # It's just a single key–value pair, but easy to iterate
                if role_name in role_entries:
                    error_message = f"Duplicate entry detected in action saliences for role '{role_name}'"
                    raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
                role_entries[role_name] = expression
        return {"roles": role_entries}

    @staticmethod
    def visit_saliences_roles_entry(_, children: list[Any]) -> dict[str, external_types.SalienceScoreExpression]:
        """Visit a <saliences_roles_entry> node."""
        # Filter out the optional group-role decorator
        children = [child for child in children if child is not sentinels.GROUP_ROLE_DECORATOR]
        _sigil, name, expression = children
        return {name: expression}

    @staticmethod
    def visit_saliences_custom_field(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <saliences_custom_field> node."""
        local_variable, *expressions = children
        accumulated_fields = {
            "custom": expressions,
            "variable": local_variable
        }
        return accumulated_fields

    @staticmethod
    def visit_action_associations(
        _, children: list[external_types.Associations]
    ) -> dict[str, external_types.Associations]:
        """Visit an <action_associations> node."""
        return {"associations": children[0]}

    @staticmethod
    def visit_associations_body(_, children: list[Any]) -> external_types.Associations:
        """Visit an <associations_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        associations = external_types.Associations(
            default=accumulated_fields.get("default", deepcopy(VisitorMixinActions.ASSOCIATIONS_DEFAULT_FIELD_DEFAULT)),
            roles=accumulated_fields.get("roles", {}),
            custom=accumulated_fields.get("custom", []),
            variable=accumulated_fields.get("variable", None)
        )
        return associations

    @staticmethod
    def visit_associations_default(_, children: list[external_types.ListField]) -> dict[str, external_types.ListField]:
        """Visit an <associations_default> node."""
        return {"default": children[0]}

    @staticmethod
    def visit_associations_roles(
        node: NonTerminal, children: list[Any]
    ) -> dict[str, dict[str, external_types.ListField]]:
        """Visit an <associations_roles> node."""
        role_entries = {}
        for role_entry in children:
            for role_name, expression in role_entry.items():  # It's just a single key–value pair, but easy to iterate
                if role_name in role_entries:
                    error_message = f"Duplicate entry detected in action associations for role '{role_name}'"
                    raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
                role_entries[role_name] = expression
        return {"roles": role_entries}

    @staticmethod
    def visit_associations_roles_entry(_, children: list[Any]) -> dict[str, external_types.ListField]:
        """Visit an <associations_roles_entry> node."""
        # Filter out the optional group-role decorator
        children = [child for child in children if child is not sentinels.GROUP_ROLE_DECORATOR]
        _sigil, name, expression = children
        return {name: expression}

    @staticmethod
    def visit_associations_custom_field(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <associations_custom_field> node."""
        local_variable, *expressions = children
        accumulated_fields = {
            "custom": expressions,
            "variable": local_variable
        }
        return accumulated_fields

    @staticmethod
    def visit_associations_statement(
        _, children: list[list[external_types.Expression]]
    ) -> list[external_types.Expression]:
        """Visit an <associations_statement> node."""
        return children[0]

    @staticmethod
    def visit_associations_loop(node: NonTerminal, children: list[Any]) -> external_types.Loop:
        """Visit an <associations_loop> node."""
        return VisitorMixinStatements.visit_loop(node=node, children=children)

    @staticmethod
    def visit_associations_conditional(node: NonTerminal, children: list[Any]) -> external_types.Conditional:
        """Visit an <associations_conditional> node."""
        return VisitorMixinStatements.visit_conditional(node=node, children=children)

    @staticmethod
    def visit_associations_conditional_branches(
        _, children: list[external_types.ConditionalBranch]
    ) -> list[external_types.ConditionalBranch]:
        """Visit an <associations_conditional_branches> node."""
        return VisitorMixinStatements.visit_conditional_branches(_, children)

    @staticmethod
    def visit_associations_conditional_branch(_, children: list[Any]) -> external_types.ConditionalBranch:
        """Visit an <associations_conditional_branch> node."""
        return VisitorMixinStatements.visit_conditional_branch(_, children)

    @staticmethod
    def visit_associations_conditional_consequent(
        _, children: list[list[external_types.Expression]]
    ) -> list[external_types.Expression]:
        """Visit an <associations_conditional_consequent> node."""
        return VisitorMixinStatements.visit_consequent(_, children)

    @staticmethod
    def visit_associations_conditional_alternative(
        _, children: list[list[external_types.Expression]]
    ) -> list[external_types.Expression]:
        """Visit an <associations_conditional_alternative> node."""
        return VisitorMixinStatements.visit_alternative(_, children)

    @staticmethod
    def visit_associations_scoped_statements(
        _, children: list[external_types.Expression]
    ) -> list[external_types.Expression]:
        """Visit an <associations_scoped_statements> node."""
        return children

    @staticmethod
    def visit_action_embargoes(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_embargoes> node."""
        if children[0] is sentinels.CHILD_JOIN_OPERATOR:
            accumulated_fields = {
                "embargoes": children[1:],
                VisitorMixinActions.JOIN_DIRECTIVES_FIELD_NAME: sentinels.CHILD_JOIN_DIRECTIVE_EMBARGOES
            }
        else:
            accumulated_fields = {"embargoes": children}
        return accumulated_fields

    @staticmethod
    def visit_embargo(_, children: list[external_types.EmbargoDeclaration]) -> external_types.EmbargoDeclaration:
        """Visit an <embargo> node."""
        return children[0]

    @staticmethod
    def visit_embargo_body(node: NonTerminal, children: list[Any]) -> external_types.EmbargoDeclaration:
        """Visit an <embargo_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        if "permanent" not in accumulated_fields and "period" not in accumulated_fields:
            raise errors.VivCompileError(
                "Embargo is missing 'time' field (required)",
                source=utils.derive_source_annotations(node=node)
            )
        embargo_declaration = external_types.EmbargoDeclaration(
            roles=accumulated_fields.get("roles", None),
            permanent=accumulated_fields.get("permanent", False),
            period=accumulated_fields.get("period", None),
            here=accumulated_fields.get("here", False),
        )
        return embargo_declaration

    @staticmethod
    def visit_embargo_roles(
        _, children: list[internal_types.IntermediateRoleReference]
    ) -> dict[str, list[external_types.RoleName]]:
        """Visit an <embargo_roles> node."""
        return {"roles": [child['_name'] for child in children]}

    @staticmethod
    def visit_embargo_time_period(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <embargo_time_period> node."""
        raw_time_period = children[0]
        if raw_time_period is sentinels.PERMANENT_EMBARGO_MARKER:
            accumulated_fields = {"permanent": True, "period": None}
        else:
            time_period = external_types.TimeDelta(amount=raw_time_period["amount"], unit=raw_time_period["unit"])
            accumulated_fields = {"permanent": False, "period": time_period}
        return accumulated_fields

    @staticmethod
    def visit_embargo_time_period_forever(_, __) -> internal_types.Sentinel:
        """Visit an <embargo_time_period_forever> node."""
        return sentinels.PERMANENT_EMBARGO_MARKER

    @staticmethod
    def visit_embargo_location(_, children: list[internal_types.Sentinel]) -> dict[str, Any]:
        """Visit an <embargo_location> node."""
        return {"here": children[0] is sentinels.LOCATION_SPECIFIC_EMBARGO_MARKER}

    @staticmethod
    def visit_embargo_location_here(_, __) -> internal_types.Sentinel:
        """Visit an <embargo_location_here> node."""
        return sentinels.LOCATION_SPECIFIC_EMBARGO_MARKER

    @staticmethod
    def visit_embargo_location_anywhere(_, __) -> internal_types.Sentinel:
        """Visit an <embargo_location_anywhere> node."""
        return sentinels.LOCATION_AGNOSTIC_EMBARGO_MARKER

    @staticmethod
    def visit_child_join_operator(_, __) -> internal_types.Sentinel:
        """Visit a <child_join_operator> node."""
        return sentinels.CHILD_JOIN_OPERATOR
