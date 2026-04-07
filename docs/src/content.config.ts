import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
    docs: defineCollection({
        loader: glob({
            base: ".",
            pattern: [
                "landing/index.mdx",
                "quickstart/quickstart.md",
                "introduction/introduction.md",
                "language-reference/*.md",
                "background/history-of-viv.md",
            ],
            generateId: ({ entry }) => {
                const id = entry.replace(/\.mdx?$/, "");
                const slugMap: Record<string, string> = {
                    "landing/index": "index",
                    "quickstart/quickstart": "quickstart",
                    "introduction/introduction": "introduction",
                };
                return slugMap[id] ?? id;
            },
        }),
        schema: docsSchema(),
    }),
};
