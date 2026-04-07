"""Test compilation of Viv temporal constraints."""

from viv_compiler import compile_from_path

from .conftest import VALID_FIXTURES_SUBDIR


def test_temporal_constraint_time_frame_after_from_action() -> None:
    """Check that `after: 2 hours from ACTION` sets the correct time frame."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "temporal_constraints.viv")
    reactions = bundle["actions"]["remind"]["reactions"]
    follow_up = next(r for r in reactions if r["body"]["value"]["targetName"] == "follow-up")
    time_constraints = follow_up["body"]["value"]["time"]
    assert len(time_constraints) == 1
    constraint = time_constraints[0]
    assert constraint["type"] == "timeFrame"
    assert constraint["open"]["amount"] == 2
    assert constraint["open"]["unit"] == "hours"
    assert constraint["close"] is None
    assert constraint["useActionTimestamp"] is True


def test_temporal_constraint_time_frame_before_from_now() -> None:
    """Check that `before: 1 day from NOW` sets the correct time frame."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "temporal_constraints.viv")
    reactions = bundle["actions"]["remind"]["reactions"]
    check_in = next(r for r in reactions if r["body"]["value"]["targetName"] == "check-in")
    time_constraints = check_in["body"]["value"]["time"]
    assert len(time_constraints) == 1
    constraint = time_constraints[0]
    assert constraint["type"] == "timeFrame"
    assert constraint["close"]["amount"] == 1
    assert constraint["close"]["unit"] == "days"
    assert constraint["open"] is None
    assert constraint["useActionTimestamp"] is False


def test_temporal_constraint_time_of_day_between() -> None:
    """Check that `between: 8am and 12pm` compiles to time-of-day bounds."""
    bundle = compile_from_path(source_file_path=VALID_FIXTURES_SUBDIR / "temporal_constraints.viv")
    reactions = bundle["actions"]["remind"]["reactions"]
    morning = next(r for r in reactions if r["body"]["value"]["targetName"] == "morning-reminder")
    time_constraints = morning["body"]["value"]["time"]
    assert len(time_constraints) == 1
    constraint = time_constraints[0]
    assert constraint["type"] == "timeOfDay"
    assert constraint["open"]["hour"] == 8
    assert constraint["open"]["minute"] == 0
    assert constraint["close"]["hour"] == 12
    assert constraint["close"]["minute"] == 0
