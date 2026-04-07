/**
 * Rehype plugin that adds target="_blank" and rel="noopener noreferrer"
 * to all external links (those starting with http:// or https://).
 */
import { visit } from "unist-util-visit";

export function rehypeExternalLinks() {
    return (tree) => {
        visit(tree, "element", (node) => {
            if (node.tagName !== "a") return;
            const href = node.properties?.href;
            if (typeof href === "string" && href.startsWith("http")) {
                node.properties.target = "_blank";
                node.properties.rel = "noopener noreferrer";
            }
        });
    };
}
