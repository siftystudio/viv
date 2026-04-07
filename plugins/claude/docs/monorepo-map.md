# Viv Monorepo Map

A detailed reference to key files and directories in the Viv monorepo. All paths are relative to the monorepo root (typically `${CLAUDE_PLUGIN_DATA}/viv-monorepo/`).

When you need to find something, search this file for relevant terms. Each entry includes a prose description and keywords to help you find the right file.


## Background and documentation

| What | Where | Description |
|------|-------|-------------|
| Monorepo README | `README.md` | Project overview with a complete revenge-story walkthrough of the Viv language, showing actions, roles, conditions, effects, reactions, plans, selectors, sifting patterns, and knowledge propagation in a single extended example. Keywords: overview, tutorial, example, revenge, walkthrough |
| History of Viv | `docs/background/history-of-viv.md` | Background and motivation for the project. Keywords: history, background, motivation, origins |
| PhD thesis | `docs/.llm/curating_simulated_storyworlds.md` | James Ryan's thesis on emergent narrative introducing story sifting and causal bookkeeping as concepts. Keywords: thesis, emergent narrative, curation, theory, academic, story sifting origins |


## Language reference

The authoritative specification for the Viv language. When you need to understand how any construct works in detail, the relevant chapter here is the definitive source.

| What | Where | Description |
|------|-------|-------------|
| Preamble | `docs/reference/language/00-preamble.md` | Overview of the language reference itself. Keywords: preamble, introduction, conventions |
| Introduction | `docs/reference/language/01-introduction.md` | What Viv is, the authoring workflow, core philosophy. Keywords: introduction, overview, philosophy |
| Lexical elements | `docs/reference/language/02-lexical-elements.md` | Tokens, comments, literals, sigils (`@`, `&`, `$`, `_`, `>`), whitespace rules. Keywords: tokens, comments, literals, sigils, syntax, whitespace, lexer |
| File structure | `docs/reference/language/03-file-structure.md` | How `.viv` files are structured, top-level declarations. Keywords: file, structure, declarations, top-level |
| Includes | `docs/reference/language/04-includes.md` | The `include` directive for splitting code across files. Keywords: include, import, files, modules, splitting |
| Entities and symbols | `docs/reference/language/05-entities-and-symbols.md` | Characters, items, locations, actions as entities; symbols as abstract values. Entity types and the `@`/`&` sigils. Keywords: entities, symbols, characters, items, locations, entity types, sigils |
| Names | `docs/reference/language/06-names.md` | Identifier rules, naming conventions, reserved words. Keywords: names, identifiers, reserved words, naming, conventions |
| Expressions | `docs/reference/language/07-expressions.md` | The expression sublanguage — references, arithmetic, comparisons, logical operators, fail-safe `?`, assignments, custom functions, enums. Keywords: expressions, operators, references, arithmetic, comparisons, assignments, enums, custom functions, fail-safe |
| Statements and control flow | `docs/reference/language/08-statements-and-control-flow.md` | `if`/`elif`/`else`/`end`, `loop`, local variables. Keywords: if, else, loop, control flow, conditionals, iteration, local variables |
| Roles | `docs/reference/language/09-roles.md` | How roles are declared and cast — entity types, participation modes (initiator, partner, recipient, bystander), casting pools, slot specs, group roles, precast, spawn, anywhere. Keywords: roles, initiator, partner, recipient, bystander, casting, pools, slots, group roles, precast, spawn, anywhere |
| Actions | `docs/reference/language/10-actions.md` | The core construct — roles, conditions, effects, reactions, glosses, reports, tags, importance, saliences, associations, embargoes, inheritance, templates. Keywords: actions, conditions, effects, reactions, gloss, tags, importance, salience, associations, embargoes, inheritance, templates, reserved |
| Reactions | `docs/reference/language/11-reactions.md` | Queuing constructs for future execution — targets, bindings, urgency, priority, location, temporal constraints, abandonment, repeat logic. Keywords: reactions, queue, urgency, priority, abandonment, repeat, bindings, future execution |
| Temporal constraints | `docs/reference/language/12-temporal-constraints.md` | Time-frame and time-of-day constraints on reactions and queries — `before`, `after`, `between`, anchors (`from action`, `from hearing`, `from now`, `ago`). Keywords: temporal, time, before, after, between, anchors, hearing, duration, time-of-day |
| Bindings | `docs/reference/language/13-bindings.md` | Pre-binding roles before execution — `with`, `with partial`, `with none`, sugared `<>` syntax. Keywords: bindings, with, partial, precast, precasting, sugared |
| Tropes | `docs/reference/language/14-tropes.md` | Reusable relational patterns tested via `fits trope`. Keywords: tropes, relationships, relational patterns, fits trope, reusable conditions |
| Queries | `docs/reference/language/15-queries.md` | Rich search criteria for finding past actions — filtering by tags, associations, roles, time, location, causal relationships, chronicle vs. character memories. Keywords: queries, search, chronicle, memories, tags, associations, filtering, salience |
| Sifting patterns | `docs/reference/language/16-sifting-patterns.md` | Matching sequences of causally related actions — emergent storyline detection. Group action roles, pattern composition, search domains, `caused`/`preceded`/`triggered` operators. Keywords: sifting, patterns, storylines, story detection, causal chains, group actions, pattern composition, emergent narrative |
| Plans | `docs/reference/language/17-plans.md` | Multi-phase orchestrators — phases, reaction windows (`all`/`any`/`untracked`), `wait`, `advance`, `succeed`, `fail`, loops, conditional branching. Keywords: plans, phases, reaction windows, wait, advance, succeed, fail, orchestration, sequencing, multi-phase |
| Selectors | `docs/reference/language/18-selectors.md` | Action and plan selectors — random, weighted, ordered policies; initiator pass-through; selector chaining. Keywords: selectors, action-selector, plan-selector, random, weighted, ordered, selection policy |
| Compiler output | `docs/reference/language/19-compiler-output.md` | The content bundle format — what the compiler produces, metadata, schema versioning. Keywords: compiler output, content bundle, JSON, schema, metadata, bundle format |
| Runtime model | `docs/reference/language/20-runtime-model.md` | How the runtime executes Viv code — action selection, plan ticking, knowledge propagation, the adapter contract. Keywords: runtime, execution, action selection, plan ticking, adapter, simulation loop, stepping |
| Implementation notes | `docs/reference/language/21-appendix-a-implementation-notes.md` | Technical notes on compiler and runtime internals. Keywords: implementation, internals, technical notes |
| Glossary | `docs/reference/language/22-glossary.md` | Definitions of all Viv terminology. Keywords: glossary, definitions, terminology, terms |


## Compiler

| What | Where | Description |
|------|-------|-------------|
| Compiler README | `compiler/README.md` | How to install and use the compiler CLI and Python API. Keywords: install, CLI, usage, pip, vivc, command line |
| CLI entry point | `compiler/src/viv_compiler/cli.py` | Argument parsing and main function. Keywords: CLI, arguments, main, entry point |
| Python API | `compiler/src/viv_compiler/api.py` | `compile_from_path()` for programmatic compilation. Keywords: API, compile_from_path, programmatic |
| Pipeline orchestrator | `compiler/src/viv_compiler/pipeline/pipeline.py` | Coordinates parsing, visiting, postprocessing, validation, and bundling. Keywords: pipeline, compilation phases, orchestration |
| PEG grammar | `compiler/src/viv_compiler/grammar/viv.peg` | The formal grammar specification — ground truth for what parses. Keywords: grammar, PEG, syntax, parsing, tokens, keywords |
| Config and defaults | `compiler/src/viv_compiler/config/config.py` | Default values for importance, salience, reaction priority; role labels permitted per construct type; mutually incompatible labels. Keywords: config, defaults, role labels, construct types, importance, salience |
| Error classes | `compiler/src/viv_compiler/errors/errors.py` | `VivCompileError` and `VivParseError` with source location and formatting. Keywords: errors, exceptions, VivCompileError, VivParseError, diagnostics |
| Visitor | `compiler/src/viv_compiler/visitor/visitor.py` | AST construction from parse tree, with mixins per construct type. Keywords: visitor, AST, parse tree, traversal |
| Validation | `compiler/src/viv_compiler/validation/` | Semantic checks — role labels, conditions, references, inheritance cycles. Keywords: validation, semantic checks, errors, role labels, undefined references |
| Postprocessing | `compiler/src/viv_compiler/postprocessing/` | Inheritance resolution, role dependency ordering, initiator attribution. Keywords: postprocessing, inheritance, role dependencies, initiator |
| Bundler | `compiler/src/viv_compiler/bundler/bundler.py` | Assembles the final content bundle from postprocessed AST. Keywords: bundler, content bundle, assembly, output |
| Content bundle schema | `compiler/src/viv_compiler/schemas/content-bundle.schema.json` | JSON Schema for validating compiled output. Keywords: schema, JSON Schema, validation, bundle format |
| Construct type definitions | `compiler/src/viv_compiler/external_types/content_types.py` | Python types for all construct discriminators. Keywords: types, constructs, discriminators, enums |
| Expression type definitions | `compiler/src/viv_compiler/external_types/dsl_types.py` | Python types for expressions, reference paths, temporal statements. Keywords: types, expressions, DSL, reference paths |
| Error test cases | `compiler/tests/fixtures/invalid/` | Invalid `.viv` programs and their expected errors — shows what the compiler catches. Keywords: errors, invalid, test cases, validation failures |
| Valid test fixtures | `compiler/tests/fixtures/valid/` | Correct `.viv` programs demonstrating every language feature. Keywords: examples, valid, fixtures, idiomatic, patterns |
| Compiler tests | `compiler/tests/` | Full test suite. Keywords: tests, pytest |


## Runtime (JavaScript/TypeScript)

| What | Where | Description |
|------|-------|-------------|
| Runtime README | `runtimes/js/README.md` | Installation, adapter setup, API reference, integration guide. Keywords: install, npm, adapter, integration, setup |
| Public exports | `runtimes/js/src/index.ts` | All public functions and types exported by the runtime. Keywords: exports, public API, index |
| API functions | `runtimes/js/src/api/` | All runtime API functions — `initializeVivRuntime`, `selectAction`, `attemptAction`, `queuePlan`, `tickPlanner`, `runSearchQuery`, `runSiftingPattern`, `constructTreeDiagram`, `constructSiftingMatchDiagram`, `getDebuggingData`, `fadeCharacterMemories`. Keywords: API, functions, selectAction, queuePlan, sifting, tree diagram |
| API parameter/return types | `runtimes/js/src/api/dto.ts` | TypeScript interfaces for all API function arguments and return values. Keywords: types, DTOs, parameters, return types, interfaces |
| Adapter interface | `runtimes/js/src/adapter/types.ts` | `HostApplicationAdapter` — the contract between Viv and the host application. Every required and optional method. Keywords: adapter, HostApplicationAdapter, contract, interface, bridge, host application |
| Adapter registration | `runtimes/js/src/adapter/registration.ts` | How adapters are registered with the runtime. Keywords: adapter, registration, setup |
| Content bundle types | `runtimes/js/src/content-bundle/types.ts` | TypeScript shape of compiled output — `ContentBundle`, `ActionDefinition`, `PlanDefinition`, etc. Keywords: content bundle, types, ActionDefinition, PlanDefinition, compiled output |
| Action manager | `runtimes/js/src/action-manager/action-manager.ts` | Action selection, targeting, and effect execution. Keywords: action selection, targeting, effects, execution |
| Planner | `runtimes/js/src/planner/planner.ts` | Plan execution engine — phase advancement, reaction windows, waits. Keywords: planner, plan execution, phases, reaction windows, waits |
| Role caster | `runtimes/js/src/role-caster/casting.ts` | Candidate discovery, condition checking, backtracking. Keywords: role casting, candidates, backtracking, conditions |
| Story sifter: queries | `runtimes/js/src/story-sifter/queries.ts` | Query execution against the chronicle or character memories. Keywords: queries, search, chronicle, memories, execution |
| Story sifter: patterns | `runtimes/js/src/story-sifter/sifting-patterns.ts` | Sifting pattern matching — finding emergent storylines. Keywords: sifting, pattern matching, storylines, emergent |
| Knowledge: formation | `runtimes/js/src/knowledge-manager/formation.ts` | How characters form memories of actions they experience or witness. Keywords: knowledge, memory formation, witnessing, experiencing |
| Knowledge: propagation | `runtimes/js/src/knowledge-manager/propagation.ts` | How knowledge spreads between characters automatically. Keywords: knowledge, propagation, spreading, learning, hearing |
| Knowledge: forgetting | `runtimes/js/src/knowledge-manager/forgetting.ts` | How character memory saliences decay over time. Keywords: forgetting, salience decay, memory fade |
| Queue manager | `runtimes/js/src/queue-manager/index.ts` | Manages queued actions and plans awaiting execution. Keywords: queue, pending, scheduled, reactions |
| Expression interpreter | `runtimes/js/src/interpreter/interpreter.ts` | Evaluates Viv expressions at runtime. Keywords: interpreter, expressions, evaluation |
| Debugger | `runtimes/js/src/debugger/debugger.ts` | Watchlists, targeting events, condition test results. Keywords: debugger, watchlists, targeting, debugging, diagnostics |
| Tree diagrams | `runtimes/js/src/analysis/tree-diagrams.ts` | Causal tree visualization — renders DAGs of action relationships. Keywords: tree diagram, causal tree, visualization, DAG, storyline |
| Sifting match diagrams | `runtimes/js/src/analysis/sifting-match-diagrams.ts` | Visualizes sifting pattern matches with role annotations and elision. Keywords: sifting match, diagram, visualization, roles, elision |
| Error classes | `runtimes/js/src/errors/index.ts` | `VivError`, `VivValidationError`, `VivNotInitializedError`, etc. Keywords: errors, exceptions, error classes |
| Runtime schemas | `runtimes/js/src/schemas/` | JSON schemas for API validation. Keywords: schemas, validation, JSON Schema |
| Runtime test fixtures | `runtimes/js/tests/fixtures/` | Reusable test setups with content bundles and adapters. Keywords: fixtures, test setup, adapters, examples |
| Runtime tests | `runtimes/js/tests/` | Full test suite. Keywords: tests, vitest |


## Examples

| What | Where | Description |
|------|-------|-------------|
| Hello Viv (TypeScript) — main | `examples/hello-viv-ts/src/main.ts` | Canonical integration example — creates adapter, runs simulation loop, demonstrates all API functions. Keywords: example, TypeScript, adapter, simulation, hello world |
| Hello Viv (TypeScript) — Viv source | `examples/hello-viv-ts/src/content/source.viv` | Simple `.viv` file used by the example project. Keywords: example, source, viv file |
| Hello Viv (TypeScript) — bundle | `examples/hello-viv-ts/src/content/compiled_content_bundle.json` | Pre-compiled content bundle showing the compiled output format. Keywords: compiled, bundle, JSON, output |
| Hello Viv (JavaScript) — main | `examples/hello-viv-js/src/main.js` | Same example in plain JavaScript. Keywords: example, JavaScript, adapter, simulation |
| Hello Viv (JavaScript) — Viv source | `examples/hello-viv-js/src/content/source.viv` | Simple `.viv` file for the JS example. Keywords: example, source, viv file |


## Syntax and editor plugins

| What | Where | Description |
|------|-------|-------------|
| TextMate grammar | `syntax/viv.tmLanguage.json` | Syntax highlighting grammar used by VS Code and other editors. Keywords: TextMate, grammar, syntax highlighting, scopes |
| Syntax examples | `syntax/examples/` | Example `.viv` files showcasing language features and color themes. Keywords: examples, showcase, syntax, color themes |
| VS Code extension | `plugins/vscode/` | Full VS Code extension — syntax, diagnostics, compile on save, snippets, themes. Keywords: VS Code, extension, editor |
| VS Code entry point | `plugins/vscode/extension.ts` | Extension activation, compiler integration, diagnostics provider. Keywords: VS Code, extension, TypeScript, activation |
| VS Code compiler bridge | `plugins/vscode/compiler_bridge.py` | Python bridge invoking the compiler from VS Code. Keywords: bridge, compiler, VS Code, Python |
| VS Code snippets | `plugins/vscode/snippets/viv.json` | Boilerplate snippets for all construct types — good reference for construct structure. Keywords: snippets, boilerplate, templates, constructs |
| JetBrains plugin | `plugins/jetbrains/` | Full JetBrains plugin — syntax, rename, go-to-def, autocompletion, hover docs, structure view. Keywords: JetBrains, IntelliJ, plugin, IDE |
| JetBrains autocompletion | `plugins/jetbrains/src/main/kotlin/studio/sifty/viv/VivCompletionContributor.kt` | Context-aware autocompletion logic. Keywords: autocompletion, completions, JetBrains |
| JetBrains hover docs | `plugins/jetbrains/src/main/kotlin/studio/sifty/viv/VivDocumentationProvider.kt` | Hover documentation provider. Keywords: hover, documentation, JetBrains |
| JetBrains snippets | `plugins/jetbrains/src/main/resources/liveTemplates/Viv.xml` | Live templates (code snippets). Keywords: snippets, live templates, JetBrains |
| Sublime package | `plugins/sublime/` | Sublime Text package — syntax, snippets, build system, themes. Keywords: Sublime, package, editor |
| Sublime compiler bridge | `plugins/sublime/compiler_bridge.py` | Python bridge invoking the compiler from Sublime. Keywords: bridge, compiler, Sublime, Python |
| Sublime syntax | `plugins/sublime/Viv.sublime-syntax` | Native Sublime syntax definition. Keywords: syntax, Sublime, highlighting |


## Build

| What | Where | Description |
|------|-------|-------------|
| Makefile | `Makefile` | Schema generation, preflight checks, clean targets. Keywords: make, build, schemas, preflight |
