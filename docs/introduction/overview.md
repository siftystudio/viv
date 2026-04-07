---
title: Introduction to Viv
---

If you're looking to build an experience centered on rich worlds teeming with emergent storylines, then Viv is a system for you. 

Imagine a living troupe of thousands of characters producing millions of actions, all intertwingled in a hyper-Pynchonian gnarl that only a computer could understand—a tangle that a computer now *can* understand, through Viv's facilities for author-driven story sifting. Even your characters will understand what's happening around them.

This introduction will cover everything you need to understand Viv:

* An [overview](#overview) of the project.
* Its [features](#features): actions, reactions, plans, queries, story sifting, knowledge propagation, and more.
* Its [design philosophy](#design-philosophy).
* And, most importantly, an extensive [working example](/introduction/example/) that provides a whirlwind tour of the Viv language by walking through the authoring and simulation of a revenge arc—from a character scribbling a gossip note, to an arson (of course), to an in-game monument that, centuries later, imparts the whole story to any NPC who read its inscription.


## Overview

At the heart of Viv is a custom programming language that authors use to define the *actions* that characters can take in a simulated storyworld, *plans* for orchestrating coordinated sequences of actions, and a library of queries and higher-order patterns that enable *story sifting*—the task of automatically detecting the storylines that emerge as a simulation proceeds. This Viv code is compiled into a form expected by the Viv *runtime*, which is itself plugged into a larger project such as a videogame.

Viv is designed, built, and maintained by me, [James Ryan](https://jamesryan.ai), and it's licensed through a little software studio I call [Sifty](https://sifty.studio). As I explain in this [brief history](/background/history-of-viv/), the project has its intellectual and technical basis in my PhD thesis, [*Curating Simulated Storyworlds*](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf) (2018). It is the product of a thousand hours of thinking, a thousand hours of writing, and thousands of hours of engineering.

All Viv code is publicly readable on GitHub, in the [Viv monorepo](https://github.com/siftystudio/viv), but commercial use of any component requires a [license](#license).


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
  - A *sifting pattern* specifies rich criteria for matching a *sequence* of actions—i.e., for finding a certain kind of emergent storyline. Like queries, sifting patterns can be applied both to the chronicle and to a character's memories, and they can be used when casting other constructs. For example, a sifting pattern could detect a complete revenge arc in an elder's memories, enabling an action where they recount the tale as a cautionary exemplum (see the [working example](/introduction/example/)). In general, sifting patterns enable two kinds of understanding: global understanding of what has transpired in a given world (for surfacing to the player), and subjective understanding *by characters themselves*, so that they are not merely aware of the storylines unfolding around them (which is itself basically unprecedented), but in fact constantly draw on that storied understanding as an impetus for action (causing storylines to beget storylines).
- **Knowledge propagation**
  - When a character experiences or otherwise witnesses an action firsthand, they form a memory of it. Once a character knows about an action, they can perform subsequent actions that refer to the past one, as in a character gossiping about an enemy's faux pas. And when a character experiences or witnesses an action that refers to a past one, they form knowledge of *both* memories. So hearing gossip about a past event allows a character to themselves spread knowledge of that past event, and so forth. Further, when a character learns about an action, even if it occurred a long time ago, a *reaction* may be triggered, and a causal chain will immediately form to connect the original action to the learning action to the ultimate reaction. All of this is handled automatically by Viv, without the author having to ever specify anything about knowledge formation or propagation.
- **Item phenomena**
  - Characters can inscribe knowledge of past actions into items, allowing any character who inspects the item to learn about the actions it recounts. For instance, a character might write in their diary about the salient events of the day, and another character who reads the diary would learn about those actions automatically. These items exist in the storyworld and can be integrated into gameplay in various interesting ways.
- **Causal bookkeeping**
  - According to the various mechanisms outlined above, Viv automatically records causal links between actions as they occur—a concept from my [PhD thesis](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf) called *causal bookkeeping*. The result is a partitioning of the chronicle into a forest of causal trees (DAGs, technically), each of which might be deemed a storyline. By recording causal links as they occur, the task of causal inference is obviated, and story sifting becomes more tractable in terms of both pattern authoring and computational efficiency.


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

  * While Viv doesn't model the player character as a distinct kind of character, there are a few patterns that can be used to tie Viv actions into, e.g., a [storylet](https://emshort.blog/2019/11/29/storylets-you-want-them/) system:

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
  * That said, Viv could certainly be used in something more restrained or focused, such as a [Versu](https://versu.com/)-like experience with a small (and finite) set of fully authored characters. This would be enabled by using casting pools that specify character IDs directly, e.g.: `@darcy: is: #DARCY` or `@eligible-bachelor: from: [#DARCY, #BINGLEY, #WICKHAM, #COLLINS]`.

## License

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio). Read the [license](https://github.com/siftystudio/viv/blob/main/LICENSE.txt) for the full details, or visit [sifty.studio/licensing](https://sifty.studio/licensing).

## Next: A revenge story

Ready for a deep dive? The [next page](/introduction/example/) provides an extensive working example that walks through the authoring and simulation of a revenge arc in Viv—from a character scribbling a gossip note, to an arson, to a knowledge-propagating monument recounting it all for posterity.
