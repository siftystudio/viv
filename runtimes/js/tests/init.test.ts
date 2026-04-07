/**
 * Tests for runtime initialization, schema version, and debugging data.
 */

import { beforeEach, describe, expect, it } from "vitest";
import cloneDeep from "lodash/cloneDeep";
import semver from "semver";

import {
    VivNotInitializedError,
    VivValidationError,
    getDebuggingData,
    getSchemaVersion,
    initializeVivRuntime,
    selectAction,
    vivRuntimeIsInitialized,
} from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { CHARACTER_ID, setup } from "./fixtures/minimal-action/setup";

const bundle = loadBundle("minimal-action");

/**
 * This describe must come before any test that calls initializeVivRuntime,
 * since there is no way to un-initialize the runtime within a single test file.
 */
describe("VivNotInitializedError", () => {
    it("throws when an API function is called before initialization", async () => {
        await expect(
            selectAction({ initiatorID: "anyone" })
        ).rejects.toThrow(VivNotInitializedError);
    });
});

describe("initializeVivRuntime", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("returns true on successful initialization", () => {
        const { adapter } = setup();
        const result = initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        expect(result).toBe(true);
    });
});

describe("vivRuntimeIsInitialized", () => {
    it("returns true after initialization", () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        expect(vivRuntimeIsInitialized()).toBe(true);
    });
});

describe("getSchemaVersion", () => {
    it("returns a semver string", () => {
        expect(getSchemaVersion()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("matches the version stamped in the content bundle", () => {
        const bundleVersion = (bundle as any).metadata.schemaVersion;
        expect(getSchemaVersion()).toBe(bundleVersion);
    });
});

describe("content-bundle compatibility", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("rejects a bundle with a different major version", () => {
        const { adapter } = setup();
        const tampered = cloneDeep(bundle);
        const runtimeVersion = getSchemaVersion();
        (tampered as any).metadata.schemaVersion = `${semver.major(runtimeVersion) + 1}.0.0`;
        expect(() => {
            initializeVivRuntime({
                contentBundle: tampered,
                adapter,
            });
        }).toThrow(VivValidationError);
    });

    it("rejects a bundle with a different minor version in pre-1.0", () => {
        const { adapter } = setup();
        const tampered = cloneDeep(bundle);
        const runtimeVersion = getSchemaVersion();
        const bumpedMinor = semver.minor(runtimeVersion) + 1;
        (tampered as any).metadata.schemaVersion = `0.${bumpedMinor}.0`;
        expect(() => {
            initializeVivRuntime({
                contentBundle: tampered,
                adapter,
            });
        }).toThrow(VivValidationError);
    });

    it("rejects a bundle with a missing schema version", () => {
        const { adapter } = setup();
        const tampered = cloneDeep(bundle);
        delete (tampered as any).metadata.schemaVersion;
        expect(() => {
            initializeVivRuntime({
                contentBundle: tampered,
                adapter,
            });
        }).toThrow();
    });

    it("accepts a bundle with a different patch version", () => {
        const { adapter } = setup();
        const tampered = cloneDeep(bundle);
        const runtimeVersion = getSchemaVersion();
        const major = semver.major(runtimeVersion);
        const minor = semver.minor(runtimeVersion);
        const patch = semver.patch(runtimeVersion) + 99;
        (tampered as any).metadata.schemaVersion = `${major}.${minor}.${patch}`;
        const result = initializeVivRuntime({
            contentBundle: tampered,
            adapter,
        });
        expect(result).toBe(true);
    });
});

describe("getDebuggingData", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("throws when debugging is not enabled", async () => {
        const { adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        // Perform an action to populate internal state
        await selectAction({ initiatorID: CHARACTER_ID });
        await expect(getDebuggingData()).rejects.toThrow("Cannot retrieve debugging data");
    });
});
