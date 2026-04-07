package studio.sifty.viv

import com.intellij.lang.refactoring.RefactoringSupportProvider
import com.intellij.psi.PsiElement
import studio.sifty.viv.psi.VivNamedElement

/**
 * Enables in-place (inline) rename for Viv elements.
 *
 * Without this, IntelliJ falls back to the modal rename dialog with irrelevant
 * scope options. With this, Shift+F6 renames the identifier in-place, using
 * PsiReference resolution to find all usages automatically.
 */
class VivRefactoringSupportProvider : RefactoringSupportProvider() {

    override fun isMemberInplaceRenameAvailable(element: PsiElement, context: PsiElement?): Boolean =
        element is VivNamedElement

    // NOTE: Do NOT override isInplaceRenameAvailable(). If both this and
    // isMemberInplaceRenameAvailable return true, VariableInplaceRenameHandler
    // also activates, IntelliJ eliminates MemberInplaceRenameHandler from the
    // handler list (as conflict resolution), and VariableInplaceRenamer fails
    // because getUseScope() returns GlobalSearchScope. The result: dialog fallback.
}
