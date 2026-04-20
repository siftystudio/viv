import { spawn } from "child_process";
import * as path from "path";
import type { Writable } from "stream";
import type { Readable } from "stream";

/**
 * Wraps {@link ./runIntegration.ts} and filters out cosmetic VS Code / Electron
 * noise that would otherwise bury Mocha's output. Forwards stdout/stderr with
 * the noise lines stripped; exits with the child's exit code.
 *
 * Noise patterns intentionally kept narrow — we want to silence *known* cosmetic
 * chatter and let anything unfamiliar through.
 */
const NOISE: readonly RegExp[] = [
    // Chromium per-process logs: `[PID:TID/HHMMSS.NNNNNN:ERROR:...]`
    /^\[\d+:\d+\/\d+/,
    // VS Code main-process logs: `[main 2026-04-18T17:12:39.091Z]`
    /^\[main \d{4}-\d{2}-\d{2}T/,
    // Chromium/Electron GPU init warnings (EGL driver probes on headless Linux/macOS)
    /EGL Driver message \(Error\) eglQueryDeviceAttribEXT/,
    // Electron utility-process lifecycle teardown
    /UtilityProcessWorker\]: terminated unexpectedly/,
    // CoreText font-resolution informational logs (macOS specific)
    /CoreText note:/,
    // VS Code's disposable-cleanup warnings after extension-host teardown
    /Trying to add a disposable to a DisposableStore/,
    // Stack frames inside VS Code internals surfaced by the warnings above
    /^\s+at .*extensionHostProcess/,
    /^\s+at file:\/\/.*vscode.*\/out\/vs\//,
    // VS Code background network fetches for chat participant registry, etc.
    /^\[network\] #\d+: https:.*- error GET Failed to fetch/,
    /Failed to fetch chat participant registry/,
];

// VS Code sometimes emits noise lines colorized with ANSI escape sequences;
// strip those for pattern matching so our regexes still see `[main ...]` etc.
const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g;

function isNoise(line: string): boolean {
    const stripped = line.replace(ANSI_ESCAPE, "");
    return NOISE.some((re) => re.test(stripped));
}

function filterStream(stream: Readable, dest: Writable): void {
    let buffer = "";
    stream.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            if (!isNoise(line)) dest.write(line + "\n");
        }
    });
    stream.on("end", () => {
        if (buffer && !isNoise(buffer)) dest.write(buffer);
    });
}

const target = path.join(__dirname, "runIntegration.js");
const child = spawn(process.execPath, [target], { stdio: ["inherit", "pipe", "pipe"] });
filterStream(child.stdout, process.stdout);
filterStream(child.stderr, process.stderr);
child.on("exit", (code) => process.exit(code ?? 1));
