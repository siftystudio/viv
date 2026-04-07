package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiReferenceBase
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.psi.VivNamedElement
import studio.sifty.viv.psi.VivPsiFactory
import studio.sifty.viv.psi.impl.VivPropertyNameMixin

/**
 * PsiReference for property names in dot-access and pointer-access paths.
 *
 * A property reference is _qualified_: it tracks the combination of role + path
 * prefix + property name. Renaming `mood` in `@initiator.mood` does NOT affect
 * `mood` in `@target.mood`.
 *
 * Resolution scope is the enclosing construct's PSI subtree (the top-level
 * `action`, `plan`, `query`, etc. element). Property references are NOT tracked
 * in the project index.
 *
 * [resolve] returns the first occurrence of this exact qualified path in the
 * enclosing construct. [isReferenceTo] matches any occurrence with the same
 * qualified path.
 */
class VivPropertyReference(
    element: PsiElement,
    private val qualifiedPath: String,
) : PsiReferenceBase<PsiElement>(element) {

    override fun getRangeInElement(): TextRange {
        val ident = (element as? VivNamedElement)?.nameIdentifier ?: return TextRange.EMPTY_RANGE
        val start = ident.startOffsetInParent
        return TextRange(start, start + ident.textLength)
    }

    override fun resolve(): PsiElement? {
        val construct = findEnclosingConstruct(element) ?: return null
        // Return the VivPropertyNameMixin (PsiNamedElement), not its nameIdentifier leaf.
        // TargetElementUtil.findTargetElement() needs a PsiNamedElement to enable
        // highlight-usages and rename; returning the leaf token breaks both.
        return findMatchingProperties(construct).firstOrNull()
    }

    override fun isReferenceTo(candidate: PsiElement): Boolean {
        // Check if candidate is a property_name element (or the IDENTIFIER inside one)
        val propName = when {
            candidate is VivPropertyNameMixin -> candidate
            candidate.parent is VivPropertyNameMixin -> candidate.parent as VivPropertyNameMixin
            else -> return false
        }
        val candidatePath = propName.computeQualifiedPath() ?: return false
        if (candidatePath != qualifiedPath) return false
        // Must be in the same construct scope
        val ourConstruct = findEnclosingConstruct(element) ?: return false
        val theirConstruct = findEnclosingConstruct(propName) ?: return false
        return ourConstruct == theirConstruct
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return element
        val newIdent = VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }

    /**
     * Finds all [VivPropertyNameMixin] elements within [construct] whose
     * qualified path matches [qualifiedPath].
     */
    private fun findMatchingProperties(construct: PsiElement): List<VivPropertyNameMixin> {
        return PsiTreeUtil.findChildrenOfType(construct, VivPropertyNameMixin::class.java)
            .filter { it.computeQualifiedPath() == qualifiedPath }
    }

    companion object {
        /**
         * Walks up from [element] to find the enclosing top-level construct
         * (action, plan, selector, query, pattern, trope).
         */
        fun findEnclosingConstruct(element: PsiElement): PsiElement? {
            var current: PsiElement? = element
            while (current != null) {
                val parent = current.parent ?: break
                // Top-level constructs are direct children of the file
                if (parent is com.intellij.psi.PsiFile) return current
                current = parent
            }
            return null
        }
    }
}
