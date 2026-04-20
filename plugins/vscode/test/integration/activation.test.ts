import { expect } from "chai";
import * as vscode from "vscode";
import { activateExtension, openFixture } from "./_helpers";

/**
 * Verifies that the Viv extension activates cleanly in the EDH and registers
 * its commands and listeners.
 */
describe("activation", () => {
    before(async () => {
        await activateExtension();
    });

    it("extension is present", () => {
        const ext = vscode.extensions.getExtension("siftystudio.viv");
        expect(ext, "siftystudio.viv extension not installed").to.exist;
    });

    it("extension activates", () => {
        const ext = vscode.extensions.getExtension("siftystudio.viv");
        expect(ext!.isActive, "extension did not activate").to.be.true;
    });

    it("registers the `viv.compile` command", async () => {
        const commands = await vscode.commands.getCommands(true);
        expect(commands).to.include("viv.compile");
    });

    it("registers the `viv.saveContentBundle` command", async () => {
        const commands = await vscode.commands.getCommands(true);
        expect(commands).to.include("viv.saveContentBundle");
    });

    it("associates `.viv` files with the `viv` language", async () => {
        const doc = await openFixture("minimal.viv");
        expect(doc.languageId).to.equal("viv");
    });
});
