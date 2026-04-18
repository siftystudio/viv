package studio.sifty.viv

import com.intellij.lang.annotation.AnnotationHolder
import com.intellij.lang.annotation.ExternalAnnotator
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiFile

/**
 * Runs the Viv compiler as an external process and maps diagnostics to editor annotations.
 *
 * The IntelliJ annotation pipeline calls:
 * 1. [collectInformation] — on the EDT in a read action. Collects the file path.
 * 2. [doAnnotate] — on a background thread. Invokes the compiler and parses the result.
 * 3. [apply] — on the EDT in a read action. Maps the result to editor annotations.
 */
class VivExternalAnnotator : ExternalAnnotator<VivExternalAnnotator.Info, CompileResult>() {

    data class Info(val filePath: String)

    override fun collectInformation(file: PsiFile, editor: Editor, hasErrors: Boolean): Info? {
        val virtualFile = file.virtualFile ?: return null
        val path = virtualFile.path
        if (!path.endsWith(".viv")) return null
        // Only compile when the file is saved — the compiler reads from disk, so compiling
        // unsaved content would show stale results
        val document = editor.document
        if (FileDocumentManager.getInstance().isDocumentUnsaved(document)) return null
        VivStatusBarWidgetFactory.showCompiling(file.project)
        return Info(path)
    }

    override fun doAnnotate(info: Info): CompileResult {
        val service = VivCompilerService.getInstance()
        // Use cached result from the Run flow if available, avoiding a redundant compiler call
        return service.consumeCachedResult(info.filePath)
            ?: service.compile(info.filePath)
    }

    override fun apply(file: PsiFile, result: CompileResult, holder: AnnotationHolder) {
        // Update the status bar widget
        VivStatusBarWidgetFactory.updateStatus(file.project, result)
        // Update the Viv tool window with the full formatted result
        VivToolWindowFactory.updateText(file.project, VivCompileResultFormatter.format(result))
        // Trigger install/update notifications based on structured error/warning types
        if (result.errorType == "not_installed") {
            // Environment issue, not a code issue — route to balloon/prompt instead of Problems pane
            VivNotifications.autodetectOrPromptInstall(file.project)
            return
        }
        if (result.warningType == "compiler_outdated") {
            VivNotifications.promptUpdate(file.project)
        }
        // If compilation succeeded, only attach a version-mismatch warning if present
        if (result.status == "success") {
            // Attach version-mismatch warning if present
            if (result.warning != null) {
                holder.newAnnotation(HighlightSeverity.WARNING, result.warning)
                    .range(TextRange(0, minOf(1, file.textLength)))
                    .needsUpdateOnTyping(false)
                    .create()
            }
            return
        }
        // Error — map to annotation
        val message = result.message ?: "Compilation failed"
        // Empty files can't have range-based annotations — use file-level instead
        if (file.textLength == 0) {
            holder.newAnnotation(HighlightSeverity.ERROR, message)
                .fileLevel()
                .needsUpdateOnTyping(true)
                .create()
            return
        }
        val currentFilePath = file.virtualFile?.path
        // Normalize paths to forward slashes for cross-platform comparison (Python uses OS-native
        // separators on Windows, but VirtualFile.getPath() always uses forward slashes)
        val normalizedResultFile = result.file?.replace('\\', '/')
        if (result.file != null && result.line != null && normalizedResultFile == currentFilePath) {
            // Error in this file — annotate at the exact location
            val document = file.viewProvider.document ?: return
            val startLine = (result.line - 1).coerceIn(0, document.lineCount - 1)
            val startCol = ((result.column ?: 1) - 1).coerceAtLeast(0)
            val endLine = ((result.endLine ?: result.line) - 1).coerceIn(0, document.lineCount - 1)
            val endCol = ((result.endColumn ?: result.column ?: 1) - 1).coerceAtLeast(0)
            // Compute document offsets from line/column pairs
            val startOffset = (document.getLineStartOffset(startLine) + startCol)
                .coerceAtMost(document.getLineEndOffset(startLine))
            val endOffset = (document.getLineStartOffset(endLine) + endCol)
                .coerceIn(startOffset, document.getLineEndOffset(endLine))
            val range = if (startOffset == endOffset) {
                // Zero-width range — expand to cover at least one character
                val expanded = minOf(startOffset + 1, document.getLineEndOffset(startLine))
                    .coerceAtMost(document.textLength)
                if (expanded > startOffset) TextRange(startOffset, expanded)
                else if (startOffset > 0) TextRange(startOffset - 1, startOffset)
                else TextRange(0, minOf(1, document.textLength))
            } else {
                TextRange(startOffset, endOffset)
            }
            // Attach the error annotation at the computed range
            val builder = holder.newAnnotation(HighlightSeverity.ERROR, message).range(range)
            if (result.code != null) {
                builder.tooltip("$message\n\n${result.code}")
            }
            builder.needsUpdateOnTyping(true).create()
        } else if (result.file != null && result.line != null && normalizedResultFile != currentFilePath) {
            // Error in a different file (e.g., an included file) — show at file top with the path
            val locationPrefix = "${result.file}:${result.line}"
            holder.newAnnotation(HighlightSeverity.ERROR, "[$locationPrefix] $message")
                .range(TextRange(0, minOf(1, file.textLength)))
                .needsUpdateOnTyping(true)
                .create()
        } else {
            // Error without source location — attach at the top of the file
            holder.newAnnotation(HighlightSeverity.ERROR, message)
                .range(TextRange(0, minOf(1, file.textLength)))
                .needsUpdateOnTyping(true)
                .create()
        }
        // Attach version-mismatch warning alongside the error
        if (result.warning != null) {
            holder.newAnnotation(HighlightSeverity.WARNING, result.warning)
                .range(TextRange(0, minOf(1, file.textLength)))
                .needsUpdateOnTyping(false)
                .create()
        }
    }
}
