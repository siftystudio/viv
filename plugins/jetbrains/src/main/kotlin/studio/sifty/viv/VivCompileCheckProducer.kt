package studio.sifty.viv

import com.intellij.execution.actions.ConfigurationContext
import com.intellij.execution.actions.LazyRunConfigurationProducer
import com.intellij.execution.configurations.ConfigurationFactory
import com.intellij.execution.configurations.RunConfiguration
import com.intellij.execution.configurations.runConfigurationType
import com.intellij.openapi.util.Ref
import com.intellij.psi.PsiElement

/**
 * Automatically creates a "Compile Check" run configuration when the user opens a `.viv` file
 * and clicks the play button or right-clicks in the editor.
 *
 * Uses [RunConfiguration] as the generic type (not [VivCompileCheckRunConfiguration]) to avoid
 * a ClassCastException from the compiler-generated bridge method when IntelliJ passes other
 * configuration types belonging to the same [VivRunConfigurationType].
 */
class VivCompileCheckProducer : LazyRunConfigurationProducer<RunConfiguration>() {

    override fun getConfigurationFactory(): ConfigurationFactory =
        runConfigurationType<VivRunConfigurationType>().configurationFactories
            .filterIsInstance<VivCompileCheckFactory>().first()

    override fun setupConfigurationFromContext(
        configuration: RunConfiguration,
        context: ConfigurationContext,
        sourceElement: Ref<PsiElement>
    ): Boolean {
        if (configuration !is VivCompileCheckRunConfiguration) return false
        val file = context.location?.virtualFile ?: return false
        if (file.extension != "viv") return false

        configuration.sourceFile = file.path
        configuration.name = "Compile ${file.name}"
        return true
    }

    override fun isConfigurationFromContext(
        configuration: RunConfiguration,
        context: ConfigurationContext
    ): Boolean {
        if (configuration !is VivCompileCheckRunConfiguration) return false
        val file = context.location?.virtualFile ?: return false
        return file.path == configuration.sourceFile
    }
}
