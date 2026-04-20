import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * Validates each bundled theme JSON file: schema shape, referenced scopes,
 * color-value format. These are ship-as-data assets that can silently break
 * the Marketplace listing without any runtime errors.
 */
interface ThemeEntry {
    readonly label: string;
    readonly uiTheme: string;
    readonly path: string;
}

interface TokenColor {
    readonly name?: string;
    readonly scope?: string | string[];
    readonly settings: {
        readonly foreground?: string;
        readonly background?: string;
        readonly fontStyle?: string;
    };
}

interface ThemeFile {
    readonly name: string;
    readonly type: string;
    readonly colors: Record<string, string>;
    readonly tokenColors: TokenColor[];
}

const HEX_COLOR = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$/;
const VALID_FONT_STYLES = new Set(["", "italic", "bold", "underline", "strikethrough",
    "italic bold", "bold italic"]);

const pluginRoot = path.resolve(__dirname, "../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, "package.json"), "utf8"));
const contributedThemes: ThemeEntry[] = manifest.contributes.themes;

describe("themes (bundled)", () => {
    it("contributes six themes", () => {
        expect(contributedThemes).to.have.lengthOf(6);
    });

    it("covers the dark and light variants of all three families", () => {
        const labels = contributedThemes.map((t) => t.label).sort();
        expect(labels).to.deep.equal([
            "Viv Cool (Dark)",
            "Viv Cool (Light)",
            "Viv Electric (Dark)",
            "Viv Electric (Light)",
            "Viv Warm (Dark)",
            "Viv Warm (Light)",
        ]);
    });

    for (const entry of contributedThemes) {
        describe(entry.label, () => {
            const themePath = path.join(pluginRoot, entry.path);
            let theme: ThemeFile;

            before(() => {
                expect(fs.existsSync(themePath), `missing file ${entry.path}`).to.be.true;
                theme = JSON.parse(fs.readFileSync(themePath, "utf8"));
            });

            it("file exists and parses as JSON", () => {
                expect(theme).to.be.an("object");
            });

            it("name matches contributed label", () => {
                expect(theme.name).to.equal(entry.label);
            });

            it("type matches the uiTheme contribution", () => {
                const expected = entry.uiTheme === "vs-dark" ? "dark" : "light";
                expect(theme.type).to.equal(expected);
            });

            it("sets editor.background and editor.foreground with valid hex colors", () => {
                expect(theme.colors, "colors block").to.be.an("object");
                expect(theme.colors["editor.background"], "editor.background").to.match(HEX_COLOR);
                expect(theme.colors["editor.foreground"], "editor.foreground").to.match(HEX_COLOR);
            });

            it("every `colors` entry is a valid hex color", () => {
                for (const [key, value] of Object.entries(theme.colors)) {
                    expect(value, `colors[${key}]`).to.match(HEX_COLOR);
                }
            });

            it("has a non-empty tokenColors array", () => {
                expect(theme.tokenColors).to.be.an("array").with.length.greaterThan(0);
            });

            it("every tokenColors entry has a valid settings object", () => {
                for (const tc of theme.tokenColors) {
                    expect(tc.settings, `token ${tc.name ?? "(unnamed)"}`).to.be.an("object");
                    if (tc.settings.foreground != null) {
                        expect(tc.settings.foreground, `foreground for ${tc.name}`).to.match(HEX_COLOR);
                    }
                    if (tc.settings.background != null) {
                        expect(tc.settings.background, `background for ${tc.name}`).to.match(HEX_COLOR);
                    }
                    if (tc.settings.fontStyle != null) {
                        expect(VALID_FONT_STYLES.has(tc.settings.fontStyle),
                            `invalid fontStyle ${tc.settings.fontStyle} for ${tc.name}`).to.be.true;
                    }
                }
            });

            it("covers at least the essentials: operators, identifiers, strings, comments", () => {
                const allScopes = new Set<string>();
                for (const tc of theme.tokenColors) {
                    if (tc.scope != null) {
                        const scopes = Array.isArray(tc.scope) ? tc.scope : [tc.scope];
                        scopes.forEach((s) => allScopes.add(s));
                    }
                }
                const essentials = [
                    "keyword.operator.viv",
                    "keyword.other.viv",
                    "string.quoted.double.viv",
                    "comment.line.double-slash.viv",
                ];
                for (const scope of essentials) {
                    expect(allScopes.has(scope), `theme ${entry.label} missing essential scope ${scope}`).to.be.true;
                }
            });
        });
    }
});
