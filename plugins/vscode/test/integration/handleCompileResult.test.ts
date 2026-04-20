import { expect } from "chai";
import * as vscode from "vscode";
import { handleCompileResult, type ExtensionState } from "../../extension";
import {
    activateExtension,
    createTestState,
    disposeState,
    fixturePath,
} from "./_helpers";

/**
 * Exercises `handleCompileResult` directly against hand-crafted `CompileResult`
 * objects. Bypasses the subprocess boundary — Electron's frozen `child_process`
 * module makes stubbing `execFile` infeasible in the EDH, and the handler
 * reaction logic is the substantive thing we want to cover.
 */
describe("handleCompileResult", () => {
    let state: ExtensionState;
    const sourcePath = fixturePath("minimal.viv");

    before(async () => {
        await activateExtension();
    });

    beforeEach(() => {
        state = createTestState();
    });

    afterEach(() => {
        disposeState(state);
    });

    describe("success results", () => {
        it("clears existing diagnostics", () => {
            state.diagnostics.set(vscode.Uri.file(sourcePath), [
                new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), "stale", vscode.DiagnosticSeverity.Error),
            ]);
            handleCompileResult(state, { status: "success", constructs: {} }, sourcePath);
            const remaining = state.diagnostics.get(vscode.Uri.file(sourcePath));
            expect(remaining, "diagnostics should be empty").to.have.lengthOf(0);
        });

        it("shows the green check in the status bar", () => {
            handleCompileResult(state, { status: "success", constructs: {} }, sourcePath);
            expect(state.statusBarItem.text).to.equal("$(check) Viv");
        });

        it("tooltip is `Compilation succeeded` when no outputPath", () => {
            handleCompileResult(state, { status: "success", constructs: {} }, sourcePath);
            expect(state.statusBarItem.tooltip).to.equal("Compilation succeeded");
        });

        it("tooltip shows the bundle path when outputPath is provided", () => {
            handleCompileResult(
                state,
                { status: "success", constructs: {}, outputPath: "/tmp/bundle.json", entryFile: sourcePath },
                sourcePath,
            );
            expect(state.statusBarItem.tooltip).to.equal("Content bundle saved: /tmp/bundle.json");
        });

        it("clears the error background color", () => {
            // Simulate a prior error state
            state.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
            handleCompileResult(state, { status: "success", constructs: {} }, sourcePath);
            expect(state.statusBarItem.backgroundColor).to.be.undefined;
        });

        it("uses the success theme color", () => {
            handleCompileResult(state, { status: "success", constructs: {} }, sourcePath);
            const color = state.statusBarItem.color;
            expect(color).to.be.an.instanceOf(vscode.ThemeColor);
            // ThemeColor exposes `id` via the API surface
            expect((color as vscode.ThemeColor).id).to.equal("testing.iconPassed");
        });

        it("attaches a warning diagnostic if the result carries a `warning`", () => {
            handleCompileResult(
                state,
                {
                    status: "success",
                    constructs: {},
                    warning: "Compiler version is older than expected",
                },
                sourcePath,
            );
            const diags = state.diagnostics.get(vscode.Uri.file(sourcePath));
            expect(diags).to.have.lengthOf(1);
            expect(diags![0].severity).to.equal(vscode.DiagnosticSeverity.Warning);
            expect(diags![0].message).to.equal("Unexpected compiler version");
        });

        it("does not attach a warning diagnostic when `warning` is absent", () => {
            handleCompileResult(state, { status: "success", constructs: {} }, sourcePath);
            const diags = state.diagnostics.get(vscode.Uri.file(sourcePath));
            expect(diags ?? []).to.have.lengthOf(0);
        });
    });

    describe("error results with source annotations", () => {
        const errorPath = fixturePath("parse-error.viv");

        it("attaches an error diagnostic at the reported range", () => {
            handleCompileResult(
                state,
                {
                    status: "error",
                    message: "unexpected token",
                    file: errorPath,
                    line: 2,
                    column: 5,
                    endLine: 2,
                    endColumn: 10,
                },
                errorPath,
            );
            const diags = state.diagnostics.get(vscode.Uri.file(errorPath));
            expect(diags).to.have.lengthOf(1);
            const diag = diags![0];
            expect(diag.severity).to.equal(vscode.DiagnosticSeverity.Error);
            expect(diag.message).to.equal("unexpected token");
            expect(diag.source).to.equal("viv");
            expect(diag.range.start.line).to.equal(1); // 2 - 1
            expect(diag.range.start.character).to.equal(4); // 5 - 1
            expect(diag.range.end.line).to.equal(1);
            expect(diag.range.end.character).to.equal(9); // 10 - 1
        });

        it("defaults endLine/endColumn to line/column when absent", () => {
            handleCompileResult(
                state,
                {
                    status: "error",
                    message: "x",
                    file: errorPath,
                    line: 3,
                    column: 2,
                },
                errorPath,
            );
            const diag = state.diagnostics.get(vscode.Uri.file(errorPath))![0];
            expect(diag.range.end.line).to.equal(2);
            expect(diag.range.end.character).to.equal(1);
        });

        it("defaults column to 1 when absent", () => {
            handleCompileResult(
                state,
                {
                    status: "error",
                    message: "x",
                    file: errorPath,
                    line: 5,
                },
                errorPath,
            );
            const diag = state.diagnostics.get(vscode.Uri.file(errorPath))![0];
            expect(diag.range.start.line).to.equal(4);
            expect(diag.range.start.character).to.equal(0);
        });

        it("attaches relatedInformation when `code` is provided", () => {
            handleCompileResult(
                state,
                {
                    status: "error",
                    message: "bad",
                    file: errorPath,
                    line: 1,
                    column: 1,
                    code: "action foo:",
                },
                errorPath,
            );
            const diag = state.diagnostics.get(vscode.Uri.file(errorPath))![0];
            expect(diag.relatedInformation).to.have.lengthOf(1);
            expect(diag.relatedInformation![0].message).to.equal("action foo:");
        });

        it("does not attach relatedInformation when `code` is absent", () => {
            handleCompileResult(
                state,
                { status: "error", message: "bad", file: errorPath, line: 1, column: 1 },
                errorPath,
            );
            const diag = state.diagnostics.get(vscode.Uri.file(errorPath))![0];
            expect(diag.relatedInformation ?? []).to.have.lengthOf(0);
        });
    });

    describe("error results without source annotations", () => {
        it("attaches a file-level diagnostic at the compiled source", () => {
            handleCompileResult(
                state,
                { status: "error", message: "internal compiler error" },
                sourcePath,
            );
            const diags = state.diagnostics.get(vscode.Uri.file(sourcePath));
            expect(diags).to.have.lengthOf(1);
            expect(diags![0].message).to.equal("internal compiler error");
            expect(diags![0].range.start.line).to.equal(0);
            expect(diags![0].range.start.character).to.equal(0);
        });

        it("falls back to `Compilation failed` when no message is given", () => {
            handleCompileResult(state, { status: "error" }, sourcePath);
            const diags = state.diagnostics.get(vscode.Uri.file(sourcePath));
            expect(diags).to.have.lengthOf(1);
            expect(diags![0].message).to.equal("Compilation failed");
        });
    });

    describe("status bar transitions on error", () => {
        it("shows the error indicator text", () => {
            handleCompileResult(state, { status: "error", message: "x" }, sourcePath);
            expect(state.statusBarItem.text).to.equal("$(error) Viv");
        });

        it("uses the error background color", () => {
            handleCompileResult(state, { status: "error", message: "x" }, sourcePath);
            const bg = state.statusBarItem.backgroundColor;
            expect(bg).to.be.an.instanceOf(vscode.ThemeColor);
            expect((bg as vscode.ThemeColor).id).to.equal("statusBarItem.errorBackground");
        });

        it("tooltip carries the error message", () => {
            handleCompileResult(state, { status: "error", message: "what went wrong" }, sourcePath);
            expect(state.statusBarItem.tooltip).to.equal("what went wrong");
        });
    });

    describe("error + warning coexisting", () => {
        it("attaches the warning diagnostic to the compiled source alongside the error", () => {
            const errorPath = fixturePath("parse-error.viv");
            handleCompileResult(
                state,
                {
                    status: "error",
                    message: "boom",
                    file: errorPath,
                    line: 1,
                    column: 1,
                    warning: "mismatch",
                },
                sourcePath,
            );
            const sourceDiags = state.diagnostics.get(vscode.Uri.file(sourcePath)) ?? [];
            const errorDiags = state.diagnostics.get(vscode.Uri.file(errorPath)) ?? [];
            const warningDiags = sourceDiags.filter((d) => d.severity === vscode.DiagnosticSeverity.Warning);
            const errorErrors = errorDiags.filter((d) => d.severity === vscode.DiagnosticSeverity.Error);
            expect(warningDiags, "warning attached to compiled source").to.have.lengthOf(1);
            expect(errorErrors, "error attached to errored file").to.have.lengthOf(1);
        });
    });

    describe("output channel population", () => {
        it("writes the construct summary after a successful compile", () => {
            // The OutputChannel API doesn't expose a way to read back content,
            // but `replace` overwrites and our `formatConstructSummary` is the
            // content source — verified separately in formatConstructSummary tests.
            // We at least verify `replace` does not throw.
            expect(() =>
                handleCompileResult(
                    state,
                    {
                        status: "success",
                        constructs: {
                            actions: ["greet", "hug"],
                            actionSelectors: [],
                            plans: [],
                            planSelectors: [],
                            queries: [],
                            siftingPatterns: [],
                            tropes: [],
                        },
                    },
                    sourcePath,
                ),
            ).to.not.throw();
        });
    });
});
