package studio.sifty.viv

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.execution.ProgramRunnerUtil
import com.intellij.execution.RunManager
import com.intellij.execution.configurations.runConfigurationType
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.fileEditor.FileDocumentManager

/**
 * Action: Compile Viv File.
 *
 * Saves the current file and triggers compilation via the Run flow, then restarts the
 * daemon for inline diagnostics.
 */
class VivCompileAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE)
        e.presentation.isEnabledAndVisible = file != null && file.extension == "viv"
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.getData(CommonDataKeys.EDITOR) ?: return
        val document = editor.document
        val virtualFile = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return

        // Save and suppress the save listener (we'll trigger Run ourselves)
        VivSaveListener.manualCompileCount.incrementAndGet()
        try {
            FileDocumentManager.getInstance().saveDocument(document)
        } finally {
            VivSaveListener.manualCompileCount.decrementAndGet()
        }

        // Trigger Run Configuration
        val filePath = virtualFile.path
        val runManager = RunManager.getInstance(project)
        val vivType = runConfigurationType<VivRunConfigurationType>()
        val compileFactory = vivType.configurationFactories
            .filterIsInstance<VivCompileCheckFactory>()
            .firstOrNull() ?: return

        val settings = runManager.getConfigurationSettingsList(vivType)
            .firstOrNull {
                it.factory == compileFactory &&
                    (it.configuration as? VivCompileCheckRunConfiguration)?.sourceFile == filePath
            }
            ?: runManager.createConfiguration("Compile ${virtualFile.name}", compileFactory).also {
                (it.configuration as? VivCompileCheckRunConfiguration)?.sourceFile = filePath
                runManager.addConfiguration(it)
            }

        ProgramRunnerUtil.executeConfiguration(settings, DefaultRunExecutor.getRunExecutorInstance())

        // Restart the annotator for squiggly lines (will use cached result from the Run)
        val psiFile = com.intellij.psi.PsiDocumentManager.getInstance(project).getPsiFile(document) ?: return
        DaemonCodeAnalyzer.getInstance(project).restart(psiFile)
    }
}
