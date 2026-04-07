package studio.sifty.viv

import com.intellij.lexer.FlexAdapter

/**
 * Lexer adapter that encodes and restores VivLexer's full auxiliary state
 * (JFlex state, brace depth, state stack) for IntelliJ's incremental re-lexing.
 *
 * IntelliJ saves the lexer state at checkpoints via [getState] and restores it
 * via [start]. The default [FlexAdapter.getState] only returns the JFlex state
 * number, losing the brace depth and state stack needed for correct tokenization
 * inside template strings. This adapter delegates to [VivLexer.getFullState] and
 * [VivLexer.restoreFullState] to pack all auxiliary state into a single int.
 */
class VivLexerAdapter : FlexAdapter(VivLexer(null)) {
    private val vivLexer: VivLexer get() = flex as VivLexer

    override fun getState(): Int = vivLexer.getFullState()

    override fun start(buffer: CharSequence, startOffset: Int, endOffset: Int, initialState: Int) {
        super.start(buffer, startOffset, endOffset, 0)
        vivLexer.restoreFullState(initialState)
    }
}
