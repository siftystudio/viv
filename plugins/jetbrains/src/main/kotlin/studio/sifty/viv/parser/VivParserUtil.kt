package studio.sifty.viv.parser

import com.intellij.lang.PsiBuilder
import com.intellij.lang.parser.GeneratedParserUtilBase
import studio.sifty.viv.psi.VivTypes

/**
 * Custom parser methods for GrammarKit.
 *
 * Used to resolve ambiguities that GrammarKit's BNF can't express,
 * equivalent to negative lookahead predicates in the PEG grammar.
 */
@Suppress("UNUSED_PARAMETER")
object VivParserUtil : GeneratedParserUtilBase() {

    /**
     * Matches `<` as a less-than operator, but NOT if it's the start of sugared bindings.
     *
     * Equivalent to the PEG's `!bindings_sugared "<"`.
     *
     * The heuristic: `<` followed by `@`, `&`, `none`, or `partial` is sugared bindings,
     * not less-than. This is a 1-token lookahead.
     */
    @JvmStatic
    fun ltNotSugared(builder: PsiBuilder, level: Int): Boolean {
        if (builder.tokenType != VivTypes.LT) return false

        // Look ahead: what follows the `<`?
        val marker = builder.mark()
        builder.advanceLexer()
        val nextType = builder.tokenType
        val nextText = builder.tokenText
        marker.rollbackTo()

        // If followed by @ or &, this is likely sugared bindings: <@role, ...>
        if (nextType == VivTypes.AT || nextType == VivTypes.AMP) return false

        // If followed by 'none' or 'partial', this is sugared bindings: <none> or <partial ...>
        if (nextType == VivTypes.IDENTIFIER && (nextText == "none" || nextText == "partial")) return false

        // Otherwise, it's a less-than operator — consume it
        builder.advanceLexer()
        return true
    }
}
