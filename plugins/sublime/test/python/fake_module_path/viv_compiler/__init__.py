"""Fake `viv_compiler` module for bridge-script tests.

Stubs the subset of the real compiler's API that `compiler_bridge.py` consumes
(`__version__`, `compile_from_path`, `VivCompileError`, `VivParseError`). Tests
control behavior via environment variables — see the reader functions at the
top of each attribute.
"""

import os


__version__ = os.environ.get("FAKE_VIV_COMPILER_VERSION", "0.12.0")


class VivCompileError(Exception):
    """Stub matching the real `VivCompileError`'s attribute shape."""

    def __init__(self, msg, file_path=None, line=None, column=None, code=None):
        super().__init__(msg)
        self.msg = msg
        self.file_path = file_path
        self.line = line
        self.column = column
        self.code = code


class VivParseError(VivCompileError):
    """Stub matching the real `VivParseError`'s attribute shape.

    The bridge reads `detail` (the user-visible message) and `code`.
    """

    def __init__(self, detail, file_path=None, line=None, column=None, code=None):
        super().__init__(msg=detail, file_path=file_path, line=line, column=column, code=code)
        self.detail = detail


def compile_from_path(source_file_path):
    """Simulate the real `compile_from_path`. Behavior controlled by `FAKE_VIV_COMPILER_BEHAVIOR`.

    Values:
        `success` (default)  return None (the Sublime bridge ignores the return value).
        `parse_error`        raise `VivParseError`.
        `compile_error`      raise `VivCompileError`.
        `other_error`        raise a plain `RuntimeError` (for the bridge's
                             catch-all handler).
    """
    behavior = os.environ.get("FAKE_VIV_COMPILER_BEHAVIOR", "success")
    if behavior == "success":
        return None
    if behavior == "parse_error":
        raise VivParseError(
            detail=os.environ.get("FAKE_ERROR_MESSAGE", "parse failed"),
            file_path=os.environ.get("FAKE_ERROR_FILE", str(source_file_path)),
            line=_int_or_none(os.environ.get("FAKE_ERROR_LINE")),
            column=_int_or_none(os.environ.get("FAKE_ERROR_COLUMN")),
            code=os.environ.get("FAKE_ERROR_CODE"),
        )
    if behavior == "compile_error":
        raise VivCompileError(
            msg=os.environ.get("FAKE_ERROR_MESSAGE", "compile failed"),
            file_path=os.environ.get("FAKE_ERROR_FILE", str(source_file_path)),
            line=_int_or_none(os.environ.get("FAKE_ERROR_LINE")),
            column=_int_or_none(os.environ.get("FAKE_ERROR_COLUMN")),
            code=os.environ.get("FAKE_ERROR_CODE"),
        )
    if behavior == "other_error":
        raise RuntimeError(os.environ.get("FAKE_ERROR_MESSAGE", "something weird"))
    raise RuntimeError(f"unknown FAKE_VIV_COMPILER_BEHAVIOR: {behavior}")


def _int_or_none(value):
    """Coerce to `int`, returning `None` when the env var is unset or empty."""
    if value is None or value == "":
        return None
    return int(value)
