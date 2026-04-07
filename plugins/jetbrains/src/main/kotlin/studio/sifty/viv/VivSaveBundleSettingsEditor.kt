package studio.sifty.viv

import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.options.SettingsEditor
import com.intellij.openapi.ui.TextFieldWithBrowseButton
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent

class VivSaveBundleSettingsEditor : SettingsEditor<VivSaveBundleRunConfiguration>() {
    private val entryFileField = TextFieldWithBrowseButton().apply {
        addBrowseFolderListener(
            "Select Viv Entry File", null, null,
            FileChooserDescriptorFactory.createSingleFileDescriptor("viv")
        )
    }
    private val outputPathField = TextFieldWithBrowseButton().apply {
        addBrowseFolderListener(
            "Select Output Path", null, null,
            FileChooserDescriptorFactory.createSingleFileDescriptor("json")
        )
    }

    override fun createEditor(): JComponent =
        FormBuilder.createFormBuilder()
            .addLabeledComponent(JBLabel("Entry file:"), entryFileField)
            .addLabeledComponent(JBLabel("Output path:"), outputPathField)
            .addComponentFillVertically(javax.swing.JPanel(), 0)
            .panel

    override fun resetEditorFrom(config: VivSaveBundleRunConfiguration) {
        entryFileField.text = config.entryFile
        outputPathField.text = config.outputPath
    }

    override fun applyEditorTo(config: VivSaveBundleRunConfiguration) {
        config.entryFile = entryFileField.text
        config.outputPath = outputPathField.text
    }
}
