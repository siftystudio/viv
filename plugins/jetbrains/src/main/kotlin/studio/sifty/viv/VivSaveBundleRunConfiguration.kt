package studio.sifty.viv

import com.intellij.execution.Executor
import com.intellij.execution.configurations.*
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.openapi.options.SettingsEditor
import com.intellij.openapi.project.Project

class VivSaveBundleRunConfiguration(
    project: Project,
    factory: ConfigurationFactory,
    name: String
) : RunConfigurationBase<VivSaveBundleOptions>(project, factory, name) {

    override fun getOptions(): VivSaveBundleOptions =
        super.getOptions() as VivSaveBundleOptions

    var entryFile: String
        get() = options.entryFile
        set(value) { options.entryFile = value }

    var outputPath: String
        get() = options.outputPath
        set(value) { options.outputPath = value }

    override fun getConfigurationEditor(): SettingsEditor<out RunConfiguration> =
        VivSaveBundleSettingsEditor()

    override fun checkConfiguration() {
        if (entryFile.isBlank()) {
            throw RuntimeConfigurationError("No entry file specified")
        }
        if (outputPath.isBlank()) {
            throw RuntimeConfigurationError("No output path specified")
        }
    }

    override fun getState(executor: Executor, environment: ExecutionEnvironment): RunProfileState {
        return VivCompileRunProfileState(entryFile, outputPath, environment)
    }
}
