"""Mixin class containing visitor methods associated with plan definitions."""

__all__ = ["VisitorMixinPlans"]

from typing import Any

from arpeggio import NonTerminal, PTNodeVisitor

from viv_compiler import errors, external_types, internal_types, sentinels, utils, validation


class VisitorMixinPlans(PTNodeVisitor):
    """A visitor mixin for Viv plans."""

    @staticmethod
    def visit_plan(node: NonTerminal, children: list[Any]) -> internal_types.IntermediatePlanDefinition:
        """Visit a <plan> node."""
        # Check for required fields
        accumulated_fields = {}
        plan_name, plan_body = children
        accumulated_fields['name'] = plan_name
        if "roles" not in plan_body:
            error_message = f"Plan '{accumulated_fields['name']}' is missing 'roles' field (required)"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        if "phases" not in plan_body:
            error_message = f"Plan '{accumulated_fields['name']}' is missing 'phases' field (required)"
            raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        # Collect all role definitions
        all_role_definitions = plan_body["roles"]
        validation.prevalidate_role_names(
            construct_type=external_types.ConstructDiscriminator.PLAN,
            construct_name=plan_name,
            role_definitions=all_role_definitions,
            source=utils.derive_source_annotations(node=node)
        )
        accumulated_fields["roles"] = {role["name"]: role for role in all_role_definitions}
        # Collect all phase definitions, and set the `next` property for each
        all_phase_definitions = plan_body["phases"]
        for i in range(len(all_phase_definitions) - 1):
            all_phase_definitions[i]['next'] = all_phase_definitions[i + 1]['name']
        all_phase_definitions[len(all_phase_definitions) - 1]['next'] = None
        accumulated_fields["phases"] = {phase["name"]: phase for phase in all_phase_definitions}
        accumulated_fields["initialPhase"] = all_phase_definitions[0]['name']
        # Populate the fields
        for field_name, field_value in plan_body.items():
            if field_name == "roles" or field_name == "phases":
                continue  # Already handled just above
            else:
                accumulated_fields[field_name] = field_value
        # Do some quick prevalidation that depends on transient data
        for phase_definition in all_phase_definitions:
            for instruction in phase_definition["tape"]:
                if instruction["type"] == external_types.PlanInstructionDiscriminator.REACTION_QUEUE:
                    instruction: external_types.PlanInstructionReactionQueue
                    reaction = instruction["reaction"]["value"]
                    if not reaction['time']:
                        continue
                    temporal_statements = reaction['time']
                    for temporal_statement in temporal_statements:
                        if temporal_statement.get("useActionTimestamp"):
                            error_message = (
                                f"Plan '{plan_name}' has phase '{phase_definition['name']}' with temporal "
                                f"constraint with bad anchor 'from action' ('from now' is required in plans)"
                            )
                            raise errors.VivCompileError(
                                error_message,
                                source=utils.derive_source_annotations(node=node)
                            )
        # Package up the intermediate definition
        intermediate_plan_definition = internal_types.IntermediatePlanDefinition(
            type=external_types.ConstructDiscriminator.PLAN,
            name=plan_name,
            roles=accumulated_fields["roles"],
            _conditions_raw=accumulated_fields.get("_conditions_raw", []),
            phases=accumulated_fields["phases"],
            initialPhase=accumulated_fields["initialPhase"]
        )
        return intermediate_plan_definition

    @staticmethod
    def visit_plan_header(_, children: list[Any]) -> external_types.PlanName:
        """Visit a <plan_header> node."""
        return children[0]

    @staticmethod
    def visit_plan_body(_, children: list[Any]) -> dict[str, Any]:
        """Visit a <plan_body> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        return accumulated_fields

    @staticmethod
    def visit_plan_roles(_, children: list[Any]) -> dict[str, list[external_types.RoleDefinition]]:
        """Visit a <plan_roles> node."""
        return {"roles": children}

    @staticmethod
    def visit_plan_conditions(_, children: list[Any]) -> dict[str, list[external_types.Expression]]:
        """Visit a <plan_conditions> node."""
        return {"_conditions_raw": children[0]}

    @staticmethod
    def visit_plan_phases(_, children: list[Any]) -> dict[str, list[external_types.PlanPhase]]:
        """Visit a <plan_phases> node."""
        return {"phases": children}

    @staticmethod
    def visit_plan_phase(_, children: list[Any]) -> external_types.PlanPhase:
        """Visit a <plan_phase> node."""
        phase_name, phase_tape = children
        phase_definition = external_types.PlanPhase(
            name=phase_name,
            next=None,  # Set in `visit_plan()`, once all the phases have been compiled
            tape=phase_tape
        )
        return phase_definition

    @staticmethod
    def visit_plan_phase_name(_, children: list[Any]) -> external_types.PlanPhaseName:
        """Visit a <plan_phase_name> node."""
        return children[-1]

    @staticmethod
    def visit_plan_instructions(
        node: NonTerminal,
        children: list[list[internal_types.IntermediatePlanInstruction]]
    ) -> list[external_types.PlanInstruction]:
        """Visit a <plan_instructions> node."""
        # Linearize the raw tape, whose instructions may include unresolved offset addresses
        raw_tape: list[internal_types.IntermediatePlanInstruction] = []
        for intermediate_instructions_group in children:
            raw_tape += intermediate_instructions_group
        # Resolve all address offsets (into actual addresses)
        final_tape: list[external_types.PlanInstruction] = []
        for instruction_address, instruction in enumerate(raw_tape):
            instruction: internal_types.IntermediatePlanInstruction
            match instruction['type']:
                case(
                    external_types.PlanInstructionDiscriminator.ADVANCE
                    | external_types.PlanInstructionDiscriminator.FAIL
                    | external_types.PlanInstructionDiscriminator.LOOP_INIT
                    | external_types.PlanInstructionDiscriminator.REACTION_QUEUE
                    | external_types.PlanInstructionDiscriminator.REACTION_WINDOW_OPEN
                    | external_types.PlanInstructionDiscriminator.REACTION_WINDOW_CLOSE
                    | external_types.PlanInstructionDiscriminator.SUCCEED
                    | external_types.PlanInstructionDiscriminator.WAIT_END
                    | external_types.PlanInstructionDiscriminator.WAIT_START
                ):
                    final_tape.append(instruction)
                case external_types.PlanInstructionDiscriminator.JUMP:
                    instruction: internal_types.IntermediatePlanInstructionJump
                    target_offset = instruction["_target_offset"]
                    resolved_target = instruction_address + target_offset
                    jump_instruction = external_types.PlanInstructionJump(
                        type=external_types.PlanInstructionDiscriminator.JUMP,
                        target=resolved_target
                    )
                    final_tape.append(jump_instruction)
                case external_types.PlanInstructionDiscriminator.JUMP_IF_FALSE:
                    instruction: internal_types.IntermediatePlanInstructionJumpIfFalse
                    target_offset = instruction["_target_offset"]
                    resolved_target = instruction_address + target_offset
                    jump_if_false_instruction = external_types.PlanInstructionJumpIfFalse(
                        type=external_types.PlanInstructionDiscriminator.JUMP_IF_FALSE,
                        condition=instruction["_condition"],
                        target=resolved_target
                    )
                    final_tape.append(jump_if_false_instruction)
                case external_types.PlanInstructionDiscriminator.LOOP_NEXT:
                    instruction: internal_types.IntermediatePlanInstructionLoopNext
                    exit_target_offset = instruction["_exitTarget_offset"]
                    resolved_exit_target = instruction_address + exit_target_offset
                    loop_next_instruction = external_types.PlanInstructionLoopNext(
                        type=external_types.PlanInstructionDiscriminator.LOOP_NEXT,
                        exitTarget=resolved_exit_target
                    )
                    final_tape.append(loop_next_instruction)
                case _:
                    error_message = f"Unexpected plan-instruction type: {instruction['type']}"
                    raise errors.VivCompileError(error_message, source=utils.derive_source_annotations(node=node))
        # Return the prepared tape
        return final_tape

    @staticmethod
    def visit_plan_instruction(
        _, children: list[list[internal_types.IntermediatePlanInstruction]]
    ) -> list[internal_types.IntermediatePlanInstruction]:
        """Visit a <plan_instruction> node.

        Note: Despite the singular name for this nonterminal, we always return a list of instructions
        here. Because some instruction types compile to lists of instructions (e.g., reaction windows),
        we proactively list-ify all instruction types as they are initially emitted by the dedicated
        visitor methods below. As such, this method always returns a list of intermediate instructions.
        """
        return children[0]

    @staticmethod
    def visit_plan_loop(_, children: list[Any]) -> list[internal_types.IntermediatePlanInstruction]:
        """Visit a <plan_loop> node."""
        iterable, variable, body_instructions = children
        loop_init_instruction = external_types.PlanInstructionLoopInit(
            type=external_types.PlanInstructionDiscriminator.LOOP_INIT,
            iterable=iterable,
            variable=variable
        )
        intermediate_loop_next_instruction = internal_types.IntermediatePlanInstructionLoopNext(
            type=external_types.PlanInstructionDiscriminator.LOOP_NEXT,
            # Jump forward past this instruction, the body instructions, and then past the trailing
            # jump. If it feels like there's an extra `+1`, it's because we always need to move by
            # at least one instruction to avoid staying put (i.e., a `+0`).
            _exitTarget_offset=(1 + len(body_instructions) + 1)
        )
        intermediate_jump_instruction = internal_types.IntermediatePlanInstructionJump(
            type=external_types.PlanInstructionDiscriminator.JUMP,
            # Jump backward past this instruction and the body instructions, all the way back to the
            # loop-next instruction. Again, if the `-1` feels strange here, it's because we always
            # need to move by at least one instruction to avoid staying put (i.e., a `-0`).
            _target_offset=(-1 - len(body_instructions))
        )
        instructions = (
            [loop_init_instruction, intermediate_loop_next_instruction] +
            body_instructions +
            [intermediate_jump_instruction]
        )
        return instructions

    @staticmethod
    def visit_plan_conditional(
        _, children: list[list[internal_types.IntermediatePlanConditionalBranch]]
    ) -> list[internal_types.IntermediatePlanInstruction]:
        """Visit a <plan_conditional> node."""
        # Count up the total number of instructions, since all branches need an offset
        # to jump to the end, past the other branches.
        branches: list[internal_types.IntermediatePlanConditionalBranch] = []
        for branches_group in children:
            branches += branches_group
        n_conditional_instructions = 0
        for branch in branches:
            if branch["_condition"]:
                n_conditional_instructions += 2  # Two jumps per branch
            n_conditional_instructions += len(branch["_consequent"])
        # Linearize the instructions that make up the plan conditional
        conditional_instructions_so_far: list[internal_types.IntermediatePlanInstruction] = []
        for branch in branches:
            branch_instructions: list[internal_types.IntermediatePlanInstruction] = branch["_consequent"]
            # If this is the alternative, simply append its instructions now
            if not branch["_condition"]:
                conditional_instructions_so_far += branch_instructions
                continue
            # Otherwise, it's a conditional branch, so we need to augment the instructions with jump machinery
            intermediate_jump_if_false_instruction = internal_types.IntermediatePlanInstructionJumpIfFalse(
                type=external_types.PlanInstructionDiscriminator.JUMP_IF_FALSE,
                _condition=branch["_condition"],
                # Jump forward past this instruction, the branch instructions, and then past the trailing
                # jump. If it feels like there's an extra `+1`, it's because we always need to move by
                # at least one instruction to avoid staying put (i.e., a `+0`).
                _target_offset=(1 + len(branch_instructions) + 1)
            )
            conditional_instructions_so_far += [intermediate_jump_if_false_instruction] + branch_instructions
            intermediate_jump_instruction = internal_types.IntermediatePlanInstructionJump(
                type=external_types.PlanInstructionDiscriminator.JUMP,
                # Jump forward to the first instruction after the conditional. This entails jumping past this
                # instruction (hence the leading `+1`) and then past all remaining branches and the alternative,
                # as applicable. This works because the number of trailing instructions in the conditional will
                # always be precisely `n_conditional_instructions - len(conditional_instructions_so_far)`.
                _target_offset=(1 + n_conditional_instructions - len(conditional_instructions_so_far))
            )
            conditional_instructions_so_far += [intermediate_jump_instruction]
        return conditional_instructions_so_far

    @staticmethod
    def visit_plan_conditional_branches(
        _, children: list[internal_types.IntermediatePlanConditionalBranch]
    ) -> list[internal_types.IntermediatePlanConditionalBranch]:
        """Visit a <plan_conditional_branches> node."""
        return children

    @staticmethod
    def visit_plan_conditional_branch(_, children: list[Any]) -> internal_types.IntermediatePlanConditionalBranch:
        """Visit a <plan_conditional_branch> node."""
        condition, consequent = children
        conditional_branch = internal_types.IntermediatePlanConditionalBranch(
            _condition=condition,
            _consequent=consequent
        )
        return conditional_branch

    @staticmethod
    def visit_plan_conditional_consequent(
        _, children: list[list[internal_types.IntermediatePlanInstruction]]
    ) -> list[internal_types.IntermediatePlanInstruction]:
        """Visit a <plan_conditional_consequent> node."""
        return children[0]

    @staticmethod
    def visit_plan_conditional_alternative(
        _, children: list[list[internal_types.IntermediatePlanInstruction]]
    ) -> list[internal_types.IntermediatePlanConditionalBranch]:
        """Visit a <plan_conditional_alternative> node."""
        conditional_alternative_branch = internal_types.IntermediatePlanConditionalBranch(
            _condition=None,
            _consequent=children[0]
        )
        # We'll return a list here for parity with `visit_plan_conditional_branches()`, which will
        # make it easier to linearize the conditional in `visit_plan_conditional()` up above.
        return [conditional_alternative_branch]

    @staticmethod
    def visit_plan_scoped_statements(
        _, children: list[list[internal_types.IntermediatePlanInstruction]]
    ) -> list[internal_types.IntermediatePlanInstruction]:
        """Visit a <plan_scoped_statements> node."""
        instructions: list[internal_types.IntermediatePlanInstruction] = []
        for instructions_group in children:
            instructions += instructions_group
        return instructions

    @staticmethod
    def visit_plan_instruction_reaction(_, children: list[Any]) -> list[external_types.PlanInstructionReactionQueue]:
        """Visit a <plan_instruction_reaction> node."""
        reaction_instruction = external_types.PlanInstructionReactionQueue(
            type=external_types.PlanInstructionDiscriminator.REACTION_QUEUE,
            reaction=children[0]
        )
        return [reaction_instruction]

    @staticmethod
    def visit_plan_instruction_reaction_window(
        node: NonTerminal,
        children: list[internal_types.Sentinel | list[internal_types.IntermediatePlanInstruction]]
    ) -> list[internal_types.IntermediatePlanInstruction]:
        """Visit a <plan_instruction_reaction_window> node."""
        operator_sentinel, *window_body_instruction_groups = children
        window_body_instructions: list[internal_types.IntermediatePlanInstruction] = []
        for instructions_group in window_body_instruction_groups:
            window_body_instructions += instructions_group
        if operator_sentinel is sentinels.REACTION_WINDOW_OPERATOR_ALL:
            operator = external_types.PlanPhaseReactionWindowOperator.ALL
        elif operator_sentinel is sentinels.REACTION_WINDOW_OPERATOR_ANY:
            operator = external_types.PlanPhaseReactionWindowOperator.ANY
        elif operator_sentinel is sentinels.REACTION_WINDOW_OPERATOR_UNTRACKED:
            # An `untracked` window is compiled as a sequence of bare reactions, since that's its
            # semantics and there's no need to spin up unused window machinery.
            return window_body_instructions
        else:
            raise errors.VivCompileError(
                "Unexpected operator for reaction window in plan phase",
                source=utils.derive_source_annotations(node=node)
            )
        window_open_instruction = external_types.PlanInstructionReactionWindowOpen(
            type=external_types.PlanInstructionDiscriminator.REACTION_WINDOW_OPEN
        )
        window_close_instruction = external_types.PlanInstructionReactionWindowClose(
            type=external_types.PlanInstructionDiscriminator.REACTION_WINDOW_CLOSE,
            operator=operator
        )
        instructions = [window_open_instruction] + window_body_instructions + [window_close_instruction]
        return instructions

    @staticmethod
    def visit_plan_instruction_reaction_window_operator(node: NonTerminal, _) -> internal_types.Sentinel:
        """Visit a <plan_instruction_reaction_window_operator> node."""
        match str(node):
            case "all":
                return sentinels.REACTION_WINDOW_OPERATOR_ALL
            case "any":
                return sentinels.REACTION_WINDOW_OPERATOR_ANY
            case "untracked":
                return sentinels.REACTION_WINDOW_OPERATOR_UNTRACKED
            case _:
                raise errors.VivCompileError(
                    "Unexpected operator for reaction window in plan phase",
                    source=utils.derive_source_annotations(node=node)
                )

    @staticmethod
    def visit_plan_instruction_wait(_, children: list[Any]) -> list[external_types.PlanInstruction]:
        """Visit a <plan_instruction_wait> node."""
        accumulated_fields = {}
        for child in children:
            accumulated_fields.update(child)
        wait_start_instruction = external_types.PlanInstructionWaitStart(
            type=external_types.PlanInstructionDiscriminator.WAIT_START,
            timeout=accumulated_fields["timeout"]
        )
        wait_end_instruction = external_types.PlanInstructionWaitEnd(
            type=external_types.PlanInstructionDiscriminator.WAIT_END,
            resumeConditions=accumulated_fields.get("resumeConditions", None)
        )
        return [wait_start_instruction, wait_end_instruction]

    @staticmethod
    def visit_plan_instruction_wait_timeout(
        _, children: list[external_types.TimeDelta]
    ) -> dict[str, external_types.TimeDelta]:
        """Visit a <plan_instruction_wait_timeout> node."""
        return {"timeout": children[0]}

    @staticmethod
    def visit_plan_instruction_wait_until(
        _, children: list[list[external_types.Expression]]
    ) -> dict[str, list[external_types.Expression]]:
        """Visit a <plan_instruction_wait_until> node."""
        return {"resumeConditions": children[0]}

    @staticmethod
    def visit_plan_instruction_advance(_, __) -> list[external_types.PlanInstructionAdvance]:
        """Visit a <plan_instruction_advance> node."""
        advance_instruction = external_types.PlanInstructionAdvance(
            type=external_types.PlanInstructionDiscriminator.ADVANCE
        )
        return [advance_instruction]

    @staticmethod
    def visit_plan_instruction_succeed(_, __) -> list[external_types.PlanInstructionSucceed]:
        """Visit a <plan_instruction_succeed> node."""
        succeed_instruction = external_types.PlanInstructionSucceed(
            type=external_types.PlanInstructionDiscriminator.SUCCEED
        )
        return [succeed_instruction]

    @staticmethod
    def visit_plan_instruction_fail(_, __) -> list[external_types.PlanInstructionFail]:
        """Visit a <plan_instruction_fail> node."""
        fail_instruction = external_types.PlanInstructionFail(
            type=external_types.PlanInstructionDiscriminator.FAIL
        )
        return [fail_instruction]

    @staticmethod
    def visit_plan_phase_sigil(_, __) -> internal_types.Sentinel:
        """Visit a <plan_phase_sigil> node."""
        return sentinels.PLAN_PHASE_SIGIL
