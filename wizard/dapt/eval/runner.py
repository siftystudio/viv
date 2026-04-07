"""Core module orchestrating the evaluation of a DAPT-adapted model."""

__all__ = ["evaluate_adapter"]

import json
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM
from peft import PeftModel

from dapt.pipeline import log
from .tasks import compute_perplexity


def evaluate_adapter(*, checkpoint_path: str) -> None:
    """Evaluate the given adapter by pitting it against its base model without it being attached,
     as a baseline measure, and print out a formatted report.

    Args:
        checkpoint_path: The absolute path to a directory containing the saved adapter checkpoint to evaluate.

    Returns:
        Nothing. Prints the evaluation report to `stdout`.
    """
    # Evaluate the base model first
    log("Loading base model...")
    with open(Path(checkpoint_path) / "adapter_config.json") as adapter_config_file:
        base_model_name = json.load(adapter_config_file)["base_model_name_or_path"]
    base_model = AutoModelForCausalLM.from_pretrained(
        pretrained_model_name_or_path=base_model_name,
        torch_dtype=torch.bfloat16,
        attn_implementation="flash_attention_2" if torch.cuda.is_available() else None
    )
    _evaluate_model(model=base_model, is_adapter=False)
    # Now evaluate the adapter
    log(f"Loading adapter from {checkpoint_path}...")
    adapter = PeftModel.from_pretrained(
        model=base_model,
        model_id=checkpoint_path,
    )
    _evaluate_model(model=adapter, is_adapter=True)


def _evaluate_model(*, model: torch.nn.Module, is_adapter: bool) -> None:
    """Evaluate the given model and log a brief report.

    Args:
        model: The model to evaluate.
        is_adapter: Whether the given model is our adapter, as opposed to its isolated base model (baseline).

    Returns:
        Nothing. Prints the evaluation report to `stdout`.
    """
    model.eval()
    model_label = "adapter" if is_adapter else "base model"
    log(f"\nEvaluating {model_label}...")
    # Run perplexity task
    log(" - Running perplexity task")
    average_loss, perplexity = compute_perplexity(model=model)
    # Print results
    log(f"\n\n=== Evaluation Report: {model_label} ===\n")
    log(" - Perplexity")
    log(f"   -- Average loss: {average_loss:.4f}")
    log(f"   -- Perplexity: {perplexity:.2f}")
