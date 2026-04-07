package studio.sifty.viv

import com.intellij.execution.configurations.ConfigurationFactory
import com.intellij.execution.configurations.ConfigurationType
import com.intellij.execution.configurations.RunConfiguration
import com.intellij.openapi.components.BaseState
import com.intellij.openapi.project.Project

class VivSaveBundleFactory(type: ConfigurationType) : ConfigurationFactory(type) {

    override fun getId(): String = "studio.sifty.viv.saveBundle"

    override fun getName(): String = "Save Content Bundle"

    override fun createTemplateConfiguration(project: Project): RunConfiguration =
        VivSaveBundleRunConfiguration(project, this, "Save Content Bundle")

    override fun getOptionsClass(): Class<out BaseState> =
        VivSaveBundleOptions::class.java
}

class VivSaveBundleOptions : com.intellij.execution.configurations.RunConfigurationOptions() {
    private val myEntryFile = string("").provideDelegate(this, "entryFile")
    private val myOutputPath = string("").provideDelegate(this, "outputPath")

    var entryFile: String
        get() = myEntryFile.getValue(this) ?: ""
        set(value) { myEntryFile.setValue(this, value) }

    var outputPath: String
        get() = myOutputPath.getValue(this) ?: ""
        set(value) { myOutputPath.setValue(this, value) }
}
