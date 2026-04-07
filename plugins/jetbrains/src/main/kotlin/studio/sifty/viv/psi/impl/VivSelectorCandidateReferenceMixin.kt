package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.references.VivSelectorCandidateReference

/**
 * Mixin for `selector_candidate_name` PSI elements.
 * Resolves bare candidates (`greet;`) to their construct header based on the
 * enclosing selector type (action-selector -> action, plan-selector -> plan).
 * If the `selector` keyword prefix is present, resolves to a selector instead.
 */
abstract class VivSelectorCandidateReferenceMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getReference(): PsiReference? =
        VivSelectorCandidateReference(this)
}
