"""Fake `viv_compiler` module for bridge-script tests.

Stubs the subset of the real compiler's API that `compiler_bridge.py` consumes
(`__version__`, `compile_from_path`, `VivCompileError`, `VivParseError`). Tests
control behavior via environment variables — see the reader functions at the
top of each attribute.
"""

import json
import os


__version__ = os.environ.get("FAKE_VIV_COMPILER_VERSION", "0.12.0")


class VivCompileError(Exception):
    """Stub matching the real `VivCompileError`'s attribute shape."""

    def __init__(self, msg, file_path=None, line=None, column=None,
                 end_line=None, end_column=None, code=None):
        super().__init__(msg)
        self.msg = msg
        self.file_path = file_path
        self.line = line
        self.column = column
        self.end_line = end_line
        self.end_column = end_column
        self.code = code


class VivParseError(VivCompileError):
    """Stub matching the real `VivParseError`'s attribute shape.

    The bridge reads `detail` (the user-visible message) and `code`.
    """

    def __init__(self, detail, file_path=None, line=None, column=None, code=None):
        super().__init__(msg=detail, file_path=file_path, line=line, column=column, code=code)
        self.detail = detail


def compile_from_path(source_file_path):
    """Stub. Behavior controlled by the `FAKE_VIV_COMPILER_BEHAVIOR` env var.

    Values:
        `success` (default)  return a content-bundle dict.
        `parse_error`        raise `VivParseError`.
        `compile_error`      raise `VivCompileError`.
        `other_error`        raise a plain `RuntimeError` (for the bridge's
                             catch-all handler).
    """
    behavior = os.environ.get("FAKE_VIV_COMPILER_BEHAVIOR", "success")
    if behavior == "success":
        payload = os.environ.get("FAKE_VIV_COMPILER_BUNDLE_JSON")
        if payload is not None:
            return json.loads(payload)
        return {
            "actions": ["greet"],
            "actionSelectors": [],
            "plans": [],
            "planSelectors": [],
            "queries": [],
            "siftingPatterns": [],
            "tropes": [],
        }
    if behavior == "parse_error":
        raise VivParseError(
            detail=os.environ.get("FAKE_ERROR_MESSAGE", "parse failed"),
            file_path=os.environ.get("FAKE_ERROR_FILE", str(source_file_path)),
            line=int(os.environ.get("FAKE_ERROR_LINE", "2")),
            column=int(os.environ.get("FAKE_ERROR_COLUMN", "5")),
            code=os.environ.get("FAKE_ERROR_CODE", "bad token"),
        )
    if behavior == "compile_error":
        raise VivCompileError(
            msg=os.environ.get("FAKE_ERROR_MESSAGE", "compile failed"),
            file_path=os.environ.get("FAKE_ERROR_FILE", str(source_file_path)),
            line=int(os.environ.get("FAKE_ERROR_LINE", "3")),
            column=int(os.environ.get("FAKE_ERROR_COLUMN", "1")),
            end_line=int(os.environ.get("FAKE_ERROR_END_LINE", "3")),
            end_column=int(os.environ.get("FAKE_ERROR_END_COLUMN", "10")),
            code=os.environ.get("FAKE_ERROR_CODE", "offending source"),
        )
    if behavior == "other_error":
        raise RuntimeError(os.environ.get("FAKE_ERROR_MESSAGE", "something weird"))
    raise RuntimeError(f"unknown FAKE_VIV_COMPILER_BEHAVIOR: {behavior}")
