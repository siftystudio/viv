package studio.sifty.viv

import com.intellij.codeInsight.editorActions.enter.EnterHandlerDelegate
import com.intellij.codeInsight.editorActions.enter.EnterHandlerDelegateAdapter
import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.actionSystem.EditorActionHandler
import com.intellij.openapi.util.Ref
import com.intellij.psi.PsiFile

/**
 * Handles auto-indentation when pressing Enter in Viv files.
 *
 * Runs after the newline is inserted. If the previous line ends with `:` (a block opener),
 * adds one level of indentation.
 */
class VivEnterHandler : EnterHandlerDelegateAdapter() {

    override fun postProcessEnter(
        file: PsiFile,
        editor: Editor,
        dataContext: DataContext
    ): EnterHandlerDelegate.Result {
        if (file !is VivFile) return EnterHandlerDelegate.Result.Continue

        val document = editor.document
        val caretOffset = editor.caretModel.offset
        val currentLine = document.getLineNumber(caretOffset)
        if (currentLine == 0) return EnterHandlerDelegate.Result.Continue

        // Look at the line above (the one we just pressed Enter on)
        val prevLine = currentLine - 1
        val prevLineStart = document.getLineStartOffset(prevLine)
        val prevLineEnd = document.getLineEndOffset(prevLine)
        val prevLineText = document.getText(com.intellij.openapi.util.TextRange(prevLineStart, prevLineEnd))

        val effective = stripTrailingComment(prevLineText).trimEnd()
        if (!effective.endsWith(":")) return EnterHandlerDelegate.Result.Continue

        // The previous line ends with ':' — add one indent level at the caret position
        val tabSize = editor.settings.getTabSize(file.project)
        val useTab = editor.settings.isUseTabCharacter(file.project)
        val indent = if (useTab) "\t" else " ".repeat(tabSize)

        document.insertString(caretOffset, indent)
        editor.caretModel.moveToOffset(caretOffset + indent.length)

        return EnterHandlerDelegate.Result.Continue
    }

    companion object {
        private fun stripTrailingComment(line: String): String {
            var inDouble = false
            var inSingle = false
            var i = 0
            while (i < line.length) {
                val c = line[i]
                if (inDouble) {
                    if (c == '"') inDouble = false
                } else if (inSingle) {
                    if (c == '\'') inSingle = false
                } else {
                    when (c) {
                        '"' -> inDouble = true
                        '\'' -> inSingle = true
                        '/' -> if (i + 1 < line.length && line[i + 1] == '/') return line.substring(0, i)
                    }
                }
                i++
            }
            return line
        }
    }
}
