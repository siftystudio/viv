import * as path from "path";
import Mocha from "mocha";
import { glob } from "glob";

/**
 * Entry that `@vscode/test-electron` loads inside the Extension Development
 * Host. Discovers and runs every `*.test.js` file in the integration suite.
 */
export async function run(): Promise<void> {
    const mocha = new Mocha({
        ui: "bdd",
        color: true,
        timeout: 30_000,
    });
    const testsRoot = path.resolve(__dirname);
    const files = await glob("**/*.test.js", { cwd: testsRoot });
    for (const file of files) {
        mocha.addFile(path.resolve(testsRoot, file));
    }
    return new Promise((resolve, reject) => {
        try {
            mocha.run((failures: number) => {
                if (failures > 0) {
                    reject(new Error(`${failures} test(s) failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}
