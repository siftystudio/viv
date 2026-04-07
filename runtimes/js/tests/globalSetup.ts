import { execFileSync } from "child_process";
import { existsSync, globSync, unlinkSync, writeSync } from "fs";
import { dirname, resolve } from "path";

/**
 * Absolute path to the JS runtime package root.
 */
const RUNTIME_ROOT = resolve(import.meta.dirname, "..");

/**
 * Absolute path to the `vivc` compiler binary. Checks the monorepo's Python venv first,
 * then falls back to `vivc` on the system PATH (for CI environments).
 */
const VIVC_VENV = resolve(RUNTIME_ROOT, "../../compiler/.venv/bin/vivc");
const VIVC = existsSync(VIVC_VENV) ? VIVC_VENV : "vivc";

/**
 * Glob pattern matching all fixture source files, relative to {@link RUNTIME_ROOT}.
 */
const FIXTURES_GLOB = "tests/fixtures/*/source.viv";

/**
 * Compiles all fixture `source.viv` files into `bundle.json` files using the monorepo's Viv compiler.
 *
 * @throws {Error} If the compiler binary is not found in the expected venv location.
 */
export function setup(): void {
    if (VIVC !== "vivc" && !existsSync(VIVC)) {
        throw new Error(
            `Viv compiler not found at ${VIVC} or on PATH. Install the compiler or set up the compiler venv.`
        );
    }
    const sources = globSync(FIXTURES_GLOB, { cwd: RUNTIME_ROOT });
    writeSync(2, ` \x1b[36m◌\x1b[0m Compiling ${sources.length} test fixtures...\n`);
    for (const src of sources) {
        const fullSrc = resolve(RUNTIME_ROOT, src);
        const fullOut = resolve(dirname(fullSrc), "bundle.json");
        execFileSync(VIVC, ["-q", "-i", fullSrc, "-o", fullOut]);
    }
    writeSync(2, ` \x1b[32m✓\x1b[0m Compiled ${sources.length} test fixtures\n\n`);
}

/**
 * Deletes all the `bundle.json` files that were compiled from the test fixtures.
 */
export function teardown(): void {
    const bundles = globSync("tests/fixtures/*/bundle.json", { cwd: RUNTIME_ROOT });
    for (const bundle of bundles) {
        unlinkSync(resolve(RUNTIME_ROOT, bundle));
    }
    writeSync(2, ` \x1b[32m✓\x1b[0m Cleaned up ${bundles.length} compiled fixtures\n\n`);
}
