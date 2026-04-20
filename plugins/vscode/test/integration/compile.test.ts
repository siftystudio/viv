import { expect } from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { activateExtension, tick } from "./_helpers";

/**
 * Pre-compile validation in the `viv.compile` command: active-editor check
 * and language check. We do not test the post-check subprocess invocation
 * here because Electron's frozen `child_process` exports make stubbing
 * `execFile` infeasible inside the EDH (see the decisions log in the
 * end-of-run report).
 */
describe("viv.compile command (pre-invoke validation)", () => {
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await activateExtension();
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("shows an error message when no file is active", async () => {
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");
        await tick(100);
        const showError = sandbox.stub(vscode.window, "showErrorMessage");
        await vscode.commands.executeCommand("viv.compile");
        await tick(100);
        expect(showError.called, "showErrorMessage should have been called").to.be.true;
        const msg = showError.firstCall.args[0];
        expect(msg).to.match(/no active file/i);
    });

    it("shows an error message when the active file is not a .viv file", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "not viv source",
            language: "plaintext",
        });
        await vscode.window.showTextDocument(doc);
        const showError = sandbox.stub(vscode.window, "showErrorMessage");
        await vscode.commands.executeCommand("viv.compile");
        await tick(100);
        expect(showError.called, "showErrorMessage should have been called").to.be.true;
        const msg = showError.firstCall.args[0];
        expect(msg).to.match(/not a viv/i);
    });
});
