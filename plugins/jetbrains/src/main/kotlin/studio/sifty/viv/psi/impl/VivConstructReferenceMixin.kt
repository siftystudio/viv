package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.references.VivConstructReference

/**
 * Mixin for reference-site PSI elements (reaction_target, parent_action_declaration, etc.).
 * Provides [getReference] so IntelliJ's native Cmd+Click, Find Usages, and Rename
 * work through the standard PsiReference pipeline.
 */
abstract class VivConstructReferenceMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getReference(): PsiReference? =
        VivConstructReference(this)
}
