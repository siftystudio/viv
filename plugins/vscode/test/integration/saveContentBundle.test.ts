import { expect } from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { activateExtension, fixturePath, tick } from "./_helpers";

/**
 * Tests the `viv.saveContentBundle` command's configuration flow: entry-file
 * prompt, output-path prompt, and the workspace-settings writes that persist
 * the user's picks. We skip the final subprocess invocation (which calls
 * `invokeCompiler` → `execFile`) since Electron's frozen `child_process`
 * exports prevent intercepting that boundary cleanly.
 */
describe("viv.saveContentBundle command", () => {
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        await activateExtension();
        // Confirm we're launched with a workspace folder
        expect(vscode.workspace.workspaceFolders, "test EDH must launch with a workspace folder").to.exist;
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
        // Reset settings between tests so they don't leak
        const config = vscode.workspace.getConfiguration("viv");
        await config.update("entryFile", undefined, vscode.ConfigurationTarget.Workspace);
        await config.update("outputPath", undefined, vscode.ConfigurationTarget.Workspace);
        await tick(50);
    });

    it("prompts for the entry file on first run", async () => {
        const showInfo = sandbox.stub(vscode.window, "showInformationMessage");
        showInfo.resolves(undefined); // user dismisses
        await vscode.commands.executeCommand("viv.saveContentBundle");
        await tick(100);
        expect(showInfo.called, "info message should have been shown").to.be.true;
        const firstCallMessage = showInfo.firstCall.args[0];
        expect(firstCallMessage).to.match(/entry file/i);
    });

    it("exits cleanly when the user dismisses the entry-file info prompt", async () => {
        const showInfo = sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
        const showOpen = sandbox.stub(vscode.window, "showOpenDialog");
        await vscode.commands.executeCommand("viv.saveContentBundle");
        await tick(100);
        expect(showInfo.called).to.be.true;
        expect(showOpen.called, "file picker should NOT be shown if user dismissed").to.be.false;
    });

    it("opens the file picker when the user clicks `Choose File`", async () => {
        // First showInformationMessage call (entry file) resolves to "Choose File";
        // subsequent calls (output path) resolve to undefined to halt the flow.
        const showInfo = sandbox.stub(vscode.window, "showInformationMessage");
        showInfo.onFirstCall().resolves("Choose File" as unknown as vscode.MessageItem);
        showInfo.onSecondCall().resolves(undefined);
        const showOpen = sandbox.stub(vscode.window, "showOpenDialog").resolves(undefined);
        await vscode.commands.executeCommand("viv.saveContentBundle");
        await tick(100);
        expect(showOpen.called, "file picker should have been shown").to.be.true;
    });

    it("persists the chosen entry file to workspace settings", async () => {
        const entry = fixturePath("minimal.viv");
        const showInfo = sandbox.stub(vscode.window, "showInformationMessage");
        showInfo.onFirstCall().resolves("Choose File" as unknown as vscode.MessageItem);
        showInfo.onSecondCall().resolves(undefined); // dismiss output prompt
        sandbox.stub(vscode.window, "showOpenDialog").resolves([vscode.Uri.file(entry)]);
        await vscode.commands.executeCommand("viv.saveContentBundle");
        await tick(200);
        const persisted = vscode.workspace.getConfiguration("viv").get<string>("entryFile");
        expect(persisted).to.equal(entry);
    });

    it("prompts for the output path after the entry file is chosen", async () => {
        const entry = fixturePath("minimal.viv");
        const showInfo = sandbox.stub(vscode.window, "showInformationMessage");
        showInfo.onFirstCall().resolves("Choose File" as unknown as vscode.MessageItem);
        showInfo.onSecondCall().resolves(undefined); // dismiss output prompt
        sandbox.stub(vscode.window, "showOpenDialog").resolves([vscode.Uri.file(entry)]);
        await vscode.commands.executeCommand("viv.saveContentBundle");
        await tick(200);
        expect(showInfo.callCount).to.be.at.least(2);
        const outputPrompt = showInfo.secondCall.args[0];
        expect(outputPrompt).to.match(/content bundle/i);
    });

    it("persists the chosen output path to workspace settings", async () => {
        const entry = fixturePath("minimal.viv");
        const bundle = "/tmp/viv-test-bundle.json";
        const showInfo = sandbox.stub(vscode.window, "showInformationMessage");
        showInfo.onFirstCall().resolves("Choose File" as unknown as vscode.MessageItem);
        showInfo.onSecondCall().resolves("Choose Location" as unknown as vscode.MessageItem);
        sandbox.stub(vscode.window, "showOpenDialog").resolves([vscode.Uri.file(entry)]);
        sandbox.stub(vscode.window, "showSaveDialog").resolves(vscode.Uri.file(bundle));
        await vscode.commands.executeCommand("viv.saveContentBundle");
        await tick(200);
        const persisted = vscode.workspace.getConfiguration("viv").get<string>("outputPath");
        expect(persisted).to.equal(bundle);
    });

    it("does not re-prompt when both entry file and output path are already configured", async () => {
        const config = vscode.workspace.getConfiguration("viv");
        await config.update("entryFile", fixturePath("minimal.viv"), vscode.ConfigurationTarget.Workspace);
        await config.update("outputPath", "/tmp/bundle.json", vscode.ConfigurationTarget.Workspace);
        await tick(100);
        const showInfo = sandbox.stub(vscode.window, "showInformationMessage");
        const showOpen = sandbox.stub(vscode.window, "showOpenDialog");
        const showSave = sandbox.stub(vscode.window, "showSaveDialog");
        await vscode.commands.executeCommand("viv.saveContentBundle");
        await tick(200);
        expect(showInfo.called, "info prompts should not fire when both settings are present").to.be.false;
        expect(showOpen.called, "open dialog should not fire").to.be.false;
        expect(showSave.called, "save dialog should not fire").to.be.false;
    });
});
