import { expect } from "chai";
import * as vscode from "vscode";
import { resolvePythonPath } from "../../extension";
import { activateExtension, tick } from "./_helpers";

/**
 * Verifies the Python-interpreter resolution chain:
 *  1. `viv.pythonPath` setting, if set.
 *  2. The `ms-python.python` extension's active interpreter (skipped here
 *     because that extension is not installed in the test host).
 *  3. Literal `"python3"` fallback.
 */
describe("resolvePythonPath", () => {
    before(async () => {
        await activateExtension();
    });

    afterEach(async () => {
        // Restore default (unset) between tests.
        const config = vscode.workspace.getConfiguration("viv");
        await config.update("pythonPath", undefined, vscode.ConfigurationTarget.Global);
        await tick(50);
    });

    it("falls back to `python3` when `viv.pythonPath` is unset and Python ext is absent", () => {
        // In the test EDH we launched with `--disable-extensions`, so the Python
        // extension is definitely not present. Setting viv.pythonPath to undefined
        // should produce the `python3` fallback.
        expect(resolvePythonPath()).to.equal("python3");
    });

    it("returns `viv.pythonPath` verbatim when it is set to a non-empty string", async () => {
        const config = vscode.workspace.getConfiguration("viv");
        await config.update("pythonPath", "/opt/homebrew/bin/python3.13", vscode.ConfigurationTarget.Global);
        await tick(50);
        expect(resolvePythonPath()).to.equal("/opt/homebrew/bin/python3.13");
    });

    it("falls back when `viv.pythonPath` is set to the empty string", async () => {
        const config = vscode.workspace.getConfiguration("viv");
        await config.update("pythonPath", "", vscode.ConfigurationTarget.Global);
        await tick(50);
        expect(resolvePythonPath()).to.equal("python3");
    });

    it("preserves leading/trailing whitespace in `viv.pythonPath`", async () => {
        // Documenting current behavior — the extension does not trim whitespace.
        const config = vscode.workspace.getConfiguration("viv");
        await config.update("pythonPath", " /usr/bin/python3 ", vscode.ConfigurationTarget.Global);
        await tick(50);
        expect(resolvePythonPath()).to.equal(" /usr/bin/python3 ");
    });

    it("accepts paths with spaces in the directory name", async () => {
        const config = vscode.workspace.getConfiguration("viv");
        await config.update("pythonPath", "/Users/a b/venv/bin/python", vscode.ConfigurationTarget.Global);
        await tick(50);
        expect(resolvePythonPath()).to.equal("/Users/a b/venv/bin/python");
    });
});
