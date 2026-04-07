package studio.sifty.viv.psi

import com.intellij.psi.tree.IElementType
import studio.sifty.viv.VivLanguage

/** Leaf token type for Viv lexer tokens. */
class VivTokenType(debugName: String) : IElementType(debugName, VivLanguage.INSTANCE) {
    override fun toString(): String = "VivTokenType." + super.toString()
}
