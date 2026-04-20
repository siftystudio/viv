import * as path from "path";
import { runTests } from "@vscode/test-electron";

/**
 * Entry point invoked by `npm run test:integration`.
 *
 * Downloads a pinned VS Code build, launches it with this extension loaded,
 * and runs the Mocha suite defined in `./index.ts`.
 */
async function main(): Promise<void> {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../..");
        const extensionTestsPath = path.resolve(__dirname, "./index.js");
        const workspacePath = path.resolve(__dirname, "../../../test/fixtures/workspace");
        await runTests({
            version: "1.95.0",
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                workspacePath,
                "--disable-extensions",
                "--disable-telemetry",
                "--skip-welcome",
                "--skip-release-notes",
                "--no-sandbox",
            ],
        });
    } catch (err) {
        console.error("Integration tests failed to launch:", err);
        process.exit(1);
    }
}

void main();
