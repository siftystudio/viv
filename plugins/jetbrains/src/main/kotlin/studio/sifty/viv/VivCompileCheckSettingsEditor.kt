package studio.sifty.viv

import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.options.SettingsEditor
import com.intellij.openapi.ui.TextFieldWithBrowseButton
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent

class VivCompileCheckSettingsEditor : SettingsEditor<VivCompileCheckRunConfiguration>() {
    private val sourceFileField = TextFieldWithBrowseButton().apply {
        addBrowseFolderListener(
            "Select Viv Source File", null, null,
            FileChooserDescriptorFactory.createSingleFileDescriptor("viv")
        )
    }

    override fun createEditor(): JComponent =
        FormBuilder.createFormBuilder()
            .addLabeledComponent(JBLabel("Source file:"), sourceFileField)
            .addComponentFillVertically(javax.swing.JPanel(), 0)
            .panel

    override fun resetEditorFrom(config: VivCompileCheckRunConfiguration) {
        sourceFileField.text = config.sourceFile
    }

    override fun applyEditorTo(config: VivCompileCheckRunConfiguration) {
        config.sourceFile = sourceFileField.text
    }
}
