"""Module for tracking the training run via the Weights & Biases SDK."""

__all__ = ["prepare_tracking"]

import subprocess

import wandb

from ._config import (
    BASE_MODEL_NAME,
    BATCH_SIZE,
    GRADIENT_ACCUMULATION_STEPS,
    LEARNING_RATE,
    LORA_ALPHA,
    LORA_RANK,
    MAX_NORM,
    N_EPOCHS,
    TRACKING_PROJECT_NAME
)
from ._types import TrackingConfig
from ._utils import log


def prepare_tracking(*, run_id: str | None = None) -> None:
    """Prepare to track the training run, by initializing the Weights & Biases SDK.

    Args:
        run_id: If provided, the ID for the training run we are going to resume.

    Returns:
        Nothing. Initializes the global `wandb` handle.
    """
    if run_id:
        wandb.init(project=TRACKING_PROJECT_NAME, id=run_id, resume="must")
        return
    tracking_config = TrackingConfig(
        base_model=BASE_MODEL_NAME,
        n_epochs=N_EPOCHS,
        learning_rate=LEARNING_RATE,
        max_norm=MAX_NORM,
        lora_rank=LORA_RANK,
        lora_alpha=LORA_ALPHA,
        batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        commit_hash=subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    )
    wandb.init(project=TRACKING_PROJECT_NAME, config=tracking_config)
    log(f"Prepared tracking for run: {wandb.run.id}")
