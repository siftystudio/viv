package studio.sifty.viv

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.ui.content.ContentFactory
import java.awt.BorderLayout
import javax.swing.JPanel
import javax.swing.JScrollPane
import javax.swing.JTextArea

/**
 * Tool window that displays the construct summary after successful Viv compilation.
 *
 * Equivalent to the VS Code Output channel, showing counts and names of actions, selectors,
 * plans, queries, sifting patterns, and tropes in the compiled content bundle.
 */
class VivToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val textArea = JTextArea().apply {
            isEditable = false
            font = java.awt.Font("JetBrains Mono", java.awt.Font.PLAIN, 13)
            text = "Compile a .viv file to see the construct summary."
        }
        val panel = JPanel(BorderLayout()).apply {
            add(JScrollPane(textArea), BorderLayout.CENTER)
        }
        val content = ContentFactory.getInstance().createContent(panel, "", false)
        content.putUserData(TEXT_AREA_KEY, textArea)
        toolWindow.contentManager.addContent(content)
    }

    companion object {
        const val TOOL_WINDOW_ID = "studio.sifty.viv.toolWindow"
        private val TEXT_AREA_KEY = com.intellij.openapi.util.Key.create<JTextArea>("VivToolWindowTextArea")

        private val CONSTRUCT_SECTIONS = listOf(
            "actions" to "Actions",
            "actionSelectors" to "Action selectors",
            "plans" to "Plans",
            "planSelectors" to "Plan selectors",
            "queries" to "Queries",
            "siftingPatterns" to "Sifting patterns",
            "tropes" to "Tropes",
        )

        /**
         * Updates the construct summary in the Viv tool window.
         */
        fun updateConstructSummary(project: Project, constructs: Map<String, List<String>>) {
            updateText(project, formatConstructSummary(constructs))
        }

        fun updateText(project: Project, text: String) {
            ApplicationManager.getApplication().invokeLater {
                if (project.isDisposed) return@invokeLater
                val toolWindow = ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID) ?: return@invokeLater
                val content = toolWindow.contentManager.getContent(0) ?: return@invokeLater
                val textArea = content.getUserData(TEXT_AREA_KEY) ?: return@invokeLater
                textArea.text = text
            }
        }

        private fun formatConstructSummary(constructs: Map<String, List<String>>): String {
            val lines = mutableListOf<String>()
            for ((key, label) in CONSTRUCT_SECTIONS) {
                val names = constructs[key] ?: emptyList()
                if (names.isEmpty()) {
                    lines.add("$label (0)")
                } else {
                    lines.add("$label (${names.size}):")
                    for (name in names) {
                        lines.add("  - $name")
                    }
                }
                lines.add("")
            }
            return lines.joinToString("\n")
        }
    }
}
