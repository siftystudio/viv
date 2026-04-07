package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import studio.sifty.viv.ConstructType
import studio.sifty.viv.VivProjectIndex
import studio.sifty.viv.psi.*

/**
 * PsiReference for construct reference sites: reaction_target, parent_action_declaration,
 * action_search_header, sifting_header, trope_fit, trope_fit_sugared.
 *
 * Resolves to the declaration-site PSI element (the construct header's name identifier)
 * by looking up the construct in [VivProjectIndex].
 */
class VivConstructReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

    override fun getRangeInElement(): TextRange {
        // The IDENTIFIER child is what we reference — compute its offset relative to the element
        val ident = when (element) {
            is VivNamedElement -> (element as VivNamedElement).nameIdentifier
            else -> null
        } ?: return TextRange.EMPTY_RANGE
        val start = ident.startOffsetInParent
        return TextRange(start, start + ident.textLength)
    }

    override fun resolve(): PsiElement? {
        val nameIdent = when (element) {
            is VivNamedElement -> (element as VivNamedElement).nameIdentifier
            else -> null
        } ?: return null

        val name = nameIdent.text
        val project = element.project

        val idx = VivProjectIndex.getInstance(project)

        val type = determineConstructType() ?: return null
        val construct = idx.getConstruct(type, name) ?: return null

        val psiFile = PsiManager.getInstance(project).findFile(construct.file) ?: return null
        // Find the IDENTIFIER token at the construct's name offset
        val targetElement = psiFile.findElementAt(construct.nameOffset)
        // Return the header (parent) so that it's a PsiNamedElement
        return targetElement?.parent
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = when (element) {
            is VivNamedElement -> (element as VivNamedElement).nameIdentifier
            else -> null
        } ?: return element

        val newIdent = VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }

    /**
     * Determines the [ConstructType] that this reference points to,
     * based on the PSI element type and its context.
     */
    private fun determineConstructType(): ConstructType? {
        return when (element) {
            is VivReactionTarget -> {
                val typeText = (element as VivReactionTarget).reactionTargetType.text
                ConstructType.fromKeyword(typeText)
            }
            is VivParentActionDeclaration -> ConstructType.ACTION
            is VivActionSearch -> ConstructType.QUERY
            is VivSiftingHeader -> ConstructType.PATTERN
            is VivTropeFit -> ConstructType.TROPE
            is VivTropeFitSugared -> ConstructType.TROPE
            is VivTag -> ConstructType.ACTION
            else -> null
        }
    }
}
