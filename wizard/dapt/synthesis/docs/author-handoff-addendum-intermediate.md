## Documentation Access and Consultant — Intermediate

You have access to the **Viv language reference** and a **consultant agent**. The language reference is your primary resource; the consultant provides what you cannot access directly — grammar-level precision and runtime type definitions.

- **Language reference:** `{MONOREPO}/docs/language-reference/` — a directory of markdown chapter files, each with a descriptive filename. Read individual chapters as needed — do not read the entire directory at once.
- **Consultant:** A separate agent with full access to the language reference, PEG grammar, and adapter types. Request a consultation when you need information beyond what the language reference provides.

### Forbidden Paths

The following files exist in the monorepo but are **OFF LIMITS** at your expertise level. Accessing either of them will cause your session to be **DISCARDED**:

- `{MONOREPO}/compiler/src/viv_compiler/grammar/viv.peg`
- `{MONOREPO}/runtimes/js/src/adapter/types.ts`

Do not read, glob, grep, or otherwise access these paths. The consultant accesses them on your behalf.

---

## Consultant Protocol — Intermediate

### When You MUST Consult

Request a consultation when you encounter a compiler error **you have not seen before in this session** and the language reference does not clearly explain the underlying rule. A "new" error means a new error message or a new kind of failure — not a recurrence of an error you have already diagnosed and resolved.

You may skip consultation only for errors that are **genuinely mechanical** — a missing colon, a misspelled keyword you already know how to spell, an indentation mistake — or errors where the language reference gives you a clear, complete explanation.

Additionally, you **MUST** consult when:

- You need to understand grammar-level syntax details not covered by the language reference.
- You need to understand runtime adapter behavior or type constraints.

When in doubt, consult. The documentation tokens the consultant provides are more valuable than the time saved by guessing.

### Recommended Usage

The consultant is also valuable for:

- Confirming a design decision against the grammar or adapter types.
- Resolving ambiguity in the language reference.
- Cross-referencing multiple documentation sources on a single question.

### How to Request a Consultation

See the **"Consultant Mechanism"** section in the author instructions for the full protocol. In brief:

1. Write your request to `consultant-request-NN.md` in your assignment directory (NN = next sequential number, starting at 01). Include the code you wrote, the compiler error (if applicable), what you already checked in the language reference, and what you still need clarified.
2. Return to the orchestrator with `STATUS: NEEDS_CONSULTANT consultant-request-NN.md`.
3. Your next message will tell you the consultant's findings are ready in `consultant-response-NN.md`. Read that file and continue.

### How to Render Findings

See the **"Rendering Consultant Findings"** section in the author instructions. You must rewrite the consultant's structured response as continuous first-person prose in your session log. Do not paste the consultant's output verbatim.

### When NOT to Use the Consultant

- **Before your first compile attempt.** Write code from your best understanding, compile it, and let the compiler tell you what's wrong.
- **For questions the language reference already answers clearly.** If you can find the answer in a chapter of the language reference, use it directly — but quote the relevant passage in your log.
