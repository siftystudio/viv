---
title: "Appendix A: Implementation notes"
---

This appendix documents implementation details of the Viv compiler and runtime that are relevant to authors and implementors but are not part of the language specification proper.

## Role dependency trees

The compiler analyzes [casting-pool directives](09-roles.md#casting-pool) to build a *role-dependency forest* for each construct. If role `B`'s casting pool references role `A`, then `B` depends on `A`, and `A` is `B`'s parent in the dependency tree. Roles with no dependencies are tree roots.

The dependency forest determines the order in which roles are cast at runtime. Casting proceeds root-first, depth-first within each tree. This ensures that when a role's casting pool references another role, the referenced role has already been cast.

## Role binding algorithm

The runtime's role-casting algorithm proceeds in two phases:

### Phase 1: Required slots

The runtime traverses the role-dependency forest, casting each role's required slots in depth-first order. For each role:

1. The [casting pool](09-roles.md#casting-pool) is assembled (from a directive or from nearby entities of the proper type).
2. The pool is deduplicated and [shuffled](20-runtime-model.md#casting-pool-shuffling).
3. Candidates are drawn from the pool one at a time. For each candidate, downstream roles are recursively cast and applicable [conditions](10-actions.md#conditions) are tested.
4. If a candidate fails (conditions are not met or downstream roles cannot be cast), the runtime *backtracks*—it removes the candidate and tries the next one in the pool.
5. If the pool is exhausted without filling the required slots, casting fails for the entire dependency tree.

### Phase 2: Optional slots

After all required slots are filled, the runtime makes a second pass to fill optional slots. In this phase:

1. Roles are visited in definition order (not dependency order), under the principle that candidates should be cast in the most specific role possible.
2. If a [casting probability](09-roles.md#optional-slot-casting-probability) is specified, each optional slot is independently subjected to a random check to determine the target number of slots to fill.
3. If a [mean](09-roles.md#slots-mean) is specified, the target number of optional slots is sampled from a normal distribution.
4. There is no backtracking during this phase. If a candidate cannot be cast (e.g., conditions fail), it is simply skipped.

## Condition grouping

The compiler groups [conditions](10-actions.md#conditions) by the roles they reference. A condition that references no roles is a *global condition* and is tested before any role casting begins. A condition that references role `R` is tested during the casting of `R` (or the last-cast role it references, if it references multiple roles). This grouping allows the runtime to test conditions as early as possible, pruning the search space.

