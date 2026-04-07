"""Module for validating an LoRA adapter checkpoint."""

__all__ = ["validate_model"]

import wandb
import torch
from torch.utils.data import DataLoader
from peft import PeftModel

from ._config import IGNORE_INDEX_SENTINEL
from ._utils import log
from ._types import ModelInputBatch, TrainingStepLog


def validate_model(*, model: PeftModel, validation_data_loader: DataLoader, step: int) -> None:
    """Validate the given model on the held-out validation set.

    Args:
        model: The model to validate.
        validation_data_loader: The prepared data loader serving as an interface to our held-out validation data.
        step: The current training step.

    Returns:
        Nothing. Appends to the log for this step (persisted in our tracker) the average per-token cross-entropy
        loss for the given model across all batches in the validation set.
    """
    log("Validating model...")
    # Toggle on eval mode for the model. We'll toggle training mode back on before returning.
    model.eval()
    # Validate the model against each batch in the held-out validation set, accumulating loss as we go
    with torch.no_grad():
        total_tokens = 0
        total_loss = 0
        for batch in validation_data_loader:
            # Target the configured device
            batch: ModelInputBatch = {key: tensor.to(model.device.type) for key, tensor in batch.items()}
            # Run a forward pass to derive the loss (in bf16 to match training)
            with torch.autocast(device_type=model.device.type, dtype=torch.bfloat16):
                outputs = model(input_ids=batch["input_ids"], labels=batch["labels"])
            loss = outputs.loss.item()
            # Tally up non-masked batch tokens, ignoring each first token, since we do not predict initial tokens
            effective_batch_size = (batch["labels"][:, 1:] != IGNORE_INDEX_SENTINEL).sum().item()
            total_tokens += effective_batch_size
            # Accumulate the batch loss
            total_loss += loss * effective_batch_size
        average_loss = total_loss / total_tokens
    # Log the average loss
    step_log = TrainingStepLog(val_loss=average_loss)
    wandb.log(data=step_log, step=step)
    log(f"Average validation loss: {average_loss:.4f}")
    # Before we return, toggle training mode back on for the model
    model.train()
