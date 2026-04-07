package studio.sifty.viv

import com.intellij.execution.configurations.ConfigurationFactory
import com.intellij.execution.configurations.ConfigurationType
import com.intellij.execution.configurations.RunConfiguration
import com.intellij.openapi.components.BaseState
import com.intellij.openapi.project.Project

class VivCompileCheckFactory(type: ConfigurationType) : ConfigurationFactory(type) {

    override fun getId(): String = "studio.sifty.viv.compileCheck"

    override fun getName(): String = "Compile Check"

    override fun createTemplateConfiguration(project: Project): RunConfiguration =
        VivCompileCheckRunConfiguration(project, this, "Compile Check")

    override fun getOptionsClass(): Class<out BaseState> =
        VivCompileCheckOptions::class.java
}

class VivCompileCheckOptions : com.intellij.execution.configurations.RunConfigurationOptions() {
    private val mySourceFile = string("").provideDelegate(this, "sourceFile")

    var sourceFile: String
        get() = mySourceFile.getValue(this) ?: ""
        set(value) { mySourceFile.setValue(this, value) }
}
