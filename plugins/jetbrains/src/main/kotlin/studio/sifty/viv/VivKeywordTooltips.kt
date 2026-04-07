package studio.sifty.viv

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * Data-driven keyword tooltip lookup backed by `tooltips/viv-tooltips.json`.
 *
 * Each entry maps a keyword trigger (e.g., `roles:`) to tooltip text, scoped
 * to one or more grammar-rule contexts (e.g., `action_roles`, `plan_roles`).
 * The [getTooltip] method finds the first entry whose trigger and context
 * match the token text and its PSI ancestor chain.
 */
object VivKeywordTooltips {

    data class TooltipEntry(
        val trigger: String,
        val context: Any, // String or List<String> — Gson deserializes accordingly
        val tooltip: String,
        val nextToken: String? = null // When set, the next leaf sibling must have this text
    )

    private val entries: List<TooltipEntry> by lazy { loadEntries() }

    private fun loadEntries(): List<TooltipEntry> {
        val stream = VivKeywordTooltips::class.java.getResourceAsStream("/tooltips/viv-tooltips.json")
            ?: return emptyList()
        val json = stream.bufferedReader().use { it.readText() }
        val type = object : TypeToken<List<TooltipEntry>>() {}.type
        return Gson().fromJson(json, type)
    }

    /**
     * Returns the tooltip for [keyword] when it appears under a PSI node whose
     * element-type name is one of [ancestorTypes]. Checks multiple ancestor
     * levels because the keyword token may be nested inside intermediate nodes.
     *
     * Trigger matching accounts for the fact that JSON triggers may include
     * trailing punctuation (`:` or `;`) that the lexer emits as a separate
     * token. A leaf token `"conditions"` matches trigger `"conditions:"`.
     *
     * When [nextSiblingText] is provided, entries with a `nextToken` constraint
     * are checked against it. Pass the text of the next visible leaf sibling,
     * or null if there is no next sibling.
     */
    fun getTooltip(keyword: String, ancestorTypes: List<String>, nextSiblingText: String? = null): String? {
        return entries.find { entry ->
            matchesTrigger(entry.trigger, keyword) &&
                ancestorTypes.any { matchesContext(entry.context, it) } &&
                (entry.nextToken == null || entry.nextToken == nextSiblingText)
        }?.tooltip
    }

    /**
     * Checks whether a JSON trigger string matches the leaf [tokenText].
     * Handles trailing `:` and `;` that the lexer splits into separate tokens.
     */
    private fun matchesTrigger(trigger: String, tokenText: String): Boolean {
        if (trigger == tokenText) return true
        // Trigger has a trailing colon/semicolon that the lexer strips:
        // "conditions:" should match token text "conditions"
        if (trigger.endsWith(":") || trigger.endsWith(";")) {
            return trigger.dropLast(1) == tokenText
        }
        return false
    }

    /**
     * Extracts the base element-type name from a context string, stripping any
     * parenthetical decorator (e.g., `"selector_header (action-selector)"` becomes
     * `"selector_header"`). Decorators are documentation-only and don't participate
     * in PSI matching.
     */
    private fun baseType(context: String): String {
        val spaceIdx = context.indexOf(' ')
        return if (spaceIdx >= 0) context.substring(0, spaceIdx) else context
    }

    /**
     * Normalizes a PSI element-type toString() value for comparison against JSON
     * context strings. Handles two quirks:
     *   1. GrammarKit's toString() includes a class prefix, e.g. `VivElementType.ACTION_CONDITIONS`.
     *      We strip everything up to and including the last `.`.
     *   2. GrammarKit element types are UPPER_CASE; JSON contexts are lower_case.
     *      We lowercase the result.
     */
    private fun normalizePsiType(psiType: String): String {
        val dotIdx = psiType.lastIndexOf('.')
        val bare = if (dotIdx >= 0) psiType.substring(dotIdx + 1) else psiType
        return bare.lowercase()
    }

    @Suppress("UNCHECKED_CAST")
    private fun matchesContext(context: Any, psiType: String): Boolean {
        val normalized = normalizePsiType(psiType)
        return when (context) {
            is String -> baseType(context) == normalized
            is List<*> -> (context as List<String>).any { baseType(it) == normalized }
            else -> false
        }
    }
}
