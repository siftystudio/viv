package studio.sifty.viv

import com.intellij.psi.PsiElement
import com.intellij.psi.util.PsiTreeUtil
import com.intellij.refactoring.rename.RenamePsiElementProcessor
import studio.sifty.viv.psi.VivNamedElement

/**
 * Controls rename behavior for Viv elements.
 *
 * Ensures the rename target is always a [VivNamedElement] (walking up from
 * leaf tokens if necessary) and enables in-place rename. Post-rename reindexing
 * is handled automatically by the platform's [VivFileBasedIndex].
 */
class VivRenamePsiElementProcessor : RenamePsiElementProcessor() {

    override fun canProcessElement(element: PsiElement): Boolean {
        if (element is VivNamedElement) return true
        return PsiTreeUtil.getParentOfType(element, VivNamedElement::class.java) != null
    }

    override fun substituteElementToRename(
        element: PsiElement, editor: com.intellij.openapi.editor.Editor?
    ): PsiElement? {
        if (element is VivNamedElement) return element
        return PsiTreeUtil.getParentOfType(element, VivNamedElement::class.java) ?: element
    }

    override fun isInplaceRenameSupported(): Boolean = true
}
