"""Internal types used throughout the pipeline."""

from __future__ import annotations

from typing import Any, Optional
from typing_extensions import TypedDict

from torch import Tensor


class ModelInputBatch(TypedDict):
    """A batch of model inputs."""
    # The batched token IDs, being a tensor with the shape (batch_size, seq_len)
    input_ids: Tensor
    # The batched token labels, being a tensor with the shape (batch_size, seq_len)
    labels: Tensor


class ModelInput(TypedDict):
    """A training example ready for inclusion in a batch of model inputs."""
    # The token IDs for all tokens in the example, with pad tokens appended as needed
    input_ids: Tensor
    # The token IDs for all tokens in the example, save for tokens we do not want
    # to predict, in which case the ignore-input sentinel will be present.
    labels: Tensor


class TrackingConfig(TypedDict):
    """Metadata that we attach to training runs to drive our dashboard on Weights & Biases."""
    # Name of the base model
    base_model: str
    # The number of training epochs
    n_epochs: int
    # The learning rate used for model training
    learning_rate: float
    # The max gradient norm used for model training
    max_norm: float
    # The rank used for the LoRA adapter being trained
    lora_rank: int
    # The scaling factor for the LoRA adapter being trained
    lora_alpha: int
    # The batch size used for model training
    batch_size: int
    # The number of micro-steps to execute before performing an optimizer update
    gradient_accumulation_steps: int
    # Hash for the git commit associated with the version of the codebase at the time of the training run
    commit_hash: str


class TrainingStepLog(TypedDict, total=False):
    """A log for a given training step, containing values along the metrics we track via Weights & Biases.

    Note that the `val_loss` field will be committed to the log separately from the
    other fields, which is why use `total=False` here.
    """
    # Average cross-entropy loss across all non-masked positions in the training batch processed
    # this step. This field will always be present in each committed step log.
    train_loss: float
    # L2 norm of the gradient vector across all trainable parameters, without clipping. In other words,
    # this tracks how aggressively the model wanted to update on this step. This field will always be
    # present in each committed step log.
    grad_norm: float
    # If validation was performed this step, average cross-entropy loss across all non-masked positions
    # in the validation batch processed this step. This is a sparse metric, naturally.
    val_loss: float


class TrainingStateSnapshot(TypedDict):
    """A training-state snapshot that can be saved to disk along with an adapter checkpoint,
    to enable resumption of training from the checkpoint.
    """
    # A unique ID for this training run, provisioned by Weights & Biases. This ID will
    # persist even if the run is later resumed.
    run: str
    # The epoch under way the time of the snapshot
    epoch: int
    # The step number at hand at the time of the snapshot
    step: int
    # The number of micro-batches that have already been processed in the current epoch
    epoch_micro_batches_completed: int
    # The serialized optimizer state
    optimizer_state_dict: dict[str, Any]
    # The serialized PyTorch RNG state
    pytorch_rng_state: Tensor
    # If applicable, the serialized CUDA RNG state, else `None`
    cuda_rng_state: Optional[Tensor]
    # A base random seed used to seed the generator that controls pseudorandom shuffling of batches
    # between epochs. We need to make shuffling deterministic for each epoch, to allow for skipping
    # batches that were already processed for a partially completed epoch that is being resumed.
    shuffle_seed: int
