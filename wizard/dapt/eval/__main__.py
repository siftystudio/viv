"""Entry point for the DAPT evaluation suite."""

import argparse

from .runner import evaluate_adapter


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Evaluate a DAPT adapter checkpoint against its base model"
    )
    parser.add_argument(
        "checkpoint",
        type=str,
        help="Path to the adapter checkpoint directory to evaluate"
    )
    args = parser.parse_args()
    evaluate_adapter(checkpoint_path=args.checkpoint)
