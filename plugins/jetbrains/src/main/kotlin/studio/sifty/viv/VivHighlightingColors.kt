package studio.sifty.viv

import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey

/**
 * Viv syntax highlighting color keys.
 *
 * Each key maps to a standard [DefaultLanguageHighlighterColors] fallback so that non-Viv
 * themes (Darcula, IntelliJ Light, WebStorm Default, etc.) produce reasonable coloring
 * out of the box. The six bundled Viv color schemes override the standard keys to match
 * the Viv color palette.
 *
 * The mapping from Sublime syntax scopes to JetBrains attribute keys:
 *
 * | Sublime scope                     | Key                    | Fallback                     |
 * |-----------------------------------|------------------------|------------------------------|
 * | keyword.operator.viv              | VIV_KEYWORD            | KEYWORD                      |
 * | keyword.other.viv                 | VIV_SECTION_KEYWORD    | METADATA                     |
 * | keyword.other.parameter.viv       | VIV_KEYWORD_PARAMETER  | METADATA                     |
 * | entity.name.function.*.viv        | VIV_CONSTRUCT_NAME     | FUNCTION_DECLARATION         |
 * | entity.name.variable.viv          | VIV_REFERENCE          | GLOBAL_VARIABLE              |
 * | entity.name.variable.global.viv   | VIV_SCRATCH_VARIABLE   | GLOBAL_VARIABLE              |
 * | entity.name.variable.local.viv    | VIV_LOCAL_VARIABLE     | LOCAL_VARIABLE               |
 * | entity.name.label.viv             | VIV_PHASE_NAME         | LABEL                        |
 * | support.constant.viv              | VIV_ROLE_LABEL         | PREDEFINED_SYMBOL            |
 * | constant.language.viv             | VIV_CONSTANT           | NUMBER                       |
 * | string.quoted.*.viv               | VIV_STRING             | STRING                       |
 * | comment.line.double-slash.viv     | VIV_COMMENT            | LINE_COMMENT                 |
 * | meta.external-name.viv            | VIV_EXTERNAL_NAME      | IDENTIFIER                   |
 * | constant.numeric (numbers)        | VIV_NUMBER             | NUMBER                       |
 * | punctuation.accessor.viv          | VIV_PUNCTUATION        | DOT                          |
 * | punctuation.separator.key-value   | VIV_COLON              | OPERATION_SIGN               |
 * | punctuation.separator.sequence    | VIV_COMMA              | COMMA                        |
 * | punctuation.terminator.statement  | VIV_SEMICOLON          | SEMICOLON                    |
 * | support.variable.reserved.viv     | VIV_RESERVED_IDENT     | PREDEFINED_SYMBOL            |
 */
object VivHighlightingColors {

    // -- Operators, control flow, construct-type keywords (Sublime: keyword.operator.viv) --
    @JvmField
    val KEYWORD = TextAttributesKey.createTextAttributesKey(
        "VIV_KEYWORD", DefaultLanguageHighlighterColors.KEYWORD
    )

    // -- Section/field keywords, plan instructions (Sublime: keyword.other.viv) --
    @JvmField
    val SECTION_KEYWORD = TextAttributesKey.createTextAttributesKey(
        "VIV_SECTION_KEYWORD", DefaultLanguageHighlighterColors.METADATA
    )

    // -- Keyword parameters: partial, none, randomly, etc. (Sublime: keyword.other.parameter.viv) --
    @JvmField
    val KEYWORD_PARAMETER = TextAttributesKey.createTextAttributesKey(
        "VIV_KEYWORD_PARAMETER", DefaultLanguageHighlighterColors.METADATA
    )

    // -- Construct names (Sublime: entity.name.function.*.viv) --
    @JvmField
    val CONSTRUCT_NAME = TextAttributesKey.createTextAttributesKey(
        "VIV_CONSTRUCT_NAME", DefaultLanguageHighlighterColors.FUNCTION_DECLARATION
    )

    // -- Plain references: @role, &symbol (Sublime: entity.name.variable.viv) --
    @JvmField
    val REFERENCE = TextAttributesKey.createTextAttributesKey(
        "VIV_REFERENCE", DefaultLanguageHighlighterColors.GLOBAL_VARIABLE
    )

    // -- Scratch variables: $@name, $&name (Sublime: entity.name.variable.global.viv) --
    @JvmField
    val SCRATCH_VARIABLE = TextAttributesKey.createTextAttributesKey(
        "VIV_SCRATCH_VARIABLE", DefaultLanguageHighlighterColors.GLOBAL_VARIABLE
    )

    // -- Local variables: _@name, _&name (Sublime: entity.name.variable.local.viv) --
    @JvmField
    val LOCAL_VARIABLE = TextAttributesKey.createTextAttributesKey(
        "VIV_LOCAL_VARIABLE", DefaultLanguageHighlighterColors.LOCAL_VARIABLE
    )

    // -- Plan phase names (Sublime: entity.name.label.viv) --
    @JvmField
    val PHASE_NAME = TextAttributesKey.createTextAttributesKey(
        "VIV_PHASE_NAME", DefaultLanguageHighlighterColors.LABEL
    )

    // -- Role labels, language constants, time units (Sublime: support.constant.viv) --
    @JvmField
    val ROLE_LABEL = TextAttributesKey.createTextAttributesKey(
        "VIV_ROLE_LABEL", DefaultLanguageHighlighterColors.PREDEFINED_SYMBOL
    )

    // -- Reserved internal identifiers: __name (Sublime: support.variable.reserved.viv) --
    @JvmField
    val RESERVED_IDENT = TextAttributesKey.createTextAttributesKey(
        "VIV_RESERVED_IDENT", DefaultLanguageHighlighterColors.PREDEFINED_SYMBOL
    )

    // -- Boolean/null constants (Sublime: constant.language.viv) --
    @JvmField
    val CONSTANT = TextAttributesKey.createTextAttributesKey(
        "VIV_CONSTANT", DefaultLanguageHighlighterColors.NUMBER
    )

    // -- Numbers (Sublime: constant.language.viv for numbers too) --
    @JvmField
    val NUMBER = TextAttributesKey.createTextAttributesKey(
        "VIV_NUMBER", DefaultLanguageHighlighterColors.NUMBER
    )

    // -- Strings (Sublime: string.quoted.*.viv) --
    @JvmField
    val STRING = TextAttributesKey.createTextAttributesKey(
        "VIV_STRING", DefaultLanguageHighlighterColors.STRING
    )

    // -- Comments (Sublime: comment.line.double-slash.viv) --
    @JvmField
    val COMMENT = TextAttributesKey.createTextAttributesKey(
        "VIV_COMMENT", DefaultLanguageHighlighterColors.LINE_COMMENT
    )

    // -- Domain-specific names after . # ~ -> (Sublime: meta.external-name.viv) --
    @JvmField
    val EXTERNAL_NAME = TextAttributesKey.createTextAttributesKey(
        "VIV_EXTERNAL_NAME", DefaultLanguageHighlighterColors.IDENTIFIER
    )

    // -- Punctuation: . ( ) and accessor brackets (Sublime: punctuation.accessor.viv) --
    @JvmField
    val PUNCTUATION = TextAttributesKey.createTextAttributesKey(
        "VIV_PUNCTUATION", DefaultLanguageHighlighterColors.DOT
    )

    // -- Colon separator (Sublime: punctuation.separator.key-value.viv) --
    @JvmField
    val COLON = TextAttributesKey.createTextAttributesKey(
        "VIV_COLON", DefaultLanguageHighlighterColors.OPERATION_SIGN
    )

    // -- Comma (Sublime: punctuation.separator.sequence.viv) --
    @JvmField
    val COMMA = TextAttributesKey.createTextAttributesKey(
        "VIV_COMMA", DefaultLanguageHighlighterColors.COMMA
    )

    // -- Semicolon (Sublime: punctuation.terminator.statement.viv) --
    @JvmField
    val SEMICOLON = TextAttributesKey.createTextAttributesKey(
        "VIV_SEMICOLON", DefaultLanguageHighlighterColors.SEMICOLON
    )

    // -- Brackets: [ ] { } (Sublime: keyword.operator.viv for these) --
    @JvmField
    val BRACKETS = TextAttributesKey.createTextAttributesKey(
        "VIV_BRACKETS", DefaultLanguageHighlighterColors.KEYWORD
    )

    // -- Parentheses (Sublime: punctuation.accessor.viv for these) --
    @JvmField
    val PARENTHESES = TextAttributesKey.createTextAttributesKey(
        "VIV_PARENTHESES", DefaultLanguageHighlighterColors.PARENTHESES
    )
}
