package studio.sifty.viv.psi

import com.intellij.psi.tree.IElementType
import studio.sifty.viv.VivLanguage

/** Composite element type for Viv PSI nodes (grammar rules). */
class VivElementType(debugName: String) : IElementType(debugName, VivLanguage.INSTANCE) {
    override fun toString(): String = "VivElementType." + super.toString()
}
