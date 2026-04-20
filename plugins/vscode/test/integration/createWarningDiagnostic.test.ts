import { expect } from "chai";
import * as vscode from "vscode";
import { createWarningDiagnostic } from "../../extension";
import { activateExtension, fixturePath } from "./_helpers";

/**
 * Unit-style tests for `createWarningDiagnostic` (runs in the EDH only
 * because it constructs real `vscode.Diagnostic` instances).
 */
describe("createWarningDiagnostic", () => {
    const sourcePath = fixturePath("minimal.viv");

    before(async () => {
        await activateExtension();
    });

    it("returns null when warning is null", () => {
        expect(createWarningDiagnostic(null, sourcePath)).to.be.null;
    });

    it("returns null when warning is undefined", () => {
        expect(createWarningDiagnostic(undefined, sourcePath)).to.be.null;
    });

    it("returns a Warning-severity diagnostic when warning is a non-empty string", () => {
        const diag = createWarningDiagnostic("Compiler version mismatch detected", sourcePath);
        expect(diag, "diagnostic should not be null").to.exist;
        expect(diag!.severity).to.equal(vscode.DiagnosticSeverity.Warning);
        expect(diag!.source).to.equal("viv");
        expect(diag!.message).to.equal("Unexpected compiler version");
    });

    it("pins the diagnostic range to (0,0,0,0)", () => {
        const diag = createWarningDiagnostic("x", sourcePath)!;
        expect(diag.range.start.line).to.equal(0);
        expect(diag.range.start.character).to.equal(0);
        expect(diag.range.end.line).to.equal(0);
        expect(diag.range.end.character).to.equal(0);
    });

    it("attaches the full warning text as relatedInformation", () => {
        const fullText = "Package built for 0.11, installed 0.12. Update the extension.";
        const diag = createWarningDiagnostic(fullText, sourcePath)!;
        expect(diag.relatedInformation).to.have.lengthOf(1);
        expect(diag.relatedInformation![0].message).to.equal(fullText);
    });

    it("the related information's location points at the compiled source", () => {
        const diag = createWarningDiagnostic("x", sourcePath)!;
        const loc = diag.relatedInformation![0].location;
        expect(loc.uri.fsPath).to.equal(sourcePath);
    });

    it("preserves multi-line warning text verbatim", () => {
        const text = "line one\nline two\nline three";
        const diag = createWarningDiagnostic(text, sourcePath)!;
        expect(diag.relatedInformation![0].message).to.equal(text);
    });
});
