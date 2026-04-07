package studio.sifty.viv

import com.intellij.lang.annotation.AnnotationHolder
import com.intellij.lang.annotation.Annotator
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.psi.PsiElement
import com.intellij.psi.util.elementType
import studio.sifty.viv.psi.VivTypes

/**
 * PSI-based annotator that handles context-sensitive syntax highlighting.
 *
 * The lexer produces generic IDENTIFIER tokens for all words. This annotator walks
 * the PSI tree and assigns colors based on each IDENTIFIER's role in the grammar:
 * construct-type keywords, section keywords, domain verbs, role labels, etc.
 *
 * This complements [VivSyntaxHighlighter], which handles tokens the lexer can
 * classify unambiguously (comments, strings, numbers, operators, punctuation).
 */
class VivHighlightingAnnotator : Annotator {

    override fun annotate(element: PsiElement, holder: AnnotationHolder) {
        val elementType = element.elementType ?: return

        when (elementType) {
            VivTypes.IDENTIFIER -> annotateIdentifier(element, holder)
        }
    }

    private fun annotateIdentifier(element: PsiElement, holder: AnnotationHolder) {
        val parent = element.parent ?: return
        val parentType = parent.elementType
        val text = element.text

        // --- Construct names (entity.name.function.*.viv -> teal) ---
        // The identifier that is the name of a construct declaration
        if (isConstructName(parentType, element)) {
            highlight(element, holder, VivHighlightingColors.CONSTRUCT_NAME)
            return
        }

        // --- Plan phase names (entity.name.label.viv -> teal) ---
        if (parentType == VivTypes.PLAN_PHASE_NAME) {
            highlight(element, holder, VivHighlightingColors.PHASE_NAME)
            return
        }

        // --- Construct name references (entity.name.function.viv -> teal) ---
        if (isConstructReference(parentType, element)) {
            highlight(element, holder, VivHighlightingColors.CONSTRUCT_NAME)
            return
        }

        // --- Custom function names (meta.external-name.viv -> foreground/identifier) ---
        if (parentType == VivTypes.CUSTOM_FUNCTION_CALL && isCustomFunctionName(element)) {
            highlight(element, holder, VivHighlightingColors.EXTERNAL_NAME)
            return
        }

        // --- Property names after . and -> (meta.external-name.viv -> foreground/identifier) ---
        if (parentType == VivTypes.PROPERTY_NAME) {
            highlight(element, holder, VivHighlightingColors.EXTERNAL_NAME)
            return
        }

        // --- Enum labels after # (meta.external-name.viv -> foreground/identifier) ---
        if (parentType == VivTypes.ENUM) {
            highlight(element, holder, VivHighlightingColors.EXTERNAL_NAME)
            return
        }

        // --- Tag identifiers (meta.external-name.viv -> foreground/identifier) ---
        if (parentType == VivTypes.TAG) {
            highlight(element, holder, VivHighlightingColors.EXTERNAL_NAME)
            return
        }

        // --- Salience/association role entry names (entity.name.variable.reference.viv -> yellow) ---
        if (parentType == VivTypes.SALIENCES_ROLES_ENTRY || parentType == VivTypes.ASSOCIATIONS_ROLES_ENTRY) {
            highlight(element, holder, VivHighlightingColors.REFERENCE)
            return
        }

        // --- Role reference identifier (yellow, but the role part only) ---
        // The identifier inside a viv_reference or role_reference is colored as a reference.
        // The sigil ($, _, @, &) tokens are already colored by the lexer as KEYWORD.
        if (parentType == VivTypes.VIV_REFERENCE || parentType == VivTypes.ROLE_REFERENCE) {
            val refColor = getReferenceColor(parent)
            highlight(element, holder, refColor)
            return
        }

        // --- Local variable names in loop "as" clauses (entity.name.variable.local.viv -> yellow) ---
        if (parentType == VivTypes.LOCAL_VARIABLE) {
            highlight(element, holder, VivHighlightingColors.LOCAL_VARIABLE)
            return
        }

        // --- Bare key in object literals: no special coloring ---
        if (parentType == VivTypes.BARE_KEY) {
            return
        }

        // --- Role labels (support.constant.viv -> blue) ---
        if (parentType == VivTypes.ROLE_LABEL) {
            highlight(element, holder, VivHighlightingColors.ROLE_LABEL)
            return
        }

        // --- Time units (support.constant.viv -> blue) ---
        if (parentType == VivTypes.TIME_UNIT) {
            highlight(element, holder, VivHighlightingColors.ROLE_LABEL)
            return
        }

        // --- Boolean literals (constant.language.viv -> red) ---
        if (parentType == VivTypes.BOOLEAN_LITERAL) {
            highlight(element, holder, VivHighlightingColors.CONSTANT)
            return
        }

        // --- Null literal (constant.language.viv -> red) ---
        if (parentType == VivTypes.NULL_LITERAL) {
            highlight(element, holder, VivHighlightingColors.CONSTANT)
            return
        }

        // --- Selector policy keywords: randomly, weights, order, in (keyword.other.parameter.viv -> purple italic) ---
        if (parentType == VivTypes.SELECTOR_POLICY) {
            highlight(element, holder, VivHighlightingColors.KEYWORD_PARAMETER)
            return
        }

        // --- Set predicate operators: none, any, all, exactly (keyword.other.viv -> purple) ---
        // These are always followed by `:` so they're section-like keywords, not italic parameters.
        if (parentType == VivTypes.SET_PREDICATE_OPERATOR) {
            highlight(element, holder, VivHighlightingColors.SECTION_KEYWORD)
            return
        }

        // --- Reaction window operators: all, any, untracked (keyword.other.viv -> purple) ---
        if (parentType == VivTypes.PLAN_INSTRUCTION_REACTION_WINDOW_OPERATOR) {
            highlight(element, holder, VivHighlightingColors.SECTION_KEYWORD)
            return
        }

        // --- Selector candidate "selector" keyword (keyword.operator.viv -> orange) ---
        if (parentType == VivTypes.SELECTOR_CANDIDATE_NAME && text == "selector") {
            highlight(element, holder, VivHighlightingColors.KEYWORD)
            return
        }

        // --- Selector candidate name (entity.name.function.viv -> teal) ---
        if (parentType == VivTypes.SELECTOR_CANDIDATE_NAME && text != "selector") {
            highlight(element, holder, VivHighlightingColors.CONSTRUCT_NAME)
            return
        }

        // Now handle context-free keyword classification by text.
        // The grammar places these identifiers in specific PSI node types, so we
        // can classify by checking the parent. But many keywords appear as the first
        // child of their section node — we handle those by checking if the text
        // matches a known keyword and the parent is the expected section type.
        val color = classifyKeywordByContext(text, parentType, parent)
        if (color != null) {
            highlight(element, holder, color)
            return
        }
    }

    /**
     * Checks if this identifier is the name in a construct header.
     */
    private fun isConstructName(parentType: com.intellij.psi.tree.IElementType?, element: PsiElement): Boolean {
        // action_header, plan_header, query_header, sifting_pattern_header, trope_header,
        // selector_header — the name identifier is the one that's not a keyword
        val headerTypes = setOf(
            VivTypes.ACTION_HEADER,
            VivTypes.PLAN_HEADER,
            VivTypes.QUERY_HEADER,
            VivTypes.SIFTING_PATTERN_HEADER,
            VivTypes.TROPE_HEADER,
            VivTypes.SELECTOR_HEADER,
        )
        if (parentType in headerTypes) {
            val text = element.text
            // These are keyword tokens that appear in headers, not names
            val headerKeywords = setOf(
                "action", "plan", "query", "pattern", "trope",
                "action-selector", "plan-selector",
                "reserved", "template", "from",
            )
            return text !in headerKeywords
        }
        // parent_action_declaration: "from <name>" — the name identifier
        if (parentType == VivTypes.PARENT_ACTION_DECLARATION) {
            return element.text != "from"
        }
        return false
    }

    /**
     * Checks if this identifier is a construct name reference (not a declaration).
     */
    private fun isConstructReference(parentType: com.intellij.psi.tree.IElementType?, element: PsiElement): Boolean {
        // reaction_target: "queue action <name>" — the name
        if (parentType == VivTypes.REACTION_TARGET) {
            return element.text !in setOf("action-selector", "plan-selector", "action", "plan")
        }
        // reaction_target_type: these are keywords, not references
        if (parentType == VivTypes.REACTION_TARGET_TYPE) {
            return false
        }
        // action_search: "search query <name>" — the name
        if (parentType == VivTypes.ACTION_SEARCH) {
            return element.text !in setOf("search", "query")
        }
        // sifting_header: "sift pattern <name>" — the name
        if (parentType == VivTypes.SIFTING_HEADER) {
            return element.text !in setOf("sift", "pattern")
        }
        // trope_fit: "fit trope <name>" — the name
        if (parentType == VivTypes.TROPE_FIT) {
            return element.text !in setOf("fit", "trope")
        }
        // trope_fit_sugared: "<binding> fits trope <name>" — the name
        if (parentType == VivTypes.TROPE_FIT_SUGARED) {
            return element.text !in setOf("fits", "trope")
        }
        return false
    }

    /**
     * The identifier immediately after ~ in a custom_function_call is the function name.
     */
    private fun isCustomFunctionName(element: PsiElement): Boolean {
        val prev = element.prevSibling ?: return false
        return prev.elementType == VivTypes.TILDE
    }

    /**
     * Determines the reference color based on whether it's scratch ($@), local (_@), or plain (@).
     */
    private fun getReferenceColor(parent: PsiElement): TextAttributesKey {
        val firstChild = parent.firstChild ?: return VivHighlightingColors.REFERENCE
        val firstType = firstChild.elementType
        return when (firstType) {
            VivTypes.SCRATCH_VARIABLE_SIGIL -> VivHighlightingColors.SCRATCH_VARIABLE
            VivTypes.LOCAL_VARIABLE_SIGIL -> VivHighlightingColors.LOCAL_VARIABLE
            else -> VivHighlightingColors.REFERENCE
        }
    }

    /**
     * Classifies an IDENTIFIER as a keyword based on its text and PSI parent context.
     *
     * Returns the appropriate [TextAttributesKey], or null if no classification applies.
     */
    private fun classifyKeywordByContext(
        text: String,
        parentType: com.intellij.psi.tree.IElementType?,
        parent: PsiElement,
    ): TextAttributesKey? {

        // --- Construct-type keywords in headers (keyword.operator.viv -> orange) ---
        val headerTypes = setOf(
            VivTypes.ACTION_HEADER,
            VivTypes.PLAN_HEADER,
            VivTypes.QUERY_HEADER,
            VivTypes.SIFTING_PATTERN_HEADER,
            VivTypes.TROPE_HEADER,
            VivTypes.SELECTOR_HEADER,
        )
        if (parentType in headerTypes) {
            if (text in setOf("action", "plan", "query", "pattern", "trope", "action-selector", "plan-selector", "from")) {
                return VivHighlightingColors.KEYWORD
            }
        }

        // --- reserved, template markers (keyword.operator.viv -> orange) ---
        if (parentType == VivTypes.RESERVED_CONSTRUCT_MARKER || parentType == VivTypes.TEMPLATE_ACTION_MARKER) {
            return VivHighlightingColors.KEYWORD
        }

        // --- child_join_operator: "join" (keyword.operator.viv -> orange) ---
        if (parentType == VivTypes.CHILD_JOIN_OPERATOR) {
            return VivHighlightingColors.KEYWORD
        }

        // --- Section keywords in section headers (keyword.other.viv -> purple) ---
        // These are the first keyword in section-opening rules like "roles:", "conditions:", etc.
        val sectionKeywords = setOf(
            "gloss", "report", "importance", "saliences", "associations", "tags",
            "roles", "conditions", "scratch", "effects", "reactions", "embargoes",
            "phases", "target", "actions",
            // Reaction body sections
            "urgent", "priority", "location", "time", "abandon", "repeat", "max",
            // Embargo sections
            "embargo",
            // Role body sections
            "as", "n", "is", "renames", "spawn",
            // Plan instruction sections
            "wait", "timeout", "until",
            // Search/sifting sections
            "over",
            // Salience/association sub-sections
            "default",
            // Temporal sections (before:, after:, between: followed by a colon)
            "before", "after", "between",
            // Query sections
            "action", "ancestors", "descendants", "salience", "initiator",
            "partners", "recipients", "bystanders", "active", "present",
        )
        if (isSectionKeyword(text, parentType, parent) && text in sectionKeywords) {
            return VivHighlightingColors.SECTION_KEYWORD
        }

        // --- Plan instructions (keyword.other.viv -> purple) ---
        if (text in setOf("advance", "succeed", "fail") && isPlanInstruction(parentType)) {
            return VivHighlightingColors.SECTION_KEYWORD
        }

        // --- "close" at end of reaction window (keyword.other.viv -> purple) ---
        if (text == "close" && parentType == VivTypes.PLAN_INSTRUCTION_REACTION_WINDOW) {
            return VivHighlightingColors.SECTION_KEYWORD
        }

        // --- "with" keyword in bindings (keyword.other.viv -> purple) ---
        if (text == "with" && parentType == VivTypes.BINDINGS) {
            return VivHighlightingColors.SECTION_KEYWORD
        }

        // --- "partial", "none" as keyword parameters (keyword.other.parameter.viv -> purple italic) ---
        if (text in setOf("partial", "none") && isKeywordParameter(parentType)) {
            return VivHighlightingColors.KEYWORD_PARAMETER
        }

        // --- Reaction target type keywords (keyword.operator.viv -> orange) ---
        if (parentType == VivTypes.REACTION_TARGET_TYPE) {
            return VivHighlightingColors.KEYWORD
        }

        // --- "queue" keyword (keyword.operator.viv -> orange) ---
        if (text == "queue" && parentType == VivTypes.REACTION_HEADER) {
            return VivHighlightingColors.KEYWORD
        }

        // --- Selector type keywords (keyword.operator.viv -> orange) ---
        if (parentType == VivTypes.SELECTOR_TYPE) {
            return VivHighlightingColors.KEYWORD
        }

        // --- Domain verbs: search, sift, fit, fits, query, pattern, trope (keyword.operator.viv -> orange) ---
        if (text in setOf("search", "query", "sift", "pattern", "fit", "fits", "trope")) {
            if (isDomainVerb(text, parentType)) {
                return VivHighlightingColors.KEYWORD
            }
        }

        // --- Word operators (keyword.operator.viv -> orange) ---
        if (parentType == VivTypes.RELATIONAL_OPERATOR && text in setOf("in", "knows", "caused", "triggered", "preceded")) {
            return VivHighlightingColors.KEYWORD
        }
        if (parentType == VivTypes.ASSIGNMENT_OPERATOR && text in setOf("append", "remove")) {
            return VivHighlightingColors.KEYWORD
        }
        if (text == "inscribe" && parentType == VivTypes.INSCRIPTION) {
            return VivHighlightingColors.KEYWORD
        }
        if (text == "inspect" && parentType == VivTypes.INSPECTION) {
            return VivHighlightingColors.KEYWORD
        }

        // --- Loop/control flow helpers that are IDENTIFIER tokens (keyword.operator.viv -> orange) ---
        // "as" in loop context
        if (text == "as" && parentType in setOf(VivTypes.LOOP, VivTypes.PLAN_LOOP, VivTypes.ASSOCIATIONS_LOOP)) {
            return VivHighlightingColors.KEYWORD
        }
        // "for" in salience/association custom field contexts
        if (text == "for" && parentType in setOf(VivTypes.SALIENCES_CUSTOM_FIELD, VivTypes.ASSOCIATIONS_CUSTOM_FIELD)) {
            return VivHighlightingColors.KEYWORD
        }

        // --- Temporal keywords: before, after, between, and, from (keyword.operator.viv -> orange) ---
        if (isTemporalKeyword(text, parentType)) {
            return VivHighlightingColors.KEYWORD
        }

        // --- Language constants (support.constant.viv -> blue) ---
        if (text in setOf("action", "hearing", "now", "ago", "here", "anywhere", "forever", "inherit", "chronicle")) {
            if (isLanguageConstant(text, parentType)) {
                return VivHighlightingColors.ROLE_LABEL
            }
        }

        // --- Time units (support.constant.viv -> blue) ---
        if (text in setOf("am", "pm") && parentType == VivTypes.TIME_OF_DAY) {
            return VivHighlightingColors.ROLE_LABEL
        }

        // --- Reserved internal identifiers: __name (support.variable.reserved.viv -> blue) ---
        if (text.startsWith("__")) {
            return VivHighlightingColors.RESERVED_IDENT
        }

        return null
    }

    /**
     * Checks if the identifier is in a position where it's a section keyword (before a colon).
     */
    private fun isSectionKeyword(
        text: String,
        parentType: com.intellij.psi.tree.IElementType?,
        parent: PsiElement,
    ): Boolean {
        // Section keywords are the first identifier child of their PSI node.
        // The grammar places them as literal keywords in rules like:
        //   action_roles ::= 'roles' ':' role+
        // GrammarKit generates these as IDENTIFIER tokens that are direct children
        // of the section node.

        // Check the parent element type to see if it's a known section type.
        // The identifier must be the first child (or first after join).
        val sectionTypes = setOf(
            // Action body sections
            VivTypes.ACTION_GLOSS, VivTypes.ACTION_REPORT, VivTypes.ACTION_IMPORTANCE,
            VivTypes.ACTION_SALIENCES, VivTypes.ACTION_ASSOCIATIONS, VivTypes.ACTION_TAGS,
            VivTypes.ACTION_ROLES, VivTypes.ACTION_CONDITIONS, VivTypes.ACTION_SCRATCH,
            VivTypes.ACTION_EFFECTS, VivTypes.ACTION_REACTIONS, VivTypes.ACTION_EMBARGOES,
            // Plan body sections
            VivTypes.PLAN_ROLES, VivTypes.PLAN_CONDITIONS, VivTypes.PLAN_PHASES,
            // Query body sections
            VivTypes.QUERY_ROLES, VivTypes.QUERY_CONDITIONS, VivTypes.QUERY_ACTION_NAME,
            VivTypes.QUERY_ANCESTORS, VivTypes.QUERY_DESCENDANTS, VivTypes.QUERY_IMPORTANCE,
            VivTypes.QUERY_TAGS, VivTypes.QUERY_SALIENCE, VivTypes.QUERY_ASSOCIATIONS,
            VivTypes.QUERY_LOCATION, VivTypes.QUERY_TIME,
            VivTypes.QUERY_INITIATOR, VivTypes.QUERY_PARTNERS, VivTypes.QUERY_RECIPIENTS,
            VivTypes.QUERY_BYSTANDERS, VivTypes.QUERY_ACTIVE, VivTypes.QUERY_PRESENT,
            // Sifting pattern sections
            VivTypes.SIFTING_PATTERN_ROLES, VivTypes.SIFTING_PATTERN_ACTIONS,
            VivTypes.SIFTING_PATTERN_CONDITIONS,
            // Trope sections
            VivTypes.TROPE_ROLES, VivTypes.TROPE_CONDITIONS,
            // Selector sections
            VivTypes.SELECTOR_ROLES, VivTypes.SELECTOR_CONDITIONS, VivTypes.SELECTOR_TARGET_GROUP,
            // Reaction body sections
            VivTypes.REACTION_URGENCY, VivTypes.REACTION_PRIORITY, VivTypes.REACTION_LOCATION,
            VivTypes.REACTION_TIME, VivTypes.REACTION_ABANDONMENT_CONDITIONS,
            VivTypes.REACTION_REPEAT_LOGIC,
            // Repeat logic sub-sections
            VivTypes.REACTION_REPEAT_LOGIC_IF, VivTypes.REACTION_REPEAT_LOGIC_MAX,
            // Role body sections
            VivTypes.ROLE_LABELS, VivTypes.ROLE_SLOTS, VivTypes.ROLE_CASTING_POOL_IS,
            VivTypes.ROLE_CASTING_POOL_FROM, VivTypes.ROLE_SPAWN_DIRECTIVE, VivTypes.ROLE_RENAMING,
            // Embargo sections
            VivTypes.EMBARGO, VivTypes.EMBARGO_LOCATION, VivTypes.EMBARGO_TIME_PERIOD,
            VivTypes.EMBARGO_ROLES,
            // Plan instruction sections
            VivTypes.PLAN_INSTRUCTION_WAIT, VivTypes.PLAN_INSTRUCTION_WAIT_TIMEOUT,
            VivTypes.PLAN_INSTRUCTION_WAIT_UNTIL,
            // Search/sifting sections
            VivTypes.SEARCH_DOMAIN,
            // Salience/association sub-sections
            VivTypes.SALIENCES_DEFAULT, VivTypes.SALIENCES_ROLES, VivTypes.SALIENCES_CUSTOM_FIELD,
            VivTypes.ASSOCIATIONS_DEFAULT, VivTypes.ASSOCIATIONS_ROLES, VivTypes.ASSOCIATIONS_CUSTOM_FIELD,
            // Bindings
            VivTypes.BINDINGS,
            // Temporal section openers (before:, after:, between:)
            VivTypes.TIME_FRAME_STATEMENT_BEFORE, VivTypes.TIME_FRAME_STATEMENT_AFTER,
            VivTypes.TIME_FRAME_STATEMENT_BETWEEN,
            VivTypes.TIME_OF_DAY_STATEMENT_BEFORE, VivTypes.TIME_OF_DAY_STATEMENT_AFTER,
            VivTypes.TIME_OF_DAY_STATEMENT_BETWEEN,
        )
        return parentType in sectionTypes
    }

    private fun isPlanInstruction(parentType: com.intellij.psi.tree.IElementType?): Boolean {
        return parentType in setOf(
            VivTypes.PLAN_INSTRUCTION_ADVANCE,
            VivTypes.PLAN_INSTRUCTION_SUCCEED,
            VivTypes.PLAN_INSTRUCTION_FAIL,
        )
    }

    private fun isKeywordParameter(parentType: com.intellij.psi.tree.IElementType?): Boolean {
        return parentType in setOf(
            VivTypes.BINDINGS,
            VivTypes.BINDINGS_SUGARED_NONE,
            VivTypes.BINDINGS_SUGARED_PARTIAL,
            VivTypes.SELECTOR_POLICY,
        )
    }

    private fun isDomainVerb(text: String, parentType: com.intellij.psi.tree.IElementType?): Boolean {
        return when (text) {
            "search" -> parentType == VivTypes.ACTION_SEARCH
            "sift" -> parentType == VivTypes.SIFTING_HEADER
            "fit" -> parentType == VivTypes.TROPE_FIT
            "fits" -> parentType == VivTypes.TROPE_FIT_SUGARED
            "query" -> parentType == VivTypes.ACTION_SEARCH
            "pattern" -> parentType == VivTypes.SIFTING_HEADER
            "trope" -> parentType in setOf(VivTypes.TROPE_FIT, VivTypes.TROPE_FIT_SUGARED)
            else -> false
        }
    }

    private fun isTemporalKeyword(text: String, parentType: com.intellij.psi.tree.IElementType?): Boolean {
        val temporalParents = setOf(
            VivTypes.TIME_FRAME_STATEMENT_BEFORE,
            VivTypes.TIME_FRAME_STATEMENT_AFTER,
            VivTypes.TIME_FRAME_STATEMENT_BETWEEN,
            VivTypes.TIME_FRAME_ANCHOR_FROM_ACTION,
            VivTypes.TIME_FRAME_ANCHOR_FROM_HEARING,
            VivTypes.TIME_FRAME_ANCHOR_FROM_NOW,
            VivTypes.TIME_FRAME_ANCHOR_AGO,
            VivTypes.TIME_OF_DAY_STATEMENT_BEFORE,
            VivTypes.TIME_OF_DAY_STATEMENT_AFTER,
            VivTypes.TIME_OF_DAY_STATEMENT_BETWEEN,
        )
        return when (text) {
            "before", "after", "between", "and" -> parentType in temporalParents
            "from" -> parentType in setOf(
                VivTypes.TIME_FRAME_ANCHOR_FROM_ACTION,
                VivTypes.TIME_FRAME_ANCHOR_FROM_HEARING,
                VivTypes.TIME_FRAME_ANCHOR_FROM_NOW,
                VivTypes.PARENT_ACTION_DECLARATION,
            )
            else -> false
        }
    }

    private fun isLanguageConstant(text: String, parentType: com.intellij.psi.tree.IElementType?): Boolean {
        return when (text) {
            "action" -> parentType == VivTypes.TIME_FRAME_ANCHOR_FROM_ACTION
            "hearing" -> parentType == VivTypes.TIME_FRAME_ANCHOR_FROM_HEARING
            "now" -> parentType == VivTypes.TIME_FRAME_ANCHOR_FROM_NOW
            "ago" -> parentType == VivTypes.TIME_FRAME_ANCHOR_AGO
            "here", "anywhere" -> parentType == VivTypes.EMBARGO_LOCATION
            "forever" -> parentType == VivTypes.EMBARGO_TIME_PERIOD
            "inherit" -> parentType == VivTypes.SEARCH_DOMAIN_INHERIT
            "chronicle" -> parentType == VivTypes.SEARCH_DOMAIN_CHRONICLE
            else -> false
        }
    }

    private fun highlight(element: PsiElement, holder: AnnotationHolder, key: TextAttributesKey) {
        holder.newSilentAnnotation(HighlightSeverity.INFORMATION)
            .textAttributes(key)
            .range(element)
            .create()
    }
}
