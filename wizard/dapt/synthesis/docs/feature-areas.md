# Viv Language Feature Areas

This document defines the feature areas used by the DAPT synthesis pipeline to track coverage of the Viv DSL. Each row names a feature area and lists the sub-features it encompasses.

**Who reads this:** Author agents and reviewer agents. The orchestrator does not read this document — it works only with the feature area names from the coverage table in `status.md`.

**How authors use it:** When a commission includes a mechanical target like "build constructs that naturally call for the spawn role syntax," the author reads the corresponding row below to understand the scope. The goal is to ideate toward constructs that would organically use these features — not to force syntax where it doesn't belong.

**How reviewers use it:** When evaluating a mechanical target, the reviewer checks the log against the sub-feature list below. A verdict of "fully exercised" means most sub-features in the row were used with depth. "Partially exercised" means some were used or used shallowly.

---

| # | Feature Area | Sub-features |
|---|---|---|
| 1 | Role definition syntax | Type labels (`character`, `item`, `location`, `action`, `symbol`), participation-mode labels (`initiator`, `partner`, `recipient`, `bystander`), modifier labels (`anywhere`, `precast`, `spawn`), slot ranges (`n: 0-5`), slot mean (`[~3]`), slot probability (`[35%]`), casting pool `is:`, casting pool `from:`, spawn directive (`spawn: ~fn()`), role renaming (`renames:`), group decorator (`*`) |
| 2 | Conditions and effects syntax | Statement blocks in conditions/effects, `if`/`elif`/`else`/`end` conditionals, `loop ... as _@var: ... end`, local variables (`_@`, `_&`), assignment operators (`=`, `+=`, `-=`, `*=`, `/=`, `append`, `remove`) |
| 3 | Scratch variable syntax | The `scratch:` field on actions, scratch-scoped references (`$@`, `$&`), use across conditions/effects/saliences/associations |
| 4 | Reaction syntax | All four target types (`queue action`, `queue action-selector`, `queue plan`, `queue plan-selector`), binding modes (`with:`, `with partial:`, `with none;`), urgency (`urgent:`), priority (`priority:`), location constraints (`location:` with set predicates), time constraints (`time:` with temporal constraints), abandonment conditions (`abandon:`), repeat logic (`repeat:` with `if:` and `max:`) |
| 5 | Embargo syntax | Location scope (`here`, `anywhere`), time scope (`forever`, time periods), role scope (`roles:` with role references), multiple embargoes per action, joinable via `join embargoes:` |
| 6 | Temporal constraint syntax | Time-frame constraints (`before:`, `after:`, `between: ... and ...`), time-frame anchors (`from action`, `from hearing`, `from now`, `ago`), time-of-day constraints (`before:`, `after:`, `between:` with clock times), time periods with number words (`three hours`, `one week`), combined constraints |
| 7 | Template inheritance syntax | `template action` marker, `from` keyword in action header, body-less child (`action child from parent;`), joinable field overrides (`join roles:`, `join conditions:`, `join effects:`, `join reactions:`, `join embargoes:`), non-joinable field overrides (gloss, report, importance, saliences, associations), `join tags:`, `reserved` marker on inherited actions |
| 8 | Saliences and associations syntax | Saliences sub-fields (`default:`, `roles:`, `for _@var: ... end`), associations sub-fields (`default:`, `roles:`, `for _@var: ... end`), conditional logic inside `for` blocks, tag yields in association `for` blocks |
| 9 | Gloss, report, importance, and tags syntax | Gloss with template strings, report with template strings, importance with enum or number, tag lists, `join tags:` in inheritance |
| 10 | Plan phase structure | Phase sigil (`>`), phase naming, reaction instructions within phases, reaction windows (`all:`, `any:`, `untracked:` followed by `end`), `wait:` with `timeout:` and `until:`, flow-control terminals (`advance`, `succeed`, `fail`), conditionals and loops over plan instructions, `with partial:` bindings in phase reactions |
| 11 | Selector composition syntax | Action-selector and plan-selector types, target policies (`randomly`, `with weights`, `in order`), candidate weights (`(expression)`), candidate bindings, selector chaining (`selector` prefix on candidate name), `reserved` marker on selectors, selector-level `roles:` and `conditions:` |
| 12 | Query filter syntax | Filter fields: `action`, `tags`, `associations`, `importance`, `salience`, `location`, `time`, `initiator`, `partners`, `recipients`, `bystanders`, `active`, `present`, `ancestors`, `descendants`, query `roles:` and `conditions:`, set predicate operators (`any`, `all`, `none`, `exactly`), numeric criteria operators (`==`, `<=`, `>=`, `<`, `>`) |
| 13 | Sifting pattern syntax | Pattern `roles:`, action entries with `is:` and `from:` directives, action search in `from:` (named query form and bare form), search domains (`inherit`, `chronicle`, expression), relational operators in conditions (`preceded`, `caused`, `triggered`), pattern `conditions:` |
| 14 | Trope syntax | Trope `roles:` and `conditions:`, `fits trope` expression (standard form with bindings block), sugared trope fit (`<@a, @b> fits trope name`), positional and named bindings in trope fits |
| 15 | Inscribe and inspect syntax | `inscribe` expression (item inscribe action), `inspect` expression (character inspect item), downstream knowledge checks |
| 16 | Spawn role syntax | `spawn` label on role, `spawn:` directive with custom function call, spawn in template-inherited context, spawn-to-inspection chain |
| 17 | Action search and sift expressions | Named query search (`search query name:`), bare search (`search:`), search domains (`over: inherit`, `over: chronicle`, `over: @entity`), `sift pattern name:` expression, bindings in search/sift expressions |
| 18 | Expression operators | Arithmetic (`+`, `-`, `*`, `/`), comparison (`==`, `!=`, `<`, `<=`, `>`, `>=`), logical (`&&`, `||`), negation (`!`), membership (`in`), memory check (`knows`), chance (`%`), fail-safe marker (`?`), pointer access (`->`), lookup access (`[]`), parenthesized sub-expressions |
| 19 | Custom function call syntax | `~` prefix, argument lists, fail-safe marker (`?`), use in general effects vs spawn directives |
| 20 | Literal forms | Numbers (integer, float, signed), strings (single/double quoted), template strings with `@`-reference and `{expression}` gaps, enums (`#NAME`, signed enums), booleans (`true`/`false`), `null`, list literals (`[]`, `[a, b]`), object literals (`{key: value}`) |
| 21 | Include and multi-file syntax | `include` directive, quoted file paths, cross-file construct references, multi-file compilation via entry point |
