/**
 * Tests for error handling and validation -- asserts specific error classes.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
    VivExecutionError,
    VivInterpreterError,
    VivRoleCastingError,
    VivValidationError,
    fadeCharacterMemories,
    initializeVivRuntime,
    selectAction,
} from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { setup as setupEnums } from "./fixtures/action-with-enums/setup";
import { ACTOR_ID, setup as setupFn } from "./fixtures/action-with-custom-functions/setup";
import { LEADER_ID, setup as setupBadPool } from "./fixtures/bad-pool-directive/setup";
import { setup as setupMinimal } from "./fixtures/minimal-action/setup";

const enumBundle = loadBundle("action-with-enums");
const fnBundle = loadBundle("action-with-custom-functions");
const badPoolBundle = loadBundle("bad-pool-directive");
const minimalBundle = loadBundle("minimal-action");

describe("VivValidationError", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("throws VivValidationError when a referenced enum is missing", () => {
        const { adapter } = setupEnums();
        (adapter as any).enums = {};
        expect(() => {
            initializeVivRuntime({
                contentBundle: enumBundle,
                adapter,
            });
        }).toThrow(VivValidationError);
    });

    it("throws VivValidationError when a referenced custom function is missing", () => {
        const { adapter } = setupFn();
        (adapter as any).functions = {};
        expect(() => {
            initializeVivRuntime({
                contentBundle: fnBundle,
                adapter,
            });
        }).toThrow(VivValidationError);
    });

    it("throws VivValidationError when updateEntityProperty is absent but bundle has assignments", () => {
        const { adapter } = setupEnums();
        const stripped = { ...adapter };
        delete (stripped as any).updateEntityProperty;
        expect(() => {
            initializeVivRuntime({
                contentBundle: enumBundle,
                adapter: stripped as any,
            });
        }).toThrow(VivValidationError);
    });
});

describe("VivInterpreterError", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("wraps custom function errors as VivInterpreterError", async () => {
        const { adapter } = setupFn(() => { throw new Error("boom"); });
        initializeVivRuntime({
            contentBundle: fnBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: ACTOR_ID })).rejects.toThrow(VivInterpreterError);
    });
});

describe("VivRoleCastingError", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("throws VivRoleCastingError when a pool directive evaluates to a non-array", async () => {
        const { adapter } = setupBadPool();
        initializeVivRuntime({
            contentBundle: badPoolBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: LEADER_ID })).rejects.toThrow(VivRoleCastingError);
    });
});

describe("VivExecutionError", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("throws VivExecutionError when story time moves backward during memory fading", async () => {
        const { state, adapter } = setupMinimal();
        initializeVivRuntime({
            contentBundle: minimalBundle,
            adapter,
        });
        // Fade at timestamp 100 to establish a baseline
        state.timestamp = 100;
        await fadeCharacterMemories();
        // Move time backward and fade again -- should throw
        state.timestamp = 50;
        await expect(fadeCharacterMemories()).rejects.toThrow(VivExecutionError);
    });
});
