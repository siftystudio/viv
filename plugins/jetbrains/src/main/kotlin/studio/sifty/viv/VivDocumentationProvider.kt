package studio.sifty.viv

import com.intellij.lang.documentation.AbstractDocumentationProvider
import com.intellij.lang.documentation.DocumentationMarkup
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VfsUtilCore
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiManager
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.psi.*

/**
 * Provides Quick Documentation (Ctrl+Q / hover) for Viv identifiers.
 *
 * Uses the [DocumentationMarkup] API for JetBrains-idiomatic popup styling.
 * Supports constructs, roles, scratch/local variables, function calls, include
 * paths, enum tokens, tags, and plan phases. All cross-references are rendered
 * as clickable `psi_element://` links.
 */
class VivDocumentationProvider : AbstractDocumentationProvider() {

    companion object {
        /** Maximum items shown in a list before truncation. */
        private const val LIST_ELISION_THRESHOLD = 10
        /** Thread-safe storage for phase info passed between link resolution and doc rendering. */
        private val PHASE_INFO_KEY = Key.create<Pair<String, String>>("viv.phaseInfo")
    }

    override fun generateDoc(element: PsiElement?, originalElement: PsiElement?): String? {
        return getDocForElement(element, originalElement)
    }

    override fun generateHoverDoc(element: PsiElement, originalElement: PsiElement?): String? {
        return getDocForElement(element, originalElement)
    }

    override fun getCustomDocumentationElement(
        editor: Editor, file: PsiFile, contextElement: PsiElement?, targetOffset: Int
    ): PsiElement? {
        if (file !is VivFile || contextElement == null) return null

        // Check keyword tooltips FIRST — if the token at the caret has a tooltip,
        // return it immediately without walking up to structured handlers.
        val tokenText = contextElement.text
        val ancestorTypes = collectAncestorTypes(contextElement)
        val nextSibling = nextLeafSiblingText(contextElement)
        val tooltip = VivKeywordTooltips.getTooltip(tokenText, ancestorTypes, nextSibling)
        if (tooltip != null) return contextElement

        // Then proceed with the existing PSI walk for structured handlers.
        var current: PsiElement? = contextElement
        while (current != null && current !is PsiFile) {
            when (current) {
                // Inner leaf types first — must be checked before outer construct
                // types so that references inside a construct body don't bubble up
                // to the enclosing construct and produce a false-positive hover.
                is VivVivReference -> return current
                is VivRoleReference -> return current
                is VivLocalVariable -> return current
                is VivCustomFunctionCall -> return current
                is VivEnum -> return current
                is VivTag -> return current
                is VivFilePath -> return current
                is VivIncludeStatement -> return current
                is VivPlanPhaseName -> return current

                // `phases:` keyword inside a plan body — show the plan popup
                // Only trigger when the caret is on the `phases` keyword token itself
                is VivPlanPhases -> {
                    val keyword = current.firstChild
                    if (keyword != null && targetOffset >= keyword.textRange.startOffset
                        && targetOffset <= keyword.textRange.endOffset) {
                        val plan = PsiTreeUtil.getParentOfType(current, VivPlan::class.java)
                        if (plan != null) return plan.planHeader
                    }
                }

                // Construct reference types that span a body — only match when the
                // caret is on the NAME token, not on keywords or body elements.
                is VivActionSearch -> {
                    val nameId = (current as? VivNamedElement)?.nameIdentifier
                    if (nameId != null && targetOffset >= nameId.textRange.startOffset
                        && targetOffset <= nameId.textRange.endOffset) return current
                    // Caret is elsewhere inside the search expression — keep walking
                }
                is VivSiftingHeader -> {
                    val nameId = (current as? VivNamedElement)?.nameIdentifier
                    if (nameId != null && targetOffset >= nameId.textRange.startOffset
                        && targetOffset <= nameId.textRange.endOffset) return current
                }

                // Other construct references — always match
                is VivReactionTarget -> return current
                is VivParentActionDeclaration -> return current
                is VivTropeFit -> return current
                is VivTropeFitSugared -> return current

                // Construct definition headers
                is VivActionHeader, is VivPlanHeader, is VivQueryHeader,
                is VivSiftingPatternHeader, is VivTropeHeader, is VivSelectorHeader -> return current
            }
            current = current.parent
        }

        return null
    }

    // ========================================================================
    // Link resolution
    // ========================================================================

    override fun getDocumentationElementForLink(
        psiManager: PsiManager, link: String, context: PsiElement?
    ): PsiElement? {
        val project = psiManager.project
        val idx = VivProjectIndex.getInstance(project)

        val parts = link.split(":")
        if (parts.size < 2) return null

        return when (parts[0]) {
            "construct" -> {
                if (parts.size < 3) return null
                val type = ConstructType.fromKeyword(parts[1]) ?: return null
                val name = parts[2]
                val construct = idx.getConstruct(type, name) ?: return null
                findPsiElementAtOffset(psiManager, construct.file, construct.nameOffset)
            }
            "phase" -> {
                if (parts.size < 3) return null
                val planName = parts[1]
                val phaseName = parts[2]
                val construct = idx.getConstruct(ConstructType.PLAN, planName) ?: return null
                val element = findPsiElementAtOffset(psiManager, construct.file, construct.nameOffset)
                element?.putUserData(PHASE_INFO_KEY, planName to phaseName)
                element
            }
            "role" -> {
                if (parts.size < 3) return null
                val constructName = parts[1]
                val roleName = parts[2]
                val constructs = idx.getConstructsByName(constructName)
                val construct = constructs.firstOrNull() ?: return null
                val (definingConstruct, role) = idx.resolveRole(construct, roleName) ?: return null
                findPsiElementAtOffset(psiManager, definingConstruct.file, role.offset)
            }
            "function" -> {
                if (parts.size < 2) return null
                val funcName = "~${parts[1]}"
                val files = idx.getFilesWithFunction(funcName)
                val file = files.firstOrNull() ?: return null
                // Return the file itself as the element — function calls are external
                psiManager.findFile(file)
            }
            "enum" -> {
                if (parts.size < 2) return null
                val enumName = parts[1]
                findVivEnumElement(psiManager, project, enumName)
            }
            "tag" -> {
                if (parts.size < 2) return null
                val tagName = parts[1]
                findVivTagElement(psiManager, project, tagName)
            }
            "file" -> {
                if (parts.size < 2) return null
                val fileName = parts[1]
                findPsiFileByName(psiManager, project, fileName)
            }
            else -> null
        }
    }

    /**
     * Finds the PSI element at [offset] and walks up to a type that [getDocForElement]
     * can handle. Without this walk, link resolution returns a raw leaf token that
     * doesn't match any case in the doc dispatcher.
     */
    private fun findPsiElementAtOffset(psiManager: PsiManager, file: VirtualFile, offset: Int): PsiElement? {
        val psiFile = psiManager.findFile(file) ?: return null
        val leaf = psiFile.findElementAt(offset) ?: return null
        var current: PsiElement? = leaf
        while (current != null && current !is PsiFile) {
            when (current) {
                is VivActionHeader, is VivPlanHeader, is VivQueryHeader,
                is VivSiftingPatternHeader, is VivTropeHeader, is VivSelectorHeader,
                is VivVivReference, is VivRoleReference, is VivLocalVariable,
                is VivCustomFunctionCall, is VivReactionTarget,
                is VivParentActionDeclaration, is VivActionSearch,
                is VivSiftingHeader, is VivTropeFit, is VivTropeFitSugared,
                is VivFilePath, is VivIncludeStatement,
                is VivEnum, is VivTag,
                is VivPlanPhaseName -> return current
            }
            current = current.parent
        }
        return leaf
    }

    /**
     * Finds a [VivTag] PSI element matching [tagName] by searching PSI trees in
     * files that the index reports as containing the tag. Returns null if the tag
     * exists only in the text index but no matching PSI element is found.
     */
    private fun findVivTagElement(psiManager: PsiManager, project: Project, tagName: String): PsiElement? {
        val idx = VivProjectIndex.getInstance(project)
        val files = idx.getFilesWithTag(tagName)
        for (file in files) {
            val psiFile = psiManager.findFile(file) ?: continue
            val tag = PsiTreeUtil.findChildrenOfType(psiFile, VivTag::class.java)
                .find { (it as? VivNamedElement)?.name == tagName }
            if (tag != null) return tag
        }
        // Fallback: check constructs that have this tag
        val constructs = idx.getConstructsWithTag(tagName)
        for (construct in constructs) {
            val psiFile = psiManager.findFile(construct.file) ?: continue
            val tag = PsiTreeUtil.findChildrenOfType(psiFile, VivTag::class.java)
                .find { (it as? VivNamedElement)?.name == tagName }
            if (tag != null) return tag
        }
        return null
    }

    /**
     * Finds a [VivEnum] PSI element matching [enumName] by searching PSI trees in
     * files that the index reports as containing the enum token. Returns the PsiFile
     * as a fallback if no matching PSI element is found (enums have no top-level definition).
     */
    private fun findVivEnumElement(psiManager: PsiManager, project: Project, enumName: String): PsiElement? {
        val idx = VivProjectIndex.getInstance(project)
        val files = idx.getFilesWithEnum("#$enumName")
        for (file in files) {
            val psiFile = psiManager.findFile(file) ?: continue
            val enumElement = PsiTreeUtil.findChildrenOfType(psiFile, VivEnum::class.java)
                .find { (it as? VivNamedElement)?.name == enumName }
            if (enumElement != null) return enumElement
        }
        // Fallback to first file
        val file = files.firstOrNull() ?: return null
        return psiManager.findFile(file)
    }

    /**
     * Finds the [PsiFile] for a `.viv` file by filename. Searches all indexed files.
     */
    private fun findPsiFileByName(psiManager: PsiManager, project: Project, fileName: String): PsiFile? {
        val idx = VivProjectIndex.getInstance(project)
        val allConstructs = idx.getAllConstructs()
        val seen = mutableSetOf<VirtualFile>()
        for (c in allConstructs) {
            if (!seen.add(c.file)) continue
            if (c.file.name == fileName) {
                return psiManager.findFile(c.file)
            }
        }
        return null
    }

    // ========================================================================
    // Doc dispatch
    // ========================================================================

    private fun getDocForElement(element: PsiElement?, originalElement: PsiElement?): String? {
        if (element == null) return null
        // Consume and clear pending phase info attached to this element by link resolution
        val phaseInfo = element.getUserData(PHASE_INFO_KEY)
        if (phaseInfo != null) element.putUserData(PHASE_INFO_KEY, null)
        val project = element.project
        val vFile = element.containingFile?.virtualFile ?: return null
        val idx = VivProjectIndex.getInstance(project)
        // Use pending phase info from a phase link click
        if (phaseInfo != null) {
            val (planName, phaseName) = phaseInfo
            val plan = idx.getConstruct(ConstructType.PLAN, planName) ?: return null
            return buildPhaseDoc(idx, plan, phaseName)
        }
        // Keyword tooltip — fires when getCustomDocumentationElement returned a leaf
        // token that matched the tooltip table.  Must be checked before the structured
        // when block so that keywords inside construct bodies (e.g. `reserved`) don't
        // fall through to the construct popup.
        if (element.node?.elementType != null) {
            val tokenText = element.text
            val ancestorTypes = collectAncestorTypes(element)
            val nextSibling = nextLeafSiblingText(element)
            val tooltip = VivKeywordTooltips.getTooltip(tokenText, ancestorTypes, nextSibling)
            if (tooltip != null) return buildKeywordTooltipDoc(tokenText, tooltip)
        }
        // Dispatch to the appropriate doc builder based on the PSI element type
        return when (element) {
            // Construct headers
            is VivActionHeader, is VivPlanHeader, is VivQueryHeader,
            is VivSiftingPatternHeader, is VivTropeHeader, is VivSelectorHeader -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateConstructDocByName(idx, name)
            }
            // Construct references (queue action X, from X, etc.)
            is VivReactionTarget -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                val typeText = element.reactionTargetType.text
                val type = ConstructType.fromKeyword(typeText)
                if (type != null) generateConstructDocByType(idx, type, name) else generateConstructDocByName(idx, name)
            }
            is VivParentActionDeclaration -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateConstructDocByType(idx, ConstructType.ACTION, name)
            }
            is VivActionSearch -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateConstructDocByType(idx, ConstructType.QUERY, name)
            }
            is VivSiftingHeader -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateConstructDocByType(idx, ConstructType.PATTERN, name)
            }
            is VivTropeFit, is VivTropeFitSugared -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateConstructDocByType(idx, ConstructType.TROPE, name)
            }
            // Role/scratch/local references in expressions
            is VivVivReference -> {
                val offset = element.textOffset
                generateVivReferenceDoc(idx, vFile, offset, element)
            }
            // Role references in bindings, embargoes, renamings, etc.
            is VivRoleReference -> {
                val offset = element.textOffset
                generateRoleReferenceDoc(idx, vFile, offset, element)
            }
            // Local variable introduction site (e.g., _@witness in "as _@witness")
            is VivLocalVariable -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                val construct = idx.getConstructAt(vFile, element.textOffset) ?: return null
                buildLocalVarDocFromDecl(construct, name, element)
            }
            // Function calls
            is VivCustomFunctionCall -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateFunctionCallDoc(idx, name)
            }
            // Include file paths
            is VivFilePath -> generateIncludeDoc(idx, element)
            is VivIncludeStatement -> {
                val filePath = element.filePath ?: return null
                generateIncludeDoc(idx, filePath)
            }
            // Enum tokens
            is VivEnum -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateEnumDoc(idx, name)
            }
            // Tags
            is VivTag -> {
                val named = element as? VivNamedElement ?: return null
                val name = named.name ?: return null
                generateTagDoc(idx, name)
            }
            // Plan phase names (>phase-name in source code)
            is VivPlanPhaseName -> {
                val phaseName = (element as? VivNamedElement)?.name ?: return null
                val construct = idx.getConstructAt(vFile, element.textOffset) ?: return null
                if (construct.type == ConstructType.PLAN) {
                    buildPhaseDoc(idx, construct, phaseName)
                } else null
            }
            // File-level documentation (reached via psi_element://file: links)
            is PsiFile -> {
                generateFileDoc(idx, vFile)
            }
            // Fallback: keyword tooltip from the data-driven tooltip table
            else -> {
                val fallbackElement = originalElement ?: element
                val tokenText = fallbackElement.text
                val ancestorTypes = collectAncestorTypes(fallbackElement)
                val nextSibling = nextLeafSiblingText(fallbackElement)
                val tooltip = VivKeywordTooltips.getTooltip(tokenText, ancestorTypes, nextSibling)
                if (tooltip != null) buildKeywordTooltipDoc(tokenText, tooltip) else null
            }
        }
    }

    // ========================================================================
    // Construct documentation
    // ========================================================================

    private fun generateConstructDocByName(idx: VivProjectIndex, name: String): String? {
        val constructs = idx.getConstructsByName(name)
        if (constructs.isEmpty()) return null
        val construct = constructs.first()
        return buildConstructDoc(idx, construct)
    }

    private fun generateConstructDocByType(idx: VivProjectIndex, type: ConstructType, name: String): String? {
        val construct = idx.getConstruct(type, name) ?: return generateConstructDocByName(idx, name)
        return buildConstructDoc(idx, construct)
    }

    private fun buildConstructDoc(idx: VivProjectIndex, construct: ConstructInfo): String {
        val sb = StringBuilder()
        // Definition block
        sb.append(DocumentationMarkup.DEFINITION_START)
        val modifiers = buildString {
            if (construct.isReserved) append("reserved ")
            if (construct.isTemplate) append("template ")
        }
        sb.append(escape("${modifiers}${construct.type.keyword} ${construct.name}"))
        if (construct.parent != null) {
            sb.append(" from ")
            sb.append(constructLink(idx, construct.parent))
        }
        if (construct.isStub) {
            sb.append(";")
        }
        sb.append(DocumentationMarkup.DEFINITION_END)
        // Content block — comment
        if (construct.comment != null) {
            sb.append(DocumentationMarkup.CONTENT_START)
            sb.append(escape(construct.comment).replace("\n", "<br/>"))
            sb.append(DocumentationMarkup.CONTENT_END)
        }
        // Sections table
        sb.append(DocumentationMarkup.SECTIONS_START)
        // Gloss (with inheritance)
        val glossSource = resolveInheritedField(idx, construct) { it.gloss }
        if (glossSource != null) {
            val (value, inherited, ancestor) = glossSource
            val glossHtml = linkifyRoleReferences(value, construct.name) + inheritedAnnotation(inherited, ancestor, idx)
            addSection(sb, "Gloss:", glossHtml)
        }
        // Tags (with inheritance)
        val tagsSource = resolveInheritedField(idx, construct) {
            if (it.tags.isNotEmpty()) it.tags.joinToString(", ") else null
        }
        if (tagsSource != null) {
            val (value, inherited, ancestor) = tagsSource
            val tags = value.split(", ")
            val tagLinks = tags.joinToString(", ") { tagLink(it) }
            addSection(sb, "Tags:", tagLinks + inheritedAnnotation(inherited, ancestor, idx))
        }
        // Importance (with inheritance)
        val importanceSource = resolveInheritedField(idx, construct) { it.importance }
        if (importanceSource != null) {
            val (value, inherited, ancestor) = importanceSource
            val importanceHtml = linkifyEnumTokens(escape(value)) + inheritedAnnotation(inherited, ancestor, idx)
            addSection(sb, "Importance:", importanceHtml)
        }
        // Roles
        val allRoles = idx.getAllRoles(construct)
        if (allRoles.isNotEmpty()) {
            val ownRoleNames = construct.roles.map { it.name }.toSet() +
                construct.actionRoles.map { it.name }.toSet()
            val isPatternActions = construct.type == ConstructType.PATTERN
            val entityRoles = allRoles.filter { !isPatternActions || it in construct.roles }
            val actionRoles = construct.actionRoles
            val rolesHtml = StringBuilder()
            for ((i, role) in entityRoles.withIndex()) {
                appendRoleSummaryLine(rolesHtml, role, construct, ownRoleNames, idx, isLast = i == entityRoles.size - 1)
            }
            if (rolesHtml.isNotEmpty()) {
                addSection(sb, "Roles:", rolesHtml.toString())
            }
            // If this is a sifting pattern, also show action-variable roles separately
            if (actionRoles.isNotEmpty()) {
                val actionsHtml = StringBuilder()
                for ((i, role) in actionRoles.withIndex()) {
                    appendRoleSummaryLine(actionsHtml, role, construct, ownRoleNames, idx, isLast = i == actionRoles.size - 1)
                }
                addSection(sb, "Actions:", actionsHtml.toString())
            }
        }
        // Section expression counts — only show when > 0, dim (n) format
        if (construct.conditionCount > 0) {
            addSection(sb, "Conditions:", dimCount(construct.conditionCount))
        }
        if (construct.scratchVars.isNotEmpty()) {
            addSection(sb, "Scratch:", dimCount(construct.scratchVars.size))
        }
        if (construct.effectCount > 0) {
            addSection(sb, "Effects:", dimCount(construct.effectCount))
        }
        if (construct.reactionCount > 0) {
            addSection(sb, "Reactions:", dimCount(construct.reactionCount))
        }
        if (construct.embargoCount > 0) {
            addSection(sb, "Embargoes:", dimCount(construct.embargoCount))
        }
        // Saliences — role list with default/custom annotations (all comma-separated)
        if (construct.salienceRoles.isNotEmpty() || construct.hasDefaultSalience || construct.hasCustomSalience) {
            val parts = mutableListOf<String>()
            for (roleName in construct.salienceRoles) {
                parts.add(roleLink(construct.name, roleName, "@$roleName"))
            }
            if (construct.hasDefaultSalience) parts.add("${DocumentationMarkup.GRAYED_START}default${DocumentationMarkup.GRAYED_END}")
            if (construct.hasCustomSalience) parts.add("${DocumentationMarkup.GRAYED_START}custom${DocumentationMarkup.GRAYED_END}")
            addSection(sb, "Saliences:", parts.joinToString(", "))
        }
        // Associations — role list with default/custom annotations (all comma-separated)
        if (construct.associationRoles.isNotEmpty() || construct.hasDefaultAssociation || construct.hasCustomAssociation) {
            val parts = mutableListOf<String>()
            for (roleName in construct.associationRoles) {
                parts.add(roleLink(construct.name, roleName, "@$roleName"))
            }
            if (construct.hasDefaultAssociation) parts.add("${DocumentationMarkup.GRAYED_START}default${DocumentationMarkup.GRAYED_END}")
            if (construct.hasCustomAssociation) parts.add("${DocumentationMarkup.GRAYED_START}custom${DocumentationMarkup.GRAYED_END}")
            addSection(sb, "Associations:", parts.joinToString(", "))
        }
        // Target policy and candidates (selectors only)
        if (construct.targetPolicy != null) {
            val displayPolicy = when (construct.targetPolicy) {
                "randomly" -> "random"
                "with weights" -> "weighted"
                "in order" -> "ordered"
                else -> construct.targetPolicy
            }
            addSection(sb, "Policy:", escape(displayPolicy))
        }
        if (construct.candidates.isNotEmpty()) {
            val candidateLinks = construct.candidates.joinToString(", ") { name ->
                constructLink(idx, name)
            }
            addSection(sb, "Candidates:", candidateLinks)
        }
        // Predicates (queries only) — grouped by field name
        if (construct.predicates.isNotEmpty()) {
            val grouped = construct.predicates.groupBy { it.field }
            for ((field, preds) in grouped) {
                val label = field.replaceFirstChar { it.uppercase() } + ":"
                val linesHtml = preds.mapIndexed { i, pred ->
                    val operatorHtml = if (pred.operator.isNotEmpty()) {
                        "${DocumentationMarkup.GRAYED_START}${escape(pred.operator)}:${DocumentationMarkup.GRAYED_END} "
                    } else ""
                    val valueLinks = pred.values.joinToString(", ") { v ->
                        linkifyPredicateValue(idx, pred.field, v, construct.name)
                    }
                    if (i == 0) {
                        operatorHtml + valueLinks
                    } else {
                        "<br/>$operatorHtml$valueLinks"
                    }
                }.joinToString("")
                addSection(sb, label, linesHtml)
            }
        }
        // Phases (plans only) — each phase on its own line with control annotations
        if (construct.phaseInfos.isNotEmpty()) {
            val phasesStr = construct.phaseInfos.joinToString("<br/>") { phase ->
                phaseLink(construct.name, phase.name, "&gt;${escape(phase.name)}") + phaseControlAnnotation(phase)
            }
            addSection(sb, "Phases:", phasesStr)
        }
        // Children — constructs that inherit from this one
        val children = idx.getAllConstructsOfType(construct.type)
            .filter { it.parent == construct.name }
        if (children.isNotEmpty()) {
            addSection(sb, "Children:", elidedList(children) { constructLinkForType(it.type, it.name) })
        }
        // Inherits from
        val chain = idx.getParentChain(construct)
        if (chain.isNotEmpty()) {
            val chainStr = chain.joinToString(" \u2190 ") { constructLink(idx, it.name) }
            addSection(sb, "Inherits from:", chainStr)
        }
        // File — clickable filename (opens file popup)
        addSection(sb, "File:", fileLink(construct.file.name))

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    /**
     * Appends a single role summary line (with labels, inheritance, casting info) to [sb].
     */
    private fun appendRoleSummaryLine(
        sb: StringBuilder, role: RoleInfo, construct: ConstructInfo,
        ownRoleNames: Set<String>, idx: VivProjectIndex, isLast: Boolean = false,
    ) {
        val star = if (role.isGroup) "*" else ""
        // For inherited roles, link to the defining construct so the popup resolves correctly
        val definer = if (role.name !in ownRoleNames) {
            val chain = idx.getParentChain(construct)
            chain.find { parent -> parent.roles.any { it.name == role.name } }
        } else null
        val linkConstruct = definer?.name ?: construct.name
        val roleRef = roleLink(linkConstruct, role.name, escape("${role.fullName}$star"))
        sb.append(roleRef)
        if (role.labels.isNotEmpty()) {
            sb.append(": <i>${escape(role.labels.joinToString(", "))}</i>")
        }
        if (definer != null) {
            sb.append(" ${DocumentationMarkup.GRAYED_START}(from ${constructLink(idx, definer.name)})${DocumentationMarkup.GRAYED_END}")
        }
        if (!isLast) {
            sb.append("<br/>")
        }
    }

    // ========================================================================
    // Phase documentation
    // ========================================================================

    /**
     * Builds a popup for a plan phase (e.g., `>reconnaissance`).
     */
    private fun buildPhaseDoc(idx: VivProjectIndex, plan: ConstructInfo, phaseName: String): String {
        val sb = StringBuilder()

        // Definition block
        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape(">$phaseName"))
        sb.append(DocumentationMarkup.DEFINITION_END)
        // Sections
        sb.append(DocumentationMarkup.SECTIONS_START)
        // Plan
        addSection(sb, "Plan:", constructLinkForType(plan.type, plan.name))
        // Position
        val phaseInfos = plan.phaseInfos
        val phaseIndex = phaseInfos.indexOfFirst { it.name == phaseName }
        val phaseInfo = if (phaseIndex >= 0) phaseInfos[phaseIndex] else null
        if (phaseIndex >= 0) {
            addSection(sb, "Position:", "${DocumentationMarkup.GRAYED_START}${phaseIndex + 1}/${phaseInfos.size}${DocumentationMarkup.GRAYED_END}")
            // Previous — with control annotation
            val prevHtml = if (phaseIndex > 0) {
                val prev = phaseInfos[phaseIndex - 1]
                phaseLink(plan.name, prev.name, "&gt;${escape(prev.name)}") + phaseControlAnnotation(prev)
            } else {
                "${DocumentationMarkup.GRAYED_START}(none)${DocumentationMarkup.GRAYED_END}"
            }
            addSection(sb, "Previous:", prevHtml)
            // Next — with control annotation
            val nextHtml = if (phaseIndex < phaseInfos.size - 1) {
                val next = phaseInfos[phaseIndex + 1]
                phaseLink(plan.name, next.name, "&gt;${escape(next.name)}") + phaseControlAnnotation(next)
            } else {
                "${DocumentationMarkup.GRAYED_START}(none)${DocumentationMarkup.GRAYED_END}"
            }
            addSection(sb, "Next:", nextHtml)
        }
        // Reactions count — only when > 0
        if (phaseInfo != null && phaseInfo.reactionCount > 0) {
            addSection(sb, "Reactions:", dimCount(phaseInfo.reactionCount))
        }
        // Control flow keywords — only when at least one is present
        if (phaseInfo != null) {
            val controlKeywords = mutableListOf<String>()
            if (phaseInfo.hasWait) controlKeywords.add("wait")
            if (phaseInfo.hasSucceed) controlKeywords.add("succeed")
            if (phaseInfo.hasFail) controlKeywords.add("fail")
            if (phaseInfo.hasAdvance) controlKeywords.add("advance")
            if (controlKeywords.isNotEmpty()) {
                addSection(sb, "Control:", controlKeywords.joinToString(", "))
            }
        }
        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    // ========================================================================
    // Role documentation
    // ========================================================================

    private fun generateVivReferenceDoc(
        idx: VivProjectIndex, file: VirtualFile, offset: Int, element: PsiElement
    ): String? {
        val vivRef = element as? VivVivReference ?: return null
        val name = (vivRef as? VivNamedElement)?.name ?: return null
        val hasScratch = vivRef.scratchVariableSigil != null
        val hasLocal = vivRef.localVariableSigil != null
        return when {
            hasScratch -> {
                val construct = idx.getConstructAt(file, offset) ?: return null
                val varInfo = construct.scratchVars.find { it.name == name } ?: return null
                buildScratchVarDoc(construct, varInfo)
            }
            hasLocal -> {
                val construct = idx.getConstructAt(file, offset) ?: return null
                buildLocalVarDoc(construct, name, vivRef)
            }
            else -> {
                val construct = idx.getConstructAt(file, offset) ?: return null
                val (definingConstruct, role) = idx.resolveRole(construct, name) ?: return null
                buildRoleDoc(construct, definingConstruct, role, idx)
            }
        }
    }

    private fun generateRoleReferenceDoc(
        idx: VivProjectIndex, file: VirtualFile, offset: Int, element: PsiElement
    ): String? {
        val roleRef = element as? VivRoleReference ?: return null
        val name = (roleRef as? VivNamedElement)?.name ?: return null

        val parentType = element.parent?.node?.elementType
        if (parentType == VivTypes.BINDING) {
            return generateBindingLhsRoleDoc(idx, file, offset, element, name)
        }
        // Otherwise, resolve the role in the enclosing construct
        val construct = idx.getConstructAt(file, offset) ?: return null
        val (definingConstruct, role) = idx.resolveRole(construct, name) ?: return null
        return buildRoleDoc(construct, definingConstruct, role, idx)
    }

    private fun generateBindingLhsRoleDoc(
        idx: VivProjectIndex, file: VirtualFile, offset: Int,
        element: PsiElement, roleName: String,
    ): String? {
        val targetConstruct = findBindingTargetConstruct(idx, element) ?: return null
        val (definingConstruct, role) = idx.resolveRole(targetConstruct, roleName) ?: return null
        return buildRoleDoc(targetConstruct, definingConstruct, role, idx)
    }

    private fun findBindingTargetConstruct(
        idx: VivProjectIndex, element: PsiElement
    ): ConstructInfo? {
        val reaction = PsiTreeUtil.getParentOfType(element, VivReaction::class.java)
        if (reaction != null) {
            val reactionTarget = reaction.reactionHeader?.reactionTarget ?: return null
            val typeText = reactionTarget.reactionTargetType?.text ?: return null
            val name = (reactionTarget as? VivNamedElement)?.name ?: return null
            val type = ConstructType.fromKeyword(typeText) ?: return null
            return idx.getConstruct(type, name)
        }
        // Then try selector candidate
        val candidate = PsiTreeUtil.getParentOfType(element, VivSelectorCandidate::class.java)
        if (candidate != null) {
            val candidateName = candidate.selectorCandidateName
            val name = (candidateName as? VivNamedElement)?.name ?: return null
            val selector = PsiTreeUtil.getParentOfType(element, VivSelector::class.java)
            val selectorType = selector?.selectorHeader?.selectorType?.text ?: return null
            val targetType = when (selectorType) {
                "action-selector" -> ConstructType.ACTION
                "plan-selector" -> ConstructType.PLAN
                else -> return null
            }
            return idx.getConstruct(targetType, name)
        }
        // Then try trope fit
        val tropeFit = PsiTreeUtil.getParentOfType(element, VivTropeFit::class.java)
        if (tropeFit != null) {
            val name = (tropeFit as VivNamedElement).name ?: return null
            return idx.getConstruct(ConstructType.TROPE, name)
        }
        // Then try sugared trope fit
        val tropeFitSugared = PsiTreeUtil.getParentOfType(element, VivTropeFitSugared::class.java)
        if (tropeFitSugared != null) {
            val name = (tropeFitSugared as VivNamedElement).name ?: return null
            return idx.getConstruct(ConstructType.TROPE, name)
        }
        // Then try sifting header
        val siftingHeader = PsiTreeUtil.getParentOfType(element, VivSiftingHeader::class.java)
        if (siftingHeader != null) {
            val name = (siftingHeader as VivNamedElement).name ?: return null
            return idx.getConstruct(ConstructType.PATTERN, name)
        }
        // Then try search query NAME: with: @role: ...
        val actionSearch = PsiTreeUtil.getParentOfType(element, VivActionSearch::class.java)
        if (actionSearch != null) {
            val name = (actionSearch as VivNamedElement).name ?: return null
            return idx.getConstruct(ConstructType.QUERY, name)
        }
        // Finally try sift pattern NAME: with: @role: ... (sifting wraps sifting_header + sifting_body)
        val sifting = PsiTreeUtil.getParentOfType(element, VivSifting::class.java)
        if (sifting != null) {
            val name = (sifting.siftingHeader as VivNamedElement).name ?: return null
            return idx.getConstruct(ConstructType.PATTERN, name)
        }
        return null
    }

    private fun buildRoleDoc(
        contextConstruct: ConstructInfo,
        definingConstruct: ConstructInfo,
        role: RoleInfo,
        idx: VivProjectIndex,
    ): String {
        val sb = StringBuilder()
        // Definition block
        sb.append(DocumentationMarkup.DEFINITION_START)
        val star = if (role.isGroup) "*" else ""
        sb.append(escape("${role.fullName}$star"))
        if (role.labels.isNotEmpty()) {
            sb.append(": ${escape(role.labels.joinToString(", "))}")
        }
        sb.append(DocumentationMarkup.DEFINITION_END)
        // Content block — role comment
        if (role.comment != null) {
            sb.append(DocumentationMarkup.CONTENT_START)
            sb.append(escape(role.comment).replace("\n", "<br/>"))
            sb.append(DocumentationMarkup.CONTENT_END)
        }
        // Sections
        sb.append(DocumentationMarkup.SECTIONS_START)
        // Defined in — first section
        val constructRef = constructLink(idx, definingConstruct.name)
        val sourceHtml = if (definingConstruct.name != contextConstruct.name) {
            "${constructLink(idx, contextConstruct.name)} ${DocumentationMarkup.GRAYED_START}(from $constructRef)${DocumentationMarkup.GRAYED_END}"
        } else {
            constructRef
        }
        addSection(sb, "Defined in:", sourceHtml)
        // Slots
        if (role.slotRange != null) {
            addSection(sb, "Slots:", escape(role.slotRange))
        }
        // Casting — use the directive itself as the section label
        if (role.castingDirective != null && role.castingExpression != null) {
            val label = role.castingDirective.replaceFirstChar { it.uppercase() }
            val castingHtml = linkifyRoleReferences(role.castingExpression, definingConstruct.name)
            addSection(sb, "$label:", castingHtml)
        }
        // Spawn
        if (role.spawnExpression != null) {
            val funcMatch = Regex("""~([A-Za-z_][A-Za-z0-9_-]*)""").find(role.spawnExpression)
            val spawnHtml = if (funcMatch != null) {
                val funcName = funcMatch.groupValues[1]
                val before = role.spawnExpression.substring(0, funcMatch.range.first)
                val after = role.spawnExpression.substring(funcMatch.range.last + 1)
                escape(before) + "~${functionLink(funcName)}" + escape(after)
            } else {
                escape(role.spawnExpression)
            }
            addSection(sb, "Spawn:", spawnHtml)
        }
        // Renames — show @original (from <construct>) with clickable links
        if (role.renamesTarget != null) {
            val renamesMatch = Regex("""[@&]([A-Za-z_][A-Za-z0-9_-]*)""").find(role.renamesTarget)
            val renamesHtml = if (renamesMatch != null) {
                val refName = renamesMatch.groupValues[1]
                val parentName = definingConstruct.parent ?: definingConstruct.name
                val roleRef = roleLink(parentName, refName, escape(role.renamesTarget))
                val parentConstructLink = constructLink(idx, parentName)
                "$roleRef ${DocumentationMarkup.GRAYED_START}(from $parentConstructLink)${DocumentationMarkup.GRAYED_END}"
            } else {
                escape(role.renamesTarget)
            }
            addSection(sb, "Renames:", renamesHtml)
        }
        // Inherited by — child constructs that don't override this role
        val inheritors = findRoleInheritors(idx, definingConstruct, role.name)
        if (inheritors.isNotEmpty()) {
            addSection(sb, "Inherited by:", elidedList(inheritors) { constructLinkForType(it.type, it.name) })
        }
        // Aliases — roles in child constructs that rename this role
        val aliases = findRoleAliases(idx, definingConstruct, role.name)
        if (aliases.isNotEmpty()) {
            val aliasesHtml = aliases.joinToString(", ") { (renamingRole, renamingConstruct) ->
                val aliasRef = roleLink(renamingConstruct.name, renamingRole.name, escape(renamingRole.fullName))
                "$aliasRef ${DocumentationMarkup.GRAYED_START}(in ${constructLinkForType(renamingConstruct.type, renamingConstruct.name)})${DocumentationMarkup.GRAYED_END}"
            }
            addSection(sb, "Aliases:", aliasesHtml)
        }

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    /**
     * Finds child constructs that inherit the given role without overriding it.
     * Excludes the defining construct itself.
     */
    private fun findRoleInheritors(
        idx: VivProjectIndex, definingConstruct: ConstructInfo, roleName: String
    ): List<ConstructInfo> {
        val result = mutableListOf<ConstructInfo>()
        val allSameType = idx.getAllConstructsOfType(definingConstruct.type)
        for (candidate in allSameType) {
            if (candidate.name == definingConstruct.name) continue
            // Check if the candidate's parent chain includes the defining construct
            val chain = idx.getParentChain(candidate)
            if (chain.any { it.name == definingConstruct.name }) {
                // Check that the candidate doesn't override this role
                val overrides = candidate.roles.any { it.name == roleName } ||
                    candidate.actionRoles.any { it.name == roleName }
                if (!overrides) {
                    result.add(candidate)
                }
            }
        }
        return result
    }

    /**
     * Finds all roles across the project that rename this role. Scans all constructs
     * for roles whose [RoleInfo.renamesTarget] matches `@roleName` or `&roleName`.
     */
    private fun findRoleAliases(
        idx: VivProjectIndex, definingConstruct: ConstructInfo, roleName: String,
    ): List<Pair<RoleInfo, ConstructInfo>> {
        val result = mutableListOf<Pair<RoleInfo, ConstructInfo>>()
        val allConstructs = idx.getAllConstructs()
        val targetPattern = Regex("""[@&]${Regex.escape(roleName)}$""")
        for (candidate in allConstructs) {
            for (role in candidate.roles + candidate.actionRoles) {
                val target = role.renamesTarget ?: continue
                if (targetPattern.containsMatchIn(target)) {
                    result.add(role to candidate)
                }
            }
        }
        return result
    }

    // ========================================================================
    // Scratch variable documentation
    // ========================================================================

    private fun buildScratchVarDoc(construct: ConstructInfo, varInfo: VarInfo): String {
        val sb = StringBuilder()

        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape(varInfo.fullName))
        sb.append(DocumentationMarkup.DEFINITION_END)

        sb.append(DocumentationMarkup.SECTIONS_START)

        if (varInfo.initialValue != null) {
            addSection(sb, "Initial value:", escape(varInfo.initialValue))
        }

        // Determine type from the sigil
        val typeStr = if (varInfo.fullName.startsWith("\$@")) "entity" else "symbol"
        addSection(sb, "Type:", "${DocumentationMarkup.GRAYED_START}$typeStr${DocumentationMarkup.GRAYED_END}")

        val constructRef = constructLinkForType(construct.type, construct.name)
        addSection(sb, "Scope:", "$constructRef ${DocumentationMarkup.GRAYED_START}(scratch variable)${DocumentationMarkup.GRAYED_END}")

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    // ========================================================================
    // Local variable documentation
    // ========================================================================

    private fun buildLocalVarDoc(construct: ConstructInfo, name: String, vivRef: VivVivReference): String {
        val sb = StringBuilder()

        // Determine sigil from binding_type child
        val sigil = if (vivRef.bindingType?.text == "&") "&" else "@"
        val fullName = "_$sigil$name"

        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape(fullName))
        sb.append(DocumentationMarkup.DEFINITION_END)

        sb.append(DocumentationMarkup.SECTIONS_START)

        val typeStr = if (sigil == "@") "entity" else "symbol"
        addSection(sb, "Type:", "${DocumentationMarkup.GRAYED_START}$typeStr${DocumentationMarkup.GRAYED_END}")

        val constructRef = constructLinkForType(construct.type, construct.name)
        addSection(sb, "Scope:", "$constructRef ${DocumentationMarkup.GRAYED_START}(local variable in its enclosing block)${DocumentationMarkup.GRAYED_END}")

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    /**
     * Builds documentation for a local variable at its declaration site
     * (`_@name` in `loop ... as _@name:` or `for _@name:`).
     * The PSI element is [VivLocalVariable], not [VivVivReference].
     */
    private fun buildLocalVarDocFromDecl(construct: ConstructInfo, name: String, element: PsiElement): String {
        val sb = StringBuilder()

        val localVar = element as? VivLocalVariable
        val sigil = if (localVar?.bindingType?.text == "&") "&" else "@"
        val fullName = "_$sigil$name"

        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape(fullName))
        sb.append(DocumentationMarkup.DEFINITION_END)

        sb.append(DocumentationMarkup.SECTIONS_START)

        val typeStr = if (sigil == "@") "entity" else "symbol"
        addSection(sb, "Type:", "${DocumentationMarkup.GRAYED_START}$typeStr${DocumentationMarkup.GRAYED_END}")

        val constructRef = constructLinkForType(construct.type, construct.name)
        addSection(sb, "Scope:", "$constructRef ${DocumentationMarkup.GRAYED_START}(local variable in its enclosing block)${DocumentationMarkup.GRAYED_END}")

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    // ========================================================================
    // Function call documentation
    // ========================================================================

    private fun generateFunctionCallDoc(idx: VivProjectIndex, name: String): String {
        val sb = StringBuilder()

        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape("~$name()"))
        sb.append(DocumentationMarkup.DEFINITION_END)

        sb.append(DocumentationMarkup.SECTIONS_START)

        val files = idx.getFilesWithFunction("~$name")
        val constructs = files.flatMap { idx.getConstructsInFile(it) }.distinctBy { it.name }
        if (constructs.isNotEmpty()) {
            addSection(sb, "Appears in:", elidedList(constructs) { constructLinkForType(it.type, it.name) })
        }
        addSection(sb, "Note:", "${DocumentationMarkup.GRAYED_START}Custom function (defined in host application)${DocumentationMarkup.GRAYED_END}")

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    // ========================================================================
    // Include documentation
    // ========================================================================

    private fun generateIncludeDoc(idx: VivProjectIndex, filePath: VivFilePath): String? {
        val reference = filePath.reference ?: return null
        val resolved = reference.resolve() ?: return null
        val targetFile = resolved.containingFile?.virtualFile ?: return null

        return generateFileDoc(idx, targetFile)
    }

    // ========================================================================
    // Enum token documentation
    // ========================================================================

    private fun generateEnumDoc(idx: VivProjectIndex, name: String): String {
        val sb = StringBuilder()

        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape("#$name"))
        sb.append(DocumentationMarkup.DEFINITION_END)

        sb.append(DocumentationMarkup.SECTIONS_START)

        val files = idx.getFilesWithEnum("#$name")
        val constructs = files.flatMap { idx.getConstructsInFile(it) }.distinctBy { it.name }
        if (constructs.isNotEmpty()) {
            addSection(sb, "Appears in:", elidedList(constructs) { constructLinkForType(it.type, it.name) })
        }
        addSection(sb, "Note:", "${DocumentationMarkup.GRAYED_START}Enum value (defined in host application)${DocumentationMarkup.GRAYED_END}")

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    // ========================================================================
    // Tag documentation
    // ========================================================================

    private fun generateTagDoc(idx: VivProjectIndex, name: String): String {
        val sb = StringBuilder()

        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape(name))
        sb.append(DocumentationMarkup.DEFINITION_END)

        sb.append(DocumentationMarkup.SECTIONS_START)

        val constructs = idx.getConstructsWithTag(name)
        if (constructs.isNotEmpty()) {
            addSection(sb, "Used in:", elidedList(constructs) { constructLinkForType(it.type, it.name) })
        }

        val files = idx.getFilesWithTag(name)
        val fileConstructs = files.flatMap { idx.getConstructsInFile(it) }.distinctBy { it.name }
        if (fileConstructs.isNotEmpty()) {
            addSection(sb, "Appears in:", elidedList(fileConstructs) { constructLinkForType(it.type, it.name) })
        }

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    // ========================================================================
    // File documentation
    // ========================================================================

    private fun generateFileDoc(idx: VivProjectIndex, file: VirtualFile): String {
        val sb = StringBuilder()

        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append(escape(file.name))
        sb.append(DocumentationMarkup.DEFINITION_END)

        // Content block — top-of-file comment
        val topComment = extractTopOfFileComment(file)
        if (topComment != null) {
            sb.append(DocumentationMarkup.CONTENT_START)
            sb.append(escape(topComment).replace("\n", "<br/>"))
            sb.append(DocumentationMarkup.CONTENT_END)
        }

        sb.append(DocumentationMarkup.SECTIONS_START)

        // Defines: list constructs grouped by type
        val constructs = idx.getConstructsInFile(file)
        if (constructs.isNotEmpty()) {
            val typeOrder = listOf(
                ConstructType.ACTION to "Actions:",
                ConstructType.PLAN to "Plans:",
                ConstructType.QUERY to "Queries:",
                ConstructType.PATTERN to "Patterns:",
                ConstructType.TROPE to "Tropes:",
                ConstructType.ACTION_SELECTOR to "Action Selectors:",
                ConstructType.PLAN_SELECTOR to "Plan Selectors:",
            )
            val byType = constructs.groupBy { it.type }
            for ((type, label) in typeOrder) {
                val group = byType[type] ?: continue
                val links = group.sortedBy { it.name }.joinToString(", ") {
                    constructLinkForType(it.type, it.name)
                }
                addSection(sb, label, links)
            }
        }

        // Path comes last
        addSection(sb, "Path:", escape(file.path))

        sb.append(DocumentationMarkup.SECTIONS_END)
        return sb.toString()
    }

    // ========================================================================
    // File comment extraction
    // ========================================================================

    /**
     * Reads the leading `//` comment block from the top of a file.
     * Skips decorative separator lines (same filtering as [VivFileIndexer]).
     */
    private fun extractTopOfFileComment(file: VirtualFile): String? {
        if (!file.isValid) return null
        val text = VfsUtilCore.loadText(file)
        val separatorPattern = Regex("""^[\s\-=~#*]+$""")
        val commentLines = mutableListOf<String>()
        for (line in text.lines()) {
            val trimmed = line.trim()
            when {
                trimmed.startsWith("//") -> {
                    val content = trimmed.removePrefix("//").trim()
                    if (content.isEmpty() || separatorPattern.matches(content)) continue
                    commentLines.add(content)
                }
                trimmed.isEmpty() -> {
                    if (commentLines.isNotEmpty()) break
                }
                else -> break
            }
        }
        return commentLines.joinToString("\n").ifEmpty { null }
    }

    // ========================================================================
    // Inheritance helpers
    // ========================================================================

    /**
     * Resolves a field value by walking the parent chain. Returns a triple of
     * (value, inherited, ancestor) where ancestor is the construct that defined
     * the value (null if own).
     */
    private fun resolveInheritedField(
        idx: VivProjectIndex, construct: ConstructInfo, extractor: (ConstructInfo) -> String?
    ): Triple<String, Boolean, ConstructInfo?>? {
        val own = extractor(construct)
        if (own != null) return Triple(own, false, null)
        val chain = idx.getParentChain(construct)
        for (ancestor in chain) {
            val value = extractor(ancestor)
            if (value != null) return Triple(value, true, ancestor)
        }
        return null
    }

    /**
     * Returns a grayed "(from <construct>)" annotation with a clickable link
     * if [inherited] is true, or empty string if own.
     */
    private fun inheritedAnnotation(inherited: Boolean, ancestor: ConstructInfo?, idx: VivProjectIndex): String {
        if (!inherited || ancestor == null) return ""
        return " ${DocumentationMarkup.GRAYED_START}(from ${constructLink(idx, ancestor.name)})${DocumentationMarkup.GRAYED_END}"
    }

    // ========================================================================
    // List elision
    // ========================================================================

    /**
     * Renders a list of items, truncating with "... and N more" if the list
     * exceeds [LIST_ELISION_THRESHOLD].
     */
    private fun <T> elidedList(items: List<T>, render: (T) -> String): String {
        if (items.size <= LIST_ELISION_THRESHOLD) {
            return items.joinToString(", ") { render(it) }
        }
        val shown = items.take(LIST_ELISION_THRESHOLD).joinToString(", ") { render(it) }
        val remaining = items.size - LIST_ELISION_THRESHOLD
        return "$shown, ${DocumentationMarkup.GRAYED_START}... and $remaining more${DocumentationMarkup.GRAYED_END}"
    }

    // ========================================================================
    // HTML helpers
    // ========================================================================

    private fun addSection(sb: StringBuilder, label: String, value: String) {
        sb.append(DocumentationMarkup.SECTION_HEADER_START)
        sb.append(label)
        sb.append(DocumentationMarkup.SECTION_SEPARATOR)
        sb.append("<p>").append(value)
        sb.append(DocumentationMarkup.SECTION_END)
    }

    private fun dimCount(n: Int): String =
        "${DocumentationMarkup.GRAYED_START}($n)${DocumentationMarkup.GRAYED_END}"

    private fun escape(text: String): String =
        text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    // ========================================================================
    // Phase annotation helpers
    // ========================================================================

    /**
     * Returns a dim parenthetical annotation listing the control flow keywords
     * present in a phase (e.g., " (succeed, fail)"), or empty string if none.
     */
    private fun phaseControlAnnotation(phase: PhaseInfo): String {
        val keywords = mutableListOf<String>()
        if (phase.hasSucceed) keywords.add("succeed")
        if (phase.hasFail) keywords.add("fail")
        if (phase.hasAdvance) keywords.add("advance")
        if (phase.hasWait) keywords.add("wait")
        if (keywords.isEmpty()) return ""
        return " ${DocumentationMarkup.GRAYED_START}(${keywords.joinToString(", ")})${DocumentationMarkup.GRAYED_END}"
    }

    // ========================================================================
    // Link builders
    // ========================================================================

    /**
     * Creates a clickable link to a construct, resolving its type from the index.
     * Falls back to plain text if the construct is not found.
     */
    private fun constructLink(idx: VivProjectIndex, name: String): String {
        val constructs = idx.getConstructsByName(name)
        if (constructs.isEmpty()) return escape(name)
        val c = constructs.first()
        return constructLinkForType(c.type, c.name)
    }

    private fun constructLinkForType(type: ConstructType, name: String): String =
        "<a href=\"psi_element://construct:${type.keyword}:$name\">${escape(name)}</a>"

    private fun phaseLink(planName: String, phaseName: String, displayText: String): String =
        "<a href=\"psi_element://phase:$planName:$phaseName\">$displayText</a>"

    private fun roleLink(constructName: String, roleName: String, displayText: String): String =
        "<a href=\"psi_element://role:$constructName:$roleName\">$displayText</a>"

    private fun functionLink(funcName: String): String =
        "<a href=\"psi_element://function:$funcName\">${escape(funcName)}</a>"

    private fun enumLink(tokenName: String): String =
        "<a href=\"psi_element://enum:$tokenName\">#${escape(tokenName)}</a>"

    private fun tagLink(tagName: String): String =
        "<a href=\"psi_element://tag:$tagName\">${escape(tagName)}</a>"

    private fun fileLink(fileName: String): String =
        "<a href=\"psi_element://file:$fileName\">${escape(fileName)}</a>"

    /**
     * Replaces `#NAME` patterns in already-escaped text with clickable enum links.
     * Because the text is already HTML-escaped, the `#` is a literal `#`.
     */
    private fun linkifyEnumTokens(text: String): String {
        val enumPattern = Regex("""#([A-Za-z_][A-Za-z0-9_-]*)""")
        return enumPattern.replace(text) { match ->
            val tokenName = match.groupValues[1]
            enumLink(tokenName)
        }
    }

    /**
     * Linkifies a predicate value based on the predicate field type.
     * - `action` field: values are construct links
     * - `tags`/`associations` fields: values are tag links
     * - `importance`/`salience` fields with enum values (#TOKEN): enum links
     * - Role references (@name, @name.property): role link on the @name portion
     * - Everything else: plain text
     */
    private fun linkifyPredicateValue(idx: VivProjectIndex, field: String, value: String, constructName: String = ""): String {
        return when {
            field == "action" -> {
                val construct = idx.getConstructsByName(value).firstOrNull()
                if (construct != null) constructLinkForType(construct.type, construct.name) else escape(value)
            }
            field == "tags" || field == "associations" -> tagLink(value)
            value.startsWith("#") -> enumLink(value.removePrefix("#"))
            value.startsWith("@") || value.startsWith("&") -> {
                // Parse role reference, possibly with property access (e.g., @person.location)
                val roleRefPattern = Regex("""^([@&])([A-Za-z_][A-Za-z0-9_-]*)(.*)$""")
                val match = roleRefPattern.find(value)
                if (match != null) {
                    val sigil = match.groupValues[1]
                    val name = match.groupValues[2]
                    val rest = match.groupValues[3]
                    roleLink(constructName, name, escape("$sigil$name")) + escape(rest)
                } else {
                    escape(value)
                }
            }
            else -> escape(value)
        }
    }

    /**
     * Scans a casting expression for role references (@name) and wraps them in role links.
     */
    private fun linkifyRoleReferences(expression: String, constructName: String): String {
        val roleRefPattern = Regex("""([@&])([A-Za-z_][A-Za-z0-9_-]*)(\*?)""")
        val sb = StringBuilder()
        var lastEnd = 0
        for (match in roleRefPattern.findAll(expression)) {
            // Escape the literal text between matches
            sb.append(escape(expression.substring(lastEnd, match.range.first)))
            val sigil = match.groupValues[1]
            val name = match.groupValues[2]
            val star = match.groupValues[3]
            val display = "$sigil$name$star"
            sb.append(roleLink(constructName, name, escape(display)))
            lastEnd = match.range.last + 1
        }
        // Escape trailing text after the last match
        sb.append(escape(expression.substring(lastEnd)))
        return sb.toString()
    }

    // ========================================================================
    // Keyword tooltip helpers
    // ========================================================================

    /**
     * Collects element-type names from the token's ancestors (parent, grandparent,
     * great-grandparent, etc.) for matching against tooltip context strings. Walks
     * up to 5 levels to accommodate intermediate wrapper nodes.
     */
    private fun collectAncestorTypes(element: PsiElement): List<String> {
        val types = mutableListOf<String>()
        var current = element.parent
        var depth = 0
        while (current != null && current !is PsiFile && depth < 5) {
            val typeName = current.node?.elementType?.toString()
            if (typeName != null) types.add(typeName)
            current = current.parent
            depth++
        }
        return types
    }

    /**
     * Returns the text of the next visible leaf sibling of [element], or null
     * if there is no next sibling. Used by tooltip entries with a `nextToken`
     * constraint (e.g., `with` must be followed by `:` for complete bindings).
     */
    private fun nextLeafSiblingText(element: PsiElement): String? {
        var sibling = element.nextSibling
        while (sibling != null) {
            val text = sibling.text.trim()
            if (text.isNotEmpty()) return text
            sibling = sibling.nextSibling
        }
        return null
    }

    /**
     * Builds a simple keyword-tooltip popup using [DocumentationMarkup].
     */
    private fun buildKeywordTooltipDoc(keyword: String, tooltip: String): String {
        val sb = StringBuilder()
        sb.append(DocumentationMarkup.DEFINITION_START)
        sb.append("<b>${escape(keyword)}</b>")
        sb.append(DocumentationMarkup.DEFINITION_END)
        sb.append(DocumentationMarkup.CONTENT_START)
        sb.append(escape(tooltip).replace("\n", "<br/>").replace(Regex("`([^`]+)`"), "<code>$1</code>"))
        sb.append(DocumentationMarkup.CONTENT_END)
        return sb.toString()
    }
}
