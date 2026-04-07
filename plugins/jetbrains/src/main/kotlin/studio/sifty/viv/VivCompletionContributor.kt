package studio.sifty.viv

import com.intellij.codeInsight.completion.CompletionContributor
import com.intellij.codeInsight.completion.CompletionParameters
import com.intellij.codeInsight.completion.CompletionProvider
import com.intellij.codeInsight.completion.CompletionResultSet
import com.intellij.codeInsight.completion.CompletionType
import com.intellij.codeInsight.completion.PlainPrefixMatcher
import com.intellij.codeInsight.lookup.AutoCompletionPolicy
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.patterns.PlatformPatterns
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.TokenSet
import com.intellij.util.ProcessingContext
import studio.sifty.viv.psi.*

/**
 * Provides autocompletion for Viv identifiers, backed by [VivProjectIndex].
 *
 * - Role names (`@name`, `&name`) — from the enclosing construct's roles, including inherited
 * - Scratch variables (`$@name`) — from the enclosing construct's scratch section
 * - Local variables (`_@name`) — from the enclosing `loop`/`for` block (text-scanned)
 * - Enum tokens (`#NAME`) — from all occurrences across the entire project
 * - Custom functions (`~name`) — from all occurrences across the entire project
 * - Construct names — after keywords like `queue action`, `from`, `sift pattern`, etc.
 * - Tags — bare identifiers in `tags:`, `associations:`, and query tag/association predicates
 */
class VivCompletionContributor : CompletionContributor() {

    init {
        extend(CompletionType.BASIC, PlatformPatterns.psiElement(), VivIdentifierCompletionProvider())
    }

    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun invokeAutoPopup(position: com.intellij.psi.PsiElement, typeChar: Char): Boolean {
        if (position.containingFile !is VivFile) return false
        return when (typeChar) {
            '@', '&', '$', '_', '#', '~' -> true
            ' ' -> {
                // Only auto-popup after keywords that trigger construct-name completion
                val text = position.text
                text in KEYWORD_TRIGGERS
            }
            else -> false
        }
    }

    companion object {
        /**
         * Keywords that precede a space which should trigger construct-name completion.
         * Checked against the PsiElement text at the caret in [invokeAutoPopup].
         */
        private val KEYWORD_TRIGGERS = setOf(
            "action", "plan", "query", "pattern", "trope", "from",
            "action-selector", "plan-selector",
        )
    }
}

/**
 * Provides sigil-aware identifier completion for all Viv identifier kinds.
 *
 * Delegates to per-kind completion methods for roles, scratch variables, local variables,
 * enum tokens, function calls, and construct names.
 */
internal class VivIdentifierCompletionProvider : CompletionProvider<CompletionParameters>() {

    override fun addCompletions(
        parameters: CompletionParameters,
        context: ProcessingContext,
        result: CompletionResultSet,
    ) {
        val file = parameters.originalFile
        if (file !is VivFile) return
        val project = file.project
        val editor = parameters.editor
        val text = editor.document.text
        val offset = parameters.offset
        val vFile = file.virtualFile
        // Suppress all sigil-based completions inside strings and comments
        val elementAtCaret = file.findElementAt(offset)
        val tokenType = elementAtCaret?.node?.elementType
        val inStringOrComment = tokenType != null && tokenType in SUPPRESSED_CONTEXTS
        if (inStringOrComment) {
            // Construct-name completion is also invalid inside strings/comments
            return
        }
        // Otherwise, run all completion providers
        val idx = VivProjectIndex.getInstance(project)
        val construct = if (vFile != null) idx.getConstructAt(vFile, offset) else null
        completeRoles(construct, idx, text, offset, result)
        completeScratchVars(construct, text, offset, result)
        completeLocalVars(construct, text, offset, result)
        completeEnumTokens(idx, text, offset, result)
        completeFunctionCalls(idx, text, offset, result)
        completeConstructNames(idx, text, offset, result)
        completeTags(idx, parameters, text, offset, result)
    }

    /** Roles: triggered by `@` or `&`, includes inherited roles from parent actions. */
    private fun completeRoles(
        construct: ConstructInfo?, idx: VivProjectIndex,
        text: String, offset: Int, result: CompletionResultSet,
    ) {
        val prefix = findPrefixMatching(text, offset, charArrayOf('@', '&')) ?: return
        val prefixed = result.withPrefixMatcher(PlainPrefixMatcher(prefix))
        if (construct != null) {
            for (role in idx.getAllRoles(construct)) {
                if (role.fullName.first() == prefix.first()) {
                    val lookup = role.fullName + if (role.isGroup) "*" else ""
                    prefixed.addElement(
                        LookupElementBuilder.create(lookup).withTypeText("role", true).bold()
                            .withAutoCompletionPolicy(AutoCompletionPolicy.NEVER_AUTOCOMPLETE)
                    )
                }
            }
        } else {
            val (blockStart, blockEnd) = VivIdentifiers.findConstructBoundaries(text, offset)
            val block = text.substring(blockStart, blockEnd)
            val rolesIdx = block.indexOf("roles:")
            if (rolesIdx >= 0) {
                for (match in ROLE_DEF_PATTERN.findAll(block.substring(rolesIdx))) {
                    val role = match.groupValues[1]
                    if (role.first() == prefix.first()) {
                        prefixed.addElement(
                            LookupElementBuilder.create(role).withTypeText("role", true).bold()
                                .withAutoCompletionPolicy(AutoCompletionPolicy.NEVER_AUTOCOMPLETE)
                        )
                    }
                }
            }
        }
    }

    /** Scratch variables: triggered by `$@` or `$&`, from the enclosing construct's index. */
    private fun completeScratchVars(
        construct: ConstructInfo?, text: String, offset: Int, result: CompletionResultSet,
    ) {
        val prefix = findScratchPrefix(text, offset) ?: return
        val prefixed = result.withPrefixMatcher(PlainPrefixMatcher(prefix))
        if (construct != null) {
            for (v in construct.scratchVars) {
                prefixed.addElement(
                    LookupElementBuilder.create(v.fullName).withTypeText("scratch", true).bold()
                )
            }
        } else {
            val (blockStart, blockEnd) = VivIdentifiers.findConstructBoundaries(text, offset)
            val block = text.substring(blockStart, blockEnd)
            for (match in SCRATCH_DEF_PATTERN.findAll(block)) {
                prefixed.addElement(
                    LookupElementBuilder.create(match.groupValues[1]).withTypeText("scratch", true).bold()
                )
            }
        }
    }

    /** Local variables: triggered by `_@` or `_&`, text-scanned within the construct. */
    private fun completeLocalVars(
        construct: ConstructInfo?, text: String, offset: Int, result: CompletionResultSet,
    ) {
        val prefix = findLocalPrefix(text, offset) ?: return
        val prefixed = result.withPrefixMatcher(PlainPrefixMatcher(prefix))
        val blockStart: Int
        val blockEnd: Int
        if (construct != null) {
            blockStart = construct.headerOffset
            blockEnd = construct.bodyEnd
        } else {
            val (bs, be) = VivIdentifiers.findConstructBoundaries(text, offset)
            blockStart = bs
            blockEnd = be
        }
        val block = text.substring(blockStart, blockEnd)
        val relOffset = offset - blockStart
        for (match in LOCAL_VAR_INTRO_PATTERN.findAll(block)) {
            val varName = match.groupValues[1]
            if (match.range.first < relOffset) {
                prefixed.addElement(
                    LookupElementBuilder.create(varName).withTypeText("local", true).bold()
                )
            }
        }
    }

    /** Enum tokens: triggered by `#`, from all occurrences across the entire project. */
    private fun completeEnumTokens(
        idx: VivProjectIndex, text: String, offset: Int, result: CompletionResultSet,
    ) {
        val prefix = findPrefixMatching(text, offset, charArrayOf('#')) ?: return
        val prefixed = result.withPrefixMatcher(PlainPrefixMatcher(prefix))
        val tokens = idx.getAllEnumTokens()
        if (tokens.isNotEmpty()) {
            for (token in tokens) {
                prefixed.addElement(LookupElementBuilder.create(token).withTypeText("enum", true))
            }
        } else {
            val seen = mutableSetOf<String>()
            for (match in ENUM_PATTERN.findAll(text)) {
                val token = match.groupValues[1]
                if (seen.add(token)) {
                    prefixed.addElement(LookupElementBuilder.create(token).withTypeText("enum", true))
                }
            }
        }
    }

    /** Custom functions: triggered by `~`, from all occurrences across the entire project. */
    private fun completeFunctionCalls(
        idx: VivProjectIndex, text: String, offset: Int, result: CompletionResultSet,
    ) {
        val prefix = findPrefixMatching(text, offset, charArrayOf('~')) ?: return
        val prefixed = result.withPrefixMatcher(PlainPrefixMatcher(prefix))
        val funcs = idx.getAllFunctionNames()
        if (funcs.isNotEmpty()) {
            for (funcName in funcs) {
                prefixed.addElement(LookupElementBuilder.create(funcName).withTypeText("function", true))
            }
        } else {
            val seen = mutableSetOf<String>()
            for (match in FUNCTION_PATTERN.findAll(text)) {
                val funcName = match.groupValues[1]
                if (seen.add(funcName)) {
                    prefixed.addElement(LookupElementBuilder.create(funcName).withTypeText("function", true))
                }
            }
        }
    }

    /** Construct names: triggered after keywords like `queue action`, `from`, etc. */
    private fun completeConstructNames(
        idx: VivProjectIndex, text: String, offset: Int, result: CompletionResultSet,
        inStringOrComment: Boolean = false,
    ) {
        // Suppress inside strings and comments — construct names aren't valid there
        if (inStringOrComment) return
        val lineStart = text.lastIndexOf('\n', offset - 1) + 1
        val lineBefore = text.substring(lineStart, offset)
        val trimmed = lineBefore.trimEnd()
        val normalized = trimmed.replace(Regex("\\s+"), " ")
        val trigger = CONSTRUCT_NAME_TRIGGERS.firstOrNull { t ->
            normalized.endsWith(t) && (normalized.length == t.length || normalized[normalized.length - t.length - 1].isWhitespace())
        }
        // Special handling for "from": only match in action header context
        if (trigger == "from") {
            val headerPattern = Regex("""^\s*(?:reserved\s+|template\s+)*action\s+\S+\s+from\s*$""")
            if (!headerPattern.matches(trimmed)) return
        }
        // Determine what type of constructs to offer
        val expectedType: ConstructType? = if (trigger != null) {
            TRIGGER_TO_TYPE[trigger]
        } else {
            // Fallback: check if the caret is inside a selector's target: section
            detectSelectorTargetType(text, offset) ?: return
        }
        // Walk backward to find any partial name the user has typed
        var start = offset
        while (start > 0 && (text[start - 1].isLetterOrDigit() || text[start - 1] == '_' || text[start - 1] == '-')) {
            start--
        }
        // If the prefix starts with a sigil, the user is typing a role/scratch/local/enum/function
        // identifier — not a construct name. Let the sigil-specific completions handle it.
        if (start > 0 && text[start - 1] in SIGILS) return
        // Offer all constructs from the project, filtered by the expected type
        val constructs = if (expectedType != null) {
            idx.getAllConstructsOfType(expectedType)
        } else {
            idx.getAllConstructs()
        }
        // Populate the result set from either the index or a text-based fallback
        if (constructs.isNotEmpty()) {
            for (c in constructs) {
                result.addElement(
                    LookupElementBuilder.create(c.name)
                        .withTypeText(c.type.keyword, true)
                        .bold()
                )
            }
        } else {
            for (match in CONSTRUCT_HEADER_NAME.findAll(text)) {
                result.addElement(
                    LookupElementBuilder.create(match.groupValues[2])
                        .withTypeText(match.groupValues[1], true)
                        .bold()
                )
            }
        }
    }

    /**
     * Tags: bare identifiers in `tags:`, `associations:`, and query tag/association predicates.
     *
     * Uses PSI context detection via `parameters.position` (the dummy-identifier element
     * that IntelliJ inserts at the caret in a copy of the file). Walks up the PSI tree to
     * determine whether the caret is in a tag-value position, then offers the appropriate
     * completions:
     *
     * - In `tags:` sections, `associations: default:`, and `associations: roles: @role:` →
     *   offers all tag names from the project index.
     * - In `query tags:` and `query associations:` predicates → offers all tag names.
     * - In `query action:` predicates → offers action construct names (not tags).
     */
    private fun completeTags(
        idx: VivProjectIndex, parameters: CompletionParameters, text: String, offset: Int,
        result: CompletionResultSet,
    ) {
        // Find the bare-identifier prefix (no sigil) the user has typed so far
        var start = offset
        while (start > 0 && (text[start - 1].isLetterOrDigit() || text[start - 1] == '_' || text[start - 1] == '-')) {
            start--
        }
        // If preceded by a sigil, this isn't a tag — let sigil-specific completions handle it
        if (start > 0 && text[start - 1] in SIGILS) return

        // Walk up the PSI tree from the dummy identifier to determine context
        val context = detectTagContext(parameters.position) ?: return

        when (context) {
            TagContext.TAG -> {
                for (tag in idx.getAllTagNames()) {
                    result.addElement(
                        LookupElementBuilder.create(tag).withTypeText("tag", true)
                    )
                }
            }
            TagContext.ACTION_NAME -> {
                for (action in idx.getAllConstructsOfType(ConstructType.ACTION)) {
                    result.addElement(
                        LookupElementBuilder.create(action.name)
                            .withTypeText("action", true)
                            .bold()
                    )
                }
            }
        }
    }

    /** Distinguishes tag-value positions from action-name positions in query predicates. */
    private enum class TagContext { TAG, ACTION_NAME }

    /**
     * Walks up the PSI tree from [leaf] to detect whether it sits inside a tag-value position.
     *
     * Returns [TagContext.TAG] for tag/association contexts, [TagContext.ACTION_NAME] for
     * `query action:` predicates, or null if the element is not in any tag-like position.
     */
    private fun detectTagContext(leaf: PsiElement): TagContext? {
        var current: PsiElement? = leaf
        while (current != null && current !is PsiFile) {
            when {
                current is VivTags -> return TagContext.TAG
                current is VivSetPredicateTags -> {
                    return when (current.parent) {
                        is VivQueryActionName -> TagContext.ACTION_NAME
                        is VivQueryTags, is VivQueryAssociations -> TagContext.TAG
                        else -> null
                    }
                }
            }
            current = current.parent
        }
        return null
    }

    /**
     * Detects whether [offset] is inside a selector's `target:` section by scanning
     * backward for the enclosing construct header. Returns the expected candidate type
     * (ACTION for action-selectors, PLAN for plan-selectors), or null if not in a target.
     */
    private fun detectSelectorTargetType(text: String, offset: Int): ConstructType? {
        // Scan backward from the caret to find a `target` keyword at the body indent level
        val textBefore = text.substring(0, offset)
        val targetMatch = SELECTOR_TARGET_HEADER.findAll(textBefore).lastOrNull() ?: return null
        val targetOffset = targetMatch.range.first
        // Verify no section keyword at the same or shallower indent intervenes between target: and caret
        val targetIndent = indentAtOffset(text, targetOffset)
        val between = text.substring(targetMatch.range.last, offset)
        for (line in between.lines()) {
            val trimmed = line.trim()
            if (trimmed.isNotEmpty() && !trimmed.startsWith("//")) {
                val lineIndent = line.length - trimmed.length
                // A section keyword or construct header at the same/shallower indent means
                // we've left the target section
                if (lineIndent <= targetIndent && SECTION_KEYWORD.containsMatchIn(trimmed)) {
                    return null
                }
            }
        }
        // Now find the enclosing construct header before targetOffset
        val headerMatch = SELECTOR_HEADER.findAll(text.substring(0, targetOffset)).lastOrNull() ?: return null
        return when (headerMatch.groupValues[1]) {
            "action-selector" -> ConstructType.ACTION
            "plan-selector" -> ConstructType.PLAN
            else -> null
        }
    }

    /** Returns the column number of [offset] within its line. */
    private fun indentAtOffset(text: String, offset: Int): Int {
        val lineStart = text.lastIndexOf('\n', offset - 1).let { if (it < 0) 0 else it + 1 }
        return offset - lineStart
    }

    companion object {
        private val ROLE_DEF_PATTERN = Regex("^\\s+([@&][A-Za-z_][A-Za-z0-9_-]*\\*?)\\s*:", RegexOption.MULTILINE)
        private val SCRATCH_DEF_PATTERN = Regex("(\\$[@&][A-Za-z_][A-Za-z0-9_-]*)\\s*=")
        private val LOCAL_VAR_INTRO_PATTERN = Regex("\\bas\\s+(_[@&][A-Za-z_][A-Za-z0-9_-]*)")
        private val ENUM_PATTERN = Regex("(#[A-Za-z_][A-Za-z0-9_-]*)")
        private val FUNCTION_PATTERN = Regex("(~[A-Za-z_][A-Za-z0-9_-]*)\\(")
        private val CONSTRUCT_HEADER_NAME = Regex(
            "^\\s*(?:(?:reserved|template)\\s+)?(action-selector|plan-selector|action|plan|query|pattern|trope)\\s+([A-Za-z_][A-Za-z0-9_-]*)",
            RegexOption.MULTILINE
        )

        internal val CONSTRUCT_NAME_TRIGGERS = listOf(
            "queue action-selector", "queue plan-selector",
            "queue action", "queue plan",
            "search query", "sift pattern",
            "fit trope", "fits trope",
            "from",
        )

        private val TRIGGER_TO_TYPE = mapOf(
            "queue action" to ConstructType.ACTION,
            "queue plan" to ConstructType.PLAN,
            "queue action-selector" to ConstructType.ACTION_SELECTOR,
            "queue plan-selector" to ConstructType.PLAN_SELECTOR,
            "search query" to ConstructType.QUERY,
            "sift pattern" to ConstructType.PATTERN,
            "fit trope" to ConstructType.TROPE,
            "fits trope" to ConstructType.TROPE,
            "from" to ConstructType.ACTION,
        )

        /** Matches a `target randomly:` / `target with weights:` / `target in order:` line. */
        private val SELECTOR_TARGET_HEADER = Regex(
            "^[ \\t]+target\\s+(?:randomly|with\\s+weights|in\\s+order)\\s*:",
            RegexOption.MULTILINE
        )

        /** Matches a selector construct header to determine its type. */
        private val SELECTOR_HEADER = Regex(
            "^[ \\t]*(?:(?:reserved|template)\\s+)?(action-selector|plan-selector)\\s+[A-Za-z_][A-Za-z0-9_-]*",
            RegexOption.MULTILINE
        )

        /** Token types where sigil-based completion should be suppressed (strings, comments). */
        private val SUPPRESSED_CONTEXTS = TokenSet.create(
            VivTypes.LINE_COMMENT,
            VivTypes.STRING_LITERAL,
            VivTypes.TEMPLATE_STRING_START,
            VivTypes.TEMPLATE_STRING_PART,
            VivTypes.TEMPLATE_STRING_END,
        )

        /** Sigil characters that introduce non-construct identifiers. */
        private val SIGILS = charArrayOf('@', '&', '$', '_', '#', '~')

        /** Section keywords that would end a target section. */
        private val SECTION_KEYWORD = Regex(
            "^(?:roles|conditions|target|action-selector|plan-selector|action|plan|query|pattern|trope|reserved|template)\\b"
        )

        /**
         * Scans backward from [offset] to find a sigil-prefixed identifier.
         *
         * @param text   The document text.
         * @param offset The caret offset.
         * @param sigils Acceptable leading sigil characters (e.g., `@`, `&`).
         * @return The sigil + partial name, or null if no sigil prefix was found.
         */
        fun findPrefixMatching(text: String, offset: Int, sigils: CharArray): String? {
            var start = offset
            while (start > 0 && (text[start - 1].isLetterOrDigit() || text[start - 1] == '_' || text[start - 1] == '-')) {
                start--
            }
            if (start > 0 && text[start - 1] in sigils) {
                start--
            } else {
                return null
            }
            return text.substring(start, offset)
        }

        /**
         * Scans backward from [offset] to find a scratch-variable prefix (`$@` or `$&`).
         *
         * @return The `$sigil + partial name`, or null if no scratch prefix was found.
         */
        fun findScratchPrefix(text: String, offset: Int): String? {
            var start = offset
            while (start > 0 && (text[start - 1].isLetterOrDigit() || text[start - 1] == '_' || text[start - 1] == '-')) {
                start--
            }
            if (start >= 2 && (text[start - 1] == '@' || text[start - 1] == '&') && text[start - 2] == '$') {
                start -= 2
                return text.substring(start, offset)
            }
            if (start > 0 && text[start - 1] == '$') {
                start--
                return text.substring(start, offset)
            }
            return null
        }

        /**
         * Scans backward from [offset] to find a local-variable prefix (`_@` or `_&`).
         *
         * @return The `_sigil + partial name`, or null if no local prefix was found.
         */
        fun findLocalPrefix(text: String, offset: Int): String? {
            var start = offset
            while (start > 0 && (text[start - 1].isLetterOrDigit() || text[start - 1] == '_' || text[start - 1] == '-')) {
                start--
            }
            if (start >= 2 && (text[start - 1] == '@' || text[start - 1] == '&') && text[start - 2] == '_') {
                start -= 2
                return text.substring(start, offset)
            }
            // Bare `_` — the underscore was consumed by the ident-char loop above,
            // so check whether the consumed text starts with `_` and preceded by
            // a non-ident char (i.e., genuinely the start of a local-var prefix).
            if (start < offset && text[start] == '_') {
                val before = if (start > 0) text[start - 1] else ' '
                if (!before.isLetterOrDigit() && before != '_' && before != '-') {
                    return text.substring(start, offset)
                }
            }
            return null
        }
    }
}
