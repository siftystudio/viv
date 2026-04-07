---
title: Introduction to Viv
---

If you're looking to build an experience centered on rich worlds teeming with emergent storylines, then Viv is a system for you. 

Imagine a living troupe of thousands of characters producing millions of actions, all intertwingled in a hyper-Pynchonian gnarl that only a computer could understand—a tangle that a computer now *can* understand, through Viv's facilities for author-driven story sifting. Even your characters will understand what's happening around them.

This document covers everything you need to understand Viv:

* An [overview](#overview) of the project.
* Its [features](#features): actions, reactions, plans, queries, story sifting, knowledge propagation, and more.
* Its [design philosophy](#design-philosophy).
* And, most importantly, an extensive [working example](#example-a-revenge-story) that provides a whirlwind tour of the Viv language by walking through the authoring and simulation of a revenge arc—from a character scribbling a gossip note, to an in-game monument centuries later that imparts the whole story to any NPC who read its inscription.


## Overview

At the heart of Viv is a custom programming language that authors use to define the *actions* that characters can take in a simulated storyworld, *plans* for orchestrating coordinated sequences of actions, and a library of queries and higher-order patterns that enable *story sifting*—the task of automatically detecting the storylines that emerge as a simulation proceeds. This Viv code is compiled into a form expected by the Viv *runtime*, which is itself plugged into a larger project such as a videogame.

Viv is designed, built, and maintained by me, <a href="https://jamesryan.ai" target="_blank">James Ryan</a>, and it's licensed through a little software studio I call <a href="https://sifty.studio" target="_blank">Sifty</a>. As I explain in this [brief history](/docs/background/history-of-viv/), the project has its intellectual and technical basis in my PhD thesis, <a href="https://viv.sifty.studio/docs/background/curating_simulated_storyworlds.pdf" target="_blank"><em>Curating Simulated Storyworlds</em></a> (2018). It is the product of a thousand hours of thinking, a thousand hours of writing, and thousands of hours of engineering.

All Viv code is publicly readable on GitHub, in the <a href="https://github.com/siftystudio/viv" target="_blank">Viv monorepo</a>, but commercial use of any component requires a [license](#license).


## Features

What follows is a tour of some of the core features of the Viv system.

- **Authoring language**
  - Viv centers on a domain-specific language for defining the material driving all the features listed below. The expression sublanguage is Turing-complete, for cases where that's needed, and special scratch fields support arbitrary intermediate computations. But usually Viv code appears in a simple declarative format inspired by YAML.
- **Editor support**
  - Write and compile Viv code directly from your IDE, with syntax highlighting, intelligent code navigation, inline diagnostics, hover documentation, and more. Currently there are plugins for all JetBrains IDEs, VS Code, and Sublime Text.
- **Actions**
  - Characters perform *actions*, both alone and with (potentially many) other characters, and the actions may refer to past actions in various ways. Action selection works by an exhaustive search over possible bindings (with backtracking), exploiting a custom domain-specific optimization that dramatically prunes the search space.
- **Reactions**
  - Actions can trigger *reactions* in response, either immediately or later on, and when this happens the system automatically tracks the causal link. Reactions begetting reactions is the fundamental mechanism for growing emergent storylines in Viv.
- **Tropes**
  - A *trope* is a reusable bundle of conditions with a name. Tropes can themselves reference other tropes.
- **Plans**
  - *Plans* are multi-phase orchestrators that queue reactions over time, pending rich author-specified logic around timing, parallelization, and other dependencies. A plan can span a single timestep or an entire century, and the whole thing can fail or be interrupted by the world changing around it. Concretely, a plan is an instruction tape with a tiny program state, allowing it to be arbitrarily resumed later on. Plans can queue other plans as subplans, and so forth arbitrarily.
- **Selectors**
  - *Action selectors* and *plan selectors* are tiny programs for selecting an action or plan from a set of candidates. An author can specify a simple random selection over candidates, on one hand, or an arbitrarily complex utility-based selection procedure, on the other. Selectors can reference other selectors.
- **Queries**
  - A *query* specifies rich criteria for a search over either the chronicle or a character's memories. The matches for a query can be used as candidates for casting a role in an action or other construct. For instance, an author might write a query for finding an embarrassing action by one's enemy, to be cast as the `@subject` role of a `gossip` action.
- **Sifting patterns**
  - A *sifting pattern* specifies rich criteria for matching a *sequence* of actions—i.e., for finding a certain kind of emergent storyline. Like queries, sifting patterns can be applied both to the chronicle and to a character's memories, and they can be used when casting other constructs. For example, a sifting pattern could detect a complete revenge arc in an elder's memories, enabling an action where they recount the tale as a cautionary exemplum (see the [working example](#example-a-revenge-story) below). In general, sifting patterns enable two kinds of understanding: global understanding of what has transpired in a given world (for surfacing to the player), and subjective understanding *by characters themselves*, so that they are not merely aware of the storylines unfolding around them (which is itself basically unprecedented), but in fact constantly draw on that storied understanding as an impetus for action (causing storylines to beget storylines).
- **Knowledge propagation**
  - When a character experiences or otherwise witnesses an action firsthand, they form a memory of it. Once a character knows about an action, they can perform subsequent actions that refer to the past one, as in a character gossiping about an enemy's faux pas. And when a character experiences or witnesses an action that refers to a past one, they form knowledge of *both* memories. So hearing gossip about a past event allows a character to themselves spread knowledge of that past event, and so forth. Further, when a character learns about an action, even if it occurred a long time ago, a *reaction* may be triggered, and a causal chain will immediately form to connect the original action to the learning action to the ultimate reaction. All of this is handled automatically by Viv, without the author having to ever specify anything about knowledge formation or propagation.
- **Item phenomena**
  - Characters can inscribe knowledge of past actions into items, allowing any character who inspects the item to learn about the actions it recounts. For instance, a character might write in their diary about the salient events of the day, and another character who reads the diary would learn about those actions automatically. These items exist in the storyworld and can be integrated into gameplay in various interesting ways.
- **Causal bookkeeping**
  - According to the various mechanisms outlined above, Viv automatically records causal links between actions as they occur—a concept from my <a href="https://viv.sifty.studio/docs/background/curating_simulated_storyworlds.pdf" target="_blank">PhD thesis</a> called *causal bookkeeping*. The result is a partitioning of the chronicle into a forest of causal trees (DAGs, technically), each of which might be deemed a storyline. By recording causal links as they occur, the task of causal inference is obviated, and story sifting becomes more tractable in terms of both pattern authoring and computational efficiency.


## Design philosophy

These are the design commitments that shape how Viv works and what it's for.

* **Viv produces discrete actions.**
  * When a character performs a Viv action, it is immediately recorded in the *chronicle*, which is a record of all actions that have ever occurred. Actions have no duration, and there is a strict temporal ordering among the actions in the chronicle.

* **Viv is best at background simulation.**
  * Viv is not a system for driving real-time character behaviors frame by frame. It's meant to be invoked periodically, and there's no first-class support for animating or otherwise rendering Viv actions except through text and structured data. It's invoked to answer questions like *What happens next?* and *What has happened so far?*, rather than *What is happening right now?* In this sense, Viv is quite unlike a behavior system, which is tasked with producing real-time character activity in a 2D or 3D world. You could use Viv to drive a behavior system, but it's really intended to produce a large variety of narratively rich character activity, which would be difficult to express in the face of animation bottlenecks.

* **Viv is domain-agnostic.**
  * Viv assumes that a world has characters, locations, items, and an unexotic modeling of time, but beyond that it makes no commitments to setting, theme, or any other such concerns. You define your schemas for concerns such as character representation, and then give Viv a means to read and write in those confines.

* **Viv is application-agnostic.**
  * Authors can write code referencing things like arbitrary entity properties. For instance, in a Viv expression like `@person.personality.impulsive`, Viv represents `@person` as a first-class language construct, but trusts that `.personality.impulsive` is a valid property path in the host application.

* **Viv is plug-and-play.**
  * Developers integrate Viv into their *host application* by creating an *adapter*, which is an interface that gives the Viv runtime read–write access to the application's simulation state. This makes a condition like `@person.mood < #HORRIBLE` evaluable, and an effect like `@person.mood += 10` executable.

* **Viv is stateless.**
  * The host application is responsible for managing and persisting its own simulation state. Data persistence, and its specific means—in-memory store, database, files on disk, something else—are entirely up to you. Viv only requires that you honor the contract specified by the documented adapter specifications.

* **Viv is a symbolic AI system.**
  * While you may want to use an LLM to increase your authorial leverage when writing Viv code—and indeed the Viv project has official support for LLM-augmented authoring—you certainly do not have to do this, and ultimately the actual system components are all fully symbolic. There are no LLMs in the loop at runtime. And as a result, Viv is a highly controllable authoring technology: runtime behavior is fully specified by the authored Viv code, which when altered reliably produces the refined behavior.

* **Viv can integrate with player interactions.**

  * While Viv doesn't model the player character as a distinct kind of character, there are a few patterns that can be used to tie Viv actions into, e.g., a <a href="https://emshort.blog/2019/11/29/storylets-you-want-them/" target="_blank">storylet</a> system:

    * When an action casts the player character (because an NPC is performing an action that involves them), call a custom function to trigger a storylet UI that solicits the player's response to the action. The action can then specify reactions in turn, based on the player decision, thereby incorporating the latter into the causal bookkeeping. Here's a simple example:

      ```viv
      if @target.player:
          $&reaction = ~storylet("npc-insults-player")
          if $&reaction == #RETORT:
              queue action deliver-worse-insult:
                  urgent: true
                  with:
                      @insulter: @insulter
                      @target: @target
          end
      end
      ```

    * Interpret general player activity as Viv actions, and then register those player actions with Viv via the `attemptAction()` function, with the `suppressConditions` flag activated. Now the player action is in the chronicle, and moreover its performance may trigger NPC reactions, as applicable. The player is directly playing a part in the emergent storylines that can later be retrieved through story sifting, where such storylines can easily be detected (player character initiated one or more actions), and thus privileged in various ways.

* **Viv thrives most in certain kinds of projects.**

  * Viv works best for worlds with lots of procedurally generated characters living out their lives over long stretches of time—years, decades, centuries. To get the most of the system, you might calibrate for hundreds of story years, thousands of characters, thousands of action types, millions of actions in the chronicle, and an overabundance of emergent stories (that are nonetheless detectable through Viv's facilities for story sifting).
  * That said, Viv could certainly be used in something more restrained or focused, such as a <a href="https://versu.com/" target="_blank">Versu</a>-like experience with a small (and finite) set of fully authored characters. This would be enabled by using casting pools that specify character IDs directly, e.g.: `@darcy: is: #DARCY` or `@eligible-bachelor: from: [#DARCY, #BINGLEY, #WICKHAM, #COLLINS]`.

## License

Viv is freely available for non-commercial use, while commercial use requires a license from <a href="https://sifty.studio" target="_blank">Sifty</a>. Read the <a href="https://github.com/siftystudio/viv/blob/main/LICENSE.txt" target="_blank">license</a> for the full details, or visit <a href="https://sifty.studio/licensing" target="_blank">sifty.studio/licensing</a>.

## Example: A revenge story

Now let's peek in on an author, Alice, who is writing Viv code that allows *revenge arcs* to emerge in her game.

### Simulating a storyworld

Alice is well underway in her effort, and currently she is using the Viv JavaScript runtime to test whether the storylines that emerge are to her liking.

First, she simulates a few decades of story time in a storyworld that persists inside of her host application, making use of Viv's facilities for *action selection*:

```javascript
import { selectAction } from "@siftystudio/viv-runtime";

while (sim.year < config.worldgen.stopYear) {
    advanceTimestep();
    shuffle(sim.characters);
    for (const character of sim.characters) {
        await selectAction({ initiatorID: character });
    }
}
```

Now she's got a world in which Viv has produced around 100,000 character actions—in Viv parlance, this collection is called the *chronicle*.

### Running a sifting pattern

Since Alice is working on revenge arcs right now, she wants to determine whether any emerged in the decades of story time that she simulated. To carry out this investigation, she employs Viv's *story sifting* faculties to run a *sifting pattern* that she has authored. This pattern searches the chronicle to match sequences of actions that compose revenge arcs, according to how she defines them:

```javascript
import { runSiftingPattern, constructSiftingMatchDiagram } from "@siftystudio/viv-runtime";

const siftingMatch = await runSiftingPattern({ patternName: "revenge" });
if (siftingMatch) {
    const diagram = await constructSiftingMatchDiagram({ siftingMatch });
    console.log(diagram);
}
```

### Diagramming an emergent storyline

She's found a match! One way to examine it, as an author, is to invoke the Viv runtime's functionality for constructing a *causal tree diagram* for the sifting match.

Alice did this in the code snippet above, which logged the following diagram for a sifted revenge story:

```
⋮ (19)
└─ trip-on-stage [a1] (setup)
  ⋮ (3)
  └─ write-gossip-note [a2] (offense)
     └─ read-note [a3] (setup)
        └─ spread-rumor [a4] (setup)
           ⋮ (31)
           └─ mock-in-public [a5] (setup)
              ⋮ (3)
              └─ learn-source-of-information [a6] (setup)
                 └─ vow-revenge [a7] (vow)
                    └─ commence-revenge-scheme [a8] (scheme)
                       ├─ study-architecture [a9] (scheme)
                       ├─ begin-apprenticeship-with-builder [a10] (scheme)
                       │  ⋮ (847)
                       ├─ survey-victim-estate [a11] (scheme)
                       ├─ befriend-victim-family [a12] (scheme)
                       │  ⋮ (119)
                       ├─ offer-to-remodel [a13] (scheme)
                       └─ arson [a14] (payback)
                          ⋮ (1204)
```

There's a lot happening here.

First off, this is a tree diagram that moves from top left to bottom right, where each node is a historical action (in Alice's simulated storyworld) and each edge (`└─`) marks a *causal link*. For example, the action `a2`, which is an instance of the `write-gossip-note` action, is marked as having caused `a3`, itself a `read-note` instance. In other words, a character wrote a gossip note, later another character read the note, and the system has automatically recorded a causal relation between the two actions.

In the diagram, *elision indicators* of the form `⋮ (N)` mark actions that, while being part of the causal ancestry, were not specifically matched by Alice's `revenge` sifting pattern. So the `⋮ (31)` between `spread-rumor [a4]` and `mock-in-public [a5]` marks 31 elided actions, in this case other actions that have `spread-rumor [a4]` as a causal ancestor (either direct or indirect). Meanwhile, `begin-apprenticeship-with-builder [a10]` caused 847 actions, none of which are fundamental components of the revenge arc described here.

Finally, in parentheses we see what *role* each action plays in the `revenge` sifting pattern (whose definition we will read momentarily). For instance, `write-gossip-note [a2]` was the `offense` for which vengeance was sought, `befriend-victim-family [a12]` is part of the `scheme`, and the `payback` was `arson [a14]`.

### Storyline interlocking

So let's back out and take stock of the emergent storyline here: a character who was mocked for an embarrassing snafu carried out an elaborate scheme to enact revenge on somebody who gossiped about the snafu, with the means being arson (cf. <a href="https://viv.sifty.studio/docs/background/curating_simulated_storyworlds.pdf" target="_blank">1</a>, <a href="https://www.researchgate.net/profile/Max-Kreminski/publication/366756768_Authoring_for_Story_Sifters/links/63bdd26103aad5368e7dc9dd/Authoring-for-Story-Sifters.pdf" target="_blank">2</a>).

Later on, a whopping 1,204 actions occurred as a result of the arson, but none of them were deemed pertinent to the revenge arc itself, according to Alice's `revenge` sifting pattern.

Now it may be the case that another sifting pattern, such as a `rags-to-riches`, would match a subset of `arson`'s 1,204 causal descendants. In this case, the entire `revenge` *storyline* here could be conceived as having caused the `rags-to-riches` storyline, and such relations between sifting matches can be matched via higher-order sifting patterns that specify child sifting patterns—and correspondences between their respective matches. Below, Alice will write [a pattern](#storylines-of-storylines) called `eye-for-an-eye` that matches when a `revenge` storyline causes another `revenge` storyline, but with the aggressor of the first being the target of the latter, and `payback` of the first being the `offense` of the second.

In general, the aesthetics of Viv is a hyper-Pynchonian gnarl of storylines begetting (and embedding) other storylines—but in ways that can be controlled by authors and recognized by Viv itself, as the simulation is proceeding. In my PhD thesis, I referred to this phenomenon as *storyline interlocking*, and in Viv it is a first-class notion that works according to one's authored constructs.

### Writing actions, queries, and tropes

So how did Alice do it? Let's take a look at some of her Viv code:

```viv
// Spawn a note item inscribing knowledge about an embarrassing past action
action write-gossip-note:
    gloss: "@writer writes a gossip note about @subject"
    roles:
        @writer:
            as: initiator
        @subject:
            as: action
            from:
                search query gossip-worthy-event:
                    over: @writer  // Search over @writer's memories
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

Here we have Alice's definition for `write-gossip-note`, an instance of which served as the `offense` component (`a2`) of the `revenge` sifting match above.

This action casts three *roles*: `@writer` (a character), `@subject` (a past action), and `@note` (an item). These are the variables that must be bound in order for the action to be performed. In Viv, this binding process is framed using the verbiage of casting roles in a dramatic production—a metaphor borrowed from <a href="https://ojs.aaai.org/index.php/AIIDE/article/download/12454/12313" target="_blank"><em>Comme il Faut</em></a>, one of Viv's [antecedents](/docs/background/history-of-viv/).

The `conditions` field specifies that `@writer`, the *initiator* of the action, must have the `loudmouth` personality trait. But that's not a Viv concern—the `.personality.loudmouth` path is an arbitrary one (from Viv's standpoint) that Alice's host application will resolve, on request, as the Viv runtime evaluates this condition.

If the condition holds for a character considering this action, the next concern is casting the `@subject` role, whose candidate pool is a set of actions matching the `gossip-worthy-event` *query*:

```viv
// Matches past actions that merit gossip
query gossip-worthy-event:
    tags:
        all: embarrassing
    salience:
        >=: #MODERATE
```

This query matches actions tagged `embarrassing` (another arbitrary author-defined value) and exceeding a salience threshold (specified by the author-defined *enum* `#MODERATE`). Critically, the bit `over: @writer` specifies that the query is to be run only against actions that `@writer` knows about.

Meanwhile, the `@note` role specifies that an *item* is to be spawned, upon performance of the action, to be cast in this role. The item will be created via an author-defined function called `createItem()`. Further, the `effects` field of the action uses the special `inscribe` operator to write into the `@note` item knowledge of the `@subject` action. Elsewhere, as we'll see below, Alice can use the `inspect` operator to cause a character to read the `@note`, thereby gaining knowledge of the `@subject` action. In general, one hallmark of Viv is its rich affordances for dealing in character knowledge, specifically of past actions, which enables a whole suite of storylines. For instance, a character could discover this very `@note` a century after it was written, thereby learning about `@subject` at that time, which could itself cause the character to *react*, with the causal link between `@subject` and this subsequent action (a century later) being automatically tracked by the system.

Next, let's focus on the all-important `reactions` field, which in this case works as a fulcrum for any storyline matching Alice's `revenge` sifting pattern. Here we have an important conditional clause, whose condition is as follows: `@hearer == @subject.initiator && <@hearer> fits trope is-unhinged`. In Viv, `@hearer` is a special role that is automatically cast when a character learns about the action at hand after the fact. In English, this condition could be restated like this: the character who performed the original embarrassing action is learning about this gossip action after the fact, and this character fits the `is-unhinged` trope. Let's take a look at the definition for that trope:

```viv
// Fits character who is volatile, either currently or always
trope is-unhinged:
    roles:
        @person:
            as: character
    conditions:
        @person.personality.volatile || @person.mood.spiraling
```

In Viv, a *trope* is a reusable bundle of conditions. While this one is simple, tropes can be quite complex, potentially referencing other tropes and so on.

### Writing selectors, plans, and sifting patterns

If this situation does obtain—a volatile character embarrasses themself, someone writes a gossip note about it, and the volatile character learns of this later on—Viv will queue up the `plot-revenge` plan selector:

```viv
// Queue a plan orchestrating a particular method of revenge
plan-selector plot-revenge:
    roles:
        @plotter:
            as: character
        @target:
            as: character
        @reason:
            as: action
    target with weights:
        (35) long-con-ingratiation:
            with partial:
                @schemer: @plotter
                @target: @target
        (5) selector plan-direct-assault:
            with partial:
                @plotter: @plotter
                @target: @target
        (15) social-destruction:
            with partial:
                @plotter: @plotter
                @target: @target
```

A *plan selector* is a tiny program for selecting a Viv plan to launch. While various policies are supported, the *weighted random* policy that we see here has allowed Alice to attach relative weights to three candidates, one of which is itself a plan selector that will have its own policy and its own candidates. (Viv also has *action selectors*.)

Now let's look at a plan, and in particular `long-con-ingratiation`, which orchestrated the revenge scheme seen in Alice's emergent storyline above:

```viv
// A slow-burn revenge scheme: the perpetrator embeds themself in the target's world,
// patiently earning their trust, before striking via a randomly selected method.
plan long-con-ingratiation:
    roles:
        @schemer:
            as: character
        @target:
            as: character
    phases:
        >preparation:
            queue action study-architecture:
                with partial:
                    @student: @schemer
            queue action begin-apprenticeship-with-builder:
                with partial:
                    @apprentice: @schemer
            queue action survey-victim-estate:
                with partial:
                    @surveyor: @schemer
        >ingratiation:
            queue action survey-victim-estate:
                with partial:
                    @surveyor: @schemer
            queue action befriend-victim-family:
                with partial:
                    @infiltrator: @schemer
            wait:
                timeout: 7 years
        >execution:
            queue action offer-to-remodel:
                with:
                    @contractor: @schemer
                    @client: @target
            wait:
                timeout: 4 months
            queue action arson:
                with:
                    @arsonist: @schemer
                location:
                    exactly: @target.home
```

Viv's *plan* construct is a powerful mechanism for orchestrating reactions with shared bindings. This plan has two roles, `@schemer` and `@target`, and it plays out over three *phases*: `>preparation`, `>ingratiation`, and `>execution`. Notably, Alice has specified a very slow burn here—notice how seven *years* must pass between the `>ingratiation` and `>execution` phases. Using the full plan notation, of which only a subset is employed here, an author can specify rich logics around timing, parallel tracks, and so forth. For instance, a plan phase could queue three subplans, advancing execution only once the subplans each succeed. Generally, plan execution proceeds to the next phase pending occurrence of the constructs queued in the present phase, succeeds when the last phase completes, and fails when a queued construct required to occur does not occur. But again, there's a bevy of rich mechanism afforded by the full plan notation.

Finally, Viv's crown jewel: *sifting patterns*. A sifting pattern is a query that matches a collection of actions—or, in other words, an emergent storyline. Here's Alice's definition for the `revenge` sifting pattern that we saw her running up above:

```viv
// A revenge story!
pattern revenge:
    roles:
        @avenger:
            as: character
        @victim:
            as: character
    actions:
        @setup*:
            from:
                search:
                    over: inherit
            n: 1-50
        @offense:
            from:
                search query cruelty:
                    over: inherit
                    with:
                        @perpetrator: @victim
                        @target: @avenger
        @vow:
            from:
                search query revenge-vow:
                    over: inherit
                    with:
                        @avenger: @avenger
                        @target: @victim
        @scheme*:
            from: search:
                over: inherit
            n: 1-50
        @payback:
            from:
                search query cruelty:
                    over: inherit
                    with:
                        @perpetrator: @avenger
                        @target: @victim
    conditions:
        loop @setup* as _@s:
            _@s caused @vow
        end
        @offense caused @vow
        loop @scheme* as _@s:
            @vow caused _@s
            _@s preceded @payback
        end
        @vow caused @payback
```

This pattern has two standard roles (`@avenger` and `@victim`) and also five `actions` roles, each of which casts past actions. The `@setup*` and `@scheme*` roles are group roles (indicated by `*`), meaning they can each match multiple actions (between `1` and `50` in each case). The other action roles (`@offense`, `@vow`, `@payback`) each match exactly one action. If the roles and actions can all be successfully cast, the sifting pattern will produce a *match*, that being the bindings for the `actions` roles.

Let's focus on the `@offense` and `@payback` actions, each of which are cast by running the same query, `cruelty`, but in one case `@victim` is cruel toward `@avenger` and in the other case it's reversed. As such, this pattern operationalizes a theory of revenge as a kind of symmetrical cruelty. Finally, a glance over the `conditions` block reveals the causal glue that holds the pattern together: every `@setup` action must have caused the `@vow`, the `@offense` must have also caused the `@vow`, every `@scheme` action must have been caused by the `@vow` and must have preceded the `@payback`, and the `@vow` must have caused the `@payback`. These are the constraints that, taken together, define what Alice means by a 'revenge story'—and what the system "understands" when it runs the `revenge` pattern to detect a concrete match like the one seen in the causal tree diagram above.

### Storylines of storylines

Now here's where it gets wild. Sifting patterns can reference other sifting patterns, which allows Alice to write a (quite elegant) higher-order pattern called `eye-for-an-eye`:

```viv
// Revenge for an act of revenge
pattern eye-for-an-eye:
    roles:
        @first-avenger:
            as: character
        @second-avenger:
            as: character
        @crux:
            as: action
            from: search: over: inherit  // Consider any action in the search domain
    actions:
        @first-revenge-story*:
            n: 1-999
            from:
                sift pattern revenge:
                    over: inherit
                    with partial:
                        @avenger: @first-avenger
                        @payback: @crux
        @second-revenge-story*:
            n: 1-999
            from:
                sift pattern revenge:
                    over: inherit
                    with partial:
                        @avenger: @second-avenger
                        @victim: @first-avenger
                        @offense: @crux
```

This pattern matches when two `revenge` matches are themselves intertwined in a particular way: the `@avenger` of the first is the `@victim` of the second, and the `@payback` of the first is the `@offense` of the second. That is, `@second-avenger` earned retribution for the very act of revenge at the heart of the first `revenge` match.

### Sifting a character's memories

And here's the cherry on top: a sifting pattern can be applied to a character's memories—with the sifting happening *within the simulation*—allowing an author to gate actions based on the kinds of emergent storylines that a character *knows about*:

```viv
// A grandparent tells a parable to their grandchild
//
// Note that the grandchild will form memories about all the eye-for-an-eye actions, which they can
// then propagate in further actions -- for instance, via item inscription.
action tell-revenge-parable:
    gloss: "@grandparent teaches @grandchild about the futility of revenge"
    roles:
        @grandparent:
            as: initiator
        @grandchild:
            as: recipient
            from: @grandparent.grandchildren
        @parable*:
            as: action
            from:
                sift pattern eye-for-an-eye:
                    over: @grandparent
            n: 3-999
    reactions:
        queue action carve-monument:
            with partial:
                @carver: @grandchild
                @story*: @parable*
            time:
                after: 20 years from action  // When they grow up
```

When a character participates in, witnesses, or otherwise learns about an action that itself casts one or more past actions, the character will learn about all those past actions. Viv handles this automatically, and it tracks all the causal links too (here: `@parable*` actions → `tell-revenge-parable`  → `carve-monument`).

In this case, the grandchild downloads the full `eye-for-an-eye` story, which is itself a collection of two interrelated `revenge` arcs. Because the associated sifting patterns can now be matched against the grandchild's memories, all three stories become discrete tokens that are at the grandchild's disposal—or at Alice's disposal, rather, and with almost no notational overhead.

When fed back into the simulation itself, what is otherwise a purely descriptive mechanism becomes a generative one too.

### Inscribing stories into items

Consider how the `@story*: @parable*` bit in the reaction above causes the entire `eye-for-an-eye` sequence to be inscribed into a storyworld item, should the `carve-monument` action be performed:

```viv
// A story is carved into a monument
reserved action carve-monument:
    gloss: "@carver carves a monument recounting a story"
    roles:
        @carver:
            as: initiator
        @story*:
            as: action, precast
            n: 1-999
        @monument:
            as: item, spawn
            spawn: ~createItem("monument")
    effects:
        loop @story* as _@event:
            @monument inscribe _@event
        end
```

And via a single usage of the special `inspect` operator, subsequent characters can download the full `eye-for-an-eye` story, even as centuries of story time may have passed since the grandparent first told this tale to their grandchild:

```viv
// A character studies a monument, learning the story it tells
action study-monument:
    gloss: "@viewer studies a monument recounting a story"
    roles:
        @viewer:
            as: initiator
        @monument:
            as: item
    conditions:
        ~isItemOfType(@monument, "monument")
    effects:
        @viewer inspect @monument  // @viewer downloads all its inscribed knowledge
```
