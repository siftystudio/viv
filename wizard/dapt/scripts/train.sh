#!/usr/bin/env bash
set -eo pipefail

# Navigate to the `wizard/` directory, so that the `dapt` package is importable
cd "$(dirname "$0")/../.."

# If we're training locally, activate the virtual environment (not applicable on RunPod)
if [ -f dapt/.venv/bin/activate ]; then
    source dapt/.venv/bin/activate
fi

# Run the DAPT training pipeline, forwarding any CLI flags to the entry point
python -m dapt.pipeline "$@"
