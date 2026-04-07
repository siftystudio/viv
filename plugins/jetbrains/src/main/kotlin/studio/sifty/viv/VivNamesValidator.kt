package studio.sifty.viv

import com.intellij.lang.refactoring.NamesValidator
import com.intellij.openapi.project.Project

/**
 * Validates identifier names for the Viv language.
 *
 * Viv identifiers allow letters, digits, underscores, and hyphens (e.g., `my-action`,
 * `social-exchange`). Without this validator, IntelliJ defaults to Java identifier rules
 * and rejects hyphens, causing "not a valid identifier" errors during rename.
 */
class VivNamesValidator : NamesValidator {

    override fun isIdentifier(name: String, project: Project?): Boolean {
        if (name.isEmpty()) return false
        val first = name[0]
        if (!first.isLetter() && first != '_') return false
        return name.all { it.isLetterOrDigit() || it == '_' || it == '-' }
    }

    override fun isKeyword(name: String, project: Project?): Boolean = false
}
