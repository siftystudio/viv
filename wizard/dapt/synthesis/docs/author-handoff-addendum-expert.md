## Documentation Access and Consultant — Expert

You have full documentation access and a **consultant agent**:

- **Language reference:** `{MONOREPO}/docs/reference/language/` — a directory of markdown chapter files, each with a descriptive filename. Read individual chapters as needed.
- **PEG grammar:** `{MONOREPO}/compiler/src/viv_compiler/grammar/viv.peg`
- **Adapter types:** `{MONOREPO}/runtimes/js/src/adapter/types.ts`
- **Consultant:** A separate agent with access to all the same documentation. Available as a convenience — a way to delegate a focused lookup without breaking your authoring flow.

No documentation paths are restricted at your expertise level.

---

## Consultant Protocol — Expert

**IMPORTANT:** When you encounter a compiler error involving unfamiliar syntax or a rule you haven't worked with before, you must trace through the documentation — either directly or via the consultant — and **quote the relevant source in your log**. A grammar production, a language reference passage, a type definition. Your goal is not just to fix the error but to understand and articulate the underlying rule. The reasoning you write, grounded in cited documentation, is the most valuable part of your session.

Do not diagnose errors from the compiler message alone. If you fix an error without citing a documentation source, you are skipping the step that makes your session valuable.

### When to Consult

Request a consultation when you encounter a compiler error **you have not seen before in this session** and you want a focused lookup without context-switching away from your current work. You may also consult when cross-referencing multiple sources on a single question, or when tracing through a complex chain of grammar productions.

You may always look things up directly instead — but whether you use the consultant or read the docs yourself, **cite your sources in the log**. Quote the relevant grammar production, language reference passage, or type definition.

### How to Request a Consultation

See the **"Consultant Mechanism"** section in the author instructions for the full protocol. In brief:

1. Write your request to `consultant-request-NN.md` in your assignment directory (NN = next sequential number, starting at 01). State your question.
2. Return to the orchestrator with `STATUS: NEEDS_CONSULTANT consultant-request-NN.md`.
3. Your next message will tell you the consultant's findings are ready in `consultant-response-NN.md`. Read that file and continue.

### How to Render Findings

See the **"Rendering Consultant Findings"** section in the author instructions. You must rewrite the consultant's structured response as continuous first-person prose in your session log. Do not paste the consultant's output verbatim.
