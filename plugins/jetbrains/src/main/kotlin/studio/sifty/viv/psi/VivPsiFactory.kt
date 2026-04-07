package studio.sifty.viv.psi

import com.intellij.openapi.project.Project
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFileFactory
import studio.sifty.viv.VivFileType

/**
 * Creates PSI elements from text, used for rename refactoring.
 */
object VivPsiFactory {

    /**
     * Creates a new IDENTIFIER PSI element with the given [name].
     * Works by parsing a dummy action header and extracting the identifier token.
     */
    fun createIdentifier(project: Project, name: String): PsiElement {
        val file = PsiFileFactory.getInstance(project)
            .createFileFromText("dummy.viv", VivFileType.INSTANCE, "action $name:\n")
        // PSI tree: VivFile → VivAction → VivActionHeader → IDENTIFIER
        val actionHeader = file.firstChild?.firstChild ?: error("Failed to create dummy action header")
        return actionHeader.lastChild
            ?.takeIf { it.node.elementType == VivTypes.IDENTIFIER }
            ?: findIdentifierChild(actionHeader)
            ?: error("Failed to find IDENTIFIER in dummy action header")
    }

    /**
     * Creates a file_path PSI element from an include statement with the given [quotedPath].
     * The [quotedPath] should include quotes, e.g., `"base-actions.viv"`.
     */
    fun createInclude(project: Project, quotedPath: String): PsiElement {
        val file = PsiFileFactory.getInstance(project)
            .createFileFromText("dummy.viv", VivFileType.INSTANCE, "include $quotedPath\n")
        // PSI tree: VivFile → VivIncludeStatement → VivFilePath
        val includeStatement = file.firstChild ?: error("Failed to create dummy include")
        return includeStatement.lastChild
            ?: error("Failed to find file_path in dummy include")
    }

    private fun findIdentifierChild(element: PsiElement): PsiElement? {
        var child = element.firstChild
        while (child != null) {
            if (child.node.elementType == VivTypes.IDENTIFIER) return child
            child = child.nextSibling
        }
        return null
    }
}
