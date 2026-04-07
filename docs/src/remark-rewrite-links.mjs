/**
 * Remark plugin that rewrites relative .md links to Starlight directory-style routes.
 *
 * Examples of the transforms:
 *   [Actions](10-actions.md)           -> [Actions](../10-actions/)
 *   [Actions](10-actions.md#section)   -> [Actions](../10-actions/#section)
 *   [Model](20-runtime-model#adapter)  -> [Model](../20-runtime-model/#adapter)
 */
import { visit } from "unist-util-visit";

export function remarkRewriteLinks() {
    return (tree) => {
        visit(tree, "link", (node) => {
            const url = node.url;
            // Skip external links, absolute paths, and anchor-only links
            if (url.startsWith("http") || url.startsWith("/") || url.startsWith("#")) return;
            if (url.includes(".md")) {
                // 10-actions.md → ../10-actions/
                // 10-actions.md#section → ../10-actions/#section
                node.url = url
                    .replace(/\.md(#|$)/, (_, hash) => "/" + (hash || ""))
                    .replace(/^(?!\.\.)/, "../");
            } else if (/^\d{2}-[a-z]/.test(url)) {
                // Bare chapter references like 20-runtime-model#host-application
                const [path, fragment] = url.split("#");
                node.url = `../${path}/${fragment ? "#" + fragment : ""}`;
            }
        });
    };
}
