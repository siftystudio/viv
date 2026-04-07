package studio.sifty.viv

import com.intellij.lang.annotation.AnnotationHolder
import com.intellij.lang.annotation.Annotator
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement

/**
 * Surfaces index-based diagnostics without running the compiler:
 * - Undefined construct references (queue action foo, but no action foo exists)
 * - Duplicate construct definitions (two action greet: in the project)
 */
class VivIndexDiagnosticAnnotator : Annotator {

    data class Diagnostic(val offset: Int, val length: Int, val message: String, val severity: HighlightSeverity)

    private val CONSTRUCT_REF_PATTERNS = listOf(
        Regex("queue\\s+(action-selector|plan-selector|action|plan)\\s+([A-Za-z_][A-Za-z0-9_-]*)"),
        Regex("^\\s*(?:reserved\\s+|template\\s+)*action\\s+[A-Za-z_][A-Za-z0-9_-]*\\s+from\\s+([A-Za-z_][A-Za-z0-9_-]*)", RegexOption.MULTILINE),
        Regex("search\\s+query\\s+([A-Za-z_][A-Za-z0-9_-]*)"),
        Regex("sift\\s+pattern\\s+([A-Za-z_][A-Za-z0-9_-]*)"),
        Regex("fit\\s+trope\\s+([A-Za-z_][A-Za-z0-9_-]*)"),
        Regex("fits\\s+trope\\s+([A-Za-z_][A-Za-z0-9_-]*)"),
    )

    override fun annotate(element: PsiElement, holder: AnnotationHolder) {
        if (element !is VivFile) return
        val vFile = element.virtualFile ?: return
        val text = element.text

        val idx = VivProjectIndex.getInstance(element.project)

        val docLen = element.textLength

        // Check for undefined construct references
        for (pattern in CONSTRUCT_REF_PATTERNS) {
            for (match in pattern.findAll(text)) {
                val type: String
                val name: String
                val nameGroup: MatchGroup

                if (match.groups.size >= 3 && match.groups[2] != null) {
                    type = match.groupValues[1]
                    name = match.groupValues[2]
                    nameGroup = match.groups[2]!!
                } else {
                    type = when {
                        match.value.contains(" from ") -> "action"
                        match.value.startsWith("search") -> "query"
                        match.value.startsWith("sift") -> "pattern"
                        match.value.contains("trope") -> "trope"
                        else -> continue
                    }
                    name = match.groupValues[1]
                    nameGroup = match.groups[1]!!
                }

                val constructType = ConstructType.fromKeyword(type) ?: continue
                if (idx.getConstruct(constructType, name) == null) {
                    val start = nameGroup.range.first.coerceIn(0, docLen)
                    val end = (nameGroup.range.first + name.length).coerceIn(start, docLen)
                    if (start >= end) continue
                    holder.newAnnotation(HighlightSeverity.WARNING, "Undefined $type '$name'")
                        .range(TextRange(start, end))
                        .create()
                }
            }
        }

        // Check for duplicate definitions
        val duplicates = idx.getDuplicateConstructs()
        val fileIndex = idx.getFileIndex(vFile) ?: return
        for (construct in fileIndex.constructs) {
            val dupeList = duplicates[construct.key]
            if (dupeList != null && dupeList.size > 1) {
                val others = dupeList.filter { it.file != vFile || it.nameOffset != construct.nameOffset }
                if (others.isEmpty()) continue
                val otherFiles = others.filter { it.file != vFile }.map { it.file.name }.distinct()
                val hasSameFileDupes = others.any { it.file == vFile }
                val message = when {
                    hasSameFileDupes && otherFiles.isNotEmpty() ->
                        "Duplicate ${construct.type.keyword} '${construct.name}' in this file (also in ${otherFiles.joinToString(", ")})"
                    hasSameFileDupes ->
                        "Duplicate ${construct.type.keyword} '${construct.name}' in this file"
                    else ->
                        "Duplicate ${construct.type.keyword} '${construct.name}' (also in ${otherFiles.joinToString(", ")})"
                }
                val start = construct.nameOffset.coerceIn(0, docLen)
                val end = (construct.nameOffset + construct.name.length).coerceIn(start, docLen)
                if (start >= end) continue
                holder.newAnnotation(HighlightSeverity.WARNING, message)
                    .range(TextRange(start, end))
                    .create()
            }
        }
    }
}
