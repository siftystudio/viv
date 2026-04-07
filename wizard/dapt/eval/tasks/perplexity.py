"""Task computing the perplexity (and average loss) for a loaded model."""

__all__ = ["compute_perplexity"]

import math

import torch

from dapt.pipeline import IGNORE_INDEX_SENTINEL, ModelInputBatch, prepare_data_loader, prepare_tokenizer


def compute_perplexity(*, model: torch.nn.Module) -> tuple[float, float]:
    """Return a tuple containing the average loss and the perplexity derived by running
    the given model on the held-out evaluation set.

    Note: Because we don't make training decisions based on validation signal, we simply
    reuse the held-out validation set as an evaluation set here.

    Args:
        model: The model that we are evaluating (either our adapter or its isolated baseline model).

    Returns:
        A tuple containing the average loss and the perplexity.
    """
    # Prepare a data loader for the evaluation set
    tokenizer = prepare_tokenizer(base_model_name=model.config.name_or_path)
    evaluation_data_loader = prepare_data_loader(tokenizer=tokenizer, for_validation_set=True)
    # Compute (and return) the task metrics, as derived from the full evaluation set
    with torch.no_grad():
        total_tokens = 0
        total_loss = 0
        for batch in evaluation_data_loader:
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
        perplexity = math.exp(average_loss)
        return average_loss, perplexity
