package studio.sifty.viv

import com.intellij.codeInsight.highlighting.HighlightUsagesHandlerBase
import com.intellij.codeInsight.highlighting.HighlightUsagesHandlerFactory
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.util.ProperTextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IElementType
import com.intellij.psi.util.elementType
import com.intellij.util.Consumer
import studio.sifty.viv.psi.VivTypes

/**
 * Highlights matching block keywords when the caret is on one.
 *
 * Supported block constructs and their keyword groups:
 *
 * - **Conditionals** (general, plan, associations): `if` / `elif` / `else` / `end`
 * - **Loops** (general, plan, associations): `loop` / `end`
 * - **Custom field loops** (saliences, associations): `for` / `end`
 * - **Reaction windows** (plan phases): `all`/`any`/`untracked` / `close`
 * - **Plan control flow**: `fail`/`succeed` ↔ plan name; `advance` ↔ phase name;
 *   phase name → `advance`/`fail`/`succeed` inside its body
 */
class VivBlockMatchHighlighter : HighlightUsagesHandlerFactory {

    override fun createHighlightUsagesHandler(
        editor: Editor, file: PsiFile
    ): HighlightUsagesHandlerBase<PsiElement>? {
        if (file !is VivFile) return null
        val offset = editor.caretModel.offset
        val element = file.findElementAt(offset) ?: return null

        // Try plan-specific highlighting first
        val planTargets = findPlanHighlightTargets(element)
        if (planTargets != null && planTargets.size >= 2) {
            return VivBlockKeywordHandler(editor, file, planTargets)
        }

        // Then try standard block keyword highlighting
        val blockKeywords = findBlockKeywords(element) ?: return null
        if (blockKeywords.size < 2) return null
        return VivBlockKeywordHandler(editor, file, blockKeywords)
    }

    override fun createHighlightUsagesHandler(
        editor: Editor, file: PsiFile, visibleRange: ProperTextRange
    ): HighlightUsagesHandlerBase<PsiElement>? {
        return createHighlightUsagesHandler(editor, file)
    }

    companion object {

        // Token types for reserved keyword tokens
        private val BLOCK_KEYWORD_TOKENS = setOf(
            VivTypes.IF_KW, VivTypes.ELIF_KW, VivTypes.ELSE_KW,
            VivTypes.END_KW, VivTypes.LOOP_KW,
        )

        // Context-sensitive keywords that delimit blocks (lexed as IDENTIFIER)
        private val BLOCK_KEYWORD_TEXTS = setOf("for", "all", "any", "untracked", "close")

        // PSI element types for conditional constructs
        private val CONDITIONAL_TYPES = setOf(
            VivTypes.CONDITIONAL,
            VivTypes.PLAN_CONDITIONAL,
            VivTypes.ASSOCIATIONS_CONDITIONAL,
        )

        // PSI element types for loop constructs
        private val LOOP_TYPES = setOf(
            VivTypes.LOOP,
            VivTypes.PLAN_LOOP,
            VivTypes.ASSOCIATIONS_LOOP,
        )

        // PSI element types for custom field blocks (for...end)
        private val CUSTOM_FIELD_TYPES = setOf(
            VivTypes.SALIENCES_CUSTOM_FIELD,
            VivTypes.ASSOCIATIONS_CUSTOM_FIELD,
        )

        // PSI element type for reaction windows (all/any/untracked...close)
        private val REACTION_WINDOW_TYPES = setOf(
            VivTypes.PLAN_INSTRUCTION_REACTION_WINDOW,
        )

        // All block parent types that we recognize
        private val ALL_BLOCK_TYPES = CONDITIONAL_TYPES + LOOP_TYPES +
            CUSTOM_FIELD_TYPES + REACTION_WINDOW_TYPES

        /**
         * Given a leaf element that may be a block keyword, finds all sibling
         * block keywords in the same block construct.
         */
        fun findBlockKeywords(leaf: PsiElement): List<PsiElement>? {
            if (!isBlockKeyword(leaf)) return null
            val blockParent = findBlockParent(leaf) ?: return null
            return collectKeywordsFromBlock(blockParent)
        }

        private fun isBlockKeyword(element: PsiElement): Boolean {
            val tokenType = element.elementType ?: return false
            if (tokenType in BLOCK_KEYWORD_TOKENS) return true
            if (tokenType == VivTypes.IDENTIFIER && element.text in BLOCK_KEYWORD_TEXTS) {
                // Only count it as a block keyword if it actually sits inside a block construct
                return findBlockParent(element) != null
            }
            return false
        }

        /**
         * Walk up the PSI tree from a keyword leaf to find the nearest
         * enclosing block construct that owns this keyword.
         */
        private fun findBlockParent(leaf: PsiElement): PsiElement? {
            val tokenType = leaf.elementType
            val tokenText = leaf.text

            // For `end`, `close`, `if`, `elif`, `else`, `loop`, `for`, and
            // window operators: walk up from the leaf to find the nearest
            // ancestor whose element type is one of the block types.
            //
            // The key insight: in GrammarKit's PSI tree, keyword tokens are
            // direct children (or children of small wrapper nodes) of their
            // enclosing block rule. So we walk ancestors checking element types.

            var current: PsiElement? = leaf.parent
            while (current != null && current !is PsiFile) {
                val parentType = current.node?.elementType
                if (parentType != null && parentType in ALL_BLOCK_TYPES) {
                    // Verify this block actually owns the leaf keyword.
                    // For conditional blocks, `if` and `end` are at different
                    // nesting levels (if is inside conditional_branches, end is
                    // a direct child of conditional). But both are descendants
                    // of the same CONDITIONAL node.
                    return current
                }
                current = current.parent
            }
            return null
        }

        /**
         * Collect all block-delimiting keyword tokens from a block PSI element.
         * Only collects immediate structural keywords (not those belonging to
         * nested blocks).
         */
        private fun collectKeywordsFromBlock(block: PsiElement): List<PsiElement> {
            val blockType = block.node?.elementType ?: return emptyList()
            return when {
                blockType in CONDITIONAL_TYPES -> collectConditionalKeywords(block)
                blockType in LOOP_TYPES -> collectLoopKeywords(block)
                blockType in CUSTOM_FIELD_TYPES -> collectCustomFieldKeywords(block)
                blockType in REACTION_WINDOW_TYPES -> collectReactionWindowKeywords(block)
                else -> emptyList()
            }
        }

        /**
         * Conditional: if / elif* / else? / end
         *
         * Grammar structure:
         *   conditional ::= conditional_branches ('else' ':' alternative)? 'end'
         *   conditional_branches ::= 'if' branch ('elif' branch)*
         *
         * So `if` and `elif` are inside the conditional_branches child,
         * while `else` and `end` are direct children of conditional.
         */
        private fun collectConditionalKeywords(block: PsiElement): List<PsiElement> {
            val keywords = mutableListOf<PsiElement>()
            collectKeywordTokensShallow(block, keywords, setOf(
                VivTypes.IF_KW, VivTypes.ELIF_KW, VivTypes.ELSE_KW, VivTypes.END_KW,
            ), emptySet())
            return keywords
        }

        /**
         * Loop: loop / end
         *
         * Grammar: loop ::= 'loop' expr 'as' local ':' stmts 'end'
         */
        private fun collectLoopKeywords(block: PsiElement): List<PsiElement> {
            val keywords = mutableListOf<PsiElement>()
            collectKeywordTokensShallow(block, keywords, setOf(
                VivTypes.LOOP_KW, VivTypes.END_KW,
            ), emptySet())
            return keywords
        }

        /**
         * Custom field: for / end
         *
         * Grammar: saliences_custom_field ::= 'for' local ':' stmts 'end'
         *
         * `for` is an IDENTIFIER token with text "for".
         */
        private fun collectCustomFieldKeywords(block: PsiElement): List<PsiElement> {
            val keywords = mutableListOf<PsiElement>()
            collectKeywordTokensShallow(block, keywords, setOf(
                VivTypes.END_KW,
            ), setOf("for"))
            return keywords
        }

        /**
         * Reaction window: all/any/untracked / close
         *
         * Grammar:
         *   plan_instruction_reaction_window ::=
         *       plan_instruction_reaction_window_operator ':' plan_instruction+ 'close'
         *   plan_instruction_reaction_window_operator ::= 'all' | 'any' | 'untracked'
         *
         * Both the operator and `close` are IDENTIFIER tokens.
         */
        private fun collectReactionWindowKeywords(block: PsiElement): List<PsiElement> {
            val keywords = mutableListOf<PsiElement>()
            collectKeywordTokensShallow(block, keywords, emptySet(),
                setOf("all", "any", "untracked", "close"))
            return keywords
        }

        /**
         * Recursively collect keyword tokens from a block, but stop recursion
         * at nested blocks (to avoid collecting keywords from inner blocks).
         *
         * @param node        Current PSI node being scanned
         * @param result      Accumulator for found keyword elements
         * @param tokenTypes  Reserved keyword token types to look for
         * @param identTexts  Context-sensitive keyword texts (IDENTIFIER tokens) to look for
         */
        private fun collectKeywordTokensShallow(
            node: PsiElement,
            result: MutableList<PsiElement>,
            tokenTypes: Set<IElementType>,
            identTexts: Set<String>,
        ) {
            var child = node.firstChild
            while (child != null) {
                val childType = child.node?.elementType
                if (childType != null) {
                    // Leaf token check
                    if (child.firstChild == null) {
                        if (childType in tokenTypes) {
                            result.add(child)
                        } else if (childType == VivTypes.IDENTIFIER && child.text in identTexts) {
                            result.add(child)
                        }
                    } else {
                        // Composite node: recurse unless it's a nested block
                        if (childType !in ALL_BLOCK_TYPES) {
                            collectKeywordTokensShallow(child, result, tokenTypes, identTexts)
                        }
                    }
                }
                child = child.nextSibling
            }
        }

        // ================================================================
        // Plan control flow highlighting
        // ================================================================

        /**
         * Given a leaf element, determines whether it is a plan-related control
         * flow keyword or name, and returns the set of elements to highlight.
         *
         * - `fail`/`succeed` ↔ plan construct name
         * - `advance` ↔ enclosing phase name
         * - phase name → `advance`/`fail`/`succeed` inside the phase body
         */
        fun findPlanHighlightTargets(leaf: PsiElement): List<PsiElement>? {
            val tokenType = leaf.elementType ?: return null
            val text = leaf.text

            // Case 1: Caret on succeed/fail — highlight the plan name
            if (tokenType == VivTypes.IDENTIFIER && (text == "succeed" || text == "fail")) {
                val instructionType = leaf.parent?.node?.elementType
                if (instructionType != VivTypes.PLAN_INSTRUCTION_SUCCEED &&
                    instructionType != VivTypes.PLAN_INSTRUCTION_FAIL) return null
                val planNameElement = findEnclosingPlanNameElement(leaf) ?: return null
                val planBody = findEnclosingPlanBody(leaf) ?: return null
                val result = mutableListOf<PsiElement>(leaf, planNameElement)
                // Also collect all other fail/succeed in the plan body
                collectIdentifierTokensInSubtree(planBody, result, setOf("succeed", "fail"),
                    setOf(VivTypes.PLAN_INSTRUCTION_SUCCEED, VivTypes.PLAN_INSTRUCTION_FAIL))
                return result.distinct()
            }

            // Case 2: Caret on advance — highlight the enclosing phase name
            if (tokenType == VivTypes.IDENTIFIER && text == "advance") {
                val instructionType = leaf.parent?.node?.elementType
                if (instructionType != VivTypes.PLAN_INSTRUCTION_ADVANCE) return null
                val phaseNameElement = findEnclosingPhaseNameElement(leaf) ?: return null
                return listOf(leaf, phaseNameElement)
            }

            // Case 3: Caret on a plan construct name (in the header)
            // Must be the name identifier (last IDENTIFIER child), not the `plan` keyword
            val parentType = leaf.parent?.node?.elementType
            if (parentType == VivTypes.PLAN_HEADER && tokenType == VivTypes.IDENTIFIER
                && isLastIdentifierChild(leaf)) {
                val planBody = findPlanBodyFromHeader(leaf.parent!!) ?: return null
                val result = mutableListOf<PsiElement>(leaf)
                collectIdentifierTokensInSubtree(planBody, result, setOf("succeed", "fail"),
                    setOf(VivTypes.PLAN_INSTRUCTION_SUCCEED, VivTypes.PLAN_INSTRUCTION_FAIL))
                if (result.size < 2) return null
                return result
            }

            // Case 4: Caret on a phase name (>phase-name)
            // Only collect `advance` keywords — succeed/fail are plan-scoped (handled by Case 3)
            if (parentType == VivTypes.PLAN_PHASE_NAME && tokenType == VivTypes.IDENTIFIER) {
                val phase = findEnclosingPlanPhaseFromName(leaf) ?: return null
                val result = mutableListOf<PsiElement>(leaf)
                collectIdentifierTokensInSubtree(phase, result, setOf("advance"),
                    setOf(VivTypes.PLAN_INSTRUCTION_ADVANCE))
                if (result.size < 2) return null
                return result
            }

            return null
        }

        /**
         * Walks up from a leaf inside a plan to find the plan construct's name
         * IDENTIFIER token (the one inside PLAN_HEADER). First locates the
         * enclosing PLAN node, then finds its PLAN_HEADER child, then returns
         * the LAST IDENTIFIER in the header (the name, not the `plan` keyword).
         */
        private fun findEnclosingPlanNameElement(leaf: PsiElement): PsiElement? {
            val planNode = findEnclosingPlanNode(leaf) ?: return null
            // Find PLAN_HEADER child of the PLAN node
            var child = planNode.firstChild
            while (child != null) {
                if (child.node?.elementType == VivTypes.PLAN_HEADER) {
                    // The name is the LAST IDENTIFIER child — the `plan` keyword comes first
                    var lastIdent: PsiElement? = null
                    var headerChild = child.firstChild
                    while (headerChild != null) {
                        if (headerChild.node?.elementType == VivTypes.IDENTIFIER) lastIdent = headerChild
                        headerChild = headerChild.nextSibling
                    }
                    return lastIdent
                }
                child = child.nextSibling
            }
            return null
        }

        /**
         * Walks up from a leaf inside a plan to find the enclosing PLAN PSI node.
         */
        private fun findEnclosingPlanNode(leaf: PsiElement): PsiElement? {
            var current: PsiElement? = leaf.parent
            while (current != null && current !is PsiFile) {
                if (current.node?.elementType == VivTypes.PLAN) return current
                current = current.parent
            }
            return null
        }

        /**
         * Walks up from a leaf inside a plan to find the PLAN_BODY PSI element.
         */
        private fun findEnclosingPlanBody(leaf: PsiElement): PsiElement? {
            var current: PsiElement? = leaf.parent
            while (current != null && current !is PsiFile) {
                val type = current.node?.elementType
                if (type == VivTypes.PLAN_BODY) return current
                current = current.parent
            }
            return null
        }

        /**
         * Given a PLAN_HEADER element, finds the sibling PLAN_BODY element.
         */
        private fun findPlanBodyFromHeader(header: PsiElement): PsiElement? {
            var sibling = header.nextSibling
            while (sibling != null) {
                if (sibling.node?.elementType == VivTypes.PLAN_BODY) return sibling
                sibling = sibling.nextSibling
            }
            return null
        }

        /**
         * Walks up from a leaf inside a plan phase to find the phase's name
         * IDENTIFIER token (the one inside PLAN_PHASE_NAME).
         */
        private fun findEnclosingPhaseNameElement(leaf: PsiElement): PsiElement? {
            var current: PsiElement? = leaf.parent
            while (current != null && current !is PsiFile) {
                val type = current.node?.elementType
                if (type == VivTypes.PLAN_PHASE) {
                    // Find the PLAN_PHASE_NAME child, then its IDENTIFIER
                    var child = current.firstChild
                    while (child != null) {
                        if (child.node?.elementType == VivTypes.PLAN_PHASE_NAME) {
                            var nameChild = child.firstChild
                            while (nameChild != null) {
                                if (nameChild.node?.elementType == VivTypes.IDENTIFIER) return nameChild
                                nameChild = nameChild.nextSibling
                            }
                        }
                        child = child.nextSibling
                    }
                    return null
                }
                current = current.parent
            }
            return null
        }

        /**
         * Given a leaf inside a PLAN_PHASE_NAME, finds the enclosing PLAN_PHASE.
         */
        private fun findEnclosingPlanPhaseFromName(leaf: PsiElement): PsiElement? {
            var current: PsiElement? = leaf.parent
            while (current != null && current !is PsiFile) {
                if (current.node?.elementType == VivTypes.PLAN_PHASE) return current
                current = current.parent
            }
            return null
        }

        /**
         * Returns true if [leaf] is the last IDENTIFIER child of its parent.
         * Used to distinguish construct names from keywords in headers
         * (e.g., 'plan' keyword vs plan name in PLAN_HEADER).
         */
        private fun isLastIdentifierChild(leaf: PsiElement): Boolean {
            val parent = leaf.parent ?: return false
            var lastIdent: PsiElement? = null
            var child = parent.firstChild
            while (child != null) {
                if (child.node?.elementType == VivTypes.IDENTIFIER) lastIdent = child
                child = child.nextSibling
            }
            return lastIdent === leaf
        }

        /**
         * Recursively collects IDENTIFIER leaf tokens whose text matches
         * [identTexts] and whose immediate parent type is in [parentTypes].
         * This ensures we only collect keywords that are genuine plan instructions
         * (e.g., "succeed" inside PLAN_INSTRUCTION_SUCCEED), not identifiers with
         * the same text in other contexts.
         */
        private fun collectIdentifierTokensInSubtree(
            node: PsiElement,
            result: MutableList<PsiElement>,
            identTexts: Set<String>,
            parentTypes: Set<IElementType>,
        ) {
            var child = node.firstChild
            while (child != null) {
                val childType = child.node?.elementType
                if (childType != null) {
                    if (child.firstChild == null) {
                        // Leaf token
                        if (childType == VivTypes.IDENTIFIER && child.text in identTexts) {
                            val pType = child.parent?.node?.elementType
                            if (pType != null && pType in parentTypes) {
                                result.add(child)
                            }
                        }
                    } else {
                        // Composite — recurse
                        collectIdentifierTokensInSubtree(child, result, identTexts, parentTypes)
                    }
                }
                child = child.nextSibling
            }
        }
    }
}

/**
 * Handler that highlights a pre-computed list of block keyword targets.
 */
private class VivBlockKeywordHandler(
    editor: Editor,
    file: PsiFile,
    private val targets: List<PsiElement>,
) : HighlightUsagesHandlerBase<PsiElement>(editor, file) {

    override fun getTargets(): List<PsiElement> = targets

    override fun selectTargets(
        targets: List<PsiElement>,
        selectionConsumer: Consumer<in List<PsiElement>>,
    ) {
        selectionConsumer.consume(targets)
    }

    override fun computeUsages(targets: List<PsiElement>) {
        for (target in targets) {
            myReadUsages.add(target.textRange)
        }
    }
}
