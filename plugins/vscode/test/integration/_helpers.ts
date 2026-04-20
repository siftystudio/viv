import * as path from "path";
import * as vscode from "vscode";
import type { ExtensionState } from "../../extension";

/**
 * Shared helpers for VS Code integration tests. Not a suite file (underscore
 * prefix excludes it from test discovery); this module exports utilities.
 */

/**
 * The repo-root path of the VS Code extension under test.
 */
export const PLUGIN_ROOT = path.resolve(__dirname, "../../..");

/**
 * Absolute path to a fixture `.viv` file, relative to `test/fixtures/viv/`.
 */
export function fixturePath(filename: string): string {
    return path.join(PLUGIN_ROOT, "test", "fixtures", "viv", filename);
}

/**
 * Creates a fresh `ExtensionState` for a single test, with real VS Code UI
 * components and a minimal `context` shim. Tests should call `disposeState`
 * in `afterEach` to release the status bar / diagnostic / output-channel
 * resources they allocated.
 */
export function createTestState(): ExtensionState {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    const diagnostics = vscode.languages.createDiagnosticCollection(`viv-test-${Date.now()}`);
    const outputChannel = vscode.window.createOutputChannel(`Viv Test ${Date.now()}`);
    const context = { subscriptions: [] as vscode.Disposable[] } as unknown as vscode.ExtensionContext;
    return { statusBarItem, diagnostics, outputChannel, context };
}

/**
 * Releases the UI resources allocated by {@link createTestState}.
 */
export function disposeState(state: ExtensionState): void {
    state.statusBarItem.dispose();
    state.diagnostics.dispose();
    state.outputChannel.dispose();
}

/**
 * Activates the Viv extension, returning the activation promise. Safe to call
 * multiple times; subsequent calls resolve with the already-active extension.
 */
export async function activateExtension(): Promise<void> {
    const ext = vscode.extensions.getExtension("siftystudio.viv");
    if (ext == null) {
        throw new Error("Viv extension not found in EDH");
    }
    if (!ext.isActive) {
        await ext.activate();
    }
}

/**
 * Opens a fixture file as a VS Code text document and shows it in the editor.
 *
 * @param filename - Name of the fixture file, relative to `test/fixtures/viv/`.
 */
export async function openFixture(filename: string): Promise<vscode.TextDocument> {
    const uri = vscode.Uri.file(fixturePath(filename));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    return document;
}

/**
 * Polls `predicate` until it returns true or `timeoutMs` elapses. Useful for
 * awaiting async state transitions (diagnostics populating, status bar
 * updating, etc.) without relying on specific implementation timings.
 */
export async function waitFor(
        predicate: () => boolean | Promise<boolean>,
        timeoutMs = 5_000,
        pollMs = 25,
        label = "condition"): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await predicate()) {
            return;
        }
        await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}`);
}

/**
 * A short delay used to let VS Code event loops settle (e.g., after a config
 * update, to let the onDidChangeConfiguration listener fire).
 */
export async function tick(ms = 50): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
}
