/**
 * Tests for pure utility functions.
 */

import { describe, it, expect } from "vitest";

import { clamp, deduplicate, randomNormal, removeAll, weightedShuffle } from "../src/utils/general-utils";
import { groundRelativePointInTime, isEntityView, timeOfDayIsAtOrAfter } from "../src/utils/viv-utils";
import { kCombinations } from "../src/role-caster/utils";
import { TimeFrameTimeUnit } from "../src/dsl";

describe("kCombinations", () => {
    it("yields all 2-combinations from a pool of 4", () => {
        const pool = ["a", "b", "c", "d"];
        const result = [...kCombinations(pool, 2)];
        expect(result).toHaveLength(6);
        // Verify lexicographic order
        expect(result[0]).toEqual(["a", "b"]);
        expect(result[5]).toEqual(["c", "d"]);
    });

    it("yields a single empty combination when k is 0", () => {
        const result = [...kCombinations([1, 2, 3], 0)];
        expect(result).toEqual([[]]);
    });

    it("yields nothing when k exceeds pool size", () => {
        const result = [...kCombinations([1, 2], 3)];
        expect(result).toEqual([]);
    });

    it("yields nothing when k is negative", () => {
        const result = [...kCombinations([1, 2], -1)];
        expect(result).toEqual([]);
    });

    it("yields the full pool as a single combination when k equals pool size", () => {
        const result = [...kCombinations([1, 2, 3], 3)];
        expect(result).toEqual([[1, 2, 3]]);
    });
});

describe("groundRelativePointInTime", () => {
    it("adds minutes to an anchor timestamp", () => {
        const result = groundRelativePointInTime(100, { amount: 30, unit: TimeFrameTimeUnit.Minutes });
        expect(result).toBe(130);
    });

    it("adds hours to an anchor timestamp", () => {
        const result = groundRelativePointInTime(0, { amount: 2, unit: TimeFrameTimeUnit.Hours });
        expect(result).toBe(120);
    });

    it("adds days to an anchor timestamp", () => {
        const result = groundRelativePointInTime(0, { amount: 1, unit: TimeFrameTimeUnit.Days });
        expect(result).toBe(60 * 24);
    });

    it("adds weeks to an anchor timestamp", () => {
        const result = groundRelativePointInTime(0, { amount: 1, unit: TimeFrameTimeUnit.Weeks });
        expect(result).toBe(60 * 24 * 7);
    });

    it("adds months to an anchor timestamp", () => {
        const result = groundRelativePointInTime(0, { amount: 1, unit: TimeFrameTimeUnit.Months });
        expect(result).toBe(60 * 24 * 30);
    });

    it("adds years to an anchor timestamp", () => {
        const result = groundRelativePointInTime(0, { amount: 1, unit: TimeFrameTimeUnit.Years });
        expect(result).toBe(60 * 24 * 365);
    });

    it("subtracts when inPast is true", () => {
        const result = groundRelativePointInTime(1000, { amount: 100, unit: TimeFrameTimeUnit.Minutes }, true);
        expect(result).toBe(900);
    });
});

describe("timeOfDayIsAtOrAfter", () => {
    it("returns false when the anchor hour is earlier than the given hour", () => {
        const result = timeOfDayIsAtOrAfter({ hour: 8, minute: 0 }, { hour: 10, minute: 0 });
        expect(result).toBe(false);
    });

    it("returns true when the anchor hour is later than the given hour", () => {
        const result = timeOfDayIsAtOrAfter({ hour: 14, minute: 0 }, { hour: 10, minute: 0 });
        expect(result).toBe(true);
    });

    it("returns true when anchor and given time are identical (inclusive)", () => {
        const result = timeOfDayIsAtOrAfter({ hour: 10, minute: 30 }, { hour: 10, minute: 30 });
        expect(result).toBe(true);
    });

    it("compares minutes when hours are equal", () => {
        // anchor 10:45 >= given 10:30, so returns true
        expect(timeOfDayIsAtOrAfter({ hour: 10, minute: 45 }, { hour: 10, minute: 30 })).toBe(true);
        // anchor 10:15 < given 10:30, so returns false
        expect(timeOfDayIsAtOrAfter({ hour: 10, minute: 15 }, { hour: 10, minute: 30 })).toBe(false);
    });
});

describe("clamp", () => {
    it("clamps a value below the minimum", () => {
        expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("clamps a value above the maximum", () => {
        expect(clamp(15, 0, 10)).toBe(10);
    });

    it("returns the value when within range", () => {
        expect(clamp(5, 0, 10)).toBe(5);
    });

    it("handles null bounds", () => {
        expect(clamp(-100, null, null)).toBe(-100);
    });
});

describe("deduplicate", () => {
    it("removes duplicate values", () => {
        expect(deduplicate([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    });

    it("returns an empty array for empty input", () => {
        expect(deduplicate([])).toEqual([]);
    });
});

describe("removeAll", () => {
    it("removes all occurrences of a value", () => {
        expect(removeAll([1, 2, 3, 2, 4], 2)).toEqual([1, 3, 4]);
    });

    it("returns a copy when the value is not present", () => {
        const original = [1, 2, 3];
        const result = removeAll(original, 99);
        expect(result).toEqual([1, 2, 3]);
        // Should be a new array, not the same reference
        expect(result).not.toBe(original);
    });
});

describe("randomNormal", () => {
    it("propagates NaN when mean is NaN", () => {
        const result = randomNormal(NaN, 1);
        expect(result).toBeNaN();
    });

    it("propagates NaN when sd is NaN", () => {
        const result = randomNormal(0, NaN);
        expect(result).toBeNaN();
    });
});

describe("isEntityView", () => {
    it("rejects a plain object that has a string id but no entityType", () => {
        const notAnEntity = { id: "some-id", name: "Sword of Destiny", count: 5 };
        expect(isEntityView(notAnEntity)).toBe(false);
    });

    it("accepts an object with both id and entityType", () => {
        const entity = { id: "cid-alice", entityType: "character", name: "Alice" };
        expect(isEntityView(entity)).toBe(true);
    });
});

describe("weightedShuffle", () => {
    it("throws when items and weights have different lengths", () => {
        expect(() => weightedShuffle([1, 2], [1.0])).toThrow();
    });

    it("throws when a weight is negative", () => {
        expect(() => weightedShuffle([1, 2], [1.0, -1.0])).toThrow();
    });

    it("places zero-weight items last", () => {
        // Run multiple times to increase confidence given nondeterminism
        for (let i = 0; i < 20; i++) {
            const result = weightedShuffle(["a", "b", "c"], [100, 100, 0]);
            expect(result[result.length - 1]).toBe("c");
        }
    });
});
