"""Module entry point for the `python -m viv_compiler` usage pattern."""

from .cli import main


# When the package is executed as a module, we simply invoke the Viv compiler CLI (`vivc`)
if __name__ == "__main__":
    main()
