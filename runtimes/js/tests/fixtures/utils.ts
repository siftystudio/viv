/**
 * Shared test utilities for constructing in-memory simulation state and mock adapters.
 *
 * Every test fixture imports from here to build its world. The adapter follows the same
 * pattern as the example projects-- a thin facade over a plain record of entities -- but
 * tripped to the minimum the runtime requires.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import set from "lodash/set";
import cloneDeep from "lodash/cloneDeep";

import type { ContentBundle } from "../../src/content-bundle/types";
import type {
    ActionView,
    CharacterMemory,
    CharacterView,
    CustomFunction,
    CustomFunctionName,
    DiegeticTimestamp,
    EntityView,
    HostApplicationAdapter,
    ItemView,
    LocationView,
    UID,
    VivInternalState
} from "../../src";
import { EntityType } from "../../src";

/**
 * The complete in-memory state backing a test scenario.
 */
export interface TestState {
    /** All entities keyed by ID. */
    readonly entities: Record<UID, EntityView>;
    /** Character IDs. */
    readonly characters: UID[];
    /** Location IDs. */
    readonly locations: UID[];
    /** Item IDs. */
    readonly items: UID[];
    /** Action IDs (the chronicle). */
    readonly actions: UID[];
    /** Current simulation timestamp (in minutes). */
    timestamp: DiegeticTimestamp;
    /** Persisted Viv internal state, if any. */
    vivInternalState: VivInternalState | null;
}

/**
 * Returns a fresh, empty test state.
 *
 * @returns An initialized test state with no entities and timestamp zero.
 */
export function createTestState(): TestState {
    const state: TestState = {
        entities: {},
        characters: [],
        locations: [],
        items: [],
        actions: [],
        timestamp: 0,
        vivInternalState: null,
    };
    return state;
}

/**
 * The return type for all fixture setup functions.
 */
export interface SetupResult {
    readonly state: TestState;
    readonly adapter: HostApplicationAdapter;
}

/**
 * Adds a location to the test state and returns its entity ID.
 *
 * @param state - The test state to mutate.
 * @param id - Entity ID for the location.
 * @param name - Display name for the location.
 * @returns The entity ID.
 */
export function addLocation(state: TestState, id: UID, name: string): UID {
    const location: LocationView = {
        id,
        entityType: EntityType.Location,
        name,
    };
    state.entities[id] = location;
    state.locations.push(id);
    return id;
}

/**
 * Adds a character to the test state and returns its entity ID.
 *
 * @param state - The test state to mutate.
 * @param id - Entity ID for the character.
 * @param name - Display name for the character.
 * @param locationID - Entity ID for the character's current location.
 * @param extras - Optional additional properties to merge onto the character view.
 * @returns The entity ID.
 */
export function addCharacter(
    state: TestState,
    id: UID,
    name: string,
    locationID: UID,
    extras: Record<string, unknown> = {}
): UID {
    const character: CharacterView = {
        id,
        entityType: EntityType.Character,
        name,
        location: locationID,
        memories: {} as Record<UID, CharacterMemory>,
        ...extras,
    };
    state.entities[id] = character;
    state.characters.push(id);
    return id;
}

/**
 * Adds an item to the test state and returns its entity ID.
 *
 * @param state - The test state to mutate.
 * @param id - Entity ID for the item.
 * @param name - Display name for the item.
 * @param locationID - Entity ID for the item's current location.
 * @returns The entity ID.
 */
export function addItem(state: TestState, id: UID, name: string, locationID: UID): UID {
    const item: ItemView = {
        id,
        entityType: EntityType.Item,
        name,
        location: locationID,
        inscriptions: [],
    };
    state.entities[id] = item;
    state.items.push(id);
    return id;
}

/**
 * A running counter used by {@link createTestAdapter} to provision unique action IDs.
 */
let actionIDCounter = 0;

/**
 * Resets the action-ID counter to zero.
 *
 * Call this in a `beforeEach` block to ensure deterministic IDs across tests.
 *
 * @returns Nothing. Mutates module state.
 */
export function resetActionIDCounter(): void {
    actionIDCounter = 0;
}

/**
 * Loads a compiled fixture bundle from disk by fixture directory name.
 *
 * @param fixtureName - The name of the fixture directory (e.g., `"minimal-action"`).
 * @returns The parsed content bundle.
 */
export function loadBundle(fixtureName: string): ContentBundle {
    const bundlePath = resolve(import.meta.dirname, fixtureName, "bundle.json");
    return JSON.parse(readFileSync(bundlePath, "utf-8")) as ContentBundle;
}

/**
 * Creates a minimal {@link HostApplicationAdapter} backed by the given test state.
 *
 * The adapter implements all required methods and delegates to the in-memory state. It does
 * not implement fast paths, so the runtime exercises the default gateway code paths.
 *
 * @param state - The in-memory test state backing this adapter.
 * @param enums - Optional enum definitions to register.
 * @param functions - Optional custom functions to register.
 * @returns A valid adapter suitable for passing to `initializeVivRuntime`.
 */
export function createTestAdapter(
    state: TestState,
    enums: Record<string, number | string> = {},
    functions: Record<CustomFunctionName, CustomFunction> = {}
): HostApplicationAdapter {
    const adapter: HostApplicationAdapter = {
        enums,
        functions,
        provisionActionID(): UID {
            actionIDCounter++;
            return `aid-${actionIDCounter}`;
        },
        getEntityView(entityID: UID): EntityView {
            const entity = state.entities[entityID];
            if (entity === undefined) {
                throw new Error(`Test adapter: no entity with ID '${entityID}'`);
            }
            return cloneDeep(entity);
        },
        updateEntityProperty(entityID: UID, propertyPath: (string | number)[], value: unknown): void {
            const entity = state.entities[entityID];
            if (entity === undefined) {
                throw new Error(`Test adapter: no entity with ID '${entityID}'`);
            }
            set(entity, propertyPath, value);
        },
        getEntityLabel(entityID: UID): string {
            const entity = state.entities[entityID];
            if (entity === undefined) {
                throw new Error(`Test adapter: no entity with ID '${entityID}'`);
            }
            return (entity as any).name ?? entityID;
        },
        saveActionData(actionID: UID, actionData: ActionView): void {
            state.entities[actionID] = actionData;
            // Guard against duplicate chronicle entries if the runtime calls this more than once
            if (!state.actions.includes(actionID)) {
                state.actions.push(actionID);
            }
        },
        getCurrentTimestamp(): DiegeticTimestamp {
            return state.timestamp;
        },
        getEntityIDs(entityType: EntityType, locationID?: UID): UID[] {
            switch (entityType) {
                case EntityType.Character:
                    if (locationID !== undefined) {
                        return state.characters.filter(
                            cid => (state.entities[cid] as CharacterView).location === locationID
                        );
                    }
                    return [...state.characters];
                case EntityType.Location:
                    return [...state.locations];
                case EntityType.Item:
                    if (locationID !== undefined) {
                        return state.items.filter(
                            iid => (state.entities[iid] as any).location === locationID
                        );
                    }
                    return [...state.items];
                case EntityType.Action:
                    return [...state.actions];
                default:
                    return [];
            }
        },
        getVivInternalState(): VivInternalState | null {
            return state.vivInternalState;
        },
        saveVivInternalState(vivInternalState: VivInternalState): void {
            state.vivInternalState = vivInternalState;
        },
        saveCharacterMemory(characterID: UID, actionID: UID, memory: CharacterMemory): void {
            const character = state.entities[characterID] as any;
            if (character === undefined) {
                throw new Error(`Test adapter: no character with ID '${characterID}'`);
            }
            if (character.memories === undefined) {
                character.memories = {};
            }
            character.memories[actionID] = memory;
        },
        saveItemInscriptions(itemID: UID, inscriptions: UID[]): void {
            const item = state.entities[itemID] as any;
            if (item === undefined) {
                throw new Error(`Test adapter: no item with ID '${itemID}'`);
            }
            item.inscriptions = inscriptions;
        },
    };
    return adapter;
}
