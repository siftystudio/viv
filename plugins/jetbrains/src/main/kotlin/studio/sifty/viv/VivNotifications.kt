package studio.sifty.viv

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.CapturingProcessHandler
import com.intellij.notification.Notification
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
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
                runPipAction(project, "Installing viv-compiler...", listOf("install", "viv-compiler"), "Viv compiler installed successfully.")
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
                runPipAction(project, "Updating viv-compiler...", listOf("install", "--upgrade", "viv-compiler"), "Viv compiler updated successfully.")
            }
        })
        notification.notify(project)
    }

    private fun runPipAction(project: Project?, title: String, pipArgs: List<String>, successMessage: String) {
        ProgressManager.getInstance().run(object : Task.Backgroundable(project, title, false) {
            override fun run(indicator: ProgressIndicator) {
                val pythonPath = VivCompilerService.getInstance().resolvePythonPath()

                // First attempt: standard pip
                val success = tryPip(pythonPath, pipArgs)
                if (success) {
                    notifySuccess(project, successMessage)
                    return
                }

                // Second attempt: with --break-system-packages for externally managed environments
                val argsWithFlag = pipArgs.toMutableList().apply {
                    val insertIndex = indexOfFirst { it == "viv-compiler" }
                    if (insertIndex > 0) add(insertIndex, "--break-system-packages")
                }
                val successWithFlag = tryPip(pythonPath, argsWithFlag)
                if (successWithFlag) {
                    notifySuccess(project, successMessage)
                    return
                }

                notificationGroup()
                    .createNotification(
                        "Viv compiler installation failed",
                        "Could not install viv-compiler automatically. Please install it manually: " +
                        "$pythonPath -m pip install viv-compiler",
                        NotificationType.ERROR
                    )
                    .notify(project)
            }
        })
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
