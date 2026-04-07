"""Configuration parameters controlling the scheme for producing DAPT aggregated training examples."""

import os
from pathlib import Path
from typing import Final

from ..data import VivWizardCompetency


# The number of characters per estimated token
CHARS_PER_TOKEN: Final = 4

# The default Viv wizard competency to attach to the aggregated DAPT examples
DEFAULT_COMPETENCY: Final[VivWizardCompetency | None] = None

# Absolute path to this directory, used to anchor the paths below
_AGGREGATION_DIR: Final = os.path.dirname(os.path.abspath(__file__))

# Absolute path to the Viv monorepo root, which is used to anchor the paths used in the manifest
PATH_TO_VIV_MONOREPO_ROOT: Final = Path(_AGGREGATION_DIR).joinpath(*[".."] * 3).resolve()

# Relative path to which to write out aggregated data examples (as a single JSONL file)
PATH_TO_OUTPUT_FILE: Final = Path(_AGGREGATION_DIR).parent / "data" / "examples" / "aggregated-examples.jsonl"
