"""Entry point for the domain-adaptive pretraining pipeline, which trains a
LoRA adapter for the Viv wizard.

This file also exposes a simple CLI.
"""

import os
import argparse

from dapt.aggregation import aggregate
from ._config import PATH_TO_CHECKPOINTS_DIR
from ._pipeline import dapt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run domain-adaptive pretraining (DAPT) for a Viv wizard LoRA adapter"
    )
    parser.add_argument(
        "--skip-aggregation",
        action="store_true",
        help="Skip the aggregation step and use existing aggregated examples (along with the synthesized ones)"
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="ID for a checkpoint from which to resume training"
    )
    args = parser.parse_args()
    if not args.skip_aggregation:
        aggregate()
    found_existing_checkpoints = (
        os.path.isdir(PATH_TO_CHECKPOINTS_DIR) and
        any(entry.is_dir() for entry in os.scandir(PATH_TO_CHECKPOINTS_DIR))
    )
    if not args.checkpoint and found_existing_checkpoints:
        response = input("Found existing checkpoints. Are you sure you want to start fresh? [y/N] ")
        if response.lower() != "y":
            print("Aborting run. Pass --checkpoint <id> to resume from a checkpoint.")
            raise SystemExit(1)
    dapt(checkpoint_id=args.checkpoint)
