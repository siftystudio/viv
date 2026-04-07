package studio.sifty.viv

/**
 * Formats a [CompileResult] as human-readable text for display in the Viv tool window
 * and the Run console. Shared by [VivExternalAnnotator] and [VivCompileRunProfileState].
 */
object VivCompileResultFormatter {

    private val CONSTRUCT_SECTIONS = listOf(
        "actions" to "Actions",
        "actionSelectors" to "Action selectors",
        "plans" to "Plans",
        "planSelectors" to "Plan selectors",
        "queries" to "Queries",
        "siftingPatterns" to "Sifting patterns",
        "tropes" to "Tropes",
    )

    fun format(result: CompileResult, sourcePath: String? = null, outputPath: String? = null): String {
        val sb = StringBuilder()

        if (result.status == "success") {
            if (outputPath != null) {
                sb.appendLine("* Saved project-wide content bundle:")
                sb.appendLine("  - Entry file: ${result.entryFile ?: sourcePath}")
                sb.appendLine("  - Content bundle: ${result.outputPath ?: outputPath}")
                sb.appendLine()
            }
            if (result.constructs != null) {
                formatConstructSummary(result.constructs, sb)
            }
            if (result.warning != null) {
                sb.appendLine("Warning: ${result.warning}")
            }
        } else {
            val message = result.message ?: "Compilation failed"
            val file = result.file ?: sourcePath ?: ""
            if (result.line != null) {
                sb.append("$file:${result.line}")
                if (result.column != null) sb.append(":${result.column}")
                sb.appendLine(": error: $message")
                if (result.code != null) {
                    sb.appendLine()
                    sb.appendLine(dedent(result.code, result.column ?: 1, "    "))
                }
            } else if (file.isNotEmpty()) {
                sb.appendLine("$file: error: $message")
            } else {
                sb.appendLine("error: $message")
            }
            if (result.warning != null) {
                sb.appendLine()
                sb.appendLine("Warning: ${result.warning}")
            }
        }

        return sb.toString().trimEnd()
    }

    private fun formatConstructSummary(constructs: Map<String, List<String>>, sb: StringBuilder) {
        for ((key, label) in CONSTRUCT_SECTIONS) {
            val names = constructs[key] ?: emptyList()
            if (names.isEmpty()) {
                sb.appendLine("* $label (0)")
            } else {
                sb.appendLine("* $label (${names.size}):")
                for (name in names) {
                    sb.appendLine("  - $name")
                }
            }
            sb.appendLine()
        }
    }

    /**
     * Restores and normalizes indentation for a code snippet from the compiler.
     */
    private fun dedent(code: String, column: Int, prefix: String): String {
        val restored = " ".repeat((column - 1).coerceAtLeast(0)) + code
        val lines = restored.lines()
        val minIndent = lines
            .filter { it.isNotBlank() }
            .minOfOrNull { line -> line.indexOfFirst { !it.isWhitespace() }.let { if (it < 0) line.length else it } }
            ?: 0
        return lines.joinToString("\n") { line ->
            if (line.isBlank()) "" else prefix + line.drop(minIndent)
        }.trim()
    }
}
