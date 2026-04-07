"""Module for training the LoRA adapter."""

__all__ = ["train_model"]

import wandb
import torch
from torch.optim import AdamW
from torch.utils.data import DataLoader
from torch.nn.utils import clip_grad_norm_
from transformers.modeling_outputs import CausalLMOutputWithPast
from peft import PeftModel

from ._checkpoints import save_checkpoint
from ._config import (
    CHECKPOINT_STEP_INTERVAL,
    GRADIENT_ACCUMULATION_STEPS,
    LEARNING_RATE,
    MAX_NORM,
    N_EPOCHS,
    SHUFFLE_SEED,
    TERMINAL_LOG_STEP_INTERVAL
)
from ._types import ModelInputBatch, TrainingStateSnapshot, TrainingStepLog
from ._utils import log
from ._validation import validate_model


def train_model(
    *,
    model: PeftModel,
    training_data_loader: DataLoader,
    validation_data_loader: DataLoader | None,
    saved_state: TrainingStateSnapshot | None = None
) -> None:
    """Train the LoRA adapter embedded in the given model, using the training data
    furnished by the given data loader.

    The procedure here deals in *effective* batches of size `BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS`,
    where `BATCH_SIZE` specifies how many examples appear in a micro-batch. A micro-batch is a set of
    examples processed on a given micro-step. In this scheme, we only run an update when an effective
    batch has completed -- this is a full step -- and in the interim we accumulate (in the network)
    running gradients (derived from loss values scaled by `1 / GRADIENT_ACCUMULATION_STEPS`).

    This function also periodically saves an adapter checkpoint, according to the
    configured checkpoint frequency.

    Args:
        model: The prepared PEFT model containing the LoRA adapter that we are training.
        training_data_loader: The prepared data loader serving as an interface to our training data.
        validation_data_loader: The prepared data loader serving as an interface to our held-out
            validation data, if validation is enabled, else `None`.
        saved_state: If applicable, the training state associated with a saved checkpoint
            from which we will resume training.

    Returns:
        Nothing. Mutates `model` in place (specifically the LoRA adapter parameters),
        and periodically saves adapter checkpoints.
    """
    # Set the model to training mode
    model.train()
    # Prepare the optimizer. Note that PEFT has marked that only the adapter parameters
    # should accept gradients during the backward pass.
    log("Preparing optimizer...")
    optimizer = AdamW(params=model.parameters(), lr=LEARNING_RATE)
    # If we're resuming from a checkpoint, restore the state
    epoch, step, epoch_micro_batches_completed = _prepare_for_training(optimizer=optimizer, saved_state=saved_state)
    shuffle_seed = saved_state['shuffle_seed'] if saved_state else SHUFFLE_SEED
    # Train the adapter
    log(f"Commencing training ({N_EPOCHS} epochs)...")
    micro_batches_to_skip = epoch_micro_batches_completed
    for epoch in range(epoch, N_EPOCHS):
        log(f"Starting epoch {epoch}...")
        training_data_loader.generator.manual_seed(shuffle_seed + epoch)  # Seeded shuffle, to support resumption
        accumulated_loss = 0.0
        processed_any_micro_batches = False
        for micro_batch in training_data_loader:
            # If we already handled this micro-batch in an epoch that we are resuming, skip it
            if micro_batches_to_skip:
                micro_batches_to_skip -= 1
                continue
            processed_any_micro_batches = True
            # Target the configured device
            micro_batch: ModelInputBatch = {key: tensor.to(model.device.type) for key, tensor in micro_batch.items()}
            # Run a forward pass to derive the loss (in bf16 for memory efficiency and throughput)
            with torch.autocast(device_type=model.device.type, dtype=torch.bfloat16):
                outputs: CausalLMOutputWithPast = model(
                    input_ids=micro_batch["input_ids"],
                    labels=micro_batch["labels"]
                )
                # Scale the loss, because we're doing gradient accumulation. Note that the batch size
                # does not need to be factored in here, because HuggingFace already returns mean loss
                # across all tokens in the batch.
                loss = outputs.loss / GRADIENT_ACCUMULATION_STEPS
                accumulated_loss += loss.item()
            # Run backprop to compute gradients for all adapter parameters
            loss.backward()
            # If there are more micro-steps to do for this accumulation group, forego any update right now
            epoch_micro_batches_completed += 1
            if epoch_micro_batches_completed % GRADIENT_ACCUMULATION_STEPS != 0:
                continue
            # Otherwise, it's a step boundary, so let's invoke the optimizer
            _complete_optimizer_step(model=model, optimizer=optimizer, step=step, accumulated_loss=accumulated_loss)
            step += 1
            # If it's time for a checkpoint, save the checkpoint and also run validation (if configured)
            if step % CHECKPOINT_STEP_INTERVAL == 0:
                save_checkpoint(
                    epoch=epoch,
                    step=step,
                    epoch_micro_batches_completed=epoch_micro_batches_completed,
                    model=model,
                    optimizer=optimizer,
                    shuffle_seed=shuffle_seed
                )
                if validation_data_loader is not None:
                    validate_model(model=model, validation_data_loader=validation_data_loader, step=step)
            # Prepare for the next accumulation group
            accumulated_loss = 0.0
        # If this epoch ended with a partial accumulation group, let's run those gradients through the optimizer
        if processed_any_micro_batches and epoch_micro_batches_completed % GRADIENT_ACCUMULATION_STEPS != 0:
            # Note that these will have been derived from loss values scaled to `1 / GRADIENT_ACCUMULATION_STEPS`,
            # whereas more precisely they should have been scaled according to the number of micro-steps actually
            # completed for the group, but we won't bother to correct this.
            _complete_optimizer_step(model=model, optimizer=optimizer, step=step, accumulated_loss=accumulated_loss)
            step += 1
        # Always save a checkpoint at the end of an epoch, unless we happened to end it on a checkpoint step
        if step % CHECKPOINT_STEP_INTERVAL != 0:
            save_checkpoint(
                epoch=epoch,
                step=step,
                epoch_micro_batches_completed=epoch_micro_batches_completed,
                model=model,
                optimizer=optimizer,
                shuffle_seed=shuffle_seed
            )
            if validation_data_loader is not None:
                validate_model(model=model, validation_data_loader=validation_data_loader, step=step)
        # Prepare for the next epoch
        epoch_micro_batches_completed = 0


def _prepare_for_training(
    *,
    optimizer: AdamW,
    saved_state: TrainingStateSnapshot | None = None
) -> tuple[int, int, int]:
    """Return the current training state, in the form of the epoch, step, and the
    number of micro-batches that have already been processed this epoch.

    Args:
        optimizer: The optimizer at hand.
        saved_state: If applicable, the training state associated with a saved checkpoint
            from which we will resume training.

    Returns:
        A tuple containing, in order, the epoch, step, and number of micro-batches
        that have already been processed this epoch.
    """
    # If this is a fresh run, return initial state now
    if not saved_state:
        return 0, 0, 0
    # Otherwise, let's restore the state
    log("Restoring saved state...")
    epoch = saved_state["epoch"]
    epoch_micro_batches_completed = saved_state["epoch_micro_batches_completed"]
    step = saved_state["step"]
    optimizer.load_state_dict(saved_state["optimizer_state_dict"])
    torch.random.set_rng_state(saved_state["pytorch_rng_state"])
    if saved_state["cuda_rng_state"] is not None and torch.cuda.is_available():
        torch.cuda.set_rng_state(saved_state["cuda_rng_state"])
    return epoch, step, epoch_micro_batches_completed


def _complete_optimizer_step(model: PeftModel, optimizer: AdamW, step: int, accumulated_loss: float) -> None:
    """Complete an optimizer step for the given model.

    Args:
        model: The prepared PEFT model containing the LoRA adapter that we are training.
        optimizer: The optimizer at hand.
        step: The current step.
        accumulated_loss: The total accumulated loss this step (for logging).

    Returns:
        Nothing. Mutates `model` in place (specifically the LoRA adapter parameters), and emits logs as applicable.
    """
    # Clip the gradients, but save the original L2 norm (for logging below)
    grad_norm = clip_grad_norm_(parameters=model.parameters(), max_norm=MAX_NORM)
    # Use the gradients to update the adapter parameters
    optimizer.step()
    # Clear the gradients from this pass
    optimizer.zero_grad()
    # Log step data in our tracker
    step_log = TrainingStepLog(train_loss=accumulated_loss, grad_norm=grad_norm.item())
    wandb.log(data=step_log, step=step)
    # If applicable, log data to the console as well
    if step % TERMINAL_LOG_STEP_INTERVAL == 0:
        log(f"Finished step {step} (loss = {accumulated_loss:.4f}, grad_norm = {grad_norm.item():.4f})")
