package studio.sifty.viv.psi.impl

import com.intellij.extapi.psi.ASTWrapperPsiElement
import com.intellij.lang.ASTNode
import com.intellij.psi.PsiElement
import com.intellij.psi.tree.TokenSet
import studio.sifty.viv.psi.VivNamedElement
import studio.sifty.viv.psi.VivPsiFactory
import studio.sifty.viv.psi.VivTypes

/**
 * Abstract base for all PSI mixins that implement [VivNamedElement].
 *
 * Provides the standard [getName], [setName], [getNameIdentifier], and [getTextOffset]
 * implementations shared by every identifier-bearing mixin. Subclasses override only what
 * differs — typically [getReference] and sometimes [getNameIdentifier] or [getPresentation].
 */
abstract class VivNamedMixinBase(node: ASTNode) : ASTWrapperPsiElement(node), VivNamedElement {

    override fun getName(): String? = nameIdentifier?.text

    override fun setName(name: String): PsiElement {
        nameIdentifier?.let { ident ->
            val newNode = VivPsiFactory.createIdentifier(project, name)
            ident.replace(newNode)
        }
        return this
    }

    override fun getNameIdentifier(): PsiElement? {
        // The name is the LAST IDENTIFIER child — keywords like 'action', 'plan' come first
        // as IDENTIFIER tokens (context-sensitive keywords), the actual name comes last.
        val identifiers = node.getChildren(TokenSet.create(VivTypes.IDENTIFIER))
        return identifiers.lastOrNull()?.psi
    }

    override fun getTextOffset(): Int =
        nameIdentifier?.textOffset ?: super.getTextOffset()
}
