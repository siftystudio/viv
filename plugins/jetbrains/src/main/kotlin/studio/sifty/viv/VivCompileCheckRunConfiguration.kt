package studio.sifty.viv

import com.intellij.execution.DefaultExecutionResult
import com.intellij.execution.ExecutionResult
import com.intellij.execution.Executor
import com.intellij.execution.configurations.*
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessOutputType
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.execution.runners.ProgramRunner
import com.intellij.execution.ui.ConsoleView
import com.intellij.execution.ui.ConsoleViewContentType
import com.intellij.openapi.options.SettingsEditor
import com.intellij.openapi.project.Project
import java.io.OutputStream

class VivCompileCheckRunConfiguration(
    project: Project,
    factory: ConfigurationFactory,
    name: String
) : RunConfigurationBase<VivCompileCheckOptions>(project, factory, name) {

    override fun getOptions(): VivCompileCheckOptions =
        super.getOptions() as VivCompileCheckOptions

    var sourceFile: String
        get() = options.sourceFile
        set(value) { options.sourceFile = value }

    override fun getConfigurationEditor(): SettingsEditor<out RunConfiguration> =
        VivCompileCheckSettingsEditor()

    override fun checkConfiguration() {
        if (sourceFile.isBlank()) {
            throw RuntimeConfigurationError("No source file specified")
        }
    }

    override fun getState(executor: Executor, environment: ExecutionEnvironment): RunProfileState {
        return VivCompileRunProfileState(sourceFile, outputPath = null, environment)
    }
}
