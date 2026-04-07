package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.VivTypes
import studio.sifty.viv.psi.references.VivLocalVarReference
import studio.sifty.viv.psi.references.VivRoleReference
import studio.sifty.viv.psi.references.VivScratchReference

/**
 * Mixin for `viv_reference` PSI elements (`@name`, `$@name`, `_@name` in expressions).
 * Provides [getReference] that dispatches to the correct reference type based on the sigil prefix.
 */
abstract class VivVivReferenceMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getReference(): PsiReference? {
        // Dispatch based on sigil children
        val hasScratchSigil = node.findChildByType(VivTypes.SCRATCH_VARIABLE_SIGIL) != null
        val hasLocalSigil = node.findChildByType(VivTypes.LOCAL_VARIABLE_SIGIL) != null

        return when {
            hasScratchSigil -> VivScratchReference(this)
            hasLocalSigil -> VivLocalVarReference(this)
            else -> VivRoleReference(this)
        }
    }
}
