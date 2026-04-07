package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.VivIdentifiers
import studio.sifty.viv.VivProjectIndex
import studio.sifty.viv.psi.VivNamedElement

/**
 * PsiReference for local variable references (`_@name`, `_&name`) in expressions.
 *
 * Resolves by text-scanning for `as _@name` or `as _&name` in the enclosing construct,
 * since local variables are introduced by loop `as` clauses and have no index entry.
 */
class VivLocalVarReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

    override fun getRangeInElement(): TextRange {
        val ident = (element as? VivNamedElement)?.nameIdentifier ?: return TextRange.EMPTY_RANGE
        val start = ident.startOffsetInParent
        return TextRange(start, start + ident.textLength)
    }

    override fun resolve(): PsiElement? {
        val name = (element as? VivNamedElement)?.name ?: return null
        val project = element.project
        val vFile = element.containingFile?.virtualFile ?: return null
        val text = element.containingFile.text

        val idx = VivProjectIndex.getInstance(project)

        // Determine construct boundaries
        val construct = idx.getConstructAt(vFile, element.textOffset)
        val blockStart: Int
        val blockEnd: Int
        if (construct != null) {
            blockStart = construct.headerOffset
            blockEnd = construct.bodyEnd
        } else {
            val (bs, be) = VivIdentifiers.findConstructBoundaries(text, element.textOffset)
            blockStart = bs
            blockEnd = be
        }

        // Scan for the introduction: `as _@name` (loops) or `for _@name:` (saliences/associations)
        val block = text.substring(blockStart, blockEnd)
        val asPattern = Regex("""\bas\s+(_[@&]${Regex.escape(name)})""")
        val forPattern = Regex("""\bfor\s+(_[@&]${Regex.escape(name)})\s*:""")
        val match = asPattern.find(block) ?: forPattern.find(block) ?: return null

        val introOffset = blockStart + match.groups[1]!!.range.first

        val psiFile = PsiManager.getInstance(project).findFile(vFile) ?: return null
        val leaf = psiFile.findElementAt(introOffset) ?: return null
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
