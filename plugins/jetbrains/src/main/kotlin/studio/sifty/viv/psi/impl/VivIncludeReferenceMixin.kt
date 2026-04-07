package studio.sifty.viv.psi.impl

import com.intellij.extapi.psi.ASTWrapperPsiElement
import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.references.VivIncludeReference

/**
 * Mixin for `file_path` PSI elements (the path inside an include statement).
 * Provides [getReference] so Cmd+Click on the path opens the target file.
 */
abstract class VivIncludeReferenceMixin(node: ASTNode) : ASTWrapperPsiElement(node) {

    override fun getReference(): PsiReference? =
        VivIncludeReference(this)
}
