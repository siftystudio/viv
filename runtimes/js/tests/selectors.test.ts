/**
 * Tests for action and plan selectors.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { initializeVivRuntime, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { ACTOR_ID, setup } from "./fixtures/action-selector/setup";

const bundle = loadBundle("action-selector");

describe("action selectors", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    it("targets one of its candidate actions", async () => {
        const { state, adapter } = setup();
        initializeVivRuntime({
            contentBundle: bundle,
            adapter,
        });
        const result = await selectAction({ initiatorID: ACTOR_ID });
        expect(result).not.toBeNull();
        const actionView = state.entities[state.actions[0]] as any;
        // bow requires formal=true, which is false by default, so only wave/nod are reachable
        expect(["wave", "nod"]).toContain(actionView.name);
    });

    it("can reach all unconditional candidates over multiple runs", async () => {
        const seen = new Set<string>();
        for (let i = 0; i < 30; i++) {
            resetActionIDCounter();
            const { state, adapter } = setup();
            initializeVivRuntime({
                contentBundle: bundle,
                adapter,
            });
            await selectAction({ initiatorID: ACTOR_ID });
            const actionView = state.entities[state.actions[0]] as any;
            seen.add(actionView.name);
            if (seen.size === 2) {
                break;
            }
        }
        expect(seen).toContain("wave");
        expect(seen).toContain("nod");
    });

    it("excludes candidates whose conditions fail", async () => {
        // formal=false → bow's condition (@actor.formal) fails
        for (let i = 0; i < 20; i++) {
            resetActionIDCounter();
            const { state, adapter } = setup(false);
            initializeVivRuntime({
                contentBundle: bundle,
                adapter,
            });
            await selectAction({ initiatorID: ACTOR_ID });
            const actionView = state.entities[state.actions[0]] as any;
            expect(actionView.name).not.toBe("bow");
        }
    });

    it("includes conditional candidates when their conditions hold", async () => {
        const seen = new Set<string>();
        for (let i = 0; i < 50; i++) {
            resetActionIDCounter();
            const { state, adapter } = setup(true);
            initializeVivRuntime({
                contentBundle: bundle,
                adapter,
            });
            await selectAction({ initiatorID: ACTOR_ID });
            const actionView = state.entities[state.actions[0]] as any;
            seen.add(actionView.name);
            if (seen.has("bow")) {
                break;
            }
        }
        expect(seen).toContain("bow");
    });
});
