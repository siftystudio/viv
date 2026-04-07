package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.references.VivEnumReference

/**
 * Mixin for `enum` PSI elements (`#HAPPY`, `-#SAD`, `+#EXCITED`).
 * Provides [PsiNamedElement] support (so Rename works) and [getReference]
 * (so Find Usages and Highlight Usages work).
 *
 * The name is the bare identifier text without the `#` prefix or sign prefix.
 */
abstract class VivEnumMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getReference(): PsiReference? =
        VivEnumReference(this)
}
