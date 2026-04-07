---
title: "Viv: A Brief History"
next:
  label: "Language Reference: Preamble"
  link: /reference/language/00-preamble/
---

> *The construction of the system is inevitable.*
>
> — Sheldon Klein (1972)

What follows is a brief account of the Viv project so far.

## *World* and *Talk of the Town*

Since I first learned to code, I've been building character simulations. My earliest such system, *World* (2012–2014), modeled character actions implicitly, through code directly modifying storyworld state. This was also the case with the better-known engine *Talk of the Town* (2015–2016), where simulation events, and especially social interactions, were generally abstract.

## Toward actions

As I was developing (Ryan et al. 2015a) the concept that I later termed *story sifting* (Ryan 2018)—the task of automatically identifying stories that emerge from computer simulations—I became interested in building an engine where the fundamental unit of simulation would be discrete character *actions*.

In such a system, story sifting could be reduced to the task of matching predefined action patterns against a database of historical actions (what I later called a *chronicle*). This would be much easier than having to first construct such a database by inferring actions from raw state changes—action recognition is hard. I was also interested in developing an action-centric approach to character knowledge phenomena, where characters form memories about actions and can propagate knowledge about them through the performance of subsequent actions. This would produce more interesting character knowledge relative to what was being modeled in *Talk of the Town* (Ryan et al. 2015b).

With this vision in mind, I set out to incorporate the *Ensemble* action system (Samuel et al. 2015) into *Talk of the Town*, with the help of undergraduate student Joyce Scalettar. As I later explained in my thesis (Ryan 2018, 595–609), I found certain aspects of *Ensemble* to be limiting—e.g., every action must involve at least two characters, which precludes single-character introspections. 

So I decided to develop my own action formalism, which became the centerpiece of a new simulation engine, *Hennepin*.

## *Hennepin*

My third simulation engine, *Hennepin* (2017–2018), centers on a novel action formalism—and, in turn, an associated action manager and knowledge manager. This formalism and these modules, which became the basis for the Viv project, are described at length in my PhD thesis, [*Curating Simulated Storyworlds*](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf) (2018, pp. 588–630).

In *Hennepin*, I defined character actions directly in Python dictionaries, to the horror of my PhD committee member Ian Horswill. Ian encouraged me to create a DSL for writing actions, and when I finally set out to do this a few years later, Viv was born.

## Related work

The action formalism undergirding *Hennepin*, and subsequently that of *Viv*, was influenced by earlier action systems such as *Saga II* (Morse 1960), *MESSY* (Appelbaum and Klein 1976), *Universe* (Lebowitz 1985), *Hap* (Loyall and Bates 1991), *ABL* (Mateas and Stern 2004), *Praxis* (Evans and Short 2013), *Comme il Faut* (McCoy et al. 2014), *Ceptre* (Martens 2015), and especially *Ensemble* (Samuel et al. 2015). Related recent systems include *Felt* (Kreminski et al. 2019) and *Kismet* (Summerville and Samuel 2020), and a detailed comparison between Viv and similar projects will be forthcoming.

## Conception

In early 2022, I was a visiting professor at Carleton College, teaching a class on programming languages. This experience inspired me to finally take up Ian Horswill's idea of creating a DSL for defining *Hennepin*-style character actions. For this project, I enlisted the help of two undergraduates, Aiden Chang and Owen Barnett. Working together, the pair developed an initial grammar and parser for the language, working from a set of example actions that I had written in a notation that I designed.

I decided to name the language after my daughter, Vivian, with a nod to the Latin root *-viv-*, whose connotations include *life*, *alive*, *lively*.

## Initial development

A few months later, I started working as Narrative Systems Lead at a small company called Hexagram, where I had the wonderful opportunity to continue working on Viv. I am very thankful to my friend (and Hexagram CEO) Rob Auten for cultivating an environment that allowed this project to evolve far beyond its humble origins in academia.

While I had originally planned for Viv to compile actions into the format expected by *Hennepin*, for Hexagram I ended up creating a new simulation engine called *Esper*. Central to this engine is an action manager that is based on the one in *Hennepin*, this time written in JavaScript. During this period, *Esper* (and thus also Viv) became central to an ambitious prototype, attached to a really cool IP, that a team of us created. Unfortunately, it was never released nor announced.

One of my colleagues at Hexagram was Aaron A. Reed, a former UCSC labmate, who made countless contributions as the most prolific Viv author, a guinea pig for many early versions of the system, and an occasional direct contributor to the original codebase.

As I moved on to other systems at Hexagram, and later other companies, the Viv project went on pause beginning at the end of 2023.

## Later development

Following a year and a half of dormancy, I set out in the summer of 2025 to rewrite Viv as a publicly available production-grade system that could easily be plugged into external applications. This effort would end up consuming almost all my energy for the next nine months.

My primary objective during this time was to develop the notion of a Viv *runtime*, which is a standalone system integrating submodules like an interpreter, action manager, and knowledge manager. Whereas in *Esper* these modules were tightly coupled with the project code—and thus littered with project-specific concerns—Viv would have an entirely project-agnostic runtime, enabling it to be plugged into any JavaScript project.

More broadly, I overhauled the DSL and compiler, and created additional tooling such as the editor plugins.

## Public release

The compiler is now published as a PyPI package, the JavaScript runtime as an npm package, and various tooling is available on the applicable marketplaces. The larger codebase (a monorepo) is now [public on GitHub](https://github.com/siftystudio/viv), and the original private repository is archived.

Viv is freely available for non-commercial use, while commercial use requires a license from [Sifty](https://sifty.studio), a boutique software studio that I set up for this very purpose (though additional projects are in the works too).

My hope is that Viv will find use in videogame projects and any other applications where teams seek to produce interesting emergent narrative.

## References

Appelbaum, Matthew, and Sheldon Klein. *Meta-Symbolic Simulation System (MESSY) User Manual, with Forward: The History of Messy*. University of Wisconsin Department of Computer Sciences Technical Report TR272. 1976.

Evans, Richard, and Emily Short. "Versu—a simulationist storytelling system." *IEEE Transactions on Computational Intelligence and AI in Games* 6: 113–130. 2013.

Kreminski, Max, Melanie Dickinson, and Noah Wardrip-Fruin. "Felt: A Simple Story Sifter." *Proceedings of the International Conference on Interactive Digital Storytelling*: 267–281. 2019.

Lebowitz, Michael. "Story-telling as Planning and Learning." *Poetics* 14.6: 483–502. 1985.

Loyall, Bryan A., and Joseph Bates. "Hap: A Reactive, Adaptive Architecture for Agents." Carnegie Mellon University School of Computer Science Technical Report CMU-CS-91-147. 1991.

Martens, Chris. "Ceptre: A language for modeling generative interactive systems." *Proceedings of the AAAI Conference on Artificial Intelligence and Interactive Digital Entertainment*: 51–57. 2015.

Mateas, Michael, and Andrew Stern. "A Behavior Language: Joint Action and Behavioral Idioms." *Life-Like Characters*: 135–161. 2004.

McCoy, Joshua, et al. "Social story worlds with Comme il Faut." *IEEE Transactions on Computational intelligence and AI in Games* 6.2: 97–112. 2014.

Morse, Harrison R. Preliminary Operating Notes for SAGA II. MIT Technical Memorandum 8436-M-29. 1960.

Ryan, James. [*Curating Simulated Storyworlds*](https://viv.sifty.studio/background/curating_simulated_storyworlds.pdf). PhD thesis, UC Santa Cruz. 2018.

Ryan, James Owen, Michael Mateas, and Noah Wardrip-Fruin. "Open Design Challenges for Interactive Emergent Narrative." *Proceedings of the International Conference on Interactive Digital Storytelling*: 14–26. 2015a.

Ryan, James, Adam Summerville, Michael Mateas, and Noah Wardrip-Fruin. "Toward characters who observe, tell, misremember, and lie." *Proceedings of the AAAI Conference on Artificial Intelligence and Interactive Digital Entertainment*: 56–62. 2015b.

Samuel, Ben, et al. "The Ensemble Engine: Next-Generation Social Physics." *Proceedings of the Tenth International Conference on the Foundations of Digital Games*: 275–280. 2015.

Summerville, Adam, and Ben Samuel. "Kismet: A Small Social Simulation Language." *Proceedings of the Casual Creator Workshop*. 2020.