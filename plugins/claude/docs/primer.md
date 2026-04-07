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

**Queries** — Rich search criteria for finding past actions in the chronicle or a character's memories. Queries filter by tags, associations, roles, time, location, and causal relationships.

**Sifting patterns** — The crown jewel. A sifting pattern matches a *sequence* of causally related actions — an emergent storyline. Patterns can reference other patterns, enabling detection of meta-narratives like "revenge for an act of revenge." Patterns can be applied to the chronicle or to a character's memories, enabling characters to *understand* and *act on* the storylines unfolding around them.


## Key concepts

**Host application** — The game, simulation, or other software that Viv plugs into. The host owns all simulation state (characters, locations, items, their properties) and is responsible for persistence. Viv is stateless.

**Viv adapter** — A host-application-provided interface giving the runtime read/write access to simulation state. Viv code can reference arbitrary entity properties (e.g., `@person.personality.impulsive`) and call application-defined enums (`#MODERATE`) and custom functions (`~createItem("note")`), all resolved by the host at runtime.

**Chronicle** — The append-only record of all actions that have ever occurred. There is a strict temporal ordering among actions.

**Story sifting** — The task of automatically detecting the storylines that emerge as a simulation proceeds. In Viv, this is done by running sifting patterns against the chronicle or a character's memories.

**Knowledge propagation** — When a character experiences or witnesses an action, they form a memory of it. If the action references past actions, the character learns about those too. This is automatic — the author never specifies knowledge formation rules.

**Causal bookkeeping** — Viv automatically records causal links between actions as they occur. The result is a forest of causal trees (DAGs), each of which is a storyline. This makes story sifting tractable.

**Roles** — Every construct defines roles that are cast with entities (characters, items, locations, past actions, symbols). Roles have types, participation modes (initiator, partner, recipient, bystander), and casting constraints.


## Toolchain

| Component | Install | Invoke |
|-----------|---------|--------|
| Compiler | `pip install viv-compiler` | `vivc --input source.viv` |
| JS runtime | `npm install @siftystudio/viv-runtime` | `import { selectAction } from "@siftystudio/viv-runtime"` |
| VS Code extension | Search "Viv" in Extensions | Syntax highlighting, inline diagnostics, compile on save |
| JetBrains plugin | Search "Viv" in Plugins | Above + rename, go-to-def, autocompletion, hover docs |
| Sublime package | Search "Viv" in Package Control | Syntax highlighting, compile via build system |


## What Viv looks like

Here is a real Viv action — a character writes a gossip note about an embarrassing past event:

```viv
action write-gossip-note:
    gloss: "@writer writes a gossip note about @subject"
    roles:
        @writer:
            as: initiator
        @subject:
            as: action
            from:
                search query gossip-worthy-event:
                    over: @writer
        @note:
            as: item, spawn
            spawn: ~createItem("note")
    conditions:
        @writer.personality.loudmouth
    effects:
        @note inscribe @subject
    reactions:
        if @hearer == @subject.initiator && <@hearer> fits trope is-unhinged:
            queue plan-selector plot-revenge:
                with:
                    @plotter: @hearer
                    @target: @writer
                    @reason: @this
        end
```

This shows the basic shape: a construct keyword (`action`), a name, then indented fields (`roles`, `conditions`, `effects`, `reactions`). Roles use the `@` sigil. Conditions are boolean expressions. Effects mutate state. Reactions queue follow-up constructs. The `@hearer` is a special role automatically cast when a character learns about this action after the fact.

Do NOT attempt to write Viv code from this example alone. Always consult the language reference for the full syntax and semantics of any construct.


## Reference material

A local copy of the Viv monorepo should be available at `${CLAUDE_PLUGIN_DATA}/viv-monorepo/`. If it is not, suggest the user run `/viv:setup` to clone it.

**When you need to find anything in the monorepo, start with the monorepo map** at `${CLAUDE_PLUGIN_ROOT}/docs/monorepo-map.md`. It is a searchable index of every important file, with prose descriptions and keywords. Search it for the topic you need.

Key starting points:

- **Language reference** — `docs/reference/language/` (23 chapters, one per topic). This is the authoritative source for how any construct works. When you need to understand actions, read chapter 10. Sifting patterns, chapter 16. Plans, chapter 17. Etc.
- **Glossary** — `docs/reference/language/22-glossary.md` — alphabetized definitions of all Viv terminology, with links to where each term is introduced.
- **Monorepo README** — `README.md` — a complete revenge-story walkthrough of the language
- **Compiler README** — `compiler/README.md` — CLI usage and installation
- **Runtime README** — `runtimes/js/README.md` — integration guide and adapter setup
- **Hello Viv example** — `examples/hello-viv-ts/src/main.ts` — canonical TypeScript integration


## What Viv is not

- Not a behavior system for real-time frame-by-frame character animation. Viv produces discrete actions.
- Not a game engine. It plugs into your game engine via an adapter.
- Not an LLM system. There are no LLMs in the loop at runtime. Behavior is fully specified by authored Viv code.
- Not in your training data. You must rely on the reference material above.
