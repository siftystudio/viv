"""Module for preparing a tokenizer given the configured base model."""

__all__ = ["prepare_tokenizer"]

from transformers import AutoTokenizer, PreTrainedTokenizerBase

from ._utils import log


def prepare_tokenizer(base_model_name: str) -> PreTrainedTokenizerBase:
    """Returns a tokenizer prepared from the given base model.

    Args:
        base_model_name: The name of the base model whose tokenizer is to be furnished.

    Returns:
        A tokenizer prepared for the given base model.
    """
    log("Preparing tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(pretrained_model_name_or_path=base_model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token  # Automatically syncs tokenizer.pad_token_id
    return tokenizer
