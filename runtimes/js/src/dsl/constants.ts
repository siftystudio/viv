/**
 * Enum containing the action-relation operators supported by Viv.
 */
export enum ActionRelationOperator {
    /**
     * Operator corresponding to general causation, where one action is a causal ancestor of another.
     */
    Caused = "caused",
    /**
     * Operator corresponding to temporal precedence, where one action occurred before another.
     */
    Preceded = "preceded",
    /**
     * Operator corresponding to direct causation, where one action is a causal ancestor of another.
     */
    Triggered = "triggered",
}

/**
 * Enum containing the arithmetic operators supported by Viv.
 */
export enum ArithmeticOperator {
    /**
     * The Viv addition operator.
     */
    Add = "+",
    /**
     * The Viv subtraction operator.
     */
    Subtract = "-",
    /**
     * The Viv multiplication operator.
     */
    Multiply = "*",
    /**
     * The Viv division operator.
     */
    Divide = "/",
}

/**
 * Enum containing the Viv assignment (and update) operators.
 */
export enum AssignmentOperator {
    /**
     * Used to assign a value to the LHS of the assignment.
     */
    Assign = "=",
    /**
     * Used to increment the value of the LHS of the assignment.
     */
    AddAssign = "+=",
    /**
     * Used to decrement the value of the LHS of the assignment.
     */
    SubtractAssign = "-=",
    /**
     * Used to multiply the value of the LHS of the assignment.
     */
    MultiplyAssign = "*=",
    /**
     * Used to divide the value of the LHS of the assignment.
     */
    DivideAssign = "/=",
    /**
     * Used to append an element to the iterable value of the LHS of the assignment.
     */
    Append = "append",
    /**
     * Used to remove an element from the iterable value of the LHS of the assignment.
     */
    Remove = "remove",
}

/**
 * Enum containing the Viv comparison operators.
 */
export enum Comparator {
    /**
     * Used to test whether two operands are equal.
     */
    Equals = "==",
    /**
     * Used to test whether the left operand is greater than the right operand.
     */
    GreaterThan = ">",
    /**
     * Used to test whether the left operand is greater than or equal to the right operand.
     */
    GreaterThanOrEqual = ">=",
    /**
     * Used to test whether the left operand is less than the right operand.
     */
    LessThan = "<",
    /**
     * Used to test whether the left operand is less than or equal to the right operand.
     */
    LessThanOrEqual = "<=",
    /**
     * Used to test whether two operands are not equal.
     */
    NotEquals = "!=",
}

/**
 * Enum specifying the discriminators for all Viv expression types.
 */
export enum ExpressionDiscriminator {
    /**
     * Discriminator for Viv action relations.
     */
    ActionRelation = "actionRelation",
    /**
     * Discriminator for Viv action searches.
     */
    ActionSearch = "actionSearch",
    /**
     * Discriminator for Viv assignments.
     */
    Assignment = "assignment",
    /**
     * Discriminator for Viv arithmetic expressions.
     */
    ArithmeticExpression = "arithmeticExpression",
    /**
     * Discriminator for Viv booleans.
     */
    Bool = "bool",
    /**
     * Discriminator for Viv chance expressions.
     */
    ChanceExpression = "chanceExpression",
    /**
     * Discriminator for Viv comparisons.
     */
    Comparison = "comparison",
    /**
     * Discriminator for Viv conditionals.
     */
    Conditional = "conditional",
    /**
     * Discriminator for Viv conjunctions.
     */
    Conjunction = "conjunction",
    /**
     * Discriminator for Viv custom function calls.
     */
    CustomFunctionCall = "customFunctionCall",
    /**
     * Discriminator for Viv disjunctions.
     */
    Disjunction = "disjunction",
    /**
     * Discriminator for Viv entity references.
     */
    EntityReference = "entityReference",
    /**
     * Discriminator for Viv enums.
     */
    Enum = "enum",
    /**
     * Discriminator for Viv floating-point numbers.
     */
    Float = "float",
    /**
     * Discriminator for Viv item inspections.
     */
    Inspection = "inspection",
    /**
     * Discriminator for Viv item inscription events.
     */
    Inscription = "inscription",
    /**
     * Discriminator for Viv integers.
     */
    Int = "int",
    /**
     * Discriminator for Viv lists.
     */
    List = "list",
    /**
     * Discriminator for Viv loops.
     */
    Loop = "loop",
    /**
     * Discriminator for Viv membership tests.
     */
    MembershipTest = "membershipTest",
    /**
     * Discriminator for Viv memory checks.
     */
    MemoryCheck = "memoryCheck",
    /**
     * Discriminator for the Viv null literal.
     */
    NullType = "nullType",
    /**
     * Discriminator for Viv object literals.
     */
    Object = "object",
    /**
     * Discriminator for Viv reactions.
     */
    Reaction = "reaction",
    /**
     * Discriminator for Viv sifting expressions.
     */
    Sifting = "sifting",
    /**
     * Discriminator for Viv string literals.
     */
    String = "string",
    /**
     * Discriminator for Viv symbol references.
     */
    SymbolReference = "symbolReference",
    /**
     * Discriminator for Viv template strings.
     */
    TemplateString = "templateString",
    /**
     * Discriminator for Viv trope-fit expressions.
     */
    TropeFit = "tropeFit",
}

/**
 * An array containing all the valid Viv expression discriminators.
 */
export const EXPRESSION_DISCRIMINATORS = Object.values(ExpressionDiscriminator) as readonly ExpressionDiscriminator[];

/**
 * Enum containing discriminators for the possible reference path components.
 */
export enum ReferencePathComponentDiscriminator {
    /**
     * Discriminator for a property-name reference path component.
     */
    ReferencePathComponentPropertyName = "referencePathComponentPropertyName",
    /**
     * Discriminator for a pointer reference path component.
     */
    ReferencePathComponentPointer = "referencePathComponentPointer",
    /**
     * Discriminator for a lookup reference path component.
     */
    ReferencePathComponentLookup = "referencePathComponentLookup",
}

/**
 * Enum containing the valid policies for preparing search domains for story sifting.
 */
export enum SearchDomainPreparationPolicy {
    /**
     * Search in the full chronicle (all historical actions).
     */
    Chronicle = "chronicle",
    /**
     * Search the memories of the character specified by the
     * {@link SearchDomainPreparationPolicy.expression}.
     */
    Expression = "expression",
    /**
     * Inherit the search domain passed into the evaluation context for the action search or sifting.
     */
    Inherit = "inherit",
}

/**
 * Enum containing the valid operators for set predicates.
 */
export enum SetPredicateOperator {
    /**
     * For a query set Q and a candidate set C: Q and C are disjoint.
     */
    None = "none",
    /**
     * For a query set Q and a candidate set C: Q and C intersect.
     */
    Any = "any",
    /**
     * For a query set Q and a candidate set C: Q is a subset of C.
     */
    All = "all",
    /**
     * For a query set Q and a candidate set C: Q and C are coextensive.
     */
    Exactly = "exactly",
}

/**
 * Enum containing discriminators for the possible temporal constraints.
 */
export enum TemporalStatementDiscriminator {
    /**
     * Discriminator for a time-frame temporal constraint.
     */
    TimeFrame = "timeFrame",
    /**
     * Discriminator for a time-of-day temporal constraint.
     */
    TimeOfDay = "timeOfDay",
}

/**
 * Enum containing the valid time units for time-frame statements.
 */
export enum TimeFrameTimeUnit {
    /**
     * Time unit: minutes.
     */
    Minutes = "minutes",
    /**
     * Time unit: hours.
     */
    Hours = "hours",
    /**
     * Time unit: days.
     */
    Days = "days",
    /**
     * Time unit: weeks.
     */
    Weeks = "weeks",
    /**
     * Time unit: months.
     */
    Months = "months",
    /**
     * Time unit: years.
     */
    Years = "years",
}
