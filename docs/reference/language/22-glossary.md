---
title: Glossary
next: false
---

What follows is an alphabetized glossary of terms defined in this reference.

Each entry below links to the section where the term is introduced.

---

***Action.*** A construct specifying something a character can do in the storyworld. See [Actions](10-actions.md).

***Action body.*** The fields that make up an action definition. See [Action body](10-actions.md#action-body).

***Action header.*** The portion of an action definition that declares its name, markers, and inheritance. See [Action header](10-actions.md#action-header).

***Action name.*** The unique identifier for an action definition. See [Action name](10-actions.md#action-name).

***Action search.*** An expression that searches over a character's memories or the chronicle, optionally filtered by a query. See [Action searches](07-expressions.md#action-searches).

***Action targeting.*** The runtime process of determining whether an action can be performed. See [Action targeting](20-runtime-model.md#action-targeting).

***Adapter.*** The interface through which the host application exposes read–write capabilities to the Viv runtime. See [Introduction](01-introduction.md).

***Arithmetic expression.*** An expression applying a binary arithmetic operator. See [Arithmetic expressions](07-expressions.md#arithmetic-expressions).

***Assignment expression.*** An expression that modifies a value in the host application. See [Assignment expressions](07-expressions.md#assignments).

***Associations.*** Per-character tag-like annotations attached to an action memory. See [Associations](10-actions.md#associations).

***Binding entry.*** A mapping from a role reference to an expression in a bindings block. See [Binding entries](13-bindings.md#binding-entries).

***Bindings.*** Precast role values supplied to a targeted construct. See [Bindings](13-bindings.md).

***Boolean literals.*** The values `true` and `false`. See [Booleans](02-lexical-elements.md#booleans).

***Casting pool.*** The set of candidates from which a role is cast. See [Casting pool](09-roles.md#casting-pool).

***Casting-pool directive.*** A role field specifying a custom casting pool. See [Casting pool](09-roles.md#casting-pool).

***Chance expression.*** An expression that evaluates to `true` with a specified probability. See [Chance expressions](07-expressions.md#chance-expressions).

***Child action.*** An action that inherits from a parent action. See [Inheritance](10-actions.md#inheritance).

***Chronicle.*** The complete record of all actions performed in a simulation. See [Search domains](07-expressions.md#search-domains).

***Comment.*** Text introduced with `//` that is ignored by the grammar. See [Comments](02-lexical-elements.md#comments).

***Concatenated source.*** The result of merging all included files into a single logical source. See [Concatenated source](04-includes.md#concatenated-source).

***Conditional.*** An `if`/`elif`/`else`/`end` control-flow construct. See [Conditionals](08-statements-and-control-flow.md#conditionals).

***Constants.*** Tokens with special fixed values. See [Constants](02-lexical-elements.md#constants).

***Content bundle.*** The compiled JSON artifact consumed by a Viv runtime. See [Compiler output](19-compiler-output.md).

***Custom function call.*** An invocation of a host-application function via the `~` operator. See [Custom function calls](07-expressions.md#custom-function-calls).

***Dehydration.*** The conversion of entity data to entity IDs before passing values across boundaries. See [Dehydration](20-runtime-model.md#dehydration).

***Embargo.*** A declaration constraining the subsequent performance of an action. See [Embargoes](10-actions.md#embargoes).

***Entity.*** Anything in the storyworld with a persistent identity managed by the host application. See [Entities](05-entities-and-symbols.md#entities).

***Entity ID.*** A unique string identifier for an entity, provisioned by the host application. See [Entities](05-entities-and-symbols.md#entities).

***Entity view.*** The data object furnished by the host application for a given entity. See [Entities](05-entities-and-symbols.md#entities).

***Enum literal.*** An identifier preceded by `#`, representing a named value. See [Enums](02-lexical-elements.md#enums).

***Evaluation context.*** The set of bindings and state available during expression evaluation. See [Evaluation context](20-runtime-model.md#evaluation-context).

***Expression.*** A construct that evaluates to a value. See [Expressions](07-expressions.md).

***Fail-safe marker.*** The `?` token, which causes missing values to yield `null` rather than errors. See [Fail-safe marker](07-expressions.md#fail-safe-marker).

***General action.*** An action that may be targeted anytime (not reserved). See [Reserved marker](10-actions.md#reserved-marker).

***Global condition.*** A condition that references no roles and is tested before role casting. See [Condition grouping](21-appendix-a-implementation-notes.md#condition-grouping).

***Gloss.*** A brief string or template string describing an action instance. See [Gloss](10-actions.md#gloss).

***Group role.*** A role with a slots maximum greater than one. See [Group roles](09-roles.md#group-roles).

***Group-role decorator.*** The `*` token appended to a role reference to mark it as a group role. See [Group-role decorator](06-names.md#group-role-decorator).

***Hearer (`@hearer`).*** A special role reference bound to the character hearing about an action after the fact, via knowledge relaying. See [Evaluation context](20-runtime-model.md#evaluation-context).

***Host application.*** The project (typically a videogame) that integrates the Viv runtime. See [Introduction](01-introduction.md).

***Identifier.*** An author-defined name for a construct, role, or variable. See [Identifiers](02-lexical-elements.md#identifiers).

***Include.*** A statement that imports constructs from another Viv source file. See [Includes](04-includes.md).

***Inheritance.*** The mechanism by which a child action incorporates material from a parent action. See [Inheritance](10-actions.md#inheritance).

***Inscription.*** An expression that records knowledge of an action onto an item. See [Inscriptions](07-expressions.md#inscriptions).

***Inspection.*** An expression that causes a character to learn about actions inscribed on an item. See [Inspections](07-expressions.md#inspections).

***Joinable.*** A field that may be merged (rather than overridden) during inheritance. See [Field joinability](10-actions.md#field-joinability).

***Keywords.*** Tokens with special meaning in the grammar. See [Keywords](02-lexical-elements.md#keywords).

***List literal.*** An ordered sequence of expressions in brackets. See [Lists](02-lexical-elements.md#lists).

***Local variable.*** A variable scoped to a single block, prefixed with `_`. See [Local variables](08-statements-and-control-flow.md#local-variables).

***Logical expression.*** An expression combining tests with `&&` and `||`. See [Logical expressions](07-expressions.md#logical-expressions).

***Loop.*** A `loop`/`as`/`end` iteration construct. See [Loops](08-statements-and-control-flow.md#loops).

***Metadata.*** Version and validation data in the content bundle. See [Metadata](19-compiler-output.md#metadata).

***Null literal.*** The value `null`. See [Null](02-lexical-elements.md#null).

***Number literal.*** A decimal integer or fraction. See [Numbers](02-lexical-elements.md#numbers).

***Numeric criterion.*** A threshold test on a numeric value in a query. See [Numeric criteria](15-queries.md#numeric-criteria).

***Object literal.*** Key–value pairs in a JavaScript-like notation. See [Objects](02-lexical-elements.md#objects).

***Operators.*** Tokens that perform computations or comparisons. See [Operators](02-lexical-elements.md#operators).

***Optional role.*** A role with a slots minimum of zero. See [Slots range](09-roles.md#slots-range).

***Optional slot.*** A slot beyond the minimum that may or may not be filled. See [Slots range](09-roles.md#slots-range).

***Orderless.*** The property that constructs in a source file have no meaningful order. See [Source units are orderless](03-file-structure.md#source-units-are-orderless).

***Parent action.*** An action from which a child action inherits. See [Inheritance](10-actions.md#inheritance).

***Plan.*** A multi-phase sequence of coordinated reactions. See [Plans](17-plans.md).

***Plan instruction.*** A building block of a plan phase. See [Plan instructions](17-plans.md#plan-instructions).

***Plan phase.*** A named stage in a plan, prefixed with `>`. See [Phases](17-plans.md#phases).

***Positional binding.*** A sugared binding matched to roles by position rather than name. See [Positional bindings](13-bindings.md#positional-bindings).

***Query.*** A pattern for searching over recorded action instances. See [Queries](15-queries.md).

***Reaction.*** A declaration that queues a construct for future execution. See [Reactions](11-reactions.md).

***Reaction window.*** A plan construct that groups instructions with a completion policy. See [Reaction windows](17-plans.md#reaction-windows).

***Reference.*** The primary way to name and access a role binding or variable. See [References](06-names.md#references).

***Reference path.*** A chain of property, pointer, or lookup accesses extending a reference. See [Reference paths](07-expressions.md#reference-paths).

***Relational expression.*** An expression comparing two operands. See [Relational operators](07-expressions.md#relational-operators).

***Report.*** A longer string or template string describing an action instance. See [Report](10-actions.md#report).

***Required slot.*** A slot that must be filled for targeting to succeed. See [Slots range](09-roles.md#slots-range).

***Reserved action.*** An action that may only be targeted via a reaction or selector. See [Reserved marker](10-actions.md#reserved-marker).

***Reserved word.*** A keyword that cannot be used as an identifier. See [Identifiers](02-lexical-elements.md#identifiers).

***Role.*** A slot in the cast of a construct, filled with an entity or symbol at runtime. See [Roles](09-roles.md).

***Role body.*** The fields that make up a role definition. See [Role body](09-roles.md#role-body).

***Role label.*** A keyword specifying a role's entity type and casting behavior. See [Labels](09-roles.md#labels).

***Role reference.*** A sigil-prefixed identifier naming a role. See [Role reference](09-roles.md#role-reference).

***Role-dependency forest.*** A tree structure governing the order in which roles are cast. See [Role dependency trees](21-appendix-a-implementation-notes.md#role-dependency-trees).

***Salience.*** A per-character numeric score representing how memorable an action is. See [Saliences](10-actions.md#saliences).

***Scope sigil.*** A sigil (`$` or `_`) indicating storage scope. See [Scope sigils](06-names.md#scope-sigils).

***Scratch variable.*** A temporary variable scoped to an action definition, prefixed with `$`. See [Scratch](10-actions.md#scratch).

***Search domain.*** The collection of action instances to search over. See [Search domains](07-expressions.md#search-domains).

***Selector.*** A construct specifying a set of candidates and a policy for choosing among them. See [Selectors](18-selectors.md).

***Set predicate.*** A test on the relationship between an actual set and a specified set. See [Set predicates](15-queries.md#set-predicates).

***Sifting expression.*** An expression that invokes a sifting pattern. See [Sifting expressions](07-expressions.md#sifting-expressions).

***Sifting pattern.*** A pattern describing a causally related sequence of actions. See [Sifting patterns](16-sifting-patterns.md).

***Sigil.*** A single-character token prefixing a name to indicate type or scope. See [Sigils](02-lexical-elements.md#sigils).

***Slots.*** Parameters controlling how many entities fill a role. See [Slots](09-roles.md#slots).

***Spawn directive.*** A role field specifying an adapter function to construct a new entity. See [Spawn directive](09-roles.md#spawn-directive).

***Statement.*** A conditional, loop, reaction, or expression. See [Statements](08-statements-and-control-flow.md).

***Story sifting.*** The detection of emergent storylines via sifting patterns. See [Sifting patterns](16-sifting-patterns.md).

***String literal.*** A quoted string value. See [Strings](02-lexical-elements.md#strings).

***Sugared bindings.*** Compact inline bindings enclosed in angle brackets. See [Sugared bindings](13-bindings.md#sugared-bindings).

***Symbol.*** A value that does not correspond to a host-application entity. See [Symbols](05-entities-and-symbols.md#symbols).

***Target.*** The file path specified in an include statement. See [Targets](04-includes.md#targets).

***Target group.*** The set of candidates and selection policy in a selector. See [Target group](18-selectors.md#target-group).

***Target policy.*** The strategy for choosing among selector candidates. See [Target policies](18-selectors.md#target-policies).

***Template action.*** An action intended solely for inheritance, excluded from the content bundle. See [Template marker](10-actions.md#template-marker).

***Template gap.*** An interpolation point in a template string. See [Template strings](02-lexical-elements.md#template-strings).

***Template string.*** A string with interpolated expressions. See [Template strings](02-lexical-elements.md#template-strings).

***Temporal constraint.*** A restriction on when a reaction or query match is valid. See [Temporal constraints](12-temporal-constraints.md).

***This (`@this`).*** A special reference to the action instance currently being executed. See [Evaluation context](20-runtime-model.md#evaluation-context).

***Time period.*** A duration comprising a quantity and a unit. See [Time periods](12-temporal-constraints.md#time-periods).

***Time-frame anchor.*** The reference point for a time-frame constraint. See [Time-frame anchors](12-temporal-constraints.md#time-frame-anchors).

***Time-frame constraint.*** A temporal constraint specifying a window relative to an anchor. See [Time-frame constraints](12-temporal-constraints.md#time-frame-constraints).

***Time-of-day constraint.*** A temporal constraint specifying clock-time boundaries. See [Time-of-day constraints](12-temporal-constraints.md#time-of-day-constraints).

***Token.*** The smallest unit of meaning recognized by the grammar. See [Tokens](02-lexical-elements.md#tokens).

***Trope.*** A relational pattern among entities that can be tested at runtime. See [Tropes](14-tropes.md).

***Trope fit.*** An expression testing whether a trope matches for given bindings. See [Trope fits](07-expressions.md#trope-fits).

***Type sigil.*** A sigil (`@` or `&`) indicating entity or symbol type. See [Type sigils](06-names.md#type-sigils).

***Wait instruction.*** A plan instruction that pauses execution for a duration. See [Wait](17-plans.md#wait).
