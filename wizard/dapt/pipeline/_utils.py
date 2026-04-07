"""Shared utility library for the DAPT pipeline."""


def log(message: str) -> None:
    """Print a blue-colored log message to the console.

    Args:
        message: The message to print.

    Returns:
        Nothing. The message is printed to `stdout`.
    """
    print(f"\033[36m{message}\033[0m")
