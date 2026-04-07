package studio.sifty.viv

import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.ui.TextFieldWithBrowseButton
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JSpinner
import javax.swing.SpinnerNumberModel

/**
 * Settings UI for the Viv plugin, displayed at Settings > Tools > Viv.
 */
class VivSettingsConfigurable : Configurable {

    private var panel: JPanel? = null
    private var pythonPathField: TextFieldWithBrowseButton? = null
    private var compileOnSaveCheckbox: JBCheckBox? = null
    private var compileTimeoutSpinner: JSpinner? = null

    override fun getDisplayName(): String = "Viv"

    override fun createComponent(): JComponent {
        val pythonPath = TextFieldWithBrowseButton(JBTextField()).apply {
            addBrowseFolderListener(
                "Select Python Interpreter",
                "Path to a Python interpreter with viv-compiler installed",
                null,
                FileChooserDescriptorFactory.createSingleFileDescriptor()
            )
        }
        val compileOnSave = JBCheckBox("Automatically recompile .viv files on save")
        val compileTimeout = JSpinner(SpinnerNumberModel(120, 1, 600, 1))

        pythonPathField = pythonPath
        compileOnSaveCheckbox = compileOnSave
        compileTimeoutSpinner = compileTimeout

        val form = FormBuilder.createFormBuilder()
            .addLabeledComponent(JBLabel("Python interpreter:"), pythonPath)
            .addComponent(compileOnSave)
            .addLabeledComponent(JBLabel("Compiler timeout (seconds):"), compileTimeout)
            .addComponentFillVertically(JPanel(), 0)
            .panel

        panel = form
        reset()
        return form
    }

    override fun isModified(): Boolean {
        if (panel == null) return false
        val settings = VivSettings.getInstance()
        return pythonPathField?.text != settings.pythonPath
                || compileOnSaveCheckbox?.isSelected != settings.compileOnSave
                || (compileTimeoutSpinner?.value as? Int) != settings.compileTimeout
    }

    override fun apply() {
        if (panel == null) return
        val settings = VivSettings.getInstance()
        settings.pythonPath = pythonPathField?.text ?: ""
        settings.compileOnSave = compileOnSaveCheckbox?.isSelected ?: true
        settings.compileTimeout = (compileTimeoutSpinner?.value as? Int) ?: 120
    }

    override fun reset() {
        val settings = VivSettings.getInstance()
        pythonPathField?.text = settings.pythonPath
        compileOnSaveCheckbox?.isSelected = settings.compileOnSave
        compileTimeoutSpinner?.value = settings.compileTimeout
    }

    override fun disposeUIResources() {
        panel = null
        pythonPathField = null
        compileOnSaveCheckbox = null
        compileTimeoutSpinner = null
    }
}
