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
 * PsiReference for `selector_candidate_name` elements inside selector target groups.
 *
 * - If prefixed with `selector`, resolves to the named selector (action-selector or plan-selector).
 * - Otherwise, resolves to a construct whose type matches the enclosing selector type
 *   (action-selector → action, plan-selector → plan).
 */
class VivSelectorCandidateReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

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

        // Two IDENTIFIER children = "selector <name>" (prefix present), one = bare "<name>"
        val identifierCount = element.node.getChildren(com.intellij.psi.tree.TokenSet.create(VivTypes.IDENTIFIER)).size
        val hasSelectorPrefix = identifierCount >= 2
        val type = if (hasSelectorPrefix) {
            // "selector foo" refers to a selector construct
            inferSelectorType()
        } else {
            // bare "foo" refers to the target construct type
            inferTargetType()
        } ?: return null

        val construct = idx.getConstruct(type, name) ?: return null
        val psiFile = PsiManager.getInstance(project).findFile(construct.file) ?: return null
        return psiFile.findElementAt(construct.nameOffset)?.parent
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return element
        val newIdent = VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }

    /**
     * Infer the construct type for a `selector`-prefixed candidate.
     * Returns the enclosing selector's own type.
     */
    private fun inferSelectorType(): ConstructType? {
        val selectorHeader = findEnclosingSelectorHeader() ?: return null
        val typeText = selectorHeader.selectorType.text
        return ConstructType.fromKeyword(typeText)
    }

    /**
     * Infer the target construct type from the enclosing selector type.
     * action-selector → ACTION, plan-selector → PLAN.
     */
    private fun inferTargetType(): ConstructType? {
        val selectorHeader = findEnclosingSelectorHeader() ?: return null
        val typeText = selectorHeader.selectorType.text
        return when (typeText) {
            "action-selector" -> ConstructType.ACTION
            "plan-selector" -> ConstructType.PLAN
            else -> null
        }
    }

    private fun findEnclosingSelectorHeader(): VivSelectorHeader? {
        val selector = PsiTreeUtil.getParentOfType(element, VivSelector::class.java) ?: return null
        return selector.selectorHeader
    }
}
