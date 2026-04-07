package studio.sifty.viv

import com.intellij.codeInsight.AutoPopupController
import com.intellij.codeInsight.editorActions.TypedHandlerDelegate
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiFile

/**
 * Handles auto-closing of brackets and quotes in Viv files, and triggers role-name
 * autocompletion when `@`, `&`, `#`, or `~` is typed.
 *
 * Bracket auto-closing is duplicated here rather than relying solely on
 * [VivBraceMatcher] because our TextMate-bridged highlighting means the
 * platform's brace-auto-insert path does not see our PSI token types at the
 * caret. The [VivBraceMatcher] still provides brace-match highlighting and
 * navigation.
 */
class VivTypedHandler : TypedHandlerDelegate() {

    override fun charTyped(c: Char, project: Project, editor: Editor, file: PsiFile): Result {
        if (file !is VivFile) return Result.CONTINUE

        // Trigger autocompletion on identifier sigils
        if (c == '@' || c == '&' || c == '#' || c == '~') {
            AutoPopupController.getInstance(project).scheduleAutoPopup(editor)
            return Result.CONTINUE
        }

        val closing = PAIRS[c] ?: return Result.CONTINUE

        val offset = editor.caretModel.offset
        val document = editor.document
        val text = document.charsSequence

        // For quotes, don't auto-close if the character before the caret is the same quote
        // (the user is closing an existing string)
        if ((c == '"' || c == '\'') && (offset < 2 || text[offset - 2] != c)) {
            // Also don't auto-close if the next char is alphanumeric (likely mid-word)
            if (offset < text.length && text[offset].isLetterOrDigit()) return Result.CONTINUE
            document.insertString(offset, closing.toString())
            return Result.STOP
        }

        // For brackets, always auto-close unless the next char is the same closing bracket
        if (c == '{' || c == '[' || c == '(') {
            if (offset < text.length && text[offset] == closing) return Result.CONTINUE
            document.insertString(offset, closing.toString())
            return Result.STOP
        }

        return Result.CONTINUE
    }

    companion object {
        private val PAIRS = mapOf(
            '{' to '}',
            '[' to ']',
            '(' to ')',
            '"' to '"',
            '\'' to '\'',
        )
    }
}
