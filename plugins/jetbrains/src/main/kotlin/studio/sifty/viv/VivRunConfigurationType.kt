package studio.sifty.viv

import com.intellij.execution.configurations.ConfigurationTypeBase
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.util.NotNullLazyValue

class VivRunConfigurationType : ConfigurationTypeBase(
    ID,
    "Viv",
    "Run the Viv compiler",
    NotNullLazyValue.createValue { IconLoader.getIcon("/icons/viv.svg", VivRunConfigurationType::class.java) }
) {
    init {
        addFactory(VivCompileCheckFactory(this))
        addFactory(VivSaveBundleFactory(this))
    }

    // Prevent IntelliJ from auto-selecting Viv configs in the toolbar dropdown.
    // With isManaged=false, selectedConfiguration stays null, which shows "Current File".
    override fun isManaged(): Boolean = false

    companion object {
        const val ID = "studio.sifty.viv.runConfiguration"
    }
}
