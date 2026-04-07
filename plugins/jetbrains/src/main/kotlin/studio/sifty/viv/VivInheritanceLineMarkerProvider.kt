package studio.sifty.viv

import com.intellij.codeInsight.daemon.LineMarkerInfo
import com.intellij.codeInsight.daemon.LineMarkerProvider
import com.intellij.openapi.editor.markup.GutterIconRenderer
import com.intellij.icons.AllIcons
import com.intellij.psi.PsiElement

/**
 * Shows a gutter icon + tooltip for child actions that inherit from a parent.
 * Clicking shows the parent construct's definition.
 *
 * This serves as the Code Vision inheritance indicator described in SPEC.md.
 * Since we have a flat PSI tree, we use LineMarkerProvider rather than the Code Vision API
 * (which requires resolved PSI references).
 */
class VivInheritanceLineMarkerProvider : LineMarkerProvider {

    override fun getLineMarkerInfo(element: PsiElement): LineMarkerInfo<*>? = null

    override fun collectSlowLineMarkers(
        elements: List<PsiElement>,
        result: MutableCollection<in LineMarkerInfo<*>>,
    ) {
        for (element in elements) {
            if (element !is VivFile) continue
            val project = element.project
            val vFile = element.virtualFile ?: continue

            val idx = VivProjectIndex.getInstance(project)
            val fileIndex = idx.getFileIndex(vFile) ?: continue

            for (construct in fileIndex.constructs) {
                if (construct.parent == null || construct.type != ConstructType.ACTION) continue
                val parent = idx.getConstruct(ConstructType.ACTION, construct.parent) ?: continue

                // Find the PsiElement at the construct header for the line marker
                val headerElement = element.findElementAt(construct.nameOffset) ?: element

                val chain = idx.getParentChain(construct)
                val tooltip = buildString {
                    append("Inherits from ${parent.name}")
                    if (chain.size > 1) {
                        append(" (chain: ${chain.joinToString(" → ") { it.name }})")
                    }
                    if (parent.comment != null) {
                        append("\n\n${parent.comment}")
                    }
                }

                result.add(LineMarkerInfo(
                    headerElement,
                    headerElement.textRange,
                    AllIcons.Gutter.OverridingMethod,
                    { tooltip },
                    { _, _ ->
                        // Navigate to parent on click
                        com.intellij.openapi.fileEditor.OpenFileDescriptor(
                            project, parent.file, parent.nameOffset
                        ).navigate(true)
                    },
                    GutterIconRenderer.Alignment.LEFT,
                    { "Inherits from ${parent.name}" },
                ))
            }
        }
    }
}
