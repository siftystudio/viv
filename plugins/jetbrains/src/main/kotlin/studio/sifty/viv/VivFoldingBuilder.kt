package studio.sifty.viv

import com.intellij.lang.ASTNode
import com.intellij.lang.folding.FoldingBuilderEx
import com.intellij.lang.folding.FoldingDescriptor
import com.intellij.openapi.editor.Document
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.psi.*

/**
 * Provides code folding for Viv construct bodies, section blocks, and plan phases.
 * Walks the PSI tree to find foldable elements rather than scanning raw text.
 */
class VivFoldingBuilder : FoldingBuilderEx() {

    /**
     * Top-level construct types. The `:` lives at this level (not inside the body),
     * so we fold from after the `:` to the end of the construct.
     */
    private val FOLDABLE_CONSTRUCT_TYPES: Array<Class<out PsiElement>> = arrayOf(
        VivAction::class.java,
        VivPlan::class.java,
        VivQuery::class.java,
        VivSiftingPattern::class.java,
        VivTrope::class.java,
        VivSelector::class.java,
    )

    /**
     * Section block types. Each contains its own `:` token, so we fold from
     * after the `:` to the end of the section element.
     */
    private val FOLDABLE_SECTION_TYPES: Array<Class<out PsiElement>> = arrayOf(
        // Action sections
        VivActionRoles::class.java,
        VivActionConditions::class.java,
        VivActionEffects::class.java,
        VivActionReactions::class.java,
        VivActionScratch::class.java,
        VivActionEmbargoes::class.java,
        VivActionSaliences::class.java,
        VivActionAssociations::class.java,
        // Plan sections
        VivPlanPhases::class.java,
        VivPlanConditions::class.java,
        VivPlanRoles::class.java,
        // Query sections
        VivQueryRoles::class.java,
        VivQueryConditions::class.java,
        // Sifting pattern sections
        VivSiftingPatternRoles::class.java,
        VivSiftingPatternConditions::class.java,
        VivSiftingPatternActions::class.java,
        // Trope sections
        VivTropeRoles::class.java,
        VivTropeConditions::class.java,
        // Selector sections
        VivSelectorRoles::class.java,
        VivSelectorConditions::class.java,
        VivSelectorTargetGroup::class.java,
    )

    override fun buildFoldRegions(root: PsiElement, document: Document, quick: Boolean): Array<FoldingDescriptor> {
        if (root !is VivFile) return emptyArray()
        val descriptors = mutableListOf<FoldingDescriptor>()

        PsiTreeUtil.processElements(root) { element ->
            val range = foldRangeForElement(element)
            if (range != null && range.length > 0) {
                descriptors.add(FoldingDescriptor(element.node, range))
            }
            true // continue processing
        }

        return descriptors.toTypedArray()
    }

    /**
     * Returns the fold range for a foldable element, or null if not foldable.
     * The fold range starts just after the `:` token and extends to the end of the element.
     */
    private fun foldRangeForElement(element: PsiElement): TextRange? {
        val isFoldableConstruct = FOLDABLE_CONSTRUCT_TYPES.any { it.isInstance(element) }
        val isFoldableSection = FOLDABLE_SECTION_TYPES.any { it.isInstance(element) }
        val isPlanPhase = element is VivPlanPhase

        if (!isFoldableConstruct && !isFoldableSection && !isPlanPhase) return null

        val colonNode = findColonNode(element) ?: return null
        val foldStart = colonNode.textRange.endOffset
        val foldEnd = element.textRange.endOffset

        if (foldEnd <= foldStart) return null
        return TextRange(foldStart, foldEnd)
    }

    /** Finds the first COLON token child of the given element. */
    private fun findColonNode(element: PsiElement): ASTNode? {
        var child = element.node.firstChildNode
        while (child != null) {
            if (child.elementType == VivTypes.COLON) return child
            child = child.treeNext
        }
        return null
    }

    override fun getPlaceholderText(node: ASTNode): String = "..."

    override fun isCollapsedByDefault(node: ASTNode): Boolean = false
}
