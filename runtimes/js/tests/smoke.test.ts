/**
 * Parametrized smoke tests -- every fixture initializes without error.
 *
 * This is the regression-catching layer. If a bundle or adapter is broken,
 * it fails here before any feature-specific test runs.
 */

import { beforeEach, describe, expect, it } from "vitest";

import type { ContentBundle } from "../src/content-bundle/types";
import { initializeVivRuntime, vivRuntimeIsInitialized } from "../src";
import { loadBundle, resetActionIDCounter } from "./fixtures/utils";
import { setup as setupMinimal } from "./fixtures/minimal-action/setup";
import { setup as setupConditions } from "./fixtures/action-with-conditions/setup";
import { setup as setupEffects } from "./fixtures/action-with-effects/setup";
import { setup as setupEmbargoes } from "./fixtures/action-with-embargoes/setup";
import { setup as setupReactions } from "./fixtures/action-with-reactions/setup";
import { setup as setupSaliences } from "./fixtures/action-with-saliences/setup";
import { setup as setupPlan } from "./fixtures/plan-single-phase/setup";
import { setup as setupQuery } from "./fixtures/query/setup";
import { setup as setupSifting } from "./fixtures/sifting-pattern/setup";
import { setup as setupEnums } from "./fixtures/action-with-enums/setup";
import { setup as setupCustomFn } from "./fixtures/action-with-custom-functions/setup";
import { setup as setupItems } from "./fixtures/action-with-items/setup";
import { setup as setupAssignments } from "./fixtures/action-with-assignments/setup";
import { setup as setupConditionals } from "./fixtures/action-with-conditionals/setup";
import { setup as setupLoops } from "./fixtures/action-with-loops/setup";
import { setup as setupTemplateStrings } from "./fixtures/action-with-template-strings/setup";
import { setup as setupFailSafe } from "./fixtures/action-with-fail-safe/setup";
import { setup as setupScratch } from "./fixtures/action-with-scratch/setup";
import { setup as setupArithmetic } from "./fixtures/action-with-arithmetic/setup";
import { setup as setupChance } from "./fixtures/action-with-chance/setup";
import { setup as setupTruthiness } from "./fixtures/action-with-truthiness/setup";
import { setup as setupDivideAssign } from "./fixtures/action-with-divide-assign/setup";
import { setup as setupConjunction } from "./fixtures/action-with-conjunction/setup";
import { setup as setupAppendList } from "./fixtures/action-with-append-list/setup";
import { setup as setupEntityLoop } from "./fixtures/loop-entity-variable/setup";
import { setup as setupGroupRoles } from "./fixtures/action-with-group-roles/setup";
import { setup as setupOptionalRoles } from "./fixtures/action-with-optional-roles/setup";
import { setup as setupCustomPool } from "./fixtures/action-with-custom-pool/setup";
import { setup as setupSymbolRoles } from "./fixtures/action-with-symbol-roles/setup";
import { setup as setupTrope } from "./fixtures/action-with-trope/setup";
import { setup as setupKnows } from "./fixtures/action-with-knowledge-check/setup";
import { setup as setupCeremony } from "./fixtures/action-with-all-participation-modes/setup";
import { setup as setupEmbargoTime } from "./fixtures/action-with-embargo-time/setup";
import { setup as setupEmbargoAnywhere } from "./fixtures/action-with-embargo-anywhere/setup";
import { setup as setupEmbargoRoles } from "./fixtures/action-with-embargo-roles/setup";
import { setup as setupSelector } from "./fixtures/action-selector/setup";
import { setup as setupMultiPhase } from "./fixtures/plan-multi-phase/setup";
import { setup as setupQueryName } from "./fixtures/query-by-action-name/setup";
import { setup as setupQueryImportance } from "./fixtures/query-by-importance/setup";
import { setup as setupQueryChronicle } from "./fixtures/query-over-chronicle/setup";
import { setup as setupPerRoleSalience } from "./fixtures/saliences-per-role/setup";
import { setup as setupPerRoleAssoc } from "./fixtures/associations-per-role/setup";
import { setup as setupUrgency } from "./fixtures/reaction-with-urgency/setup";
import { setup as setupRepeat } from "./fixtures/action-with-repeat-logic/setup";
import { setup as setupConditionalRepeat } from "./fixtures/action-with-conditional-repeat/setup";
import { setup as setupPlanRepeat } from "./fixtures/plan-with-repeat-logic/setup";
import { setup as setupSelectorRepeat } from "./fixtures/selector-with-repeat-logic/setup";

const minimalBundle = loadBundle("minimal-action");
const conditionsBundle = loadBundle("action-with-conditions");
const effectsBundle = loadBundle("action-with-effects");
const embargoesBundle = loadBundle("action-with-embargoes");
const reactionsBundle = loadBundle("action-with-reactions");
const saliencesBundle = loadBundle("action-with-saliences");
const planBundle = loadBundle("plan-single-phase");
const queryBundle = loadBundle("query");
const siftingBundle = loadBundle("sifting-pattern");
const enumsBundle = loadBundle("action-with-enums");
const customFnBundle = loadBundle("action-with-custom-functions");
const itemsBundle = loadBundle("action-with-items");
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
const groupRolesBundle = loadBundle("action-with-group-roles");
const optionalRolesBundle = loadBundle("action-with-optional-roles");
const customPoolBundle = loadBundle("action-with-custom-pool");
const symbolRolesBundle = loadBundle("action-with-symbol-roles");
const tropeBundle = loadBundle("action-with-trope");
const knowsBundle = loadBundle("action-with-knowledge-check");
const ceremonyBundle = loadBundle("action-with-all-participation-modes");
const embargoTimeBundle = loadBundle("action-with-embargo-time");
const embargoAnywhereBundle = loadBundle("action-with-embargo-anywhere");
const embargoRolesBundle = loadBundle("action-with-embargo-roles");
const selectorBundle = loadBundle("action-selector");
const multiPhaseBundle = loadBundle("plan-multi-phase");
const queryNameBundle = loadBundle("query-by-action-name");
const queryImportanceBundle = loadBundle("query-by-importance");
const queryChronicleBundle = loadBundle("query-over-chronicle");
const perRoleSalienceBundle = loadBundle("saliences-per-role");
const perRoleAssocBundle = loadBundle("associations-per-role");
const urgencyBundle = loadBundle("reaction-with-urgency");
const repeatBundle = loadBundle("action-with-repeat-logic");
const conditionalRepeatBundle = loadBundle("action-with-conditional-repeat");
const planRepeatBundle = loadBundle("plan-with-repeat-logic");
const selectorRepeatBundle = loadBundle("selector-with-repeat-logic");

/**
 * Describes a fixture used in parametrized smoke tests
 */
interface FixtureEntry {
    readonly name: string;
    readonly bundle: ContentBundle;
    readonly setup: (...args: any[]) => { state: unknown; adapter: unknown };
}

const fixtures: FixtureEntry[] = [
    {
        name: "minimal-action",
        bundle: minimalBundle,
        setup: setupMinimal,
    },
    {
        name: "action-with-conditions",
        bundle: conditionsBundle,
        setup: setupConditions,
    },
    {
        name: "action-with-effects",
        bundle: effectsBundle,
        setup: setupEffects,
    },
    {
        name: "action-with-embargoes",
        bundle: embargoesBundle,
        setup: setupEmbargoes,
    },
    {
        name: "action-with-reactions",
        bundle: reactionsBundle,
        setup: setupReactions,
    },
    {
        name: "action-with-saliences",
        bundle: saliencesBundle,
        setup: setupSaliences,
    },
    {
        name: "plan-single-phase",
        bundle: planBundle,
        setup: setupPlan,
    },
    {
        name: "query",
        bundle: queryBundle,
        setup: setupQuery,
    },
    {
        name: "sifting-pattern",
        bundle: siftingBundle,
        setup: setupSifting,
    },
    {
        name: "action-with-enums",
        bundle: enumsBundle,
        setup: setupEnums,
    },
    {
        name: "action-with-custom-functions",
        bundle: customFnBundle,
        setup: setupCustomFn,
    },
    {
        name: "action-with-items",
        bundle: itemsBundle,
        setup: setupItems,
    },
    {
        name: "action-with-assignments",
        bundle: assignmentsBundle,
        setup: setupAssignments,
    },
    {
        name: "action-with-conditionals",
        bundle: conditionalsBundle,
        setup: () => setupConditionals(50),
    },
    {
        name: "action-with-loops",
        bundle: loopsBundle,
        setup: setupLoops,
    },
    {
        name: "action-with-template-strings",
        bundle: templateStringsBundle,
        setup: setupTemplateStrings,
    },
    {
        name: "action-with-fail-safe",
        bundle: failSafeBundle,
        setup: setupFailSafe,
    },
    {
        name: "action-with-scratch",
        bundle: scratchBundle,
        setup: setupScratch,
    },
    {
        name: "action-with-arithmetic",
        bundle: arithmeticBundle,
        setup: setupArithmetic,
    },
    {
        name: "action-with-chance",
        bundle: chanceBundle,
        setup: setupChance,
    },
    {
        name: "action-with-truthiness",
        bundle: truthinessBundle,
        setup: setupTruthiness,
    },
    {
        name: "action-with-divide-assign",
        bundle: divideAssignBundle,
        setup: setupDivideAssign,
    },
    {
        name: "action-with-conjunction",
        bundle: conjunctionBundle,
        setup: () => setupConjunction(["x"], 5),
    },
    {
        name: "action-with-append-list",
        bundle: appendListBundle,
        setup: setupAppendList,
    },
    {
        name: "loop-entity-variable",
        bundle: entityLoopBundle,
        setup: setupEntityLoop,
    },
    {
        name: "action-with-group-roles",
        bundle: groupRolesBundle,
        setup: setupGroupRoles,
    },
    {
        name: "action-with-optional-roles",
        bundle: optionalRolesBundle,
        setup: setupOptionalRoles,
    },
    {
        name: "action-with-custom-pool",
        bundle: customPoolBundle,
        setup: setupCustomPool,
    },
    {
        name: "action-with-symbol-roles",
        bundle: symbolRolesBundle,
        setup: setupSymbolRoles,
    },
    {
        name: "action-with-trope",
        bundle: tropeBundle,
        setup: setupTrope,
    },
    {
        name: "action-with-knowledge-check",
        bundle: knowsBundle,
        setup: setupKnows,
    },
    {
        name: "action-with-all-participation-modes",
        bundle: ceremonyBundle,
        setup: setupCeremony,
    },
    {
        name: "action-with-embargo-time",
        bundle: embargoTimeBundle,
        setup: setupEmbargoTime,
    },
    {
        name: "action-with-embargo-anywhere",
        bundle: embargoAnywhereBundle,
        setup: setupEmbargoAnywhere,
    },
    {
        name: "action-with-embargo-roles",
        bundle: embargoRolesBundle,
        setup: setupEmbargoRoles,
    },
    {
        name: "action-selector",
        bundle: selectorBundle,
        setup: setupSelector,
    },
    {
        name: "plan-multi-phase",
        bundle: multiPhaseBundle,
        setup: setupMultiPhase,
    },
    {
        name: "query-by-action-name",
        bundle: queryNameBundle,
        setup: setupQueryName,
    },
    {
        name: "query-by-importance",
        bundle: queryImportanceBundle,
        setup: setupQueryImportance,
    },
    {
        name: "query-over-chronicle",
        bundle: queryChronicleBundle,
        setup: setupQueryChronicle,
    },
    {
        name: "saliences-per-role",
        bundle: perRoleSalienceBundle,
        setup: setupPerRoleSalience,
    },
    {
        name: "associations-per-role",
        bundle: perRoleAssocBundle,
        setup: setupPerRoleAssoc,
    },
    {
        name: "reaction-with-urgency",
        bundle: urgencyBundle,
        setup: setupUrgency,
    },
    {
        name: "action-with-repeat-logic",
        bundle: repeatBundle,
        setup: setupRepeat,
    },
    {
        name: "action-with-conditional-repeat",
        bundle: conditionalRepeatBundle,
        setup: setupConditionalRepeat,
    },
    {
        name: "plan-with-repeat-logic",
        bundle: planRepeatBundle,
        setup: setupPlanRepeat,
    },
    {
        name: "selector-with-repeat-logic",
        bundle: selectorRepeatBundle,
        setup: setupSelectorRepeat,
    },
];

describe("smoke", () => {
    beforeEach(() => {
        resetActionIDCounter();
    });

    for (const fixture of fixtures) {
        it(`${fixture.name} initializes successfully`, () => {
            const { adapter } = fixture.setup();
            initializeVivRuntime({
                contentBundle: fixture.bundle,
                adapter: adapter as any,
            });
            expect(vivRuntimeIsInitialized()).toBe(true);
        });
    }
});
