import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * Validates `language-configuration.json`: brackets, auto-closing pairs, and the
 * indentation regexes. The dedent regex is the high-value bit — a prior
 * regression dedented words *starting* with `end`, `close`, `else`, etc.
 * (`endangered`, `elsewhere`), so the word-boundary must hold.
 */
describe("language-configuration.json", () => {
    const config = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../../../language-configuration.json"), "utf8"),
    );

    it("declares the `//` line comment", () => {
        expect(config.comments.lineComment).to.equal("//");
    });

    it("declares bracket pairs for braces, brackets, and parens", () => {
        expect(config.brackets).to.deep.include.members([
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
        ]);
    });

    it("declares auto-closing pairs for braces, brackets, parens, and both quote types", () => {
        const pairs = new Set(config.autoClosingPairs.map((p: { open: string; close: string }) =>
            `${p.open}${p.close}`
        ));
        expect(pairs).to.include.all.keys("{}", "[]", "()", "\"\"", "''");
    });

    it("declares surrounding pairs for the same five kinds", () => {
        const pairs = new Set(config.surroundingPairs.map((p: { open: string; close: string }) =>
            `${p.open}${p.close}`
        ));
        expect(pairs).to.include.all.keys("{}", "[]", "()", "\"\"", "''");
    });

    describe("increaseIndentPattern", () => {
        const pattern = new RegExp(config.indentationRules.increaseIndentPattern);

        it("matches a line ending with `:`", () => {
            expect(pattern.test("action hello:")).to.be.true;
        });

        it("matches a line ending with `:` and trailing whitespace", () => {
            expect(pattern.test("roles:   ")).to.be.true;
        });

        it("does not match a line without a colon", () => {
            expect(pattern.test("action hello")).to.be.false;
        });

        it("does not match a line with `:` in the middle", () => {
            expect(pattern.test("@role: value is a thing")).to.be.false;
        });
    });

    describe("decreaseIndentPattern", () => {
        const pattern = new RegExp(config.indentationRules.decreaseIndentPattern);

        // The word-boundary protection is load-bearing here. Previous regression
        // (fixed in 0.10.0) dedented on any word starting with these prefixes.
        it("matches a leading `end`", () => {
            expect(pattern.test("  end")).to.be.true;
        });

        it("matches a leading `close`", () => {
            expect(pattern.test("  close")).to.be.true;
        });

        it("matches a leading `else`", () => {
            expect(pattern.test("  else")).to.be.true;
        });

        it("matches a leading `elif`", () => {
            expect(pattern.test("  elif x > 0")).to.be.true;
        });

        it("does NOT dedent on `endpoint` (false-dedent guard)", () => {
            expect(pattern.test("  endpoint = 1")).to.be.false;
        });

        it("does NOT dedent on `endure` (false-dedent guard)", () => {
            expect(pattern.test("  endure")).to.be.false;
        });

        it("does NOT dedent on `closet` (false-dedent guard)", () => {
            expect(pattern.test("  closet")).to.be.false;
        });

        it("does NOT dedent on `elsewhere` (false-dedent guard)", () => {
            expect(pattern.test("  elsewhere")).to.be.false;
        });

        it("does NOT dedent on `elifa` (false-dedent guard)", () => {
            expect(pattern.test("  elifa")).to.be.false;
        });

        it("does NOT dedent on a line where `end` appears mid-line", () => {
            expect(pattern.test("  x end")).to.be.false;
        });
    });
});
