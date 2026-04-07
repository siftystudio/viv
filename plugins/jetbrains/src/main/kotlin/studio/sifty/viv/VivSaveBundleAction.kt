package studio.sifty.viv

import com.intellij.execution.ProgramRunnerUtil
import com.intellij.execution.RunManager
import com.intellij.execution.configurations.runConfigurationType
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor

/**
 * Action: Save Content Bundle.
 *
 * Prompts the user for an entry file and output path (persisted to project settings), then
 * executes the Save Content Bundle run configuration.
 */
class VivSaveBundleAction : AnAction() {

    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun update(e: AnActionEvent) {
        val project = e.project
        if (project == null) {
            e.presentation.isEnabledAndVisible = false
            return
        }
        val settings = VivProjectSettings.getInstance(project)
        e.presentation.isEnabledAndVisible = settings.entryFile.isNotBlank() || settings.outputPath.isNotBlank()
                || com.intellij.openapi.actionSystem.CommonDataKeys.VIRTUAL_FILE.getData(e.dataContext)?.extension == "viv"
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val projectSettings = VivProjectSettings.getInstance(project)

        // Resolve entry file
        var entryFile = projectSettings.entryFile
        if (entryFile.isBlank()) {
            val descriptor = FileChooserDescriptorFactory.createSingleFileDescriptor("viv")
                .withTitle("Select the Viv Entry File")
                .withDescription(
                    "Select the project-level Viv entry file. This file and any files it includes " +
                    "will be compiled to produce the content bundle."
                )
            val chosen = FileChooserFactory.getInstance()
                .createFileChooser(descriptor, project, null)
                .choose(project)
            if (chosen.isEmpty()) return
            entryFile = chosen[0].path
            projectSettings.entryFile = entryFile
        }

        // Resolve output path
        var outputPath = projectSettings.outputPath
        if (outputPath.isBlank()) {
            val descriptor = FileSaverDescriptor(
                "Save Content Bundle",
                "Choose where to save the compiled content bundle (JSON).",
                "json"
            )
            val wrapper = FileChooserFactory.getInstance()
                .createSaveFileDialog(descriptor, project)
                .save(null as com.intellij.openapi.vfs.VirtualFile?, "content-bundle.json")
                ?: return
            outputPath = wrapper.file.absolutePath
            projectSettings.outputPath = outputPath
        }

        // Find or update the Save Content Bundle run configuration and execute it
        val runManager = RunManager.getInstance(project)
        val vivType = runConfigurationType<VivRunConfigurationType>()
        val saveBundleFactory = vivType.configurationFactories
            .filterIsInstance<VivSaveBundleFactory>()
            .firstOrNull() ?: return

        val settings = runManager.getConfigurationSettingsList(vivType)
            .firstOrNull { it.factory == saveBundleFactory }
            ?: runManager.createConfiguration("Save Content Bundle", saveBundleFactory).also {
                runManager.addConfiguration(it)
            }

        val runConfig = settings.configuration as? VivSaveBundleRunConfiguration ?: return
        runConfig.entryFile = entryFile
        runConfig.outputPath = outputPath

        ProgramRunnerUtil.executeConfiguration(settings, DefaultRunExecutor.getRunExecutorInstance())
    }
}
