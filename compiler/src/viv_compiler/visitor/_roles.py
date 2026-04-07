"""Mixin class containing visitor methods associated with role definitions."""

__all__ = ["VisitorMixinRoles"]

from math import log
from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, sentinels, utils


class VisitorMixinRoles(PTNodeVisitor):
    """A visitor mixin for Viv roles."""

    @staticmethod
    def visit_role(node: NonTerminal, children: list[Any]) -> external_types.RoleDefinition:
        """Visit a <role> node."""
        # Populate the authored fields
        role_header, role_body = children
        role_header: internal_types.IntermediateRoleReference
        accumulated_fields = {"name": role_header["_name"]}
        role_snippet = VisitorMixinRoles._get_role_error_message_snippet(role_reference=role_header)
        if "renames" in role_body and len(role_body) > 1:
            error_message = f"Role {role_snippet} uses 'renames' alongside other fields ('renames' must be used alone)"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        for field_name, field_value in role_body.items():
            if field_name == "renames":
                parent_role_reference: internal_types.IntermediateRoleReference = field_value
                mismatch = (
                    role_header["_is_entity_role"] != parent_role_reference["_is_entity_role"] or
                    role_header["_is_group_role"] != parent_role_reference["_is_group_role"]
                )
                if mismatch:
                    parent_role_snippet = VisitorMixinRoles._get_role_error_message_snippet(
                        role_reference=parent_role_reference
                    )
                    error_message = f"Sigil mismatch: role {role_snippet} renames {parent_role_snippet}"
                    raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
                accumulated_fields["renames"] = parent_role_reference['_name']
            else:
                accumulated_fields[field_name] = field_value
        # Package up the definition
        role_definition = external_types.RoleDefinition(
            name=accumulated_fields['name'],
            entityType=accumulated_fields.get('entityType', external_types.RoleEntityType.CHARACTER),
            min=accumulated_fields.get('min', 1),
            max=accumulated_fields.get('max', 1),
            parent=accumulated_fields.get('parent', None),
            children=accumulated_fields.get('children', []),
            pool=accumulated_fields.get('pool', None),
            chance=accumulated_fields.get('chance', None),
            mean=accumulated_fields.get('mean', None),
            sd=accumulated_fields.get('sd', None),
            participationMode=accumulated_fields.get('participationMode', None),
            anywhere=accumulated_fields.get('anywhere', False),
            precast=accumulated_fields.get('precast', False),
            spawn=accumulated_fields.get('spawn', False),
            spawnFunction=accumulated_fields.get('spawnFunction', None),
            renames=accumulated_fields.get('renames', None),
        )
        # Do some quick validation on transient data
        if role_header["_is_entity_role"]:
            if role_definition['entityType'] == external_types.RoleEntityType.SYMBOL:
                error_message = f"Role {role_snippet} has entity prefix but is marked symbol"
                raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        if not role_header["_is_entity_role"]:
            if role_definition['entityType'] != external_types.RoleEntityType.SYMBOL:
                error_message = f"Role {role_snippet} has symbol prefix but is not marked symbol"
                raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        if role_header["_is_group_role"] and role_definition['max'] < 2:
            error_message = (
                f"Role {role_snippet} has group-role decorator but has a max < 2 "
                "(group roles must be able to cast multiple entities)"
            )
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        if not role_header["_is_group_role"] and role_definition['max'] > 1:
            error_message = (
                f"Role {role_snippet} has a max > 1 but is missing group-role decorator '*' "
                f"(rewrite it as {role_snippet}*)"
            )
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        return role_definition

    @staticmethod
    def _get_role_error_message_snippet(*, role_reference: internal_types.IntermediateRoleReference) -> str:
        """Returns a properly decorated role name, for use in error messages."""
        role_snippet = "@" if role_reference["_is_entity_role"] else "&"
        role_snippet += role_reference['_name']
        role_snippet += "*" if role_reference["_is_group_role"] else ""
        return f"'{role_snippet}'"

    @staticmethod
    def visit_role_reference(_, children: list[Any]) -> internal_types.IntermediateRoleReference:
        """Visit a <role_reference> node."""
        binding_type, role_name = children[:2]
        is_entity_role = binding_type is sentinels.ENTITY_BINDING_TYPE
        is_group_role = children[-1] is sentinels.GROUP_ROLE_DECORATOR
        intermediate_role_reference = internal_types.IntermediateRoleReference(
            _name=role_name,
            _is_entity_role=is_entity_role,
            _is_group_role=is_group_role
        )
        return intermediate_role_reference

    @staticmethod
    def visit_binding_type(node: NonTerminal, children: list[Any]) -> object:
        """Visit a <binding_type> node."""
        match children[0]:
            case sentinels.ENTITY_SIGIL:
                return sentinels.ENTITY_BINDING_TYPE
            case sentinels.SYMBOL_SIGIL:
                return sentinels.SYMBOL_BINDING_TYPE
            case _:
                raise errors.VivCompileError(
                    "Encountered unexpected binding type",
                    source=utils.derive_source_annotations(node=node)
                )

    @staticmethod
    def visit_role_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <role_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        if accumulated_fields.get('mean'):
            # Some initial experimentation has shown that taking the log of max - min produces a solid
            # standard deviation (for a normal distribution centered on the author-supplied mean), but
            # only for smaller values. Once the span eclipses 20 or so, we need a bigger SD to allow
            # for the tails to get better coverage (since otherwise the min and max are effectively
            # ignored). Empirically, it appears that dividing the span by 7 works for bigger spans.
            span = accumulated_fields['max'] - accumulated_fields['min']
            if span != 0:
                sd = max(log(span), span / 7)
            else:
                sd = 0
            accumulated_fields['sd'] = round(sd, 2)
        return accumulated_fields

    @staticmethod
    def visit_role_labels(node: NonTerminal, children: list[str]) -> dict[str, Any]:
        """Visit a <role_labels> node."""
        accumulated_fields = {}
        for role_label in children:
            match role_label:
                case "character":
                    VisitorMixinRoles._set_role_entity_type(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        entity_type=external_types.RoleEntityType.CHARACTER
                    )
                case "item":
                    VisitorMixinRoles._set_role_entity_type(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        entity_type=external_types.RoleEntityType.ITEM
                    )
                case "action":
                    VisitorMixinRoles._set_role_entity_type(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        entity_type=external_types.RoleEntityType.ACTION
                    )
                case "location":
                    VisitorMixinRoles._set_role_entity_type(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        entity_type=external_types.RoleEntityType.LOCATION
                    )
                case "symbol":
                    VisitorMixinRoles._set_role_entity_type(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        entity_type=external_types.RoleEntityType.SYMBOL
                    )
                case "initiator":
                    VisitorMixinRoles._set_role_participation_mode(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        participation_mode=external_types.RoleParticipationMode.INITIATOR
                    )
                case "partner":
                    VisitorMixinRoles._set_role_participation_mode(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        participation_mode=external_types.RoleParticipationMode.PARTNER
                    )
                case "recipient":
                    VisitorMixinRoles._set_role_participation_mode(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        participation_mode=external_types.RoleParticipationMode.RECIPIENT
                    )
                case "bystander":
                    VisitorMixinRoles._set_role_participation_mode(
                        node=node,
                        accumulated_fields=accumulated_fields,
                        participation_mode=external_types.RoleParticipationMode.BYSTANDER
                    )
                case "anywhere":
                    accumulated_fields["anywhere"] = True
                case "precast":
                    accumulated_fields["precast"] = True
                case "spawn":
                    accumulated_fields["spawn"] = True
        return accumulated_fields

    @staticmethod
    def _set_role_entity_type(
        *,
        node: NonTerminal,
        accumulated_fields: dict[str, Any],
        entity_type: external_types.RoleEntityType
    ):
        """Sets the given role entity type in the given accumulates role fields, unless one has already been set,
        in which case an informative error is thrown.
        """
        current_entity_type = accumulated_fields.get("entityType", None)
        if not current_entity_type:
            accumulated_fields["entityType"] = entity_type
            return
        error_message = f"Role has multiple entity-type labels: '{current_entity_type}', '{entity_type}'\n"
        raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))

    @staticmethod
    def _set_role_participation_mode(
        *,
        node: NonTerminal,
        accumulated_fields: dict[str, Any],
        participation_mode: external_types.RoleParticipationMode
    ):
        """Sets the given role participation mode in the given accumulated role fields, unless one has already
        been set, in which case an informative error is thrown.
        """
        current_participation_mode = accumulated_fields.get("participationMode", None)
        if not current_participation_mode:
            accumulated_fields["participationMode"] = participation_mode
            return
        error_message = (
            f"Role has multiple participation-mode labels: '{current_participation_mode}' '{participation_mode}'\n"
        )
        raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))

    @staticmethod
    def visit_role_slots(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <role_slots> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_role_slots_range(_, children: list[Any]) -> dict[str, int]:
        """Visit a <role_slots_range> node."""
        if len(children) == 1:
            accumulated_fields = {"min": int(children[0]), "max": int(children[0])}
        else:
            accumulated_fields = {"min": int(children[0]), "max": int(children[1])}
        return accumulated_fields

    @staticmethod
    def visit_role_slots_mean(_, children: list[str]) -> dict[str, float]:
        """Visit a <role_slots_mean> node."""
        mean = float(children[0])
        return {"mean": round(mean, 2)}

    @staticmethod
    def visit_role_slots_optional_slot_casting_probability(_, children: list[str]) -> dict[str, float]:
        """Visit a <role_slots_optional_slot_casting_probability> node."""
        chance = float(children[0]) / 100.0
        chance = max(round(chance, 3), 0.001)
        return {"chance": chance}

    @staticmethod
    def visit_role_casting_pool_from(
        _, children: list[external_types.Expression]
    ) -> dict[str, external_types.CastingPool]:
        """Visit a <role_casting_pool_from> node."""
        casting_pool_expression = external_types.CastingPool(body=children[0], uncachable=True)
        return {"pool": casting_pool_expression}

    @staticmethod
    def visit_role_casting_pool_is(
        node: NonTerminal,
        children: list[external_types.Expression]
    ) -> dict[str, external_types.CastingPool]:
        """Visit a <role_casting_pool_is> node."""
        # The `is` is just syntactic sugar for `from` with a singleton array
        casting_pool_expression = external_types.CastingPool(
            body=external_types.ListField(
                type=external_types.ExpressionDiscriminator.LIST,
                value=[children[0]],
                source=utils.derive_source_annotations(node=node)
            ),
            uncachable=True
        )
        return {"pool": casting_pool_expression}

    @staticmethod
    def visit_role_spawn_directive(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <role_spawn_directive> node."""
        accumulated_fields = {
            "spawn": True,
            "spawnFunction": children[0]
        }
        return accumulated_fields

    @staticmethod
    def visit_role_renaming(
        _, children: list[internal_types.IntermediateRoleReference]
    ) -> dict[str, internal_types.IntermediateRoleReference]:
        """Visit a <role_renaming> node."""
        parent_role_reference = children[0]  # Upstream, we will confirm the sigils match and then extract name only
        return {"renames": parent_role_reference}

    @staticmethod
    def visit_entity_sigil(_, __) -> internal_types.Sentinel:
        """Visit an <entity_sigil> node."""
        return sentinels.ENTITY_SIGIL

    @staticmethod
    def visit_symbol_sigil(_, __) -> internal_types.Sentinel:
        """Visit a <symbol_sigil> node."""
        return sentinels.SYMBOL_SIGIL
