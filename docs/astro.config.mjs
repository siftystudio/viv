import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { ExpressiveCodeTheme } from "astro-expressive-code";
import { remarkRewriteLinks } from "./src/remark-rewrite-links.mjs";
import fs from "node:fs";

const vivGrammar = {
    ...JSON.parse(fs.readFileSync("../syntax/viv.tmLanguage.json", "utf-8")),
    name: "viv",
};

const loadVivTheme = (filename) =>
    new ExpressiveCodeTheme(JSON.parse(fs.readFileSync(`../plugins/vscode/themes/${filename}`, "utf-8")));

export default defineConfig({
    site: "https://viv.sifty.studio",
    base: "/docs",
    markdown: {
        remarkPlugins: [remarkRewriteLinks],
    },
    integrations: [
        starlight({
            expressiveCode: {
                themes: [loadVivTheme("viv-dark-warm.json"), loadVivTheme("viv-light-warm.json")],
                minSyntaxHighlightingColorContrast: 0,
                shiki: {
                    langs: [vivGrammar],
                },
            },
            markdown: {
                processedDirs: ["./language-reference", "./background", "./introduction", "./quickstart"],
            },
            head: [
                {
                    tag: "link",
                    attrs: {
                        rel: "preconnect",
                        href: "https://fonts.googleapis.com",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "preconnect",
                        href: "https://fonts.gstatic.com",
                        crossorigin: "",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "stylesheet",
                        href: "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap",
                    },
                },
            ],
            title: "Viv",
            favicon: "/viv-icon.png",
            logo: {
                light: "./src/assets/viv-icon-light.svg",
                dark: "./src/assets/viv-icon-dark.svg",
                replacesTitle: false,
            },
            description: "Documentation for the Viv system for emergent narrative.",
            customCss: ["./src/assets/overrides.css"],
            sidebar: [
                { label: "Quickstart", slug: "quickstart" },
                { label: "Introduction", slug: "introduction" },
                {
                    label: "Background",
                    items: [
                        { label: "Viv: A Brief History", slug: "background/history-of-viv" },
                        { label: "Curating Simulated Storyworlds", link: "/background/curating_simulated_storyworlds.pdf", attrs: { target: "_blank" } },
                    ],
                },
                {
                    label: "Language Reference",
                    items: [
                        { label: "Preamble", slug: "language-reference/00-preamble" },
                        { label: "Introduction", slug: "language-reference/01-introduction" },
                        { label: "Lexical elements", slug: "language-reference/02-lexical-elements" },
                        { label: "File structure", slug: "language-reference/03-file-structure" },
                        { label: "Includes", slug: "language-reference/04-includes" },
                        { label: "Entities and symbols", slug: "language-reference/05-entities-and-symbols" },
                        { label: "Names and sigils", slug: "language-reference/06-names" },
                        { label: "Expressions", slug: "language-reference/07-expressions" },
                        { label: "Statements and control flow", slug: "language-reference/08-statements-and-control-flow" },
                        { label: "Roles", slug: "language-reference/09-roles" },
                        { label: "Actions", slug: "language-reference/10-actions" },
                        { label: "Reactions", slug: "language-reference/11-reactions" },
                        { label: "Temporal constraints", slug: "language-reference/12-temporal-constraints" },
                        { label: "Bindings", slug: "language-reference/13-bindings" },
                        { label: "Tropes", slug: "language-reference/14-tropes" },
                        { label: "Queries", slug: "language-reference/15-queries" },
                        { label: "Sifting patterns", slug: "language-reference/16-sifting-patterns" },
                        { label: "Plans", slug: "language-reference/17-plans" },
                        { label: "Selectors", slug: "language-reference/18-selectors" },
                        { label: "Compiler output", slug: "language-reference/19-compiler-output" },
                        { label: "Runtime model", slug: "language-reference/20-runtime-model" },
                        { label: "Appendix A: Implementation notes", slug: "language-reference/21-appendix-a-implementation-notes" },
                        { label: "Glossary", slug: "language-reference/22-glossary" },
                    ],
                },
                { label: "JavaScript Runtime API", link: "/api/runtimes/js/", attrs: { target: "_blank" } },
                {
                    label: "Components",
                    items: [
                        { label: "Compiler", link: "https://pypi.org/project/viv-compiler/", attrs: { target: "_blank" } },
                        { label: "JavaScript Runtime", link: "https://www.npmjs.com/package/@siftystudio/viv-runtime", attrs: { target: "_blank" } },
                        { label: "JetBrains Plugin", link: "https://plugins.jetbrains.com/plugin/31012-viv", attrs: { target: "_blank" } },
                        { label: "VS Code Extension", link: "https://marketplace.visualstudio.com/items?itemName=siftystudio.viv", attrs: { target: "_blank" } },
                        { label: "Sublime Text Package", link: "https://github.com/siftystudio/viv/tree/main/plugins/sublime", attrs: { target: "_blank" } },
                        { label: "Claude Code Plugin", link: "https://github.com/siftystudio/viv/tree/main/plugins/claude", attrs: { target: "_blank" } },
                    ],
                },
            ],
        }),
    ],
});
