package studio.sifty.viv

import com.intellij.icons.AllIcons
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.openapi.wm.WindowManager
import com.intellij.ui.AnimatedIcon
import com.intellij.util.Consumer
import java.awt.event.MouseEvent
import javax.swing.Icon

/**
 * Status bar widget showing the Viv compilation state as an icon.
 *
 * - Compiling: animated spinner
 * - Success: green checkmark
 * - Error: red error icon
 */
class VivStatusBarWidgetFactory : StatusBarWidgetFactory {

    override fun getId(): String = WIDGET_ID

    override fun getDisplayName(): String = "Viv Compilation Status"

    override fun createWidget(project: Project): StatusBarWidget = VivStatusBarWidget()

    companion object {
        const val WIDGET_ID = "studio.sifty.viv.compilationStatus"

        fun updateStatus(project: Project, result: CompileResult) {
            ApplicationManager.getApplication().invokeLater {
                if (project.isDisposed) return@invokeLater
                val statusBar = WindowManager.getInstance().getStatusBar(project) ?: return@invokeLater
                val widget = statusBar.getWidget(WIDGET_ID) as? VivStatusBarWidget ?: return@invokeLater
                widget.updateResult(result)
                statusBar.updateWidget(WIDGET_ID)
            }
        }

        fun showCompiling(project: Project) {
            ApplicationManager.getApplication().invokeLater {
                if (project.isDisposed) return@invokeLater
                val statusBar = WindowManager.getInstance().getStatusBar(project) ?: return@invokeLater
                val widget = statusBar.getWidget(WIDGET_ID) as? VivStatusBarWidget ?: return@invokeLater
                widget.showCompiling()
                statusBar.updateWidget(WIDGET_ID)
            }
        }
    }
}

private class VivStatusBarWidget : StatusBarWidget, StatusBarWidget.IconPresentation {

    private var statusBar: StatusBar? = null
    private var icon: Icon? = null
    private var tooltip: String = ""

    override fun ID(): String = VivStatusBarWidgetFactory.WIDGET_ID

    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
    }

    override fun getPresentation(): StatusBarWidget.WidgetPresentation = this

    override fun getIcon(): Icon? = icon

    override fun getTooltipText(): String = tooltip

    override fun getClickConsumer(): Consumer<MouseEvent>? = Consumer {
        val project = statusBar?.project ?: return@Consumer
        val toolWindow = com.intellij.openapi.wm.ToolWindowManager.getInstance(project)
            .getToolWindow("Problems View")
        toolWindow?.show()
    }

    fun showCompiling() {
        icon = AnimatedIcon.Default()
        tooltip = "Viv compiler is running..."
    }

    fun updateResult(result: CompileResult) {
        if (result.status == "success") {
            icon = AllIcons.General.InspectionsOK
            tooltip = if (result.outputPath != null) "Content bundle saved: ${result.outputPath}"
                      else "No compile errors"
        } else {
            icon = AllIcons.General.Error
            tooltip = result.message ?: "Compilation failed"
        }
    }

    override fun dispose() {
        statusBar = null
    }
}
