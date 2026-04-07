package studio.sifty.viv

import com.intellij.psi.PsiComment
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiWhiteSpace
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.psi.*

/**
 * Walks the PSI tree of a [VivFile] and extracts structural data for the project index.
 * Stateless — call [indexFile] with a parsed PSI file.
 */
object VivFileIndexer {

    /**
     * Walks [psiFile]'s PSI tree and produces a [FileIndex] containing all constructs,
     * includes, enum tokens, function names, and tag names found in the file.
     */
    fun indexFile(psiFile: VivFile): FileIndex {
        val file = psiFile.virtualFile ?: return emptyFileIndex()
        return indexFile(psiFile, file)
    }

    fun indexFile(psiFile: VivFile, file: com.intellij.openapi.vfs.VirtualFile): FileIndex {
        val constructs = mutableListOf<ConstructInfo>()
        val includes = mutableListOf<IncludeInfo>()

        // Walk top-level children to find constructs and includes
        var child: PsiElement? = psiFile.firstChild
        while (child != null) {
            when (child) {
                is VivAction -> constructs.add(indexAction(child, file))
                is VivPlan -> constructs.add(indexPlan(child, file))
                is VivQuery -> constructs.add(indexQuery(child, file))
                is VivSiftingPattern -> constructs.add(indexSiftingPattern(child, file))
                is VivTrope -> constructs.add(indexTrope(child, file))
                is VivSelector -> constructs.add(indexSelector(child, file))
                is VivIncludeStatement -> indexInclude(child)?.let { includes.add(it) }
            }
            child = child.nextSibling
        }

        // Fix up bodyEnd boundaries: each construct's bodyEnd is the next construct's headerOffset.
        // The last construct's bodyEnd is the file length.
        val text = psiFile.text
        for (i in constructs.indices) {
            val bodyEnd = if (i + 1 < constructs.size) constructs[i + 1].headerOffset else text.length
            constructs[i] = constructs[i].copy(bodyEnd = bodyEnd)
        }

        // Collect file-wide identifiers via recursive PSI search
        val enumTokens = collectEnumTokens(psiFile)
        val functionNames = collectFunctionNames(psiFile)
        val tagNames = collectTagNames(psiFile)

        return FileIndex(
            constructs = constructs,
            includes = includes,
            enumTokens = enumTokens,
            functionNames = functionNames,
            tagNames = tagNames,
        )
    }

    fun emptyFileIndex(): FileIndex = FileIndex(
        constructs = emptyList(),
        includes = emptyList(),
        enumTokens = emptySet(),
        functionNames = emptySet(),
        tagNames = emptySet(),
    )

    // ========================================================================
    // Action indexing
    // ========================================================================

    private fun indexAction(action: VivAction, file: com.intellij.openapi.vfs.VirtualFile): ConstructInfo {
        val header = action.actionHeader
        val name = header.nameIdentifier?.text ?: ""
        val nameOffset = header.nameIdentifier?.textOffset ?: header.textOffset
        val headerOffset = action.textOffset
        val isReserved = header.reservedConstructMarker != null
        val isTemplate = header.templateActionMarker != null
        val parent = header.parentActionDeclaration?.nameIdentifier?.text

        // Stub detection: action with ';' instead of ':' body
        val isStub = action.actionBody == null
        val body = action.actionBody
        val hasBody = !isStub && body != null
        return ConstructInfo(
            name = name,
            type = ConstructType.ACTION,
            file = file,
            nameOffset = nameOffset,
            headerOffset = headerOffset,
            bodyEnd = 0, // will be fixed up later
            parent = parent,
            comment = extractComment(action),
            isReserved = isReserved,
            isTemplate = isTemplate,
            isStub = isStub,
            roles = if (hasBody) extractActionRoles(body!!) else emptyList(),
            scratchVars = if (hasBody) extractActionScratchVars(body!!) else emptyList(),
            phaseInfos = emptyList(),
            actionRoles = emptyList(),
            gloss = if (hasBody) extractGloss(body!!) else null,
            tags = if (hasBody) extractActionTags(body!!) else emptyList(),
            importance = if (hasBody) extractActionImportance(body!!) else null,
            predicates = emptyList(),
            conditionCount = if (hasBody) countStatements(
                body!!.actionConditionsList.firstOrNull()?.statements
            ) else 0,
            effectCount = if (hasBody) countStatements(
                body!!.actionEffectsList.firstOrNull()?.statements
            ) else 0,
            reactionCount = if (hasBody) countReactionsInSection(
                body!!.actionReactionsList.firstOrNull()
            ) else 0,
            embargoCount = if (hasBody) {
                body!!.actionEmbargoesList.firstOrNull()?.embargoList?.size ?: 0
            } else 0,
            salienceRoles = if (hasBody) extractSalienceRoles(
                body!!.actionSaliencesList.firstOrNull()
            ) else emptyList(),
            hasDefaultSalience = hasBody && hasDefault(
                body!!.actionSaliencesList.firstOrNull()
            ),
            hasCustomSalience = hasBody && hasCustom(
                body!!.actionSaliencesList.firstOrNull()
            ),
            associationRoles = if (hasBody) extractAssociationRoles(
                body!!.actionAssociationsList.firstOrNull()
            ) else emptyList(),
            hasDefaultAssociation = hasBody && hasDefaultAssociation(
                body!!.actionAssociationsList.firstOrNull()
            ),
            hasCustomAssociation = hasBody && hasCustomAssociation(
                body!!.actionAssociationsList.firstOrNull()
            ),
        )
    }

    // ========================================================================
    // Plan indexing
    // ========================================================================

    private fun indexPlan(plan: VivPlan, file: com.intellij.openapi.vfs.VirtualFile): ConstructInfo {
        val header = plan.planHeader
        val name = header.nameIdentifier?.text ?: ""
        val nameOffset = header.nameIdentifier?.textOffset ?: header.textOffset
        val headerOffset = plan.textOffset
        val body = plan.planBody
        return ConstructInfo(
            name = name,
            type = ConstructType.PLAN,
            file = file,
            nameOffset = nameOffset,
            headerOffset = headerOffset,
            bodyEnd = 0,
            parent = null,
            comment = extractComment(plan),
            isReserved = false,
            isTemplate = false,
            roles = if (body == null) emptyList() else extractPlanRoles(body),
            scratchVars = emptyList(),
            phaseInfos = if (body == null) emptyList() else extractPlanPhases(body),
            conditionCount = if (body == null) 0 else countStatements(
                body.planConditionsList.firstOrNull()?.statements
            ),
        )
    }

    // ========================================================================
    // Query indexing
    // ========================================================================

    private fun indexQuery(query: VivQuery, file: com.intellij.openapi.vfs.VirtualFile): ConstructInfo {
        val header = query.queryHeader
        val name = header.nameIdentifier?.text ?: ""
        val nameOffset = header.nameIdentifier?.textOffset ?: header.textOffset
        val headerOffset = query.textOffset
        val body = query.queryBody
        return ConstructInfo(
            name = name,
            type = ConstructType.QUERY,
            file = file,
            nameOffset = nameOffset,
            headerOffset = headerOffset,
            bodyEnd = 0,
            parent = null,
            comment = extractComment(query),
            isReserved = false,
            isTemplate = false,
            roles = if (body == null) emptyList() else extractQueryRoles(body),
            scratchVars = emptyList(),
            phaseInfos = emptyList(),
            predicates = if (body == null) emptyList() else extractQueryPredicates(body),
            conditionCount = if (body == null) 0 else countStatements(
                body.queryConditionsList.firstOrNull()?.statements
            ),
        )
    }

    // ========================================================================
    // Sifting pattern indexing
    // ========================================================================

    private fun indexSiftingPattern(
        pattern: VivSiftingPattern, file: com.intellij.openapi.vfs.VirtualFile
    ): ConstructInfo {
        val header = pattern.siftingPatternHeader
        val name = header.nameIdentifier?.text ?: ""
        val nameOffset = header.nameIdentifier?.textOffset ?: header.textOffset
        val headerOffset = pattern.textOffset
        val body = pattern.siftingPatternBody
        return ConstructInfo(
            name = name,
            type = ConstructType.PATTERN,
            file = file,
            nameOffset = nameOffset,
            headerOffset = headerOffset,
            bodyEnd = 0,
            parent = null,
            comment = extractComment(pattern),
            isReserved = false,
            isTemplate = false,
            roles = if (body == null) emptyList() else extractSiftingPatternRoles(body),
            scratchVars = emptyList(),
            phaseInfos = emptyList(),
            actionRoles = if (body == null) emptyList() else extractSiftingPatternActionRoles(body),
            conditionCount = if (body == null) 0 else countStatements(
                body.siftingPatternConditionsList.firstOrNull()?.statements
            ),
        )
    }

    // ========================================================================
    // Trope indexing
    // ========================================================================

    private fun indexTrope(trope: VivTrope, file: com.intellij.openapi.vfs.VirtualFile): ConstructInfo {
        val header = trope.tropeHeader
        val name = header.nameIdentifier?.text ?: ""
        val nameOffset = header.nameIdentifier?.textOffset ?: header.textOffset
        val headerOffset = trope.textOffset
        val body = trope.tropeBody
        return ConstructInfo(
            name = name,
            type = ConstructType.TROPE,
            file = file,
            nameOffset = nameOffset,
            headerOffset = headerOffset,
            bodyEnd = 0,
            parent = null,
            comment = extractComment(trope),
            isReserved = false,
            isTemplate = false,
            roles = if (body == null) emptyList() else extractTropeRoles(body),
            scratchVars = emptyList(),
            phaseInfos = emptyList(),
            conditionCount = if (body == null) 0 else countStatements(
                body.tropeConditionsList.firstOrNull()?.statements
            ),
        )
    }

    // ========================================================================
    // Selector indexing
    // ========================================================================

    private fun indexSelector(selector: VivSelector, file: com.intellij.openapi.vfs.VirtualFile): ConstructInfo {
        val header = selector.selectorHeader
        val name = header.nameIdentifier?.text ?: ""
        val nameOffset = header.nameIdentifier?.textOffset ?: header.textOffset
        val headerOffset = selector.textOffset
        val isReserved = header.reservedConstructMarker != null
        val typeText = header.selectorType.text
        val type = ConstructType.fromKeyword(typeText) ?: ConstructType.ACTION_SELECTOR
        val body = selector.selectorBody

        return ConstructInfo(
            name = name,
            type = type,
            file = file,
            nameOffset = nameOffset,
            headerOffset = headerOffset,
            bodyEnd = 0,
            parent = null,
            comment = extractComment(selector),
            isReserved = isReserved,
            isTemplate = false,
            roles = if (body == null) emptyList() else extractSelectorRoles(body),
            scratchVars = emptyList(),
            phaseInfos = emptyList(),
            conditionCount = if (body == null) 0 else countStatements(
                body.selectorConditionsList.firstOrNull()?.statements
            ),
            targetPolicy = if (body == null) null else extractSelectorPolicy(body),
            candidates = if (body == null) emptyList() else extractSelectorCandidates(body),
        )
    }

    // ========================================================================
    // Include indexing
    // ========================================================================

    private fun indexInclude(include: VivIncludeStatement): IncludeInfo? {
        val filePath = include.filePath ?: return null
        val pathText = extractIncludePath(filePath) ?: return null

        // Find the offset of the actual path content (inside quotes).
        // Strings are lexed as TEMPLATE_STRING_START + parts + TEMPLATE_STRING_END.
        val str = filePath.string
        val templateStr = str?.templateString
        val pathContentOffset = if (templateStr != null) {
            // TEMPLATE_STRING_START is the opening quote; content starts right after.
            templateStr.textOffset + 1
        } else {
            val fpLit = filePath.node.findChildByType(VivTypes.FILE_PATH_LIT)
                ?: filePath.node.findChildByType(VivTypes.STRING_LITERAL)
            if (fpLit != null) fpLit.startOffset + 1 else filePath.textOffset
        }

        return IncludeInfo(
            path = pathText,
            offset = include.textOffset,
            pathOffset = pathContentOffset,
        )
    }

    private fun extractIncludePath(filePath: VivFilePath): String? {
        // The lexer tokenizes all strings as template strings (no STRING_LITERAL token).
        // file_path ::= FILE_PATH_LIT | STRING_LITERAL | string
        // In practice, only the `string` alternative matches.
        val str = filePath.string
        if (str != null) {
            val templateStr = str.templateString
            if (templateStr != null) {
                // Concatenate all TEMPLATE_STRING_PART children
                val parts = StringBuilder()
                var child = templateStr.firstChild
                while (child != null) {
                    if (child.node.elementType == VivTypes.TEMPLATE_STRING_PART) {
                        parts.append(child.text)
                    }
                    child = child.nextSibling
                }
                return parts.toString().ifEmpty { null }
            }
            val litExpr = str.stringLiteralExpr
            if (litExpr != null) {
                return litExpr.text.removeSurrounding("\"").removeSurrounding("'")
            }
        }

        // Fallback: try raw token types
        val fpLit = filePath.node.findChildByType(VivTypes.FILE_PATH_LIT)
        if (fpLit != null) return fpLit.text.removeSurrounding("\"").removeSurrounding("'")
        val strLit = filePath.node.findChildByType(VivTypes.STRING_LITERAL)
        if (strLit != null) return strLit.text.removeSurrounding("\"").removeSurrounding("'")

        return null
    }

    // ========================================================================
    // Comment extraction
    // ========================================================================

    /**
     * Extracts the `//` comment block immediately above a construct element.
     * Walks backward through PSI siblings, collecting PsiComment nodes.
     * Stops at non-comment, non-whitespace siblings or whitespace containing
     * a blank line (two+ newlines).
     */
    private fun extractComment(element: PsiElement): String? {
        val commentLines = mutableListOf<String>()
        var sibling = element.prevSibling

        while (sibling != null) {
            when {
                sibling is PsiComment -> {
                    val text = sibling.text.removePrefix("//").trim()
                    commentLines.add(0, text)
                }
                sibling is PsiWhiteSpace -> {
                    // Check if whitespace contains a blank line (paragraph break)
                    val newlineCount = sibling.text.count { it == '\n' }
                    if (newlineCount > 1) break // blank line — stop
                }
                else -> break // non-comment, non-whitespace — stop
            }
            sibling = sibling.prevSibling
        }

        return commentLines.joinToString("\n").ifEmpty { null }
    }

    /**
     * Extracts the `//` comment block immediately above a VivRole element
     * within a roles section. Same logic as construct comments but operates
     * on the role element's siblings.
     */
    private fun extractRoleComment(roleElement: PsiElement): String? {
        val commentLines = mutableListOf<String>()
        var sibling = roleElement.prevSibling

        while (sibling != null) {
            when {
                sibling is PsiComment -> {
                    val text = sibling.text.removePrefix("//").trim()
                    commentLines.add(0, text)
                }
                sibling is PsiWhiteSpace -> {
                    val newlineCount = sibling.text.count { it == '\n' }
                    if (newlineCount > 1) break
                }
                else -> break
            }
            sibling = sibling.prevSibling
        }

        return commentLines.joinToString("\n").ifEmpty { null }
    }

    // ========================================================================
    // Role extraction (shared across construct types)
    // ========================================================================

    private fun extractRolesFromList(roles: List<VivRole>): List<RoleInfo> {
        return roles.mapNotNull { role ->
            val ref = role.roleReference ?: return@mapNotNull null
            val name = ref.nameIdentifier?.text ?: return@mapNotNull null
            val sigil = ref.bindingType?.text ?: return@mapNotNull null
            val isGroup = ref.groupRoleDecorator != null
            val isSymbol = sigil == "&"
            val body = role.roleBody

            val labels = body?.roleLabelsList?.firstOrNull()?.roleLabelList?.map { it.text } ?: emptyList()

            var castingDirective: String? = null
            var castingExpression: String? = null
            val isDirective = body?.roleCastingPoolIsList?.firstOrNull()
            val fromDirective = body?.roleCastingPoolFromList?.firstOrNull()
            if (isDirective != null) {
                castingDirective = "is"
                castingExpression = isDirective.expression?.text
            } else if (fromDirective != null) {
                castingDirective = "from"
                castingExpression = fromDirective.expression?.text
            }

            val spawnExpr = body?.roleSpawnDirectiveList?.firstOrNull()?.customFunctionCall?.text
            val renamesRef = body?.roleRenamingList?.firstOrNull()?.roleReference
            val renamesTarget = if (renamesRef != null) {
                "${renamesRef.bindingType?.text ?: "@"}${renamesRef.nameIdentifier?.text ?: ""}"
            } else null

            val slotRange = body?.roleSlotsList?.firstOrNull()?.let { slots ->
                slots.text.removePrefix("n").removePrefix(":").trim()
            }

            // Role offset: the sigil+name starts at the binding_type element
            val roleOffset = ref.bindingType.textOffset

            RoleInfo(
                name = name,
                fullName = "$sigil$name",
                offset = roleOffset,
                labels = labels,
                isGroup = isGroup,
                isSymbol = isSymbol,
                castingDirective = castingDirective,
                castingExpression = castingExpression,
                spawnExpression = spawnExpr,
                renamesTarget = renamesTarget,
                slotRange = slotRange,
                comment = extractRoleComment(role),
            )
        }
    }

    private fun extractActionRoles(body: VivActionBody): List<RoleInfo> {
        val rolesSection = body.actionRolesList.firstOrNull() ?: return emptyList()
        return extractRolesFromList(rolesSection.roleList)
    }

    private fun extractPlanRoles(body: VivPlanBody): List<RoleInfo> {
        val rolesSection = body.planRolesList.firstOrNull() ?: return emptyList()
        return extractRolesFromList(rolesSection.roleList)
    }

    private fun extractQueryRoles(body: VivQueryBody): List<RoleInfo> {
        val rolesSection = body.queryRolesList.firstOrNull() ?: return emptyList()
        return extractRolesFromList(rolesSection.roleList)
    }

    private fun extractSiftingPatternRoles(body: VivSiftingPatternBody): List<RoleInfo> {
        val rolesSection = body.siftingPatternRolesList.firstOrNull() ?: return emptyList()
        return extractRolesFromList(rolesSection.roleList)
    }

    private fun extractTropeRoles(body: VivTropeBody): List<RoleInfo> {
        val rolesSection = body.tropeRolesList.firstOrNull() ?: return emptyList()
        return extractRolesFromList(rolesSection.roleList)
    }

    private fun extractSelectorRoles(body: VivSelectorBody): List<RoleInfo> {
        val rolesSection = body.selectorRolesList.firstOrNull() ?: return emptyList()
        return extractRolesFromList(rolesSection.roleList)
    }

    // ========================================================================
    // Sifting pattern action roles
    // ========================================================================

    private fun extractSiftingPatternActionRoles(body: VivSiftingPatternBody): List<RoleInfo> {
        val actionsSection = body.siftingPatternActionsList.firstOrNull() ?: return emptyList()
        return actionsSection.siftingPatternActionList.mapNotNull { action ->
            val ref = action.roleReference ?: return@mapNotNull null
            val name = ref.nameIdentifier?.text ?: return@mapNotNull null
            val sigil = ref.bindingType?.text ?: return@mapNotNull null
            val isGroup = ref.groupRoleDecorator != null
            val isSymbol = sigil == "&"
            val actionBody = action.siftingPatternActionBody

            // Sifting pattern action roles have a subset of role body fields
            var castingDirective: String? = null
            var castingExpression: String? = null
            val isDirective = actionBody?.roleCastingPoolIsList?.firstOrNull()
            val fromDirective = actionBody?.roleCastingPoolFromList?.firstOrNull()
            if (isDirective != null) {
                castingDirective = "is"
                castingExpression = isDirective.expression?.text
            } else if (fromDirective != null) {
                castingDirective = "from"
                castingExpression = fromDirective.expression?.text
            }

            val slotRange = actionBody?.roleSlotsList?.firstOrNull()?.let { slots ->
                slots.text.removePrefix("n").removePrefix(":").trim()
            }

            val labels = actionBody?.roleLabelsList?.firstOrNull()?.roleLabelList?.map { it.text } ?: emptyList()

            val roleOffset = ref.bindingType.textOffset

            RoleInfo(
                name = name,
                fullName = "$sigil$name",
                offset = roleOffset,
                labels = labels,
                isGroup = isGroup,
                isSymbol = isSymbol,
                castingDirective = castingDirective,
                castingExpression = castingExpression,
                slotRange = slotRange,
                comment = extractRoleComment(action),
            )
        }
    }

    // ========================================================================
    // Scratch variables
    // ========================================================================

    private fun extractActionScratchVars(body: VivActionBody): List<VarInfo> {
        val scratchSection = body.actionScratchList.firstOrNull() ?: return emptyList()
        val statements = scratchSection.statements ?: return emptyList()
        return extractScratchVarsFromStatements(statements)
    }

    private fun extractScratchVarsFromStatements(statements: VivStatements): List<VarInfo> {
        val vars = mutableListOf<VarInfo>()
        // Look for assignment expressions with scratch variable sigils ($@name or $&name)
        val assignments = PsiTreeUtil.findChildrenOfType(statements, VivAssignment::class.java)
        for (assignment in assignments) {
            val lvalue = assignment.assignmentLvalue
            val ref = lvalue.vivReference
            // Check it has a scratch variable sigil ($)
            if (ref.scratchVariableSigil == null) continue
            val sigil = ref.bindingType.text
            val ident = ref.nameIdentifier ?: continue
            val name = ident.text
            val fullName = "\$$sigil$name"

            // Extract the RHS text
            val rhs = assignment.precedenceGovernedExpression
            val initialValue = rhs.text?.replace(Regex("//.*"), "")?.trim()?.ifEmpty { null }

            vars.add(VarInfo(
                name = name,
                fullName = fullName,
                offset = ref.textOffset,
                initialValue = initialValue,
            ))
        }
        return vars
    }

    // ========================================================================
    // Plan phases
    // ========================================================================

    private fun extractPlanPhases(body: VivPlanBody): List<PhaseInfo> {
        val phasesSection = body.planPhasesList.firstOrNull() ?: return emptyList()
        return phasesSection.planPhaseList.mapNotNull { phase ->
            val phaseName = phase.planPhaseName?.nameIdentifier?.text
                ?: return@mapNotNull null
            val instructions = phase.planInstructions

            // Recursively check for succeed, fail, advance, wait, and reactions
            val hasSucceed = instructions != null && PsiTreeUtil.findChildrenOfType(instructions, VivPlanInstructionSucceed::class.java).isNotEmpty()
            val hasFail = instructions != null && PsiTreeUtil.findChildrenOfType(instructions, VivPlanInstructionFail::class.java).isNotEmpty()
            val hasAdvance = instructions != null && PsiTreeUtil.findChildrenOfType(instructions, VivPlanInstructionAdvance::class.java).isNotEmpty()
            val hasWait = instructions != null && PsiTreeUtil.findChildrenOfType(instructions, VivPlanInstructionWait::class.java).isNotEmpty()
            val reactionCount = if (instructions != null)
                PsiTreeUtil.findChildrenOfType(instructions, VivReaction::class.java).size
            else 0

            PhaseInfo(
                name = phaseName,
                hasSucceed = hasSucceed,
                hasFail = hasFail,
                hasAdvance = hasAdvance,
                hasWait = hasWait,
                reactionCount = reactionCount,
            )
        }
    }

    // ========================================================================
    // Gloss, tags, importance extraction (action-specific)
    // ========================================================================

    private fun extractGloss(body: VivActionBody): String? {
        val glossSection = body.actionGlossList.firstOrNull() ?: return null
        val str = glossSection.string
        if (str != null) {
            // The string PSI contains the quotes; strip them
            val raw = str.text
            return when {
                raw.startsWith("\"") && raw.endsWith("\"") -> raw.substring(1, raw.length - 1)
                raw.startsWith("'") && raw.endsWith("'") -> raw.substring(1, raw.length - 1)
                else -> raw
            }
        }
        // Fallback for unquoted gloss text: extract everything after 'gloss:'
        val glossText = glossSection.text
        val colonIdx = glossText.indexOf(':')
        if (colonIdx < 0) return null
        val raw = glossText.substring(colonIdx + 1).replace(Regex("//.*"), "").trim()
        return raw.ifEmpty { null }
    }

    private fun extractActionTags(body: VivActionBody): List<String> {
        val tagsSection = body.actionTagsList.firstOrNull() ?: return emptyList()
        val tags = tagsSection.tags ?: return emptyList()
        return tags.tagList.map { it.text }
    }

    private fun extractActionImportance(body: VivActionBody): String? {
        val importanceSection = body.actionImportanceList.firstOrNull() ?: return null
        val enumVal = importanceSection.enum
        if (enumVal != null) return enumVal.text
        val numVal = importanceSection.numberLiteral
        if (numVal != null) return numVal.text
        return null
    }

    // ========================================================================
    // Salience/association info extraction
    // ========================================================================

    private fun extractSalienceRoles(saliences: VivActionSaliences?): List<String> {
        val body = saliences?.saliencesBody ?: return emptyList()
        val rolesSection = body.saliencesRolesList.firstOrNull() ?: return emptyList()
        return rolesSection.saliencesRolesEntryList.mapNotNull { it.identifier?.text }
    }

    private fun hasDefault(saliences: VivActionSaliences?): Boolean {
        val body = saliences?.saliencesBody ?: return false
        return body.saliencesDefaultList.isNotEmpty()
    }

    private fun hasCustom(saliences: VivActionSaliences?): Boolean {
        val body = saliences?.saliencesBody ?: return false
        return body.saliencesCustomFieldList.isNotEmpty()
    }

    private fun extractAssociationRoles(associations: VivActionAssociations?): List<String> {
        val body = associations?.associationsBody ?: return emptyList()
        val rolesSection = body.associationsRolesList.firstOrNull() ?: return emptyList()
        return rolesSection.associationsRolesEntryList.mapNotNull { it.identifier?.text }
    }

    private fun hasDefaultAssociation(associations: VivActionAssociations?): Boolean {
        val body = associations?.associationsBody ?: return false
        return body.associationsDefaultList.isNotEmpty()
    }

    private fun hasCustomAssociation(associations: VivActionAssociations?): Boolean {
        val body = associations?.associationsBody ?: return false
        return body.associationsCustomFieldList.isNotEmpty()
    }

    // ========================================================================
    // Selector-specific extraction
    // ========================================================================

    private fun extractSelectorPolicy(body: VivSelectorBody): String? {
        val targetGroup = body.selectorTargetGroupList.firstOrNull() ?: return null
        val policy = targetGroup.selectorPolicy ?: return null
        // Normalize whitespace (e.g., "with  weights" -> "with weights")
        return policy.text.replace(Regex("""\s+"""), " ")
    }

    private fun extractSelectorCandidates(body: VivSelectorBody): List<String> {
        val targetGroup = body.selectorTargetGroupList.firstOrNull() ?: return emptyList()
        return targetGroup.selectorCandidateList.mapNotNull { candidate ->
            candidate.selectorCandidateName?.nameIdentifier?.text
        }
    }

    // ========================================================================
    // Query predicate extraction
    // ========================================================================

    /**
     * Extracts query predicates by walking the PSI tree. Each query section type
     * (action, tags, ancestors, importance, etc.) has its own PSI node with typed
     * predicate children.
     */
    private fun extractQueryPredicates(body: VivQueryBody): List<QueryPredicate> {
        val predicates = mutableListOf<QueryPredicate>()

        // Tag-based predicates: action, tags, associations (use VivSetPredicateTags)
        for (section in body.queryActionNameList) {
            for (pred in section.setPredicateTagsList) {
                predicates.add(QueryPredicate("action", pred.setPredicateOperator.text, pred.tagList.map { it.text }))
            }
        }
        for (section in body.queryTagsList) {
            for (pred in section.setPredicateTagsList) {
                predicates.add(QueryPredicate("tags", pred.setPredicateOperator.text, pred.tagList.map { it.text }))
            }
        }
        for (section in body.queryAssociationsList) {
            for (pred in section.setPredicateTagsList) {
                predicates.add(QueryPredicate("associations", pred.setPredicateOperator.text, pred.tagList.map { it.text }))
            }
        }

        // Expression-based predicates (use VivSetPredicate)
        fun addSetPredicates(field: String, sections: List<*>) {
            for (section in sections) {
                val predList = when (section) {
                    is VivQueryAncestors -> section.setPredicateList
                    is VivQueryDescendants -> section.setPredicateList
                    is VivQueryLocation -> section.setPredicateList
                    is VivQueryInitiator -> section.setPredicateList
                    is VivQueryPartners -> section.setPredicateList
                    is VivQueryRecipients -> section.setPredicateList
                    is VivQueryBystanders -> section.setPredicateList
                    is VivQueryActive -> section.setPredicateList
                    is VivQueryPresent -> section.setPredicateList
                    else -> emptyList()
                }
                for (pred in predList) {
                    predicates.add(QueryPredicate(field, pred.setPredicateOperator.text, pred.expressionList.map { it.text }))
                }
            }
        }
        addSetPredicates("ancestors", body.queryAncestorsList)
        addSetPredicates("descendants", body.queryDescendantsList)
        addSetPredicates("location", body.queryLocationList)
        addSetPredicates("initiator", body.queryInitiatorList)
        addSetPredicates("partners", body.queryPartnersList)
        addSetPredicates("recipients", body.queryRecipientsList)
        addSetPredicates("bystanders", body.queryBystandersList)
        addSetPredicates("active", body.queryActiveList)
        addSetPredicates("present", body.queryPresentList)

        // Numeric predicates: importance, salience (use VivQueryNumericCriteria)
        for (section in body.queryImportanceList) {
            val criteria = section.queryNumericCriteria ?: continue
            for (criterion in criteria.queryNumericCriterionList) {
                val op = criterion.queryNumericCriterionOperator.text
                val value = criterion.enum?.text ?: criterion.numberLiteral?.text ?: continue
                predicates.add(QueryPredicate("importance", op, listOf(value)))
            }
        }
        for (section in body.querySalienceList) {
            val criteria = section.queryNumericCriteria ?: continue
            for (criterion in criteria.queryNumericCriterionList) {
                val op = criterion.queryNumericCriterionOperator.text
                val value = criterion.enum?.text ?: criterion.numberLiteral?.text ?: continue
                predicates.add(QueryPredicate("salience", op, listOf(value)))
            }
        }

        // Time predicates — temporal constraints have a different structure.
        // The constraint text is e.g. "after: 3 days ago" or "between: 1 day and 3 days from now".
        // Split on the first colon to extract the keyword as the operator.
        for (section in body.queryTimeList) {
            for (constraint in section.temporalConstraintList) {
                val text = constraint.text.trim()
                val colonIdx = text.indexOf(':')
                if (colonIdx > 0) {
                    val op = text.substring(0, colonIdx).trim()
                    val value = text.substring(colonIdx + 1).trim()
                    predicates.add(QueryPredicate("time", op, listOf(value)))
                } else {
                    predicates.add(QueryPredicate("time", text, emptyList()))
                }
            }
        }

        return predicates
    }

    // ========================================================================
    // Section statement counting
    // ========================================================================

    /**
     * Counts the number of top-level statements in a VivStatements element.
     * Returns 0 if null.
     */
    private fun countStatements(statements: VivStatements?): Int {
        return statements?.statementList?.size ?: 0
    }

    /**
     * Counts reaction blocks in an action_reactions section.
     * Includes reactions nested inside conditionals and loops.
     */
    private fun countReactionsInSection(reactions: VivActionReactions?): Int {
        if (reactions == null) return 0
        return PsiTreeUtil.findChildrenOfType(reactions, VivReaction::class.java).size
    }

    // ========================================================================
    // File-wide identifier collection
    // ========================================================================

    /**
     * Collects all enum tokens (#NAME) across the entire file via PSI tree search.
     */
    private fun collectEnumTokens(psiFile: VivFile): Set<String> {
        val enums = PsiTreeUtil.findChildrenOfType(psiFile, VivEnum::class.java)
        return enums.mapTo(mutableSetOf()) { enumElement ->
            // Strip any sign prefix (+ or -) — store just #IDENTIFIER
            val identText = enumElement.identifier.text
            "#$identText"
        }
    }

    /**
     * Collects all custom function names (~name) across the entire file via PSI tree search.
     */
    private fun collectFunctionNames(psiFile: VivFile): Set<String> {
        val funcs = PsiTreeUtil.findChildrenOfType(psiFile, VivCustomFunctionCall::class.java)
        return funcs.mapNotNullTo(mutableSetOf()) { call ->
            val name = call.nameIdentifier?.text ?: return@mapNotNullTo null
            "~$name"
        }
    }

    /**
     * Collects all tag names across the entire file via PSI tree search.
     * Finds all VivTag elements anywhere in the file (tags: sections, association tags,
     * query predicate tags, etc.).
     */
    private fun collectTagNames(psiFile: VivFile): Set<String> {
        val tags = PsiTreeUtil.findChildrenOfType(psiFile, VivTag::class.java)
        return tags.mapTo(mutableSetOf()) { it.text }
    }
}
