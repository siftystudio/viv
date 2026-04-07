import * as vscode from "vscode";
import * as path from "path";
import * as childProcess from "child_process";

import type { ExecFileException } from "child_process";

/**
 * Activates the Viv extension.
 *
 * Registers commands for compile-checking the current file (play button) and saving
 * the content bundle (`Cmd+Shift+B`). Compilation results are shown via a status
 * bar icon, inline diagnostics, and terminal output.
 *
 * @param context - The extension context.
 */
export function activate(context: vscode.ExtensionContext): void {
    const state = initializeState(context);
    const compileCommand = vscode.commands.registerCommand("viv.compile", () => compileCurrentFile(state));
    const saveBundleCommand = vscode.commands.registerCommand("viv.saveContentBundle", () => saveContentBundle(state));
    const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
        // If a manual compile triggered this save, skip -- compileCurrentFile will invoke the compiler itself
        if (manualCompileInProgress) {
            return;
        }
        if (document.languageId === "viv") {
            const compileOnSave = vscode.workspace.getConfiguration("viv").get<boolean>("compileOnSave", true);
            if (compileOnSave) {
                invokeCompiler(state, document.uri.fsPath);
            }
        }
    });
    context.subscriptions.push(compileCommand, saveBundleCommand, saveListener);
}

/**
 * Creates the shared UI components and bundles them into the extension state.
 *
 * @param context - The extension context.
 * @returns The initialized extension state.
 */
function initializeState(context: vscode.ExtensionContext): ExtensionState {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = "workbench.action.problems.focus";
    context.subscriptions.push(statusBarItem);
    const diagnostics = vscode.languages.createDiagnosticCollection("viv");
    context.subscriptions.push(diagnostics);
    const outputChannel = vscode.window.createOutputChannel("Viv");
    context.subscriptions.push(outputChannel);
    return {
        statusBarItem,
        diagnostics,
        outputChannel,
        context
    };
}

/**
 * Compiles the currently active `.viv` file.
 *
 * Saves the file first so the compiler sees the latest edits. This is the handler
 * for the play button and the `Viv: Compile Current File` command.
 *
 * @param state - The shared extension state.
 */
let manualCompileInProgress = false;
async function compileCurrentFile(state: ExtensionState): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor == null) {
        vscode.window.showErrorMessage("No active file to compile.");
        return;
    }
    if (editor.document.languageId !== "viv") {
        vscode.window.showErrorMessage("The active file is not a Viv source file.");
        return;
    }
    // Suppress the save listener so we don't trigger a redundant compilation
    manualCompileInProgress = true;
    let saved: boolean;
    try {
        saved = await editor.document.save();
    } finally {
        manualCompileInProgress = false;
    }
    if (saved) {
        invokeCompiler(state, editor.document.uri.fsPath);
    }
}

/**
 * Compiles the project's entry file and writes the content bundle to disk.
 *
 * Prompts the user to configure the entry file and output path on first use,
 * then persists those selections to workspace settings. This is the handler
 * for `Cmd+Shift+B` and the `Viv: Save Content Bundle` command.
 *
 * @param state - The shared extension state.
 */
async function saveContentBundle(state: ExtensionState): Promise<void> {
    // Workspace settings are required to persist the entry file and output path
    if (vscode.workspace.workspaceFolders == null || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("Open a project folder before saving a content bundle.");
        return;
    }
    const config = vscode.workspace.getConfiguration("viv");
    let entryFile = config.get<string>("entryFile");
    let bundlePath = config.get<string>("outputPath");
    // Prompt for the entry file if not yet configured
    if (entryFile == null || entryFile === "") {
        const entryPathPrompt = (
            "Select your project-wide Viv entry file. This will be compiled, along with any files it includes, "
            + "to rebuild your project-wide content bundle. You do not need to be viewing the entry file to "
            + "recompile the content bundle."
        );
        const pickEntryFile = await vscode.window.showInformationMessage(
            entryPathPrompt,
            "Choose File"
        );
        if (pickEntryFile !== "Choose File") {
            return;
        }
        const picked = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                "Viv source files": ["viv"]
            },
            title: "Select the Viv entry file"
        });
        if (picked == null || picked.length === 0) {
            return;
        }
        entryFile = picked[0].fsPath;
        await config.update("entryFile", entryFile, vscode.ConfigurationTarget.Workspace);
    }
    // Prompt for the output path if not yet configured
    if (bundlePath == null || bundlePath === "") {
        const entryPathPrompt = (
            "Choose where to save your project-wide content bundle (the compiler's JSON output file). This file "
            + "will be overwritten any time you invoke this compilation action."
        );
        const pickBundlePath = await vscode.window.showInformationMessage(
            entryPathPrompt,
            "Choose Location"
        );
        if (pickBundlePath !== "Choose Location") {
            return;
        }
        const picked = await vscode.window.showSaveDialog({
            filters: {
                "JSON files": ["json"]
            },
            title: "Save the content bundle"
        });
        if (picked == null) {
            return;
        }
        bundlePath = picked.fsPath;
        await config.update("outputPath", bundlePath, vscode.ConfigurationTarget.Workspace);
    }
    // Compile the entry file and write the bundle
    invokeCompiler(state, entryFile, bundlePath);
}

/**
 * Runs the compiler by executing the bridge script in a child process.
 *
 * Some notes:
 *  - Shows a loading spinner in the status bar while compiling.
 *  - On success, shows a green check, clears diagnostics, and places a summary of
 *    the content bundle in the Output panel.
 *  - On failure, shows a red indicator and pushes the error into the diagnostics
 *    collection, for inline display in the editor.
 *
 * @param state - The shared extension state.
 * @param sourcePath - Absolute path to the Viv source file to compile.
 * @param outputPath - If provided, the absolute path to which to write the compiled content bundle.
 */
let compileGeneration = 0;
let compilerUpdatePrompted = false;
function invokeCompiler(state: ExtensionState, sourcePath: string, outputPath?: string): void {
    const pythonPath = resolvePythonPath();
    const bridgePath = path.join(state.context.extensionPath, "compiler_bridge.py");
    const args = [bridgePath, sourcePath];
    if (outputPath != null) {
        args.push(outputPath);
    }
    // Invalidate any in-flight compilation so its callback will be discarded
    const thisGeneration = ++compileGeneration;
    // Clear previous state and show loading spinner
    state.diagnostics.clear();
    state.outputChannel.replace("");
    state.statusBarItem.text = "$(loading~spin) Compiling...";
    state.statusBarItem.color = undefined;
    state.statusBarItem.backgroundColor = undefined;
    state.statusBarItem.tooltip = "Viv compiler is running";
    state.statusBarItem.show();
    // Spawn the bridge script with a configurable timeout
    const timeoutMs = vscode.workspace.getConfiguration("viv").get<number>("compileTimeout", 120) * 1000;
    childProcess.execFile(
        pythonPath, args, { timeout: timeoutMs },
        (execError: ExecFileException | null, stdout: string, stderr: string) => {
        // If a newer compilation has been launched, discard this result
        if (thisGeneration !== compileGeneration) {
            return;
        }
        let result: CompileResult;
        try {
            result = JSON.parse(stdout);
        } catch {
            // If JSON parsing fails, the bridge script didn't produce valid output
            if (execError != null && "code" in execError && execError.code === "ENOENT") {
                showErrorIndicator(state, `Python interpreter not found: ${pythonPath}`);
            } else {
                const detail = stderr.trim() || stdout.trim() || execError?.message || "Unknown error";
                showErrorIndicator(state, `Compiler bridge failed: ${detail}`);
            }
            state.diagnostics.clear();
            return;
        }
        // If the compiler is not installed, offer to install it
        if (result.errorType === "not_installed") {
            showErrorIndicator(state, result.message ?? "Viv compiler is not installed");
            promptCompilerInstall(pythonPath, state, sourcePath);
            return;
        }
        // If the compiler is outdated, offer to update it (once per session)
        if (result.warningType === "compiler_outdated" && !compilerUpdatePrompted) {
            compilerUpdatePrompted = true;
            promptCompilerUpdate(pythonPath, state, sourcePath);
        }
        handleCompileResult(state, result, sourcePath);
    });
}

/**
 * Prompts the user to install the Viv compiler via pip.
 *
 * Attempts a standard pip install first, then retries with `--break-system-packages`
 * for externally managed Python environments (e.g., Homebrew). On success, re-triggers
 * compilation of the original source file.
 *
 * @param pythonPath - The resolved Python interpreter path.
 * @param state - The shared extension state.
 * @param sourcePath - Absolute path to the source file that triggered the install prompt.
 */
async function promptCompilerInstall(
        pythonPath: string, state: ExtensionState, sourcePath: string): Promise<void> {
    const action = await vscode.window.showErrorMessage(
        "The Viv compiler is not accessible to VS Code's Python interpreter. Would you like to install it here?",
        "Install"
    );
    if (action !== "Install") {
        return;
    }
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Installing viv-compiler...",
            cancellable: false
        },
        async () => {
            // First attempt: standard pip install
            const installed = await tryPipInstall(pythonPath, ["-m", "pip", "install", "viv-compiler"]);
            if (!installed) {
                // Second attempt: bypass externally managed environment restriction
                const installedWithFlag = await tryPipInstall(
                    pythonPath,
                    ["-m", "pip", "install", "--break-system-packages", "viv-compiler"]
                );
                if (!installedWithFlag) {
                    vscode.window.showErrorMessage(
                        "Could not install viv-compiler automatically. VS Code is using the Python interpreter at "
                        + `${pythonPath}. Please install viv-compiler for this interpreter manually, or set `
                        + "viv.pythonPath to a different interpreter that has it installed."
                    );
                    return;
                }
            }
            vscode.window.showInformationMessage("Viv compiler installed successfully.");
            invokeCompiler(state, sourcePath);
        }
    );
}

/**
 * Prompts the user to update an outdated Viv compiler via pip.
 *
 * Uses the same two-attempt strategy as {@link promptCompilerInstall}: tries a standard
 * pip upgrade first, then retries with `--break-system-packages`. On success, re-triggers
 * compilation of the original source file. Only called once per session.
 *
 * @param pythonPath - The resolved Python interpreter path.
 * @param state - The shared extension state.
 * @param sourcePath - Absolute path to the source file that triggered the update prompt.
 */
async function promptCompilerUpdate(
        pythonPath: string, state: ExtensionState, sourcePath: string): Promise<void> {
    const action = await vscode.window.showWarningMessage(
        "The Viv compiler accessible to VS Code's Python interpreter is outdated. Would you like to update it?",
        "Update"
    );
    if (action !== "Update") {
        return;
    }
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Updating viv-compiler...",
            cancellable: false
        },
        async () => {
            // First attempt: standard pip upgrade
            const updated = await tryPipInstall(
                pythonPath, ["-m", "pip", "install", "--upgrade", "viv-compiler"]
            );
            if (!updated) {
                // Second attempt: bypass externally managed environment restriction
                const updatedWithFlag = await tryPipInstall(
                    pythonPath,
                    ["-m", "pip", "install", "--upgrade", "--break-system-packages", "viv-compiler"]
                );
                if (!updatedWithFlag) {
                    vscode.window.showErrorMessage(
                        "Could not update viv-compiler automatically. VS Code is using the Python interpreter at "
                        + `${pythonPath}. Please update viv-compiler for this interpreter manually.`
                    );
                    return;
                }
            }
            vscode.window.showInformationMessage("Viv compiler updated successfully.");
            invokeCompiler(state, sourcePath);
        }
    );
}

/**
 * Attempts to install a package via pip.
 *
 * @param pythonPath - The Python interpreter to use.
 * @param args - The full argument list (e.g., `["-m", "pip", "install", "viv-compiler"]`).
 * @returns Whether the install succeeded.
 */
function tryPipInstall(pythonPath: string, args: readonly string[]): Promise<boolean> {
    return new Promise((resolve) => {
        childProcess.execFile(pythonPath, [...args], { timeout: 120000 }, (error) => {
            resolve(error == null);
        });
    });
}

/**
 * Resolves the Python interpreter path.
 *
 * Works in the following order to make a selection:
 *  - The Viv extension's own `viv.pythonPath` setting.
 *  - The Python extension's active interpreter.
 *  - `python3`.
 *
 * If the `python3` fallback does not work, an error will be emitted upstream.
 *
 * @returns The resolved Python interpreter path.
 */
function resolvePythonPath(): string {
    const vivPython =
        vscode.workspace.getConfiguration("viv").get<string>("pythonPath");
    if (vivPython != null && vivPython !== "") {
        return vivPython;
    }
    // Otherwise, try the Python extension's active interpreter
    const pythonExtension = vscode.extensions.getExtension<PythonExtensionApi>("ms-python.python");
    if (pythonExtension?.isActive) {
        const envPath = pythonExtension.exports?.environments?.getActiveEnvironmentPath?.()?.path;
        if (envPath != null && envPath !== "") {
            return envPath;
        }
    }
    return "python3";
}

/**
 * Handles a parsed compilation result from the bridge script.
 *
 * On success, this function clears diagnostics, shows a green check in the status bar,
 * and writes the construct summary to the Output channel. On failure, it pushes the
 * error into the diagnostics collection for inline display in the editor.
 *
 * @param state - The shared extension state.
 * @param result - The parsed JSON result from the bridge script.
 * @param sourcePath - Absolute path to the compiled source file, used as a fallback
 *     location for errors without source annotations.
 */
function handleCompileResult(state: ExtensionState, result: CompileResult, sourcePath: string): void {
    // Build a version-mismatch warning diagnostic if the bridge reported one
    const warningDiagnostic = createWarningDiagnostic(result.warning, sourcePath);
    // If compilation succeeded, clear any previous diagnostics, indicate success,
    // and display a summary of the content bundle in the Output panel.
    if (result.status === "success") {
        state.diagnostics.clear();
        state.statusBarItem.text = "$(check) Viv";
        state.statusBarItem.backgroundColor = undefined;
        state.statusBarItem.color = new vscode.ThemeColor("testing.iconPassed");
        if (result.outputPath != null) {
            state.statusBarItem.tooltip = `Content bundle saved: ${result.outputPath}`;
        } else {
            state.statusBarItem.tooltip = "Compilation succeeded";
        }
        if (warningDiagnostic != null) {
            state.diagnostics.set(vscode.Uri.file(sourcePath), [warningDiagnostic]);
        }
        if (result.constructs != null) {
            let output = "";
            if (result.outputPath != null) {
                output += "* Saved project-wide content bundle:\n";
                output += `  - Entry file: ${result.entryFile}\n`;
                output += `  - Content bundle: ${result.outputPath}\n\n`;
            }
            output += formatConstructSummary(result.constructs);
            state.outputChannel.replace(output);
        }
        return;
    }
    // Otherwise, compilation failed -- build the error diagnostic
    const message = result.message ?? "Compilation failed";
    // If there is a version-mismatch warning, attach it to the compiled source file
    if (warningDiagnostic != null) {
        state.diagnostics.set(vscode.Uri.file(sourcePath), [warningDiagnostic]);
    }
    if (result.file != null && result.line != null) {
        // Error with source annotations -- show inline diagnostics
        const startLine = result.line - 1;
        const startColumn = (result.column ?? 1) - 1;
        const endLine = (result.endLine ?? result.line) - 1;
        const endColumn = (result.endColumn ?? result.column ?? 1) - 1;
        const range = new vscode.Range(startLine, startColumn, endLine, endColumn);
        const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
        diagnostic.source = "viv";
        if (result.code != null) {
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(vscode.Uri.file(result.file), range),
                    result.code
                )
            ];
        }
        state.diagnostics.set(vscode.Uri.file(result.file), [diagnostic]);
    } else {
        // Error without source annotations -- attach to the compiled file at the top
        const range = new vscode.Range(0, 0, 0, 0);
        const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
        diagnostic.source = "viv";
        state.diagnostics.set(vscode.Uri.file(sourcePath), [diagnostic]);
    }
    showErrorIndicator(state, message);
}

/**
 * Creates a warning diagnostic for a compiler version mismatch, if applicable.
 *
 * @param warning - The warning message from the bridge, or null if there is no mismatch.
 * @param sourcePath - Absolute path to the compiled source file.
 * @returns The warning diagnostic, or null if there is no warning.
 */
function createWarningDiagnostic(warning: string | null | undefined, sourcePath: string): vscode.Diagnostic | null {
    if (warning == null) {
        return null;
    }
    const warningRange = new vscode.Range(0, 0, 0, 0);
    const diagnostic = new vscode.Diagnostic(
        warningRange,
        "Unexpected compiler version",
        vscode.DiagnosticSeverity.Warning
    );
    diagnostic.source = "viv";
    diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
            new vscode.Location(vscode.Uri.file(sourcePath), warningRange),
            warning
        )
    ];
    return diagnostic;
}

/**
 * Formats a construct summary for the `Output` channel.
 *
 * @param constructs - Mapping from construct type keys to sorted name arrays.
 * @returns The formatted summary string.
 */
function formatConstructSummary(constructs: Record<string, string[]>): string {
    const lines: string[] = [];
    for (const { key, label } of CONSTRUCT_SECTIONS) {
        const constructNames = constructs[key] ?? [];
        if (constructNames.length === 0) {
            lines.push(`* ${label} (0)`);
        } else {
            lines.push(`* ${label} (${constructNames.length}):`);
            for (const name of constructNames) {
                lines.push(`  - ${name}`);
            }
        }
        lines.push("");
    }
    return lines.join("\n");
}

/**
 * Shows the error indicator in the status bar.
 *
 * @param state - The shared extension state.
 * @param message - The error message to display as a tooltip.
 */
function showErrorIndicator(state: ExtensionState, message: string): void {
    state.statusBarItem.text = "$(error) Viv";
    state.statusBarItem.color = undefined;
    state.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    state.statusBarItem.tooltip = message;
}

/**
 * Display labels for construct types, in the order they appear in the content-bundle summary.
 */
const CONSTRUCT_SECTIONS: ReadonlyArray<{ key: string; label: string }> = [
    { key: "actions", label: "Actions" },
    { key: "actionSelectors", label: "Action selectors" },
    { key: "plans", label: "Plans" },
    { key: "planSelectors", label: "Plan selectors" },
    { key: "queries", label: "Queries" },
    { key: "siftingPatterns", label: "Sifting patterns" },
    { key: "tropes", label: "Tropes" },
];

/**
 * Deactivates the Viv extension.
 */
export function deactivate(): void {}

/**
 * Result emitted by the compiler bridge (as a JSON object on stdout).
 */
interface CompileResult {
    /**
     * Whether compilation succeeded.
     */
    readonly status: "success" | "error";
    /**
     * Structured error type identifying the failure category, if applicable.
     * `"not_installed"` when the compiler is not importable.
     */
    readonly errorType?: string | null;
    /**
     * Absolute path to the source file that caused the error, if applicable.
     */
    readonly file?: string | null;
    /**
     * Line number (1-indexed) at the start of the offending source, if applicable.
     */
    readonly line?: number | null;
    /**
     * Column number (1-indexed) at the start of the offending source, if applicable.
     */
    readonly column?: number | null;
    /**
     * Line number (1-indexed) at the end of the offending source, if applicable.
     */
    readonly endLine?: number | null;
    /**
     * Column number (1-indexed) at the end of the offending source, if applicable.
     */
    readonly endColumn?: number | null;
    /**
     * A human-readable error or status message.
     */
    readonly message?: string | null;
    /**
     * The offending source code snippet, if applicable.
     */
    readonly code?: string | null;
    /**
     * Absolute path to the entry file that was compiled, on a successful bundle save.
     */
    readonly entryFile?: string | null;
    /**
     * Absolute path to the written content bundle, on a successful bundle save.
     */
    readonly outputPath?: string | null;
    /**
     * Sorted construct names by type, included on successful compilation.
     */
    readonly constructs?: Record<string, string[]>;
    /**
     * A warning message to display alongside a successful result, if applicable.
     */
    readonly warning?: string | null;
    /**
     * Structured warning type identifying the mismatch category, if applicable.
     * `"compiler_outdated"` or `"plugin_outdated"`.
     */
    readonly warningType?: string | null;
}

/**
 * Subset of the Python extension's API used for interpreter resolution.
 */
interface PythonExtensionApi {
    /**
     * Environment management API.
     */
    readonly environments?: {
        /**
         * Returns the path to the active Python interpreter.
         */
        readonly getActiveEnvironmentPath?: (resource?: vscode.Uri) => { readonly path: string };
    };
}

/**
 * Shared state for the extension's UI components.
 */
interface ExtensionState {
    /**
     * Status bar item showing the current compilation state.
     */
    readonly statusBarItem: vscode.StatusBarItem;
    /**
     * Diagnostic collection for inline error display.
     */
    readonly diagnostics: vscode.DiagnosticCollection;
    /**
     * Output channel for displaying construct summaries and warnings.
     */
    readonly outputChannel: vscode.OutputChannel;
    /**
     * The extension context, used for resolving paths and managing subscriptions.
     */
    readonly context: vscode.ExtensionContext;
}
