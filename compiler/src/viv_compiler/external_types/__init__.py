"""Types capturing external schemas shared across the larger Viv project.

This module specifies in Python the types associated with a public, stable schema for Viv
compiled content bundles. The schemas capture the compiler's emitted JSON shapes, which are
mirrored in the corresponding runtime type definitions, assuming both are using the same
schema version number. As such, the types here constitute a reliable contract between the
compiler and any Viv runtime.

Note that a canonical JSON schema is also stored in `viv_compiler/schemas/content-bundle.schema.json`,
and that this is generated at the same time the runtime's API schema is generated, which enforces
agreement between them. The final step in compilation is to structurally validate the compiled
content bundle against this schema. When a content bundle is registered with the Viv runtime,
the runtime structurally validates it using its corresponding JSON schema. Note that this JSON
schema is generated from the TypeScript types contained in the Viv JavaScript runtime.
"""

from .content_types import *
from .dsl_types import *
