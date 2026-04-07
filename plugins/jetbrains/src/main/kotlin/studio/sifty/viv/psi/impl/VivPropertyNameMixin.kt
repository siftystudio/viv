package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiReference
import com.intellij.psi.search.LocalSearchScope
import com.intellij.psi.search.SearchScope
import com.intellij.psi.util.PsiTreeUtil
import studio.sifty.viv.psi.VivReferencePath
import studio.sifty.viv.psi.VivReferencePathPropertyName
import studio.sifty.viv.psi.VivReferencePathPointer
import studio.sifty.viv.psi.VivTypes
import studio.sifty.viv.psi.VivVivReference
import studio.sifty.viv.psi.references.VivPropertyReference

/**
 * Mixin for `property_name` PSI elements — the IDENTIFIER inside a dot-access
 * (`.mood`) or pointer-access (`->mood`) path segment.
 *
 * Provides [getReference] that returns a [VivPropertyReference] keyed on the
 * qualified path (role sigil + role name + path segments up to this property).
 * This enables highlight-usages and rename for property access expressions.
 */
abstract class VivPropertyNameMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getUseScope(): SearchScope = LocalSearchScope(containingFile)

    override fun getNameIdentifier(): PsiElement? =
        node.findChildByType(VivTypes.IDENTIFIER)?.psi

    override fun getReference(): PsiReference? {
        val qualifiedPath = computeQualifiedPath() ?: return null
        return VivPropertyReference(this, qualifiedPath)
    }

    /**
     * Computes the qualified path key for this property name by walking up
     * to the enclosing [VivVivReference] and collecting the role prefix plus
     * all path segments up to and including this one.
     *
     * For `@initiator.mood` with caret on `mood`, returns `"@initiator.mood"`.
     * For `@initiator.mood.value` with caret on `value`, returns `"@initiator.mood.value"`.
     */
    fun computeQualifiedPath(): String? {
        // Walk up: property_name -> reference_path_property_name/reference_path_pointer -> reference_path -> viv_reference
        val vivRef = PsiTreeUtil.getParentOfType(this, VivVivReference::class.java) ?: return null
        val referencePath = PsiTreeUtil.getParentOfType(this, VivReferencePath::class.java) ?: return null

        // Build the role prefix: optional scratch/local sigil + binding type + identifier
        val bindingType = vivRef.bindingType.text   // "@" or "&"
        val roleName = vivRef.identifier.text        // "initiator"
        val sigilPrefix = when {
            vivRef.scratchVariableSigil != null -> "$"
            vivRef.localVariableSigil != null -> "_"
            else -> ""
        }
        val prefix = "$sigilPrefix$bindingType$roleName"

        // Collect path segments in order up to and including this property_name's segment.
        // Each segment is stored as a pair of (separator, name).
        val segments = mutableListOf<Pair<String, String>>()
        for (child in referencePath.children) {
            when (child) {
                is VivReferencePathPropertyName -> {
                    val propName = child.propertyName.name ?: child.propertyName.text
                    segments.add("." to propName)
                    // Stop after this segment if it contains our property_name
                    if (PsiTreeUtil.isAncestor(child, this, false)) break
                }
                is VivReferencePathPointer -> {
                    val propName = child.propertyName.name ?: child.propertyName.text
                    segments.add("->" to propName)
                    if (PsiTreeUtil.isAncestor(child, this, false)) break
                }
                // reference_path_lookup segments are skipped — they use expressions, not property names
            }
        }

        if (segments.isEmpty()) return null
        return buildString {
            append(prefix)
            for ((sep, name) in segments) {
                append(sep)
                append(name)
            }
        }
    }
}
