import type { ActiveEmbargo } from "../action-manager/types";
import type {
    ActionName,
    PlanName,
    QueryName,
    SelectorName,
    SiftingPatternName,
    TropeName
} from "../content-bundle/types";
import type { ActionTargetingEvent, PlanExecutionEvent, VivInternalStateDebuggingWatchlists } from "../debugger/types";
import type { EnumName } from "../dsl/types";
import type { ExpressionValue } from "../interpreter/types";
import type { CharacterMemory } from "../knowledge-manager/types";
import type { QueuedAction, QueuedActionSelector, QueuedPlan, QueuedPlanSelector } from "../queue-manager/types";
import type { RoleBindings } from "../role-caster/types";
import type { PlanState } from "../planner/types";
import type { QueuedConstructStatus } from "../queue-manager";
import type { EntityType } from "./constants";

/**
 * A collection of functions and other parameters that are required by the runtime in order
 * to properly integrate with a host application.
 *
 * Note that the Viv runtime does not catch or wrap exceptions thrown by adapter functions. As such,
 * if an adapter function throws, the error will propagate through the runtime and find its way back
 * to the caller, with its original type and stack trace intact.
 *
 * As such, you can use `instanceof` to distinguish between Viv errors (always an instance of {@link VivError})
 * and your own adapter errors (any other error type):
 *
 * ```ts
 * try {
 *     const actionID = await selectAction({ initiatorID });
 * } catch (error) {
 *     if (error instanceof VivError) {
 *         // Something went wrong in the Viv runtime (e.g., a bad expression,
 *         // a role-casting issue, or a validation failure).
 *     } else {
 *         // Something went wrong in your adapter (e.g., a failed database
 *         // query, a missing entity, or a bug in a custom function).
 *     }
 * }
 * ```
 *
 * **Important:** Viv assumes that it can freely mutate the furnished data, with any actual
 * updates being persisted via calls to the explicit adapter functions specified in the
 * documentation below, so be sure to clone data as needed.
 *
 * @category Integration
 */
export interface HostApplicationAdapter {
    /**
     * A function that accepts an entity ID and returns the full entity view for that entity,
     * if there is such an entity, else throws an error.
     *
     * This function is used by the runtime to evaluate expressions such as conditions and effects. Note that
     * the runtime will be careful to only pass an actual entity ID for `entityID`. How exactly the entity data
     * is persisted is a nuance of the host application that is abstracted from the Viv runtime via the adapter
     * interface. If fetching is expensive -- e.g., because it persists in a DB -- you might consider implementing
     * caching in your application.
     *
     * **Important:** Viv assumes that it can freely mutate the furnished data, with any actual updates being
     * persisted via an adapter function (or {@link CustomFunction}), so be sure to clone as needed.
     *
     * @param entityID - The entity ID for the entity whose data is to be returned.
     * @returns The requested entity view.
     * @throws If there is no entity with the given entity ID.
     */
    readonly getEntityView: (entityID: UID) => AsyncOrSync<EntityView>;
    /**
     * A function that accepts a record describing an action and saves the underlying data
     * in the host application.
     *
     * This function is called both to create new action records and to update existing action records.
     *
     * **Important:** The action record must be persisted such that any subsequent call to
     * {@link HostApplicationAdapter.getEntityView} (with `entityID`) must produce an {@link ActionView}.
     *
     * Note: If {@link HostApplicationAdapter.updateEntityProperty} is implemented, Viv authors will be free
     * to directly set action data via assignments. How that works behind the scenes depends on the host application.
     *
     * @param actionID - Entity ID for the action.
     * @param actionData - Action data in the shape of an {@link ActionView}.
     * @returns Nothing.
     */
    readonly saveActionData: (actionID: UID, actionData: ActionView) => AsyncOrSync<void>;
    /**
     * A function that accepts a record describing a character memory and saves the underlying data
     * in the host application.
     *
     * This function is called both to create new character memories and to update existing ones.
     *
     * **Important:** The memory record must be persisted such that any subsequently retrieved
     * {@link CharacterView} for the character in question will include the memory data in its
     * {@link CharacterView.memories} field.
     *
     * @param characterID - Entity ID for the character whose memory is to be saved.
     * @param actionID - Entity ID for the action to which the memory pertains.
     * @param memory - A record specifying the memory to save.
     * @returns Nothing.
     */
    readonly saveCharacterMemory: (characterID: UID, actionID: UID, memory: CharacterMemory) => AsyncOrSync<void>;
    /**
     * A function that accepts an item and updated inscriptions for that item and saves the
     * underlying data in the host application.
     *
     * **Important:** The inscriptions must be persisted such that any subsequently retrieved
     * {@link ItemView} for the item in question will include the inscriptions value in its
     * {@link ItemView.inscriptions} field.
     *
     * @param itemID - Entity ID for the item whose inscriptions are to be saved.
     * @param inscriptions - Array containing entity IDs for all actions about which the given item
     *     inscribes knowledge. This will always be deduplicated prior to calling this function.
     * @returns Nothing.
     */
    readonly saveItemInscriptions: (itemID: UID, inscriptions: UID[]) => AsyncOrSync<void>;
    /**
     * A function that returns the internal state of the Viv runtime, if it has been initialized, else `null`.
     *
     * While the Viv runtime will manage its own internal state, it relies on the host application to persist it.
     *
     * If the internal state has not been initialized -- i.e., the runtime has never called
     * {@link HostApplicationAdapter.saveVivInternalState} -- then you should return `null` here.
     *
     * @returns The persisted internal state of the Viv runtime, if it has been initialized, else `null`.
     */
    readonly getVivInternalState: () => AsyncOrSync<VivInternalState | null>;
    /**
     * A function that accepts updated internal state for the Viv runtime, and then
     * persists the updated state in the host application.
     *
     * @param vivInternalState - The updated Viv internal state to set.
     * @returns Nothing.
     */
    readonly saveVivInternalState: (vivInternalState: VivInternalState) => AsyncOrSync<void>;
    /**
     * A function that returns an array containing entity IDs for entities of the given type
     * in the running simulation instance of the host application.
     *
     * If a location is specified, the result should be limited to entities currently situated at that
     * location. Otherwise, the result should contain entity IDs for all entities of the given type.
     *
     * **Important:** Viv considers a character or item to be at a location if the entity's `location`
     * property (in its {@link CharacterView} or {@link ItemView}) stores the entity ID for that location.
     * Also, Viv assumes that it can freely mutate the furnished array, so be sure to clone as needed.
     *
     * @param entityType - The type of entity for which entity IDs will be furnished.
     * @param locationID - If specified, the entity ID for a location to search for entities,
     *     which should only be submitted for characters and items.
     * @returns An array of entity IDs.
     * @throws If `locationID` is present but `entityType` is not {@link EntityType.Character}
     *     or {@link EntityType.Item}.
     */
    readonly getEntityIDs: (entityType: EntityType, locationID?: UID) => AsyncOrSync<UID[]>;
    /**
     * A function that returns a newly provisioned entity ID for an action.
     *
     * Note that this function is used to request IDs for queued actions that may never actually
     * be performed. As such, not all IDs provisioned by this function will actually come to be
     * associated with recorded actions.
     *
     * This is the only case where a {@link UID} will need to be provisioned for Viv, because entities
     * created as a result of Viv actions will be initialized via a custom function specified
     * in the `spawn` field of a role definition.
     *
     * @returns A newly provisioned entity ID.
     */
    readonly provisionActionID: () => AsyncOrSync<UID>;
    /**
     * A function that returns the current timestamp (in story time) in the running simulation
     * instance associated with the host application.
     *
     * Here, *story time* refers to the concept of time **within** the storyworld being simulated
     * by the host application, as opposed to clock time in the real world as the host application
     * operates. In other words, diegetic time.
     *
     * **Important:** Viv assumes that a {@link DiegeticTimestamp} is represented as the number of
     * minutes, in story time, that have passed since some initial reference point in the simulation. The
     * starting point that is used for this determination is up to you, but the time unit must be minutes.
     *
     * This allows the Viv runtime to properly handle authored temporal constraints in reaction declarations,
     * which allow for semantics such as "this reaction can only occur between one week and six months from now".
     *
     * @returns The current diegetic timestamp for the simulation at hand.
     */
    readonly getCurrentTimestamp: () => AsyncOrSync<DiegeticTimestamp>;
    /**
     * A function that accepts an ID for an entity and returns a label for the entity, such as its name,
     * that is suitable for insertion into a templated string.
     *
     * For example, a Viv author might write a templated string `"@giver gives @item to @receiver"`,
     * which the interpreter will have to render by replacing the references `@giver`, `@item`, and
     * `@receiver` with strings.
     *
     * To do this, the runtime will call this function for each reference. Note that, for references to values
     * that are not entity IDs, the value itself will be inserted without any calls to an adapter function,
     * as in `@giver.name gives { ~getItemDescription(@item.id) } to @receiver.name`.
     *
     * @param entityID - ID for the entity for whom a label is being requested.
     * @returns The label for the entity.
     */
    readonly getEntityLabel: (entityID: UID) => AsyncOrSync<string>;
    /**
     * If implemented, a function that returns the current time of day (in story time) in the
     * running simulation instance associated with the host application.
     *
     * Here, *story time* refers to the concept of time **within** the storyworld being simulated by the
     * host application, as opposed to clock time in the real world as the host application operates.
     * This function is needed in order to enforce time-of-day constraints that Viv authors may place on
     * actions, specifying concerns such as "this reaction may only be performed between 10pm and 11:59pm".
     *
     * If your simulation does not model time of day, you can leave this one out, in which case the adapter
     * validator will ensure that no reactions in your content bundle reference time of day.
     *
     * @returns The current simulation time of day.
     */
    readonly getCurrentTimeOfDay?: () => AsyncOrSync<TimeOfDay>;
    /**
     * If implemented, a function that updates the given entity's data by setting the property at the specified path.
     *
     * If this adapter function is not provided, entity data may only be updated via calls to
     * {@link CustomFunction}. Further, the validator will ensure that no
     * assignments in your content bundle target entities.
     *
     * **Important:** Viv supports *autovivification* (no pun intended), where an author may reference potentially
     * undefined substructures along a path that will be created as needed. As such, in your procedure backing this
     * adapter function, all intermediate objects along `propertyPath` must be created if they do not already exist.
     *
     * As an illustrative example, in Viv the assignment `@person.foo.bar.baz = 77` is still valid even if
     * `@person.foo` does not yet have a `bar` property. As such, your update procedure would have to set
     * `@person.foo.bar` to an object `{baz: 77}` in this case. When setting local variables, which do not need
     * to persist in the host application, the Viv runtime uses the default autovivification semantics of the
     * Lodash `set()` function when it's given an array path: when a missing intermediate value is encountered,
     * make it an array only  if the next key is a non-negative integer, otherwise make it a plain object.
     *
     * @param entityID - The entity ID of the entity whose data is to be updated.
     * @param propertyPath - A path to the particular property of the entity data that is to be updated, structured
     *     as an array of property keys and/or array indices -- examples: `["friends", 2, "status"]` and
     *     `["nearby", "artifacts.treatise", "school of thought"]`. Note that property keys are arbitrary strings
     *     that may contain dots, whitespace, or any other character. If you plan to convert the path array into
     *     a string so that you can use something like Lodash to execute the entity update, you'll need to take
     *     care to ensure that your conversion procedure is properly robust. And again, as stated above, you must
     *     support autovivification for any undefined substructures along this property path.
     * @param value - The value to set for the property specified by `propertyPath`.
     * @returns Nothing.
     */
    readonly updateEntityProperty?: (
        entityID: UID,
        propertyPath: (string | number)[],
        value: unknown
    ) => AsyncOrSync<void>;
    /**
     * If supplied, configuration parameters controlling various aspects of Viv system behavior. Default
     * values will be used for parameters that are not supplied.
     */
    readonly config?: HostApplicationAdapterConfig;
    /**
     * If supplied, a mapping from enum names to their associated literal values in the host application.
     *
     * In Viv, *enums* are abstract labels like `#BIG` or `#SMALL` that may be used in places like effects, in
     * lieu of magic numbers (or strings) that are prone to changing. For instance, an author could specify an
     * effect like `@insulted.updateAffinity(@insulter, -#MEDIUM)`, which specifies that someone who has just
     * been insulted should greatly lower their affinity toward their insulter. For various reasons, this is
     * preferable to something like `@insulted.updateAffinity(@insulter, -35)`.
     *
     * Upon adapter registration, the Viv runtime will confirm that all enums referenced in your content
     * bundle are present in this mapping here.
     */
    readonly enums?: Record<EnumName, number | string>;
    /**
     * If supplied, a mapping from custom-function names to {@link CustomFunction}.
     *
     * A host application can expose arbitrary functions in its Viv adapter, which authors can reference
     * using the `~` sigil, as in e.g. `~transport(@person.id, @destination.id)`. The author defines the
     * arguments using Viv expressions, which will each be evaluated prior to being passed into the actual
     * custom function. The custom function is expected to return an expression value, which is a highly
     * permissive union of various types.
     *
     * **Important:** Viv will dehydrate all arguments prior to passing them into a custom function, meaning
     * any instance of entity data will be converted into its corresponding entity ID. This allows an author
     * to write something like `~move(@person, @destination)` without having to worry about whether to pass
     * in the respective `id` properties.
     */
    readonly functions?: Record<CustomFunctionName, CustomFunction>;
    /**
     * If supplied, a collection of optional functions implementing frequent read and write operations,
     * so as to be optimized according to implementation details specific to the host application at hand.
     */
    readonly fastPaths?: HostApplicationAdapterFastPaths;
    /**
     * If supplied, settings activating debugging facilities of the Viv runtime.
     */
    readonly debug?: HostApplicationAdapterDebuggingSettings;
}

/**
 * A helper type for adapter functions, allowing them to be either asynchronous or synchronous.
 *
 * @category Other
 */
export type AsyncOrSync<T> = T | Promise<T>;

/**
 * Configuration parameters controlling various aspects of Viv system behavior.
 *
 * @category Integration
 */
export interface HostApplicationAdapterConfig {
    /**
     * The maximum number of iterations to allow in a Viv loop. Rather than throwing an error if
     * the threshold is reached, the runtime will simply exit the loop.
     *
     * @defaultValue 999
     */
    readonly loopMaxIterations?: number;
    /**
     * If specified, the maximum salience value for character memories.
     *
     * Clamping will not occur if this field is elided or set to `null`.
     *
     * Note that saliences accumulate as memories are *re-experienced* -- re-experiencing happens when the
     * memory's subject action is cast in another action that the character experiences, observes, or hears
     * about. As such, saliences have no explicit upper bound given a content bundle, even if you e.g. use
     * enum values to specify salience increments. This parameter allows you to specify such an upper bound.
     */
    readonly memoryMaxSalience?: number | null;
    /**
     * A number specifying the degree to which character memories will be retained month over month.
     *
     * This important config parameter drives the modeling of characters gradually forgetting past events.
     * I recommend a value around `0.9` here, but you might have your own intuitions (or empirical methods).
     *
     * Specifically, the value here must be a number between `0.0` (characters quickly forget everything) and
     * `1.0` (characters never forget anything). With each passing month, a given character's salience value
     * will be multiplied by this number to model how much the character's memory faded over that time.
     *
     * For instance, if the character's current salience is `10` and the value set here is `0.9`, the
     * character's updated salience after one month would be `9`. If another month passed without the
     * character *re-experiencing* the memory -- re-experiencing happens when the memory's subject action
     * is cast in another action that the character experiences, observes, or hears about -- the salience
     * would be further reduced to `8.1`. And so forth.
     *
     * If ever the salience is reduced to a number below the threshold set via
     * `memoryForgettingSalienceThreshold`, the memory will be marked
     * {@link CharacterMemory.forgotten}, to model total forgetting of the past event.
     *
     * Note that the salience scale will always be (`memoryForgettingSalienceThreshold`,
     * `memoryMaxSalience`] -- or (`memoryForgettingSalienceThreshold`, `Infinity`) if
     * `memoryForgettingSalienceThreshold` is not defined -- where the meaning of a given value is
     * entirely defined by your host application. This lower bound is established because any initial
     * salience value less than or equal to `memoryForgettingSalienceThreshold` will prevent the
     * associated memory from being formed in the first place.
     *
     * **Important:** We use a timeframe of one month here only to support designer intuitions around forgetting,
     * since it would be difficult to reason about e.g. the degree to which one forgets a past event each
     * minute. The actual frequency of memory fading depends on the frequency with which the host application
     * invokes {@link fadeCharacterMemories} -- but that function will always convert the time since the last invocation
     * into a number of months, so as to always honor your config parameter here.
     *
     * @defaultValue 0.9
     */
    readonly memoryRetentionMonthlyMultiplier?: number;
    /**
     * A positive number specifying a salience threshold for memories, below which memories will be forgotten.
     *
     * Viv models character memories fading over time by reducing salience during periods where a memory
     * is not *re-experienced* by a character -- re-experiencing happens when the memory's subject action
     * is cast in another action that the character experiences, observes, or hears about. This is driven
     * by the value set in `memoryRetentionMonthlyMultiplier`.
     *
     * If ever a salience value is reduced such that this threshold exceeds it, the associated memory
     * will be marked {@link CharacterMemory.forgotten}, to model total forgetting of the
     * past event. To be clear, we only do this if the salience value is strictly less than the threshold.
     *
     * Note that a forgotten memory can be revitalized for a character who relearns about the subject action.
     *
     * **Important:** If the initial salience value for a new memory is lower than this threshold,
     * it will not immediately be marked as forgotten, but instead this will occur the first time
     * the memory is faded (via {@link fadeCharacterMemories}).
     *
     * @defaultValue 0.1
     */
    readonly memoryForgettingSalienceThreshold?: number;
}

/**
 * Configuration parameters controlling activation of the Viv runtime's debugging facilities.
 *
 * @category Other
 */
export interface HostApplicationAdapterDebuggingSettings {
    /**
     * Whether to carry out structural validation (against a schema) of all calls to the Viv
     * runtime's API functions (e.g., `selectAction()`).
     *
     * This will produce more informative error messages for malformed calls, at the cost of
     * some overhead per call. As such, this setting is most useful during initial integration
     * of Viv into a host application.
     */
    readonly validateAPICalls?: boolean;
    /**
     * An object identifying constructs to *watch*.
     *
     * When a construct is being watched, {@link WatchedConstructDebuggingState}
     * is collected whenever it is targeted. This information can be used to investigate why a construct
     * has not been successfully targeted, especially if this is due to something like a mistyped condition.
     */
    readonly watchlists?: HostApplicationAdapterConstructWatchlists;
    /**
     * An object specifying *observability callbacks* to register with the Viv runtime.
     *
     * Observability callbacks cause the runtime to emit events that support real-time observability
     * into processes such as action selection and plan execution. These events can be processed by
     * the host application to drive debugging facilities pertaining to the Viv integration.
     *
     * **Important:** Observability callbacks slow down the runtime, and thus should only be used
     * when the host application's Viv integration is being debugged or otherwise monitored.
     */
    readonly callbacks?: HostApplicationAdapterObservabilityCallbacks;
}

/**
 * An object identifying constructs to watch.
 *
 * As part of adapter validation, the runtime will confirm that all the constructs included
 * in the watchlists here are in fact defined in the registered content bundle.
 *
 * @category Other
 */
export interface HostApplicationAdapterConstructWatchlists {
    /**
     * If specified, an array containing the names of the actions to watch.
     */
    readonly actions?: ActionName[];
    /**
     * If specified, an array containing the names of the action selectors to watch.
     */
    readonly actionSelectors?: SelectorName[];
    /**
     * If specified, an array containing the names of the plans to watch.
     */
    readonly plans?: PlanName[];
    /**
     * If specified, an array containing the names of the plan selectors to watch.
     */
    readonly planSelectors?: SelectorName[];
    /**
     * If specified, an array containing the names of the queries to watch.
     */
    readonly queries?: QueryName[];
    /**
     * If specified, an array containing the names of the sifting patterns to watch.
     */
    readonly siftingPatterns?: SiftingPatternName[];
    /**
     * If specified, an array containing the names of the tropes to watch.
     */
    readonly tropes?: TropeName[];
}

/**
 * An object specifying observability callbacks.
 *
 * @category Other
 */
export interface HostApplicationAdapterObservabilityCallbacks {
    /**
     * If supplied, a callback that will be invoked during action targeting to provide real-time
     * observability into the action-selection process.
     *
     * The callback receives an {@link ActionTargetingEvent} for each action targeting attempt,
     * indicating whether targeting has started, succeeded, or failed. This is useful for monitoring
     * long-running simulations involving many characters and timesteps.
     *
     * **Important:** The runtime does not catch errors thrown by your callback. If the callback throws,
     * the error will propagate through the runtime, in accordance with the broader adapter error contract.
     */
    readonly onActionTargetingEvent?: (event: ActionTargetingEvent) => void;
    /**
     * If supplied, a callback that will be invoked during plan execution to provide real-time
     * observability into plan lifecycle events.
     *
     * The callback receives a {@link PlanExecutionEvent} for each significant plan-execution event,
     * including launch, phase advancement, blocking (on waits or reaction windows), and termination
     * (success or failure).
     *
     * **Important:** The runtime does not catch errors thrown by your callback. If the callback throws,
     * the error will propagate through the runtime, in accordance with the broader adapter error contract.
     */
    readonly onPlanExecutionEvent?: (event: PlanExecutionEvent) => void;
}

/**
 * A collection of optional functions implementing frequent read and write operations, so as to be
 * optimized according to implementation details specific to the host application at hand.
 *
 * All the entries here are optional. If a given entry isn't present, the Viv runtime will
 * use a corresponding naive procedure with the same semantics. For instance, if an
 * {@link HostApplicationAdapter.updateEntityProperty} fast path is not supplied, the Viv
 * runtime will read the complete entity data, mutate it to capture the property update,
 * and then write the complete updated entity data.
 *
 * @category Integration
 */
export interface HostApplicationAdapterFastPaths {
    /**
     * A function that returns whether a given string is the entity ID for some entity in the host application.
     * 
     * If this fast path is not supplied, the Viv runtime will fall back to calling
     * {@link HostApplicationAdapter.getEntityView} and catching the errors thrown in cases
     * of undefined entities.
     *
     * This function is used by the runtime to determine whether it needs to hydrate a potential
     * entity ID into an entity view.
     *
     * **Important**: Because Viv's fallback implementation relies on
     * {@link HostApplicationAdapter.getEntityView} throwing an error in the case of a missing
     * entity, you should implement this fast path if your
     * {@link HostApplicationAdapter.getEntityView} can fail for reasons other than a missing
     * entity (e.g., a DB connection issue).
     *
     * @param potentialEntityID - A string whose status as an entity ID is to be tested.
     * @returns Whether the given string is an entity ID.
     */
    readonly isEntityID?: (potentialEntityID: string) => AsyncOrSync<boolean>;
    /**
     * A function that returns the value stored at the specified path in the given entity's data.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to using
     * {@link HostApplicationAdapter.getEntityView}.
     *
     * **Important:** Viv assumes that it can freely mutate the furnished data, with any actual
     * updates being persisted via adapter functions or {@link CustomFunction}, 
     * so be sure to clone as needed.
     *
     * @param entityID - The entity ID of the entity whose data is to be retrieved.
     * @param propertyPath - A path to the particular property of the entity data that is to be updated, structured
     *     as an array of property keys and/or array indices -- examples: `["targets", 2, "status"]` and
     *     `["stats", "equipment.weapon", "critical hit chance"]`. Note that property keys are arbitrary strings
     *     that may contain dots, whitespace, or any other character. If you plan to convert the path array into
     *     a string so that you can use something like Lodash to carry out the retrieval, you'll need to take
     *     care to ensure that your conversion procedure is properly robust.
     * @returns The value stored at the specified path in the given entity's data.
     * @throws If the property does not exist.
     */
    readonly getEntityProperty?: (entityID: UID, propertyPath: (string | number)[]) => AsyncOrSync<unknown>;
    /**
     * A function that updates the given entity's data by appending the given value to the array
     * property at the specified path, potentially with deduplication.
     *
     * If this fast path is not supplied, this will be implemented using other fast paths,
     * to the degree that they are supplied.
     *
     * **Important:** As explained in {@link HostApplicationAdapterFastPaths.getEntityProperty},
     * Viv supports *autovivification*, a policy that must also be honored here. In addition to
     * creating any intermediate structure, if the property to which the value will be appended
     * does not yet exist, it must be created first.
     *
     * @param entityID - The entity ID of the entity whose data is to be updated.
     * @param propertyPath - A path to the particular property of the entity data that is to be updated, structured
     *     as an array of property keys and/or array indices -- examples: `["friends", 2, "status"]` and
     *     `["nearby", "artifacts.treatise", "school of thought"]`. Note that property keys are arbitrary strings
     *     that may contain dots, whitespace, or any other character. If you plan to convert the path array into
     *     a string so that you can use something like Lodash to execute the entity update, you'll need to take
     *     care to ensure that your conversion procedure is properly robust. And again, as stated above, you must
     *     support autovivification for any undefined substructures along this property path.
     * @param value - The value to append to the property specified by `propertyPath`.
     * @param dedupe - Whether the resulting array property value should have no duplicates. If `true`,
     *     you must only append `value` if it is not already present in the array property.
     * @returns Nothing.
     */
    readonly appendEntityProperty?: (
        entityID: UID,
        propertyPath: (string | number)[],
        value: unknown,
        dedupe: boolean
    ) => AsyncOrSync<void>;
    /**
     * A function that returns the entity type for the given entity.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to the
     * {@link HostApplicationAdapterFastPaths.getEntityProperty} fast path, if supplied,
     * and otherwise to {@link HostApplicationAdapter.getEntityView}.
     *
     * @param entityID - Entity ID for the entity whose entity type will be returned.
     * @returns The entity type for the given entity.
     */
    readonly getEntityType?: (entityID: UID) => AsyncOrSync<EntityType>;
    /**
     * A function that returns the entity ID for the current location of the given entity.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to the
     * {@link HostApplicationAdapterFastPaths.getEntityProperty} fast path, if supplied,
     * and otherwise to {@link HostApplicationAdapter.getEntityView}.
     *
     * @param entityID - Entity ID for the entity whose location will be returned.
     * @returns The Entity ID for the given entity's current location.
     */
    readonly getEntityLocation?: (entityID: UID) => AsyncOrSync<UID>;
    /**
     * A function that returns the action queue for the character with the given entity ID,
     * if any, else an empty array.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * and pulling the desired action queue from there.
     *
     * @param characterID - Entity ID for the character whose action queue is to be retrieved.
     * @returns The action queue for the character with the given entity ID, if any, else an empty array.
     */
    readonly getActionQueue?: (characterID: UID) => AsyncOrSync<ActionQueue>;
    /**
     * A function that updates the action queue for the character with the given entity ID.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * updating the action queue for the character in question, and setting the entire
     * {@link VivInternalState} via {@link HostApplicationAdapter.saveVivInternalState}.
     *
     * @param characterID - Entity ID for the character whose action queue is to be updated.
     * @param updatedActionQueue - The updated action queue to set.
     * @returns Nothing.
     */
    readonly saveActionQueue?: (characterID: UID, updatedActionQueue: ActionQueue) => AsyncOrSync<void>;
    /**
     * A function that returns the global plan queue contained in the {@link VivInternalState}.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * and pulling the global plan queue from there.
     *
     * @returns The global plan queue contained in the {@link VivInternalState}.
     */
    readonly getPlanQueue?: () => AsyncOrSync<PlanQueue>;
    /**
     * A function that updates the global plan queue contained in the {@link VivInternalState}.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * updating its global plan queue, and setting the entire {@link VivInternalState}
     * via {@link HostApplicationAdapter.saveVivInternalState}.
     *
     * @param updatedPlanQueue - The updated global plan queue to set.
     * @returns Nothing.
     */
    readonly savePlanQueue?: (updatedPlanQueue: PlanQueue) => AsyncOrSync<void>;
    /**
     * A function that returns all active plan states (i.e., the value for the `activePlans` field
     * of the {@link VivInternalState}).
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * and pulling the active plan states from there.
     *
     * @returns All active plan states.
     */
    readonly getAllPlanStates?: () => AsyncOrSync<Record<UID, PlanState>>;
    /**
     * A function that returns the plan state for the plan with the given UID (i.e., the entry for this
     * key in the `activePlans` field of the {@link VivInternalState}).
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * and pulling the desired plan state from there.
     *
     * Note: This function will never be called for a plan whose state has not been initialized yet.
     *
     * @param planID - UID for the plan whose state is to be retrieved.
     * @returns The plan state for the plan with the given UID.
     */
    readonly getPlanState?: (planID: UID) => AsyncOrSync<PlanState>;
    /**
     * A function that updates the plan state for the plan with the given UID (i.e., the entry for this
     * key in the `activePlans` field of the {@link VivInternalState}).
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * updating the applicable plan state, and setting the entire {@link VivInternalState}
     * via {@link HostApplicationAdapter.saveVivInternalState}.
     *
     * @param planID - UID for the plan whose state is to be updated.
     * @param updatedPlanState - The updated plan state to set.
     * @returns Nothing.
     */
    readonly savePlanState?: (planID: UID, updatedPlanState: PlanState) => AsyncOrSync<void>;
    /**
     * A function that deletes the plan state for the plan with the given UID (i.e., deletes this
     * key and its associated entry from the `activePlans` field of the {@link VivInternalState}).
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * deleting the applicable plan state, and setting the entire {@link VivInternalState}
     * via {@link HostApplicationAdapter.saveVivInternalState}.
     *
     * Note: This function will never be called for a plan whose state has not been initialized yet.
     *
     * @param planID - UID for the plan whose state is to be deleted.
     * @returns Nothing.
     */
    readonly deletePlanState?: (planID: UID) => AsyncOrSync<void>;
    /**
     * A function that returns the queued-construct statuses stored in the {@link VivInternalState}.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire {@link VivInternalState}, via {@link HostApplicationAdapter.getVivInternalState},
     * and pulling the queued-construct statuses from there.
     *
     * @returns The queued-construct statuses stored in the {@link VivInternalState}.
     */
    readonly getQueuedConstructStatuses?: () => AsyncOrSync<QueuedConstructStatuses>;
    /**
     * A function that accepts a UID and (potentially updated) status for a queued construct and
     * persists that status in the {@link VivInternalState}.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to retrieving the
     * entire Viv internal state, via {@link HostApplicationAdapter.getVivInternalState},
     * updating the associated queued-construct status, and setting the entire
     * {@link VivInternalState} via {@link HostApplicationAdapter.saveVivInternalState}.
     *
     * @param queuedConstructID - UID for the queued construct whose status will be set.
     * @param queuedConstructStatus - The status to set for the queued construct.
     * @returns Nothing.
     */
    readonly saveQueuedConstructStatus?: (
        queuedConstructID: UID,
        queuedConstructStatus: QueuedConstructStatus
    ) => AsyncOrSync<void>;
    /**
     * A function that accepts an entity ID for an action and returns an array containing
     * entity IDs for all causal ancestors of the given one (i.e., its `ancestors` property).
     *
     * If this fast path is not supplied, the Viv runtime will fall back to the
     * {@link HostApplicationAdapterFastPaths.getEntityProperty} fast path, if supplied,
     * and otherwise to {@link HostApplicationAdapter.getEntityView}.
     *
     * **Important:** Viv assumes that it can freely mutate the furnished data, with any actual
     * updates being persisted via adapter functions or {@link CustomFunction},
     * so be sure to clone as needed.
     *
     * @param actionID - Entity ID for the action whose causal ancestors will be returned.
     * @returns An array containing entity IDs for all the causal ancestors of the given one.
     */
    readonly getActionAncestors?: (actionID: UID) => AsyncOrSync<UID[]>;
    /**
     * A function that accepts an entity ID for an action and returns an array containing entity
     * IDs for all causal descendants of the given one (i.e., its `descendants` property).
     *
     * If this fast path is not supplied, the Viv runtime will fall back to the
     * {@link HostApplicationAdapterFastPaths.getEntityProperty} fast path, if supplied,
     * and otherwise to {@link HostApplicationAdapter.getEntityView}.
     *
     * **Important:** Viv assumes that it can freely mutate the furnished data, with any actual
     * updates being persisted via adapter functions or {@link CustomFunction},
     * so be sure to clone as needed.
     *
     * @param actionID - Entity ID for the action whose causal descendants will be returned.
     * @returns An array containing entity IDs for all the causal descendants of the given one.
     */
    readonly getActionDescendants?: (actionID: UID) => AsyncOrSync<UID[]>;
    /**
     * A function that accepts an entity ID for a parent action and a child action,
     * and appends the latter to the former's `caused` property.
     *
     * Here, 'parent' and 'child' refer to direct causal relations.
     *
     * If this fast path is not supplied, the Viv runtime will fall back various other fast paths,
     * to the degree they have been supplied.
     *
     * @param parentID - Entity ID for the parent action whose `caused` property will be updated.
     * @param childID - Entity ID for the child action, which just occurred and is thus not already
     *     in `caused` (i.e., no need to worry about deduplication).
     * @returns Nothing.
     */
    readonly appendActionCaused?: (parentID: UID, childID: UID) => AsyncOrSync<void>;
    /**
     * A function that accepts an entity ID for an ancestor action and a descendant action,
     * and appends the latter to the former's `descendants` property.
     *
     * Here, 'ancestor' and 'descendant' refer to causal relations, either direct or indirect.
     *
     * If this fast path is not supplied, the Viv runtime will fall back various other fast paths,
     * to the degree they have been supplied.
     *
     * @param ancestorID - Entity ID for the ancestor action whose `descendants` property will be updated.
     * @param descendantID - Entity ID for the descendant action, which just occurred and is thus not
     *     already in `descendants` (i.e., no need to worry about deduplication).
     * @returns Nothing.
     */
    readonly appendActionDescendants?: (ancestorID: UID, descendantID: UID) => AsyncOrSync<void>;
    /**
     * A function that accepts an entity ID for a character and an entity ID for an action and returns
     * the given character's memory of the given action, if they have one, else `null`.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to the
     * {@link HostApplicationAdapterFastPaths.getEntityProperty} fast path, if supplied,
     * and otherwise to {@link HostApplicationAdapter.getEntityView}.
     *
     * **Important:** Viv assumes that it can freely mutate the furnished data, with any actual
     * updates being persisted via adapter functions or {@link CustomFunction},
     * so be sure to clone as needed.
     *
     * @param characterID - Entity ID for the character whose memory will be returned.
     * @param actionID - Entity ID for the action whose associated memory will be returned.
     * @returns The given character's memory of the given action, if they have one, else `null`.
     */
    readonly getCharacterMemory?: (characterID: UID, actionID: UID) => AsyncOrSync<CharacterMemory | null>;
    /**
     * A function that returns the inscriptions for the given item.
     *
     * If this fast path is not supplied, the Viv runtime will fall back to the
     * {@link HostApplicationAdapterFastPaths.getEntityProperty} fast path, if supplied,
     * and otherwise to {@link HostApplicationAdapter.getEntityView}.
     *
     * @param itemID - Entity ID for the item whose inscriptions will be returned.
     * @returns The inscriptions for the given item.
     */
    readonly getItemInscriptions?: (itemID: UID) => AsyncOrSync<UID[]>;
}

/**
 * An arbitrary function exposed by the host application in its Viv adapter, which authors
 * can reference using the `~` sigil, as in e.g. `~transport(@person.id, @destination.id)`.
 *
 * @category Integration
 */
export type CustomFunction = (...args: ExpressionValue[]) => AsyncOrSync<ExpressionValue>;

/**
 * The name for a custom function exposed by the host application in its Viv adapter.
 *
 * @category Other
 */
export type CustomFunctionName = string;

/**
 * The number of minutes that have elapsed, in story time, since some initial reference point
 * in the running simulation instance of the host application.
 *
 * Note that you can actually define whatever starting point you'd like, so long as the
 * time unit is minutes and timestamps increase monotonically as a simulation proceeds.
 *
 * Every host application must be capable of representing a given point in
 * story time as a simple numeric timestamp, in the manner of Unix epoch time.
 *
 * @category Other
 */
export type DiegeticTimestamp = number;

/**
 * The time of day in the running simulation instance in the host application.
 *
 * @category Other
 */
export interface TimeOfDay {
    /**
     * The hour of day, specified using the range [0, 23].
     */
    readonly hour: number;
    /**
     * The minute of the hour of day, specified using the range [0, 59].
     */
    readonly minute: number;
}

/**
 * A read-only data view describing an entity in a host application.
 *
 * An 'entity' in Viv parlance is a character, location, item, or action. In terms of operational semantics,
 * it is something for which an entity ID must be provisioned (by the host application), such that any call
 * to {@link HostApplicationAdapter.getEntityView} with that entity ID will return a read-only entity view.
 *
 * Minimally, the entity view must contain a few required fields, but generally it should contain any custom
 * fields that are referenced in your Viv code, so that conditions and other expressions can be evaluated.
 *
 * The host application is responsible for furnishing entity views in the formats that inherit from this shape --
 * {@link CharacterView}, {@link ItemView}, {@link LocationView}, and {@link ActionView} -- and as such it is also
 * responsible for persisting the entity data undergirding those views.
 *
 * That said, the host application is free to model and persist this underlying data using
 * whatever representations and methods its developers see fit. For instance, you might store
 * a compact representation that is expanded into a richer view with derived properties. The
 * key is to ensure that the actual underlying representation can be modified via calls to
 * {@link HostApplicationAdapter.updateEntityProperty}, if implemented, and/or any
 * {@link CustomFunction}.
 *
 * @category Integration
 */
export interface EntityView {
    /**
     * Discriminator for the entity type.
     */
    readonly entityType: EntityType;
    /**
     * A unique identifier for the entity.
     */
    readonly id: UID;
    /**
     * Additional properties whose structure depends entirely on the host application, with the caveat
     * that the Viv runtime expects a plain object all the way down. As such, the values embedded here
     * should not include types like functions or members of custom classes, but rather exclusively the
     * types defined in the `ExpressionValue` union.
     */
    [key: string]: ExpressionValue;
}

/**
 * A unique identifier in the host application that is provisioned by the host application.
 *
 * These do not need to be UUIDs, but they do need to be UIDs with regard to the running instance
 * of the host application at hand.
 *
 * When a UID is associated with an {@link EntityView} in the storyworld of the running
 * instance of the host application, it is referred to as an 'entity ID'. This term is used
 * throughout the Viv codebase accordingly.
 *
 * @category Integration
 */
export type UID = string;

/**
 * A read-only entity view for a character in a simulated storyworld.
 *
 * For details on semantics and constraints, see {@link EntityView}, which this interface extends.
 *
 * @category Integration
 */
export interface CharacterView extends EntityView {
    /**
     * Discriminator specifying the character entity type.
     */
    readonly entityType: EntityType.Character;
    /**
     * The entity ID for the current location of the character.
     *
     * Viv assumes that each character is in a discrete location at any given point, and that the
     * location is itself an entity for which a {@link LocationView} may be requested.
     */
    readonly location: UID;
    /**
     * The character's memories for all the actions they know about.
     */
    readonly memories: CharacterMemories;
}

/**
 * A mapping from action entity IDs to memories of those actions.
 *
 * @category Other
 */
export type CharacterMemories = Record<UID, CharacterMemory>;

/**
 * A read-only entity view for an item in a simulated storyworld.
 *
 * For details on semantics and constraints, see {@link EntityView}, which this interface extends.
 *
 * @category Integration
 */
export interface ItemView extends EntityView {
    /**
     * Discriminator specifying the item entity type.
     */
    readonly entityType: EntityType.Item;
    /**
     * The entity ID for the current location of the item.
     *
     * Viv assumes that each item is in a discrete location at any given point, and that the
     * location is itself an entity for which a {@link LocationView} may be requested.
     */
    readonly location: UID;
    /**
     * Array containing entity IDs for all the actions about which this item inscribes knowledge.
     *
     * Should a character *inspect* the item, via Viv code using the 'inspect' operator, they will
     * thereby learn about all the actions contained in this array. The inscriptions for an item
     * grows via *inscription* events, which occur via Viv code using the 'inscribe' operator.
     */
    readonly inscriptions: UID[];
}

/**
 * A read-only entity view for a location in a simulated storyworld.
 *
 * For details on semantics and constraints, see {@link EntityView}, which this interface extends.
 *
 * @category Integration
 */
export interface LocationView extends EntityView {
    /**
     * Discriminator specifying the location entity type.
     */
    readonly entityType: EntityType.Location;
}

/**
 * A read-only entity view for an action that has been performed.
 *
 * For details on semantics and constraints, see {@link EntityView}, which this interface extends.
 *
 * @category Actions
 */
export interface ActionView extends EntityView {
    /**
     * Discriminator for the action entity type.
     */
    readonly entityType: EntityType.Action;
    /**
     * The name of the action being performed.
     */
    readonly name: ActionName;
    /**
     * A simple string (derived from an author-defined template) describing this action
     * in a sentence or so.
     *
     * This field is not `readonly` because it is set after an action is first recorded.
     */
    gloss: string | null;
    /**
     * A more detailed string (derived from an author-defined template) describing
     * this action in a paragraph or so.
     *
     * This field is not `readonly` because it is set after an action is first recorded.
     */
    report: string | null;
    /**
     * A numeric score capturing the importance of this action, for purposes of story sifting.
     */
    readonly importance: number;
    /**
     * Tags on the action. These are meant to facilitate search over actions, for story
     * sifting, and their function may be extended in the host application.
     *
     * This field is not `readonly` because it is set after an action is first recorded.
     */
    tags: string[];
    /**
     * The final bindings constructed for the action. Bindings map roles to the respective
     * entities (or symbols) that were cast in those roles.
     */
    readonly bindings: RoleBindings;
    /**
     * A blackboard storing arbitrary variables that a Viv author may set in the course of an action definition.
     *
     * These can be derived via expressions included in the action definition's `scratch` field, and variables
     * can also be set or mutated by assignments in the `effects` field (and also technically by side effects
     * from arbitrary custom function calls, which may be placed almost anywhere in an action definition). In
     * Viv parlance, *scratch variables* are set via the `$` notation, as in `$&foo = 77`, which is really just
     * syntactic sugar for `@this.scratch.foo == 77` -- i.e., syntactic sugar for setting a top-level property
     * in this object. This data persists in the action's entity data so that subsequent actions may refer to
     * it as needed, via expressions like `@past_action.scratch.baz`.
     */
    readonly scratch: Record<string, unknown>;
    /**
     * Entity ID for the storyworld location where this action was performed.
     */
    readonly location: UID;
    /**
     * The timestamp (in story time) at which this action occurred. Like all Viv timestamps, this is
     * represented as the number of minutes that have elapsed, in story time, since the running
     * simulation instance in the host application first commenced.
     */
    readonly timestamp: DiegeticTimestamp;
    /**
     * The time of day at which the action was performed. If the host application
     * does not model time of day, this will be `null`.
     */
    readonly timeOfDay: TimeOfDay | null;
    /**
     * Array containing entity IDs for all the actions that **directly** caused this one, if any. This data,
     * produced as the simulation proceeds through what I call *causal bookkeeping*, greatly facilitates
     * story sifting. The value here will always be deduplicated.
     */
    readonly causes: UID[];
    /**
     * Array containing entity IDs for all the actions **directly** caused by this one. The array will initially
     * be empty, but may be mutated later on by subsequent actions (always deduplicated).
     */
    readonly caused: UID[];
    /**
     * Array containing entity IDs for *all* causal ancestors of this one (always deduplicated).
     */
    readonly ancestors: UID[];
    /**
     * Array containing entity IDs for *all* causal descendants of this one (always deduplicated).
     */
    readonly descendants: UID[];
    /**
     * Array containing entity IDs for all actions about which this one relays knowledge. An action
     * is said to relay knowledge about another one when it casts it in one of its roles.
     */
    readonly relayedActions: UID[];
    /**
     * Entity ID for the initiator of this action. This field supports story sifting.
     */
    readonly initiator: UID;
    /**
     * Array containing entity IDs for the initiator and any entities cast in `partner`
     * roles (i.e., co-initiator roles) of this action. This field supports story sifting.
     */
    readonly partners: UID[];
    /**
     * Array containing entity IDs for any recipients of this action. This field supports story sifting.
     */
    readonly recipients: UID[];
    /**
     * Array containing entity IDs for any bystanders who witnessed, but did not
     * participate in, this action. This field supports story sifting.
     */
    readonly bystanders: UID[];
    /**
     * Array containing entity IDs for all characters who participated in this action, meaning all
     * present characters who were cast in non-`bystander` roles. This field supports story sifting.
     */
    readonly active: UID[];
    /**
     * Array containing entity IDs for all characters who participated in or otherwise directly witnessed
     * this action, meaning all active characters and also bystanders. This field supports story sifting.
     */
    readonly present: UID[];
}

/**
 * Internal state required by the Viv runtime. The host application must persist this state,
 * but Viv is in charge of managing it (via calls to {@link HostApplicationAdapter.saveVivInternalState}).
 *
 * @category Integration
 */
export interface VivInternalState {
    /**
     * A mapping from entity ID for a character to an array storing queued actions (and queued action selectors)
     * for that character, with the following invariants: urgent actions come first, and the two buckets (urgent,
     * non-urgent) are themselves sorted in order of priority. Character keys are added only as needed.
     */
    readonly actionQueues: Record<UID, ActionQueue>;
    /**
     * The global plan queue, which stores all queued plans (and queued plan selectors). This is not keyed
     * by character because plans are not associated with initiators (they can orchestrate complex action
     * sequences across multiple total initiators). While this is maintained as a FIFO queue, it can more
     * accurately be considered to be conceptually unordered, because all queued plans are pursued every
     * planner tick, and a plan launched before another one on the same tick has no advantage as far as
     * being the first to action performance. This is because plans can only queue actions -- and not
     * cause them to be immediately performed -- and the action manager always pursues queued actions
     * in priority order.
     */
    planQueue: PlanQueue;
    /**
     * A mapping from plan UID to plan state, for all active plans. A plan is active between launching
     * (not queueing) and reaching either a success or failure state.
     */
    readonly activePlans: Record<UID, PlanState>;
    /**
     * A mapping from queued-construct UID to queued-construct status, for all constructs that
     * have ever been queued. Note that entries are never deleted.
     */
    queuedConstructStatuses: QueuedConstructStatuses;
    /**
     * A mapping from action name to an array containing all active embargoes associated with that action.
     *
     * Action embargoes are a kind of authorial affordance that allows a Viv author to constrain the
     * subsequent performance of some action according to various constraints. For instance, an embargo
     * can prevent a character from performing the same action for some period of time, or from doing so
     * at the same location, and so forth. Embargoes can specify locations, time windows, and arbitrary
     * subsets of an action's bindings.
     */
    readonly actionEmbargoes: Record<ActionName, ActiveEmbargo[]>;
    /**
     * The story-time timestamp at which memory saliences were last decayed.
     *
     * This value is used as the starting point for computing elapsed time when fading character
     * memories. It is initialized to `null` until a first instance of memory fading occurs.
     */
    lastMemoryDecayTimestamp: DiegeticTimestamp | null;
    /**
     * When applicable, live data associated with the debugging facilities of the Viv runtime.
     */
    debugging?: VivInternalStateDebugging;
}

/**
 * An array storing queued actions (and queued action selectors) for a character, in priority order.
 *
 * Urgent queued actions appear contiguously at the front of the array, followed by all non-urgent
 * queued actions. Within each bucket, entries are sorted by decreasing priority.
 *
 * @category Other
 */
export type ActionQueue = (QueuedAction | QueuedActionSelector)[];

/**
 * An array storing queued plans (and queued plan selectors), in insertion order (FIFO).
 *
 * @category Other
 */
export type PlanQueue = (QueuedPlan | QueuedPlanSelector)[];

/**
 * A mapping from queued-construct UID to queued-construct status, for all constructs that have ever been queued.
 *
 * @category Other
 */
export type QueuedConstructStatuses = Record<UID, QueuedConstructStatus>;

/**
 * Data associated with the debugging facilities of the Viv runtime.
 *
 * @category Other
 */
export interface VivInternalStateDebugging {
    /**
     * Watchlists containing debugging information about a set of constructs that the host
     * application's Viv adapter has identified for watching.
     */
    readonly watchlists?: VivInternalStateDebuggingWatchlists;
}


