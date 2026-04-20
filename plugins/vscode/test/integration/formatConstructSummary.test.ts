import { expect } from "chai";
import { formatConstructSummary } from "../../extension";
import { activateExtension } from "./_helpers";

/**
 * Verifies the output-channel construct-summary format. The extension emits
 * these lines to VS Code's Output panel after each successful compile, so the
 * format is user-visible and stable.
 */
describe("formatConstructSummary", () => {
    before(async () => {
        await activateExtension();
    });

    it("renders all seven sections in a defined order", () => {
        const out = formatConstructSummary({
            actions: [],
            actionSelectors: [],
            plans: [],
            planSelectors: [],
            queries: [],
            siftingPatterns: [],
            tropes: [],
        });
        const headers = out.split("\n").filter((line) => line.startsWith("*"));
        expect(headers).to.deep.equal([
            "* Actions (0)",
            "* Action selectors (0)",
            "* Plans (0)",
            "* Plan selectors (0)",
            "* Queries (0)",
            "* Sifting patterns (0)",
            "* Tropes (0)",
        ]);
    });

    it("emits `(0)` with no colon for empty sections", () => {
        const out = formatConstructSummary({ actions: [] });
        expect(out).to.include("* Actions (0)");
        expect(out).to.not.include("* Actions (0):");
    });

    it("emits `(N):` followed by bulleted names for populated sections", () => {
        const out = formatConstructSummary({ actions: ["greet", "hug"] });
        expect(out).to.include("* Actions (2):");
        expect(out).to.include("  - greet");
        expect(out).to.include("  - hug");
    });

    it("preserves the order of names as provided (no re-sorting)", () => {
        const out = formatConstructSummary({ actions: ["z-last", "a-first"] });
        const zIdx = out.indexOf("  - z-last");
        const aIdx = out.indexOf("  - a-first");
        expect(zIdx).to.be.lessThan(aIdx);
    });

    it("handles a missing construct key as if it were empty", () => {
        const out = formatConstructSummary({});
        expect(out).to.include("* Actions (0)");
        expect(out).to.include("* Tropes (0)");
    });

    it("ignores unknown construct keys silently", () => {
        // Defensive: a bridge emitting an unexpected key should not crash the summary.
        const out = formatConstructSummary({ actions: [], futurekind: ["x"] });
        expect(out).to.not.include("futurekind");
        expect(out).to.not.include("x");
    });

    it("renders unicode names without truncation", () => {
        const out = formatConstructSummary({ actions: ["ハロー", "café"] });
        expect(out).to.include("  - ハロー");
        expect(out).to.include("  - café");
    });

    it("renders a blank line between sections", () => {
        const out = formatConstructSummary({ actions: ["a"], plans: ["p"] });
        // Actions section, blank line, Action selectors, blank line, Plans, etc.
        expect(out).to.match(/\* Actions.*\n.*- a\n\n\* Action selectors/s);
    });
});
