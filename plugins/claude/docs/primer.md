# Viv Primer

Viv is an engine for emergent narrative in games and simulations. At its heart is a domain-specific language that authors use to define the actions characters can take in a simulated storyworld, along with constructs for detecting the storylines that emerge as the simulation proceeds. Viv code is compiled into a content bundle consumed by a runtime plugged into the host application.

Viv is a solo project by James Ryan, based on his PhD thesis *Curating Simulated Storyworlds* (2018), which introduced the concept of story sifting.

Viv is a brand-new project. It is not in your training data. Everything you know about Viv comes from this primer and the reference material it points you to.


## The authoring workflow

1. **Write** Viv code (`.viv` files) using an editor plugin for VS Code, JetBrains IDEs, or Sublime Text.
2. **Compile** with the Viv compiler (`vivc`), which produces a JSON content bundle.
3. **Adapt** by creating a host adapter — a bridge giving the Viv runtime read/write access to the application's simulation state.
4. **Run** by invoking runtime API functions for action selection, plan execution, story sifting, and causal-tree visualization.


## The seven constructs

Viv code is composed of seven construct types:

**Actions** — The atomic unit. An action defines what characters can do: who is involved (roles), what must be true (conditions), what changes (effects), and what happens next (reactions). Actions are instantaneous events recorded in the chronicle.

**Reactions** — Queued in response to actions, for future execution. Reactions are the fundamental mechanism for growing emergent storylines: an action triggers a reaction, which performs another action, which triggers more reactions, and so on. The system automatically tracks causal links through this chain.

**Plans** — Multi-phase orchestrators that queue reactions over time with rich sequencing logic. A plan can span a single timestep or an entire century. Plans have phases, wait instructions, reaction windows (parallel tracks), and conditional branching.

**Selectors** — Tiny programs for choosing one action or plan from a set of candidates. Support random, weighted, and ordered selection policies. Selectors can reference other selectors.

**Tropes** — Reusable bundles of conditions with a name. A trope defines a relational pattern (e.g., `is-unhinged`, `mutual-trust`) that can be tested anywhere via `fits trope`.

**Queries** — Rich search criteria for finding past actions in the chronicle or a character's memories. Queries filter by action name, tags, associations, roles, time, location, importance, salience, and causal relationships.

**Sifting patterns** — The crown jewel. A sifting pattern matches a *sequence* of causally related actions — an emergent storyline. Patterns can reference other patterns, enabling detection of meta-narratives like "revenge for an act of revenge." Patterns can be applied to the chronicle or to a character's memories, enabling characters to *understand* and *act on* the storylines unfolding around them.


## Key concepts

**Host application** — The game, simulation, or other software that Viv plugs into. The host owns all simulation state (characters, locations, items, their properties) and is responsible for persistence. Viv itself manages no data store — the host persists everything, including a small internal state object that Viv uses to track queued constructs between invocations.

**Viv adapter** — A host-application-provided interface giving the runtime read/write access to simulation state. Viv code can reference arbitrary entity properties (e.g., `@person.personality.impulsive`) and call application-defined enums (`#MODERATE`) and custom functions (`~createItem("note")`), all resolved by the host at runtime.

**Chronicle** — The append-only record of all actions that have ever occurred. There is a strict temporal ordering among actions.

**Story sifting** — The task of automatically detecting the storylines that emerge as a simulation proceeds. In Viv, this is done by running sifting patterns against the chronicle or a character's memories.

**Knowledge propagation** — When a character experiences or witnesses an action, they form a memory of it. If the action references past actions, the character learns about those too. This is automatic — the author never specifies knowledge formation rules.

**Causal bookkeeping** — Viv automatically records causal links between actions as they occur. The result is a forest of causal trees (DAGs), each of which is a storyline. This makes story sifting tractable.

**Roles** — Every construct defines roles that are cast with entities (characters, items, locations, past actions, symbols). Roles have types, participation modes (initiator, partner, recipient, bystander), and casting constraints.


## Toolchain

| Component            | Install | Invoke |
|----------------------|---------|--------|
| Compiler             | `pip install viv-compiler` | `vivc --input source.viv` |
| JS runtime           | `npm install @siftystudio/viv-runtime` | `import { selectAction } from "@siftystudio/viv-runtime"` |
| VS Code extension    | Search "Viv" in Extensions | Syntax highlighting, inline diagnostics, compile on save |
| JetBrains plugin     | Search "Viv" in Plugins | Above + rename, go-to-def, autocompletion, hover docs |
| Sublime Text package | Search "Viv" in Package Control | Syntax highlighting, compile via build system |


## What Viv looks like

Here is a real Viv action — a character writes a gossip note about an embarrassing past event:

```viv
// A character processes their repeated mistreatment by another character
action contemplate-mistreatment:
    gloss: "@thinker recalls cases in which @subject has mistreated them"
    roles:
        @thinker:
            as: initiator
        @subject:
            as: character, anywhere  // Not physically present
        @history*:  // 3-5 past actions fitting the bill
            as: action
            n: 3-5
            from:
                search query harm:  // Defined elsewhere: a query for finding harmful actions
                    over: @thinker  // Search over @thinker's memories
                    with:
                        @perpetrator: @subject
                        @victim: @thinker
    effects:
        // Affinity isn't modeled in Viv, but you can read and write arbitrary sim data
        @thinker.affinity[@subject] -= #BIG
    reactions:
        if @thinker.personality.vengeful:  // More arbitrary sim data (from Viv's view)
            queue plan plot-revenge:  // Defined elsewhere: a plan for orchestrating the actions of a revenge scheme
                with:
                    @plotter: @thinker
                    @target: @subject
        end
```

This shows the basic shape: a construct keyword (`action`), a name, then indented fields (`roles`, `conditions`, `effects`, `reactions`). Roles use the `@` sigil. Conditions are boolean expressions. Effects mutate state. Reactions queue follow-up constructs. The `@hearer` is a special reference automatically bound when a character learns about this action after the fact.

Do NOT attempt to write Viv code from this example alone. Always consult the language reference for the full syntax and semantics of any construct.

For simple, idiomatic examples of various Viv features, run `viv-plugin-get-example` to list what's available, then `viv-plugin-get-example <name>` to view one. These are vetted, compilable, and demonstrate correct patterns.


## Common misconceptions

These are mistakes that LLMs consistently make when writing Viv code. Review this section before writing or reviewing any Viv code.

**Do not cargo-cult from examples.** There are often multiple ways to do something in Viv, and the best way usually depends on the host application. Do not blindly copy host functions (`~transferItem`, `~createItem`, etc.) or entity property paths (`@person.inventory`, `@location.characters`, etc.) just because you saw them in a reference file or example. Those examples were written for a specific host application and a different audience — they may be terser, more abstract, or more concrete than what's idiomatic for the user's project. When working in an existing project, use the actual host functions and property paths from that project's adapter and schemas. When writing from whole cloth, choose names that are reasonable and self-documenting, but understand they are placeholders the host developer will adapt.

**Roles are already unique.** Viv guarantees that distinct roles are cast with distinct entities during role casting. You do not need conditions like `@owner != @reader` or `@buyer != @seller` — the engine already enforces this. Exceptions: sifting pattern 'actions' field and symbol roles.

**Colocation is implicit.** Unless a role has the `anywhere` label, Viv requires all cast characters and items to be at the same location as the initiator. You do not need conditions like `@buyer.location == @merchant.location` — the engine already enforces this. You also do not need casting pools like `from: @buyer.location.characters` to restrict candidates to the current location — the engine already does this. Only add location conditions when checking something *other* than colocation (e.g., `@person.location.type == #TAVERN`).

**Entity properties are not methods.** A property access like `@merchant.inventory.has(@artifact)` is not valid — entity properties cannot be called as methods. Instead, use a host function (`~hasItem(@merchant, @artifact)`) or a membership test (`@artifact in @merchant.inventory`). Which is best depends on the host application.

**Casting pools are a huge win.** Instead of casting a role from all eligible entities and then filtering with a condition, use a casting pool to narrow candidates upfront. This is more idiomatic and more efficient:

```viv
// Instead of this:
    @friend:
        as: character
conditions:
    @friend in @person.friends

// Do this:
@friend:
    as: character
    from: @person.friends
```

Similarly, use `is:` to bind a role to a specific entity rather than checking equality in conditions:

```viv
// Instead of this:
    @beach:
        as: location
conditions:
    @burier.location == @beach

// Do this:
@beach:
    as: location
    is: @burier.location
```


**Let the gloss do the lifting.** Not every detail in a brief needs to be captured in action logic. If the brief says "buries treasure on a moonlit beach," the moonlit atmosphere is flavor — put it in the gloss:

```viv
gloss: "@burier buries @treasure on @beach under the moonlight"
```

A condition like `~isMoonlit(@beach)` or `@beach.moonlit` would be absurd — no host application models that. Similarly, `@location.hasBookshelf` is not a property any game developer would maintain. Think about the burden on the host if every incidental detail required its own property. If time of day matters, check `~isNighttime()` or similar. But often the gloss alone is the right place for atmospheric detail. The rule of thumb: if the host application doesn't, or probably wouldn't, model it, let the text carry it.


## Version semantics

The Viv ecosystem has several independent version numbers: the compiler, the runtime, the schema, each editor plugin, and this Claude Code plugin all version independently. Compatible compiler and runtime versions ship from the same monorepo commit and share the same schema version. The plugin's `/viv:sync` skill checks for newer component versions and handles upgrades, downgrades, and reinstalls — you don't need to track releases or manage version compatibility yourself.


## Reference material

A local copy of the Viv monorepo is available. Use `viv-plugin-explore-monorepo` (`ls`, `grep`) to locate files, and `viv-plugin-read-monorepo-file <path>` to read them. All paths are relative to the monorepo root. If the monorepo is not downloaded yet, suggest the user run `/viv:setup`. Use `viv-plugin-get-plugin-file monorepo-map` to load a curated guide to the most important files.

Key starting points within the monorepo:

- **Language reference** — `docs/reference/language/` (23 chapters, one per topic). This is the authoritative source for how any construct works. When you need to understand actions, read chapter 10. Sifting patterns, chapter 16. Plans, chapter 17. Etc.
- **Glossary** — `docs/reference/language/22-glossary.mdx` — alphabetized definitions of all Viv terminology, with links to where each term is introduced.
- **Compiler reference** — `docs/reference/compiler/` — user-facing docs for the compiler toolchain (CLI, Python API, troubleshooting). Complements the language reference above.
- **Monorepo README** — `README.md` — project overview with quickstart, package links, and monorepo layout
- **Introduction: Overview** — `docs/introduction/overview.mdx` — features, design philosophy, and licensing
- **Introduction: Tour** — `docs/introduction/tour.md` — extensive revenge-story walkthrough of the language
- **Quickstart** — `docs/quickstart/quickstart.mdx` — getting started guide for LLM and non-LLM workflows
- **Runtime README** — `runtimes/js/README.md` — integration guide and adapter setup
- **Hello Viv example** — `examples/hello-viv-ts/src/main.ts` — canonical TypeScript integration
- **License** — `LICENSE.txt` — freely available for non-commercial use; commercial use requires a license from Sifty


## What Viv is not

- Not a behavior system for real-time frame-by-frame character animation. Viv produces discrete actions.
- Not a game engine. It plugs into your game engine via an adapter.
- Not an LLM system. There are no LLMs in the loop at runtime. Behavior is fully specified by authored Viv code.
- Not in your training data. You must rely on the reference material above.
