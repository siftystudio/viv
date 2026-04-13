---
title: "Example: A Revenge Story"
---

This walkthrough provides an extensive working example of writing Viv code and invoking the Viv runtime. We'll follow an author named Alice as she writes the Viv constructs needed for *revenge arcs* to appear in her game—and then watch what happens when they do emerge.

Along the way, we'll encounter actions, queries, tropes, selectors, plans, sifting patterns, knowledge propagation, item inscription, and causal bookkeeping. If you haven't already, you may want to read the [introduction](/introduction/) first for a high-level overview of these features. And once you're ready, you can consult the [language reference](/reference/language/00-preamble/) for more details on any language construct and the [JavaScript runtime reference](/reference/runtimes/js/) for information on the API functions invoked below.

## Simulating a storyworld

Alice is well underway in her effort to author Viv-powered revenge stories for her game.

Currently she is using the [Viv JavaScript runtime](https://www.npmjs.com/package/@siftystudio/viv-runtime) to test whether the storylines that emerge are to her liking. First, she simulates a few decades of story time, making use of Viv's facilities for *action selection*:

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

Now she's got a world in which Viv has produced thousands of character actions—in Viv parlance, this collection is called the *chronicle*. It persists in Alice's game, the *host application*, and Viv reads and writes it using a bridge to that application called the *adapter*.

Earlier, Alice registered her adapter by calling the function [`initializeVivRuntime()`](https://viv.sifty.studio/reference/runtimes/js/functions/initializeVivRuntime.html) in her game's startup code, and as a result Viv's accessing of sim data is totally abstracted. This function also accepted Alice's *content bundle*, meaning her compiled Viv code.

## Running a sifting pattern

Since Alice is working on revenge arcs right now, she wants to determine whether any such storylines emerged in the decades of time that she simulated. To carry out this investigation, she employs Viv's *story sifting* faculties to run a *sifting pattern* that she has authored, called `revenge`:

```javascript
import { runSiftingPattern } from "@siftystudio/viv-runtime";

const siftingMatch = await runSiftingPattern({ patternName: "revenge" });
```

This pattern searches the chronicle to match sequences of actions that compose revenge arcs, according to how she defines them.

## Diagramming an emergent storyline

She's found a match! One way to examine it, as an author, is to invoke the Viv runtime's functionality for constructing a *causal tree diagram* for the sifting match. She expands the code snippet above to log the diagram for the match:

```javascript
import { runSiftingPattern, constructSiftingMatchDiagram } from "@siftystudio/viv-runtime";

const siftingMatch = await runSiftingPattern({ patternName: "revenge" });
if (siftingMatch) {
    const diagram = await constructSiftingMatchDiagram({ siftingMatch });
    console.log(diagram);
}
```

When she runs this code, it logs this diagram for a sifted revenge story:

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

In the diagram, *elision indicators* of the form `⋮ (N)` mark actions that, while being part of the causal ancestry, were not specifically matched by Alice's `revenge` sifting pattern. So the `⋮ (31)` between `spread-rumor [a4]` and `mock-in-public [a5]` marks 31 elided actions, in this case other actions that have `spread-rumor [a4]` as a causal ancestor (either direct or indirect). Meanwhile, `begin-apprenticeship-with-builder [a10]` caused 847 actions, none of which are fundamental components of the revenge arc described here. These are causally related offshoots of the sifted storyline.

It turns out that when you exhaustively track causality between actions, like Viv does, storylines tend not to be neat causal trees, but rather substructures of such topologies. Conventional human-authored stories don't look like this because the cognitive cost of the necessary worldbuilding would be too high, but for a computer it is a simple matter of graph maintenance (so long as there is a means of tracking causal links). This enables a new kind of narratology—one where storylines embed and interweave one another—as the next section discusses.

Finally, in parentheses we see what *role* each action plays in the `revenge` sifting pattern (whose definition we will read momentarily). For instance, `write-gossip-note [a2]` was the `offense` for which vengeance was sought, `befriend-victim-family [a12]` is part of the `scheme`, and the `payback` was `arson [a14]`.

## Storyline interlocking

So let's back out and take stock of the emergent storyline here: a character who was mocked for an embarrassing snafu carried out an elaborate scheme to enact revenge on somebody who gossiped about the snafu, with the means being arson (cf. [1](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf), [2](https://www.researchgate.net/profile/Max-Kreminski/publication/366756768_Authoring_for_Story_Sifters/links/63bdd26103aad5368e7dc9dd/Authoring-for-Story-Sifters.pdf)).

Later on, a whopping 1,204 actions occurred as a result of the arson, but none of them were deemed pertinent to the revenge arc itself, according to Alice's `revenge` sifting pattern.

Now it may be the case that another sifting pattern, such as `rags-to-riches`, would match a subset of `arson`'s 1,204 causal descendants. In this case, the entire `revenge` *storyline* here could be conceived as having caused the `rags-to-riches` storyline, and such relations between sifting matches can be matched via higher-order sifting patterns that specify child sifting patterns—and correspondences between their respective matches. [Below](#storylines-of-storylines), Alice will write a higher-order pattern called `eye-for-an-eye` that matches when a `revenge` storyline causes another `revenge` storyline, but with the aggressor of the first being the target of the latter, and the `payback` of the first being the `offense` of the second.

In general, the aesthetics of Viv is a hyper-Pynchonian gnarl of storylines begetting (and embedding) other storylines—but in ways that can be controlled by authors and recognized by Viv itself, as the simulation is proceeding. In my [PhD thesis](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf), I referred to this phenomenon as *storyline interlocking*, and in Viv it is a first-class notion that works according to one's authored constructs.

## Writing actions, queries, and tropes

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

This action casts three *roles*: `@writer` (a character), `@subject` (a past action), and `@note` (an item). These are the variables that must be bound in order for the action to be performed. In Viv, this binding process is framed using the verbiage of casting roles in a dramatic production—a metaphor borrowed from [*Comme il Faut*](https://ojs.aaai.org/index.php/AIIDE/article/download/12454/12313), one of Viv's [antecedents](/background/history-of-viv/).

The `conditions` field specifies that `@writer`, the *initiator* of the action, must have the `loudmouth` personality trait. But that's not a Viv concern—the `.personality.loudmouth` path is an arbitrary one (from Viv's standpoint) that Alice's host application will resolve, on request, as the Viv runtime evaluates this condition. As noted above, this depends on the *adapter* module that Alice registers with the Viv runtime in her game's startup code.

If the condition holds for a character considering this action, the next concern is casting the `@subject` role, whose candidate pool is a set of actions matching the `gossip-worthy-event` *query*:

```viv
// Matches past actions that merit gossip
query gossip-worthy-event:
    tags:
        all: embarrassing
    salience:
        >=: #MODERATE
```

This query matches actions tagged `embarrassing` (another author-defined value) and exceeding a salience threshold (specified by the author-defined *enum* `#MODERATE`). Critically, the bit `over: @writer` specifies that the query is to be run only against actions that `@writer` knows about.

In general, queries allow an author to specify the *kinds* of actions that might cause the one at hand, which greatly expands the expressive range of a given content bundle: rather than specifying that this particular action type can be caused by that particular action type, you enable causal links between classes of actions, and this blows up the possibility space (in terms of potential emergent storylines).

Meanwhile, the `@note` role specifies that an *item* is to be spawned, upon performance of the action, to be cast in this role. The item will be created via an author-defined function called `createItem()`. Further, the `effects` field of the action uses the special `inscribe` operator to write into the `@note` item knowledge of the `@subject` action. Elsewhere, as we'll see below, Alice can use the `inspect` operator to cause a character to read the `@note`, thereby gaining knowledge of the `@subject` action.

In general, one hallmark of Viv is its rich affordances for dealing in character knowledge, specifically of past actions, which enables a whole suite of storylines. For instance, a character could discover this very `@note` a century after it was written, thereby learning about `@subject` at that time, which could itself cause the character to *react*, with the causal link between `@subject` and this subsequent action (a century later) being automatically tracked by the system. This is called *causal bookkeeping*.

Next, let's focus on the all-important `reactions` field, which in this case works as a fulcrum for any storyline matching Alice's `revenge` sifting pattern. Here we have an important conditional clause that is only entered when `@hearer == @subject.initiator` and `<@hearer> fits trope is-unhinged`. In Viv, `@hearer` is a special role that is automatically cast when a character learns about the action at hand after the fact. In English, these conditions could be restated like this: the character who performed the original embarrassing action is learning about this gossip action after the fact, and this character fits the `is-unhinged` trope.

Let's take a look at the definition for that trope:

```viv
// Fits character who is volatile, either currently or always
trope is-unhinged:
    roles:
        @person:
            as: character
    conditions:
        @person.personality.volatile || @person.mood.spiraling
```

In Viv, a *trope* is a reusable bundle of conditions. Again, `personality` and `mood` are not Viv keywords, but rather character properties originating in Alice's game code. While this trope is simple, they can be quite complex, potentially referencing other tropes and so on.

## Writing selectors and plans

If the situation marked by this conditional does obtain—a volatile character embarrasses themself, someone writes a gossip note about it, and the volatile character learns of this later on—Viv will queue up the `plot-revenge` plan selector:

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
        (30) long-con-ingratiation:
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

A *plan selector* is a tiny program for selecting a Viv plan to launch. While various policies are supported, the *weighted random* policy that we see here has allowed Alice to attach relative weights to three candidates, one of which is itself a plan selector that will have its own policy and its own candidates. This notation drives probabilistic selection between alternatives.

Though we can't see it here, the weights are specified not by numbers necessarily, but by arbitrary Viv expressions, supporting [utility-based methods](https://en.wikipedia.org/wiki/Utility_system). For instance, Alice could have instead written something like this:

```viv
(~getPropensity(@plotter, #SCHEMING)) long-con-ingratiation:
    with partial:
        @schemer: @plotter
        @target: @target
(~getPropensity(@plotter, #VIOLENCE)) selector plan-direct-assault:
    with partial:
        @plotter: @plotter
        @target: @target
(~getPropensity(@plotter, #SCHEMING) / 2) social-destruction:
    with partial:
        @plotter: @plotter
        @target: @target
```

Viv also has *action selectors*, and in general selectors work like queries to expand the expressive range of a content bundle. Whereas queries allow an author to specify a class of possible causal ancestors for a given action, selectors afford specification of a class of possible causal descendants. In each case, this blows up the possibility space  (in terms of potential emergent storylines) relative to connecting concrete action types.

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

Viv's *plan* construct is a powerful mechanism for orchestrating reactions with shared bindings. Alice's plan here has two roles, `@schemer` and `@target`, and it plays out over three *phases*: `>preparation`, `>ingratiation`, and `>execution`. Notably, Alice has specified a very slow burn here—notice how seven *years* must pass between the `>ingratiation` and `>execution` phases. Generally, plan execution proceeds to the next phase pending occurrence of the constructs queued in the present phase, succeeds when the last phase completes, and fails when a queued construct required to occur does not occur.

Using the full plan notation, of which only a subset is employed here, an author can specify rich logics around timing, parallel tracks, partial ordering, and so forth. For instance, a plan could queue three subplans, advancing execution only once all the subplans each succeed. Or it could it queue two alternative subplans and terminate the second when the first succeeds.

## Writing sifting patterns

This brings us to Viv's crown jewel: *sifting patterns*. A sifting pattern is a query that matches a collection of actions—or, in other words, an emergent storyline. Here is Alice's definition for the `revenge` sifting pattern that we saw her running up above:

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

This pattern has two standard roles (`@avenger` and `@victim`) and also five `actions` roles, each of which casts past actions. The `@setup*` and `@scheme*` roles are group roles (indicated by `*`), meaning they can each fill multiple slots (between `1` and `50` in each case). The other action roles (`@offense`, `@vow`, `@payback`) each match exactly one action. If the roles and actions can all be successfully cast, the sifting pattern will produce a *match*, that being the bindings for the `actions` roles.

Note the `@offense` and `@payback` actions, each of which are cast by running the same query, `cruelty`. But in one case, `@victim` is cruel toward `@avenger`, and in the other case it's reversed. As such, this pattern operationalizes a theory of revenge as a kind of symmetrical cruelty.

Finally, a look over the `conditions` block reveals the causal glue that holds the pattern together: every `@setup*` action must have caused the `@vow`, the `@offense` must have also caused the `@vow`, every `@scheme*` action must have been caused by the `@vow` and must have preceded the `@payback`, and the `@vow` must have caused the `@payback`.

Here's a visual showing the prescribed causal graph:

```
@setup*  @offense
   │         │
   └───@vow──┘
         │
    ┌────┤
@scheme* │
    └────┤
         │
     @payback
```

In total, these aspects of the sifting pattern are the operational constraints that define what Alice means by a 'revenge story'—and what the system "understands" when it runs the `revenge` pattern to detect a concrete match like the one seen in the causal tree diagram above.

## Storylines of storylines

Now here's where it gets wild.

Sifting patterns can reference other sifting patterns, which allows Alice to write a higher-order pattern called `eye-for-an-eye`:

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

This pattern matches when two `revenge` matches are themselves intertwined in a particular way: the `@avenger` of the first is the `@victim` of the second, and the `@payback` action of the first is the `@offense` action of the second. That is, the avenger of the second `revenge` match earned retribution for the very act of reprisal at the heart of the first `revenge` match. This is pretty complex stuff, but Viv's patterns-of-patterns notation allows Alice to specify it with elegance.

Here's a visual showing how the two `revenge` matches (labeled with `¹`  and `²`) interlock via the `@crux` role in `eye-for-an-eye` (labeled with `³`):

```
       @setup*¹   @offense¹
          │           │
          └───@vow¹───┘
                │
           ┌────┤
      @scheme*¹ │
           └────┤
                │
 @setup*²   @payback¹ = @offense² = @crux³
     │          │
     └───@vow²──┘
           │
      ┌────┤
 @scheme*² │
      └────┤
           │
       @payback²
```

## Sifting a character's memories

And here's the cherry on top: a sifting pattern can be applied to a character's memories—with the sifting happening *within the simulation*.

First, let's get into more detail about Viv's handling of character knowledge, which again is a hallmark of the system. When a character participates in, witnesses, or otherwise learns about an action that itself casts one or more past actions, the character will *learn* about all those past actions. Viv handles this automatically: an author simply has to write a role casting past actions, and if the authored action is performed, it will propagate knowledge of those past actions. So, as a matter of course, the characters in Viv-powered simulations build up rich libraries of memories about historical actions, according to what they do, see, and hear.

And just as sifting patterns can be applied to the chronicle, like Alice did when she ran her `revenge` pattern up above, they can also be applied to character memories. Moreover, this kind of diegetic sifting can be specified in the Viv code itself, allowing an author to gate actions based on the kinds of emergent storylines that a character *knows about*.

What follows is an illustrative example in which a grandparent sifts their own memories to match Alice's `eye-for-an-eye` pattern from the previous section, and then imparts the sifted story to their grandchild as a parable:

```viv
// A grandparent uses an exemplum to warn their grandchild about the futility of revenge
//
// Note that the grandchild will form knowledge of all the eye-for-an-eye actions
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
```

Here the `@parable*` group role casts all the actions contained in a sifting match for the `eye-for-an-eye` pattern as applied to the grandparent's memories, the latter detail being specified via `over: @grandparent`. In other words, `@parable*` casts the *sifted story itself*.

But consider this fact with relation to the feature just explained: an action automatically propagates knowledge about any actions that it casts in its own roles. This means that anyone who experiences, observes, or otherwise hears about this `tell-revenge-parable` action will learn about the `eye-for-an-eye` story. So when the grandchild here experiences `tell-revenge-parable`, they automatically form memories for each of the actions making up the `eye-for-an-eye` story. Effectively, the character downloads the full story, which is itself a collection of two interrelated `revenge` arcs!

What's more, the sifting patterns `revenge` and `eye-for-an-eye` can now be matched against the grandchild's memories, turning all three stories into discrete tokens that are now at the grandchild's disposal—or at Alice's disposal, rather, and with almost no notational overhead (e.g., `@parable*`).

While it is otherwise a purely descriptive mechanism, when fed back into the simulation itself, a sifting pattern becomes a generative tool too.

## Inscribing stories into items

Alice wraps up her session with a potent expansion of the `tell-revenge-parable` action above that makes use of Viv's affordances for item inscription:

```viv
// A grandparent uses an exemplum to warn their grandchild about the futility of revenge
//
// Note that the grandchild will form knowledge of all the eye-for-an-eye actions, which 
// they can then propagate in further actions -- for instance, via item inscription.
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

Now we have a reaction whereby the action `carve-monument` is queued up for targeting by the grandchild, once twenty years have passed. Critically, the `@parable*` actions constituting the `eye-for-an-eye` story are precast as the `@story*` bindings for `carve-monument`, which is defined as follows:

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

Like the `@note` role in `write-gossip-note` above, the `@monument` role here spawns an item. In this case, Alice doesn't inscribe a single action into it, but instead an entire story—specifically, the actions cast in the `@story*` group role. Should the grandchild indeed perform this action once they grow up, the resulting `@monument` item will impart knowledge of each of the actions making up the `eye-for-an-eye` story.

And via a single usage of the special `inspect` operator—which causes a character to learn about all the actions inscribed into the item being inspected—subsequent characters can download the full `eye-for-an-eye` story, even as centuries of story time may have passed since the grandparent first told this tale to their grandchild:

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

## Causal bookkeeping

It's worth emphasizing how causal bookkeeping applies in this case. This term originates in my [thesis](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf) and refers to the task of automatically tracking causal links between actions as a simulation proceeds, which facilitates story sifting by turning what is otherwise a soup of actions into a collection of causal graphs. It's one of Viv's core tasks, and one of its major selling points.

With regard to the monument storyline seen here, Viv would work behind the scenes to automatically record causal links between: each `eye-for-an-eye` action and `tell-revenge-parable`; `tell-revenge-parable` and `carve-monument`; and each `eye-for-an-eye` action and any subsequent action it causes by virtue of someone learning about it, including via inspecting the monument. This is not to mention the causal ancestors of the `eye-for-an-eye` actions, and the causal descendants of any downstream actions, all of which will be included in the graph containing `tell-revenge-parable`.

Critically, this causal bookkeeping is driven purely by Alice's *implications* of causality in her action definitions. She doesn't have to tell Viv what causes what, but rather she simply writes down what kinds of past actions might lead someone to perform the action she is defining, and what kinds of follow-on actions might happen as a result of this action. Viv can do the work behind the scenes, because causality is part of the operational semantics of the language.

For more on causal bookkeeping, including a breakdown of the five sources of causality in Viv, see [this section](/reference/language/20-runtime-model#causal-bookkeeping) of the language reference.

## Wrangling the gnarl

In Viv, characters constantly learn about past actions, learning about those actions causes reactions, and the system tracks the causal threads all the while. This is how its so-called 'hyper-Pynchonian gnarl' reliably obtains—and the gnarl, left to itself, will break your brain.

But a core takeaway here is that Viv's facilities for story sifting make it possible to tap the gnarl in a controlled manner: sifting patterns decompose massive causal graphs into legible subgraphs, each being a discrete emergent story that an author like Alice can treat as a token, that a character like the grandchild above can reason about, and that a game like Alice's can surface to the player.
