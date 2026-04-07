# Viv JavaScript Runtime

This package contains the **JavaScript runtime** for [Viv](https://viv.sifty.studio), an engine for emergent narrative in games and simulations. The runtime is written in TypeScript, but it's published [on the npm registry](https://www.npmjs.com/package/@siftystudio/viv-runtime) for use in both JavaScript and TypeScript applications.

At a high level, the runtime combines an **interpreter** for the [Viv DSL](https://viv.sifty.studio/docs/language-reference/) with an **action manager**, **knowledge manager**, **planner**, and **story sifter**, as well as a **debugger**. It can be plugged into any host application by creating a **Viv adapter** and invoking the **runtime API**, as explained below.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Example Projects](#example-projects)
- [Changelog](https://github.com/siftystudio/viv/blob/main/runtimes/js/CHANGELOG.md)
- [License](#license)

## Installation

The runtime is published on the npm registry as `@siftystudio/viv-runtime`, and you can install it using your package manager of choice:

* **npm**: `npm install @siftystudio/viv-runtime`

* **pnpm**: `pnpm add @siftystudio/viv-runtime`

* **Yarn**: `yarn add @siftystudio/viv-runtime`


Your installation will include all three of the package's published build artifacts:

* **ESM build** (`dist/index.js`): An ECMAScript-module version, for projects using `import ... from "@siftystudio/viv-runtime"`.

* **CJS build** (`dist/index.cjs`): A CommonJS version, for projects that need to use `require("@siftystudio/viv-runtime")`.

* **Type declarations** (`dist/index.d.ts`): TypeScript definitions for all types associated with the runtime API, enabling full typing support for TypeScript projects.

## Usage

To use Viv in your project, you will carry out the following activities:

* **Write** Viv code.

* **Compile** a content bundle.

* Create a **Viv adapter**.

* Invoke the **runtime API**.

### Writing Viv Code

The [**Viv JetBrains plugin**](https://plugins.jetbrains.com/plugin/31012-viv) is the default tool for writing Viv code, offering a massive suite of language-support features. A few lightweight alternatives are also available: the [Viv VS Code extension](https://marketplace.visualstudio.com/items?itemName=siftystudio.viv) and the [Viv Sublime Text package](https://github.com/siftystudio/viv/blob/main/plugins/sublime/README.md).

Consult the [language reference](https://viv.sifty.studio/docs/language-reference/) for detailed information on the DSL.

### Compiling a Content Bundle

Run your Viv code through the [**Viv compiler**](https://pypi.org/project/viv-compiler) to produce a **content bundle** for your project. This compiler target is a JSON structure that your host application can utilize by including it in a Viv adapter, as explained below.

#### Compatibility

To use this version of the JavaScript runtime, you must supply a **compatible** content bundle. When Viv source files are compiled, the resulting content bundle is stamped with the **schema version** associated with the compiler that produced it. (The schema describes the shape of the compiler target, i.e., a content bundle.) During its [initialization](https://viv.sifty.studio/docs/api/runtimes/js/functions/initializeVivRuntime.html), the runtime compares your registered content bundle's schema version against its own supported version, enforcing the following rules:

* **Major versions must match.** A content bundle compiled against a different major schema version is always rejected.

* **Minor versions may be required to match, depending on the runtime version.** While the runtime is itself pre–1.0, minor schema versions will have to match exactly, since no stability guarantees hold yet. Once the runtime is at 1.0+, the content bundle's minor schema version will be prohibited from exceeding the runtime's respective minor version. This is because a bundle compiled with a newer minor version may reference features the runtime does not yet support.

* **Patch versions are always compatible.**

If the content bundle is incompatible, the runtime will throw an error during initialization, with a message explaining the mismatch.

The schema version supported by this version of the runtime can be retrieved via the API, as documented [here](https://viv.sifty.studio/docs/api/runtimes/js/functions/getSchemaVersion.html). To get the schema version associated with your compiler, follow the relevant instructions in the [compiler docs](https://pypi.org/project/viv-compiler). Note that the respective latest versions of the Viv compiler and runtime will always be associated with the same schema version.

### Creating a Viv Adapter

To use the Viv runtime in your project, you must create a **Viv adapter**, which is a component that allows the runtime to interact with your host application. Most pertinently, the adapter allows the runtime to do things like query the state of a storyworld (e.g., to evaluate action preconditions) and make changes to that state (e.g., to execute effects).

See the [`HostApplicationAdapter`](https://viv.sifty.studio/docs/api/runtimes/js/interfaces/HostApplicationAdapter.html) interface for full details, or the [example projects](#example-projects) for working implementations.

### Invoking the Runtime API

Once you have a compiled content bundle and a Viv adapter, pass them to [`initializeVivRuntime`](https://viv.sifty.studio/docs/api/runtimes/js/functions/initializeVivRuntime.html) and then use the **[runtime API](https://viv.sifty.studio/docs/api/runtimes/js/)** to drive your simulation.

See the [example projects](#example-projects) for working demonstrations.

## API

The Viv JavaScript **runtime API** is documented [here](https://viv.sifty.studio/docs/api/runtimes/js/). It exposes a number of functions associated with concerns like action selection, planning, story sifting, and debugging, as well as types and custom error classes.

## Example Projects

Here are the current **example projects** making use of the Viv JavaScript runtime:

* **`hello-viv-ts`** ([link](https://github.com/siftystudio/viv/tree/main/examples/hello-viv-ts)): A minimal project showing how to integrate Viv into a TypeScript application.
* **`hello-viv-js`** ([link](https://github.com/siftystudio/viv/tree/main/examples/hello-viv-js)): A minimal project showing how to integrate Viv into a JavaScript application.

## Changelog

See the [changelog](https://github.com/siftystudio/viv/blob/main/runtimes/js/CHANGELOG.md) for a history of changes to this package.

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Check out [LICENSE.txt](./LICENSE.txt) for the full details.

*© 2025-2026 Sifty LLC. All rights reserved.*

