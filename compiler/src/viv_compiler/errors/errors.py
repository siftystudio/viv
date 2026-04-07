"""Custom error classes containing detailed information about a compilation issue."""

import textwrap
from pathlib import Path

from arpeggio import NoMatch

from viv_compiler import external_types, utils


class VivCompileError(Exception):
    """Error raised when Viv compilation fails.

    Attributes:
        msg: A brief message explaining the issue.
        file_path: Absolute path to the offending source file, if applicable, else `None`.
        line: Line number at the start of the offending source, if applicable, else `None`.
        column: Column number at the start of the offending source, if applicable, else `None`.
        end_line: Line number at the end of the offending source, if applicable, else `None`.
        end_column: Column number at the end of the offending source, if applicable, else `None`.
        code: The offending source code snippet, if applicable, else `None`.
    """
    msg: str
    file_path: Path | None
    line: int | None
    column: int | None
    end_line: int | None
    end_column: int | None
    code: str | None
    detail: str

    def __init__(self, msg: str, *, source: external_types.SourceAnnotations | None = None):
        """Initialize a VivCompileError object.

        Args:
            msg: A brief message explaining the issue.
            source: If applicable, source annotations identifying the Viv source code that caused the issue.
        """
        self.msg = msg
        # If source annotations are available, populate the location fields
        if source:
            self.file_path = (utils.get_entry_dir() / source["filePath"]).resolve()  # Absolute path needed by plugins
            self.line = source["line"]
            self.column = source["column"]
            self.end_line = source["endLine"]
            self.end_column = source["endColumn"]
            self.code = source["code"]
        else:
            self.file_path = None
            self.line = None
            self.column = None
            self.end_line = None
            self.end_column = None
            self.code = None
        # Build the full detail string
        if self.code:
            normalized = textwrap.dedent(self.code).strip()
            indented = textwrap.indent(normalized, "  ")
            self.detail = (
                f"{self.msg}\n\n"
                f"{self.file_path}:{self.line}:{self.column}\n\n"
                f"{indented}"
            )
        else:
            self.detail = self.msg
        # Use our full string representation in the call to the parent's constructor, which sets `self.msg`
        super().__init__(self.detail)

    def __str__(self) -> str:
        """Return full string representation."""
        return self.detail

    def __repr__(self) -> str:
        """Return compact string representation."""
        if self.file_path:
            return f"{type(self).__name__}({self.file_path.name}:{self.line}:{self.column})"
        return f"{type(self).__name__}({self.msg!r})"


class VivParseError(VivCompileError):
    """Error raised when Arpeggio fails to parse Viv source code.

    Attributes:
        msg: A brief message explaining the issue.
        file_path: Absolute path to the offending source file, if applicable, else `None`.
        original: The original error thrown by Arpeggio.
        line: Line number where the parse error occurred, if applicable, else `None`.
        column: Column number where the parse error occurred, if applicable, else `None`.
        end_line: Always `None`. (Inherited from `VivCompileError`, but not applicable to parse errors).
        end_column: Always `None`. (Inherited from `VivCompileError`, but not applicable to parse errors).
        code: Always `None`. (Inherited from `VivCompileError`, but not applicable to parse errors).
    """
    file_path: Path
    original: Exception

    def __init__(self, *, original: Exception, file_path: Path):
        """Initialize a VivParseError object.

        Args:
            original: The original error thrown by Arpeggio.
            file_path: Path for the file that could not be parsed. This may be an included file.
        """
        msg = f"Source file could not be parsed"
        super().__init__(msg=msg)  # Must come before the lines below
        self.file_path = file_path
        self.original = original
        if isinstance(original, NoMatch):
            self.line = original.line
            self.column = original.col
        else:
            self.line = None
            self.column = None
        formatted = self._format_arpeggio_error(error=original, file_path=file_path)
        self.detail = f"{self.msg}:\n\n{formatted}"

    def __str__(self) -> str:
        """Return full string representation."""
        return self.detail

    def __repr__(self) -> str:
        """Return compact string representation."""
        return f"{type(self).__name__}({self.file_path!r})"

    @staticmethod
    def _format_arpeggio_error(*, error: Exception, file_path: Path) -> str:
        """Returns the given Arpeggio error message in a friendlier format.

        Args:
            error: An Arpeggio parsing error. If it's something else, that's fine.
            file_path: Path for the file that could not be parsed. This may be an included file.

        Returns:
            A formatted error message.
        """
        if not isinstance(error, NoMatch):
            return str(error)
        error.eval_attrs()
        snippet = error.context.strip()
        expected_tokens = error.message.replace('Expected ', '', 1).replace(" or ", ", ").replace("'", '')
        formatted_error = (
            f"- File: {file_path}"
            f"\n- Position: line {error.line}, col {error.col}"
            f"\n- Context (failed at *): ...{snippet.replace('*', '[*]')}..."
            f"\n- Viable next tokens: {expected_tokens}"
        )
        return formatted_error
