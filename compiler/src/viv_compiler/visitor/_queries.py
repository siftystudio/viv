"""Mixin class containing visitor methods associated with query definitions."""

from __future__ import annotations

__all__ = ["VisitorMixinQueries"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, utils, validation


class VisitorMixinQueries(PTNodeVisitor):
    """A visitor mixin for Viv queries."""

    @staticmethod
    def visit_query(node: NonTerminal, children: list[Any]) -> internal_types.IntermediateQueryDefinition:
        """Visit a <query> node."""
        # Populate the fields that were authored
        accumulated_fields = {}
        query_name, query_body = children
        for field_name, field_value in query_body.items():
            if field_name == "roles":
                validation.prevalidate_role_names(
                    construct_type=external_types.ConstructDiscriminator.QUERY,
                    construct_name=query_name,
                    role_definitions=field_value,
                    source=utils.derive_source_annotations(node=node)
                )
                accumulated_fields["roles"] = {role["name"]: role for role in field_value}
            else:
                accumulated_fields[field_name] = field_value
        # Package up the intermediate definition
        intermediate_query_definition = internal_types.IntermediateQueryDefinition(
            type=external_types.ConstructDiscriminator.QUERY,
            name=query_name,
            roles=accumulated_fields.get("roles", {}),
            _conditions_raw=accumulated_fields.get("_conditions_raw", []),
            actionName=accumulated_fields.get("actionName", None),
            ancestors=accumulated_fields.get("ancestors", None),
            descendants=accumulated_fields.get("descendants", None),
            importance=accumulated_fields.get("importance", None),
            tags=accumulated_fields.get("tags", None),
            salience=accumulated_fields.get("salience", None),
            associations=accumulated_fields.get("associations", None),
            location=accumulated_fields.get("location", None),
            time=accumulated_fields.get("time", None),
            initiator=accumulated_fields.get("initiator", None),
            partners=accumulated_fields.get("partners", None),
            recipients=accumulated_fields.get("recipients", None),
            bystanders=accumulated_fields.get("bystanders", None),
            active=accumulated_fields.get("active", None),
            present=accumulated_fields.get("present", None)
        )
        return intermediate_query_definition

    @staticmethod
    def visit_query_header(_, children: list[external_types.QueryName]) -> external_types.QueryName:
        """Visit a <query_header> node."""
        return children[0]

    @staticmethod
    def visit_query_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <query_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_query_roles(
        _, children: list[external_types.RoleDefinition]
    ) -> dict[str, list[external_types.RoleDefinition]]:
        """Visit a <query_roles> node."""
        return {"roles": children}

    @staticmethod
    def visit_query_conditions(
        _, children: list[list[external_types.Expression]]
    ) -> dict[str, list[external_types.Expression]]:
        """Visit a <query_conditions> node."""
        return {"_conditions_raw": children[0]}

    @staticmethod
    def visit_query_action_name(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_action_name> node."""
        return {"actionName": children}

    @staticmethod
    def visit_query_ancestors(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_ancestors> node."""
        return {"ancestors": children}

    @staticmethod
    def visit_query_descendants(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_descendants> node."""
        return {"descendants": children}

    @staticmethod
    def visit_query_importance(
        _, children: list[external_types.QueryNumericRange]
    ) -> dict[str, external_types.QueryNumericRange]:
        """Visit a <query_importance> node."""
        return {"importance": children[0]}

    @staticmethod
    def visit_query_tags(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_tags> node."""
        return {"tags": children}

    @staticmethod
    def visit_query_salience(
        _, children: list[external_types.QueryNumericRange]
    ) -> dict[str, external_types.QueryNumericRange]:
        """Visit a <query_salience> node."""
        return {"salience": children[0]}

    @staticmethod
    def visit_query_associations(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_associations> node."""
        return {"associations": children}

    @staticmethod
    def visit_query_location(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_location> node."""
        return {"location": children}

    @staticmethod
    def visit_query_time(
        _, children: list[external_types.TemporalConstraint]
    ) -> dict[str, list[external_types.TemporalConstraint]]:
        """Visit a <query_time> node."""
        return {"time": children}

    @staticmethod
    def visit_query_initiator(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_initiator> node."""
        return {"initiator": children}

    @staticmethod
    def visit_query_partners(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_partners> node."""
        return {"partners": children}

    @staticmethod
    def visit_query_recipients(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_recipients> node."""
        return {"recipients": children}

    @staticmethod
    def visit_query_bystanders(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_bystanders> node."""
        return {"bystanders": children}

    @staticmethod
    def visit_query_active(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_active> node."""
        return {"active": children}

    @staticmethod
    def visit_query_present(
        _, children: list[external_types.SetPredicate]
    ) -> dict[str, list[external_types.SetPredicate]]:
        """Visit a <query_present> node."""
        return {"present": children}

    @staticmethod
    def visit_query_numeric_criteria(node: NonTerminal, children: list[Any]) -> external_types.QueryNumericRange:
        """Visit a <query_numeric_criteria> node."""
        # Prevalidate operators before we lose this information
        operators = ("==", ">=", ">", "<", "<=")
        counts = {operator: 0 for operator in operators}
        for operator, _ in children:
            counts[operator] += 1
        if counts["=="] and len(children) > 1:
            error_message = f"When '==' is used in a numeric query field, no other criterion may be present"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        for operator in operators:
            if counts[operator] > 1:
                error_message = f"Operator '{operator}' is used multiple times in a numeric query field"
                raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        if counts[">"] and counts[">="]:
            error_message = (
                f"Operators '>' and '>=' are both used in a numeric query field (only one may be used)"
            )
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        if counts["<"] and counts["<="]:
            error_message = (
                f"Operators '<' and '<=' are both used in a numeric query field (only one may be used)"
            )
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        # Construct the implied range to populate the component
        upper, lower = None, None
        for operator, operand in children:
            if operator in (">", ">=", "=="):
                lower = external_types.QueryNumericRangeBound(value=operand, inclusive=operator != ">")
            if operator in ("<", "<=", "=="):
                upper = external_types.QueryNumericRangeBound(value=operand, inclusive=operator != "<")
        query_numeric_range = external_types.QueryNumericRange(lower=lower, upper=upper)
        return query_numeric_range

    @staticmethod
    def visit_query_numeric_criterion(
        _, children: list[str | external_types.SalienceScoreExpression]
    ) -> list[str | external_types.SalienceScoreExpression]:
        """Visit a <query_numeric_criterion> node."""
        return children

    @staticmethod
    def visit_query_numeric_criterion_operator(node: NonTerminal, _) -> str:
        """Visit a <query_numeric_criterion_operator> node."""
        return str(node)

    @staticmethod
    def visit_set_predicate(_, children: list[Any]) -> external_types.SetPredicate:
        """Visit a <set_predicate> node."""
        operator, *operand = children
        set_predicate = external_types.SetPredicate(operator=operator, operand=operand)
        return set_predicate

    @staticmethod
    def visit_set_predicate_operator(node: NonTerminal, _) -> str:
        """Visit a <set_predicate_operator> node."""
        return str(node)

    @staticmethod
    def visit_set_predicate_tags(_, children: list[Any]) -> external_types.SetPredicate:
        """Visit a <set_predicate_tags> node."""
        return VisitorMixinQueries.visit_set_predicate(_, children)
