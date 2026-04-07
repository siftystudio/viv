package studio.sifty.viv

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.CapturingProcessHandler
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

/**
 * Application-level service that invokes the Viv compiler via the bridge script.
 *
 * Provides [compile] for compile-checking a source file and [compileBundle] for writing a content
 * bundle to disk. Both methods run the bridge script as a subprocess and parse its JSON output.
 */
@Service(Service.Level.APP)
class VivCompilerService {

    private val gson = Gson()
    @Volatile private var bridgeExtracted = false

    /** Cached result from the last compile-check, keyed by source path. */
    @Volatile private var lastResult: Pair<String, CompileResult>? = null

    /**
     * Compile-checks a single Viv source file. Caches the result so that the
     * [VivExternalAnnotator] can retrieve it without a redundant compiler invocation.
     *
     * @param sourcePath Absolute path to the `.viv` file.
     * @return The parsed compilation result.
     */
    fun compile(sourcePath: String): CompileResult {
        val result = invokeBridge(sourcePath, outputPath = null)
        lastResult = Pair(sourcePath, result)
        return result
    }

    /**
     * Returns the cached result from the last [compile] call if it matches the given path,
     * and clears the cache. Returns null if no cached result is available or the path doesn't match.
     */
    fun consumeCachedResult(sourcePath: String): CompileResult? {
        val cached = lastResult ?: return null
        if (cached.first != sourcePath) return null
        lastResult = null
        return cached.second
    }

    /**
     * Compiles a Viv entry file and writes the content bundle to disk.
     *
     * @param entryPath Absolute path to the entry `.viv` file.
     * @param outputPath Absolute path for the output JSON bundle.
     * @return The parsed compilation result.
     */
    fun compileBundle(entryPath: String, outputPath: String): CompileResult {
        return invokeBridge(entryPath, outputPath)
    }

    private fun invokeBridge(sourcePath: String, outputPath: String?): CompileResult {
        val pythonPath = resolvePythonPath()
        val bridgePath = resolveBridgePath() ?: return CompileResult(
            status = "error",
            message = "Could not locate the Viv compiler bridge script."
        )

        val args = mutableListOf(bridgePath, sourcePath)
        if (outputPath != null) {
            args.addAll(listOf("--output", outputPath))
        }

        val compilerVersion = resolveExpectedCompilerVersion()
        if (compilerVersion != null) {
            args.addAll(listOf("--expect-version", compilerVersion))
        }

        val commandLine = GeneralCommandLine(pythonPath)
            .withParameters(args)
            .withCharset(StandardCharsets.UTF_8)

        val timeoutMs = VivSettings.getInstance().compileTimeout.coerceIn(1, 600) * 1000

        return try {
            val handler = CapturingProcessHandler(commandLine)
            val output = handler.runProcess(timeoutMs)

            if (output.isTimeout) {
                return CompileResult(
                    status = "error",
                    message = "Compilation timed out after ${VivSettings.getInstance().compileTimeout} seconds."
                )
            }

            val stdout = output.stdout.trim()
            if (stdout.isEmpty()) {
                val stderr = output.stderr.trim()
                return CompileResult(
                    status = "error",
                    message = if (stderr.isNotEmpty()) "Compiler bridge failed: $stderr"
                              else "Compiler bridge produced no output."
                )
            }

            try {
                gson.fromJson(stdout, CompileResult::class.java)
            } catch (e: JsonSyntaxException) {
                CompileResult(
                    status = "error",
                    message = "Failed to parse compiler output: ${e.message}"
                )
            }
        } catch (e: com.intellij.execution.process.ProcessNotCreatedException) {
            CompileResult(
                status = "error",
                message = "Python interpreter not found: $pythonPath"
            )
        } catch (e: Exception) {
            LOG.warn("Compiler invocation failed", e)
            CompileResult(
                status = "error",
                message = "Compiler invocation failed: ${e.message}"
            )
        }
    }

    /**
     * Resolves the Python interpreter path.
     *
     * Priority: user setting > `python3` on PATH.
     */
    fun resolvePythonPath(): String {
        val configured = VivSettings.getInstance().pythonPath
        if (configured.isNotBlank()) return configured
        return "python3"
    }

    /**
     * Extracts the bridge script from plugin resources to a stable filesystem location and
     * returns the path. Returns null if extraction fails.
     */
    private fun resolveBridgePath(): String? {
        val targetDir = Path.of(PathManager.getSystemPath(), "viv-bridge")
        val targetFile = targetDir.resolve("compiler_bridge.py")

        // Fast path: skip extraction if already extracted during this IDE session
        if (bridgeExtracted && Files.exists(targetFile)) {
            return targetFile.toString()
        }

        val resource = javaClass.getResourceAsStream("/bridge/compiler_bridge.py") ?: return null
        return try {
            Files.createDirectories(targetDir)
            resource.use { input -> Files.copy(input, targetFile, StandardCopyOption.REPLACE_EXISTING) }
            bridgeExtracted = true
            targetFile.toString()
        } catch (_: IOException) {
            if (Files.exists(targetFile)) targetFile.toString() else null
        }
    }

    private fun resolveExpectedCompilerVersion(): String? {
        val resource = javaClass.getResourceAsStream("/bridge/compiler_version.txt") ?: return null
        return try {
            resource.bufferedReader().use { it.readLine()?.trim() }
        } catch (_: IOException) {
            null
        }
    }

    companion object {
        private val LOG = Logger.getInstance(VivCompilerService::class.java)

        fun getInstance(): VivCompilerService =
            ApplicationManager.getApplication().getService(VivCompilerService::class.java)
    }
}

/**
 * Structured result from the compiler bridge script.
 */
data class CompileResult(
    val status: String = "error",
    val errorType: String? = null,
    val file: String? = null,
    val line: Int? = null,
    val column: Int? = null,
    val endLine: Int? = null,
    val endColumn: Int? = null,
    val message: String? = null,
    val code: String? = null,
    val entryFile: String? = null,
    val outputPath: String? = null,
    val constructs: Map<String, List<String>>? = null,
    val warning: String? = null,
    val warningType: String? = null,
)
