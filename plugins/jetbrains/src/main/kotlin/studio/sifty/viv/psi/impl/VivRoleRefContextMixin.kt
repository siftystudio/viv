package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import com.intellij.psi.search.GlobalSearchScope
import com.intellij.psi.search.LocalSearchScope
import com.intellij.psi.search.SearchScope
import studio.sifty.viv.psi.VivTypes
import studio.sifty.viv.psi.references.VivBindingLhsRoleReference
import studio.sifty.viv.psi.references.VivRoleReference

/**
 * Mixin for `role_reference` PSI elements (`@name`, `&name`).
 *
 * Context-sensitive: in a `role` definition (roles section), this is a declaration site
 * and returns no reference. In `binding`, `embargo_roles`, `role_renaming`, etc.,
 * this is a reference site and returns a [PsiReference].
 */
abstract class VivRoleRefContextMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getUseScope(): SearchScope {
        // Declaration sites (roles: section) need project scope because inherited roles
        // can be referenced in child actions defined in other files.
        val parentType = parent?.node?.elementType
        if (parentType == VivTypes.ROLE) return GlobalSearchScope.projectScope(project)
        return LocalSearchScope(containingFile)
    }

    override fun getReference(): PsiReference? {
        val parentType = parent?.node?.elementType
        // In a role definition (roles: section), this is a declaration — no reference
        if (parentType == VivTypes.ROLE) return null
        // In a sifting_pattern_action definition, this is a declaration — no reference
        if (parentType == VivTypes.SIFTING_PATTERN_ACTION) return null
        // In a binding, the role_reference is the LHS — resolves against the TARGET construct
        if (parentType == VivTypes.BINDING) return VivBindingLhsRoleReference(this)
        // In embargo_roles, role_renaming, role_casting_pool_is/from references — resolves to current construct
        return VivRoleReference(this)
    }
}
