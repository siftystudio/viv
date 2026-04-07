"""Test that prohibited role labels are rejected per construct type."""

from pathlib import Path

import pytest

from viv_compiler import VivCompileError, compile_from_path


ALL_ROLE_LABELS = frozenset({
    "action", "anywhere", "bystander", "character", "initiator",
    "item", "location", "partner", "precast", "recipient", "spawn", "symbol",
})

PERMITTED_LABELS = {
    "action": {
        "action", "anywhere", "bystander", "character", "initiator",
        "item", "location", "partner", "precast", "recipient", "spawn", "symbol",
    },
    "action-selector": {
        "action", "anywhere", "bystander", "character", "initiator",
        "item", "location", "partner", "precast", "recipient", "symbol",
    },
    "plan": {"action", "anywhere", "character", "item", "location", "precast", "symbol"},
    "plan-selector": {"action", "anywhere", "character", "item", "location", "precast", "symbol"},
    "query": {"action", "anywhere", "character", "item", "location", "precast", "symbol"},
    "pattern": {"action", "anywhere", "character", "item", "location", "precast", "symbol"},
    "trope": {"action", "anywhere", "character", "item", "location", "precast", "symbol"},
}

_PROHIBITED_PAIRS = [
    (construct_type, label)
    for construct_type, permitted in PERMITTED_LABELS.items()
    for label in sorted(ALL_ROLE_LABELS - permitted)
]


def _build_construct_with_label(construct_type: str, label: str) -> str:
    """Generate a minimal `.viv` source that uses `label` in a role on `construct_type`.

    The generated source is syntactically valid so the parser succeeds and the
    label-validation check is what rejects it.

    Args:
        construct_type: The Viv construct type (e.g., `"action"`, `"plan"`).
        label: The role label to inject (e.g., `"spawn"`, `"initiator"`).
    """
    role_body = f"            as: {label}\n"
    if label in ("action", "symbol"):
        role_body += '            from: ["a"]\n'
    if label == "spawn":
        role_body += "            spawn: ~create()\n"
    if construct_type == "action":
        return (
            "action test-construct:\n"
            "    roles:\n"
            "        @actor:\n"
            "            as: initiator\n"
            "        @target:\n"
            f"{role_body}"
        )
    elif construct_type == "action-selector":
        return (
            "action stub:\n"
            "    roles:\n"
            "        @x:\n"
            "            as: initiator\n"
            "\n"
            "reserved action-selector test-construct:\n"
            "    roles:\n"
            "        @actor:\n"
            "            as: initiator\n"
            "        @target:\n"
            f"{role_body}"
            "    target randomly:\n"
            "        stub;\n"
        )
    elif construct_type == "plan":
        return (
            "plan test-construct:\n"
            "    roles:\n"
            "        @target:\n"
            f"{role_body}"
            "    phases:\n"
            "        >only:\n"
            "            succeed;\n"
        )
    elif construct_type == "plan-selector":
        return (
            "plan stub-plan:\n"
            "    roles:\n"
            "        @x:\n"
            "            as: character\n"
            "    phases:\n"
            "        >only:\n"
            "            succeed;\n"
            "\n"
            "plan-selector test-construct:\n"
            "    roles:\n"
            "        @target:\n"
            f"{role_body}"
            "    target randomly:\n"
            "        stub-plan;\n"
        )
    elif construct_type == "query":
        return (
            "query test-construct:\n"
            "    roles:\n"
            "        @target:\n"
            f"{role_body}"
        )
    elif construct_type == "pattern":
        return (
            "pattern test-construct:\n"
            "    roles:\n"
            "        @target:\n"
            f"{role_body}"
            "    actions:\n"
            "        @act:\n"
            '            from: ~getActions()\n'
        )
    elif construct_type == "trope":
        return (
            "trope test-construct:\n"
            "    roles:\n"
            "        @target:\n"
            f"{role_body}"
        )
    else:
        raise ValueError(f"Unknown construct type: {construct_type}")


@pytest.mark.parametrize("construct_type, label", _PROHIBITED_PAIRS,
                         ids=[f"{ct}-{lb}" for ct, lb in _PROHIBITED_PAIRS])
def test_prohibited_role_label_rejected(construct_type: str, label: str, tmp_path: Path) -> None:
    """Check that each prohibited (`construct_type`, `label`) pair raises `VivCompileError`."""
    source = _build_construct_with_label(construct_type, label)
    viv_file = tmp_path / "test.viv"
    viv_file.write_text(source)
    with pytest.raises(VivCompileError, match="(?s)invalid role label"):
        compile_from_path(source_file_path=viv_file)
