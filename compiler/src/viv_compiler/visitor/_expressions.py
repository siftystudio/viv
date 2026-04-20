"""Mixin class containing visitor methods associated with Viv expressions."""

__all__ = ["VisitorMixinExpressions"]

from typing import Any, cast

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import config, internal_types, errors, external_types, sentinels, utils


class VisitorMixinExpressions(PTNodeVisitor):
    """A visitor mixin for Viv expressions."""

    @staticmethod
    def visit_expression(_, children: list[Any]) -> external_types.Expression:
        """Visit an <expression> node."""
        return children[0]

    @staticmethod
    def visit_negation(_, __) -> internal_types.Sentinel:
        """Visit a <negation> node."""
        return sentinels.NEGATION

    @staticmethod
    def visit_assignment(node: NonTerminal, children: list[Any]) -> external_types.Assignment:
        """Visit an <assignment> node."""
        left, operator, right = children
        assignment = external_types.Assignment(
            type=external_types.ExpressionDiscriminator.ASSIGNMENT,
            value=external_types.AssignmentValue(left=left, operator=operator, right=right),
            source=utils.derive_source_annotations(node=node)
        )
        return assignment

    @staticmethod
    def visit_assignment_operator(node: NonTerminal, _) -> str:
        """Visit an <assignment_operator> node."""
        return str(node)

    @staticmethod
    def visit_assignment_lvalue(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <assignment_lvalue> node."""
        return children[0]

    @staticmethod
    def visit_inscription(node: NonTerminal, children: list[Any]) -> external_types.Inscription:
        """Visit an <inscription> node."""
        item, action = children
        inscription = external_types.Inscription(
            type=external_types.ExpressionDiscriminator.INSCRIPTION,
            value=external_types.InscriptionValue(item=item, action=action),
            source=utils.derive_source_annotations(node=node)
        )
        return inscription

    @staticmethod
    def visit_inspection(node: NonTerminal, children: list[Any]) -> external_types.Inspection:
        """Visit an <inspection> node."""
        character, item = children
        inspection = external_types.Inspection(
            type=external_types.ExpressionDiscriminator.INSPECTION,
            value=external_types.InspectionValue(character=character, item=item),
            source=utils.derive_source_annotations(node=node)
        )
        return inspection

    @staticmethod
    def visit_precedence_governed_expression(_, children: list[Any]) -> external_types.Expression:
        """Visit a <precedence_governed_expression> node."""
        # The <precedence_governed_expression> nonterminal is just a wrapper around disjunction. All the work
        # to package up an expression -- potentially one that is quite complex and mixes operators without using
        # parens -- will have already been done by the time it gets to here, so we simply return the sole child.
        return children[0]

    @staticmethod
    def visit_disjunction(node: NonTerminal, children: list[Any]) -> external_types.Disjunction:
        """Visit a <disjunction> node."""
        # If there's a single child, it's an expression with no disjunction operator bubbling up
        # through the precedence chain. As such, we want to just pass it on up as-is.
        if len(children) == 1:
            return children[0]
        disjunction = external_types.Disjunction(
            type=external_types.ExpressionDiscriminator.DISJUNCTION,
            value=external_types.DisjunctionValue(operands=children),
            source=utils.derive_source_annotations(node=node),
            negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
        )
        return disjunction

    @staticmethod
    def visit_conjunction(node: NonTerminal, children: list[Any]) -> external_types.Conjunction:
        """Visit a <conjunction> node."""
        # If there's a single child, it's an expression with no conjunction operator bubbling up
        # through the precedence chain. As such, we want to just pass it on up as-is.
        if len(children) == 1:
            return children[0]
        conjunction = external_types.Conjunction(
            type=external_types.ExpressionDiscriminator.CONJUNCTION,
            value=external_types.ConjunctionValue(operands=children),
            source=utils.derive_source_annotations(node=node),
            negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
        )
        return conjunction

    @staticmethod
    def visit_relational_expression(node: NonTerminal, children: list[Any]) -> external_types.Expression:
        """Visit a <relational_expression> node."""
        # If there's a single child, it's an expression with no relational operator bubbling up
        # through the precedence chain. As such, we want to just pass it on up as-is.
        if len(children) == 1:
            return children[0]
        left, operator, right = children
        if operator == "in":
            return external_types.MembershipTest(
                type=external_types.ExpressionDiscriminator.MEMBERSHIP_TEST,
                value=external_types.MembershipTestValue(item=left, collection=right),
                source=utils.derive_source_annotations(node=node),
                negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
            )
        elif operator == "knows":
            return external_types.MemoryCheck(
                type=external_types.ExpressionDiscriminator.MEMORY_CHECK,
                value=external_types.MemoryCheckValue(character=left, action=right),
                source=utils.derive_source_annotations(node=node),
                negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
            )
        elif operator in ("caused", "triggered", "preceded"):
            return external_types.ActionRelation(
                type=external_types.ExpressionDiscriminator.ACTION_RELATION,
                value=external_types.ActionRelationValue(left=left, operator=operator, right=right),
                source=utils.derive_source_annotations(node=node),
                negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
            )
        return external_types.Comparison(
            type=external_types.ExpressionDiscriminator.COMPARISON,
            value=external_types.ComparisonValue(left=left, operator=operator, right=right),
            source=utils.derive_source_annotations(node=node),
            negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
        )

    @staticmethod
    def visit_relational_operator(node: NonTerminal, _) -> str:
        """Visit a <relational_operator> node."""
        return str(node)

    @staticmethod
    def visit_additive_expression(node: NonTerminal, children: list[Any]) -> external_types.Expression:
        """Visit an <additive_expression> node."""
        # If there's a single child, it's an expression with no additive operator bubbling up
        # through the precedence chain. As such, we want to just pass it on up as-is.
        if len(children) == 1:
            return children[0]
        result = children[0]
        for i in range(1, len(children), 2):  # Children arrive as [term, op, term, op, term, ...]
            operator = cast(external_types.ArithmeticOperator, str(children[i]))
            right = children[i + 1]
            result = external_types.ArithmeticExpression(
                type=external_types.ExpressionDiscriminator.ARITHMETIC_EXPRESSION,
                value=external_types.ArithmeticExpressionValue(left=result, operator=operator, right=right),
                source=utils.derive_source_annotations(node=node)
            )
        return result

    @staticmethod
    def visit_additive_operator(node: NonTerminal, _) -> str:
        """Visit a <additive_operator> node."""
        return str(node)

    @staticmethod
    def visit_multiplicative_expression(node: NonTerminal, children: list[Any]) -> external_types.Expression:
        """Visit a <multiplicative_expression> node."""
        # If there's a single child, it's an expression with no multiplicative operator bubbling up
        # through the precedence chain. As such, we want to just pass it on up as-is.
        if len(children) == 1:
            return children[0]
        return VisitorMixinExpressions.visit_additive_expression(node=node, children=children)

    @staticmethod
    def visit_multiplicative_operator(node: NonTerminal, _) -> str:
        """Visit a <multiplicative_operator> node."""
        return str(node)

    @staticmethod
    def visit_unary_expression(_, children: list[Any]) -> external_types.Expression:
        """Visit a <unary_expression> node."""
        unary_expression = children[-1]
        # If applicable, mutate the unary expression to mark it as being negated. The only way for an expression
        # to become negated is right here, since in the Viv grammar the negation operator can only appear inside
        # a `unary_expression`. To negate a complex expression such as a conjunction, the author must wrap it in
        # parentheses, which ultimately causes it to be parsed as a unary expression.
        if children[0] is sentinels.NEGATION:
            unary_expression['negated'] = True
        return unary_expression

    @staticmethod
    def visit_reference(
        node: NonTerminal,
        children: list[Any]
    ) -> external_types.EntityReference | external_types.SymbolReference:
        """Visit a <reference> node."""
        is_symbol_reference = False
        anchor_is_local_variable = False
        anchor_is_scratch_variable = False
        anchor_is_group_role = False
        anchor_fail_safe = False
        anchor_name = None
        path = []
        for child in children:
            if child is sentinels.ENTITY_SIGIL:
                pass
            elif child is sentinels.SYMBOL_SIGIL:
                is_symbol_reference = True
            elif child is sentinels.LOCAL_VARIABLE_SIGIL:
                anchor_is_local_variable = True
            elif child is sentinels.SCRATCH_VARIABLE_SIGIL:
                anchor_is_scratch_variable = True
            elif child is sentinels.GROUP_ROLE_DECORATOR:
                anchor_is_group_role = True
            elif child is sentinels.EVAL_FAIL_SAFE_MARKER:
                anchor_fail_safe = True
            elif type(child) is str:
                anchor_name = child
            else:
                path = child
        if anchor_is_scratch_variable:
            # We will ignore the symbol sigil here, because ultimately that refers to the type of
            # the scratch variable, not the anchor, which is always entity data.
            is_symbol_reference = False
            # Next, expand the `$` anchor. `$` is really just syntactic sugar for `@this.scratch.`,
            # which means any reference anchored in a scratch variable is in fact an entity
            # reference anchored in a role name.
            original_anchor_name = anchor_name
            anchor_name = config.SCRATCH_VARIABLE_REFERENCE_ANCHOR
            expanded_path = [
                *config.SCRATCH_VARIABLE_REFERENCE_PATH_PREFIX,
                external_types.ReferencePathComponentPropertyName(
                    type=external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_PROPERTY_NAME,
                    name=original_anchor_name,
                    failSafe=anchor_fail_safe
                )
            ]
            path = expanded_path + path
            anchor_fail_safe = False
        reference_value = external_types.ReferenceValue(
            anchor=anchor_name,
            path=path,
            local=anchor_is_local_variable,
            group=anchor_is_group_role,
            failSafe=anchor_fail_safe
        )
        if is_symbol_reference:
            return external_types.SymbolReference(
                type=external_types.ExpressionDiscriminator.SYMBOL_REFERENCE,
                value=reference_value,
                source=utils.derive_source_annotations(node=node),
                negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
            )
        return external_types.EntityReference(
            type=external_types.ExpressionDiscriminator.ENTITY_REFERENCE,
            value=reference_value,
            source=utils.derive_source_annotations(node=node),
            negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
        )

    @staticmethod
    def visit_reference_path(_, children: list[Any]) -> list[external_types.ReferencePathComponent]:
        """Visit a <reference_path> node."""
        return children

    @staticmethod
    def visit_reference_path_property_name(_, children: list[Any]) -> external_types.ReferencePathComponentPropertyName:
        """Visit a <reference_path_property_name> node."""
        property_name = children[0]
        reference_path_component_property_name = external_types.ReferencePathComponentPropertyName(
            type=external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_PROPERTY_NAME,
            name=property_name,
            failSafe=len(children) > 1
        )
        return reference_path_component_property_name

    @staticmethod
    def visit_reference_path_pointer(_, children: list[Any]) -> external_types.ReferencePathComponentPointer:
        """Visit a <reference_path_pointer> node."""
        property_name = children[0]
        reference_path_component_pointer = external_types.ReferencePathComponentPointer(
            type=external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_POINTER,
            propertyName=property_name,
            failSafe=len(children) > 1
        )
        return reference_path_component_pointer

    @staticmethod
    def visit_reference_path_lookup(_, children: list[Any]) -> external_types.ReferencePathComponentLookup:
        """Visit a <reference_path_lookup> node."""
        key = children[0]
        reference_path_component_lookup = external_types.ReferencePathComponentLookup(
            type=external_types.ReferencePathComponentDiscriminator.REFERENCE_PATH_COMPONENT_LOOKUP,
            key=key,
            failSafe=len(children) > 1
        )
        return reference_path_component_lookup

    @staticmethod
    def visit_list(node: NonTerminal, children: list[Any]) -> external_types.ListField:
        """Visit a <list> node."""
        list_field = external_types.ListField(
            type=external_types.ExpressionDiscriminator.LIST,
            value=children,
            source=utils.derive_source_annotations(node=node)
        )
        return list_field

    @staticmethod
    def visit_object(node: NonTerminal, children: list[Any]) -> external_types.ObjectField:
        """Visit an <object> node."""
        object_field_value = {}
        for child in children:
            object_field_value.update(child)
        object_field = external_types.ObjectField(
            type=external_types.ExpressionDiscriminator.OBJECT,
            value=object_field_value,
            source=utils.derive_source_annotations(node=node)
        )
        return object_field

    @staticmethod
    def visit_key_value_pair(_, children: list[Any]) -> dict[str, external_types.Expression]:
        """Visit a <key_value_pair> node."""
        key, value = children
        if isinstance(key, dict):  # The author formatted the key as a string
            key = key['value']
        key_value_pair = {key: value}
        return key_value_pair

    @staticmethod
    def visit_custom_function_call(node: NonTerminal, children: list[Any]) -> external_types.CustomFunctionCall:
        """Visit a <custom_function_call> node."""
        function_result_fail_safe = False
        if children[-1] is sentinels.EVAL_FAIL_SAFE_MARKER:
            function_result_fail_safe = True
            children = children[:-1]
        if len(children) >= 2:
            function_name, function_args = children[0], children[1]
        else:  # No arguments passed in the function call, which is syntactically fine
            function_name = children[0]
            function_args = []
        custom_function_call = external_types.CustomFunctionCall(
            type=external_types.ExpressionDiscriminator.CUSTOM_FUNCTION_CALL,
            value=external_types.CustomFunctionCallValue(
                name=function_name,
                args=function_args,
                failSafe=function_result_fail_safe
            ),
            source=utils.derive_source_annotations(node=node),
            negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
        )
        return custom_function_call

    @staticmethod
    def visit_args(_, children: list[Any]) -> list[external_types.Expression]:
        """Visit an <args> node."""
        return children

    @staticmethod
    def visit_chance_expression(node: NonTerminal, children: list[Any]) -> external_types.ChanceExpression:
        """Visit a <chance_expression> node."""
        chance = children[0]['value']
        probability = chance / 100
        chance_expression = external_types.ChanceExpression(
            type=external_types.ExpressionDiscriminator.CHANCE_EXPRESSION,
            value=probability,
            source=utils.derive_source_annotations(node=node)
        )
        return chance_expression

    @staticmethod
    def visit_literal(_, children: list[Any]) -> external_types.Expression:
        """Visit a <literal> node."""
        return children[0]

    @staticmethod
    def visit_enum(node: NonTerminal, children: list[Any]) -> external_types.Enum:
        """Visit an <enum> node."""
        additive_inverse_is_present = False
        if len(children) > 1:
            additive_inverse_is_present = children[0] == "-"
        name = children[-1]
        enum_expression = external_types.Enum(
            type=external_types.ExpressionDiscriminator.ENUM,
            value=external_types.EnumValue(name=name, minus=additive_inverse_is_present),
            source=utils.derive_source_annotations(node=node)
        )
        return enum_expression

    @staticmethod
    def visit_string(_, children: list[Any]) -> external_types.TemplateStringField | external_types.StringField:
        """Visit a <string> node."""
        return children[0]

    @staticmethod
    def visit_string_literal(node: NonTerminal, children: list[Any]) -> external_types.StringField:
        """Visit a <string_literal> node."""
        string_field = external_types.StringField(
            type=external_types.ExpressionDiscriminator.STRING,
            value=children[0],
            source=utils.derive_source_annotations(node=node)
        )
        return string_field

    @staticmethod
    def visit_template_string(node: NonTerminal, children: list[Any]) -> external_types.TemplateStringField:
        """Visit a <template_string> node."""
        # Strings are strictly single-line in Viv, but Arpeggio's global whitespace skipping lets
        # `template_string` quietly parse newlines between the `+` iterations of the char class,
        # producing a single-line string from multi-line source. To reject this, we'll search in
        # the raw source for a newline, raising an error if one is found.
        source = utils.derive_source_annotations(node=node)
        if "\n" in source["code"]:
            raise errors.VivCompileError("String literal cannot span multiple lines.", source=source)
        # Because Arpeggio skips whitespace by default, a relatively elaborate procedure is required here
        # to maintain any whitespace embedded in the static portion of the template string. We'll do this
        # by walking the raw nodes associated with the children of this one, handling both gaps and static
        # elements. For gaps, we emit the corresponding visited expression. Between a gap and an adjacent
        # static element, we check source positions to detect whitespace that the parser gobbled, which we
        # then carefully re-inject into the template string.
        child_nodes = list(node)
        gap_expressions = [child for child in children if not isinstance(child, str)]
        template = []
        partial_string = ""
        gap_index = 0
        for i, raw_child in enumerate(child_nodes):
            child_text = raw_child.flat_str()
            # Skip enclosing quotes
            if child_text in ('"', "'"):
                continue
            if raw_child.rule_name == 'template_gap':
                # Flush accumulated text
                if partial_string:
                    template.append(partial_string)
                    partial_string = ""
                # Emit the visited expression for this gap
                template.append(gap_expressions[gap_index])
                gap_index += 1
                # If the parser gobbled whitespace after this gap, re-inject it in our
                # seed the next text segment.
                gap_size = child_nodes[i+1].position - raw_child.position_end
                if gap_size > 0:
                    partial_string = " " * gap_size
            else:
                # Accumulate text from this terminal
                partial_string += child_text
        # Flush any remaining text before constructing and returning the expression
        if partial_string:
            template.append(partial_string)
        template_string_field = external_types.TemplateStringField(
            type=external_types.ExpressionDiscriminator.TEMPLATE_STRING,
            value=template,
            source=source
        )
        return template_string_field

    @staticmethod
    def visit_template_gap(_, children: list[Any]) -> external_types.Expression:
        """Visit a <template_gap> node."""
        return children[0]

    @staticmethod
    def visit_tags(node: NonTerminal, children: list[Any]) -> external_types.ListField:
        """Visit a <tags> node."""
        return VisitorMixinExpressions.visit_list(node=node, children=children)

    @staticmethod
    def visit_tag(node: NonTerminal, children: list[Any]) -> external_types.StringField:
        """Visit a <tag> node."""
        return VisitorMixinExpressions.visit_string_literal(node=node, children=children)

    @staticmethod
    def visit_number(node: NonTerminal, children: list[str]) -> external_types.FloatField | external_types.IntField:
        """Visit a <number> node."""
        number_str = ''.join(children)
        number = float(number_str)
        if number % 1:
            return external_types.FloatField(
                type=external_types.ExpressionDiscriminator.FLOAT,
                value=number,
                source=utils.derive_source_annotations(node=node)
            )
        return external_types.IntField(
            type=external_types.ExpressionDiscriminator.INT,
            value=int(number),
            source=utils.derive_source_annotations(node=node)
        )

    @staticmethod
    def visit_sign(node: NonTerminal, _) -> str:
        """Visit a <sign> node."""
        return str(node)

    @staticmethod
    def visit_boolean(node: NonTerminal, _) -> external_types.BoolField:
        """Visit a <boolean> node."""
        bool_field = external_types.BoolField(
            type=external_types.ExpressionDiscriminator.BOOL,
            value=(str(node) == "true"),
            source=utils.derive_source_annotations(node=node)
        )
        return bool_field

    @staticmethod
    def visit_null_type(node: NonTerminal, _) -> external_types.NullField:
        """Visit a <null_type> node."""
        null_field = external_types.NullField(
            type=external_types.ExpressionDiscriminator.NULL_TYPE,
            value=None,
            source=utils.derive_source_annotations(node=node)
        )
        return null_field

    @staticmethod
    def visit_trope_fit(node: NonTerminal, children: list[Any]) -> external_types.TropeFit:
        """Visit a <trope_fit> node."""
        trope_name, bindings_object = children
        bindings = bindings_object["bindings"]
        trope_fit = external_types.TropeFit(
            type=external_types.ExpressionDiscriminator.TROPE_FIT,
            value=external_types.TropeFitValue(tropeName=trope_name, bindings=bindings),
            source=utils.derive_source_annotations(node=node),
            negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
        )
        return trope_fit

    @staticmethod
    def visit_trope_fit_sugared(node: NonTerminal, children: list[Any]) -> external_types.TropeFit:
        """Visit a <trope_fit_sugared> node.

        Note that there may be positional bindings in a sugared trope fit,
        which are resolved (to roles from indices) during postprocessing.
        """
        bindings_object, trope_name = children
        bindings = bindings_object["bindings"]
        trope_fit = external_types.TropeFit(
            type=external_types.ExpressionDiscriminator.TROPE_FIT,
            value=external_types.TropeFitValue(tropeName=trope_name, bindings=bindings),
            source=utils.derive_source_annotations(node=node),
            negated=False  # May be set to `True` by `visit_unary_expression()`, as applicable
        )
        return trope_fit

    @staticmethod
    def visit_action_search(node: NonTerminal, children: list[Any]) -> external_types.ActionSearch:
        """Visit an <action_search> node."""
        query_name, action_search_body = children
        if query_name is sentinels.ACTION_SEARCH_NO_QUERY:
            query_name = None
        if "searchDomain" not in action_search_body:
            error_message = "Action search is missing search domain ('over' field is required)"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        action_search = external_types.ActionSearch(
            type=external_types.ExpressionDiscriminator.ACTION_SEARCH,
            value=external_types.ActionSearchValue(
                queryName=query_name,
                searchDomain=action_search_body["searchDomain"],
                bindings=action_search_body.get("bindings", external_types.PrecastBindings(partial=True, roles={}))
            ),
            source=utils.derive_source_annotations(node=node)
        )
        return action_search

    @staticmethod
    def visit_action_search_header(_, children: list[Any]) -> external_types.QueryName:
        """Visit an <action_search_header> node."""
        return children[0]

    @staticmethod
    def visit_action_search_bare_header(_, __) -> internal_types.Sentinel:
        """Visit an <action_search_bare_header> node."""
        return sentinels.ACTION_SEARCH_NO_QUERY

    @staticmethod
    def visit_action_search_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit an <action_search_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_action_search_bare_body(
            _, children: list[dict[str, external_types.SearchDomainDeclaration]]
    ) -> dict[str, external_types.SearchDomainDeclaration]:
        """Visit an <action_search_bare_body> node."""
        return children[0]

    @staticmethod
    def visit_search_domain(
        _, children: list[internal_types.Sentinel | external_types.Expression]
    ) -> dict[str, external_types.SearchDomainDeclaration]:
        """Visit a <search_domain> node."""
        raw_domain = children[0]
        domain_expression = None
        if raw_domain is sentinels.SEARCH_DOMAIN_INHERIT:
            domain_policy = external_types.SearchDomainPreparationPolicy.INHERIT
        elif raw_domain is sentinels.SEARCH_DOMAIN_CHRONICLE:
            domain_policy = external_types.SearchDomainPreparationPolicy.CHRONICLE
        else:
            domain_policy = external_types.SearchDomainPreparationPolicy.EXPRESSION
            domain_expression = raw_domain
        search_domain = external_types.SearchDomainDeclaration(
            policy=domain_policy,
            expression=domain_expression
        )
        return {"searchDomain": search_domain}

    @staticmethod
    def visit_search_domain_inherit(_, __) -> internal_types.Sentinel:
        """Visit a <search_domain_inherit> node."""
        return sentinels.SEARCH_DOMAIN_INHERIT

    @staticmethod
    def visit_search_domain_chronicle(_, __) -> internal_types.Sentinel:
        """Visit a <search_domain_chronicle> node."""
        return sentinels.SEARCH_DOMAIN_CHRONICLE

    @staticmethod
    def visit_search_domain_expression(_, children: list[external_types.Expression]) -> external_types.Expression:
        """Visit a <search_domain_expression> node."""
        return children[0]

    @staticmethod
    def visit_sifting(node: NonTerminal, children: list[Any]) -> external_types.Sifting:
        """Visit a <sifting> node."""
        pattern_name, sifting_body = children
        if "searchDomain" not in sifting_body:
            raise errors.VivCompileError(
                "Sifting expression is missing search domain (use 'over' field)",
                source=utils.derive_source_annotations(node=node)
            )
        sifting = external_types.Sifting(
            type=external_types.ExpressionDiscriminator.SIFTING,
            value=external_types.SiftingValue(
                patternName=pattern_name,
                searchDomain=sifting_body.get("searchDomain"),
                bindings=sifting_body.get("bindings", external_types.PrecastBindings(partial=True, roles={}))
            ),
            source=utils.derive_source_annotations(node=node)
        )
        return sifting

    @staticmethod
    def visit_sifting_header(_, children: list[Any]) -> external_types.SiftingPatternName:
        """Visit a <sifting_header> node."""
        return children[0]

    @staticmethod
    def visit_sifting_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <sifting_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_local_variable_sigil(_, __) -> internal_types.Sentinel:
        """Visit a <local_variable_sigil> node."""
        return sentinels.LOCAL_VARIABLE_SIGIL

    @staticmethod
    def visit_scratch_variable_sigil(_, __) -> internal_types.Sentinel:
        """Visit a <scratch_variable_sigil> node."""
        return sentinels.SCRATCH_VARIABLE_SIGIL

    @staticmethod
    def visit_group_role_decorator(_, __) -> internal_types.Sentinel:
        """Visit a <group_role_decorator> node."""
        return sentinels.GROUP_ROLE_DECORATOR

    @staticmethod
    def visit_eval_fail_safe_marker(_, __) -> internal_types.Sentinel:
        """Visit an <eval_fail_safe_marker> node."""
        return sentinels.EVAL_FAIL_SAFE_MARKER

    @staticmethod
    def visit_identifier(_, children: list[str]) -> str:
        """Visit an <identifier> node."""
        return ''.join(children)
