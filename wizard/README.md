# Viv Wizard

The **Viv wizard** is a forthcoming AI-powered authoring tool for creating, debugging, and refining Viv content. Concretely, it will take the form of a fine-tuned LLM trained as a series of LoRA adapters sequentially merged into a base model, [Qwen2.5-Coder-7B](https://huggingface.co/Qwen/Qwen2.5-Coder-7B).

It will be able to serve as a partner in all kinds of Viv work, through a command-line interface and potentially as a component in a Viv editor plugin. While it will likely not hold up to the [Viv Claude Code plugin](../plugins/claude/README.md), it will be quite inexpensive and it could be run in commercial contexts with concerns around intellectual property. It's also a fun project that is helping me to level up my skills when it comes to training LLMs.

*This project is currently in development.*

## Table of Contents

- [Plans and Progress](#plans-and-progress)
- [DAPT](#dapt)
  - [Training Data](#training-data)
  - [Data Synthesis](#data-synthesis)
  - [Data Aggregation](#data-aggregation)
  - [Training](#training)
  - [Evaluation](#evaluation)
- [SFT](#sft)
- [RLXF](#rlxf)
- [Project Structure](#project-structure)

## Plans and Progress

The plan is for training to proceed in three distinct stages, each of which builds on the previous one:

* **Domain-adaptive pretraining.**
  * *Status: The pipeline is implemented, a first training run has been conducted, and an evaluation module is partly written.*
* **Supervised finetuning.**
  * *Status: Not yet started.*
* **Reinforcement learning.**
  * *Status: Not yet started.*

After each stage, the LoRA adapter is merged into the base model, producing a standalone model for the next stage. The final artifact is a full custom model, rather than an adapter.

## DAPT

*Domain-adaptive pretraining* (DAPT) is continued pretraining on material from the Viv domain: the language reference, language grammar, type definitions, valid Viv code, and synthesized training examples that demonstrate what I envision as the core competencies at which the wizard should excel. This stage is a way of getting general Vivness into the weights—it teaches the model the statistical mechanics not just of Viv code, but of the way authors talk about Viv code.

### Training data

The DAPT training corpus draws from two sources that are combined into a single dataset (which is later split into training and validation sets):

- **Synthesized examples.**
  - These are naturalistic authoring logs that are produced by an elaborate multi-agent [synthesis pipeline](#data-synthesis), which also segments them into training examples annotated with competencies.

- **Aggregated reference material.**
  - This is existing Viv documentation, type definitions, and valid Viv code, bundled into training examples by the [aggregation pipeline](#data-aggregation).


### Data synthesis

The DAPT corpus is primarily *synthesized* rather than hand-authored, via an elaborate synthesis pipeline that is probably the **most interesting aspect** of this project. The procedure here centers on a team of Claude Code agents that work together to produce naturalistic authoring session logs that are then segmented into training examples.

#### Competencies

Ultimately the wizard should exhibit a number of **core competencies** that correspond to the kinds of work that Viv authors carry out, and in particular the kinds of conversations that would obtain should an author have an expert collaborator in the loop in the course of that work. One way to think about these competencies is as conditional distributions from certain kinds of tokens to certain other kinds of tokens. For example, if an author tells the wizard what kind of content they want the wizard to write, and the wizard then writes Viv code accordingly, the conditional distribution might be described as *ideation → Viv code*. In order for the wizard to be able to produce Viv code tokens in response to ideation tokens, this conditional distribution must appear in the training data—which means it goes on the **coverage checklist** for the team of agents charged with synthesizing training data. Other conditional distributions associated with competencies include *Viv code → compiler feedback*, *Viv code → explanation*, and *partial Viv code → completed Viv code*, among several others.

#### Synthesis agents

As I mentioned above, a team of Claude Code agents is tasked with carrying out the synthesis work. The members of this team are each assigned to one of four distinct roles.

The **orchestrator** is the top-level agent that drives the pipeline. It tracks coverage of the competencies and various language features, and then issues **authoring briefs** that are meant to address coverage gaps. An authoring brief is a creative commission specifying a simulation domain, narrative premise, and author expertise level. It is also grounded in an actual schema for a simulation domain, in a notation pertinent to the Viv project. By enforcing schema diversity, the orchestrator can prevent the model from overfitting to any single genre or theme, ensuring that the wizard learns that Viv is domain-agnostic.

An **author** does actual Viv authoring work. It receives a commission from the orchestrator, and then pursues the genuine authoring goals prescribed therein—designing narrative constructs, writing Viv code, compiling (actually), debugging, iterating—while producing a session log. The agent thinks aloud throughout, narrating design decisions and tracing through documentation. The [Viv compiler](https://pypi.org/project/viv-compiler/) is a critical part of the process, since the errors (and successes) it produces drive authentic authoring/debugging arcs. (I plan to use it again during a later training phase.) Further, authors operate at one of three **expertise levels**—*expert*, *intermediate*, or *novice*—which are implemented as real restrictions on documentation access. A novice agent genuinely cannot see the DSL grammar or the language reference, but instead works from a brief overview and example code, making the kinds of mistakes an actual first-time Viv author might make. When it gets stuck, it spawns a **consultant subagent** with full documentation access that traces through the grammar and reports back. This asymmetry produces the richest training signal: authentic errors paired with documentation-grounded repair reasoning, just like we want the wizard to be able to do.

A **consultant** is a documentation specialist that gets spawned when an author agent, typically a novice, needs to trace through Viv documentation beyond its expertise level. It reads the full language reference and DSL grammar, traces through the relevant material, and writes its findings for the author.

Finally, a **reviewer** is an agent that reads a completed session log and segments it into structured training examples annotated with competencies. It also writes a report for the orchestrator that specifies updates to the coverage tracking.

In general, the entire process is tuned so as to limit the orchestrator's token burden, since it needs to keep the process running smoothly across an entire session, which may subsume a few million tokens across all subagents. That said, the process is also robust to resumption after interrupts or compaction (of the orchestrator's context).

With three authoring tracks running in parallel, a single orchestrator can produce around 250K tokens of training data per hour.

#### Session logs and training examples

Each session produces a single log interleaving prose, Viv code, and compiler output, all written in the first person from an author's perspective. Note that when an author makes use of the consultant, they reframe the findings (written in another file) in a first-person account of searching through the documentation cited in the reviewer's report. This is because the wizard interaction modality is not meant to be introduced to the model until the SFT phase. The job of DAPT is to get general Vivness into the system, as stated above, and then on top of that foundation we will start to coax the model into the wizard personality and interaction mode.

Once a session log is complete, it's handed to a reviewer agent, who segments it into structured training examples that are each annotated with a competency. As I noted above, this allows the orchestrator to track competency coverage.

### Data aggregation

The aggregation pipeline packages existing Viv reference material—the language reference, DSL grammar, various type definitions, valid Viv code—into training examples alongside the synthesized data.

### Training

The training loop is a custom PyTorch training loop with checkpointing and resumption support. Validation loss is logged but does not drive training decisions currently (no early stopping or best-checkpoint selection). Training is tracked via [Weights & Biases](https://wandb.ai/).

One detail of note is that we apply **selective loss masking** to tokens that make up invalid Viv code, which we can detect as making up segments that are annotated (by the reviewer agent) as Viv code and are immediately followed by segments annotated as compiler errors. We mask these tokens so as to prevent the statistical mechanics of invalid Viv code from entering the model during the critical DAPT phase.

### Evaluation

The post-training evaluation suite measures whether DAPT successfully transferred domain knowledge to the model. The current task is a **perplexity** comparison between the base model and the adapted model, on a held-out validation set. Additional tasks are planned, including **cloze accuracy** (next-token prediction at syntactically constrained positions in Viv code) and **compilation probes** (generating Viv code completions and checking whether they compile).

## SFT

After DAPT, I am planning to carry out a **supervised fine-tuning** (SFT) phase. The idea here is to instruction-tune the DAPT-adapted model on conversational examples that model my envisioned wizard interactions—an author asks the wizard to help write an action, debug a compile error, explain a sifting pattern, and so on. This stage will teach the model to be an actual conversational partner, not just a domain-aware token predictor.

As far as training data, the method here will likely take the form of hard distillation where the teacher is the [Viv Claude Code plugin](../plugins/claude/README.md). This should work quite nicely because that plugin and the wizard serve effectively the same role, though there may be some work to suppress certain Claude actions that won't be available to the wizard, namely around tool use.

## RLXF

As a final phase, I plan to carry out both **reinforcement learning from AI feedback** (RLAIF), likely with Claude as a rater, and **reinforcement learning from verifiable rewards** (RLVR), with the compiler as the verifier. That is, for RLVR the wizard will be tasked with writing Viv code, which produces a reward signal if it compiles. This will preference-align the SFT-tuned model to improve the quality of wizard responses.

## Project Structure

```
wizard/
├── dapt/                    DAPT training pipeline
│   ├── aggregation/         Packages existing Viv reference material into training examples
│   ├── synthesis/           Multi-agent pipeline that synthesizes training examples
│   │   ├── docs/            Synthesis specs (competencies, log format, agent instructions, etc.)
│   │   ├── domain_schemas/  Host application schemas across diverse domains
│   │   └── assignments/     Authoring assignments (brief, session log, working files)
│   ├── data/                Training data (aggregated + synthesized JSONL)
│   ├── pipeline/            Training loop, model prep, checkpointing, validation
│   ├── eval/                Post-training evaluation suite
│   └── scripts/             Shell scripts for running training and evaluation
└── tool/                    The wizard tool itself (stub currently)
```