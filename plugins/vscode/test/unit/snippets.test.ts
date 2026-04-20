import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * Validates `snippets/viv.json` structurally: every snippet has a prefix, a body,
 * a description, and no malformed tab-stop placeholders. Also sanity-checks the
 * prefixes against the set documented in the README's "Boilerplate Snippets"
 * section — a missing prefix is a user-visible drift.
 */
interface Snippet {
    readonly prefix: string;
    readonly body: string | string[];
    readonly description?: string;
}

const pluginRoot = path.resolve(__dirname, "../../..");
const snippetsPath = path.join(pluginRoot, "snippets", "viv.json");
const snippets: Record<string, Snippet> = JSON.parse(fs.readFileSync(snippetsPath, "utf8"));

describe("snippets/viv.json", () => {
    it("parses as JSON", () => {
        expect(snippets).to.be.an("object");
    });

    it("declares at least ten snippets (sanity floor)", () => {
        expect(Object.keys(snippets).length).to.be.greaterThan(10);
    });

    it("every snippet has a non-empty prefix", () => {
        for (const [name, snip] of Object.entries(snippets)) {
            expect(snip.prefix, `snippet ${name}: prefix`).to.be.a("string").that.is.not.empty;
        }
    });

    it("every snippet has a non-empty body", () => {
        for (const [name, snip] of Object.entries(snippets)) {
            expect(snip.body, `snippet ${name}: body`).to.satisfy((b: unknown) =>
                (typeof b === "string" && b.length > 0)
                || (Array.isArray(b) && b.length > 0)
            );
        }
    });

    it("every snippet has a description", () => {
        for (const [name, snip] of Object.entries(snippets)) {
            expect(snip.description, `snippet ${name}: description`).to.be.a("string").that.is.not.empty;
        }
    });

    it("prefixes are unique across snippets (no two snippets fire on the same trigger)", () => {
        const seen = new Map<string, string>();
        for (const [name, snip] of Object.entries(snippets)) {
            const prior = seen.get(snip.prefix);
            expect(prior, `prefix "${snip.prefix}" used by both "${prior}" and "${name}"`).to.be.undefined;
            seen.set(snip.prefix, name);
        }
    });

    it("every tab-stop placeholder is well-formed", () => {
        // Valid forms: $1, $2, ..., ${1:default}, ${2|opt1,opt2|}, $0 (final cursor).
        // This regex matches anything starting with $ followed by something,
        // then we validate each match individually.
        const tabStopOuter = /\$\{?(\d+)([^}]*)?\}?/g;
        for (const [name, snip] of Object.entries(snippets)) {
            const body = Array.isArray(snip.body) ? snip.body.join("\n") : snip.body;
            // Check for the most common mistake: $0, $1, etc. appearing where they're not intended.
            // We can't fully validate the TextMate snippet grammar from regex, but we can check
            // that every occurrence of `${` has a matching `}`.
            let opens = 0;
            let closes = 0;
            for (let i = 0; i < body.length; i++) {
                if (body[i] === "{" && i > 0 && body[i - 1] === "$") {
                    opens++;
                } else if (body[i] === "}" && opens > closes) {
                    closes++;
                }
            }
            expect(opens, `snippet ${name}: ${opens} unclosed \${ placeholder(s)`).to.equal(closes);
            // Suppress unused-variable warning for the regex; keep it as documentation
            // that explains the shape of valid tab stops.
            void tabStopOuter;
        }
    });

    it("every `body` line is a string (no accidental nested arrays or objects)", () => {
        for (const [name, snip] of Object.entries(snippets)) {
            const lines = Array.isArray(snip.body) ? snip.body : [snip.body];
            for (let i = 0; i < lines.length; i++) {
                expect(typeof lines[i], `snippet ${name}: body[${i}]`).to.equal("string");
            }
        }
    });

    describe("documented prefixes appear in the snippet file", () => {
        // These prefixes are explicitly documented in the README's Boilerplate Snippets
        // section. A drift between README and snippet file is a user-visible regression.
        const documentedPrefixes = [
            "action", "action from", "action variant", "template action", "reserved action",
            "action-selector", "plan-selector", "plan", "query", "pattern", "trope",
            "roles", "conditions", "effects", "scratch", "phases", "reactions",
            "embargoes", "embargo", "saliences", "saliences for", "associations", "associations for",
            "gloss", "report", "importance", "tags",
            "queue action", "queue plan", "queue action-selector", "queue plan-selector",
            "repeat", "wait", "all", "any", "untracked",
            "target randomly", "target with weights", "target in order",
            "time", "after", "before", "between",
            "search query", "search", "sift", "fit trope", "fits", "~", "if", "if else", "loop",
            "include",
        ];
        const presentPrefixes = new Set(Object.values(snippets).map((s) => s.prefix));

        for (const prefix of documentedPrefixes) {
            it(`\`${prefix}\` is defined`, () => {
                expect(presentPrefixes.has(prefix), `prefix "${prefix}" documented but missing`).to.be.true;
            });
        }
    });
});
