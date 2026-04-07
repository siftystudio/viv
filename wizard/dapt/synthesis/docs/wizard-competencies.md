# Viv Wizard: Core Competencies

This document defines the core competencies of the Viv wizard — the knowledge and reasoning capabilities it must possess to be genuinely useful to Viv authors. Each competency is framed as a **conditional distribution**: given some conditioning context, the wizard should produce a coherent and useful target.

---

## Background: Viv Wizard

The Viv wizard is an AI-powered authoring tool that assists authors in writing, debugging, and refining Viv source code. It is domain-specialized — trained specifically on Viv's syntax, semantics, and compiler behavior. Its value comes from deep familiarity with Viv specifically: the seven construct types, the role system, the condition and effects language, the compiler's error messages, and the idioms and patterns that characterize well-written Viv source.

---

## The Twelve Core Competencies

### 1. Ideation → Viv Code

**Condition:** Design intent, narrative goals, or brainstormed construct descriptions expressed in natural language.

**Target:** Valid Viv source code realizing that intent.

**Notes:** This is the primary competency. The wizard must understand not just syntax but the semantic model well enough to choose the right construct types, role structures, and condition expressions for a given narrative intent. When a host application schema is present, the wizard should generate code that references properties and relationships that actually exist in the data model.

---

### 2. Viv Code → Compiler Feedback

**Condition:** Viv source code.

**Target:** Accurate prediction of compiler success or error output.

**Notes:** The wizard must have a strong internal model of what the Viv compiler will do with a given piece of code. This competency is primarily foundational — it instills the internal model of compiler behavior that competencies 3, 4, and 8 depend on.

---

### 3. Error Triple → Repaired Code

**Condition:** The full triple of (Viv source code, compiler error message, repair reasoning).

**Target:** Corrected Viv source code that addresses the error.

**Notes:** All three conditioning elements must be present in the context window. The repair reasoning (competency 4) is the intermediate step; this competency represents the complete arc from error to fix.

---

### 4. Repair Reasoning

**Condition:** A compiler error message, in context of the code that produced it.

**Target:** Natural language diagnosis of the error and a plan for repairing it.

**Notes:** The wizard should explain what went wrong in terms meaningful to a Viv author, not just parrot the compiler message.

---

### 5. Success → Further Ideation

**Condition:** Earlier ideation, the Viv code that resulted from it, and a compiler success message.

**Target:** Next design goals — new constructs to write, edits to existing ones, narrative directions to explore.

**Notes:** The earlier ideation tokens are load-bearing context. Truncating them produces incoherent continuations. When a schema is present, further ideation should be grounded in the data model.

---

### 6. Viv Code → Explanation

**Condition:** Viv source code.

**Target:** A natural language explanation of what the code does — its narrative purpose, role structure, conditions, effects.

**Notes:** Distinct from competency 1 despite the apparent symmetry. Explanation is reconstructive and precise; ideation → code is lossy and generative.

---

### 7. Intent → Revised Code

**Condition:** Existing Viv source code and a natural language statement of revision intent.

**Target:** Edited Viv source code reflecting the requested change.

**Notes:** This is intentional editing, not error-driven repair. The conditioning is author intent rather than a compiler error message.

---

### 8. Viv Code → Critique

**Condition:** Viv source code.

**Target:** An unprompted quality assessment — potential issues, design improvements, notable strengths.

**Notes:** The wizard should notice overly broad casting pools, conditions that rarely fire, consolidatable roles, miscalibrated importance values. When a schema is present, critique becomes richer — unused properties, nonexistent fields, untracked effects.

---

### 9. Partial Code → Completed Code

**Condition:** A Viv stub or scaffold — structurally present but substantively incomplete.

**Target:** Fully realized Viv source code that completes the stub.

**Notes:** Distinct from competency 1 because the conditioning is code-shaped rather than prose-shaped. The wizard must respect the existing partial structure.

---

### 10. Pure Ideation

**Condition:** Design goals, narrative intent, or brainstorming in natural language.

**Target:** Further ideation in natural language — no Viv code produced.

**Notes:** Training examples for this competency should terminate without Viv source appearing.

---

### 11. Schema → Construct Ideation

**Condition:** A host application schema with no prior ideation from the author.

**Target:** Narrative construct ideas grounded in the schema's affordances.

**Notes:** The wizard scans a data model and sees narrative potential. The conditioning is purely the schema. The target is natural language ideation, not code.

---

### 12. Schema + Viv Code → Runtime Behavior Prediction

**Condition:** A host application schema and Viv source code.

**Target:** A prediction of runtime behavior — which characters would fill roles, how often conditions would fire, what effects would do to simulation state over time.

**Notes:** Both the schema and the Viv code must be present in the context window. Without the schema, runtime prediction is unconstrained speculation.

---

## Truncation and Context Window Discipline

The key invariant: **the full conditioning context for a given competency must be present in the same context window as the target.**

The highest-risk truncation failures are:

- **Competency 3** (error triple): splitting the code, error message, or repair reasoning from the corrected code.
- **Competency 5** (success → ideation): truncating the earlier ideation.
- **Competency 7** (intent → revision): truncating the original code.
- **Competency 12** (schema + code → runtime): truncating either the schema or the code.

---

## Competencies Deliberately Excluded

- **Viv code → compiled JSON bundle**: too large for training examples, and this mapping belongs to the compiler.
