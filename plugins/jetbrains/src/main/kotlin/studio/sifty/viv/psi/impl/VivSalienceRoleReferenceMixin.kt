package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.references.VivRoleReference

/**
 * Mixin for `saliences_roles_entry` and `associations_roles_entry` PSI elements.
 * These use `'@' identifier` directly (not `role_reference`), so they need their own
 * mixin to provide PsiReference for role resolution.
 */
abstract class VivSalienceRoleReferenceMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getReference(): PsiReference? =
        VivRoleReference(this)
}
