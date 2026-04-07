package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.psi.search.LocalSearchScope
import com.intellij.psi.search.SearchScope

/**
 * Mixin for `local_variable` PSI elements (`_@name`, `_&name` in `as` / `for` clauses).
 *
 * This is the introduction (declaration) site for a local variable.
 * It is a [PsiNamedElement] so that IntelliJ's rename refactoring can
 * find the declaration target when the caret is on either the introduction
 * or a usage resolved back to it.
 */
abstract class VivLocalVariableMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getUseScope(): SearchScope = LocalSearchScope(containingFile)
}
