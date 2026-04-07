package studio.sifty.viv

import com.intellij.codeInsight.template.TemplateActionContext
import com.intellij.codeInsight.template.TemplateContextType

/**
 * Live Template context that activates when editing a Viv source file.
 */
class VivLiveTemplateContext : TemplateContextType("Viv") {

    override fun isInContext(context: TemplateActionContext): Boolean {
        val file = context.file
        return file.language is VivLanguage || file.virtualFile?.extension == "viv"
    }
}
