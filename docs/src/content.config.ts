import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
    docs: defineCollection({
        loader: glob({
            base: ".",
            pattern: [
                "index.mdx",
                "quickstart/quickstart.{md,mdx}",
                "introduction/overview.{md,mdx}",
                "introduction/example.md",
                "reference/language/*.{md,mdx}",
                "reference/compiler/**/*.{md,mdx}",
                "background/history-of-viv.md",
            ],
            generateId: ({ entry }) => {
                const id = entry.replace(/\.mdx?$/, "");
                const slugMap: Record<string, string> = {
                    "quickstart/quickstart": "quickstart",
                    "introduction/overview": "introduction",
                    "introduction/example": "introduction/example",
                    "reference/compiler/index": "reference/compiler",
                };
                return slugMap[id] ?? id;
            },
        }),
        schema: docsSchema(),
    }),
};
