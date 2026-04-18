package studio.sifty.viv

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.CapturingProcessHandler
import com.intellij.ide.BrowserUtil
import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import com.intellij.psi.PsiManager
import java.io.File
import java.nio.charset.StandardCharsets

/**
 * Handles compiler installation and update notifications.
 *
 * Prompts the user via balloon notifications when the Viv compiler is missing or outdated,
 * and runs pip install/upgrade in a background task when the user accepts.
 */
object VivNotifications {

    private val LOG = Logger.getInstance(VivNotifications::class.java)
    private const val GROUP_ID = "studio.sifty.viv.notifications"

    /**
     * Set once per session to avoid repeated install prompts.
     */
    @Volatile
    var installPrompted = false

    /**
     * Set once per session to avoid repeated update prompts.
     */
    @Volatile
    var updatePrompted = false

    /**
     * Attempts to adopt an autodetected `viv-compiler` interpreter; falls through
     * to [promptInstall] if no alternative is found.
     *
     * Called when the configured Python interpreter reports the compiler is not
     * installed. Runs detection on a background thread, and on success silently
     * writes the detected path to [VivSettings.pythonPath], shows an informational
     * balloon, and restarts the code analyzer so the annotator immediately re-runs
     * with the new setting.
     *
     * @param project the project to notify in, or null for application-scope.
     */
    fun autodetectOrPromptInstall(project: Project?) {
        ApplicationManager.getApplication().executeOnPooledThread {
            val settings = VivSettings.getInstance()
            val current = settings.pythonPath
            val detected = detectCompilerInterpreter()
            when {
                // No vivc on shell PATH either — fall through to install prompt
                detected == null -> promptInstall(project)
                // Interpreter is already configured correctly; the `not_installed` result
                // that triggered this must have been stale (e.g., a concurrent annotator
                // pass saw the pre-adoption state). Nothing to do.
                detected == current -> Unit
                // Fresh adoption
                else -> {
                    settings.pythonPath = detected
                    // Drop any cached `not_installed` result so the next annotator pass
                    // re-invokes the compiler against the freshly-adopted interpreter
                    // instead of replaying the stale failure from the original compile.
                    VivCompilerService.getInstance().invalidateCache()
                    notificationGroup()
                        .createNotification(
                            "Detected installed Viv compiler. You're all set to compile Viv code directly in your IDE.",
                            NotificationType.INFORMATION
                        )
                        .notify(project)
                    if (project != null) {
                        ApplicationManager.getApplication().invokeLater {
                            if (project.isDisposed) return@invokeLater
                            // Targeted restart per open `.viv` file — plain `restart()` leaves
                            // external-annotator caches intact and so doesn't re-trigger our
                            // compile. Per-file restart forces a fresh annotator pass.
                            val daemon = DaemonCodeAnalyzer.getInstance(project)
                            val psiManager = PsiManager.getInstance(project)
                            FileEditorManager.getInstance(project).openFiles
                                .filter { it.extension == "viv" }
                                .mapNotNull { psiManager.findFile(it) }
                                .forEach { daemon.restart(it) }
                        }
                    }
                }
            }
        }
    }

    /**
     * Attempts to detect an existing `vivc` installation on the user's shell
     * `PATH` and returns the absolute path of the Python interpreter that owns it.
     *
     * JetBrains IDEs launched from Finder/Dock inherit a narrow `PATH` that often
     * misses Homebrew and user-local bin directories where `vivc` may live.
     * Spawning a login shell (`$SHELL -lc ...`) makes the shell source the user's
     * config files and inherit their full `PATH`, so `vivc` becomes reachable if
     * it's installed anywhere the user's own shell can see it.
     *
     * Parses the `python` line from `vivc --version` output (introduced in
     * compiler `0.12.0`) to extract the interpreter path.
     *
     * @return the absolute interpreter path, or null if detection fails for any
     *         reason (`vivc` not found, unexpected output format, missing
     *         `python` line, non-zero exit, etc.).
     */
    private fun detectCompilerInterpreter(): String? {
        return try {
            val isWindows = System.getProperty("os.name").startsWith("Windows", ignoreCase = true)
            val shell = if (isWindows) "cmd" else (System.getenv("SHELL") ?: "/bin/sh")
            val shellArgs = if (isWindows) listOf("/c", "vivc --version") else listOf("-lc", "vivc --version")
            val commandLine = GeneralCommandLine(shell)
                .withParameters(shellArgs)
                .withCharset(StandardCharsets.UTF_8)
            val handler = CapturingProcessHandler(commandLine)
            val output = handler.runProcess(10_000)
            if (output.exitCode != 0) return null
            val pythonLine = output.stdout.lineSequence().firstOrNull { it.startsWith("python ") } ?: return null
            val detectedPath = pythonLine.removePrefix("python ").trim()
            if (detectedPath.isEmpty() || !File(detectedPath).isAbsolute) null else detectedPath
        } catch (e: Exception) {
            LOG.info("vivc auto-detection failed", e)
            null
        }
    }

    /**
     * Shows a notification offering to install the Viv compiler.
     */
    fun promptInstall(project: Project?) {
        if (installPrompted) return
        installPrompted = true
        val notification = notificationGroup()
            .createNotification(
                "The Viv compiler is not accessible to the configured Python interpreter. Would you like to install it?",
                NotificationType.ERROR
            )
        notification.addAction(object : NotificationAction("Install") {
            override fun actionPerformed(e: AnActionEvent, notification: Notification) {
                notification.expire()
                runPipAction(
                    project,
                    "Installing viv-compiler...",
                    listOf("install", "viv-compiler"),
                    "Viv compiler installed successfully.",
                    "Viv compiler installation failed",
                ) { _ ->
                    "Could not install viv-compiler automatically. You'll need to install it for another " +
                    "Python via pip, then update Viv's Python interpreter setting to point at that Python."
                }
            }
        })
        notification.notify(project)
    }

    /**
     * Shows a notification offering to update an outdated Viv compiler.
     */
    fun promptUpdate(project: Project?) {
        if (updatePrompted) return
        updatePrompted = true

        val notification = notificationGroup()
            .createNotification(
                "The Viv compiler accessible to the configured Python interpreter is outdated. Would you like to update it?",
                NotificationType.WARNING
            )
        notification.addAction(object : NotificationAction("Update") {
            override fun actionPerformed(e: AnActionEvent, notification: Notification) {
                notification.expire()
                runPipAction(
                    project,
                    "Updating viv-compiler...",
                    listOf("install", "--upgrade", "viv-compiler"),
                    "Viv compiler updated successfully.",
                    "Viv compiler update failed",
                ) { pythonPath ->
                    "Could not update viv-compiler automatically. You'll need to update it manually by running " +
                    "<code>$pythonPath -m pip install --upgrade viv-compiler</code> in a shell."
                }
            }
        })
        notification.notify(project)
    }

    private fun runPipAction(
        project: Project?,
        title: String,
        pipArgs: List<String>,
        successMessage: String,
        failureTitle: String,
        failureBody: (pythonPath: String) -> String,
    ) {
        ProgressManager.getInstance().run(object : Task.Backgroundable(project, title, false) {
            override fun run(indicator: ProgressIndicator) {
                val pythonPath = VivCompilerService.getInstance().resolvePythonPath()

                // Run both pip attempts, ignoring their exit codes — Homebrew Python on macOS
                // can exit non-zero even on a successful install (PEP 668 warnings, deprecation
                // notices, etc.). The source of truth for "did it work" is whether `viv_compiler`
                // becomes importable, checked below.
                tryPip(pythonPath, pipArgs)
                if (verifyCompilerImport(pythonPath)) {
                    notifySuccess(project, successMessage)
                    return
                }
                // Retry with `--break-system-packages` for externally-managed environments
                val argsWithFlag = pipArgs.toMutableList().apply {
                    val insertIndex = indexOfFirst { it == "viv-compiler" }
                    if (insertIndex > 0) add(insertIndex, "--break-system-packages")
                }
                tryPip(pythonPath, argsWithFlag)
                if (verifyCompilerImport(pythonPath)) {
                    notifySuccess(project, successMessage)
                    return
                }

                val failureNotification = notificationGroup()
                    .createNotification(
                        failureTitle,
                        failureBody(pythonPath),
                        NotificationType.ERROR
                    )
                failureNotification.addAction(object : NotificationAction("View Troubleshooting") {
                    override fun actionPerformed(e: AnActionEvent, notification: Notification) {
                        BrowserUtil.browse(
                            "https://github.com/siftystudio/viv/blob/main/plugins/jetbrains/README.md#troubleshooting"
                        )
                    }
                })
                failureNotification.notify(project)
            }
        })
    }

    /**
     * Returns whether the `viv_compiler` module can be imported by the given Python
     * interpreter. Used as ground truth for "did the install work" after pip attempts,
     * sidestepping pip's unreliable exit codes on Homebrew Python.
     */
    private fun verifyCompilerImport(pythonPath: String): Boolean {
        return try {
            val commandLine = GeneralCommandLine(pythonPath)
                .withParameters("-c", "import viv_compiler")
                .withCharset(StandardCharsets.UTF_8)
            val handler = CapturingProcessHandler(commandLine)
            handler.runProcess(10_000).exitCode == 0
        } catch (e: Exception) {
            LOG.info("viv_compiler import check failed", e)
            false
        }
    }

    private fun tryPip(pythonPath: String, pipArgs: List<String>): Boolean {
        return try {
            val args = listOf("-m", "pip") + pipArgs
            val commandLine = GeneralCommandLine(pythonPath)
                .withParameters(args)
                .withCharset(StandardCharsets.UTF_8)
            val handler = CapturingProcessHandler(commandLine)
            val output = handler.runProcess(120_000)
            output.exitCode == 0
        } catch (e: Exception) {
            LOG.info("pip install attempt failed", e)
            false
        }
    }

    private fun notifySuccess(project: Project?, message: String) {
        notificationGroup()
            .createNotification(message, NotificationType.INFORMATION)
            .notify(project)
    }

    private fun notificationGroup() =
        NotificationGroupManager.getInstance().getNotificationGroup(GROUP_ID)
}
