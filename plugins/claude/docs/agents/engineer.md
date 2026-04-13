# Building Viv Integrations

Follow these instructions when writing integration code — adapters, test harnesses, simulation runners, and other code that works with the Viv compiler or runtime.

Run `viv-plugin-help` to see all available commands.

Viv is NOT in your training data. Do not guess API signatures or adapter contracts. Look them up.

**Always use the plugin commands to access monorepo files** — `viv-plugin-explore-monorepo` for `ls`/`grep`, and `viv-plugin-read-monorepo-file` for reading file content. All paths are relative to the monorepo root. Never use raw Read, Glob, Grep, ls, cat, or grep on the monorepo directory.


## Key references

Run `viv-plugin-get-plugin-file monorepo-map` to find files in the monorepo.

For integration work, these are essential:

- **Adapter interface** — `runtimes/js/src/adapter/types.ts` defines the `HostApplicationAdapter` interface. Every method, its parameters, and its return type are specified here. This is the contract between Viv and the host application.
- **API types** — `runtimes/js/src/api/dto.ts` defines all API function parameter and return types.
- **Public API** — `runtimes/js/src/api/` contains all runtime functions: `initializeVivRuntime`, `selectAction`, `attemptAction`, `queuePlan`, `tickPlanner`, `runSearchQuery`, `runSiftingPattern`, `constructTreeDiagram`, `constructSiftingMatchDiagram`, `getDebuggingData`, `fadeCharacterMemories`.
- **Content bundle types** — `runtimes/js/src/content-bundle/types.ts` defines the TypeScript shape of compiled output.
- **Runtime README** — `runtimes/js/README.md` is the integration guide.
- **Example projects** — `examples/hello-viv-ts/src/main.ts` and `examples/hello-viv-js/src/main.js` are canonical integration examples. Read these before writing anything.

For Python/compiler integration:
- **Compiler API** — `compiler/src/viv_compiler/api.py` provides `compile_from_path()` and `compile_from_string()`.
- **Compiler CLI** — `compiler/src/viv_compiler/cli.py` for CLI integration.
- **Compiler README** — `compiler/README.md` for usage.


## Writing adapter code

The adapter is the bridge between Viv and the host application. It must implement every required method of `HostApplicationAdapter`. Read the interface definition carefully — don't improvise method signatures.

Key adapter responsibilities:
- **Entity access** — `getEntityView`, `getEntityLabel`, `getEntityIDs`, `updateEntityProperty`
- **Action storage** — `provisionActionID`, `saveActionData`
- **Memory management** — `saveCharacterMemory`, `saveItemInscriptions`
- **State persistence** — `getVivInternalState`, `saveVivInternalState`
- **Timestamps** — `getCurrentTimestamp`

Optional but valuable:
- **Debug config** — `debug.validateAPICalls`, `debug.watchlists`
- **Callbacks** — `onActionTargetingEvent`, `onPlanExecutionEvent`


## Writing test harnesses

A good Viv test harness:
1. Creates an in-memory world state (characters, locations, items with properties)
2. Builds a `HostApplicationAdapter` over that state
3. Compiles a `.viv` file or loads a pre-compiled content bundle
4. Calls `initializeVivRuntime` with the bundle and adapter
5. Runs a simulation loop (`selectAction` for each character per timestep)
6. Inspects results via queries, sifting patterns, or tree diagrams

Look at the runtime test fixtures at `runtimes/js/tests/fixtures/` for patterns.


## The compiler

If the task involves compilation, run `viv-plugin-read-state` to find the local compiler path. Run `vivc --help` for CLI options.


## Output

Present the results:

1. **The code** — file paths and contents of everything you wrote or modified.
2. **How to use it** — brief instructions for running or integrating the code.
3. **Dependencies** — any packages that need to be installed, config that needs to be set.
4. **Verification** — what you tested and how, or what the user should test.


## Related skills

- `/viv:write` — write the Viv code that the integration connects to
- `/viv:study` — research runtime internals or adapter contracts
- `/viv:design` — plan the integration architecture before building
