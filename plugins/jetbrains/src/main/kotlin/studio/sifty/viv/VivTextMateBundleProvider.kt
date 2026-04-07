package studio.sifty.viv

import com.intellij.openapi.application.PathManager
import org.jetbrains.plugins.textmate.api.TextMateBundleProvider
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

class VivTextMateBundleProvider : TextMateBundleProvider {

    override fun getBundles(): List<TextMateBundleProvider.PluginBundle> {
        val bundlePath = extractBundleToFilesystem() ?: return emptyList()
        return listOf(TextMateBundleProvider.PluginBundle("Viv", bundlePath))
    }

    /**
     * Extracts the TextMate grammar from the plugin's classloader resources to a directory on disk.
     *
     * The [TextMateBundleProvider] API requires a filesystem [Path], so resources bundled inside the
     * plugin JAR must be extracted. The grammar is written to a stable location under the IDE's
     * system directory so that it persists across IDE restarts without re-extraction.
     */
    private fun extractBundleToFilesystem(): Path? {
        val targetDir = Path.of(PathManager.getSystemPath(), "viv-textmate")

        return try {
            Files.createDirectories(targetDir)
            extractResource("/textmate/viv.tmLanguage.json", targetDir.resolve("viv.tmLanguage.json"))
            extractResource("/textmate/package.json", targetDir.resolve("package.json"))
            extractResource("/textmate/language-configuration.json", targetDir.resolve("language-configuration.json"))
            targetDir
        } catch (_: IOException) {
            if (Files.exists(targetDir.resolve("viv.tmLanguage.json"))) targetDir else null
        }
    }

    private fun extractResource(resourcePath: String, target: Path) {
        val resource = javaClass.getResourceAsStream(resourcePath) ?: return
        resource.use { input -> Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING) }
    }
}
