package studio.sifty.viv

import com.intellij.execution.RunManager
import com.intellij.execution.RunManagerListener
import com.intellij.execution.configurations.ConfigurationTypeUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

/**
 * Registers a listener that creates a "Save Content Bundle" run configuration after the
 * [RunManager] has fully loaded its state. This ensures the configuration appears in the toolbar
 * dropdown without hijacking the selection away from "Current File".
 */
class VivStartupActivity : ProjectActivity {

    override suspend fun execute(project: Project) {
        // Try immediately — stateLoaded may have already fired before we subscribe
        addSaveBundleConfigIfMissing(RunManager.getInstance(project), project)
        // Also subscribe for future reloads
        project.messageBus.connect().subscribe(RunManagerListener.TOPIC, object : RunManagerListener {
            override fun stateLoaded(runManager: RunManager, isFirstLoadState: Boolean) {
                if (!isFirstLoadState) return
                addSaveBundleConfigIfMissing(runManager, project)
            }
        })
    }

    private fun addSaveBundleConfigIfMissing(runManager: RunManager, project: Project) {
        val vivType = ConfigurationTypeUtil.findConfigurationType(VivRunConfigurationType::class.java)
        val saveBundleFactory = vivType.configurationFactories
            .filterIsInstance<VivSaveBundleFactory>()
            .firstOrNull() ?: return

        val existing = runManager.getConfigurationSettingsList(vivType)
            .any { it.factory == saveBundleFactory }
        if (existing) return

        val projectSettings = VivProjectSettings.getInstance(project)
        val settings = runManager.createConfiguration("Save Content Bundle", saveBundleFactory)
        val runConfig = settings.configuration as? VivSaveBundleRunConfiguration ?: return
        runConfig.entryFile = projectSettings.entryFile
        runConfig.outputPath = projectSettings.outputPath

        // addConfiguration does not change selection when called after stateLoaded
        runManager.addConfiguration(settings)
    }
}
