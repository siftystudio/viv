#!/bin/bash
# Setup script for running the DAPT pipeline on a RunPod Pod.
#
# Prerequisites:
#   - RunPod Pod using the runpod/pytorch:2.8.0-py3.11-cuda12.8.1-cudnn-devel-ubuntu22.04 template.
#   - A100 80GB GPU.
#   - The repo cloned to the Pod (git clone).
#
# Usage:
#   `bash viv/wizard/dapt/scripts/setup_runpod.sh`
#   `bash viv/wizard/dapt/scripts/run.sh`
#
# Notes:
#   - The RunPod template ships a PyTorch dev build and pre-installed packages (`torchvision`, etc.)
#     that conflict with our dependencies. This script installs stable versions of everything to
#     ensure a clean environment.
#   - For `flash-attn`, we use a prebuilt wheel associated with Python 3.11, PyTorch 2.8, and
#     CUDA 12.8. If the Pod template changes, regenerate the wheel URL via https://flashattn.dev.

set -e

echo "Installing stable PyTorch 2.8.0 and torchvision..."
pip install torch==2.8.0 torchvision --index-url https://download.pytorch.org/whl/cu128

echo "Installing flash-attn from prebuilt wheel..."
pip install https://github.com/mjun0812/flash-attention-prebuild-wheels/releases/download/v0.7.16/flash_attn-2.8.3%2Bcu128torch2.8-cp311-cp311-linux_x86_64.whl

echo "Installing remaining dependencies..."
pip install "transformers>=4.49,<5" accelerate peft wandb pydantic

echo "Setup complete. To run training:"
echo "  export WANDB_MODE=disabled   # Or set WANDB_API_KEY to track the run"
echo "  bash viv/wizard/dapt/scripts/run.sh"
