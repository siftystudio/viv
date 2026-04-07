package studio.sifty.viv

import com.intellij.lang.BracePair
import com.intellij.lang.PairedBraceMatcher
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IElementType
import studio.sifty.viv.psi.VivTypes

/**
 * Pairs braces, brackets, and parentheses so that IntelliJ handles
 * auto-closing and brace-matching highlight for Viv files.
 */
class VivBraceMatcher : PairedBraceMatcher {

    override fun getPairs(): Array<BracePair> = arrayOf(
        BracePair(VivTypes.LBRACE, VivTypes.RBRACE, true),
        BracePair(VivTypes.LBRACKET, VivTypes.RBRACKET, false),
        BracePair(VivTypes.LPAREN, VivTypes.RPAREN, false),
    )

    override fun isPairedBracesAllowedBeforeType(
        lbraceType: IElementType, contextType: IElementType?
    ): Boolean = true

    override fun getCodeConstructStart(file: PsiFile, openingBraceOffset: Int): Int =
        openingBraceOffset
}
