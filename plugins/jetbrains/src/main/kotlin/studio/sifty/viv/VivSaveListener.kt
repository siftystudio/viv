package studio.sifty.viv

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.execution.ProgramRunnerUtil
import com.intellij.execution.RunManager
import com.intellij.execution.configurations.runConfigurationType
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.Document
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileDocumentManagerListener
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.roots.ProjectFileIndex
import com.intellij.psi.PsiDocumentManager
import java.util.concurrent.atomic.AtomicInteger

/**
 * Triggers recompilation when a `.viv` file is saved.
 *
 * Defers actions to [invokeLater] so the file is flushed to disk before the compiler reads it.
 * Triggers both the Run Configuration (for formatted output in the Run tab) and the daemon
 * restart (for inline diagnostics via [VivExternalAnnotator]).
 */
class VivSaveListener : FileDocumentManagerListener {

    companion object {
        /** Incremented by [VivCompileAction] to suppress redundant recompilation when the action saves the file. */
        val manualCompileCount = AtomicInteger(0)
    }

    override fun beforeDocumentSaving(document: Document) {
        if (manualCompileCount.get() > 0) return
        if (!VivSettings.getInstance().compileOnSave) return

        val virtualFile = FileDocumentManager.getInstance().getFile(document) ?: return
        if (virtualFile.extension != "viv") return

        // Defer until after the save completes
        ApplicationManager.getApplication().invokeLater {
            for (project in ProjectManager.getInstance().openProjects) {
                if (project.isDisposed) continue
                if (!ProjectFileIndex.getInstance(project).isInContent(virtualFile)) continue

                // Trigger inline diagnostics (squiggly lines)
                val psiFile = PsiDocumentManager.getInstance(project).getPsiFile(document)
                if (psiFile != null) {
                    DaemonCodeAnalyzer.getInstance(project).restart(psiFile)
                }

                // Trigger Run Configuration for formatted output in the Run tab
                triggerCompileRun(project, virtualFile.path)
            }
        }
    }

    private fun triggerCompileRun(project: com.intellij.openapi.project.Project, filePath: String) {
        val runManager = RunManager.getInstance(project)
        val vivType = runConfigurationType<VivRunConfigurationType>()
        val compileFactory = vivType.configurationFactories
            .filterIsInstance<VivCompileCheckFactory>()
            .firstOrNull() ?: return

        // Find or create a compile-check config for this file
        val existing = runManager.getConfigurationSettingsList(vivType)
            .firstOrNull {
                it.factory == compileFactory &&
                    (it.configuration as? VivCompileCheckRunConfiguration)?.sourceFile == filePath
            }
        val settings = existing ?: run {
            val fileName = filePath.substringAfterLast('/')
            val newSettings = runManager.createConfiguration("Compile $fileName", compileFactory)
            (newSettings.configuration as? VivCompileCheckRunConfiguration)?.sourceFile = filePath
            runManager.addConfiguration(newSettings)
            newSettings
        }

        ProgramRunnerUtil.executeConfiguration(settings, DefaultRunExecutor.getRunExecutorInstance())
    }
}
