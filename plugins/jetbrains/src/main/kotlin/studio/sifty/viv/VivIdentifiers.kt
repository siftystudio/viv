package studio.sifty.viv

import com.intellij.openapi.editor.Editor

/**
 * Shared identifier detection and occurrence-finding utilities.
 * Used by rename, highlight usages, completion, and go-to-declaration handlers.
 */
object VivIdentifiers {

    val CONSTRUCT_HEADER = Regex(
        "^[ \\t]*(?:(?:reserved|template)\\s+)?(?:action-selector|plan-selector|action|plan|query|pattern|trope)\\s+",
        RegexOption.MULTILINE
    )

    data class VivIdentifier(
        val fullToken: String,
        val baseName: String,
        val prefix: String,
        val kind: Kind,
        val constructType: String? = null,
    )

    enum class Kind { ROLE, SCRATCH, LOCAL, ENUM, FUNCTION, CONSTRUCT }

    // ========================================================================
    // Identifier detection
    // ========================================================================

    fun findIdentifierAtCaret(editor: Editor): VivIdentifier? {
        return findIdentifierAtOffset(editor.document.text, editor.caretModel.offset)
    }

    fun findIdentifierAtOffset(text: String, offset: Int): VivIdentifier? {
        if (offset >= text.length) return null

        var start = offset
        while (start > 0 && isIdentChar(text[start - 1])) start--
        var end = offset
        while (end < text.length && isIdentChar(text[end])) end++
        if (end < text.length && text[end] == '*') end++

        var sigilStart = start
        if (sigilStart > 0 && (text[sigilStart - 1] == '@' || text[sigilStart - 1] == '&')) sigilStart--
        if (sigilStart > 0 && (text[sigilStart - 1] == '$' || text[sigilStart - 1] == '_')) sigilStart--
        if (sigilStart > 0 && text[sigilStart - 1] == '~') sigilStart--
        if (sigilStart > 0 && text[sigilStart - 1] == '#') sigilStart--

        val fullToken = text.substring(sigilStart, end)
        if (fullToken.isEmpty()) return null

        return when {
            fullToken.startsWith("\$@") || fullToken.startsWith("\$&") -> {
                val base = fullToken.removeSuffix("*")
                VivIdentifier(fullToken, base, base.substring(0, 2), Kind.SCRATCH)
            }
            fullToken.startsWith("_@") || fullToken.startsWith("_&") -> {
                val base = fullToken.removeSuffix("*")
                VivIdentifier(fullToken, base, base.substring(0, 2), Kind.LOCAL)
            }
            fullToken.startsWith("@") || fullToken.startsWith("&") -> {
                val base = fullToken.removeSuffix("*")
                VivIdentifier(fullToken, base, base.substring(0, 1), Kind.ROLE)
            }
            fullToken.startsWith("#") -> VivIdentifier(fullToken, fullToken, "#", Kind.ENUM)
            fullToken.startsWith("~") -> VivIdentifier(fullToken, fullToken, "~", Kind.FUNCTION)
            fullToken.matches(BARE_IDENT_PATTERN) -> detectConstructName(text, fullToken, start)
            else -> null
        }
    }

    private fun detectConstructName(text: String, token: String, tokenStart: Int): VivIdentifier? {
        var i = tokenStart - 1
        while (i >= 0 && text[i] == ' ') i--
        if (i < 0) return null
        val kwEnd = i + 1
        while (i >= 0 && (text[i].isLetterOrDigit() || text[i] == '-')) i--
        val keyword = text.substring(i + 1, kwEnd)

        val constructType = when (keyword) {
            "action" -> "action"
            "plan" -> "plan"
            "action-selector" -> "action-selector"
            "plan-selector" -> "plan-selector"
            "query" -> "query"
            "pattern" -> "pattern"
            "trope" -> "trope"
            "from" -> "action"
            else -> return null
        }
        return VivIdentifier(token, token, "", Kind.CONSTRUCT, constructType)
    }

    // ========================================================================
    // Occurrence finding
    // ========================================================================

    /**
     * Finds occurrences of [ident] within the given text, using [caretOffset]
     * to determine construct boundaries via header scanning.
     */
    fun findOccurrences(text: String, ident: VivIdentifier, caretOffset: Int): List<Pair<Int, Int>> {
        return when (ident.kind) {
            Kind.ROLE -> {
                val (blockStart, blockEnd) = findConstructBoundaries(text, caretOffset)
                findRenameableOccurrences(text, ident.baseName, blockStart, blockEnd)
            }
            Kind.SCRATCH, Kind.LOCAL, Kind.ENUM -> {
                val (blockStart, blockEnd) = findConstructBoundaries(text, caretOffset)
                findSimpleOccurrences(text, ident.baseName, blockStart, blockEnd)
            }
            Kind.FUNCTION -> findSimpleOccurrences(text, ident.baseName, 0, text.length)
            Kind.CONSTRUCT -> findTypedConstructOccurrences(text, ident.baseName, ident.constructType!!)
        }
    }

    /**
     * Finds occurrences of [ident] within a specific block range.
     * Used by index-backed handlers that already know the construct boundaries.
     */
    fun findOccurrencesInBlock(
        text: String, ident: VivIdentifier, blockStart: Int, blockEnd: Int
    ): List<Pair<Int, Int>> {
        return when (ident.kind) {
            Kind.ROLE -> findRenameableOccurrences(text, ident.baseName, blockStart, blockEnd)
            Kind.SCRATCH, Kind.LOCAL, Kind.ENUM -> findSimpleOccurrences(text, ident.baseName, blockStart, blockEnd)
            Kind.FUNCTION -> findSimpleOccurrences(text, ident.baseName, 0, text.length)
            Kind.CONSTRUCT -> findTypedConstructOccurrences(text, ident.baseName, ident.constructType!!)
        }
    }

    fun findConstructBoundaries(text: String, offset: Int): Pair<Int, Int> {
        val headers = CONSTRUCT_HEADER.findAll(text).map { it.range.first }.toList()
        val blockStart = headers.lastOrNull { it <= offset } ?: 0
        val blockEnd = headers.firstOrNull { it > offset } ?: text.length
        return Pair(blockStart, blockEnd)
    }

    fun findRenameableOccurrences(
        text: String, baseName: String, blockStart: Int, blockEnd: Int
    ): List<Pair<Int, Int>> {
        val occurrences = mutableListOf<Pair<Int, Int>>()
        val block = text.substring(blockStart, blockEnd)
        var searchFrom = 0
        while (true) {
            val idx = block.indexOf(baseName, searchFrom)
            if (idx < 0) break
            var tokenEnd = idx + baseName.length
            if (tokenEnd < block.length && block[tokenEnd] == '*') tokenEnd++
            val charBefore = if (idx > 0) block[idx - 1] else ' '
            val charAfter = if (tokenEnd < block.length) block[tokenEnd] else ' '
            val validBefore = !charBefore.isLetterOrDigit() && charBefore != '_' && charBefore != '-' && charBefore != '@' && charBefore != '&' && charBefore != '$'
            val validAfter = !charAfter.isLetterOrDigit() && charAfter != '_' && charAfter != '-'
            if (validBefore && validAfter && !isBindingLHS(block, idx, baseName.length)) {
                occurrences.add(Pair(blockStart + idx, blockStart + tokenEnd))
            }
            searchFrom = idx + 1
        }
        return occurrences
    }

    fun findTypedConstructOccurrences(
        text: String, name: String, constructType: String
    ): List<Pair<Int, Int>> {
        val escapedName = Regex.escape(name)
        val ident = "(?<![A-Za-z0-9_-])${escapedName}(?![A-Za-z0-9_-])"

        val patterns = when (constructType) {
            "action" -> listOf(
                Regex("(?:reserved\\s+|template\\s+)?action\\s+($ident)"),
                Regex("from\\s+($ident)"),
                Regex("queue\\s+action\\s+($ident)"),
            )
            "plan" -> listOf(
                Regex("plan\\s+($ident)"),
                Regex("queue\\s+plan\\s+($ident)"),
            )
            "action-selector" -> listOf(
                Regex("(?:reserved\\s+)?action-selector\\s+($ident)"),
                Regex("queue\\s+action-selector\\s+($ident)"),
            )
            "plan-selector" -> listOf(
                Regex("(?:reserved\\s+)?plan-selector\\s+($ident)"),
                Regex("queue\\s+plan-selector\\s+($ident)"),
            )
            "query" -> listOf(
                Regex("query\\s+($ident)"),
                Regex("search\\s+query\\s+($ident)"),
            )
            "pattern" -> listOf(
                Regex("pattern\\s+($ident)"),
                Regex("sift\\s+pattern\\s+($ident)"),
            )
            "trope" -> listOf(
                Regex("trope\\s+($ident)"),
                Regex("fit\\s+trope\\s+($ident)"),
                Regex("fits\\s+trope\\s+($ident)"),
            )
            else -> return emptyList()
        }

        val occurrences = mutableListOf<Pair<Int, Int>>()
        val seen = mutableSetOf<Int>()
        for (pattern in patterns) {
            for (match in pattern.findAll(text)) {
                val group = match.groups[1] ?: continue
                if (seen.add(group.range.first)) {
                    occurrences.add(Pair(group.range.first, group.range.last + 1))
                }
            }
        }
        return occurrences
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    fun isBindingLHS(block: String, idx: Int, nameLen: Int): Boolean {
        val afterName = idx + nameLen
        if (afterName >= block.length) return false
        var i = afterName
        if (i < block.length && block[i] == '*') i++
        if (i >= block.length || block[i] != ':') return false
        i++
        while (i < block.length && block[i] == ' ') i++
        return i < block.length && (block[i] == '@' || block[i] == '&' || block[i] == '$' || block[i] == '_')
    }

    fun isIdentChar(c: Char): Boolean = c.isLetterOrDigit() || c == '_' || c == '-'

    fun stripPrefix(name: String): String =
        name.removePrefix("@").removePrefix("&").removePrefix("#").removePrefix("~")
            .removePrefix("$@").removePrefix("$&").removePrefix("_@").removePrefix("_&")
            .removePrefix("$").removePrefix("_")

    private fun findSimpleOccurrences(
        text: String, token: String, rangeStart: Int, rangeEnd: Int
    ): List<Pair<Int, Int>> {
        val occurrences = mutableListOf<Pair<Int, Int>>()
        val block = text.substring(rangeStart, rangeEnd)
        var searchFrom = 0
        while (true) {
            val idx = block.indexOf(token, searchFrom)
            if (idx < 0) break
            val absStart = rangeStart + idx
            val absEnd = absStart + token.length
            val charBefore = if (idx > 0) block[idx - 1] else ' '
            val charAfter = if (idx + token.length < block.length) block[idx + token.length] else ' '
            val validBefore = !charBefore.isLetterOrDigit() && charBefore != '_' && charBefore != '-' && charBefore != '@' && charBefore != '&' && charBefore != '$' && charBefore != '#' && charBefore != '~'
            val validAfter = !charAfter.isLetterOrDigit() && charAfter != '_' && charAfter != '-'
            if (validBefore && validAfter) {
                occurrences.add(Pair(absStart, absEnd))
            }
            searchFrom = idx + 1
        }
        return occurrences
    }

    private val BARE_IDENT_PATTERN = Regex("[A-Za-z_][A-Za-z0-9_-]*")
}
