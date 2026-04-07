package studio.sifty.viv

import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

/** File type for `.viv` source files. Registered as a singleton via [INSTANCE]. */
class VivFileType private constructor() : LanguageFileType(VivLanguage.INSTANCE) {

    override fun getName(): String = "Viv"

    override fun getDescription(): String = "Viv source file"

    override fun getDefaultExtension(): String = "viv"

    override fun getIcon(): Icon = ICON

    companion object {
        @JvmField
        val INSTANCE = VivFileType()

        private val ICON = IconLoader.getIcon("/icons/viv.svg", VivFileType::class.java)
    }
}
