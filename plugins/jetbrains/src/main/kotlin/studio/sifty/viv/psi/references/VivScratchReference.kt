package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.VivProjectIndex
import studio.sifty.viv.psi.VivNamedElement

/**
 * PsiReference for scratch variable references (`$@name`, `$&name`) in expressions.
 *
 * Resolves to the scratch variable declaration in the enclosing construct's `scratch:` section.
 */
class VivScratchReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

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
        val varInfo = construct.scratchVars.find { it.name == name } ?: return null

        val psiFile = PsiManager.getInstance(project).findFile(construct.file) ?: return null
        val leaf = psiFile.findElementAt(varInfo.offset) ?: return null
        return PsiTreeUtil.getParentOfType(leaf, VivNamedElement::class.java, false)
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return element
        val newIdent = studio.sifty.viv.psi.VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }
}
