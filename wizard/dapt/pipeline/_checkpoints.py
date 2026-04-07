"""Module for saving and loading checkpoint data."""

__all__ = ["save_checkpoint", "load_checkpoint_model", "load_checkpoint_state"]

import wandb
import torch
from torch.optim import AdamW
from peft import PeftModel
from transformers import PreTrainedModel

from ._config import ADAPTER_NAME, CHECKPOINT_STATE_FILENAME, PATH_TO_CHECKPOINTS_DIR
from ._utils import log
from ._types import TrainingStateSnapshot


def save_checkpoint(
    *,
    epoch: int,
    step: int,
    epoch_micro_batches_completed: int,
    model: PeftModel,
    optimizer: AdamW,
    shuffle_seed: int
) -> None:
    """Save two snapshot files (model weights, training state) to disk.

    Args:
        epoch: The current epoch.
        step: The current step.
        epoch_micro_batches_completed: The number of micro-batches that have already
            been processed in the current epoch.
        model: The PEFT model being trained.
        optimizer: The optimizer being used for training.
        shuffle_seed: The shuffle seed currently in use, which may differ from the configured one.

    Returns:
        Nothing. Saves the snapshot files to disk.
    """
    log("Saving checkpoint...")
    # Derive a unique checkpoint ID
    run_id = wandb.run.id if wandb.run else "untracked"
    checkpoint_id = f"{run_id}-epoch-{epoch}-step-{step}"
    # Save the model weights to a subdirectory (of the checkpoints directory) whose name is the checkpoint ID
    model.save_pretrained(save_directory=_get_checkpoint_dir_path(checkpoint_id=checkpoint_id))
    # Save a snapshot of the training state, which we'll need if later we want to resume from this checkpoint
    training_state_snapshot = TrainingStateSnapshot(
        run=run_id,
        epoch=epoch,
        step=step,
        epoch_micro_batches_completed=epoch_micro_batches_completed,
        optimizer_state_dict=optimizer.state_dict(),
        pytorch_rng_state=torch.random.get_rng_state(),
        cuda_rng_state=torch.cuda.get_rng_state() if torch.cuda.is_available() else None,
        shuffle_seed=shuffle_seed
    )
    torch.save(obj=training_state_snapshot, f=_get_checkpoint_state_file_path(checkpoint_id=checkpoint_id))
    log(f"Saved checkpoint: {checkpoint_id}")


def load_checkpoint_model(*, base_model: PreTrainedModel, checkpoint_id: str) -> PeftModel:
    """Return the PEFT model loaded from disk for the checkpoint with the given ID.

    Args:
        base_model: The base model with which the PEFT model to load is associated.
        checkpoint_id: ID for the checkpoint whose PEFT model is to be furnished.

    Returns:
        The PEFT model loaded from disk.
    """
    log("Loading checkpoint weights...")
    peft_model = PeftModel.from_pretrained(
        model=base_model,
        model_id=_get_checkpoint_dir_path(checkpoint_id=checkpoint_id),
        subfolder=ADAPTER_NAME,
        is_trainable=True  # It loads the adapter in inference mode (frozen parameters) by default
    )
    return peft_model


def load_checkpoint_state(*, checkpoint_id: str) -> TrainingStateSnapshot:
    """Return the training state loaded from disk for the checkpoint with the given ID.

    Args:
        checkpoint_id: ID for the checkpoint whose training state is to be furnished.

    Returns:
        The training state loaded from disk.
    """
    log("Loading checkpoint state...")
    path_to_state_file = _get_checkpoint_state_file_path(checkpoint_id=checkpoint_id)
    training_state: TrainingStateSnapshot = torch.load(f=path_to_state_file, weights_only=False)
    return training_state


def _get_checkpoint_dir_path(*, checkpoint_id: str) -> str:
    """Return the relative path to the checkpoint directory for the checkpoint with the given ID.

    Args:
        checkpoint_id: ID for the checkpoint in question.

    Returns:
        Relative path to the checkpoint directory.
    """
    return f"{PATH_TO_CHECKPOINTS_DIR}/{checkpoint_id}"


def _get_checkpoint_state_file_path(*, checkpoint_id: str) -> str:
    """Return the relative path to the checkpoint state file for the checkpoint with the given ID.

    Args:
        checkpoint_id: ID for the checkpoint in question.

    Returns:
        Relative path to the checkpoint state file.
    """
    return f"{PATH_TO_CHECKPOINTS_DIR}/{checkpoint_id}/{CHECKPOINT_STATE_FILENAME}"
