package studio.sifty.viv;

import com.intellij.lexer.FlexLexer;
import com.intellij.psi.tree.IElementType;

import static com.intellij.psi.TokenType.BAD_CHARACTER;
import static com.intellij.psi.TokenType.WHITE_SPACE;
import static studio.sifty.viv.psi.VivTypes.*;

%%

%class VivLexer
%implements FlexLexer
%unicode
%function advance
%type IElementType

%{
    private int braceDepth = 0;

    // State stack for nested string/expression contexts.
    // Each entry stores [returnState, savedBraceDepth].
    // Pushed when entering a string or template-ref from any context;
    // popped when leaving back to that context.
    private final java.util.ArrayDeque<int[]> stateStack = new java.util.ArrayDeque<>();

    private void pushState(int returnState) {
        stateStack.push(new int[]{ returnState, braceDepth });
    }

    private int popState() {
        if (stateStack.isEmpty()) {
            braceDepth = 0;
            return YYINITIAL;
        }
        int[] saved = stateStack.pop();
        braceDepth = saved[1];
        return saved[0];
    }

    /** Called on lexer reset to clear auxiliary state for incremental re-lexing. */
    void resetState() {
        stateStack.clear();
        braceDepth = 0;
    }

    /**
     * Encode the full lexer state (JFlex state, braceDepth, state stack) into a
     * single int for IntelliJ's incremental re-lexing checkpoints.
     *
     * Bit layout (30 bits total):
     *   Bits 0–3:   JFlex state (0–15)
     *   Bits 4–6:   braceDepth (0–7)
     *   Bits 7–8:   stack depth (0–3)
     *   Bits 9–15:  stack entry 0: returnState(4) + savedBraceDepth(3)
     *   Bits 16–22: stack entry 1: returnState(4) + savedBraceDepth(3)
     *   Bits 23–29: stack entry 2: returnState(4) + savedBraceDepth(3)
     */
    public int getFullState() {
        int state = yystate() & 0xF;
        state |= (Math.min(braceDepth, 7) & 0x7) << 4;
        int depth = Math.min(stateStack.size(), 3);
        state |= (depth & 0x3) << 7;
        int shift = 9;
        java.util.Iterator<int[]> it = stateStack.iterator();
        for (int i = 0; i < depth && it.hasNext(); i++) {
            int[] entry = it.next();
            int packed = (entry[0] & 0xF) | ((Math.min(entry[1], 7) & 0x7) << 4);
            state |= (packed & 0x7F) << shift;
            shift += 7;
        }
        return state;
    }

    /**
     * Restore the full lexer state from an int previously returned by getFullState().
     */
    public void restoreFullState(int encoded) {
        int jflexState = encoded & 0xF;
        braceDepth = (encoded >> 4) & 0x7;
        int depth = (encoded >> 7) & 0x3;
        stateStack.clear();
        int shift = 9;
        for (int i = 0; i < depth; i++) {
            int packed = (encoded >> shift) & 0x7F;
            int returnState = packed & 0xF;
            int savedDepth = (packed >> 4) & 0x7;
            stateStack.addLast(new int[]{ returnState, savedDepth });
            shift += 7;
        }
        yybegin(jflexState);
    }

    /**
     * Check if an identifier token is a reserved keyword.
     * Reserved keywords: include, if, elif, else, end, loop
     */
    private IElementType identOrKeyword() {
        String text = yytext().toString();
        switch (text) {
            case "include": return INCLUDE_KW;
            case "if":      return IF_KW;
            case "elif":    return ELIF_KW;
            case "else":    return ELSE_KW;
            case "end":     return END_KW;
            case "loop":    return LOOP_KW;
            // "search" handled as IDENTIFIER — parser disambiguates via grammar structure
            default:        return IDENTIFIER;
        }
    }
%}

// Character classes
DIGIT          = [0-9]
LETTER         = [A-Za-z]

// Full identifier: starts with letter or underscore, then optional hyphenated segments
// Pattern: [A-Za-z_]([A-Za-z0-9_]*-[A-Za-z0-9_]+)*[A-Za-z0-9_]*
// But we need the longest match, so we use a simpler pattern that JFlex handles well.
// An identifier can contain letters, digits, underscores, and hyphens (but not start/end with hyphen).
IDENTIFIER     = ({LETTER}|"_")({LETTER}|{DIGIT}|"_"|"-")*({LETTER}|{DIGIT}|"_")
               | ({LETTER}|"_")

NUMBER         = {DIGIT}+("."{DIGIT}+)?

WHITE_SPACE    = [ \t\n\r]+
LINE_COMMENT   = "//"[^\n]*

%state STRING_DQ
%state STRING_SQ
%state TEMPLATE_EXPR
%state TEMPLATE_REF

%%

// ============================================================================
// Default state (YYINITIAL)
// ============================================================================

<YYINITIAL> {

    // Whitespace and comments
    {WHITE_SPACE}                       { return WHITE_SPACE; }
    {LINE_COMMENT}                      { return LINE_COMMENT; }

    // Multi-character operators (must come before single-char)
    "->"                                { return ARROW; }
    "=="                                { return EQ_EQ; }
    "!="                                { return EXCL_EQ; }
    "<="                                { return LT_EQ; }
    ">="                                { return GT_EQ; }
    "+="                                { return PLUS_EQ; }
    "-="                                { return MINUS_EQ; }
    "*="                                { return STAR_EQ; }
    "/="                                { return SLASH_EQ; }
    "||"                                { return OR_OR; }
    "&&"                                { return AND_AND; }

    // Single-character operators and sigils
    "@"                                 { return AT; }
    "&"                                 { return AMP; }
    "$"                                 { return DOLLAR; }
    "_"                                 { return UNDERSCORE; }
    "#"                                 { return HASH; }
    "~"                                 { return TILDE; }
    ">"                                 { return GT; }
    "<"                                 { return LT; }
    "*"                                 { return STAR; }
    "?"                                 { return QUESTION; }
    "."                                 { return DOT; }
    ","                                 { return COMMA; }
    ":"                                 { return COLON; }
    ";"                                 { return SEMICOLON; }
    "!"                                 { return EXCL; }
    "("                                 { return LPAREN; }
    ")"                                 { return RPAREN; }
    "["                                 { return LBRACKET; }
    "]"                                 { return RBRACKET; }
    "{"                                 { return LBRACE; }
    "}"                                 { return RBRACE; }
    "+"                                 { return PLUS; }
    "-"                                 { return MINUS; }
    "/"                                 { return SLASH; }
    "%"                                 { return PERCENT; }
    "="                                 { return EQ; }

    // Strings: enter string states
    \"                                  {
                                          pushState(YYINITIAL);
                                          yybegin(STRING_DQ);
                                          return TEMPLATE_STRING_START;
                                        }
    \'                                  {
                                          pushState(YYINITIAL);
                                          yybegin(STRING_SQ);
                                          return TEMPLATE_STRING_START;
                                        }

    // Numbers (must come before identifiers since identifiers can't start with digits)
    {NUMBER}                            { return NUMBER; }

    // Identifiers: all words including reserved keywords
    // JFlex longest-match ensures "endpoint" matches as a single IDENTIFIER, not "end" + "point".
    // After matching, we check if the token is a reserved keyword.
    {IDENTIFIER}                        { return identOrKeyword(); }

    // Catch-all
    [^]                                 { return BAD_CHARACTER; }
}


// ============================================================================
// Double-quoted string state
// ============================================================================

<STRING_DQ> {
    // End of string — return to the state that opened this string
    \"                                  {
                                          int rs = popState();
                                          yybegin(rs);
                                          return TEMPLATE_STRING_END;
                                        }

    // Template expression: {expr}
    "{"                                 {
                                          pushState(STRING_DQ);
                                          braceDepth = 1;
                                          yybegin(TEMPLATE_EXPR);
                                          return TEMPLATE_EXPR_START;
                                        }

    // Bare reference detection: two-char sigil prefixes ($@ $& _@ _&)
    // Trailing context ensures we only match when a real identifier follows.
    // These emit just the first sigil char; the next iteration handles @ or &.
    "$" / [@&]({LETTER}|"_")            { return DOLLAR; }
    "_" / [@&]({LETTER}|"_")            { return UNDERSCORE; }

    // Bare reference detection: single sigil (@ &) followed by identifier start.
    // Push return state and enter TEMPLATE_REF to lex the identifier.
    "@" / ({LETTER}|"_")               {
                                          pushState(STRING_DQ);
                                          yybegin(TEMPLATE_REF);
                                          return AT;
                                        }
    "&" / ({LETTER}|"_")               {
                                          pushState(STRING_DQ);
                                          yybegin(TEMPLATE_REF);
                                          return AMP;
                                        }

    // Plain string content (no template-triggering chars)
    [^\"\{\n@&$_*]+                     { return TEMPLATE_STRING_PART; }

    // Sigil characters that didn't match the reference rules above
    // (not followed by a valid identifier start) — emit as string content.
    [@&$_*]                             { return TEMPLATE_STRING_PART; }

    // Newline ends a string (error recovery)
    \n                                  {
                                          int rs = popState();
                                          yybegin(rs);
                                          return TEMPLATE_STRING_END;
                                        }

    // Any other single char
    [^]                                 { return TEMPLATE_STRING_PART; }
}


// ============================================================================
// Single-quoted string state
// ============================================================================

<STRING_SQ> {
    // End of string — return to the state that opened this string
    \'                                  {
                                          int rs = popState();
                                          yybegin(rs);
                                          return TEMPLATE_STRING_END;
                                        }

    // Template expression: {expr}
    "{"                                 {
                                          pushState(STRING_SQ);
                                          braceDepth = 1;
                                          yybegin(TEMPLATE_EXPR);
                                          return TEMPLATE_EXPR_START;
                                        }

    // Bare reference detection: two-char sigil prefixes ($@ $& _@ _&)
    "$" / [@&]({LETTER}|"_")            { return DOLLAR; }
    "_" / [@&]({LETTER}|"_")            { return UNDERSCORE; }

    // Bare reference detection: single sigil (@ &) followed by identifier start
    "@" / ({LETTER}|"_")               {
                                          pushState(STRING_SQ);
                                          yybegin(TEMPLATE_REF);
                                          return AT;
                                        }
    "&" / ({LETTER}|"_")               {
                                          pushState(STRING_SQ);
                                          yybegin(TEMPLATE_REF);
                                          return AMP;
                                        }

    // Plain string content
    [^\'\{\n@&$_*]+                     { return TEMPLATE_STRING_PART; }

    // Sigil characters that didn't match the reference rules above
    [@&$_*]                             { return TEMPLATE_STRING_PART; }

    // Newline ends a string (error recovery)
    \n                                  {
                                          int rs = popState();
                                          yybegin(rs);
                                          return TEMPLATE_STRING_END;
                                        }

    // Any other single char
    [^]                                 { return TEMPLATE_STRING_PART; }
}


// ============================================================================
// Template expression state (inside { } within a string)
// ============================================================================

<TEMPLATE_EXPR> {
    "{"                                 { braceDepth++; return LBRACE; }
    "}"                                 {
                                          braceDepth--;
                                          if (braceDepth <= 0) {
                                              braceDepth = 0;
                                              int rs = popState();
                                              yybegin(rs);
                                              return TEMPLATE_EXPR_END;
                                          }
                                          return RBRACE;
                                        }

    // Strings inside template expressions (fixes nested string support).
    // Push TEMPLATE_EXPR as return state so the string knows where to come back.
    \"                                  {
                                          pushState(TEMPLATE_EXPR);
                                          yybegin(STRING_DQ);
                                          return TEMPLATE_STRING_START;
                                        }
    \'                                  {
                                          pushState(TEMPLATE_EXPR);
                                          yybegin(STRING_SQ);
                                          return TEMPLATE_STRING_START;
                                        }

    // Everything else: same as YYINITIAL but without string-starting (handled above)
    {WHITE_SPACE}                       { return WHITE_SPACE; }
    {LINE_COMMENT}                      { return LINE_COMMENT; }

    "->"                                { return ARROW; }
    "=="                                { return EQ_EQ; }
    "!="                                { return EXCL_EQ; }
    "<="                                { return LT_EQ; }
    ">="                                { return GT_EQ; }
    "+="                                { return PLUS_EQ; }
    "-="                                { return MINUS_EQ; }
    "*="                                { return STAR_EQ; }
    "/="                                { return SLASH_EQ; }
    "||"                                { return OR_OR; }
    "&&"                                { return AND_AND; }

    "@"                                 { return AT; }
    "&"                                 { return AMP; }
    "$"                                 { return DOLLAR; }
    "_"                                 { return UNDERSCORE; }
    "#"                                 { return HASH; }
    "~"                                 { return TILDE; }
    ">"                                 { return GT; }
    "<"                                 { return LT; }
    "*"                                 { return STAR; }
    "?"                                 { return QUESTION; }
    "."                                 { return DOT; }
    ","                                 { return COMMA; }
    ":"                                 { return COLON; }
    ";"                                 { return SEMICOLON; }
    "!"                                 { return EXCL; }
    "("                                 { return LPAREN; }
    ")"                                 { return RPAREN; }
    "["                                 { return LBRACKET; }
    "]"                                 { return RBRACKET; }
    "+"                                 { return PLUS; }
    "-"                                 { return MINUS; }
    "/"                                 { return SLASH; }
    "%"                                 { return PERCENT; }
    "="                                 { return EQ; }

    {NUMBER}                            { return NUMBER; }
    {IDENTIFIER}                        { return identOrKeyword(); }

    [^]                                 { return BAD_CHARACTER; }
}


// ============================================================================
// Template reference state (bare reference inside a string: @role, &symbol)
//
// Entered after the sigil token (AT/AMP) has been emitted in a string state.
// Lexes the identifier and optional group decorator (*), then returns to the
// string state that invoked it.
// ============================================================================

<TEMPLATE_REF> {
    // The identifier portion of the reference
    {IDENTIFIER}                        { return IDENTIFIER; }

    // Group role decorator: @followers*
    // Stay in TEMPLATE_REF — a reference path or fail-safe marker may follow.
    "*"                                 { return STAR; }

    // Property access: @role.name, @role.name.last
    // Trailing context ensures '.' is only matched when followed by an identifier start,
    // so that '.' adjacent to non-identifier text falls through to the catch-all.
    "."  / ({LETTER}|"_")              { return DOT; }

    // Pointer access: @role->target
    "->" / ({LETTER}|"_")              { return ARROW; }

    // Eval fail-safe marker: @role?, @role.name?
    "?"                                 { return QUESTION; }

    // Any other character is not part of the bare reference.
    // Push it back and return to the enclosing string state without emitting a token.
    // The while(true) loop in the generated lexer will re-match this character
    // in the restored string state.
    [^]                                 {
                                          yypushback(1);
                                          int rs = popState();
                                          yybegin(rs);
                                        }
}
