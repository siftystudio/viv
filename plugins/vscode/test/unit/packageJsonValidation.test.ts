import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * Semantic checks on `package.json` that VS Code's manifest schema and `vsce`
 * don't catch: cross-references between the manifest and extension code, and
 * internal consistency of the `contributes` block.
 */

const pluginRoot = path.resolve(__dirname, "../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, "package.json"), "utf8"));
const extensionSource = fs.readFileSync(path.join(pluginRoot, "extension.ts"), "utf8");

const contributedLanguageIds = new Set<string>(
    (manifest.contributes.languages as Array<{ id: string }>).map((l) => l.id),
);

describe("package.json (semantic)", () => {
    describe("commands", () => {
        const commandIds: string[] = manifest.contributes.commands.map(
            (c: { command: string }) => c.command,
        );

        for (const id of commandIds) {
            it(`${id} is registered in extension.ts`, () => {
                const pattern = new RegExp(`registerCommand\\(\\s*["']${id.replace(/\./g, "\\.")}["']`);
                expect(pattern.test(extensionSource),
                    `command ${id} is contributed but never registered`).to.be.true;
            });
        }
    });

    describe("keybindings", () => {
        const keybindings: Array<{ command: string; when?: string }> = manifest.contributes.keybindings;
        const commandIds = new Set<string>(
            manifest.contributes.commands.map((c: { command: string }) => c.command),
        );

        for (const kb of keybindings) {
            it(`keybinding for ${kb.command} references a contributed command`, () => {
                expect(commandIds.has(kb.command),
                    `keybinding refers to unknown command ${kb.command}`).to.be.true;
            });

            if (kb.when != null) {
                const langIdMatch = kb.when.match(/editorLangId\s*==\s*(\w+)/);
                if (langIdMatch != null) {
                    const langId = langIdMatch[1];
                    it(`when-clause \`${kb.when}\` references a contributed language`, () => {
                        expect(contributedLanguageIds.has(langId),
                            `when-clause references unknown language ${langId}`).to.be.true;
                    });
                }
            }
        }
    });

    describe("menus", () => {
        const menuItems: Array<{ command: string; when?: string }> =
            Object.values(manifest.contributes.menus).flat() as Array<{ command: string; when?: string }>;
        const commandIds = new Set<string>(
            manifest.contributes.commands.map((c: { command: string }) => c.command),
        );

        for (const item of menuItems) {
            it(`menu item for ${item.command} references a contributed command`, () => {
                expect(commandIds.has(item.command),
                    `menu item refers to unknown command ${item.command}`).to.be.true;
            });

            if (item.when != null) {
                const langIdMatch = item.when.match(/resourceLangId\s*==\s*(\w+)/);
                if (langIdMatch != null) {
                    const langId = langIdMatch[1];
                    it(`when-clause \`${item.when}\` references a contributed language`, () => {
                        expect(contributedLanguageIds.has(langId),
                            `menu when-clause references unknown language ${langId}`).to.be.true;
                    });
                }
            }
        }
    });

    describe("configuration property defaults", () => {
        const props: Record<string, { type: string | string[]; default?: unknown }> =
            manifest.contributes.configuration.properties;

        for (const [name, spec] of Object.entries(props)) {
            if (spec.default === undefined) continue;
            it(`${name}'s default matches its declared type`, () => {
                const declared = Array.isArray(spec.type) ? spec.type : [spec.type];
                const actual = typeof spec.default;
                const expectedTypes = declared.map((t) => {
                    if (t === "integer") return "number";
                    return t;
                });
                expect(expectedTypes.includes(actual),
                    `default for ${name} is ${actual}, expected one of ${expectedTypes.join(", ")}`).to.be.true;
            });
        }
    });

    describe("grammar and language bindings", () => {
        it("grammar scopeName references a contributed language", () => {
            const grammars: Array<{ language: string }> = manifest.contributes.grammars;
            for (const g of grammars) {
                expect(contributedLanguageIds.has(g.language),
                    `grammar targets unknown language ${g.language}`).to.be.true;
            }
        });

        it("snippet entries reference contributed languages", () => {
            const snippets: Array<{ language: string }> = manifest.contributes.snippets;
            for (const s of snippets) {
                expect(contributedLanguageIds.has(s.language),
                    `snippet targets unknown language ${s.language}`).to.be.true;
            }
        });
    });
});
