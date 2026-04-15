import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { ExpressiveCodeTheme } from "astro-expressive-code";
import { remarkRewriteLinks } from "./src/remark-rewrite-links.mjs";
import { rehypeExternalLinks } from "./src/rehype-external-links.mjs";
import fs from "node:fs";

const vivGrammar = {
    ...JSON.parse(fs.readFileSync("../syntax/viv.tmLanguage.json", "utf-8")),
    name: "viv",
};

const loadVivTheme = (filename) =>
    new ExpressiveCodeTheme(JSON.parse(fs.readFileSync(`../plugins/vscode/themes/${filename}`, "utf-8")));

export default defineConfig({
    site: "https://viv.sifty.studio",
    base: "/",
    markdown: {
        remarkPlugins: [remarkRewriteLinks],
        rehypePlugins: [rehypeExternalLinks],
    },
    integrations: [
        starlight({
            expressiveCode: {
                themes: [loadVivTheme("viv-dark-warm.json"), loadVivTheme("viv-light-warm.json")],
                minSyntaxHighlightingColorContrast: 0,
                shiki: {
                    langs: [vivGrammar, { name: "ebnf", scopeName: "source.ebnf", patterns: [] }],
                },
            },
            markdown: {
                processedDirs: ["./reference/language", "./reference/compiler", "./background", "./introduction", "./quickstart"],
            },
            head: [
                {
                    tag: "meta",
                    attrs: {
                        property: "og:image",
                        content: "https://viv.sifty.studio/social-preview.png",
                    },
                },
                {
                    tag: "meta",
                    attrs: {
                        name: "twitter:image",
                        content: "https://viv.sifty.studio/social-preview.png",
                    },
                },
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
                {
                    tag: "link",
                    attrs: {
                        rel: "stylesheet",
                        href: "https://cdn.jsdelivr.net/npm/@fontsource/commit-mono@latest/400.css",
                    },
                },
                {
                    tag: "link",
                    attrs: {
                        rel: "stylesheet",
                        href: "https://cdn.jsdelivr.net/npm/@fontsource/commit-mono@latest/700.css",
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
            description: "Viv is an engine for emergent narrative.",
            tableOfContents: { maxHeadingLevel: 2 },
            customCss: ["./src/assets/overrides.css"],
            sidebar: [
                { label: "Quickstart", slug: "quickstart" },
                {
                    label: "Introduction",
                    items: [
                        { label: "Overview", slug: "introduction" },
                        { label: "Tour: A Revenge Story", slug: "introduction/tour" },
                    ],
                },
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
                        { label: "Preamble", slug: "reference/language/00-preamble" },
                        { label: "Introduction", slug: "reference/language/01-introduction" },
                        { label: "Lexical elements", slug: "reference/language/02-lexical-elements" },
                        { label: "File structure", slug: "reference/language/03-file-structure" },
                        { label: "Includes", slug: "reference/language/04-includes" },
                        { label: "Entities and symbols", slug: "reference/language/05-entities-and-symbols" },
                        { label: "Names and sigils", slug: "reference/language/06-names" },
                        { label: "Expressions", slug: "reference/language/07-expressions" },
                        { label: "Statements and control flow", slug: "reference/language/08-statements-and-control-flow" },
                        { label: "Roles", slug: "reference/language/09-roles" },
                        { label: "Actions", slug: "reference/language/10-actions" },
                        { label: "Reactions", slug: "reference/language/11-reactions" },
                        { label: "Temporal constraints", slug: "reference/language/12-temporal-constraints" },
                        { label: "Bindings", slug: "reference/language/13-bindings" },
                        { label: "Tropes", slug: "reference/language/14-tropes" },
                        { label: "Queries", slug: "reference/language/15-queries" },
                        { label: "Sifting patterns", slug: "reference/language/16-sifting-patterns" },
                        { label: "Plans", slug: "reference/language/17-plans" },
                        { label: "Selectors", slug: "reference/language/18-selectors" },
                        { label: "Compiler output", slug: "reference/language/19-compiler-output" },
                        { label: "Runtime model", slug: "reference/language/20-runtime-model" },
                        { label: "Appendix A: Implementation notes", slug: "reference/language/21-appendix-a-implementation-notes" },
                        { label: "Glossary", slug: "reference/language/22-glossary" },
                    ],
                },
                {
                    label: "Compiler Reference",
                    items: [
                        { label: "Overview", slug: "reference/compiler" },
                        { label: "Command-Line Interface", slug: "reference/compiler/cli" },
                        { label: "Python API", slug: "reference/compiler/api" },
                        { label: "Troubleshooting", slug: "reference/compiler/troubleshooting" },
                    ],
                },
                { label: "JavaScript Runtime API", link: "/reference/runtimes/js/", attrs: { target: "_blank" } },
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
