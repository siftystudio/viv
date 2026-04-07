package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.ConstructType
import studio.sifty.viv.VivProjectIndex
import studio.sifty.viv.psi.*

/**
 * PsiReference for binding LHS role references (`@greeter: @greeter` — the LHS `@greeter`).
 *
 * The LHS of a binding resolves to the TARGET construct's role (the construct being queued),
 * NOT the current construct's role.
 */
class VivBindingLhsRoleReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

    override fun getRangeInElement(): TextRange {
        val ident = (element as? VivNamedElement)?.nameIdentifier ?: return TextRange.EMPTY_RANGE
        val start = ident.startOffsetInParent
        return TextRange(start, start + ident.textLength)
    }

    override fun resolve(): PsiElement? {
        val name = (element as? VivNamedElement)?.name ?: return null
        val project = element.project
        val vFile = element.containingFile?.virtualFile ?: return null

        val idx = VivProjectIndex.getInstance(project)

        // Find the target construct name from the enclosing reaction_target or selector_candidate_name
        val targetConstruct = findTargetConstruct(idx) ?: return null
        val isSymbol = VivRoleReference.detectIsSymbol(element)
        val (definingConstruct, role) = idx.resolveRole(targetConstruct, name, isSymbol) ?: return null

        val psiFile = PsiManager.getInstance(project).findFile(definingConstruct.file) ?: return null
        val leaf = psiFile.findElementAt(role.offset) ?: return null
        return PsiTreeUtil.getParentOfType(leaf, VivNamedElement::class.java, false)
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return element
        val newIdent = VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }

    private fun findTargetConstruct(idx: VivProjectIndex): studio.sifty.viv.ConstructInfo? {
        // Walk up to find the enclosing VivReaction, then access its header's target
        val reaction = PsiTreeUtil.getParentOfType(element, VivReaction::class.java)
        if (reaction != null) {
            val reactionTarget = reaction.reactionHeader?.reactionTarget ?: return null
            val typeText = reactionTarget.reactionTargetType?.text ?: return null
            val name = (reactionTarget as? VivNamedElement)?.name ?: return null
            val type = ConstructType.fromKeyword(typeText) ?: return null
            return idx.getConstruct(type, name)
        }

        // For selector candidate bindings, walk up to find the selector_candidate_name
        val candidate = PsiTreeUtil.getParentOfType(element, VivSelectorCandidate::class.java)
        if (candidate != null) {
            val candidateName = candidate.selectorCandidateName
            val name = (candidateName as? VivNamedElement)?.name ?: return null
            // Determine the target type from the enclosing selector
            val selector = PsiTreeUtil.getParentOfType(element, VivSelector::class.java)
            val selectorType = selector?.selectorHeader?.selectorType?.text ?: return null
            val targetType = when (selectorType) {
                "action-selector" -> ConstructType.ACTION
                "plan-selector" -> ConstructType.PLAN
                else -> return null
            }
            return idx.getConstruct(targetType, name)
        }

        // For trope_fit bindings, walk up to find the trope name
        val tropeFit = PsiTreeUtil.getParentOfType(element, VivTropeFit::class.java)
        if (tropeFit != null) {
            val name = (tropeFit as VivNamedElement).name ?: return null
            return idx.getConstruct(ConstructType.TROPE, name)
        }

        // For sugared trope_fit bindings (trope_fit_sugared)
        val tropeFitSugared = PsiTreeUtil.getParentOfType(element, VivTropeFitSugared::class.java)
        if (tropeFitSugared != null) {
            val name = (tropeFitSugared as? VivNamedElement)?.name ?: return null
            return idx.getConstruct(ConstructType.TROPE, name)
        }

        // For sifting bindings: walk up to VivSifting (parent of both sifting_header and sifting_body),
        // then get the siftingHeader child to extract the pattern name
        val sifting = PsiTreeUtil.getParentOfType(element, VivSifting::class.java)
        if (sifting != null) {
            val siftingHeader = sifting.siftingHeader
            val name = (siftingHeader as VivNamedElement).name ?: return null
            return idx.getConstruct(ConstructType.PATTERN, name)
        }

        return null
    }
}
