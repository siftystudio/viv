"""Core module orchestrating the full pipeline for domain-adaptive pretraining for a Viv wizard LoRA adapter."""

__all__ = ["dapt"]

import os

from ._checkpoints import load_checkpoint_state
from ._data import prepare_data_loader
from ._config import BASE_MODEL_NAME, PATH_TO_CHECKPOINTS_DIR, VALIDATION_SET_PROPORTION
from ._model import prepare_model
from ._tokenizer import prepare_tokenizer
from ._tracking import prepare_tracking
from ._training import train_model


def dapt(*, checkpoint_id: str | None = None) -> None:
    """Orchestrate the full pipeline for domain-adaptive pretraining for a Viv wizard LoRA adapter.

    Args:
        checkpoint_id: If provided, an ID for a checkpoint from which training will resume.

    Returns:
        Nothing. The trained adapter will be written to disk.
    """
    # If it doesn't exist yet, create the checkpoints directory
    os.makedirs(name=PATH_TO_CHECKPOINTS_DIR, exist_ok=True)
    # If we are resuming a checkpoint, load the training state
    training_state = load_checkpoint_state(checkpoint_id=checkpoint_id) if checkpoint_id else None
    # Prepare for tracking the run. This initializes the Weights & Biases SDK across the project.
    prepare_tracking(run_id=training_state['run'] if training_state else None)
    # Prepare a tokenizer for the configured base model
    tokenizer = prepare_tokenizer(base_model_name=BASE_MODEL_NAME)
    # Prepare interfaces to our training data and (if configured) held-out validation data
    training_data_loader = prepare_data_loader(tokenizer=tokenizer)
    if VALIDATION_SET_PROPORTION is not None:
        validation_data_loader = prepare_data_loader(tokenizer=tokenizer, for_validation_set=True)
    else:
        validation_data_loader = None
    # Prepare a PEFT model (configured base model with configured LoRA modules attached)
    model = prepare_model(checkpoint_id=checkpoint_id)
    # Train the model -- specifically the LoRA adapter parameters. This will cause
    # checkpoints to be saved to disk, including for the final weights.
    train_model(
        model=model,
        training_data_loader=training_data_loader,
        validation_data_loader=validation_data_loader,
        saved_state=training_state
    )
