package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.references.VivFunctionReference

/**
 * Mixin for `custom_function_call` PSI elements (`~name()` calls).
 * Provides [getReference] so IntelliJ's native Cmd+Click, Find Usages, and Rename
 * work through the standard PsiReference pipeline.
 */
abstract class VivFunctionReferenceMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getReference(): PsiReference? =
        VivFunctionReference(this)
}
