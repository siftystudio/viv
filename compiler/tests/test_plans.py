"""Test compilation of Viv plan constructs."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_plan_phase_sequencing() -> None:
    """Compile the <plan> fixture and check `initialPhase` and `next` pointers."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan.viv")
    plan = bundle["plans"]["get-revenge"]
    assert plan["initialPhase"] == "plot"
    assert plan["phases"]["plot"]["next"] is None
    assert len(plan["phases"]["plot"]["tape"]) > 0


def test_plan_multi_phase_sequencing() -> None:
    """Compile the <plan_multi_phase> fixture and check phase chaining."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_multi_phase.viv")
    plan = bundle["plans"]["raid"]
    assert plan["initialPhase"] == "reconnaissance"
    assert plan["phases"]["reconnaissance"]["next"] == "preparation"
    assert plan["phases"]["preparation"]["next"] == "execution"
    assert plan["phases"]["execution"]["next"] is None


def test_plan_conditional_tape_compilation() -> None:
    """Compile the <plan_elif> fixture and check if/elif/else jump structure.

    Expected tape shape:
        [0] jumpIfFalse → elif
        [1] reactionQueue(step-one)
        [2] advance
        [3] jump → end
        [4] jumpIfFalse → else
        [5] reactionQueue(step-two)
        [6] advance
        [7] jump → end
        [8] reactionQueue(step-three)
        [9] succeed
    """
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_elif.viv")
    plan = bundle["plans"]["branching-plan"]
    tape = plan["phases"]["evaluate"]["tape"]
    instruction_types = [instr["type"] for instr in tape]
    assert tape[0]["type"] == "jumpIfFalse"
    first_jif_target = tape[0]["target"]
    assert tape[first_jif_target]["type"] == "jumpIfFalse"
    second_jif_target = tape[first_jif_target]["target"]
    assert tape[second_jif_target]["type"] == "reactionQueue"
    assert instruction_types.count("jumpIfFalse") == 2
    assert instruction_types.count("jump") == 2
    jump_indices = [i for i, t in enumerate(instruction_types) if t == "jump"]
    assert tape[jump_indices[0]]["target"] == tape[jump_indices[1]]["target"]


def test_plan_loop_tape_compilation() -> None:
    """Compile the <plan_with_loop> fixture and check loop tape structure."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_with_loop.viv")
    plan = bundle["plans"]["tour"]
    tape = plan["phases"]["visiting"]["tape"]
    instruction_types = [instr["type"] for instr in tape]
    assert instruction_types[0] == "loopInit"
    assert instruction_types[1] == "loopNext"
    assert instruction_types[2] == "reactionQueue"
    assert instruction_types[3] == "jump"
    assert instruction_types[4] == "succeed"
    assert tape[3]["target"] == 1
    assert tape[1]["exitTarget"] == 4


def test_plan_reaction_window_all() -> None:
    """Compile the <plan_with_reaction_window> fixture and check `all:` window bracketing."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_with_reaction_window.viv")
    plan = bundle["plans"]["complex-operation"]
    tape = plan["phases"]["parallel-phase"]["tape"]
    instruction_types = [instr["type"] for instr in tape]
    assert instruction_types[0] == "reactionWindowOpen"
    assert "reactionQueue" in instruction_types
    close_idx = instruction_types.index("reactionWindowClose")
    assert tape[close_idx]["operator"] == "all"


def test_plan_reaction_window_untracked() -> None:
    """Compile the <plan_with_reaction_window> fixture and check `untracked:` produces no window."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_with_reaction_window.viv")
    plan = bundle["plans"]["complex-operation"]
    tape = plan["phases"]["fire-and-forget"]["tape"]
    instruction_types = [instr["type"] for instr in tape]
    assert "reactionWindowOpen" not in instruction_types
    assert "reactionWindowClose" not in instruction_types
    assert "reactionQueue" in instruction_types
    assert "succeed" in instruction_types


def test_plan_wait_instruction() -> None:
    """Compile the <plan_with_wait> fixture and check `waitStart`/`waitEnd` instructions."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_with_wait.viv")
    plan = bundle["plans"]["recover"]
    tape = plan["phases"]["resting"]["tape"]
    instruction_types = [instr["type"] for instr in tape]
    assert instruction_types[0] == "waitStart"
    assert instruction_types[1] == "waitEnd"
    assert tape[0]["timeout"]["amount"] == 3
    assert tape[0]["timeout"]["unit"] == "days"
    assert tape[1]["resumeConditions"] is not None


def test_plan_elif_conditional() -> None:
    """Compile the <plan_elif> fixture and check the else branch targets `step-three`."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_elif.viv")
    plan = bundle["plans"]["branching-plan"]
    tape = plan["phases"]["evaluate"]["tape"]
    reaction_queues = [(i, instr) for i, instr in enumerate(tape) if instr["type"] == "reactionQueue"]
    last_rq = reaction_queues[-1][1]
    assert last_rq["reaction"]["value"]["targetName"] == "step-three"


def test_plan_reaction_window_any() -> None:
    """Compile the <plan_with_reaction_window> fixture and check `any:` window operator."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "plan_with_reaction_window.viv")
    plan = bundle["plans"]["complex-operation"]
    tape = plan["phases"]["any-phase"]["tape"]
    instruction_types = [instr["type"] for instr in tape]
    assert "reactionWindowOpen" in instruction_types
    close_idx = instruction_types.index("reactionWindowClose")
    assert tape[close_idx]["operator"] == "any"
