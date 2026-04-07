package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import studio.sifty.viv.VivProjectIndex
import studio.sifty.viv.psi.VivNamedElement

/**
 * PsiReference for custom function calls (`~name()`).
 *
 * Functions have no single declaration site in Viv (they are defined externally).
 * [resolve] navigates to the first occurrence of `~funcName(` in the project,
 * which serves as the canonical reference site for Go to Declaration.
 */
class VivFunctionReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

    override fun getRangeInElement(): TextRange {
        val ident = (element as? VivNamedElement)?.nameIdentifier ?: return TextRange.EMPTY_RANGE
        val start = ident.startOffsetInParent
        return TextRange(start, start + ident.textLength)
    }

    override fun resolve(): PsiElement? {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return null
        val name = nameIdent.text
        val project = element.project

        val idx = VivProjectIndex.getInstance(project)

        // Find the first file containing this function name, then locate the occurrence
        val fullName = "~$name"
        val pattern = Regex("~${Regex.escape(name)}\\(")
        for (file in idx.getFilesWithFunction(fullName)) {
            val psiFile = PsiManager.getInstance(project).findFile(file) ?: continue
            val match = pattern.find(psiFile.text) ?: continue
            // Offset of the tilde; the identifier starts at offset+1
            val targetElement = psiFile.findElementAt(match.range.first + 1)
            // Return the parent (the custom_function_call element) so it's a PsiNamedElement
            return targetElement?.parent
        }
        return null
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return element
        val newIdent = studio.sifty.viv.psi.VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }
}
