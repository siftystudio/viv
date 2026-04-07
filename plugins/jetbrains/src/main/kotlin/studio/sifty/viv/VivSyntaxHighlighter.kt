package studio.sifty.viv

import com.intellij.lexer.Lexer
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase
import com.intellij.psi.TokenType
import com.intellij.psi.tree.IElementType
import studio.sifty.viv.psi.VivTypes

/**
 * Maps JFlex lexer tokens to [TextAttributesKey] arrays for syntax coloring.
 *
 * The lexer produces generic tokens (IDENTIFIER for all words, PLUS for `+`, etc.).
 * Context-sensitive keyword classification (e.g., `action` as construct keyword vs. role
 * label) is handled by [VivHighlightingAnnotator] at the PSI level. This highlighter
 * covers the structural tokens that the lexer can classify unambiguously.
 */
class VivSyntaxHighlighter : SyntaxHighlighterBase() {

    override fun getHighlightingLexer(): Lexer = VivLexerAdapter()

    override fun getTokenHighlights(tokenType: IElementType): Array<TextAttributesKey> {
        return when (tokenType) {
            // -- Comments --
            VivTypes.LINE_COMMENT -> COMMENT_KEYS

            // -- Reserved keywords (lexer produces distinct tokens) --
            VivTypes.IF_KW, VivTypes.ELIF_KW, VivTypes.ELSE_KW,
            VivTypes.END_KW, VivTypes.LOOP_KW, VivTypes.INCLUDE_KW -> KEYWORD_KEYS

            // -- Numbers --
            VivTypes.NUMBER -> NUMBER_KEYS

            // -- Strings --
            VivTypes.TEMPLATE_STRING_START, VivTypes.TEMPLATE_STRING_END,
            VivTypes.TEMPLATE_STRING_PART -> STRING_KEYS

            // -- Template expression delimiters ({ } inside strings) --
            VivTypes.TEMPLATE_EXPR_START, VivTypes.TEMPLATE_EXPR_END -> KEYWORD_KEYS

            // -- Multi-character operators (keyword.operator.viv in Sublime) --
            VivTypes.ARROW, VivTypes.EQ_EQ, VivTypes.EXCL_EQ,
            VivTypes.LT_EQ, VivTypes.GT_EQ, VivTypes.PLUS_EQ,
            VivTypes.MINUS_EQ, VivTypes.STAR_EQ, VivTypes.SLASH_EQ,
            VivTypes.OR_OR, VivTypes.AND_AND -> KEYWORD_KEYS

            // -- Single-character operators used as keyword.operator.viv --
            VivTypes.EXCL, VivTypes.QUESTION -> KEYWORD_KEYS

            // -- Sigils (keyword.operator.viv) --
            VivTypes.AT, VivTypes.AMP, VivTypes.DOLLAR, VivTypes.UNDERSCORE,
            VivTypes.HASH, VivTypes.TILDE, VivTypes.STAR -> KEYWORD_KEYS

            // -- Arithmetic/comparison operators (keyword.operator.viv) --
            VivTypes.PLUS, VivTypes.MINUS, VivTypes.SLASH,
            VivTypes.PERCENT, VivTypes.EQ, VivTypes.GT, VivTypes.LT -> KEYWORD_KEYS

            // -- Brackets and braces (keyword.operator.viv in Sublime) --
            VivTypes.LBRACE, VivTypes.RBRACE,
            VivTypes.LBRACKET, VivTypes.RBRACKET -> BRACKETS_KEYS

            // -- Parentheses (punctuation.accessor.viv in Sublime) --
            VivTypes.LPAREN, VivTypes.RPAREN -> PARENTHESES_KEYS

            // -- Dot (punctuation.accessor.viv) --
            VivTypes.DOT -> PUNCTUATION_KEYS

            // -- Colon (punctuation.separator.key-value.viv) --
            VivTypes.COLON -> COLON_KEYS

            // -- Comma (punctuation.separator.sequence.viv) --
            VivTypes.COMMA -> COMMA_KEYS

            // -- Semicolon (punctuation.terminator.statement.viv) --
            VivTypes.SEMICOLON -> SEMICOLON_KEYS

            // -- Bad characters --
            TokenType.BAD_CHARACTER -> BAD_CHAR_KEYS

            // -- Identifiers get no highlighting at lexer level --
            // Context-sensitive coloring is handled by VivHighlightingAnnotator.
            else -> EMPTY_KEYS
        }
    }

    companion object {
        private val EMPTY_KEYS = emptyArray<TextAttributesKey>()
        private val BAD_CHAR_KEYS = arrayOf(com.intellij.openapi.editor.HighlighterColors.BAD_CHARACTER)

        private val COMMENT_KEYS = arrayOf(VivHighlightingColors.COMMENT)
        private val KEYWORD_KEYS = arrayOf(VivHighlightingColors.KEYWORD)
        private val NUMBER_KEYS = arrayOf(VivHighlightingColors.NUMBER)
        private val STRING_KEYS = arrayOf(VivHighlightingColors.STRING)
        private val BRACKETS_KEYS = arrayOf(VivHighlightingColors.BRACKETS)
        private val PARENTHESES_KEYS = arrayOf(VivHighlightingColors.PARENTHESES)
        private val PUNCTUATION_KEYS = arrayOf(VivHighlightingColors.PUNCTUATION)
        private val COLON_KEYS = arrayOf(VivHighlightingColors.COLON)
        private val COMMA_KEYS = arrayOf(VivHighlightingColors.COMMA)
        private val SEMICOLON_KEYS = arrayOf(VivHighlightingColors.SEMICOLON)
    }
}
