"""Module for loading or preparing a PEFT model that is ready for (resumed) training."""

__all__ = ["prepare_model"]

import torch
from transformers import AutoModelForCausalLM
from peft import get_peft_model, LoraConfig, PeftModel

from ._checkpoints import load_checkpoint_model
from ._config import (
    ADAPTER_NAME,
    BASE_MODEL_CONFIG,
    BASE_MODEL_NAME,
    DEVICE,
    LORA_ALPHA,
    LORA_DROPOUT,
    LORA_RANK,
    LORA_TARGET_ATTENTION,
    LORA_TARGET_MLP
)
from ._utils import log


def prepare_model(*, checkpoint_id: str | None = None) -> PeftModel:
    """Return a prepared PEFT model in the form of a base model outfitted with our LoRA adapter to train.

    Args:
        checkpoint_id: If provided, an ID for a checkpoint from which training will resume.

    Returns:
        A prepared PEFT model.
    """
    # Load the base model
    log("Loading base model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        pretrained_model_name_or_path=BASE_MODEL_NAME,
        torch_dtype=torch.bfloat16,
        attn_implementation="flash_attention_2" if torch.cuda.is_available() else None
    )
    # Prepare the base model for training with gradient checkpointing. These must be called on
    # the base model before applying LoRA. Note that gradient checkpointing only activates in
    # training mode, which is set elsewhere, at the appointed time.
    base_model.config.use_cache = False
    base_model.gradient_checkpointing_enable(
        gradient_checkpointing_kwargs={"use_reentrant": False}
    )
    base_model.enable_input_require_grads()
    # If a checkpoint was provided, load it
    if checkpoint_id:
        peft_model = load_checkpoint_model(base_model=base_model, checkpoint_id=checkpoint_id)
    else:
        # Otherwise, prepare and return a PEFT model outfitted with the configured LoRA adapter
        # modules. Note that PEFT handles marking the base model parameters so that they will not
        # receive gradients during the continued pretraining.
        log("Preparing PEFT model...")
        lora_config = LoraConfig(
            r=LORA_RANK,
            lora_alpha=LORA_ALPHA,
            target_modules=_get_lora_target_modules(),
            lora_dropout=LORA_DROPOUT,
        )
        peft_model = get_peft_model(model=base_model, peft_config=lora_config, adapter_name=ADAPTER_NAME)
    # Target the configured device
    peft_model.to(device=DEVICE)
    return peft_model


def _get_lora_target_modules() -> list[str]:
    """Return the LoRA target module names for the configured base model.

    Resolves the semantic config flags (`LORA_TARGET_ATTENTION`, `LORA_TARGET_MLP`)
    to the actual module names for the base model's architecture.

    Returns:
        A list of module names to target with LoRA.

    Raises:
        ValueError: Neither attention nor MLP targeting is enabled.
        ValueError: The base model's architecture is not recognized.
    """
    if not LORA_TARGET_ATTENTION and not LORA_TARGET_MLP:
        raise ValueError("At least one of LORA_TARGET_ATTENTION or LORA_TARGET_MLP must be enabled")
    match BASE_MODEL_CONFIG.model_type:
        case "gpt2":
            attention_modules = ["c_attn"]
            mlp_modules = ["c_fc"]
        case "llama" | "qwen2" | "mistral" | "mixtral" | "gemma" | "gemma2":
            attention_modules = ["q_proj", "k_proj", "v_proj", "o_proj"]
            mlp_modules = ["gate_proj", "up_proj", "down_proj"]
        case _:
            raise ValueError(f"Unrecognized model type: {BASE_MODEL_CONFIG.model_type!r}")
    target_modules: list[str] = []
    if LORA_TARGET_ATTENTION:
        target_modules.extend(attention_modules)
    if LORA_TARGET_MLP:
        target_modules.extend(mlp_modules)
    return target_modules
