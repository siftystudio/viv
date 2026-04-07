package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiReference
import studio.sifty.viv.psi.*
import studio.sifty.viv.psi.references.VivConstructReference
import studio.sifty.viv.psi.references.VivTagNameReference

/**
 * Mixin for `tag` PSI elements. Dispatches to the correct reference based on context:
 *
 * - Inside a `tags:` section (parent is [VivTags]): global tag identifier resolved
 *   via [VivTagNameReference] (Find Usages, Rename, Highlight across all tags sections).
 * - Inside a `query_tags` predicate (parent is [VivSetPredicateTags], grandparent is
 *   [VivQueryTags]): also resolved as a global tag identifier, since query tags search
 *   for the same tag values declared in tags sections.
 * - Inside a `query_action_name` predicate: resolved as an action construct reference
 *   via [VivConstructReference].
 * - All other predicate contexts: resolved as a construct reference (existing behavior).
 */
abstract class VivTagReferenceMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getReference(): PsiReference? {
        val parent = parent
        // Tag inside a tags: section (action_tags, associations_default, etc.)
        if (parent is VivTags) return VivTagNameReference(this)
        // Tag inside a query_tags predicate — queries for the same global tag values
        if (parent is VivSetPredicateTags && parent.parent is VivQueryTags) {
            return VivTagNameReference(this)
        }
        // Tag inside a query_associations predicate — also global tag identifiers
        if (parent is VivSetPredicateTags && parent.parent is VivQueryAssociations) {
            return VivTagNameReference(this)
        }
        // All other contexts (query_action_name, etc.) — construct reference
        return VivConstructReference(this)
    }
}
