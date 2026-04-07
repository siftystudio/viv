package studio.sifty.viv

import com.intellij.lang.ASTNode
import com.intellij.lang.ParserDefinition
import com.intellij.lang.PsiParser
import com.intellij.lexer.Lexer
import com.intellij.openapi.project.Project
import com.intellij.psi.FileViewProvider
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IFileElementType
import com.intellij.psi.tree.TokenSet
import studio.sifty.viv.parser.VivParser
import studio.sifty.viv.psi.VivTypes

/** Wires the Viv lexer, parser, and PSI factory into the IntelliJ platform. */
class VivParserDefinition : ParserDefinition {

    override fun createLexer(project: Project?): Lexer = VivLexerAdapter()

    override fun createParser(project: Project?): PsiParser = VivParser()

    override fun getFileNodeType(): IFileElementType = FILE

    override fun getCommentTokens(): TokenSet = COMMENTS

    override fun getStringLiteralElements(): TokenSet = STRINGS

    override fun createElement(node: ASTNode): PsiElement = VivTypes.Factory.createElement(node)

    override fun createFile(viewProvider: FileViewProvider): PsiFile = VivFile(viewProvider)

    companion object {
        val FILE = IFileElementType(VivLanguage.INSTANCE)
        val COMMENTS = TokenSet.create(VivTypes.LINE_COMMENT)
        val STRINGS = TokenSet.create(
            VivTypes.STRING_LITERAL,
            VivTypes.TEMPLATE_STRING_START,
            VivTypes.TEMPLATE_STRING_PART,
            VivTypes.TEMPLATE_STRING_END,
        )
    }
}
