package studio.sifty.viv.psi.impl

import com.intellij.lang.ASTNode
import com.intellij.navigation.ItemPresentation
import javax.swing.Icon

/**
 * Mixin for declaration-site PSI elements (construct headers).
 * Provides [getPresentation] so that IntelliJ's Structure View and navigation
 * popups display a human-readable label for constructs.
 */
abstract class VivNamedElementMixin(node: ASTNode) : VivNamedMixinBase(node) {

    override fun getPresentation(): ItemPresentation? {
        val elementName = name ?: return null
        return object : ItemPresentation {
            override fun getPresentableText(): String = elementName
            override fun getLocationString(): String? = containingFile?.name
            override fun getIcon(unused: Boolean): Icon? = null
        }
    }
}
