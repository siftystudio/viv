package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import com.intellij.psi.search.FileTypeIndex
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.VivFileType
import studio.sifty.viv.psi.VivEnum
import studio.sifty.viv.psi.VivNamedElement
import studio.sifty.viv.psi.VivPsiFactory

/**
 * PsiReference for enum tokens (`#HAPPY`).
 *
 * Enum tokens have no single declaration site — every occurrence is equally "the" definition.
 * [resolve] returns the first occurrence of this enum token across the project, which provides
 * a stable anchor for Find Usages and Rename. When this element IS the first occurrence,
 * it returns itself (self-resolution).
 */
class VivEnumReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

    override fun getRangeInElement(): TextRange {
        val ident = (element as? VivNamedElement)?.nameIdentifier ?: return TextRange.EMPTY_RANGE
        val start = ident.startOffsetInParent
        return TextRange(start, start + ident.textLength)
    }

    override fun resolve(): PsiElement? {
        val name = (element as? VivNamedElement)?.name ?: return null
        val project = element.project

        // Search all .viv files for the first enum element with the same name
        val psiManager = PsiManager.getInstance(project)
        val scope = GlobalSearchScope.projectScope(project)
        val files = FileTypeIndex.getFiles(VivFileType.INSTANCE, scope).sortedBy { it.path }

        for (file in files) {
            val psiFile = psiManager.findFile(file) ?: continue
            val enums = PsiTreeUtil.findChildrenOfType(psiFile, VivEnum::class.java)
            for (enumElement in enums) {
                val enumNamed = enumElement as? VivNamedElement ?: continue
                if (enumNamed.name == name) {
                    return enumElement
                }
            }
        }

        return null
    }

    override fun getVariants(): Array<Any> = emptyArray()

    override fun handleElementRename(newElementName: String): PsiElement {
        val nameIdent = (element as? VivNamedElement)?.nameIdentifier ?: return element
        val newIdent = VivPsiFactory.createIdentifier(element.project, newElementName)
        nameIdent.replace(newIdent)
        return element
    }
}
