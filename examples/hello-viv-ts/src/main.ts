import { randomUUID } from "node:crypto";

import type {
    ActionView,
    CharacterView,
    DiegeticTimestamp,
    EntityView,
    HostApplicationAdapter,
    UID,
    VivInternalState,
} from "@siftystudio/viv-runtime";
import { initializeVivRuntime, selectAction, EntityType } from "@siftystudio/viv-runtime";
import set from "lodash/set";

import { CONTENT_BUNDLE } from "./content";

/**
 * A simple in-memory store for the entire application state.
 */
const STATE = {
    timestamp: 0 as DiegeticTimestamp,
    entities: {} as Record<UID, EntityView>,
    characters: [] as UID[],
    locations: [] as UID[],
    items: [] as UID[],
    actions: [] as UID[],
    vivInternalState: null as VivInternalState | null,
};

/**
 * The Viv adapter for this host application.
 */
const ADAPTER: HostApplicationAdapter = {
    provisionActionID: () => randomUUID(),
    getEntityView: (id) => {
        if (STATE.entities[id] === undefined) {
            throw new Error(`Cannot furnish view for undefined entity ID: ${id}`);
        }
        return structuredClone(STATE.entities[id]);
    },
    getEntityLabel: (id) => {
        if (STATE.entities[id] === undefined) {
            throw new Error(`Cannot furnish label for undefined entity ID: ${id}`);
        }
        return STATE.entities[id].name as string;
    },
    updateEntityProperty: (id, path, value) => {
        if (STATE.entities[id] === undefined) {
            throw new Error(`Cannot update property on undefined entity ID: ${id}`);
        }
        set(STATE.entities[id], path, value);
    },
    saveActionData: (id, data) => {
        if (STATE.entities[id] === undefined) STATE.actions.push(id);
        STATE.entities[id] = data;
    },
    getCurrentTimestamp: () => STATE.timestamp,
    getEntityIDs: (type, locationID?) => {
        if (locationID) {
            if (type === EntityType.Character) {
                return STATE.characters.filter(id => STATE.entities[id].location === locationID);
            }
            if (type === EntityType.Item) {
                return STATE.items.filter(id => STATE.entities[id].location === locationID);
            }
            throw new Error(`Invalid entity type for location query: ${type}`);
        }
        switch (type) {
            case EntityType.Character:
                return [...STATE.characters];
            case EntityType.Item:
                return [...STATE.items];
            case EntityType.Location:
                return [...STATE.locations];
            case EntityType.Action:
                return [...STATE.actions];
            default:
                throw new Error(`Invalid entity type: ${type}`);
        }
    },
    getVivInternalState: () => structuredClone(STATE.vivInternalState),
    saveVivInternalState: (vivInternalState) => {
        STATE.vivInternalState = structuredClone(vivInternalState);
    },
    saveCharacterMemory: (characterID, actionID, memory) => {
        (STATE.entities[characterID] as CharacterView).memories[actionID] = memory;
    },
    saveItemInscriptions: (itemID, inscriptions) => {
        STATE.entities[itemID].inscriptions = inscriptions;
    },
    debug: {
        validateAPICalls: true,
        watchlists: {},
    },
};

/**
 * Populates the state with a single location and three characters.
 */
function createWorld(): void {
    const locationID = "tavern";
    STATE.locations.push(locationID);
    STATE.entities[locationID] = {
        entityType: EntityType.Location,
        id: locationID,
        name: "The Tavern",
    };
    // Now create the three characters at that location
    for (const [id, name] of [["alice", "Alice"], ["bob", "Bob"], ["carol", "Carol"]]) {
        STATE.characters.push(id);
        STATE.entities[id] = {
            entityType: EntityType.Character,
            id,
            name,
            location: locationID,
            mood: 0,
            memories: {},
        };
    }
}

/**
 * Initializes the Viv runtime, simulates a few timesteps, and prints the chronicle.
 */
async function main(): Promise<void> {
    // Set things up
    initializeVivRuntime({ contentBundle: CONTENT_BUNDLE, adapter: ADAPTER });
    createWorld();
    // Simulate three timesteps, selecting an action for each character on each one
    for (let timestep = 0; timestep < 3; timestep++) {
        for (const characterID of STATE.characters) {
            await selectAction({ initiatorID: characterID });
        }
        STATE.timestamp += 10;
    }
    // Print what happened
    console.log("\n=== Chronicle ===\n");
    for (const actionID of STATE.actions) {
        const action = STATE.entities[actionID] as ActionView;
        const summary = action.report ?? action.gloss ?? "(no summary)";
        console.log(`  [T=${action.timestamp}] ${summary}`);
    }
    console.log();
}

try {
    await main();
} catch (error) {
    console.error(error);
    process.exit(1);
}
