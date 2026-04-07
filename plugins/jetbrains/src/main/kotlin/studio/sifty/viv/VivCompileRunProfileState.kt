package studio.sifty.viv

import com.intellij.execution.DefaultExecutionResult
import com.intellij.execution.ExecutionResult
import com.intellij.execution.Executor
import com.intellij.execution.configurations.RunProfileState
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.process.ProcessHandler
import com.intellij.execution.process.ProcessOutputType
import com.intellij.execution.runners.ExecutionEnvironment
import com.intellij.execution.runners.ProgramRunner
import com.intellij.execution.ui.ConsoleView
import com.intellij.execution.ui.ConsoleViewContentType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import java.io.OutputStream

/**
 * Shared run profile state for both Compile Check and Save Content Bundle.
 *
 * Invokes the compiler via [VivCompilerService] and prints formatted results to the Run console.
 */
class VivCompileRunProfileState(
    private val sourcePath: String,
    private val outputPath: String?,
    private val environment: ExecutionEnvironment,
) : RunProfileState {

    override fun execute(executor: Executor?, runner: ProgramRunner<*>): ExecutionResult {
        val console = TextConsoleBuilderFactory.getInstance()
            .createBuilder(environment.project)
            .console

        val handler = VivCompileProcessHandler(sourcePath, outputPath, console, environment.project)
        console.attachToProcess(handler)
        handler.startNotify()

        return DefaultExecutionResult(console, handler)
    }
}

/**
 * A synthetic [ProcessHandler] that runs the Viv compiler and writes formatted output to a console.
 *
 * IntelliJ's Run tool window requires a [ProcessHandler]. Since we invoke the compiler via
 * [VivCompilerService] (which manages its own subprocess), this handler acts as a wrapper that
 * starts compilation on a background thread and reports results to the attached console.
 */
private class VivCompileProcessHandler(
    private val sourcePath: String,
    private val outputPath: String?,
    private val console: ConsoleView,
    private val project: Project,
) : ProcessHandler() {

    override fun startNotify() {
        super.startNotify()
        ApplicationManager.getApplication().executeOnPooledThread {
            var success = false
            try {
                success = run()
            } finally {
                notifyProcessTerminated(if (success) 0 else 1)
            }
        }
    }

    private fun run(): Boolean {
        val service = VivCompilerService.getInstance()
        val result = if (outputPath != null) {
            service.compileBundle(sourcePath, outputPath)
        } else {
            service.compile(sourcePath)
        }

        // Update status bar
        VivStatusBarWidgetFactory.updateStatus(project, result)

        // Format and display the result
        val formatted = VivCompileResultFormatter.format(result, sourcePath, outputPath)
        val contentType = if (result.status == "success") ConsoleViewContentType.NORMAL_OUTPUT
                          else ConsoleViewContentType.ERROR_OUTPUT
        console.print(formatted + "\n", contentType)

        return result.status == "success"
    }

    override fun destroyProcessImpl() { notifyProcessTerminated(0) }
    override fun detachProcessImpl() { notifyProcessTerminated(0) }
    override fun detachIsDefault(): Boolean = false
    override fun getProcessInput(): OutputStream? = null
}
