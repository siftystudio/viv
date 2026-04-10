# `hello-viv-ts`

This is a minimal example project showing how to use the [Viv JavaScript runtime](https://www.npmjs.com/package/@siftystudio/viv-runtime) in a TypeScript project.

Three characters walk into a bar... and say hello to each other. That's it.

## Quick Start

* Clone this example project (only):

```sh
npx degit siftystudio/viv/examples/hello-viv-ts hello-viv-ts
```

* Install dependencies (including the Viv JavaScript runtime):

```sh
cd hello-viv-ts
npm install
```

* Run the example (note that your exact output will differ due to nondeterminism):

```console
$ npm start

=== Chronicle ===

  [T=0] Alice says hello to Carol
  [T=0] Bob says hello to Carol
  [T=0] Carol says hello to Bob
  [T=10] Alice says hello to Bob
  [T=10] Bob says hello to Carol
  [T=10] Carol says hello to Bob
  [T=20] Alice says hello to Bob
  [T=20] Bob says hello to Carol
  [T=20] Carol says hello to Alice
```

## What It Does

* Defines a single Viv action (`hello`) in a single `.viv` source file (`source.viv`).
* Sets up a minimal Viv adapter connecting the Viv runtime to an in-memory state store.
* Creates a single location with three characters present.
* Simulates a few timesteps.
* Prints out the chronicle (i.e., every action that occurred).

## Requirements

* Node 18 or newer.

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out [LICENSE.txt](./LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*
