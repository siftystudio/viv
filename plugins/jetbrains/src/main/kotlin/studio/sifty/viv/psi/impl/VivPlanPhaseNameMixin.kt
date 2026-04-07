package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.navigation.ItemPresentation
import com.intellij.psi.PsiElement
import com.intellij.psi.search.LocalSearchScope
import com.intellij.psi.search.SearchScope
import com.intellij.psi.tree.TokenSet
import studio.sifty.viv.psi.VivTypes
import javax.swing.Icon

/**
 * Mixin for `plan_phase_name` PSI elements (`>phase-name`).
 * Provides [getName], [setName], and [getNameIdentifier] so that IntelliJ's
 * native rename, highlight usages, and navigation work for plan phases.
 */
abstract class VivPlanPhaseNameMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getUseScope(): SearchScope = LocalSearchScope(containingFile)

    override fun getNameIdentifier(): PsiElement? {
        val identifiers = node.getChildren(TokenSet.create(VivTypes.IDENTIFIER))
        return identifiers.firstOrNull()?.psi
    }

    override fun getPresentation(): ItemPresentation? {
        val elementName = name ?: return null
        return object : ItemPresentation {
            override fun getPresentableText(): String = ">$elementName"
            override fun getLocationString(): String? = containingFile?.name
            override fun getIcon(unused: Boolean): Icon? = null
        }
    }
}
