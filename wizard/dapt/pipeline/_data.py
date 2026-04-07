"""Module for loading our training data and preparing an interface to it."""

__all__ = ["prepare_data_loader"]

import json
import random
import itertools

import torch
from torch.utils.data import Dataset, DataLoader
from transformers import PreTrainedTokenizerBase
from pydantic import TypeAdapter, ValidationError

from ..data import (
    DAPTExample,
    DAPTExampleSegment,
    DAPTExampleSegmentModality,
)
from ._config import (
    BASE_MODEL_CONFIG,
    BATCH_SIZE,
    DATASET_PARTITIONING_SEED,
    IGNORE_INDEX_SENTINEL,
    PATH_TO_EXAMPLES_DIR,
    VALIDATION_SET_PROPORTION
)
from ._utils import log
from ._types import ModelInput


def prepare_data_loader(*, tokenizer: PreTrainedTokenizerBase, for_validation_set=False) -> DataLoader:
    """Return a PyTorch DataLoader that furnishes model inputs prepared from our data examples.

    Note that schema validation is performed on the data examples as they are loaded.

    Args:
        tokenizer: A tokenizer prepared for the configured base model.
        for_validation_set: Whether to prepare a data loader for the held-out validation set,
            as opposed to the training set.

    Returns:
        A PyTorch DataLoader.

    Raises:
        ValueError: A data example fails schema validation, or the resulting dataset is empty.
    """
    log(f"Preparing {'validation' if for_validation_set else 'training'}-data loader...")
    # Collect (and validate) all the examples in our data file
    examples: list[DAPTExample] = []
    adapter = TypeAdapter(type=DAPTExample)
    # If a validation proportion is configured, use it to partition examples
    rng = random.Random(DATASET_PARTITIONING_SEED) if (VALIDATION_SET_PROPORTION is not None) else None
    data_files = sorted(PATH_TO_EXAMPLES_DIR.glob("*.jsonl"))
    lines = itertools.chain.from_iterable(open(data_file, "r") for data_file in data_files)
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        if rng is not None:
            hold_out_example = rng.random() < VALIDATION_SET_PROPORTION
            if hold_out_example != for_validation_set:
                continue
        try:
            example = adapter.validate_python(json.loads(line))
        except ValidationError as e:
            raise ValueError(f"Line {i} of data file failed validation: {e}")
        examples.append(example)
    # Guard against an empty dataset
    if len(examples) == 0:
        raise ValueError(f"{'Validation' if for_validation_set else 'Training'} set is empty. "
                         "Check your data file and partitioning configuration.")
    # Prepare the dataset
    dataset = DomainAdaptivePretrainingDataset(examples=examples, tokenizer=tokenizer)
    # Prepare and return the data loader
    if for_validation_set:
        return DataLoader(dataset=dataset, batch_size=BATCH_SIZE)
    return DataLoader(dataset=dataset, batch_size=BATCH_SIZE, shuffle=True, generator=torch.Generator())


class DomainAdaptivePretrainingDataset(Dataset):
    """An interface to the full dataset used for domain-adaptive pretraining for a Viv wizard LoRA adapter."""

    def __init__(self, examples: list[DAPTExample], tokenizer: PreTrainedTokenizerBase):
        """Initialize a DomainAdaptivePretrainingDataset object.

        Args:
            examples: The examples (parsed JSONL lines) making up the dataset.
            tokenizer: A tokenizer prepared for the configured base model.
        """
        self.examples = examples
        self.tokenizer = tokenizer
        self.max_sequence_length = DomainAdaptivePretrainingDataset.get_max_sequence_length()

    def __len__(self):
        """Return the number of examples in the dataset."""
        return len(self.examples)

    def __getitem__(self, idx) -> ModelInput:
        """Return a prepared model input for the example at the given index in the dataset.

        Args:
            idx: The index for the example for which a prepared model input should be furnished.

        Returns:
            A prepared model input for the example with the given index (in the dataset examples).
        """
        # Collect token IDs and labels for each segment, then concatenate once at the end
        all_segment_token_ids: list[torch.Tensor] = []
        all_segment_token_labels: list[torch.Tensor] = []
        example: DAPTExample = self.examples[idx]
        for i, segment in enumerate(example['segments']):
            # Tokenize the segment text
            segment: DAPTExampleSegment
            tokenizer_output = self.tokenizer(segment['text'], return_tensors="pt", add_special_tokens=False)
            segment_token_ids = tokenizer_output["input_ids"].squeeze(0)
            # If the segment is broken Viv code, we'll attribute as the label for its tokens the ignore-index
            # sentinel, which cues the prediction for this token should not be factored into the cross-entropy
            # loss. We do this because we don't want the model to internalize the statistical mechanics at play
            # in broken Viv code, which will naturally have considerable overlap with those at play in working
            # Viv code, increasing the likelihood during inference of transitions from good Viv code tokens to
            # bad Viv code tokens.
            if DomainAdaptivePretrainingDataset._segment_is_broken_viv_code(example=example, segment_index=i):
                segment_token_labels = torch.full(
                    size=(len(segment_token_ids),),
                    fill_value=IGNORE_INDEX_SENTINEL,
                    dtype=torch.long
                )
            else:
                # Otherwise, we simply label each token with its own ID. Later on, these will be automatically
                # shifted, such that each token is labeled with its successor token's ID.
                segment_token_labels = segment_token_ids.clone()
            # Accumulate the segment tokens and labels
            all_segment_token_ids.append(segment_token_ids)
            all_segment_token_labels.append(segment_token_labels)
        # Concatenate the accumulated tokens and labels
        example_token_ids = torch.cat(all_segment_token_ids)
        example_token_labels = torch.cat(all_segment_token_labels)
        # Pad or truncate the sequence, as needed, and return the final prepared model input
        model_input = DomainAdaptivePretrainingDataset._pad_or_truncate_sequence(
            token_ids=example_token_ids,
            token_labels=example_token_labels,
            padding_token_id=self.tokenizer.pad_token_id,
            max_sequence_length=self.max_sequence_length
        )
        return model_input

    @staticmethod
    def get_max_sequence_length() -> int:
        """Return the maximum sequence length for the configured base model.

        Returns:
            The maximum sequence length.

        Raises:
            AttributeError: The base model has an unexpected config structure.
        """
        try:
            return BASE_MODEL_CONFIG.max_position_embeddings  # LLaMA-style
        except AttributeError:
            return BASE_MODEL_CONFIG.n_positions  # GPT-2 style

    @staticmethod
    def _segment_is_broken_viv_code(*, example: DAPTExample, segment_index: int) -> bool:
        """Return whether the segment of the given example with the given index is broken Viv code.

        A segment is deemed broken Viv code iff:

            1) Its modality is Viv code.
            2) It has a successor segment.
            3) The successor segment's modality is compiler error message.

        Args:
            example: The example containing the segment in question.
            segment_index: The index (in the example segments) for the segment in question.

        Returns:
           Whether the segment in question is broken Viv code.
        """
        segment = example['segments'][segment_index]
        if segment['modality'] != DAPTExampleSegmentModality.VIV_CODE:
            return False
        try:
            next_segment = example['segments'][segment_index+1]
        except IndexError:
            return False
        return next_segment['modality'] == DAPTExampleSegmentModality.COMPILER_ERROR_MESSAGE

    @staticmethod
    def _pad_or_truncate_sequence(
        *,
        token_ids: torch.Tensor,
        token_labels: torch.Tensor,
        padding_token_id: int,
        max_sequence_length: int
    ) -> ModelInput:
        """Return a postprocessed model input with exactly the configured sequence length.

        Args:
            token_ids: A variable-length token sequence before padding/truncation.
            token_labels: A variable-length label sequence before padding/truncation.
            padding_token_id: Token ID for the special padding token.
            max_sequence_length: The maximum sequence length, in terms of number of tokens,
                for a given training example.

        Returns:
            A postprocessed model input with exactly the configured sequence length.
        """
        # If the sequence is too short, pad to the max sequence length
        if len(token_ids) < max_sequence_length:
            n_padding_tokens = max_sequence_length - len(token_ids)
            padding_token_ids = torch.full(
                size=(n_padding_tokens,),
                fill_value=padding_token_id,
                dtype=torch.long
            )
            padding_token_labels = torch.full(
                size=(n_padding_tokens,),
                fill_value=IGNORE_INDEX_SENTINEL,
                dtype=torch.long
            )
            padded_or_truncated_token_ids = torch.cat([token_ids, padding_token_ids])
            padded_or_truncated_token_labels = torch.cat([token_labels, padding_token_labels])
        else:
            # Otherwise, truncate the sequence to the max sequence length
            padded_or_truncated_token_ids = token_ids[:max_sequence_length]
            padded_or_truncated_token_labels = token_labels[:max_sequence_length]
        # Package up and return a model input
        model_input = ModelInput(input_ids=padded_or_truncated_token_ids, labels=padded_or_truncated_token_labels)
        return model_input
