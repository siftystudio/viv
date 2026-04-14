# Viv Compiler

This package contains the reference **compiler** for the domain-specific language (DSL) at the heart of [Viv](https://viv.sifty.studio), an engine for emergent narrative in games and simulations.

The Viv compiler accepts a **Viv source file** (`.viv`) and produces a **Viv content bundle** in a JSON-serializable format that is compatible with any Viv runtime, enabling character simulation and story sifting according to the constructs defined in the authored Viv code.

Once you've installed this package, you'll have access to two compiler interfaces:

* A **command-line interface** (`vivc`) for invoking the compiler from the command line.

* A **Python API** for invoking the compiler programmatically.

As for runtimes, currently there is a single option: the [Viv JavaScript runtime](https://www.npmjs.com/package/@siftystudio/viv-runtime).

## Docs

Consult the [compiler reference](https://viv.sifty.studio/reference/compiler/) for documentation of the CLI, Python API, troubleshooting strategies, and more.

## Requirements

* Python 3.11+.

## Installation

* Install from PyPI:

  ```sh
  pip install viv-compiler
  ```

* Run a smoke test to confirm your installation looks good:

  ```console
  $ vivc --test
  
  * Compiling sample file...
  
  * Smoke test passed
  
  * Viv compiler installation is operational
  ```

## Running from Source

Here's how to work directly from a repo checkout:

* Clone the Viv monorepo:

  ```sh
  git clone https://github.com/siftystudio/viv
  ```

* Install the compiler package and its dependencies via [Poetry](https://python-poetry.org):

  ```sh
  cd viv/compiler
  poetry install
  ```

* Use Poetry to invoke the CLI:

  ```sh
  poetry run vivc --test
  ```

## Changelog

See the [changelog](https://github.com/siftystudio/viv/blob/main/compiler/CHANGELOG.md) for a history of changes to this package.

## Security and Privacy

The Viv compiler runs entirely on your machine. It collects no telemetry, makes no analytics calls, and sends no data to any third party. If you discover a security vulnerability in the compiler, please report it using the protocol described in the [Viv security policy](https://github.com/siftystudio/viv/blob/main/.github/SECURITY.md).

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out [LICENSE.txt](https://github.com/siftystudio/viv/blob/main/compiler/LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
