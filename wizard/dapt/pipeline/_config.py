"""Configuration parameters controlling the DAPT training pipeline."""

import os
from typing import Final
from pathlib import Path

import torch
from transformers import AutoConfig


# Name for the tracking project on Weights & Biases
TRACKING_PROJECT_NAME: Final = "viv-wizard-dapt"

# The type of device on which to dispatch training (CUDA when available, else CPU)
DEVICE: Final = "cuda" if torch.cuda.is_available() else "cpu"

# The base model for which we are training a LoRA adapter
BASE_MODEL_NAME: Final = "Qwen/Qwen2.5-Coder-7B"

# The configuration object for the base model, from which we derive various runtime parameters
BASE_MODEL_CONFIG: Final = AutoConfig.from_pretrained(pretrained_model_name_or_path=BASE_MODEL_NAME)

# The number of epochs to carry out for model training
N_EPOCHS: Final = 2

# Learning rate for model training
LEARNING_RATE: Final = 2e-4

# Maximum gradient norm for model training. Gradients will be rescaled to this
# magnitude whenever they exceed it.
MAX_NORM: Final = 1.0

# Name for the adapter
ADAPTER_NAME: Final = "DAPT"

# The rank to use in our LoRA modules
LORA_RANK: Final = 32

# The scaling factor for our LoRA modules. A 2:1 ratio with rank is conventional.
LORA_ALPHA: Final = 64

# Whether to target (all) attention-layer components with our LoRA modules
LORA_TARGET_ATTENTION: Final = True

# Whether to target MLP-layer components with our LoRA modules
LORA_TARGET_MLP: Final = False

# The dropout to apply to the LoRA modules during training, to combat overfitting
LORA_DROPOUT: Final = 0.05

# The batch size for training. Technically, this is the micro-batch size, since it
# specifies how many model inputs to process for each micro-step.
BATCH_SIZE: Final = 1

# The number of micro-steps to execute before performing an optimizer update. The effective
# batch size is thus BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS.
GRADIENT_ACCUMULATION_STEPS: Final = 4

# The number of steps between each checkpoint save. Note that we also save a checkpoint
# following each epoch, regardless of the step counter.
CHECKPOINT_STEP_INTERVAL: Final = 10

# The filename used when saving or loading a training-state snapshot file
CHECKPOINT_STATE_FILENAME: Final = "training_state.pt"

# The number of steps between each instance of logging a step to the console. Note that we
# commit a persistent log to Weights & Biases for every step, regardless of this setting.
TERMINAL_LOG_STEP_INTERVAL: Final = 1

# The approximate proportion of data examples to hold out as a validation set,
# or else `None` if validation is to be skipped entirely.
VALIDATION_SET_PROPORTION: Final[float | None] = 0.1

# Absolute path to this directory, used to anchor the relative paths below
_PIPELINE_DIR: Final = os.path.dirname(os.path.abspath(__file__))

# Path to the directory containing our synthesized and aggregated data examples (JSONL files)
PATH_TO_EXAMPLES_DIR: Final = Path(_PIPELINE_DIR).parent / "data" / "examples"

# Path to the checkpoints directory
PATH_TO_CHECKPOINTS_DIR: Final = Path(_PIPELINE_DIR).parent / "checkpoints"

# Static seed used to control the generator that shuffles batches between epochs. We need to
# make shuffling deterministic for each epoch, to allow for skipping batches that were already
# processed for a partially completed epoch that is being resumed. This is saved in the training
# state, so it can safely be changed between starting and resuming a run.
SHUFFLE_SEED: Final = 1000

# Static seed used to control the RNG that is used to partition our data examples
# into a training set and a held-out validation set.
DATASET_PARTITIONING_SEED: Final = 1000

# The sentinel marking that the prediction for a given token should not be factored into the cross-entropy
# loss. This is the PyTorch default value, but we put it here so that our usages of it are self-documenting.
IGNORE_INDEX_SENTINEL: Final = -100
