/**
 * Tests for expression mechanics: assignments, conditionals, loops,
 * template strings, fail-safe chaining, scratch variables, arithmetic,
 * chance expressions, and truthiness.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { VivInterpreterError, attemptAction, initializeVivRuntime, selectAction } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";

import { ACTOR_ID, setup as setupAssignments } from "./fixtures/action-with-assignments/setup";
import { ACTOR_ID as SCRATCH_ACTOR_ID, setup as setupScratch } from "./fixtures/action-with-scratch/setup";
import { ACTOR_ID as ARITH_ACTOR_ID, setup as setupArithmetic } from "./fixtures/action-with-arithmetic/setup";
import { ACTOR_ID as CHANCE_ACTOR_ID, setup as setupChance } from "./fixtures/action-with-chance/setup";
import { ACTOR_ID as TRUTH_ACTOR_ID, setup as setupTruthiness } from "./fixtures/action-with-truthiness/setup";
import { ACTOR_ID as DIV_ACTOR_ID, setup as setupDivideAssign } from "./fixtures/action-with-divide-assign/setup";
import { ACTOR_ID as CONJ_ACTOR_ID, setup as setupConjunction } from "./fixtures/action-with-conjunction/setup";
import { ACTOR_ID as APPEND_ACTOR_ID, setup as setupAppendList } from "./fixtures/action-with-append-list/setup";
import {
    FOLLOWER_A_ID, FOLLOWER_B_ID, LEADER_ID, setup as setupEntityLoop,
} from "./fixtures/loop-entity-variable/setup";
import { SPEAKER_ID, setup as setupConditions } from "./fixtures/action-with-conditions/setup";
import { JUDGE_ID, SUBJECT_ID, setup as setupConditionals } from "./fixtures/action-with-conditionals/setup";
import { COUNTER_ID, setup as setupLoops } from "./fixtures/action-with-loops/setup";
import { GREETER_ID, setup as setupTemplateStrings } from "./fixtures/action-with-template-strings/setup";
import {
    CHECKER_ID, TARGET_WITH_PROFILE_ID, TARGET_WITHOUT_PROFILE_ID, setup as setupFailSafe,
} from "./fixtures/action-with-fail-safe/setup";

const assignmentsBundle = loadBundle("action-with-assignments");
const conditionalsBundle = loadBundle("action-with-conditionals");
const loopsBundle = loadBundle("action-with-loops");
const templateStringsBundle = loadBundle("action-with-template-strings");
const failSafeBundle = loadBundle("action-with-fail-safe");
const scratchBundle = loadBundle("action-with-scratch");
const arithmeticBundle = loadBundle("action-with-arithmetic");
const chanceBundle = loadBundle("action-with-chance");
const truthinessBundle = loadBundle("action-with-truthiness");
const divideAssignBundle = loadBundle("action-with-divide-assign");
const conjunctionBundle = loadBundle("action-with-conjunction");
const appendListBundle = loadBundle("action-with-append-list");
const entityLoopBundle = loadBundle("loop-entity-variable");
const conditionsBundle = loadBundle("action-with-conditions");

describe("assignments", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("direct assignment (=) sets entity property", async () => {
        const { state, adapter } = setupAssignments();
        initializeVivRuntime({
            contentBundle: assignmentsBundle,
            adapter,
        });
        await selectAction({ initiatorID: ACTOR_ID });
        expect((state.entities[ACTOR_ID] as any).label).toBe("modified");
    });

    it("multiply-assign (*=) computes correctly", async () => {
        const { state, adapter } = setupAssignments();
        initializeVivRuntime({
            contentBundle: assignmentsBundle,
            adapter,
        });
        await selectAction({ initiatorID: ACTOR_ID });
        // score was 5, *=2 → 10
        expect((state.entities[ACTOR_ID] as any).score).toBe(10);
    });

    it("divide-assign (/=) computes correctly", async () => {
        const { state, adapter } = setupAssignments();
        initializeVivRuntime({
            contentBundle: assignmentsBundle,
            adapter,
        });
        await selectAction({ initiatorID: ACTOR_ID });
        // health was 100, /=2 → 50
        expect((state.entities[ACTOR_ID] as any).health).toBe(50);
    });

    it("append adds element to array", async () => {
        const { state, adapter } = setupAssignments();
        initializeVivRuntime({
            contentBundle: assignmentsBundle,
            adapter,
        });
        await selectAction({ initiatorID: ACTOR_ID });
        expect((state.entities[ACTOR_ID] as any).tags).toContain("new-tag");
    });

    it("remove removes element from array", async () => {
        const { state, adapter } = setupAssignments();
        initializeVivRuntime({
            contentBundle: assignmentsBundle,
            adapter,
        });
        await selectAction({ initiatorID: ACTOR_ID });
        expect((state.entities[ACTOR_ID] as any).tags).not.toContain("old-tag");
        // "keep-tag" should still be there
        expect((state.entities[ACTOR_ID] as any).tags).toContain("keep-tag");
    });
});

describe("conditionals", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("takes the if branch when score > 80", async () => {
        const { state, adapter } = setupConditionals(90);
        initializeVivRuntime({
            contentBundle: conditionalsBundle,
            adapter,
        });
        await selectAction({ initiatorID: JUDGE_ID });
        expect((state.entities[SUBJECT_ID] as any).grade).toBe("excellent");
    });

    it("takes the elif branch when 50 < score <= 80", async () => {
        const { state, adapter } = setupConditionals(60);
        initializeVivRuntime({
            contentBundle: conditionalsBundle,
            adapter,
        });
        await selectAction({ initiatorID: JUDGE_ID });
        expect((state.entities[SUBJECT_ID] as any).grade).toBe("average");
    });

    it("takes the else branch when score <= 50", async () => {
        const { state, adapter } = setupConditionals(30);
        initializeVivRuntime({
            contentBundle: conditionalsBundle,
            adapter,
        });
        await selectAction({ initiatorID: JUDGE_ID });
        expect((state.entities[SUBJECT_ID] as any).grade).toBe("poor");
    });
});

describe("loops", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("iterates over array and accumulates values", async () => {
        const { state, adapter } = setupLoops();
        initializeVivRuntime({
            contentBundle: loopsBundle,
            adapter,
        });
        await selectAction({ initiatorID: COUNTER_ID });
        // values [3, 7, 5] summed into total: 0 + 3 + 7 + 5 = 15
        expect((state.entities[COUNTER_ID] as any).total).toBe(15);
    });

    it("does nothing for an empty iterable", async () => {
        const { state, adapter } = setupLoops([]);
        initializeVivRuntime({
            contentBundle: loopsBundle,
            adapter,
        });
        await selectAction({ initiatorID: COUNTER_ID });
        expect((state.entities[COUNTER_ID] as any).total).toBe(0);
    });
});

describe("template strings", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("renders entity labels in gloss", async () => {
        const { state, adapter } = setupTemplateStrings();
        initializeVivRuntime({
            contentBundle: templateStringsBundle,
            adapter,
        });
        await selectAction({ initiatorID: GREETER_ID });
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.gloss).toBe("Alice greets Bob");
    });

    it("renders entity labels in report", async () => {
        const { state, adapter } = setupTemplateStrings();
        initializeVivRuntime({
            contentBundle: templateStringsBundle,
            adapter,
        });
        await selectAction({ initiatorID: GREETER_ID });
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.report).toBe("Alice walks over and warmly greets Bob");
    });
});

describe("fail-safe chaining", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("succeeds when nested property exists", async () => {
        const { adapter } = setupFailSafe();
        initializeVivRuntime({
            contentBundle: failSafeBundle,
            adapter,
        });
        // Force the target with profile -- condition @target.profile?.active holds
        const result = await attemptAction({
            actionName: "cautious-check",
            initiatorID: CHECKER_ID,
            precastBindings: {
                checker: [CHECKER_ID],
                target: [TARGET_WITH_PROFILE_ID],
            },
        });
        expect(result).not.toBeNull();
    });

    it("fails gracefully when nested property is missing", async () => {
        const { adapter } = setupFailSafe();
        initializeVivRuntime({
            contentBundle: failSafeBundle,
            adapter,
        });
        // Force the target without profile -- condition @target.profile?.active fails safely
        const result = await attemptAction({
            actionName: "cautious-check",
            initiatorID: CHECKER_ID,
            precastBindings: {
                checker: [CHECKER_ID],
                target: [TARGET_WITHOUT_PROFILE_ID],
            },
        });
        expect(result).toBeNull();
    });
});

describe("scratch variables", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("computes scratch from entity property and uses it in effect", async () => {
        const { state, adapter } = setupScratch();
        initializeVivRuntime({
            contentBundle: scratchBundle,
            adapter,
        });
        await selectAction({ initiatorID: SCRATCH_ACTOR_ID });
        // base=7, scratch $&temp = base * 2 = 14, effect result = $&temp
        expect((state.entities[SCRATCH_ACTOR_ID] as any).result).toBe(14);
    });

    it("persists scratch value in the action view", async () => {
        const { state, adapter } = setupScratch();
        initializeVivRuntime({
            contentBundle: scratchBundle,
            adapter,
        });
        await selectAction({ initiatorID: SCRATCH_ACTOR_ID });
        const actionView = state.entities[state.actions[0]] as any;
        expect(actionView.scratch.temp).toBe(14);
    });
});

describe("arithmetic", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("computes all four arithmetic operators correctly", async () => {
        const { state, adapter } = setupArithmetic(10, 3);
        initializeVivRuntime({
            contentBundle: arithmeticBundle,
            adapter,
        });
        await selectAction({ initiatorID: ARITH_ACTOR_ID });
        const actor = state.entities[ARITH_ACTOR_ID] as any;
        expect(actor.sum).toBe(13);
        expect(actor.diff).toBe(7);
        expect(actor.prod).toBe(30);
        expect(actor.quot).toBeCloseTo(10 / 3);
    });

    it("throws VivInterpreterError on division by zero", async () => {
        const { adapter } = setupArithmetic(10, 0);
        initializeVivRuntime({
            contentBundle: arithmeticBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: ARITH_ACTOR_ID })).rejects.toThrow(VivInterpreterError);
    });
});

describe("chance expressions", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("100% condition always succeeds", async () => {
        for (let i = 0; i < 10; i++) {
            resetActionIDCounter();
            const { adapter } = setupChance();
            initializeVivRuntime({
                contentBundle: chanceBundle,
                adapter,
            });
            const result = await attemptAction({
                actionName: "certain",
                initiatorID: CHANCE_ACTOR_ID,
                precastBindings: { actor: [CHANCE_ACTOR_ID] },
            });
            expect(result).not.toBeNull();
        }
    });

    it("0% condition always fails", async () => {
        for (let i = 0; i < 10; i++) {
            resetActionIDCounter();
            const { adapter } = setupChance();
            initializeVivRuntime({
                contentBundle: chanceBundle,
                adapter,
            });
            const result = await attemptAction({
                actionName: "impossible",
                initiatorID: CHANCE_ACTOR_ID,
                precastBindings: { actor: [CHANCE_ACTOR_ID] },
            });
            expect(result).toBeNull();
        }
    });
});

describe("truthiness", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("empty array [] is falsy in Viv", async () => {
        const { adapter } = setupTruthiness([], {});
        initializeVivRuntime({
            contentBundle: truthinessBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "check-list",
            initiatorID: TRUTH_ACTOR_ID,
            precastBindings: { actor: [TRUTH_ACTOR_ID] },
        });
        expect(result).toBeNull();
    });

    it("non-empty array [1] is truthy in Viv", async () => {
        const { adapter } = setupTruthiness([1], {});
        initializeVivRuntime({
            contentBundle: truthinessBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "check-list",
            initiatorID: TRUTH_ACTOR_ID,
            precastBindings: { actor: [TRUTH_ACTOR_ID] },
        });
        expect(result).not.toBeNull();
    });

    it("empty object {} is falsy in Viv", async () => {
        const { adapter } = setupTruthiness([], {});
        initializeVivRuntime({
            contentBundle: truthinessBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "check-object",
            initiatorID: TRUTH_ACTOR_ID,
            precastBindings: { actor: [TRUTH_ACTOR_ID] },
        });
        expect(result).toBeNull();
    });

    it("non-empty object {a: 1} is truthy in Viv", async () => {
        const { adapter } = setupTruthiness([], { a: 1 });
        initializeVivRuntime({
            contentBundle: truthinessBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "check-object",
            initiatorID: TRUTH_ACTOR_ID,
            precastBindings: { actor: [TRUTH_ACTOR_ID] },
        });
        expect(result).not.toBeNull();
    });
});

describe("arithmetic type validation", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("string operand in arithmetic expression throws", async () => {
        const { adapter } = setupArithmetic("hello" as any, 3);
        initializeVivRuntime({
            contentBundle: arithmeticBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: ARITH_ACTOR_ID })).rejects.toThrow();
    });

    it("null operand in arithmetic expression throws", async () => {
        const { adapter } = setupArithmetic(null as any, 3);
        initializeVivRuntime({
            contentBundle: arithmeticBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: ARITH_ACTOR_ID })).rejects.toThrow();
    });
});

describe("entity-variable loop over property array", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("updates each entity's property through the loop variable", async () => {
        const { state, adapter } = setupEntityLoop();
        initializeVivRuntime({
            contentBundle: entityLoopBundle,
            adapter,
        });
        await selectAction({ initiatorID: LEADER_ID });
        expect((state.entities[FOLLOWER_A_ID] as any).morale).toBe(4);
        expect((state.entities[FOLLOWER_B_ID] as any).morale).toBe(6);
    });
});

describe("undefined property access without fail-safe", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("accessing a nonexistent property in a condition throws", async () => {
        const { state, adapter } = setupConditions();
        delete (state.entities[SPEAKER_ID] as any).mood;
        initializeVivRuntime({
            contentBundle: conditionsBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: SPEAKER_ID })).rejects.toThrow();
    });
});

describe("comparison type validation", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("string > number in a condition throws", async () => {
        const { state, adapter } = setupConditions();
        (state.entities[SPEAKER_ID] as any).mood = "high";
        initializeVivRuntime({
            contentBundle: conditionsBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: SPEAKER_ID })).rejects.toThrow();
    });
});

describe("divide-assign by zero", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("/= by zero throws", async () => {
        const { adapter } = setupDivideAssign(100, 0);
        initializeVivRuntime({
            contentBundle: divideAssignBundle,
            adapter,
        });
        await expect(selectAction({ initiatorID: DIV_ACTOR_ID })).rejects.toThrow();
    });

    it("/= with valid divisor works correctly", async () => {
        const { state, adapter } = setupDivideAssign(100, 4);
        initializeVivRuntime({
            contentBundle: divideAssignBundle,
            adapter,
        });
        await selectAction({ initiatorID: DIV_ACTOR_ID });
        expect((state.entities[DIV_ACTOR_ID] as any).health).toBe(25);
    });
});

describe("conjunction with Viv-falsy values", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("empty array in conjunction LHS causes condition to fail", async () => {
        const { adapter } = setupConjunction([], 5);
        initializeVivRuntime({
            contentBundle: conjunctionBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "guarded",
            initiatorID: CONJ_ACTOR_ID,
            precastBindings: { actor: [CONJ_ACTOR_ID] },
        });
        expect(result).toBeNull();
    });

    it("non-empty array in conjunction LHS allows condition to proceed", async () => {
        const { adapter } = setupConjunction(["sword"], 5);
        initializeVivRuntime({
            contentBundle: conjunctionBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "guarded",
            initiatorID: CONJ_ACTOR_ID,
            precastBindings: { actor: [CONJ_ACTOR_ID] },
        });
        expect(result).not.toBeNull();
    });

    it("empty object in conjunction LHS causes condition to fail", async () => {
        const { adapter } = setupConjunction({} as any, 5);
        initializeVivRuntime({
            contentBundle: conjunctionBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "guarded",
            initiatorID: CONJ_ACTOR_ID,
            precastBindings: { actor: [CONJ_ACTOR_ID] },
        });
        expect(result).toBeNull();
    });

    it("zero in conjunction LHS causes condition to fail", async () => {
        const { adapter } = setupConjunction(0 as any, 5);
        initializeVivRuntime({
            contentBundle: conjunctionBundle,
            adapter,
        });
        const result = await attemptAction({
            actionName: "guarded",
            initiatorID: CONJ_ACTOR_ID,
            precastBindings: { actor: [CONJ_ACTOR_ID] },
        });
        expect(result).toBeNull();
    });
});

describe("append with array RHS", () => {
    beforeEach(() => { resetActionIDCounter(); });

    it("appending an array nests rather than flattens", async () => {
        const { state, adapter } = setupAppendList();
        initializeVivRuntime({
            contentBundle: appendListBundle,
            adapter,
        });
        await selectAction({ initiatorID: APPEND_ACTOR_ID });
        const inventory = (state.entities[APPEND_ACTOR_ID] as any).inventory;
        expect(inventory).toHaveLength(2);
        expect(inventory[1]).toEqual(["shield", "potion"]);
    });
});
