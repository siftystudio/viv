package studio.sifty.viv.psi.references

import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiManager
import com.intellij.psi.PsiReferenceBase
import studio.sifty.viv.psi.VivPsiFactory

/**
 * PsiReference for include file paths (`include "file.viv"`).
 *
 * Resolves to the target [PsiFile] by interpreting the path relative to the
 * containing file's directory.
 */
class VivIncludeReference(element: PsiElement) : PsiReferenceBase<PsiElement>(element) {

    override fun getRangeInElement(): TextRange {
        // The element is the file_path node; exclude surrounding quotes if present
        val text = element.text
        val len = element.textLength
        if (len >= 2 && (text[0] == '"' || text[0] == '\'') && text[len - 1] == text[0]) {
            return TextRange(1, len - 1)
        }
        return TextRange(0, len)
    }

    override fun resolve(): PsiElement? {
        val project = element.project
        val containingDir = element.containingFile?.virtualFile?.parent ?: return null

        // Strip quotes from the path text (could be "path" or 'path')
        val rawPath = element.text
            .removeSurrounding("\"")
            .removeSurrounding("'")

        val targetFile = containingDir.findFileByRelativePath(rawPath) ?: return null
        return PsiManager.getInstance(project).findFile(targetFile)
    }

    override fun handleElementRename(newElementName: String): PsiElement {
        val text = element.text
        val len = element.textLength
        // Determine the quote character and rebuild the path with the new filename
        if (len >= 2 && (text[0] == '"' || text[0] == '\'') && text[len - 1] == text[0]) {
            val quote = text[0]
            val oldPath = text.substring(1, len - 1)
            // Replace just the filename portion, preserving any directory prefix
            val lastSlash = oldPath.lastIndexOf('/')
            val newPath = if (lastSlash >= 0) {
                oldPath.substring(0, lastSlash + 1) + newElementName
            } else {
                newElementName
            }
            // Create a new include statement and extract its file_path element
            val newInclude = VivPsiFactory.createInclude(element.project, "$quote$newPath$quote")
            element.replace(newInclude)
            return newInclude
        }
        return element
    }

    override fun getVariants(): Array<Any> = emptyArray()
}
