package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.VivProjectIndex
import studio.sifty.viv.psi.VivNamedElement

/**
 * PsiReference for role references (`@name`, `&name`) in expressions.
 *
 * Resolves to the role definition in the enclosing construct's `roles:` section,
 * walking the parent chain for inherited roles.
 */
class VivRoleReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

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

        val construct = idx.getConstructAt(vFile, element.textOffset) ?: return null
        val isSymbol = detectIsSymbol(element)
        val (definingConstruct, role) = idx.resolveRole(construct, name, isSymbol) ?: return null

        val psiFile = PsiManager.getInstance(project).findFile(definingConstruct.file) ?: return null
        val leaf = psiFile.findElementAt(role.offset) ?: return null
        return PsiTreeUtil.getParentOfType(leaf, VivNamedElement::class.java, false)
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return element
        val newIdent = studio.sifty.viv.psi.VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }

    companion object {
        /**
         * Detects whether a role reference element uses the `&` (symbol) sigil
         * vs. the `@` (character) sigil. Returns true for `&`, false for `@`,
         * or null if the sigil cannot be determined.
         */
        fun detectIsSymbol(element: PsiElement): Boolean? {
            val text = element.text ?: return null
            return when {
                text.contains("&") -> true
                text.contains("@") -> false
                else -> null
            }
        }
    }
}
